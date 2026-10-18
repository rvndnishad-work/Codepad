/**
 * Machine coding ULTRA — batch 13: images and media (a lazy-loaded image, a
 * basic image carousel, an infinite-loop carousel with swipe, an image gallery
 * with a lightbox, and a canvas drawing board with undo / redo).
 *
 * Every question carries a Question Body (CLAUDE.md §6) shared by all three
 * frameworks, and one bundle per framework (React, Vue, Angular): a tutorial
 * answer (story first, Questions to Ask in the React answer, the state model,
 * a theme-aware `.iq-diagram` SVG, step-by-step excerpts with `📌 Interview
 * term:` callouts, a Verified section, edge cases and accessibility, pitfalls,
 * the §7 "How to Answer in an Interview" card, a glossary and a conclusion)
 * plus a runnable multi-file solution for the site playground. No network:
 * every image is an inline SVG data URL built in code.
 *
 * Every solution was booted with scripts/verify-mc-solution.mjs on React
 * 19.3.1 / Vue 3.5.44 / Angular 22.2.3 (AOT with strictTemplates and the
 * playground runtime JIT) in jsdom 29.1.1 and driven by a shared driver; the
 * Verified blocks quote that output. jsdom has no IntersectionObserver, no
 * image loading, no layout, no transitionend of its own and no canvas 2D
 * context, so the drivers install the fakes each answer names. The same
 * solutions were also run in headless Chromium 141 (playwright-core 1.56.1)
 * for the real-browser facts: IntersectionObserver loading on scroll, CSS
 * transitions and transitionend, mouse swipes with pointer capture, focus
 * and scroll lock, and real canvas pixels and PNG export.
 *
 * The generator (gen.mjs), the solution directories, the drivers and the
 * browser checks live in the session scratchpad under mc/b13/; the shipped
 * files are read from those directories byte for byte.
 */
import type { MachineCodingAugment } from "./machine-coding-augments.types";

const augments: MachineCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Lazy-loaded Image",
    seoDescription:
      "Build a lazy-loaded image in React, Vue and Angular: IntersectionObserver, placeholder, fade-in and an error fallback with retry, verified.",
    description: `**Question presented to candidate:**
"Our product feed shows dozens of large photos and the page is slow on phones. Build an image component that only downloads its photo when it is about to scroll into view. It should show a placeholder first, fade the photo in when it arrives, and show a fallback with a retry button if the file fails."

**Requirements:**
- A reusable image component taking \`src\`, \`alt\`, \`width\`, \`height\` and a placeholder colour or gradient.
- The real \`src\` is not set until the image is within about 200px of the viewport.
- The box reserves its final size before loading, so nothing jumps when the photo arrives.
- Fade in on \`load\`; on \`error\` show a message and a Retry button.
- Demo: a feed of 8 photos with a "Requested X of 8" counter; one photo is deliberately broken.

**What a strong answer should cover:**
- \`IntersectionObserver\` with a \`rootMargin\` to start loading slightly early, one observer per image or one shared, and disconnecting it once the image is requested and on unmount.
- An explicit status model (idle, loading, loaded, error) instead of several loose booleans.
- Reserving space with \`width\` / \`height\` or \`aspect-ratio\` to avoid layout shift (CLS), plus a low-quality placeholder.
- Handling \`load\` and \`error\`, and a retry that really requests the file again.
- A fallback when \`IntersectionObserver\` does not exist, and knowing that native \`loading="lazy"\` covers the simple case.
- Accessibility: a real \`alt\`, \`aria-busy\` while loading, and an announced error.

**Clarifying questions expected:**
- "Is native \`loading="lazy"\` acceptable, or do you need custom thresholds, placeholders and status callbacks?"
- "How early should loading start, and is the feed scrolled by the window or by an inner container?"
- "Do we know each image's dimensions up front, so the box can reserve its size?"

**Code / implementation expected:** Yes. A working component in your chosen framework with the observer, placeholder, fade-in, error state and cleanup.`,
    frameworks: {
      // ── react ───────────────────────────────────────────────────────
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. Assumes basic React (components, props, \`useState\`); every browser API is explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain words first, then tagged with <code>📌 Interview term:</code> so you also learn the vocabulary an interviewer listens for. The output in section 6 was produced by actually running the solution on React 19.3.1, in jsdom and in headless Chromium 141.

## 1. Why This Even Matters — A Story First

Imagine a restaurant that cooks every dish on the menu the moment you sit down, just in case you order it. The kitchen is jammed, your actual order is late, and most of the food goes in the bin.

A web page that puts 40 \`<img>\` tags in a feed does exactly that: the browser starts downloading all 40 photos at once, even the ones 20 screens below. On a phone the photos you *can* see arrive late, data is wasted, and the page feels slow.

A **lazy-loaded image** is the sensible kitchen: it cooks a dish only when you are about to order it. Until the photo is close to the screen, the component shows a cheap coloured placeholder of the right size. When the user scrolls near it, the component sets the real \`src\`, waits for the file, and fades it in. If the file is broken, it says so and offers a Retry button.

📌 **Interview term: Lazy loading** — delaying the download of a resource until it is actually needed, here until the image is near the viewport. The opposite is **eager loading**.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is native \`loading="lazy"\` enough, or do you need custom behaviour? | The browser attribute is one line and MDN marks it Baseline "widely available" since March 2022 ([MDN](https://developer.mozilla.org/docs/Web/API/HTMLImageElement/loading)), but you cannot choose the threshold, show a status, or report progress. If they say "native is fine", say so and move on. |
| How early should loading start? | Decides the \`rootMargin\`. Starting 200px early hides the network delay on a normal scroll; a fast fling may still show placeholders. |
| Does the window scroll, or an inner container? | \`IntersectionObserver\` watches the viewport by default; an inner scroller must be passed as \`root\`. |
| Do we know the image dimensions? | Without them the box cannot reserve space and the page jumps when photos arrive (layout shift). |
| What should a failed image look like? | Decides the fallback: a message, a retry, a generic icon, or hiding the card. |
| Do we need placeholders that look like the photo? | A solid colour is free; a blurred thumbnail (LQIP) or a BlurHash string needs data from the server. |

## 3. Requirements and Plan

The build: a \`LazyImage\` component and a demo feed of 8 photos with a "Requested X of 8" counter, a Reset button that remounts the feed, and one photo whose data is deliberately corrupt. The photos are inline SVG data URLs generated in \`photos.js\`, so the playground needs no network.

**Component tree:** \`App\` (counter, reset) → \`Feed\` (8 figures) → \`LazyImage\` (one per photo).

**State model** — the whole component is one small state machine:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Lazy image states: idle goes to loading when the box nears the viewport, loading goes to loaded on the load event or to error on the error event, and Retry goes from error back to loading">
  <defs>
    <marker id="lzr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="90" width="130" height="60" rx="10"/>
  <text class="d-text" x="85" y="117" text-anchor="middle">idle</text>
  <text class="d-sub" x="85" y="137" text-anchor="middle">no src yet</text>
  <rect class="d-box" x="270" y="90" width="150" height="60" rx="10"/>
  <text class="d-text" x="345" y="117" text-anchor="middle">loading</text>
  <text class="d-sub" x="345" y="137" text-anchor="middle">img src set</text>
  <rect class="d-box-accent" x="540" y="20" width="140" height="60" rx="10"/>
  <text class="d-text d-accent" x="610" y="47" text-anchor="middle">loaded</text>
  <text class="d-sub" x="610" y="67" text-anchor="middle">fade in</text>
  <rect class="d-box" x="540" y="160" width="140" height="60" rx="10"/>
  <text class="d-text" x="610" y="187" text-anchor="middle">error</text>
  <text class="d-sub" x="610" y="207" text-anchor="middle">message + Retry</text>
  <path class="d-edge-accent" d="M 150 120 L 262 120" marker-end="url(#lzr-arrow)"/>
  <text class="d-sub" x="206" y="105" text-anchor="middle">in view</text>
  <path class="d-edge" d="M 420 105 L 532 60" marker-end="url(#lzr-arrow)"/>
  <text class="d-sub" x="462" y="66" text-anchor="middle">onLoad</text>
  <path class="d-edge" d="M 420 135 L 532 180" marker-end="url(#lzr-arrow)"/>
  <text class="d-sub" x="462" y="182" text-anchor="middle">onError</text>
  <path class="d-edge-dashed" d="M 540 205 L 345 205 L 345 158" marker-end="url(#lzr-arrow)"/>
  <text class="d-sub" x="440" y="232" text-anchor="middle">Retry</text>
</svg>

One \`status\` string replaces three booleans (\`inView\`, \`loaded\`, \`failed\`) that could contradict each other. Everything else is derived from it: whether an \`<img>\` exists, its CSS class, \`aria-busy\`, and the error panel.

| Piece | Where it lives | Why |
| :--- | :--- | :--- |
| \`status\` | \`useState\` | It changes what is rendered |
| The box element | \`useRef\` | The observer needs the DOM node; it never affects rendering |
| The observer | Local variable inside the effect | Created and destroyed by the effect itself |
| Counts in the header | \`App\` state, reported through \`onStatus\` | The parent owns the summary; the child only reports |

## 4. Build It Step by Step

### Step 1: Reserve the space and show a placeholder

~~~jsx
<div
  ref={boxRef}
  className="lazy"
  data-status={status}
  aria-busy={status === "loading"}
  style={{ aspectRatio: width + " / " + height, background: placeholder }}
>
~~~

The box gets its final shape from \`aspect-ratio\` before any byte arrives, and its background is a cheap gradient in the photo's main colours.

📌 **Interview term: Cumulative Layout Shift (CLS)** — a Core Web Vitals metric that measures how much visible content jumps while the page loads. Reserving the image box (with \`width\` / \`height\` attributes or \`aspect-ratio\`) is the standard fix.

📌 **Interview term: LQIP (low-quality image placeholder)** — something tiny that hints at the photo while the real one loads: a dominant colour, a gradient, a 20px blurred thumbnail or a BlurHash string. Here it is a CSS gradient, which costs nothing to download.

### Step 2: Watch the box with an IntersectionObserver

~~~jsx
useEffect(() => {
  if (status !== "idle") return;
  if (typeof IntersectionObserver === "undefined") {
    update("loading"); // old browser: load straight away
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        update("loading");
      }
    },
    { rootMargin },
  );
  io.observe(boxRef.current);
  return () => io.disconnect();
}, [status, rootMargin]);
~~~

📌 **Interview term: IntersectionObserver** — a browser API that calls you back when an element starts or stops overlapping the viewport (or a \`root\` element). The browser does the geometry off the main thread, so it replaces the old pattern of a \`scroll\` listener calling \`getBoundingClientRect()\` on every image. The plain JavaScript version is covered in [lazy-loading images with IntersectionObserver](/interview-question/how-would-you-use-intersectionobserver-to-lazy-load-images-only-as-they-scroll-i).

📌 **Interview term: rootMargin** — grows (or shrinks) the area the observer treats as "visible". \`"200px"\` means "tell me when the box is within 200px of the screen", so the download starts before the user actually gets there.

Three details make this effect correct:

- **It only runs while \`idle\`.** Once the photo is requested, the effect returns early, so there is nothing left to watch.
- **It disconnects in two places**: in the callback (we only care about the first intersection) and in the cleanup. The cleanup runs on unmount and, in development, during React's StrictMode double-mount, which is why the driver below counts twice as many observers in React as in Vue. See [the useEffect cleanup function](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect).
- **It degrades.** Without \`IntersectionObserver\`, the component simply loads at once. That path is exactly what jsdom exercises first in section 6.

### Step 3: Render the image only when requested, and fade it in

~~~jsx
{
  (status === "loading" || status === "loaded") && (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      className={
        status === "loaded" ? "lazy-img is-loaded" : "lazy-img"
      }
      onLoad={() => update("loaded")}
      onError={() => update("error")}
    />
  );
}
~~~

Not rendering the \`<img>\` at all while idle is the core trick: no \`src\`, no request. The CSS keeps the image at \`opacity: 0\` until the \`is-loaded\` class arrives, then a 0.4s transition fades it in (switched off under \`prefers-reduced-motion\`).

📌 **Interview term: \`decoding="async"\`** — a hint that the browser may decode the image off the critical path, so a big photo does not block other rendering.

### Step 4: Error state and a real retry

~~~jsx
{
  status === "error" && (
    <div className="lazy-error" role="alert">
      <span>Could not load "{alt}"</span>
      <button type="button" onClick={retry}>
        Retry
      </button>
    </div>
  );
}
~~~

The error branch unmounts the \`<img>\`. Retry sets the status back to \`loading\`, which mounts a brand new \`<img>\` element, so the browser really requests the file again. For an HTTP URL that the server might cache as a failure, you would also add a cache-busting query such as \`?retry=2\`.

📌 **Interview term: \`role="alert"\`** — an ARIA live region that screen readers announce as soon as it appears, so a blind user learns that a photo failed without hunting for it.

### Step 5: Report to the parent without an effect

~~~jsx
function update(next) {
  setStatus(next);
  if (onStatus) onStatus(next);
}
~~~

The status is reported in the same place it changes, rather than in a \`useEffect\` that watches \`status\`. That avoids an extra render pass and avoids the classic bug of an effect depending on an inline \`onStatus\` function that changes on every parent render. The parent's \`report\` returns the previous object when nothing changed, so repeated reports cost nothing.

The Reset button bumps a \`run\` number used as the feed's \`key\`, which throws away every \`LazyImage\` and mounts fresh ones in the idle state, a deliberate use of [the key prop to reset state](/interview-question/how-can-the-key-prop-be-used-to-deliberately-reset-component-state).

## 5. Native \`loading="lazy"\` vs. This Component

| | \`<img loading="lazy">\` | IntersectionObserver component |
| :--- | :--- | :--- |
| Code | One attribute | About 70 lines |
| Threshold | Chosen by the browser | You pick \`rootMargin\` |
| Placeholder, fade, status | Not built in | Yes |
| With JavaScript off | The image still shows (loaded eagerly, per [web.dev](https://web.dev/articles/lazy-loading)) | The image never loads |
| Good for | Content images in a long article | Feeds and galleries that need status, analytics or custom placeholders |

A strong answer mentions both and says which one you would ship. A pragmatic hybrid also exists: render \`loading="lazy"\` on a server-rendered \`<img>\`, and only add the observer for features the attribute cannot do.

## 6. Verified

The solution was mounted in jsdom with \`createRoot(...).render(<StrictMode><App /></StrictMode>)\`, the way the playground boots it. jsdom has no \`IntersectionObserver\` and never downloads images, so the driver first records the fallback path, then installs a **fake IntersectionObserver** that records each instance and lets it trigger intersections by hand, clicks Reset demo to remount the feed, and fires \`load\` / \`error\` events on the \`<img>\` tags itself. Letters per photo: \`.\` idle, \`o\` loading, \`#\` loaded, \`x\` error.

\`\`\`text
no IO   : oooooooo | 8 img tags | Requested 8 of 8 · loaded 0 · failed 0
reset   : ........ | 0 img tags | live observers 8 | rootMargin 200px
2 in view: oo...... | 2 img tags | Requested 2 of 8 · loaded 0 · failed 0 | live observers 6
img 1 before load: class = lazy-img
img 1 after load : class = lazy-img is-loaded | Requested 2 of 8 · loaded 2 · failed 0
broken  : ##...x.. | alert: Could not load "Broken link"Retry
retry   : ##...o.. | new img tag: true | Requested 3 of 8 · loaded 2 · failed 0
re-show : ##...o..
reset 2 : old observers 5 -> still live 0 | new live 8 | created in total 32 | ........
\`\`\`

Read it line by line: without the API every image loads at once (the fallback). With the observer, nothing is requested and no \`<img>\` exists until a box intersects; each intersection disconnects that observer (8 live, then 6). The fade class appears only after \`load\`. The broken photo shows the alert, and Retry mounts a new \`<img>\`. On the second reset, all 5 observers still waiting are disconnected. "Created in total 32" is 16 per mount: StrictMode in development mounts, cleans up and mounts each effect again, so 8 images create 16 observers and the cleanup disconnects the first 8.

The same files were then bundled and opened in **headless Chromium 141** with a real \`IntersectionObserver\`, a 400 × 700 viewport and real image decoding:

\`\`\`text
at top      : ###..... | Requested 3 of 8 · loaded 3 · failed 0
after 1000px: #####x#. | Requested 7 of 8 · loaded 6 · failed 1
at bottom   : #####x## | Requested 8 of 8 · loaded 7 · failed 1
loaded img opacity: 1
\`\`\`

Only the photos within 200px of the first screen were requested at the top; scrolling requested the rest, and the corrupt data URL fired a real \`error\` event. What was not measured: the visual smoothness of the fade.

## 7. Edge Cases and Accessibility

| Case | What the solution does |
| :--- | :--- |
| No \`IntersectionObserver\` (old browser, some test runners) | Loads immediately |
| Image already scrolled past before it loads | It still finishes; the observer only gates the start |
| Unmount before intersecting | Cleanup disconnects the observer, so no callback runs on a dead component |
| Broken file | \`role="alert"\` message plus Retry, which mounts a fresh \`<img>\` |
| Screen readers | \`alt\` is always set; \`aria-busy\` marks the box while loading |
| Reduced motion | The fade and the shimmer are disabled with a media query |
| Layout shift | \`aspect-ratio\` plus \`width\` / \`height\` attributes reserve the box |

## 8. Common Pitfalls

- **Setting \`src\` and hoping the browser waits.** Any \`<img>\` with a \`src\` downloads. Either leave \`src\` off (or render no \`<img>\`) until the box is near, or use the native attribute.
- **Never disconnecting.** One observer per image that keeps watching after the image loaded wastes callbacks and leaks on unmount. Disconnect on first intersection and in the cleanup.
- **A \`scroll\` listener with \`getBoundingClientRect()\` per image.** It forces layout on every scroll event for every image. If you must, [throttle](/interview-question/implement-throttle-func-wait-leading-trailing) it, but IntersectionObserver is the right tool.
- **No reserved size.** A placeholder of height 0 means the whole feed jumps as photos arrive and the observer sees all eight boxes stacked at the top, so they all load at once.
- **Retry that changes nothing.** Calling \`setStatus("loading")\` while the same failed \`<img>\` stays mounted does not re-request the file. Unmount and remount it, or change the URL.
- **Forgetting \`alt\`.** A lazy image is still content. Decorative ones get \`alt=""\`; real ones need a description.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"First: is native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loading=lazy</code> enough? If you need a threshold, a placeholder and load or error status, I will build a component around IntersectionObserver."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State model:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code> string: idle, loading, loaded, error. While idle there is no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;img&gt;</code> at all, so nothing downloads. The box reserves its size with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aspect-ratio</code> and shows a gradient placeholder."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The observer:</strong> <span style="color:#f0e2c8;">"In a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useEffect</code> I observe the box with a 200px <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rootMargin</code>. On the first intersection I disconnect and switch to loading; the cleanup also disconnects, which covers unmount and StrictMode."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Load and error:</strong> <span style="color:#f0e2c8;">"The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;img&gt;</code> gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onLoad</code> to add the fade-in class and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onError</code> to show a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=alert</code> message with Retry. Retry remounts the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;img&gt;</code>, so the file is really requested again."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close the loop:</strong> <span style="color:#f0e2c8;">"I would fall back to eager loading without IntersectionObserver, test it with a fake observer that I trigger by hand, and mention CLS, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">alt</code> text and reduced motion."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">loading="lazy"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Often you should. It is one attribute and widely supported. The component exists for what the attribute cannot do: a chosen threshold, a placeholder and fade, status callbacks for analytics, or an inner scroll container passed as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">root</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">With 500 images, is one observer per image a problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works, but a single shared observer is cheaper: create one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IntersectionObserver</code>, keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from element to callback, and have each image register and unregister in its effect. The callback looks up <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">entry.target</code> in the map.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exactly as in the Verified section: replace <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IntersectionObserver</code> with a fake that records <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">observe</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">disconnect</code> and lets the test fire <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isIntersecting: true</code>, then dispatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">load</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">error</code> on the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;img&gt;</code>. Assert the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;img&gt;</code> does not exist before the intersection.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make the placeholder look like the photo?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Ship a tiny representation from the server: the dominant colour, a 20px blurred thumbnail as a data URL, or a BlurHash string decoded on the client. Then cross-fade from it to the real image.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about responsive images?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">srcSet</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sizes</code> through to the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;img&gt;</code> and set them only once loading starts, just like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">src</code>. The browser then picks the right file for the screen and pixel density.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lazy loading** | Download a resource only when it is about to be needed |
| **IntersectionObserver** | Browser API that reports when an element enters or leaves the viewport |
| **rootMargin** | Extra margin around the viewport, so loading starts early |
| **Cumulative Layout Shift** | How much content jumps while the page loads |
| **LQIP** | A tiny placeholder (colour, gradient, blurred thumbnail) shown before the photo |
| **decoding="async"** | Hint that the browser may decode the image off the critical path |
| **role="alert"** | A live region announced by screen readers as soon as it appears |

---
**Conclusion:** A lazy-loaded image is a four-state machine (idle, loading, loaded, error) wrapped around an IntersectionObserver. Reserve the box so nothing jumps, render no \`<img>\` until the observer fires, disconnect the observer as soon as it has done its job and on unmount, fade in on \`load\`, and give \`error\` a real retry. As verified in jsdom and in Chromium 141, only the photos near the screen are requested, the broken one is announced and retryable, and every observer is cleaned up. Mention native \`loading="lazy"\` first; build the component when the product needs thresholds, placeholders or status. The same idea, applied to whole pages of data, is [infinite scroll with IntersectionObserver](/interview-question/build-infinite-scroll-with-intersectionobserver-skeleton).`,
        files: {
          "/App.js": `import { useState } from "react";
import LazyImage from "./src/components/LazyImage";
import { photos } from "./src/data/photos";

function Feed({ onStatus }) {
  return (
    <div className="feed" data-testid="feed">
      {photos.map((p) => (
        <figure key={p.id}>
          <LazyImage
            src={p.src}
            alt={p.alt}
            width={640}
            height={400}
            placeholder={p.placeholder}
            onStatus={(s) => onStatus(p.id, s)}
          />
          <figcaption>
            {p.id}. {p.alt}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export default function App() {
  const [run, setRun] = useState(0); // bump to remount the feed
  const [statuses, setStatuses] = useState({});

  const report = (id, s) =>
    setStatuses((prev) => (prev[id] === s ? prev : { ...prev, [id]: s }));
  const values = Object.values(statuses);
  const requested = values.length;
  const loaded = values.filter((s) => s === "loaded").length;
  const failed = values.filter((s) => s === "error").length;

  function reset() {
    setStatuses({});
    setRun((r) => r + 1);
  }

  return (
    <main className="app">
      <header className="bar">
        <h1>Lazy-loaded images</h1>
        <p data-testid="stats" aria-live="polite">
          Requested {requested} of {photos.length} · loaded {loaded} · failed{" "}
          {failed}
        </p>
        <button type="button" onClick={reset}>
          Reset demo
        </button>
      </header>
      <p className="hint">
        Scroll the feed: each photo is requested only when it comes within 200px
        of the view.
      </p>
      <Feed key={run} onStatus={report} />
    </main>
  );
}
`,
          "/src/components/LazyImage.js": `import { useEffect, useRef, useState } from "react";

// status: "idle" (not requested) -> "loading" (src set) -> "loaded" | "error"
export default function LazyImage({
  src,
  alt,
  width,
  height,
  placeholder,
  rootMargin = "200px",
  onStatus,
}) {
  const [status, setStatus] = useState("idle");
  const boxRef = useRef(null);

  function update(next) {
    setStatus(next);
    if (onStatus) onStatus(next);
  }

  // Watch the box only while nothing has been requested yet.
  useEffect(() => {
    if (status !== "idle") return;
    if (typeof IntersectionObserver === "undefined") {
      update("loading"); // old browser: load straight away
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          update("loading");
        }
      },
      { rootMargin },
    );
    io.observe(boxRef.current);
    return () => io.disconnect();
  }, [status, rootMargin]);

  // The error branch unmounted the <img>, so "loading" mounts a fresh one,
  // which makes the browser request the file again.
  function retry() {
    update("loading");
  }

  return (
    <div
      ref={boxRef}
      className="lazy"
      data-testid="lazy"
      data-status={status}
      aria-busy={status === "loading"}
      style={{ aspectRatio: width + " / " + height, background: placeholder }}
    >
      {(status === "loading" || status === "loaded") && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          decoding="async"
          className={status === "loaded" ? "lazy-img is-loaded" : "lazy-img"}
          onLoad={() => update("loaded")}
          onError={() => update("error")}
        />
      )}
      {status === "error" && (
        <div className="lazy-error" role="alert">
          <span>Could not load "{alt}"</span>
          <button type="button" onClick={retry}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
`,
          "/src/data/photos.js": `// Offline "photos": inline SVG data URLs, so the demo needs no network.
// Tiny markup helper: el("rect", { width: 9 }) gives <rect width="9"/>.
function el(tag, attrs, children) {
  const a = Object.keys(attrs)
    .map((k) => " " + k + '="' + attrs[k] + '"')
    .join("");
  return children
    ? "<" + tag + a + ">" + children.join("") + "</" + tag + ">"
    : "<" + tag + a + "/>";
}

function svgPhoto(hue, label) {
  const svg = el(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 640,
      height: 400,
      viewBox: "0 0 640 400",
    },
    [
      el("defs", {}, [
        el("linearGradient", { id: "g", x1: 0, y1: 0, x2: 1, y2: 1 }, [
          el("stop", { offset: 0, "stop-color": "hsl(" + hue + ",70%,55%)" }),
          el("stop", {
            offset: 1,
            "stop-color": "hsl(" + (hue + 40) + ",70%,30%)",
          }),
        ]),
      ]),
      el("rect", { width: 640, height: 400, fill: "url(#g)" }),
      el("circle", {
        cx: 500,
        cy: 110,
        r: 60,
        fill: "hsla(" + (hue + 180) + ",80%,85%,0.6)",
      }),
      el("path", {
        d: "M0 400 L180 220 L300 330 L420 200 L640 400 Z",
        fill: "hsla(" + hue + ",40%,15%,0.7)",
      }),
      el(
        "text",
        {
          x: 32,
          y: 64,
          "font-family": "sans-serif",
          "font-size": 40,
          fill: "white",
        },
        [label],
      ),
    ],
  );
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const names = [
  "Dunes",
  "Lagoon",
  "Forest",
  "Canyon",
  "Glacier",
  "Broken link",
  "Meadow",
  "Volcano",
];

export const photos = names.map((name, i) => {
  const hue = (i * 45) % 360;
  return {
    id: i + 1,
    alt: name,
    // Photo 6 points at a corrupt file on purpose, to show the error state.
    src:
      name === "Broken link"
        ? "data:image/png;base64,AAAA"
        : svgPhoto(hue, name),
    // Low-quality placeholder: the photo dominant colours as a CSS gradient.
    placeholder:
      "linear-gradient(135deg, hsl(" +
      hue +
      ",45%,40%), hsl(" +
      (hue + 40) +
      ",45%,22%))",
  };
});
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 640px;
  margin: 0 auto;
  padding: 16px;
}
.bar {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #0f1115;
  padding: 8px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
}
.bar h1 {
  font-size: 1.2rem;
  margin: 0;
  flex: 1 1 100%;
}
.bar p {
  margin: 0;
  color: #a8b3c7;
  font-size: 0.9rem;
  flex: 1;
}
button {
  background: #2a3142;
  color: #e6e6e6;
  border: 1px solid #3d4760;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
button:hover {
  background: #343d52;
}
button:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.hint {
  color: #8a93a6;
  font-size: 0.85rem;
}
.feed {
  display: grid;
  gap: 24px;
}
figure {
  margin: 0;
}
figcaption {
  margin-top: 6px;
  color: #a8b3c7;
  font-size: 0.9rem;
}
.lazy {
  position: relative;
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
}
.lazy[aria-busy="true"]::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.12),
    transparent
  );
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}
.lazy-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.4s ease;
}
.lazy-img.is-loaded {
  opacity: 1;
}
.lazy-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  background: rgba(20, 10, 10, 0.75);
  color: #ffb4a8;
}
@media (prefers-reduced-motion: reduce) {
  .lazy-img {
    transition: none;
  }
  .lazy[aria-busy="true"]::after {
    animation: none;
  }
}
`,
        },
      },
      // ── vue ─────────────────────────────────────────────────────────
      vue: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Vue. Assumes \`<script setup>\`, \`ref\` and props; every browser API is explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain words first, then <code>📌 Interview term:</code> callouts with the exact vocabulary. The Verified output was produced by running this solution on Vue 3.5.44 in jsdom and in headless Chromium 141.

## 1. A Story First

A photo feed that renders 40 \`<img>\` tags makes the browser download 40 photos at once, including the ones the user will never scroll to. On a phone, the three photos on screen wait behind 37 they cannot see.

A lazy image is a waiter who brings each dish just before you reach for it. Until a photo is close to the screen, the component shows a cheap gradient of the right size. When the user scrolls near it, the component renders the real \`<img>\`, fades it in when it arrives, and offers a Retry button if the file is broken.

📌 **Interview term: Lazy loading** — delaying a download until the resource is about to be needed. Browsers offer a built-in version, \`<img loading="lazy">\`, which MDN marks Baseline widely available ([MDN](https://developer.mozilla.org/docs/Web/API/HTMLImageElement/loading)). You build your own when you need a custom threshold, a placeholder and status events.

## 2. Requirements and the Vue State Model

\`LazyImage.vue\` takes \`src\`, \`alt\`, \`width\`, \`height\`, \`placeholder\` and \`rootMargin\` props and emits \`status\`. \`App.vue\` shows a feed of 8 offline SVG photos (one deliberately corrupt), a "Requested X of 8" counter built from those events, and a Reset button.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 170" role="img" aria-label="LazyImage status ref moves from idle to loading when the observer fires, then to loaded or error; each change is emitted to App, which derives the counters with computed">
  <defs>
    <marker id="lzv-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="70" text-anchor="middle">IntersectionObserver</text>
  <text class="d-sub" x="105" y="92" text-anchor="middle">created in onMounted</text>
  <rect class="d-box" x="260" y="40" width="170" height="70" rx="10"/>
  <text class="d-text" x="345" y="70" text-anchor="middle">status ref</text>
  <text class="d-sub" x="345" y="92" text-anchor="middle">idle to loaded</text>
  <rect class="d-box-accent" x="500" y="40" width="180" height="70" rx="10"/>
  <text class="d-text d-accent" x="590" y="70" text-anchor="middle">App counters</text>
  <text class="d-sub" x="590" y="92" text-anchor="middle">computed from events</text>
  <path class="d-edge-accent" d="M 190 75 L 252 75" marker-end="url(#lzv-arrow)"/>
  <path class="d-edge" d="M 430 75 L 492 75" marker-end="url(#lzv-arrow)"/>
  <text class="d-sub" x="461" y="140" text-anchor="middle">emit status</text>
</svg>

| Piece | Vue tool | Why |
| :--- | :--- | :--- |
| \`status\` ("idle", "loading", "loaded", "error") | \`ref\` | Drives the template: no \`<img>\` while idle |
| The box element | \`useTemplateRef("box")\` | The observer needs the DOM node |
| The observer | A plain \`let io\` | Never rendered, so it should not be reactive |
| Loaded / failed counts | \`computed\` in \`App.vue\` | Derived from the reported statuses, never stored twice |

📌 **Interview term: \`useTemplateRef()\`** — returns a ref that Vue fills with the element whose \`ref\` attribute matches the given string, once the component is mounted. See [useTemplateRef](/interview-question/what-is-usetemplateref-vue-3-5-and-how-does-it-improve-on-ref).

## 3. Build It Step by Step

### Step 1: Observe in \`onMounted\`, stop in \`onBeforeUnmount\`

~~~js
const status = ref("idle");
const box = useTemplateRef("box");
let io = null;

function stop() {
  if (io) {
    io.disconnect();
    io = null;
  }
}

onMounted(() => {
  if (typeof IntersectionObserver === "undefined") {
    update("loading"); // old browser: load straight away
    return;
  }
  io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        stop();
        update("loading");
      }
    },
    { rootMargin: props.rootMargin },
  );
  io.observe(box.value);
});
onBeforeUnmount(stop);
~~~

📌 **Interview term: IntersectionObserver** — a browser API that calls you back when an element overlaps the viewport. The browser computes the geometry, so you do not need a \`scroll\` listener. The vanilla version is in [lazy-loading with IntersectionObserver](/interview-question/how-would-you-use-intersectionobserver-to-lazy-load-images-only-as-they-scroll-i).

📌 **Interview term: rootMargin** — extends the "visible" area; \`"200px"\` starts the download 200px before the box reaches the screen.

The element only exists after mounting, which is why the observer is created in \`onMounted\`, not at the top of \`<script setup>\`. \`onBeforeUnmount\` disconnects it if the image is destroyed before it was ever seen ([Vue lifecycle hooks](/interview-question/what-are-vue-lifecycle-hooks)). Unlike React in development, Vue mounts once, so each image creates exactly one observer.

### Step 2: Let the template follow the status

~~~vue
<div ref="box" class="lazy" :data-status="status" :aria-busy="status === 'loading'"
     :style="{ aspectRatio: width + ' / ' + height, background: placeholder }">
  <img v-if="status === 'loading' || status === 'loaded'"
       :src="src" :alt="alt" :width="width" :height="height" decoding="async"
       :class="['lazy-img', { 'is-loaded': status === 'loaded' }]"
       @load="update('loaded')" @error="update('error')" />
  <div v-else-if="status === 'error'" class="lazy-error" role="alert">
    <span>Could not load "{{ alt }}"</span>
    <button type="button" @click="retry">Retry</button>
  </div>
</div>
~~~

\`v-if\` keeps the \`<img>\` out of the DOM while idle, so there is no \`src\` and no request. \`aspect-ratio\` reserves the final size before any byte arrives.

📌 **Interview term: Cumulative Layout Shift (CLS)** — how much visible content jumps during load. Reserving the box is the fix, and it also stops all eight empty boxes collapsing to height 0 and "intersecting" at once.

Retry sets \`status\` back to \`loading\`. Because the error branch removed the \`<img>\`, \`v-if\` creates a fresh element and the browser requests the file again.

### Step 3: Report upward with an emit

~~~js
const emit = defineEmits(["status"]);

function update(next) {
  status.value = next;
  emit("status", next);
}
~~~

\`App.vue\` listens with \`@status="(s) => report(p.id, s)"\`, stores a plain object of statuses, and derives \`loaded\` and \`failed\` with \`computed\` ([defineProps and defineEmits](/interview-question/how-do-defineprops-and-defineemits-work-in-script-setup)). Reset bumps a \`run\` ref used as \`:key\` on the feed, which unmounts every image and mounts fresh ones.

## 4. Verified

Mounted in jsdom with \`createApp(App).mount("#app")\`. jsdom has no \`IntersectionObserver\` and never downloads images, so the driver records the no-observer fallback, installs a **fake IntersectionObserver** that it triggers by hand, clicks Reset demo, and dispatches \`load\` / \`error\` on the \`<img>\` tags. \`.\` idle, \`o\` loading, \`#\` loaded, \`x\` error:

\`\`\`text
no IO   : oooooooo | 8 img tags | Requested 8 of 8 · loaded 0 · failed 0
reset   : ........ | 0 img tags | live observers 8 | rootMargin 200px
2 in view: oo...... | 2 img tags | Requested 2 of 8 · loaded 0 · failed 0 | live observers 6
img 1 before load: class = lazy-img
img 1 after load : class = lazy-img is-loaded | Requested 2 of 8 · loaded 2 · failed 0
broken  : ##...x.. | alert: Could not load "Broken link"Retry
retry   : ##...o.. | new img tag: true | Requested 3 of 8 · loaded 2 · failed 0
re-show : ##...o..
reset 2 : old observers 5 -> still live 0 | new live 8 | created in total 16 | ........
\`\`\`

Sixteen observers in total: 8 per mount, one per image, and the 5 still waiting at the second reset were all disconnected by \`onBeforeUnmount\`. In headless Chromium 141 with the real API and a 400 × 700 viewport, the feed requested 3 photos at the top, 7 after scrolling 1000px (the corrupt one fired a real \`error\`) and all 8 at the bottom; a loaded image ended at \`opacity: 1\`.

## 5. Common Pitfalls

- **Creating the observer at the top of \`<script setup>\`.** The template ref is still \`null\` there. Wait for \`onMounted\`.
- **Making the observer reactive.** \`const io = ref(new IntersectionObserver(...))\` wraps a browser object in a proxy for no benefit. A plain variable is right.
- **Using \`v-show\` for the \`<img>\`.** \`v-show\` only toggles CSS; the element, and its \`src\` download, exist from the start. Lazy loading needs \`v-if\`.
- **Forgetting \`onBeforeUnmount\`.** A feed that is filtered or paginated destroys images that were never seen; their observers must be disconnected.
- **No reserved size.** Zero-height placeholders all intersect at once and the page jumps when photos arrive.
- **Writing a directive and a component that both observe.** A \`v-lazy\` [custom directive](/interview-question/how-do-you-create-a-custom-directive-in-vue) is a fine alternative, but pick one owner for the observer.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Scope:</strong> <span style="color:#f0e2c8;">"I will check whether native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loading=lazy</code> is enough; if they want a threshold, placeholder and status, I build a component around IntersectionObserver."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code> ref with four values. The template uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> so there is no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;img&gt;</code>, and no request, while it is idle. The box reserves its size with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aspect-ratio</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Observer:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTemplateRef</code> gives me the box; in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> I observe it with a 200px <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rootMargin</code>, disconnect on the first intersection, and disconnect again in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBeforeUnmount</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Events:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@load</code> adds the fade class, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@error</code> shows a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=alert</code> panel with Retry, and every change is emitted so the parent can count with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Wrap up:</strong> <span style="color:#f0e2c8;">"Fallback to eager loading without the API, test with a fake observer, and mention CLS, alt text and reduced motion."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you write this as a directive instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-lazy</code> directive that swaps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data-src</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">src</code> on intersection is a good fit when you only need the download delay on plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;img&gt;</code> tags. A component is better when you also render a placeholder, an error panel and emit status.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-if</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-show</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-show</code> only toggles <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">display</code>, so the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;img&gt;</code> and its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">src</code> exist from the first render and the browser downloads it. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> keeps the element out of the DOM until the status says loading.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you share one observer between many images?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put it in a composable that owns a single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IntersectionObserver</code> and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from element to callback. Each image registers in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> and unregisters in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBeforeUnmount</code>; the observer callback looks up <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">entry.target</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it with Vue Test Utils?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Stub <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IntersectionObserver</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code> before mounting, capture the callback, call it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isIntersecting: true</code>, await <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code>, then trigger <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">load</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">error</code> on the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">img</code> and assert the class or the alert.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lazy loading** | Download only when about to be needed |
| **IntersectionObserver** | Browser API reporting when an element enters the viewport |
| **rootMargin** | Extra margin so loading starts early |
| **useTemplateRef** | Vue helper that returns a ref to a template element |
| **CLS** | Cumulative Layout Shift: how much content jumps during load |
| **role="alert"** | Live region announced by screen readers when it appears |

---
**Conclusion:** In Vue, a lazy image is a \`status\` ref, a \`v-if\` that keeps the \`<img>\` out of the DOM until the observer fires, an observer created in \`onMounted\` and disconnected on first intersection and in \`onBeforeUnmount\`, and an emit that lets the parent count progress with \`computed\`. Verified on Vue 3.5.44, nothing downloads before an intersection, the broken photo is announced and retryable, and every observer is cleaned up; Chromium confirmed the real scrolling behaviour.`,
        files: {
          "/src/App.vue": `<script setup>
import { ref, computed } from "vue";
import LazyImage from "./components/LazyImage.vue";
import { photos } from "./data/photos.js";

const run = ref(0); // bump to remount the feed
const statuses = ref({});

const values = computed(() => Object.values(statuses.value));
const loaded = computed(
  () => values.value.filter((s) => s === "loaded").length,
);
const failed = computed(() => values.value.filter((s) => s === "error").length);

function report(id, s) {
  statuses.value = { ...statuses.value, [id]: s };
}
function reset() {
  statuses.value = {};
  run.value++;
}
</script>

<template>
  <main class="app">
    <header class="bar">
      <h1>Lazy-loaded images</h1>
      <p data-testid="stats" aria-live="polite">
        Requested {{ values.length }} of {{ photos.length }} · loaded {{ loaded }} · failed {{ failed }}
      </p>
      <button type="button" @click="reset">Reset demo</button>
    </header>
    <p class="hint">Scroll the feed: each photo is requested only when it comes within 200px of the view.</p>
    <div :key="run" class="feed" data-testid="feed">
      <figure v-for="p in photos" :key="p.id">
        <LazyImage
          :src="p.src"
          :alt="p.alt"
          :width="640"
          :height="400"
          :placeholder="p.placeholder"
          @status="(s) => report(p.id, s)"
        />
        <figcaption>{{ p.id }}. {{ p.alt }}</figcaption>
      </figure>
    </div>
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 640px;
  margin: 0 auto;
  padding: 16px;
}
.bar {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #0f1115;
  padding: 8px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
}
.bar h1 {
  font-size: 1.2rem;
  margin: 0;
  flex: 1 1 100%;
}
.bar p {
  margin: 0;
  color: #a8b3c7;
  font-size: 0.9rem;
  flex: 1;
}
button {
  background: #2a3142;
  color: #e6e6e6;
  border: 1px solid #3d4760;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
button:hover {
  background: #343d52;
}
button:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.hint {
  color: #8a93a6;
  font-size: 0.85rem;
}
.feed {
  display: grid;
  gap: 24px;
}
figure {
  margin: 0;
}
figcaption {
  margin-top: 6px;
  color: #a8b3c7;
  font-size: 0.9rem;
}
</style>
`,
          "/src/components/LazyImage.vue": `<script setup>
import { ref, onMounted, onBeforeUnmount, useTemplateRef } from "vue";

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  placeholder: { type: String, default: "#222" },
  rootMargin: { type: String, default: "200px" },
});
const emit = defineEmits(["status"]);

// "idle" (not requested) -> "loading" (src set) -> "loaded" | "error"
const status = ref("idle");
const box = useTemplateRef("box");
let io = null;

function update(next) {
  status.value = next;
  emit("status", next);
}

function stop() {
  if (io) {
    io.disconnect();
    io = null;
  }
}

onMounted(() => {
  if (typeof IntersectionObserver === "undefined") {
    update("loading"); // old browser: load straight away
    return;
  }
  io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        stop();
        update("loading");
      }
    },
    { rootMargin: props.rootMargin },
  );
  io.observe(box.value);
});
onBeforeUnmount(stop);

// The error branch removed the <img>, so "loading" renders a fresh one,
// which makes the browser request the file again.
function retry() {
  update("loading");
}
</script>

<template>
  <div
    ref="box"
    class="lazy"
    data-testid="lazy"
    :data-status="status"
    :aria-busy="status === 'loading'"
    :style="{ aspectRatio: width + ' / ' + height, background: placeholder }"
  >
    <img
      v-if="status === 'loading' || status === 'loaded'"
      :src="src"
      :alt="alt"
      :width="width"
      :height="height"
      decoding="async"
      :class="['lazy-img', { 'is-loaded': status === 'loaded' }]"
      @load="update('loaded')"
      @error="update('error')"
    />
    <div v-else-if="status === 'error'" class="lazy-error" role="alert">
      <span>Could not load "{{ alt }}"</span>
      <button type="button" @click="retry">Retry</button>
    </div>
  </div>
</template>

<style>
.lazy {
  position: relative;
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
}
.lazy[aria-busy="true"]::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.12),
    transparent
  );
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}
.lazy-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.4s ease;
}
.lazy-img.is-loaded {
  opacity: 1;
}
.lazy-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  background: rgba(20, 10, 10, 0.75);
  color: #ffb4a8;
}
@media (prefers-reduced-motion: reduce) {
  .lazy-img {
    transition: none;
  }
  .lazy[aria-busy="true"]::after {
    animation: none;
  }
}
</style>
`,
          "/src/data/photos.js": `// Offline "photos": inline SVG data URLs, so the demo needs no network.
// Tiny markup helper: el("rect", { width: 9 }) gives <rect width="9"/>.
function el(tag, attrs, children) {
  const a = Object.keys(attrs)
    .map((k) => " " + k + '="' + attrs[k] + '"')
    .join("");
  return children
    ? "<" + tag + a + ">" + children.join("") + "</" + tag + ">"
    : "<" + tag + a + "/>";
}

function svgPhoto(hue, label) {
  const svg = el(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 640,
      height: 400,
      viewBox: "0 0 640 400",
    },
    [
      el("defs", {}, [
        el("linearGradient", { id: "g", x1: 0, y1: 0, x2: 1, y2: 1 }, [
          el("stop", { offset: 0, "stop-color": "hsl(" + hue + ",70%,55%)" }),
          el("stop", {
            offset: 1,
            "stop-color": "hsl(" + (hue + 40) + ",70%,30%)",
          }),
        ]),
      ]),
      el("rect", { width: 640, height: 400, fill: "url(#g)" }),
      el("circle", {
        cx: 500,
        cy: 110,
        r: 60,
        fill: "hsla(" + (hue + 180) + ",80%,85%,0.6)",
      }),
      el("path", {
        d: "M0 400 L180 220 L300 330 L420 200 L640 400 Z",
        fill: "hsla(" + hue + ",40%,15%,0.7)",
      }),
      el(
        "text",
        {
          x: 32,
          y: 64,
          "font-family": "sans-serif",
          "font-size": 40,
          fill: "white",
        },
        [label],
      ),
    ],
  );
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const names = [
  "Dunes",
  "Lagoon",
  "Forest",
  "Canyon",
  "Glacier",
  "Broken link",
  "Meadow",
  "Volcano",
];

export const photos = names.map((name, i) => {
  const hue = (i * 45) % 360;
  return {
    id: i + 1,
    alt: name,
    // Photo 6 points at a corrupt file on purpose, to show the error state.
    src:
      name === "Broken link"
        ? "data:image/png;base64,AAAA"
        : svgPhoto(hue, name),
    // Low-quality placeholder: the photo dominant colours as a CSS gradient.
    placeholder:
      "linear-gradient(135deg, hsl(" +
      hue +
      ",45%,40%), hsl(" +
      (hue + 40) +
      ",45%,22%))",
  };
});
`,
        },
      },
      // ── angular ─────────────────────────────────────────────────────
      angular: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Angular. Assumes standalone components and basic templates; signals and every browser API are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain words first, then <code>📌 Interview term:</code> callouts with the exact vocabulary. The Verified output comes from running this solution on Angular 22.2.3, both AOT-compiled with strict templates and through the playground runtime JIT, in jsdom and in headless Chromium 141.

## 1. A Story First

A feed with 40 \`<img>\` tags downloads 40 photos the moment it renders, even the ones far below the fold. A lazy image waits: it shows a placeholder the size of the photo and only creates the real \`<img>\` when the user scrolls near it. Then it fades the photo in, or shows a Retry button if the file is broken.

📌 **Interview term: Lazy loading** — deferring a download until it is needed. Native \`<img loading="lazy">\` is Baseline widely available ([MDN](https://developer.mozilla.org/docs/Web/API/HTMLImageElement/loading)) and is enough for plain content images; a component earns its keep when you need a chosen threshold, a placeholder and load or error events.

## 2. Requirements and the Angular State Model

\`LazyImageComponent\` (\`app-lazy-image\`) takes \`src\`, \`alt\`, \`width\`, \`height\`, \`placeholder\` and \`rootMargin\` as \`@Input()\`s and reports every change through \`@Output() statusChange\`. \`AppComponent\` renders 8 offline SVG photos (one corrupt), a counter, and a Reset button.

| Piece | Angular tool | Why |
| :--- | :--- | :--- |
| \`status\` | \`signal<LoadStatus>("idle")\` | The template reads it; changing it schedules a re-render |
| The box element | \`@ViewChild("box", { static: true })\` | The observer needs the native element |
| The observer | A private field | Never rendered |
| Counts | \`computed()\` in \`AppComponent\` | Derived from the reported statuses |

📌 **Interview term: Signal** — a value holder that notifies whatever read it when it changes. Templates that read \`status()\` update automatically, which matters here because Angular 22 runs this playground without Zone.js: a plain field changed inside an observer callback would not re-render. See [Angular Signals](/interview-question/what-are-angular-signals).

The inputs use the \`@Input()\` decorator rather than signal \`input()\`, because the site playground compiles components at runtime and signal inputs do not register there ([input() vs @Input()](/interview-question/signal-inputs-input-vs-input-what-changes-in-angular-17-1)).

## 3. Build It Step by Step

### Step 1: Observe after the view exists, disconnect on destroy

~~~ts
@ViewChild("box", { static: true }) box!: ElementRef<HTMLDivElement>;
readonly status = signal<LoadStatus>("idle");
private io: IntersectionObserver | null = null;

ngAfterViewInit(): void {
  if (typeof IntersectionObserver === "undefined") {
    this.update("loading"); // old browser: load straight away
    return;
  }
  this.io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        this.stop();
        this.update("loading");
      }
    },
    { rootMargin: this.rootMargin },
  );
  this.io.observe(this.box.nativeElement);
}

ngOnDestroy(): void {
  this.stop();
}
~~~

📌 **Interview term: IntersectionObserver** — a browser API that calls you back when an element overlaps the viewport; \`rootMargin: "200px"\` starts loading 200px early. The vanilla version: [lazy-loading with IntersectionObserver](/interview-question/how-would-you-use-intersectionobserver-to-lazy-load-images-only-as-they-scroll-i).

📌 **Interview term: \`@ViewChild\` with \`static: true\`** — gives you the element reference before the first change detection, because the \`#box\` div is not inside an \`@if\`. See [@ViewChild and @ContentChild](/interview-question/what-are-viewchild-and-contentchild).

\`ngAfterViewInit\` is the first hook where the inputs are set and the element is in the DOM, and \`ngOnDestroy\` disconnects an observer whose image was destroyed before it was ever seen ([Angular lifecycle hooks](/interview-question/what-are-angular-lifecycle-hooks)).

### Step 2: The template follows the status with \`@if\`

~~~html
<div
  #box
  class="lazy"
  [attr.data-status]="status()"
  [attr.aria-busy]="status() === 'loading'"
  [style.aspect-ratio]="width + ' / ' + height"
  [style.background]="placeholder"
>
  @if (status() === "loading" || status() === "loaded") {
    <img
      [src]="src"
      [alt]="alt"
      [width]="width"
      [height]="height"
      decoding="async"
      class="lazy-img"
      [class.is-loaded]="status() === 'loaded'"
      (load)="update('loaded')"
      (error)="update('error')"
    />
  } @else if (status() === "error") {
    <div class="lazy-error" role="alert">
      <span>Could not load "{{ alt }}"</span>
      <button type="button" (click)="retry()">Retry</button>
    </div>
  }
</div>
~~~

While idle, \`@if\` renders no \`<img>\`, so there is no request. \`aspect-ratio\` reserves the box, which prevents layout shift.

📌 **Interview term: Cumulative Layout Shift (CLS)** — how much the page jumps while loading. Reserving each image box keeps it at zero and keeps the observer honest: eight zero-height boxes would all intersect at once.

Retry calls \`update("loading")\`; the error branch had removed the \`<img>\`, so \`@if\` creates a new one and the browser fetches again.

### Step 3: Remounting the feed without NG0956

Reset must throw away all eight images. The first attempt, \`@for (r of [run()]; track r)\`, works but Angular 22 prints warning **NG0956** in development each time: tracking by identity re-created the whole collection. The fix that ships tracks a property instead:

~~~ts
readonly run = signal(0);
readonly feedKey = computed(() => [{ run: this.run() }]);
~~~

~~~html
@for (f of feedKey(); track f.run) { <div class="feed"> ... </div> }
~~~

A new \`run\` value is a new key, so the block is destroyed and recreated, which is exactly what Reset wants. More on \`track\`: [why @for requires track](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux).

## 4. Verified

Booted with \`bootstrapApplication(AppComponent)\` in jsdom, AOT (\`ngc\` with \`strictTemplates\`) and runtime JIT, both passing. jsdom has no \`IntersectionObserver\` and never loads images, so the driver records the fallback, installs a **fake IntersectionObserver** it triggers by hand, clicks Reset demo, and dispatches \`load\` / \`error\` itself. \`.\` idle, \`o\` loading, \`#\` loaded, \`x\` error:

\`\`\`text
no IO   : oooooooo | 8 img tags | Requested 8 of 8 · loaded 0 · failed 0
reset   : ........ | 0 img tags | live observers 8 | rootMargin 200px
2 in view: oo...... | 2 img tags | Requested 2 of 8 · loaded 0 · failed 0 | live observers 6
img 1 before load: class = lazy-img
img 1 after load : class = lazy-img is-loaded | Requested 2 of 8 · loaded 2 · failed 0
broken  : ##...x.. | alert: Could not load "Broken link"Retry
retry   : ##...o.. | new img tag: true | Requested 3 of 8 · loaded 2 · failed 0
re-show : ##...o..
reset 2 : old observers 5 -> still live 0 | new live 8 | created in total 16 | ........
\`\`\`

The AOT and JIT runs printed identical lines (shown once). In headless Chromium 141, bundled without Zone.js, the real observer requested 3 photos at the top, 7 after scrolling 1000px (the corrupt one fired a real \`error\`) and all 8 at the bottom.

## 5. Common Pitfalls

- **A plain field for status.** \`this.status = "loaded"\` inside an \`(load)\` handler happens to work, but inside the observer callback nothing schedules change detection without Zone.js. A signal works in both.
- **Observing in the constructor.** Inputs are not set and the view does not exist yet; use \`ngAfterViewInit\`.
- **Forgetting \`ngOnDestroy\`.** Destroyed, never-seen images keep observers alive.
- **Hiding the \`<img>\` with \`[hidden]\` or a class.** The element still exists and still downloads; only \`@if\` (or no \`src\`) prevents the request.
- **\`track\` by identity on a remount trick.** It triggers NG0956 in dev mode; track a property.
- **Signal \`input()\` in the playground.** It does not register under runtime JIT; use \`@Input()\` here, signal inputs in a CLI app.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Scope:</strong> <span style="color:#f0e2c8;">"Native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loading=lazy</code> covers simple pages; I will build a component because we want a threshold, a placeholder and load or error status."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code> signal with four values. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code> keeps the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;img&gt;</code> out of the DOM while idle, so nothing downloads, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aspect-ratio</code> reserves the box."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Observer:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChild</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">static: true</code> gives me the box. In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code> I observe it with a 200px <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rootMargin</code>; I disconnect on the first intersection and in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnDestroy</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Events:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(load)</code> adds the fade class, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(error)</code> shows a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=alert</code> panel with Retry, and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Output</code> reports status so the parent counts with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Wrap up:</strong> <span style="color:#f0e2c8;">"Signals matter because the observer callback runs outside any Angular event; I would test with a fake observer and mention CLS and alt text."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would a directive be better than a component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For plain images, yes: an attribute directive on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;img&gt;</code> that holds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data-src</code> and copies it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">src</code> on intersection is less markup. A component is better when you render a placeholder and an error panel around the image.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need a signal if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(load)</code> already triggers change detection?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Template event bindings schedule a render, but the IntersectionObserver callback is a browser callback Angular knows nothing about. Without Zone.js, setting a plain field there would not update the view; setting a signal does.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you share one observer across all images?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Provide an injectable service that owns one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IntersectionObserver</code> and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from element to callback. Each image registers in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code> and unregisters in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnDestroy</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@defer (on viewport)</code> replace this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It solves a neighbouring problem: it lazy-loads a block of template and its code when it enters the viewport. For one image you still need the image request itself to wait, which this component does.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lazy loading** | Download only when about to be needed |
| **IntersectionObserver** | Browser API reporting when an element enters the viewport |
| **Signal** | Reactive value; reading it in a template subscribes the view |
| **@ViewChild static: true** | Element reference available before first change detection |
| **CLS** | Cumulative Layout Shift: how much content jumps during load |
| **NG0956** | Dev warning: a \`@for\` re-created its whole collection |

---
**Conclusion:** In Angular, a lazy image is a \`status\` signal, an \`@if\` that keeps the \`<img>\` out of the DOM until an IntersectionObserver created in \`ngAfterViewInit\` fires, a disconnect on first intersection and in \`ngOnDestroy\`, and an \`@Output()\` that lets the parent count with \`computed()\`. Verified on Angular 22.2.3 under AOT and JIT, nothing downloads before an intersection and every observer is cleaned up; the one surprise was NG0956 for an identity-tracked remount, fixed by tracking a property.`,
        files: {
          "/src/app/app.component.ts": `import { Component, computed, signal } from "@angular/core";
import { LazyImageComponent, LoadStatus } from "./components/lazy-image.component";
import { photos } from "./data/photos";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [LazyImageComponent],
  template: \`
    <main class="app">
      <header class="bar">
        <h1>Lazy-loaded images</h1>
        <p data-testid="stats" aria-live="polite">
          Requested {{ requested() }} of {{ photos.length }} · loaded {{ loaded() }} · failed {{ failed() }}
        </p>
        <button type="button" (click)="reset()">Reset demo</button>
      </header>
      <p class="hint">Scroll the feed: each photo is requested only when it comes within 200px of the view.</p>
      <!-- A one-item @for keyed on run remounts the feed when run changes. -->
      @for (f of feedKey(); track f.run) {
        <div class="feed" data-testid="feed">
          @for (p of photos; track p.id) {
            <figure>
              <app-lazy-image
                [src]="p.src"
                [alt]="p.alt"
                [width]="640"
                [height]="400"
                [placeholder]="p.placeholder"
                (statusChange)="report(p.id, $event)"
              />
              <figcaption>{{ p.id }}. {{ p.alt }}</figcaption>
            </figure>
          }
        </div>
      }
    </main>
  \`,
  styles: [
    \`
    :host { display: block; min-height: 100vh; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
    .app { max-width: 640px; margin: 0 auto; padding: 16px; }
    .bar { position: sticky; top: 0; z-index: 1; background: #0f1115; padding: 8px 0; display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; }
    .bar h1 { font-size: 1.2rem; margin: 0; flex: 1 1 100%; }
    .bar p { margin: 0; color: #a8b3c7; font-size: 0.9rem; flex: 1; }
    button { background: #2a3142; color: #e6e6e6; border: 1px solid #3d4760; border-radius: 6px; padding: 6px 12px; cursor: pointer; }
    button:focus-visible { outline: 2px solid #7aa2ff; outline-offset: 2px; }
    .hint { color: #8a93a6; font-size: 0.85rem; }
    .feed { display: grid; gap: 24px; }
    figure { margin: 0; }
    figcaption { margin-top: 6px; color: #a8b3c7; font-size: 0.9rem; }
  \`,
  ],
})
export class AppComponent {
  readonly photos = photos;
  readonly run = signal(0); // bump to remount the feed
  readonly feedKey = computed(() => [{ run: this.run() }]);
  readonly statuses = signal<Record<number, LoadStatus>>({});

  readonly requested = computed(() => Object.keys(this.statuses()).length);
  readonly loaded = computed(
    () => Object.values(this.statuses()).filter((s) => s === "loaded").length,
  );
  readonly failed = computed(
    () => Object.values(this.statuses()).filter((s) => s === "error").length,
  );

  report(id: number, s: LoadStatus): void {
    this.statuses.update((prev) => ({ ...prev, [id]: s }));
  }

  reset(): void {
    this.statuses.set({});
    this.run.update((r) => r + 1);
  }
}
`,
          "/src/app/components/lazy-image.component.ts": `import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  signal,
} from "@angular/core";

export type LoadStatus = "idle" | "loading" | "loaded" | "error";

@Component({
  selector: "app-lazy-image",
  standalone: true,
  template: \`
    <div
      #box
      class="lazy"
      data-testid="lazy"
      [attr.data-status]="status()"
      [attr.aria-busy]="status() === 'loading'"
      [style.aspect-ratio]="width + ' / ' + height"
      [style.background]="placeholder"
    >
      @if (status() === "loading" || status() === "loaded") {
        <img
          [src]="src"
          [alt]="alt"
          [width]="width"
          [height]="height"
          decoding="async"
          class="lazy-img"
          [class.is-loaded]="status() === 'loaded'"
          (load)="update('loaded')"
          (error)="update('error')"
        />
      } @else if (status() === "error") {
        <div class="lazy-error" role="alert">
          <span>Could not load "{{ alt }}"</span>
          <button type="button" (click)="retry()">Retry</button>
        </div>
      }
    </div>
  \`,
  styles: [
    \`
      :host {
        display: block;
      }
      .lazy {
        position: relative;
        width: 100%;
        border-radius: 10px;
        overflow: hidden;
      }
      .lazy[aria-busy="true"]::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.12),
          transparent
        );
        animation: shimmer 1.2s infinite;
      }
      @keyframes shimmer {
        from {
          transform: translateX(-100%);
        }
        to {
          transform: translateX(100%);
        }
      }
      .lazy-img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0;
        transition: opacity 0.4s ease;
      }
      .lazy-img.is-loaded {
        opacity: 1;
      }
      .lazy-error {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: center;
        justify-content: center;
        background: rgba(20, 10, 10, 0.75);
        color: #ffb4a8;
      }
      button {
        background: #2a3142;
        color: #e6e6e6;
        border: 1px solid #3d4760;
        border-radius: 6px;
        padding: 6px 12px;
        cursor: pointer;
      }
      @media (prefers-reduced-motion: reduce) {
        .lazy-img {
          transition: none;
        }
        .lazy[aria-busy="true"]::after {
          animation: none;
        }
      }
    \`,
  ],
})
export class LazyImageComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) src = "";
  @Input({ required: true }) alt = "";
  @Input() width = 640;
  @Input() height = 400;
  @Input() placeholder = "#222";
  @Input() rootMargin = "200px";
  @Output() statusChange = new EventEmitter<LoadStatus>();

  @ViewChild("box", { static: true }) box!: ElementRef<HTMLDivElement>;

  // "idle" (not requested) -> "loading" (src set) -> "loaded" | "error"
  readonly status = signal<LoadStatus>("idle");
  private io: IntersectionObserver | null = null;

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === "undefined") {
      this.update("loading"); // old browser: load straight away
      return;
    }
    this.io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.stop();
          this.update("loading");
        }
      },
      { rootMargin: this.rootMargin },
    );
    this.io.observe(this.box.nativeElement);
  }

  ngOnDestroy(): void {
    this.stop();
  }

  update(next: LoadStatus): void {
    this.status.set(next);
    this.statusChange.emit(next);
  }

  // The error branch removed the <img>, so "loading" renders a fresh one,
  // which makes the browser request the file again.
  retry(): void {
    this.update("loading");
  }

  private stop(): void {
    if (this.io) {
      this.io.disconnect();
      this.io = null;
    }
  }
}
`,
          "/src/app/data/photos.ts": `// Offline "photos": inline SVG data URLs, so the demo needs no network.
// Tiny markup helper: el("rect", { width: 9 }) gives <rect width="9"/>.
function el(
  tag: string,
  attrs: Record<string, string | number>,
  children?: string[],
): string {
  const a = Object.keys(attrs)
    .map((k) => " " + k + '="' + attrs[k] + '"')
    .join("");
  return children
    ? "<" + tag + a + ">" + children.join("") + "</" + tag + ">"
    : "<" + tag + a + "/>";
}

function svgPhoto(hue: number, label: string): string {
  const svg = el(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 640,
      height: 400,
      viewBox: "0 0 640 400",
    },
    [
      el("defs", {}, [
        el("linearGradient", { id: "g", x1: 0, y1: 0, x2: 1, y2: 1 }, [
          el("stop", { offset: 0, "stop-color": "hsl(" + hue + ",70%,55%)" }),
          el("stop", {
            offset: 1,
            "stop-color": "hsl(" + (hue + 40) + ",70%,30%)",
          }),
        ]),
      ]),
      el("rect", { width: 640, height: 400, fill: "url(#g)" }),
      el("circle", {
        cx: 500,
        cy: 110,
        r: 60,
        fill: "hsla(" + (hue + 180) + ",80%,85%,0.6)",
      }),
      el("path", {
        d: "M0 400 L180 220 L300 330 L420 200 L640 400 Z",
        fill: "hsla(" + hue + ",40%,15%,0.7)",
      }),
      el(
        "text",
        {
          x: 32,
          y: 64,
          "font-family": "sans-serif",
          "font-size": 40,
          fill: "white",
        },
        [label],
      ),
    ],
  );
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const names = [
  "Dunes",
  "Lagoon",
  "Forest",
  "Canyon",
  "Glacier",
  "Broken link",
  "Meadow",
  "Volcano",
];

export interface Photo {
  id: number;
  alt: string;
  src: string;
  placeholder: string;
}

export const photos: Photo[] = names.map((name, i) => {
  const hue = (i * 45) % 360;
  return {
    id: i + 1,
    alt: name,
    // Photo 6 points at a corrupt file on purpose, to show the error state.
    src:
      name === "Broken link"
        ? "data:image/png;base64,AAAA"
        : svgPhoto(hue, name),
    // Low-quality placeholder: the photo dominant colours as a CSS gradient.
    placeholder:
      "linear-gradient(135deg, hsl(" +
      hue +
      ",45%,40%), hsl(" +
      (hue + 40) +
      ",45%,22%))",
  };
});
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build an Image Carousel",
    seoDescription:
      "Build an accessible image carousel in React, Vue and Angular: wrap-around arrows, dots, keyboard, autoplay that pauses on hover and focus, verified.",
    description: `**Question presented to candidate:**
"Build the photo carousel for our home page: one photo at a time, previous and next arrows that wrap around at the ends, dots to jump to any photo, and autoplay every three seconds. Autoplay must pause while the user is hovering or using the keyboard inside it, and there has to be a way to stop it. Make it keyboard accessible."

**Requirements:**
- Show one slide at a time from an array of images; a sliding CSS transition between slides.
- Previous / next buttons that wrap (last to first, first to last) and one dot per slide that jumps to it.
- Left / Right arrow keys (and Home / End) when the carousel has focus.
- Autoplay every 3 s; pauses on hover and on keyboard focus inside; a Play / Pause button stops it for good.
- Visible "2 / 5" status and correct ARIA for the carousel and its slides.

**What a strong answer should cover:**
- Index wrap-around with \`((i % n) + n) % n\`, so \`-1\` becomes the last slide.
- One source of truth (\`index\`) and derived values (\`running = playing && !hovered && !focused\`) instead of duplicated flags.
- Timer cleanup: a timeout or interval cleared when the slide changes, when paused, and on unmount; no stale closures.
- Accessibility: \`aria-roledescription="carousel"\` and \`"slide"\`, labels like "2 of 5", hidden slides marked \`aria-hidden\`, a pause control (WCAG 2.2.2), and \`aria-live\` off while rotating, polite when paused.
- The transform-based track (\`translateX(-index * 100%)\`) and \`prefers-reduced-motion\`.

**Clarifying questions expected:**
- "Should autoplay restart after the user leaves the carousel, or stay stopped once they interact?"
- "Do we need swipe on touch devices or an infinite (no rewind) animation?"
- "How many images, and should off-screen ones be lazy-loaded?"

**Code / implementation expected:** Yes. A working carousel component with arrows, dots, keyboard support, autoplay with pause, and cleanup of the timer.`,
    frameworks: {
      // ── react ───────────────────────────────────────────────────────
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. Assumes basic React (\`useState\`, props, event handlers); timers, ARIA and CSS transforms are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Each idea comes in plain words first, then tagged with <code>📌 Interview term:</code> so you also learn the vocabulary interviewers use. The output in section 6 was produced by running the solution on React 19.3.1 in jsdom, and in headless Chromium 141 for the parts jsdom cannot do.

## 1. Why This Even Matters — A Story First

Picture a shop window with one big poster frame. A clerk swaps the poster every few seconds so passers-by see all the promotions. Now picture a customer who stops to read the small print: a good clerk waits; a bad clerk swaps the poster mid-sentence. And if someone asks "please stop changing it", the clerk must stop.

A carousel is that frame. The data is a list of images; the screen shows one. The interesting parts are not the sliding, they are the rules around it: wrap from the last poster back to the first, let people jump to any poster, wait while someone is reading (hovering or using the keyboard), and give them a button to stop it altogether.

📌 **Interview term: Carousel** — a component that shows one item of a set at a time, with controls to move between items and often automatic rotation. The W3C ARIA Authoring Practices Guide calls the moving version an **auto-rotating carousel** and lists the extra accessibility rules it needs.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Should the last slide wrap to the first, or stop? | Decides the index math and whether arrows are ever disabled. |
| Must the animation look infinite (no rewind from slide 5 to 1)? | A plain transform track rewinds visibly. A seamless loop needs cloned edge slides, a much bigger build covered in [the infinite carousel with swipe](/interview-question/build-an-image-carousel-with-infinite-loop-swipe). |
| Is autoplay required, and what stops it? | Accessibility guidance requires a way to pause moving content; hover and focus pausing are also expected. |
| Once a user interacts, should autoplay resume? | Some teams resume after hover ends; the strict reading of the ARIA guide is that it stays stopped once focus enters. |
| Touch swipe needed? | Adds pointer events; out of scope for the basic version. |
| How many images? | Five is fine to render eagerly; fifty needs lazy loading of off-screen slides. |

## 3. Requirements and Plan

The build: a \`Carousel\` component and an \`App\` that passes five offline SVG slides (generated in \`slides.js\`). The carousel has a viewport with the sliding track, arrow buttons, a Play / Pause button, five dots and a status line ("2 / 5 · Harbour · auto").

**State model.** Only four pieces of state, one derived value:

| Value | Kind | Meaning |
| :--- | :--- | :--- |
| \`index\` | state | Which slide is showing (0 to n - 1) |
| \`playing\` | state | The user choice from the Play / Pause button |
| \`hovered\`, \`focused\` | state | Temporary reasons to pause |
| \`running\` | **derived** | \`playing && !hovered && !focused\`, computed on every render |

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="Three inputs, playing, hovered and focused, combine into the derived running flag; when running is true a timeout advances the index, and every index change restarts the timeout">
  <defs>
    <marker id="cbr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="150" height="50" rx="10"/>
  <text class="d-text" x="95" y="50" text-anchor="middle">playing</text>
  <rect class="d-box-muted" x="20" y="95" width="150" height="50" rx="10"/>
  <text class="d-text" x="95" y="125" text-anchor="middle">hovered</text>
  <rect class="d-box-muted" x="20" y="170" width="150" height="50" rx="10"/>
  <text class="d-text" x="95" y="200" text-anchor="middle">focused</text>
  <rect class="d-box-accent" x="260" y="90" width="170" height="60" rx="10"/>
  <text class="d-text d-accent" x="345" y="117" text-anchor="middle">running</text>
  <text class="d-sub" x="345" y="137" text-anchor="middle">derived, not stored</text>
  <rect class="d-box" x="520" y="90" width="180" height="60" rx="10"/>
  <text class="d-text" x="610" y="117" text-anchor="middle">setTimeout 3s</text>
  <text class="d-sub" x="610" y="137" text-anchor="middle">then index + 1</text>
  <path class="d-edge" d="M 170 45 L 252 105" marker-end="url(#cbr-arrow)"/>
  <path class="d-edge" d="M 170 120 L 252 120" marker-end="url(#cbr-arrow)"/>
  <path class="d-edge" d="M 170 195 L 252 135" marker-end="url(#cbr-arrow)"/>
  <path class="d-edge-accent" d="M 430 120 L 512 120" marker-end="url(#cbr-arrow)"/>
  <path class="d-edge-dashed" d="M 610 150 L 610 205 L 470 205 L 470 158" marker-end="url(#cbr-arrow)"/>
  <text class="d-sub" x="540" y="228" text-anchor="middle">new index restarts it</text>
</svg>

Storing \`running\` as its own state would mean four places to keep in sync; deriving it means it can never disagree with its inputs.

## 4. Build It Step by Step

### Step 1: Wrap-around navigation

~~~jsx
const n = slides.length;
const [index, setIndex] = useState(0);
// Wrap-around: ((i % n) + n) % n also handles -1.
const go = (i) => setIndex(((i % n) + n) % n);
~~~

📌 **Interview term: Modulo wrap-around** — JavaScript's \`%\` keeps the sign of the left side, so \`-1 % 5\` is \`-1\`, not \`4\`. Adding \`n\` and taking \`% n\` again maps every integer into \`0..n-1\`: \`go(index - 1)\` from slide 0 lands on slide 4, and \`go(index + 1)\` from slide 4 lands on 0.

### Step 2: The sliding track

~~~jsx
<div
  className="track"
  style={{ transform: "translateX(-" + index * 100 + "%)" }}
>
  {slides.map((s, i) => (
    <div
      key={s.id}
      className="slide"
      role="group"
      aria-roledescription="slide"
      aria-label={i + 1 + " of " + n}
      aria-hidden={i !== index}
    >
      <img src={s.src} alt={s.alt} draggable={false} />
    </div>
  ))}
</div>
~~~

All slides sit side by side in a flex row (\`flex: 0 0 100%\`) inside a viewport with \`overflow: hidden\`. Moving to slide 3 is just \`translateX(-200%)\`, and \`transition: transform 0.45s\` animates it on the GPU without re-laying out the page.

📌 **Interview term: Transform-based animation** — moving an element with \`transform\` instead of \`left\` or \`margin\`. Transforms are composited, so the browser does not recalculate layout on every frame.

The cost of this simple track: going from slide 5 to slide 1 animates backwards across all slides. That is acceptable for a basic carousel; the [infinite-loop version](/interview-question/build-an-image-carousel-with-infinite-loop-swipe) fixes it with cloned slides.

### Step 3: Autoplay with a timeout that restarts on every move

~~~jsx
useEffect(() => {
  if (!running) return;
  const id = setTimeout(() => setIndex((i) => (i + 1) % n), interval);
  return () => clearTimeout(id);
}, [running, index, interval, n]);
~~~

Three choices here are deliberate:

- **\`setTimeout\` keyed on \`index\`, not \`setInterval\`.** Because \`index\` is a dependency, every slide change (automatic, arrow or dot) clears the old timer and starts a fresh three seconds. With a single \`setInterval\`, clicking "next" at 2.9s would be followed by an automatic move 0.1s later.
- **A functional update** \`setIndex((i) => ...)\`. The timer callback never reads a captured \`index\`, so there is no [stale closure](/interview-question/what-causes-stale-closures-in-react-hooks-and-how-do-you-fix-them-correctly).
- **The cleanup clears the timer** on every re-run, on pause and on unmount, which also makes it safe under StrictMode's double-mount ([the cleanup function in useEffect](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect)).

### Step 4: Pausing on hover, keyboard focus, and by choice

~~~jsx
function onFocus(e) {
  if (e.target.matches(":focus-visible")) setFocused(true);
}
function onBlur(e) {
  // focusout fires when moving between
  // our own buttons too: ignore that.
  if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
}
~~~

\`onMouseEnter\` / \`onMouseLeave\` set \`hovered\`. Focus is subtler. React's \`onFocus\` and \`onBlur\` bubble (they listen to \`focusin\` / \`focusout\`), so the section hears focus moving onto any of its buttons. When focus moves from "Previous" to "Next", \`onBlur\` fires with \`relatedTarget\` set to "Next", which is still inside, so we ignore it.

📌 **Interview term: \`:focus-visible\`** — the CSS pseudo-class a browser applies when it decides focus should be shown, which in practice means keyboard focus. A mouse click on a button also focuses it, but without \`:focus-visible\`. Checking it means a mouse user who clicks "Next" and moves away gets autoplay back, while a keyboard user tabbing inside pauses it. Without this check, every click would pause the carousel until the user clicked somewhere else, which the first version of this solution did.

The Play / Pause button flips \`playing\`, the user's permanent choice. It is labelled "Stop automatic slide show" / "Start automatic slide show", and autoplay starts off when the user prefers reduced motion (\`matchMedia("(prefers-reduced-motion: reduce)")\`, guarded because older environments lack \`matchMedia\`).

📌 **Interview term: WCAG 2.2.2 Pause, Stop, Hide** — the accessibility rule that moving content which starts automatically and lasts more than five seconds needs a way to pause or stop it.

### Step 5: Keyboard and screen readers

~~~jsx
function onKeyDown(e) {
  const moves = {
    ArrowLeft: index - 1,
    ArrowRight: index + 1,
    Home: 0,
    End: n - 1,
  };
  if (!(e.key in moves)) return;
  e.preventDefault();
  go(moves[e.key]);
}
~~~

The \`<section>\` has \`tabIndex={0}\`, \`aria-roledescription="carousel"\` and an \`aria-label\`. Each slide is a \`role="group"\` with \`aria-roledescription="slide"\` and a label like "3 of 5"; the slides not on screen get \`aria-hidden="true"\` so a screen reader does not read five photos at once.

📌 **Interview term: \`aria-live\`** — tells assistive technology to announce changes inside a region. The viewport uses \`aria-live="off"\` while rotating (announcing every three seconds would be unbearable) and \`"polite"\` when paused, so a manual change is announced. This follows the APG carousel pattern.

## 5. Verified

Mounted in jsdom with \`createRoot(...).render(<StrictMode><App /></StrictMode>)\`. The driver uses real timers (\`settle(ms)\` lets time pass). For hover it dispatches \`mouseover\` / \`mouseout\` (what React listens to) and \`mouseenter\` / \`mouseleave\` (what Vue and Angular listen to), so one driver serves all three. To imitate keyboard focus, it dispatches a Tab \`keydown\` before focusing, which makes jsdom report \`:focus-visible\` the way a browser would. \`V\` marks the slide not hidden from screen readers.

\`\`\`text
start   : 1 / 5 · Sunrise · auto | translateX(-0%) | V---- | aria-live off
pause   : 1 / 5 · Sunrise · paused | button: Start automatic slide show | aria-live polite
next x2 : 3 / 5 · Pine ridge · paused | translateX(-200%) | --V--
prev    : 2 / 5 · Harbour · paused
dot 5   : 5 / 5 · Night sky · paused | current dot 5
wrap fwd: 1 / 5 · Sunrise · paused | translateX(-0%)
wrap back: 5 / 5 · Night sky · paused
Home    : 1 / 5 · Sunrise · paused
ArrowLeft: 5 / 5 · Night sky · paused
ArrowRight: 1 / 5 · Sunrise · paused
3.3s paused: 1 / 5 · Sunrise · paused
play    : 1 / 5 · Sunrise · auto | aria-live off
3.3s    : 2 / 5 · Harbour · auto
6.3s    : 3 / 5 · Pine ridge · auto
hover   : 3 / 5 · Pine ridge · paused
hover 3.3s: 3 / 5 · Pine ridge · paused
leave   : 3 / 5 · Pine ridge · auto
leave 3.3s: 4 / 5 · Red rocks · auto
focus after a click: 4 / 5 · Red rocks · auto | focus-visible false
keyboard focus in: 4 / 5 · Red rocks · paused | focus-visible true
focus moves inside: 4 / 5 · Red rocks · paused
focus out: 4 / 5 · Red rocks · auto
\`\`\`

Wrap-around works both ways, a paused carousel did not move in 3.3s, a playing one moved once per three seconds, hover and keyboard focus paused it and leaving resumed it, and a click-style focus did not pause it. jsdom has no layout or transitions, so the same build was opened in **headless Chromium 141** with a real mouse:

\`\`\`text
start            : 1 / 5 · Sunrise · auto
mouse click next : 2 / 5 · Harbour · paused | focused: next | focus-visible: false
mouse away 3.3s  : 3 / 5 · Pine ridge · auto
track transition : 0.45s
hovering 3.3s    : 3 / 5 · Pine ridge · paused
Tab focus        : toggle | 3 / 5 · Pine ridge · paused
ArrowRight       : 4 / 5 · Red rocks · paused
\`\`\`

After a real click the button was focused but not \`:focus-visible\`, so once the mouse left, autoplay resumed. Not measured: how smooth the animation looks.

## 6. Edge Cases and Accessibility

| Case | Behaviour |
| :--- | :--- |
| Previous on slide 1 / Next on slide 5 | Wraps to 5 / 1 |
| Click Next 2.9s into a slide | Timer restarts, the next automatic move is 3s later |
| Focus moves between buttons inside | Stays paused (\`relatedTarget\` is inside) |
| Mouse click on a button | Does not pause after the mouse leaves (not \`:focus-visible\`) |
| Reduced motion | Autoplay starts off and the transition is disabled |
| Screen reader | Carousel and slide roles, "N of 5" labels, hidden slides, live region polite only when paused |
| Unmount | Effect cleanup clears the timer |

## 7. Common Pitfalls

- **\`(index - 1) % n\` for "previous".** It yields \`-1\` on the first slide; use \`((i % n) + n) % n\`.
- **\`setInterval\` with \`index\` read inside.** The callback captures the first \`index\` forever (a stale closure); either use a functional update or restart the timer per slide.
- **No cleanup.** A timer left running after unmount calls \`setState\` on a dead component; under StrictMode you also get two timers.
- **Storing \`isAutoplaying\` separately from its causes.** Hover, focus and the button then fight each other; derive \`running\` instead.
- **Pausing on any focus.** Mouse clicks focus buttons too, so the carousel never resumes until the user clicks elsewhere. Check \`:focus-visible\`.
- **Announcing every automatic slide.** \`aria-live="polite"\` while rotating makes a screen reader talk every three seconds; switch it off while running.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Wrap at the ends or stop? Is a visible rewind from the last slide to the first acceptable? Must autoplay stay stopped once the user interacts?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code> is the only navigation state. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">playing</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hovered</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focused</code> are the pause inputs, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code> is derived from them on every render, never stored."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Render:</strong> <span style="color:#f0e2c8;">"A flex track inside an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">overflow: hidden</code> viewport, moved with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">translateX(-index * 100%)</code> and a CSS transition. Arrows and dots call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">go(i)</code>, which wraps with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">((i % n) + n) % n</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Autoplay:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useEffect</code> keyed on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code> sets one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code>; any move restarts it, the functional update avoids stale closures, and the cleanup clears it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"Carousel and slide roles with N of 5 labels, hidden slides <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-hidden</code>, a Pause button for WCAG 2.2.2, arrow keys, pause on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:focus-visible</code> focus, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-live</code> off while rotating."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it loop without rewinding?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Clone the last slide before the first and the first after the last, animate onto the clone, then on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transitionend</code> jump to the real twin with the transition switched off. That is the separate infinite-loop question.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setTimeout</code> per slide instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setInterval</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because a manual move should restart the countdown. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code> in the effect dependencies, each change clears the old timeout and starts a fresh one. A single interval keeps its own rhythm and can fire right after a click.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you pause when the browser tab is hidden?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Listen to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">visibilitychange</code> and add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!document.hidden</code> to the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code> expression. Browsers also throttle timers in background tabs, but pausing explicitly avoids a jump when the user returns.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about 50 slides?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only render images for the current slide and its neighbours eagerly, give the rest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loading=lazy</code> or no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">src</code> until they are near, and keep dots as a compact list or replace them with a counter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With fake timers: advance 3000 ms and expect the next slide, hover and expect no change, click a dot and expect the timer to restart. Query by role and label, for example the button named Next slide.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Carousel** | Shows one item of a set at a time, with controls and optional rotation |
| **Modulo wrap-around** | \`((i % n) + n) % n\` maps any integer into \`0..n-1\` |
| **Transform-based animation** | Moving with \`transform\` so the browser skips layout per frame |
| **:focus-visible** | Matches focus the browser would show, which in practice means keyboard focus |
| **WCAG 2.2.2** | Moving content that starts automatically needs a pause or stop control |
| **aria-live** | Region whose changes a screen reader announces |
| **aria-roledescription** | Gives a group a custom role name such as "carousel" or "slide" |

---
**Conclusion:** A basic carousel is one \`index\`, a transform track and a handful of rules. Wrap with modulo, derive \`running\` from the user choice plus hover and keyboard focus, restart a \`setTimeout\` on every slide change and clear it in the cleanup, and give screen readers carousel and slide roles with a live region that is quiet while rotating. Verified on React 19.3.1 in jsdom and in Chromium 141, it wraps both ways, advances every three seconds, pauses for hover and keyboard focus but not for a mouse click, and stops for good with the button. When the interviewer asks for no visible rewind and touch swipe, that is the [infinite-loop carousel](/interview-question/build-an-image-carousel-with-infinite-loop-swipe).`,
        files: {
          "/App.js": `import Carousel from "./src/components/Carousel";
import { slides } from "./src/data/slides";

export default function App() {
  return (
    <main className="app">
      <h1>Image carousel</h1>
      <Carousel slides={slides} interval={3000} label="Featured photos" />
      <p className="hint">
        Arrows, dots or the Left / Right keys move; hover or focus pauses
        autoplay.
      </p>
    </main>
  );
}
`,
          "/src/components/Carousel.js": `import { useEffect, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Carousel({
  slides,
  interval = 3000,
  label = "Photos",
}) {
  const n = slides.length;
  const [index, setIndex] = useState(0);
  // user choice
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const running = playing && !hovered && !focused; // derived, never stored

  // Wrap-around: ((i % n) + n) % n also handles -1.
  const go = (i) => setIndex(((i % n) + n) % n);

  // One timeout per visible slide: any navigation restarts the countdown.
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % n), interval);
    return () => clearTimeout(id);
  }, [running, index, interval, n]);

  function onKeyDown(e) {
    const moves = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      Home: 0,
      End: n - 1,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    go(moves[e.key]);
  }

  // Pause for keyboard focus only: a mouse click also focuses a button, but
  // then :focus-visible is false and hover already covers the mouse user.
  function onFocus(e) {
    if (e.target.matches(":focus-visible")) setFocused(true);
  }

  function onBlur(e) {
    // focusout fires when moving between our own buttons too: ignore that.
    if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
  }

  return (
    <section
      className="carousel"
      data-testid="carousel"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div className="viewport" aria-live={running ? "off" : "polite"}>
        <div
          className="track"
          style={{ transform: "translateX(-" + index * 100 + "%)" }}
        >
          {slides.map((s, i) => (
            <div
              key={s.id}
              className="slide"
              role="group"
              aria-roledescription="slide"
              aria-label={i + 1 + " of " + n}
              aria-hidden={i !== index}
            >
              <img src={s.src} alt={s.alt} draggable={false} />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="arrow prev"
          data-testid="prev"
          aria-label="Previous slide"
          onClick={() => go(index - 1)}
        >
          ‹
        </button>
        <button
          type="button"
          className="arrow next"
          data-testid="next"
          aria-label="Next slide"
          onClick={() => go(index + 1)}
        >
          ›
        </button>
      </div>

      <div className="controls">
        <button
          type="button"
          data-testid="toggle"
          aria-label={
            playing ? "Stop automatic slide show" : "Start automatic slide show"
          }
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <div className="dots">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="dot"
              data-testid="dot"
              aria-label={"Go to slide " + (i + 1)}
              aria-current={i === index ? "true" : undefined}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <p className="status" data-testid="status">
          {index + 1} / {n} · {slides[index].alt} ·{" "}
          {running ? "auto" : "paused"}
        </p>
      </div>
    </section>
  );
}
`,
          "/src/data/slides.js": `// Offline slides: inline SVG data URLs, so the demo needs no network.
// Tiny markup helper: el("rect", { width: 9 }) gives <rect width="9"/>.
function el(tag, attrs, children) {
  const a = Object.keys(attrs)
    .map((k) => " " + k + '="' + attrs[k] + '"')
    .join("");
  return children
    ? "<" + tag + a + ">" + children.join("") + "</" + tag + ">"
    : "<" + tag + a + "/>";
}

function svgSlide(hue, title, n) {
  const svg = el(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 800,
      height: 450,
      viewBox: "0 0 800 450",
    },
    [
      el("defs", {}, [
        el("linearGradient", { id: "g", x1: 0, y1: 0, x2: 1, y2: 1 }, [
          el("stop", { offset: 0, "stop-color": "hsl(" + hue + ",70%,55%)" }),
          el("stop", {
            offset: 1,
            "stop-color": "hsl(" + (hue + 50) + ",65%,28%)",
          }),
        ]),
      ]),
      el("rect", { width: 800, height: 450, fill: "url(#g)" }),
      el("circle", {
        cx: 640,
        cy: 120,
        r: 70,
        fill: "hsla(" + (hue + 180) + ",80%,85%,0.55)",
      }),
      el("path", {
        d: "M0 450 L220 250 L360 370 L520 220 L800 450 Z",
        fill: "hsla(" + hue + ",40%,14%,0.7)",
      }),
      el(
        "text",
        {
          x: 40,
          y: 80,
          "font-family": "sans-serif",
          "font-size": 48,
          fill: "white",
        },
        [n + ". " + title],
      ),
    ],
  );
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const titles = ["Sunrise", "Harbour", "Pine ridge", "Red rocks", "Night sky"];

export const slides = titles.map((title, i) => ({
  id: i + 1,
  alt: title,
  src: svgSlide((i * 70 + 10) % 360, title, i + 1),
}));
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px;
}
h1 {
  font-size: 1.2rem;
}
.hint {
  color: #8a93a6;
  font-size: 0.85rem;
}
.carousel {
  border-radius: 12px;
  background: #181b22;
  padding: 8px;
  outline: none;
}
.carousel:focus-visible {
  box-shadow: 0 0 0 2px #7aa2ff;
}
.viewport {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  aspect-ratio: 16 / 9;
}
.track {
  display: flex;
  height: 100%;
  transition: transform 0.45s ease;
}
.slide {
  flex: 0 0 100%;
  height: 100%;
}
.slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
}
.arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 0;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}
.arrow:focus-visible,
.controls button:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.prev {
  left: 8px;
}
.next {
  right: 8px;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 10px 4px 2px;
}
.controls > button {
  background: #2a3142;
  color: #e6e6e6;
  border: 1px solid #3d4760;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
}
.dots {
  display: flex;
  gap: 6px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #8a93a6;
  background: transparent;
  padding: 0;
  cursor: pointer;
}
.dot[aria-current="true"] {
  background: #7aa2ff;
  border-color: #7aa2ff;
}
.status {
  margin: 0;
  margin-left: auto;
  color: #a8b3c7;
  font-size: 0.85rem;
}
@media (prefers-reduced-motion: reduce) {
  .track {
    transition: none;
  }
}
`,
        },
      },
      // ── vue ─────────────────────────────────────────────────────────
      vue: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Vue. Assumes \`<script setup>\`, \`ref\` and props; watchers, ARIA and CSS transforms are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain words first, then <code>📌 Interview term:</code> callouts. The Verified output was produced by running this solution on Vue 3.5.44 in jsdom and in headless Chromium 141.

## 1. A Story First

A carousel is a single poster frame in a shop window: a list of images, one on show. Someone swaps the poster every few seconds, waits while a passer-by is reading, lets anyone jump to a specific poster, wraps from the last back to the first, and stops completely when asked. Those rules, not the sliding, are what the interviewer is testing.

📌 **Interview term: Carousel** — a component that shows one item of a set at a time, with controls to move between items and often automatic rotation.

## 2. Requirements and the Vue State Model

\`ImageCarousel.vue\` takes \`slides\`, \`interval\` (3000 ms) and \`label\` props. It renders a sliding track, Previous / Next buttons, a Play / Pause button, one dot per slide and a status line.

| Value | Vue tool | Meaning |
| :--- | :--- | :--- |
| \`index\` | \`ref(0)\` | The slide on show |
| \`playing\` | \`ref\` | The user choice from Play / Pause |
| \`hovered\`, \`focused\` | \`ref\` | Temporary reasons to pause |
| \`running\` | \`computed\` | \`playing && !hovered && !focused\` |
| The timer | \`watch\` with \`onCleanup\` | Restarted whenever \`running\` or \`index\` changes |

📌 **Interview term: \`computed\`** — a cached value derived from reactive state that updates itself when its inputs change. \`running\` is never written, only derived, so the three pause reasons cannot disagree. See [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch).

## 3. Build It Step by Step

### Step 1: Wrap-around and the track

~~~js
const n = computed(() => props.slides.length);
const index = ref(0);
function go(i) {
  index.value = ((i % n.value) + n.value) % n.value;
}
~~~

📌 **Interview term: Modulo wrap-around** — \`-1 % 5\` is \`-1\` in JavaScript, so adding \`n\` and taking \`% n\` again maps every integer into \`0..n-1\`: Previous on slide 1 goes to slide 5.

~~~vue
<div
  class="track"
  :style="{ transform: 'translateX(-' + index * 100 + '%)' }"
>
  <div
    v-for="(s, i) in slides"
    :key="s.id"
    class="slide"
    role="group"
    aria-roledescription="slide"
    :aria-label="i + 1 + ' of ' + n"
    :aria-hidden="i !== index"
  >
    <img :src="s.src" :alt="s.alt" draggable="false" />
  </div>
</div>
~~~

The slides sit in a flex row inside an \`overflow: hidden\` viewport; a CSS \`transition: transform 0.45s\` animates the move, disabled under \`prefers-reduced-motion\`.

### Step 2: Autoplay as a watcher with cleanup

~~~js
watch(
  [running, index, () => props.interval],
  ([isRunning], _old, onCleanup) => {
    if (!isRunning) return;
    const id = setTimeout(() => go(index.value + 1), props.interval);
    onCleanup(() => clearTimeout(id));
  },
  { immediate: true },
);
~~~

📌 **Interview term: Watcher cleanup (\`onCleanup\`)** — a function you register inside a watcher callback; Vue calls it before the callback runs again and when the watcher stops, which happens automatically when the component unmounts. That is all the timer management this component needs.

Watching \`index\` too means any move, automatic or manual, clears the old timeout and starts a fresh three seconds. A plain \`watchEffect\` would also work, but the timer callback reads \`index\` asynchronously, which \`watchEffect\` cannot track; the explicit source list makes the dependencies obvious ([watch vs watchEffect](/interview-question/what-is-the-difference-between-watch-and-watcheffect)).

### Step 3: Pause on hover, keyboard focus and by choice

~~~js
function onFocusin(e) {
  if (e.target.matches(":focus-visible")) focused.value = true;
}
function onFocusout(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) focused.value = false;
}
~~~

The section listens to \`@mouseenter\` / \`@mouseleave\` and to \`@focusin\` / \`@focusout\`, which bubble from its buttons (plain \`@focus\` would not). Moving focus from one inner button to another fires \`focusout\` with \`relatedTarget\` still inside, so it is ignored.

📌 **Interview term: \`:focus-visible\`** — matches focus the browser would show, which in practice is keyboard focus. A mouse click also focuses a button, but not visibly; checking it lets a mouse user click Next and still get autoplay back once the mouse leaves.

The Play / Pause button toggles \`playing\`, labelled "Stop automatic slide show" / "Start automatic slide show" for WCAG 2.2.2 (moving content needs a pause control). \`playing\` starts as \`false\` when \`matchMedia("(prefers-reduced-motion: reduce)")\` matches.

### Step 4: Keyboard and screen readers

\`@keydown\` on the focusable section maps ArrowLeft / ArrowRight / Home / End to \`go()\`. The section carries \`aria-roledescription="carousel"\` and a label; the viewport is \`:aria-live="running ? 'off' : 'polite'"\` so rotating slides are not announced every three seconds, but manual moves are.

📌 **Interview term: \`aria-live\`** — marks a region whose changes a screen reader announces; \`off\` while rotating and \`polite\` when paused follows the APG carousel pattern.

## 4. Verified

Mounted in jsdom with \`createApp(App).mount("#app")\`, real timers. The driver dispatches \`mouseenter\` / \`mouseleave\` for hover and a Tab \`keydown\` before focusing, which makes jsdom report \`:focus-visible\` like a browser. \`V\` marks the slide not hidden from screen readers:

\`\`\`text
start   : 1 / 5 · Sunrise · auto | translateX(-0%) | V---- | aria-live off
pause   : 1 / 5 · Sunrise · paused | button: Start automatic slide show | aria-live polite
next x2 : 3 / 5 · Pine ridge · paused | translateX(-200%) | --V--
dot 5   : 5 / 5 · Night sky · paused | current dot 5
wrap fwd: 1 / 5 · Sunrise · paused | translateX(-0%)
wrap back: 5 / 5 · Night sky · paused
ArrowLeft: 5 / 5 · Night sky · paused
3.3s paused: 1 / 5 · Sunrise · paused
play    : 1 / 5 · Sunrise · auto | aria-live off
3.3s    : 2 / 5 · Harbour · auto
6.3s    : 3 / 5 · Pine ridge · auto
hover 3.3s: 3 / 5 · Pine ridge · paused
leave 3.3s: 4 / 5 · Red rocks · auto
focus after a click: 4 / 5 · Red rocks · auto | focus-visible false
keyboard focus in: 4 / 5 · Red rocks · paused | focus-visible true
focus out: 4 / 5 · Red rocks · auto
\`\`\`

(Trimmed: the prev, Home, ArrowRight, hover, leave and "focus moves inside" lines are omitted; all 22 lines matched the React and Angular runs exactly.) In headless Chromium 141 a real mouse click on Next left the button focused with \`:focus-visible\` false, and autoplay resumed 3.3s after the mouse moved away; hovering kept it paused; the track's computed \`transition-duration\` was \`0.45s\`.

## 5. Common Pitfalls

- **\`setInterval\` started in \`onMounted\` and never cleared.** It keeps firing after unmount. A watcher with \`onCleanup\` is cleared for you.
- **\`@focus\` / \`@blur\` on the section.** They do not bubble, so focus on the inner buttons is never seen; use \`@focusin\` / \`@focusout\`.
- **Pausing on every focus.** A mouse click focuses the button and the carousel stays paused until the user clicks elsewhere; check \`:focus-visible\`.
- **Mutating \`props.slides\` or storing a copy of the index in the parent and child.** Keep \`index\` in one place; expose it with \`defineModel\` only if the parent really needs it ([defineModel](/interview-question/what-is-definemodel-in-vue-3-4-and-how-does-it-replace-manual-prop-emit)).
- **\`(index - 1) % n\`.** Gives \`-1\` on the first slide.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Wrap or stop at the ends, is a visible rewind fine, and should autoplay resume after the user leaves?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;">"An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code> ref, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">playing</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hovered</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focused</code> refs, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code> as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> of those three."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Render:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code> slides in a flex track moved by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">translateX</code>, arrows and dots calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">go(i)</code> with modulo wrap-around."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Autoplay:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code> that sets a timeout and registers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup(clearTimeout)</code>, so every move restarts the countdown and unmount clears it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@focusin</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:focus-visible</code> check, carousel and slide roles, hidden off-screen slides, a Pause button, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-live</code> off while rotating."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watch</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watchEffect</code> for the timer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The timer callback reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code> later, inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code>, where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watchEffect</code> cannot track it. Listing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code> as sources makes the restart rule explicit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you let the parent control the slide?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replace the internal ref with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel</code> so the parent can bind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> to the index, for example to sync it with the URL; the component keeps the same logic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you let consumers customise each slide?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Expose a scoped slot: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;slot name=slide :slide=s :active=i === index /&gt;</code>, falling back to the default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;img&gt;</code>. The carousel keeps navigation and the parent renders captions or videos.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it with Vue Test Utils?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use fake timers, mount, advance 3000 ms and expect the status text to change; trigger <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mouseenter</code> and expect no change; trigger <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keydown</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrowLeft</code> and expect a wrap to the last slide.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Carousel** | Shows one item of a set at a time |
| **computed** | Cached value derived from reactive state |
| **Watcher cleanup** | Function Vue runs before a watcher re-runs and when it stops |
| **:focus-visible** | Matches focus the browser would show, in practice keyboard focus |
| **aria-live** | Region whose changes a screen reader announces |
| **WCAG 2.2.2** | Auto-moving content needs a pause or stop control |

---
**Conclusion:** In Vue the basic carousel is an \`index\` ref, a \`running\` computed from the user choice plus hover and keyboard focus, and one watcher that sets a timeout and clears it through \`onCleanup\`. Add modulo wrap-around, a transform track, carousel and slide ARIA, a quiet live region while rotating and a Pause button. Verified on Vue 3.5.44, it behaves line for line like the React and Angular builds. The seamless, swipeable version is the [infinite-loop carousel](/interview-question/build-an-image-carousel-with-infinite-loop-swipe).`,
        files: {
          "/src/App.vue": `<script setup>
import ImageCarousel from "./components/ImageCarousel.vue";
import { slides } from "./data/slides.js";
</script>

<template>
  <main class="app">
    <h1>Image carousel</h1>
    <ImageCarousel :slides="slides" :interval="3000" label="Featured photos" />
    <p class="hint">Arrows, dots or the Left / Right keys move; hover or focus pauses autoplay.</p>
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px;
}
h1 {
  font-size: 1.2rem;
}
.hint {
  color: #8a93a6;
  font-size: 0.85rem;
}
</style>
`,
          "/src/components/ImageCarousel.vue": `<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  slides: { type: Array, required: true },
  interval: { type: Number, default: 3000 },
  label: { type: String, default: "Photos" },
});

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const n = computed(() => props.slides.length);
const index = ref(0);
const playing = ref(!prefersReducedMotion()); // user choice
const hovered = ref(false);
const focused = ref(false);
const running = computed(
  () => playing.value && !hovered.value && !focused.value,
);

// Wrap-around: ((i % n) + n) % n also handles -1.
function go(i) {
  index.value = ((i % n.value) + n.value) % n.value;
}

// One timeout per visible slide: any navigation restarts the countdown.
// The cleanup runs before the next run and when the component unmounts.
watch(
  [running, index, () => props.interval],
  ([isRunning], _old, onCleanup) => {
    if (!isRunning) return;
    const id = setTimeout(() => go(index.value + 1), props.interval);
    onCleanup(() => clearTimeout(id));
  },
  { immediate: true },
);

function onKeydown(e) {
  const moves = {
    ArrowLeft: index.value - 1,
    ArrowRight: index.value + 1,
    Home: 0,
    End: n.value - 1,
  };
  if (!(e.key in moves)) return;
  e.preventDefault();
  go(moves[e.key]);
}

// Pause for keyboard focus only: a mouse click also focuses a button, but
// then :focus-visible is false and hover already covers the mouse user.
function onFocusin(e) {
  if (e.target.matches(":focus-visible")) focused.value = true;
}
function onFocusout(e) {
  // focusout fires when moving between our own buttons too: ignore that.
  if (!e.currentTarget.contains(e.relatedTarget)) focused.value = false;
}
</script>

<template>
  <section
    class="carousel"
    data-testid="carousel"
    aria-roledescription="carousel"
    :aria-label="label"
    tabindex="0"
    @keydown="onKeydown"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @focusin="onFocusin"
    @focusout="onFocusout"
  >
    <div class="viewport" :aria-live="running ? 'off' : 'polite'">
      <div
        class="track"
        :style="{ transform: 'translateX(-' + index * 100 + '%)' }"
      >
        <div
          v-for="(s, i) in slides"
          :key="s.id"
          class="slide"
          role="group"
          aria-roledescription="slide"
          :aria-label="i + 1 + ' of ' + n"
          :aria-hidden="i !== index"
        >
          <img :src="s.src" :alt="s.alt" draggable="false" />
        </div>
      </div>
      <button
        type="button"
        class="arrow prev"
        data-testid="prev"
        aria-label="Previous slide"
        @click="go(index - 1)"
      >‹</button>
      <button
        type="button"
        class="arrow next"
        data-testid="next"
        aria-label="Next slide"
        @click="go(index + 1)"
      >›</button>
    </div>

    <div class="controls">
      <button
        type="button"
        data-testid="toggle"
        :aria-label="playing ? 'Stop automatic slide show' : 'Start automatic slide show'"
        @click="playing = !playing"
      >
        {{ playing ? "Pause" : "Play" }}
      </button>
      <div class="dots">
        <button
          v-for="(s, i) in slides"
          :key="s.id"
          type="button"
          class="dot"
          data-testid="dot"
          :aria-label="'Go to slide ' + (i + 1)"
          :aria-current="i === index ? 'true' : undefined"
          @click="go(i)"
        />
      </div>
      <p class="status" data-testid="status">
        {{ index + 1 }} / {{ n }} · {{ slides[index].alt }} · {{ running ? "auto" : "paused" }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.carousel {
  border-radius: 12px;
  background: #181b22;
  padding: 8px;
  outline: none;
}
.carousel:focus-visible {
  box-shadow: 0 0 0 2px #7aa2ff;
}
.viewport {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  aspect-ratio: 16 / 9;
}
.track {
  display: flex;
  height: 100%;
  transition: transform 0.45s ease;
}
.slide {
  flex: 0 0 100%;
  height: 100%;
}
.slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
}
.arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 0;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}
.arrow:focus-visible,
.controls button:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.prev {
  left: 8px;
}
.next {
  right: 8px;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 10px 4px 2px;
}
.controls > button {
  background: #2a3142;
  color: #e6e6e6;
  border: 1px solid #3d4760;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
}
.dots {
  display: flex;
  gap: 6px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #8a93a6;
  background: transparent;
  padding: 0;
  cursor: pointer;
}
.dot[aria-current="true"] {
  background: #7aa2ff;
  border-color: #7aa2ff;
}
.status {
  margin: 0;
  margin-left: auto;
  color: #a8b3c7;
  font-size: 0.85rem;
}
@media (prefers-reduced-motion: reduce) {
  .track {
    transition: none;
  }
}
</style>
`,
          "/src/data/slides.js": `// Offline slides: inline SVG data URLs, so the demo needs no network.
// Tiny markup helper: el("rect", { width: 9 }) gives <rect width="9"/>.
function el(tag, attrs, children) {
  const a = Object.keys(attrs)
    .map((k) => " " + k + '="' + attrs[k] + '"')
    .join("");
  return children
    ? "<" + tag + a + ">" + children.join("") + "</" + tag + ">"
    : "<" + tag + a + "/>";
}

function svgSlide(hue, title, n) {
  const svg = el(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 800,
      height: 450,
      viewBox: "0 0 800 450",
    },
    [
      el("defs", {}, [
        el("linearGradient", { id: "g", x1: 0, y1: 0, x2: 1, y2: 1 }, [
          el("stop", { offset: 0, "stop-color": "hsl(" + hue + ",70%,55%)" }),
          el("stop", {
            offset: 1,
            "stop-color": "hsl(" + (hue + 50) + ",65%,28%)",
          }),
        ]),
      ]),
      el("rect", { width: 800, height: 450, fill: "url(#g)" }),
      el("circle", {
        cx: 640,
        cy: 120,
        r: 70,
        fill: "hsla(" + (hue + 180) + ",80%,85%,0.55)",
      }),
      el("path", {
        d: "M0 450 L220 250 L360 370 L520 220 L800 450 Z",
        fill: "hsla(" + hue + ",40%,14%,0.7)",
      }),
      el(
        "text",
        {
          x: 40,
          y: 80,
          "font-family": "sans-serif",
          "font-size": 48,
          fill: "white",
        },
        [n + ". " + title],
      ),
    ],
  );
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const titles = ["Sunrise", "Harbour", "Pine ridge", "Red rocks", "Night sky"];

export const slides = titles.map((title, i) => ({
  id: i + 1,
  alt: title,
  src: svgSlide((i * 70 + 10) % 360, title, i + 1),
}));
`,
        },
      },
      // ── angular ─────────────────────────────────────────────────────
      angular: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Angular. Assumes standalone components and templates; signals, effects, ARIA and CSS transforms are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain words first, then <code>📌 Interview term:</code> callouts. The Verified output comes from running this solution on Angular 22.2.3, AOT with strict templates and the playground runtime JIT, in jsdom and in headless Chromium 141.

## 1. A Story First

A carousel is one poster frame and a clerk who swaps the poster every few seconds. The clerk must wrap from the last poster to the first, let anyone jump to a specific poster, wait while someone is reading, and stop entirely when asked. The build is small; the rules are the interview.

📌 **Interview term: Carousel** — a component that shows one item of a set at a time, with controls to move between items and often automatic rotation.

## 2. Requirements and the Angular State Model

\`ImageCarouselComponent\` (\`app-image-carousel\`) takes \`slides\`, \`interval\` and \`label\` as \`@Input()\`s (the playground runtime JIT does not register signal \`input()\`). Its state is all signals:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="Signals playing, hovered and focused feed a computed running signal; an effect reads running and index, sets a timeout, and its onCleanup clears the timeout before each re-run">
  <defs>
    <marker id="cba-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="200" height="60" rx="10"/>
  <text class="d-text" x="120" y="46" text-anchor="middle">playing, hovered,</text>
  <text class="d-text" x="120" y="66" text-anchor="middle">focused signals</text>
  <rect class="d-box-accent" x="280" y="20" width="160" height="60" rx="10"/>
  <text class="d-text d-accent" x="360" y="46" text-anchor="middle">running</text>
  <text class="d-sub" x="360" y="66" text-anchor="middle">computed()</text>
  <rect class="d-box" x="500" y="20" width="180" height="60" rx="10"/>
  <text class="d-text" x="590" y="46" text-anchor="middle">effect()</text>
  <text class="d-sub" x="590" y="66" text-anchor="middle">setTimeout 3s</text>
  <rect class="d-box-muted" x="500" y="130" width="180" height="50" rx="10"/>
  <text class="d-text" x="590" y="160" text-anchor="middle">index signal</text>
  <path class="d-edge" d="M 220 50 L 272 50" marker-end="url(#cba-arrow)"/>
  <path class="d-edge-accent" d="M 440 50 L 492 50" marker-end="url(#cba-arrow)"/>
  <path class="d-edge" d="M 560 80 L 560 122" marker-end="url(#cba-arrow)"/>
  <path class="d-edge-dashed" d="M 620 130 L 620 88" marker-end="url(#cba-arrow)"/>
</svg>

The effect writes \`index\` when its timeout fires, and because it also reads \`index\`, the new value re-runs it: the old timeout is cleared and a fresh one starts.

📌 **Interview term: \`computed()\`** — a read-only signal derived from other signals, recomputed lazily when they change. \`running\` is never set by hand, so the three pause reasons cannot disagree ([computed vs getters](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls)).

## 3. Build It Step by Step

### Step 1: Wrap-around and the track

~~~ts
go(i: number): void {
  const n = this.slides.length;
  this.index.set(((i % n) + n) % n);
}
~~~

📌 **Interview term: Modulo wrap-around** — JavaScript's \`-1 % 5\` is \`-1\`; adding \`n\` and taking \`% n\` again maps any integer into \`0..n-1\`.

~~~html
<div
  class="track"
  [style.transform]="'translateX(-' + index() * 100 + '%)'"
>
  @for (s of slides; track s.id; let i = $index) {
    <div
      class="slide"
      role="group"
      aria-roledescription="slide"
      [attr.aria-label]="i + 1 + ' of ' + slides.length"
      [attr.aria-hidden]="i !== index()"
    >
      <img [src]="s.src" [alt]="s.alt" draggable="false" />
    </div>
  }
</div>
~~~

ARIA values are bound with \`[attr.aria-label]\`, the explicit attribute form that works in every Angular version. (A quick check while writing this: Angular 22.2.3 also accepted a bare \`[aria-label]="label"\` under both AOT and JIT and wrote the attribute, but \`[attr.]\` leaves no doubt.) \`track s.id\` lets Angular keep each slide node across changes ([why @for requires track](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux)).

### Step 2: Autoplay as an effect with cleanup

~~~ts
constructor() {
  effect((onCleanup) => {
    if (!this.running()) return;
    const current = this.index();
    const id = setTimeout(() => this.go(current + 1), this.interval);
    onCleanup(() => clearTimeout(id));
  });
}
~~~

📌 **Interview term: \`effect()\` with \`onCleanup\`** — an effect re-runs when any signal it read changes; the registered cleanup runs before the next run and when the component is destroyed. Reading \`running()\` and \`index()\` makes both dependencies, so pausing clears the timer and any manual move restarts it. See [effect() and when not to use it](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it); a timer that talks to the outside world is a legitimate use.

The timeout callback sets a signal, which is what makes the view update. This playground runs Angular without Zone.js, so a plain field changed inside \`setTimeout\` would not re-render ([Zone.js and zoneless Angular](/interview-question/what-is-zone-js-how-does-it-monkey-patch-browser-apis-and-how-do-you-build-a-zon)).

### Step 3: Pause on hover, keyboard focus and by choice

~~~ts
onFocusin(e: FocusEvent): void {
  if ((e.target as HTMLElement).matches(":focus-visible"))
    this.focused.set(true);
}
onFocusout(e: FocusEvent): void {
  const host = e.currentTarget as HTMLElement;
  if (!host.contains(e.relatedTarget as Node | null))
    this.focused.set(false);
}
~~~

The section binds \`(mouseenter)\`, \`(mouseleave)\`, \`(focusin)\` and \`(focusout)\`; the focus events bubble from the inner buttons, and focus moving between two inner buttons is ignored because \`relatedTarget\` stays inside.

📌 **Interview term: \`:focus-visible\`** — matches focus the browser would show, in practice keyboard focus. A mouse click also focuses a button, but not visibly, so checking it keeps autoplay running for mouse users once they move away while still pausing for keyboard users.

Play / Pause toggles \`playing\` with labels "Stop automatic slide show" / "Start automatic slide show" (WCAG 2.2.2 requires a pause control), and \`playing\` starts \`false\` under \`prefers-reduced-motion\`.

### Step 4: Keyboard and screen readers

\`(keydown)\` on the focusable section maps ArrowLeft / ArrowRight / Home / End to \`go()\`. The viewport binds \`[attr.aria-live]="running() ? 'off' : 'polite'"\`, so a screen reader is not interrupted every three seconds but hears manual changes.

📌 **Interview term: \`aria-live\`** — marks a region whose changes are announced; \`off\` while rotating, \`polite\` when paused, as the APG carousel pattern recommends.

## 4. Verified

Booted with \`bootstrapApplication(AppComponent)\` in jsdom under AOT (\`ngc\`, \`strictTemplates\`) and runtime JIT; both printed identical lines, which also matched the React and Vue runs exactly. Real timers; hover is dispatched as \`mouseenter\` / \`mouseleave\`, and a Tab \`keydown\` before focusing makes jsdom report \`:focus-visible\`:

\`\`\`text
start   : 1 / 5 · Sunrise · auto | translateX(-0%) | V---- | aria-live off
pause   : 1 / 5 · Sunrise · paused | button: Start automatic slide show | aria-live polite
next x2 : 3 / 5 · Pine ridge · paused | translateX(-200%) | --V--
wrap fwd: 1 / 5 · Sunrise · paused | translateX(-0%)
wrap back: 5 / 5 · Night sky · paused
ArrowLeft: 5 / 5 · Night sky · paused
3.3s paused: 1 / 5 · Sunrise · paused
3.3s    : 2 / 5 · Harbour · auto
6.3s    : 3 / 5 · Pine ridge · auto
hover 3.3s: 3 / 5 · Pine ridge · paused
leave 3.3s: 4 / 5 · Red rocks · auto
focus after a click: 4 / 5 · Red rocks · auto | focus-visible false
keyboard focus in: 4 / 5 · Red rocks · paused | focus-visible true
focus out: 4 / 5 · Red rocks · auto
\`\`\`

(Trimmed to 14 of the 22 lines.) In headless Chromium 141, bundled without Zone.js, a real click on Next showed "2 / 5 · Harbour · paused" while the mouse hovered, and autoplay resumed after the mouse moved away. One observation: reading the DOM immediately after the click still showed the old slide; after a 100 ms wait it showed the new one. Zoneless Angular schedules the re-render instead of rendering synchronously inside the event, so tests should wait for stability (\`await fixture.whenStable()\`), not read the DOM in the same tick.

## 5. Common Pitfalls

- **A plain \`index\` field updated in \`setTimeout\`.** Without Zone.js nothing re-renders; use a signal.
- **\`setInterval\` in \`ngOnInit\` with no \`ngOnDestroy\`.** It runs forever after the component is gone; the effect's \`onCleanup\` handles both restarts and destroy.
- **Binding a value of \`false\` with \`[attr.aria-current]\`.** It renders the string "false"; return \`null\` to remove the attribute, as the dots do.
- **Pausing on any focus.** A mouse click focuses the button and the carousel never resumes; check \`:focus-visible\`.
- **Signal \`input()\` in the playground.** It does not register under runtime JIT; \`@Input()\` works in both.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Wrap or stop at the ends, is a visible rewind fine, and should autoplay resume after the user leaves?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;">"Signals for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">playing</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hovered</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focused</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code> is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code> of the last three."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Render:</strong> <span style="color:#f0e2c8;">"An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> over the slides in a flex track moved by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">translateX</code>, arrows and dots calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">go(i)</code> with modulo wrap-around, ARIA through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[attr.]</code> bindings."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Autoplay:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect()</code> reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index()</code>, sets a timeout and registers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup(clearTimeout)</code>; the timeout sets the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code> signal, which re-renders even without Zone.js."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"Pause on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(focusin)</code> only when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:focus-visible</code>, carousel and slide roles, hidden off-screen slides, a Pause button, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-live</code> off while rotating."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use RxJS instead of an effect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toObservable(this.running)</code> combined with the index, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timer(interval)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EMPTY</code>. It is equivalent; the effect is shorter here, and RxJS pays off when the timer logic grows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you let consumers template each slide?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Accept an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-template</code> through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ContentChild(TemplateRef)</code> and render it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngTemplateOutlet</code>, passing the slide and whether it is active as the context.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you pause when the tab is hidden?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hidden</code> signal set from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(document:visibilitychange)</code> and include <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!hidden()</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the autoplay?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fakeAsync</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(3000)</code> or, zoneless, Jasmine or Vitest fake timers followed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code>, then assert the status text. Hover with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dispatchEvent(new MouseEvent(mouseenter))</code> and expect no change.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Carousel** | Shows one item of a set at a time |
| **computed()** | Read-only signal derived from other signals |
| **effect() onCleanup** | Teardown that runs before an effect re-runs and on destroy |
| **:focus-visible** | Matches focus the browser would show, in practice keyboard focus |
| **[attr.x] binding** | Sets an HTML attribute; \`null\` removes it |
| **aria-live** | Region whose changes a screen reader announces |

---
**Conclusion:** In Angular the basic carousel is an \`index\` signal, a \`running\` computed from \`playing\`, \`hovered\` and \`focused\`, and one \`effect()\` that sets a timeout and clears it in \`onCleanup\`, so pausing, manual moves and destroy are all handled in one place. Add modulo wrap-around, a transform track, \`[attr.]\` ARIA bindings and a Pause button. Verified on Angular 22.2.3 under AOT and JIT, it matches the React and Vue builds line for line. For a seamless loop and touch swipe, see the [infinite-loop carousel](/interview-question/build-an-image-carousel-with-infinite-loop-swipe).`,
        files: {
          "/src/app/app.component.ts": `import { Component } from "@angular/core";
import { ImageCarouselComponent } from "./components/image-carousel.component";
import { slides } from "./data/slides";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [ImageCarouselComponent],
  template: \`
    <main class="app">
      <h1>Image carousel</h1>
      <app-image-carousel
        [slides]="slides"
        [interval]="3000"
        label="Featured photos"
      />
      <p class="hint">Arrows, dots or the Left / Right keys move; hover or focus pauses autoplay.</p>
    </main>
  \`,
  styles: [
    \`
    :host { display: block; min-height: 100vh; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
    .app { max-width: 720px; margin: 0 auto; padding: 16px; }
    h1 { font-size: 1.2rem; }
    .hint { color: #8a93a6; font-size: 0.85rem; }
  \`,
  ],
})
export class AppComponent {
  readonly slides = slides;
}
`,
          "/src/app/components/image-carousel.component.ts": `import { Component, Input, computed, effect, signal } from "@angular/core";
import { Slide } from "../data/slides";

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

@Component({
  selector: "app-image-carousel",
  standalone: true,
  template: \`
    <section
      class="carousel"
      data-testid="carousel"
      aria-roledescription="carousel"
      [attr.aria-label]="label"
      tabindex="0"
      (keydown)="onKeydown($event)"
      (mouseenter)="hovered.set(true)"
      (mouseleave)="hovered.set(false)"
      (focusin)="onFocusin($event)"
      (focusout)="onFocusout($event)"
    >
      <div class="viewport" [attr.aria-live]="running() ? 'off' : 'polite'">
        <div
          class="track"
          [style.transform]="'translateX(-' + index() * 100 + '%)'"
        >
          @for (s of slides; track s.id; let i = $index) {
            <div
              class="slide"
              role="group"
              aria-roledescription="slide"
              [attr.aria-label]="i + 1 + ' of ' + slides.length"
              [attr.aria-hidden]="i !== index()"
            >
              <img [src]="s.src" [alt]="s.alt" draggable="false" />
            </div>
          }
        </div>
        <button
          type="button"
          class="arrow prev"
          data-testid="prev"
          aria-label="Previous slide"
          (click)="go(index() - 1)"
        >‹</button>
        <button
          type="button"
          class="arrow next"
          data-testid="next"
          aria-label="Next slide"
          (click)="go(index() + 1)"
        >›</button>
      </div>

      <div class="controls">
        <button
          type="button"
          data-testid="toggle"
          [attr.aria-label]="playing() ? 'Stop automatic slide show' : 'Start automatic slide show'"
          (click)="playing.set(!playing())"
        >
          {{ playing() ? "Pause" : "Play" }}
        </button>
        <div class="dots">
          @for (s of slides; track s.id; let i = $index) {
            <button
              type="button"
              class="dot"
              data-testid="dot"
              [attr.aria-label]="'Go to slide ' + (i + 1)"
              [attr.aria-current]="i === index() ? 'true' : null"
              (click)="go(i)"
            ></button>
          }
        </div>
        <p class="status" data-testid="status">
          {{ index() + 1 }} / {{ slides.length }} · {{ slides[index()].alt }} · {{ running() ? "auto" : "paused" }}
        </p>
      </div>
    </section>
  \`,
  styles: [
    \`
    .carousel { border-radius: 12px; background: #181b22; padding: 8px; outline: none; }
    .carousel:focus-visible { box-shadow: 0 0 0 2px #7aa2ff; }
    .viewport { position: relative; overflow: hidden; border-radius: 8px; aspect-ratio: 16 / 9; }
    .track { display: flex; height: 100%; transition: transform 0.45s ease; }
    .slide { flex: 0 0 100%; height: 100%; }
    .slide img { width: 100%; height: 100%; object-fit: cover; display: block; user-select: none; }
    .arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; border-radius: 50%; border: 0; background: rgba(0, 0, 0, 0.55); color: #fff; font-size: 24px; line-height: 1; cursor: pointer; }
    .arrow:focus-visible, .controls button:focus-visible { outline: 2px solid #7aa2ff; outline-offset: 2px; }
    .prev { left: 8px; }
    .next { right: 8px; }
    .controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 10px 4px 2px; }
    .controls > button { background: #2a3142; color: #e6e6e6; border: 1px solid #3d4760; border-radius: 6px; padding: 4px 10px; cursor: pointer; }
    .dots { display: flex; gap: 6px; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid #8a93a6; background: transparent; padding: 0; cursor: pointer; }
    .dot[aria-current="true"] { background: #7aa2ff; border-color: #7aa2ff; }
    .status { margin: 0; margin-left: auto; color: #a8b3c7; font-size: 0.85rem; }
    @media (prefers-reduced-motion: reduce) { .track { transition: none; } }
  \`,
  ],
})
export class ImageCarouselComponent {
  @Input({ required: true }) slides: Slide[] = [];
  @Input() interval = 3000;
  @Input() label = "Photos";

  readonly index = signal(0);
  readonly playing = signal(!prefersReducedMotion()); // user choice
  readonly hovered = signal(false);
  readonly focused = signal(false);
  readonly running = computed(
    () => this.playing() && !this.hovered() && !this.focused(),
  );

  constructor() {
    // One timeout per visible slide: reading index() makes any navigation
    // restart the countdown. onCleanup runs before each re-run and on destroy.
    effect((onCleanup) => {
      if (!this.running()) return;
      const current = this.index();
      const id = setTimeout(() => this.go(current + 1), this.interval);
      onCleanup(() => clearTimeout(id));
    });
  }

  // Wrap-around: ((i % n) + n) % n also handles -1.
  go(i: number): void {
    const n = this.slides.length;
    this.index.set(((i % n) + n) % n);
  }

  onKeydown(e: KeyboardEvent): void {
    const n = this.slides.length;
    const moves: Record<string, number> = {
      ArrowLeft: this.index() - 1,
      ArrowRight: this.index() + 1,
      Home: 0,
      End: n - 1,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    this.go(moves[e.key]);
  }

  // Pause for keyboard focus only: a mouse click also focuses a button, but
  // then :focus-visible is false and hover already covers the mouse user.
  onFocusin(e: FocusEvent): void {
    if ((e.target as HTMLElement).matches(":focus-visible"))
      this.focused.set(true);
  }

  onFocusout(e: FocusEvent): void {
    // focusout fires when moving between our own buttons too: ignore that.
    const host = e.currentTarget as HTMLElement;
    if (!host.contains(e.relatedTarget as Node | null)) this.focused.set(false);
  }
}
`,
          "/src/app/data/slides.ts": `// Offline slides: inline SVG data URLs, so the demo needs no network.
// Tiny markup helper: el("rect", { width: 9 }) gives <rect width="9"/>.
function el(
  tag: string,
  attrs: Record<string, string | number>,
  children?: string[],
): string {
  const a = Object.keys(attrs)
    .map((k) => " " + k + '="' + attrs[k] + '"')
    .join("");
  return children
    ? "<" + tag + a + ">" + children.join("") + "</" + tag + ">"
    : "<" + tag + a + "/>";
}

function svgSlide(hue: number, title: string, n: number): string {
  const svg = el(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 800,
      height: 450,
      viewBox: "0 0 800 450",
    },
    [
      el("defs", {}, [
        el("linearGradient", { id: "g", x1: 0, y1: 0, x2: 1, y2: 1 }, [
          el("stop", { offset: 0, "stop-color": "hsl(" + hue + ",70%,55%)" }),
          el("stop", {
            offset: 1,
            "stop-color": "hsl(" + (hue + 50) + ",65%,28%)",
          }),
        ]),
      ]),
      el("rect", { width: 800, height: 450, fill: "url(#g)" }),
      el("circle", {
        cx: 640,
        cy: 120,
        r: 70,
        fill: "hsla(" + (hue + 180) + ",80%,85%,0.55)",
      }),
      el("path", {
        d: "M0 450 L220 250 L360 370 L520 220 L800 450 Z",
        fill: "hsla(" + hue + ",40%,14%,0.7)",
      }),
      el(
        "text",
        {
          x: 40,
          y: 80,
          "font-family": "sans-serif",
          "font-size": 48,
          fill: "white",
        },
        [n + ". " + title],
      ),
    ],
  );
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const titles = ["Sunrise", "Harbour", "Pine ridge", "Red rocks", "Night sky"];

export interface Slide {
  id: number;
  alt: string;
  src: string;
}

export const slides: Slide[] = titles.map((title, i) => ({
  id: i + 1,
  alt: title,
  src: svgSlide((i * 70 + 10) % 360, title, i + 1),
}));
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build an Image Carousel with Infinite Loop & Swipe",
    seoDescription:
      "Infinite image carousel with cloned edge slides, pointer swipe, a transition lock and autoplay that pauses in hidden tabs, in React, Vue and Angular.",
    description: `**Question presented to candidate:**
"You already know a basic carousel. Now make ours feel native: it must loop forever in one direction, so going from the last photo to the first slides forward instead of rewinding across every photo. Users on phones should be able to drag the photo with a finger and have it follow, then commit or snap back on release. Keep the arrows, dots, keyboard and a 3-second autoplay that pauses on hover, focus, while dragging and when the tab is hidden."

**Requirements:**
- One slide visible; the track is \`[clone of last, ...slides, clone of first]\` and moves with \`translateX\`.
- Next from the last slide animates onto the clone of the first, then jumps silently (transition off) to the real first slide; the same in reverse.
- Pointer drag (mouse, pen, touch) moves the track 1:1; release beyond 40px commits to the neighbour, otherwise it springs back.
- Clicks during a running transition are ignored; arrows, dots and Left / Right keys still work.
- Autoplay every 3 s, paused on hover, keyboard focus, while dragging and while \`document.hidden\`; a Pause button.

**What a strong answer should cover:**
- Why the naive \`index % n\` track rewinds, and how cloned edge slides plus a silent jump on \`transitionend\` hide it.
- Toggling \`transition: none\` for the jump, forcing a reflow so the browser does not animate it, and a timeout fallback because \`transitionend\` never fires with reduced motion (no transition runs) or when a transition is cancelled.
- A transition lock so rapid clicks cannot run past the clones.
- Pointer Events with \`setPointerCapture\`, \`touch-action: pan-y\` so vertical page scroll still works, a distance threshold, and not hijacking clicks on the arrow buttons.
- Page Visibility API for autoplay, clones hidden from screen readers (\`aria-hidden\`, empty \`alt\`).

**Clarifying questions expected:**
- "Is a 40px threshold right, or should a fast flick with a short distance also count (velocity)?"
- "Should autoplay resume after a swipe, or stop once the user takes control?"
- "Do we need peeking neighbours (slides narrower than the viewport) or exactly one slide?"

**Code / implementation expected:** Yes. A working carousel with cloned edges, the silent jump, pointer swipe and autoplay with all pause conditions.`,
    frameworks: {
      // ── react ───────────────────────────────────────────────────────
      react: {
        answer: `**Target Audience:** Frontend candidates who can already build a basic carousel and now face the "make it feel native" follow-up. Assumes React hooks; pointer events, transitions and the tricks are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain words, then tagged with <code>📌 Interview term:</code>. This doc assumes the fundamentals of [the basic image carousel](/interview-question/build-an-image-carousel) (wrap-around, autoplay with cleanup, pause on hover and \`:focus-visible\`, carousel ARIA) and only re-explains them where they change. The output in section 6 was produced on React 19.3.1 in jsdom and in headless Chromium 141.

## 1. Why This Even Matters — A Story First

Think of a merry-go-round. However many times it turns, horse 1 always comes after horse 8; it never stops and reverses through all the horses to get back to the start. A basic carousel does reverse: from slide 5, "next" animates \`translateX(-400%)\` back to \`0%\`, and the user watches every slide fly past backwards.

The trick is stage magic. Put a **copy of the first slide after the last one**. "Next" from slide 5 slides forward onto the copy, which looks exactly like slide 1. The instant the animation ends, with the animation switched off, swap the copy for the real slide 1. Nobody sees the swap, because both frames are identical.

The second half of "feel native" is touch: on a phone, people expect to grab the photo, have it follow their finger, and let go to either commit to the next photo or spring back.

📌 **Interview term: Infinite (seamless) carousel** — a carousel that always moves in the direction of travel, wrapping from last to first without a visible rewind, usually built with cloned edge slides.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| One slide at a time, or peeking neighbours? | With peeking (slides at 80% width) you need more than one clone on each side. |
| Swipe threshold: distance only, or velocity too? | A 40px distance rule is simple; real apps also commit on a fast flick. |
| Should autoplay resume after the user swipes? | Changes whether a swipe sets \`playing = false\`. |
| Must it work with reduced motion? | Then there are no transitions and \`transitionend\` never fires, so the jump needs a fallback. |
| Mouse drag on desktop, or touch only? | Pointer Events cover both; mouse drag also needs \`user-select: none\` and a grab cursor. |
| Will the slide count change at runtime? | Clones must be rebuilt from the current list. |

## 3. Requirements and Plan

The track always holds \`n + 2\` slides: \`[clone of last, ...slides, clone of first]\`. A position \`pos\` from \`0\` to \`n + 1\` says which track slot is in view; the real slides live at \`1..n\`, and the slide index shown to the user is derived: \`(pos - 1 + n) % n\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Track of seven slots: a clone of slide 5, slides 1 to 5, and a clone of slide 1. Next from slot 5 animates to the clone in slot 6, then jumps without animation to slot 1">
  <defs>
    <marker id="icr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="80" height="60" rx="8"/>
  <text class="d-text" x="60" y="88" text-anchor="middle">5</text>
  <text class="d-sub" x="60" y="108" text-anchor="middle">clone</text>
  <rect class="d-box" x="120" y="60" width="80" height="60" rx="8"/>
  <text class="d-text" x="160" y="95" text-anchor="middle">1</text>
  <rect class="d-box" x="220" y="60" width="80" height="60" rx="8"/>
  <text class="d-text" x="260" y="95" text-anchor="middle">2</text>
  <rect class="d-box" x="320" y="60" width="80" height="60" rx="8"/>
  <text class="d-text" x="360" y="95" text-anchor="middle">3</text>
  <rect class="d-box" x="420" y="60" width="80" height="60" rx="8"/>
  <text class="d-text" x="460" y="95" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="520" y="60" width="80" height="60" rx="8"/>
  <text class="d-text d-accent" x="560" y="95" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="620" y="60" width="80" height="60" rx="8"/>
  <text class="d-text" x="660" y="88" text-anchor="middle">1</text>
  <text class="d-sub" x="660" y="108" text-anchor="middle">clone</text>
  <text class="d-sub" x="60" y="40" text-anchor="middle">pos 0</text>
  <text class="d-sub" x="160" y="40" text-anchor="middle">pos 1</text>
  <text class="d-sub" x="560" y="40" text-anchor="middle">pos 5</text>
  <text class="d-sub" x="660" y="40" text-anchor="middle">pos 6</text>
  <path class="d-edge-accent" d="M 575 125 Q 610 160 645 125" marker-end="url(#icr-arrow)"/>
  <text class="d-sub" x="610" y="178" text-anchor="middle">1. animate</text>
  <path class="d-edge-dashed" d="M 660 125 L 660 205 L 160 205 L 160 128" marker-end="url(#icr-arrow)"/>
  <text class="d-sub" x="410" y="196" text-anchor="middle">2. on transitionend: jump, transition off</text>
</svg>

The reverse is symmetric: Previous from \`pos 1\` animates to the clone at \`pos 0\`, then jumps to \`pos 5\`.

| Value | Kind | Why |
| :--- | :--- | :--- |
| \`pos\` | state | Which track slot is in view |
| \`animate\` | state | Whether the CSS transition is on; off for jumps and drags |
| \`dx\`, \`dragging\` | state | Live finger offset in px, and whether a drag is active |
| \`hovered\`, \`focused\`, \`hidden\`, \`playing\` | state | Pause reasons |
| \`index\`, \`running\` | derived | Real slide number, and whether autoplay may tick |
| \`moving\`, \`drag\`, \`fallback\`, \`posRef\` | refs | Bookkeeping that must not cause renders |

📌 **Interview term: \`useRef\` for non-visual state** — a ref holds a mutable value that survives renders without triggering one. The transition lock and the drag start position never appear on screen, so they belong in refs, not state ([useRef use cases](/interview-question/describe-the-useref-hook-and-its-typical-use-cases)).

## 4. Build It Step by Step

### Step 1: Track with clones, transform with a drag offset

~~~jsx
const track = [slides[n - 1], ...slides, slides[0]];
// ...
style={{
  transform: "translateX(calc(" + -pos * 100 + "% + " + dx + "px))",
  transition: animate && !dragging ? "transform " + DURATION + "ms ease" : "none",
}}
~~~

One \`calc()\` combines the slot (\`-pos * 100%\`) with the live drag offset in pixels, so the same transform serves resting, animating and dragging. Clones get \`aria-hidden="true"\`, no slide role and \`alt=""\`, so a screen reader still hears "5 slides", not 7.

### Step 2: Move with a lock, settle on \`transitionend\`

~~~jsx
function moveTo(next) {
  if (moving.current) return; // ignore clicks during a transition
  moving.current = true;
  setAnimate(true);
  setPos(next);
  // transitionend never fires with reduced
  // motion or a cancelled transition.
  clearTimeout(fallback.current);
  fallback.current = setTimeout(settle, DURATION + 100);
}

function settle() {
  clearTimeout(fallback.current);
  moving.current = false;
  const p = posRef.current;
  if (p === n + 1 || p === 0) {
    setAnimate(false); // silent jump from a clone to its real twin
    setPos(p === 0 ? n : 1);
  }
}
~~~

📌 **Interview term: Transition lock** — ignoring new moves while one is animating. Without it, three fast clicks on Next from slide 5 would go to \`pos 6\`, \`7\` and \`8\`, past the clone, into empty space.

📌 **Interview term: \`transitionend\`** — the event a CSS transition fires when it finishes. The track listens with \`onTransitionEnd\` and checks \`e.target === e.currentTarget\`, because transitions on children (a hover effect on a button, say) bubble the same event.

The **fallback timeout** is not decoration: with \`prefers-reduced-motion\` the CSS sets \`transition: none\`, so no transition runs and no \`transitionend\` ever fires. It also does not fire when a transition is cancelled (a \`transitioncancel\` fires instead) or never starts. Without the fallback, the lock would stay on forever and the carousel would freeze on a clone. \`settle\` clears the timer and is safe to call twice.

\`posRef\` mirrors \`pos\` so \`settle\` (called from a timer or an event) always reads the latest position, avoiding a [stale closure](/interview-question/what-causes-stale-closures-in-react-hooks-and-how-do-you-fix-them-correctly).

### Step 3: Make the silent jump really silent

~~~jsx
useLayoutEffect(() => {
  if (!animate && trackRef.current) void trackRef.current.offsetWidth;
}, [animate, pos]);
~~~

After the jump the DOM has \`transition: none\` and the new position. If the very next move turns the transition back on before the browser has applied that position, the browser can merge both changes and animate the jump. Reading \`offsetWidth\` forces a synchronous layout, committing the jumped position first.

📌 **Interview term: Forced reflow** — reading a layout property (\`offsetWidth\`, \`getBoundingClientRect()\`) makes the browser apply pending style changes immediately. Usually something to avoid; here it is the point. \`useLayoutEffect\` runs after the DOM update but before paint, the right moment for it ([useLayoutEffect vs useEffect](/interview-question/when-would-you-use-uselayouteffect-instead-of-useeffect)).

### Step 4: Pointer swipe

~~~jsx
function onPointerDown(e) {
  // Arrow buttons sit inside the viewport: let their clicks through.
  if (e.target.closest("button") || moving.current || e.button !== 0)
    return;
  drag.current = { startX: e.clientX, id: e.pointerId };
  if (e.currentTarget.setPointerCapture)
    e.currentTarget.setPointerCapture(e.pointerId);
  setDragging(true);
  setAnimate(false); // the track follows the finger 1:1
}
function onPointerMove(e) {
  if (drag.current) setDx(e.clientX - drag.current.startX);
}
function onPointerUp(e) {
  if (!drag.current) return;
  const dist = e.clientX - drag.current.startX;
  drag.current = null;
  setDragging(false);
  setDx(0);
  if (dist <= -SWIPE_PX) next();
  else if (dist >= SWIPE_PX) prev();
  else setAnimate(true); // too short: spring back
}
~~~

📌 **Interview term: Pointer Events** — one event family (\`pointerdown\`, \`pointermove\`, \`pointerup\`, \`pointercancel\`) for mouse, pen and touch, so you do not write mouse and touch handlers twice.

📌 **Interview term: Pointer capture** — \`setPointerCapture(id)\` sends all later events of that pointer to this element, even when the finger slides outside it, so a drag that ends off the carousel still gets its \`pointerup\`.

Three details matter in a real browser:

- **\`touch-action: pan-y\`** on the viewport tells the browser it may still scroll the page vertically, but horizontal gestures belong to the page script. Without it, touch browsers start a page pan and send \`pointercancel\`.
- **Ignore pointerdown on the arrow buttons.** Capturing the pointer retargets the following events to the viewport, so a click on "Next" would never reach the button. The first version of this solution had exactly that problem in Chromium.
- **\`pointercancel\` is treated like \`pointerup\`**, so an interrupted gesture (a system dialog, an orientation change) snaps back instead of leaving \`dragging\` stuck.

### Step 5: Autoplay with four pause reasons

~~~jsx
const running = playing && !hovered && !focused && !hidden && !dragging;

useEffect(() => {
  if (!running) return;
  const id = setTimeout(next, interval);
  return () => clearTimeout(id);
}, [running, pos, interval]);

useEffect(() => {
  const onVis = () => setHidden(document.hidden);
  document.addEventListener("visibilitychange", onVis);
  return () => document.removeEventListener("visibilitychange", onVis);
}, []);
~~~

The countdown restarts on every \`pos\` change, including the silent jump, so each slide gets its full three seconds. \`document.hidden\` comes from the Page Visibility API, the same pattern as [pausing a poller in a hidden tab](/interview-question/how-would-you-use-the-page-visibility-api-to-pause-a-setinterval-based-poller-wh).

## 5. Comparison With the Basic Carousel

| | Basic carousel | This one |
| :--- | :--- | :--- |
| Track | \`n\` slides, \`translateX(-index * 100%)\` | \`n + 2\` slides with clones |
| Last to first | Visible rewind | Forward onto the clone, then silent jump |
| Transition | Always on | Toggled per move, off for jumps and drags |
| Fast clicks | Harmless | Need a transition lock |
| Input | Buttons, dots, keys | Plus pointer drag with capture and threshold |
| Autoplay pauses | Hover, focus, button | Plus dragging and hidden tab |

## 6. Verified

Mounted in jsdom with \`<StrictMode>\`. jsdom has no layout and never runs CSS transitions, so the driver fires \`transitionend\` on the track by hand (and once deliberately does not, to exercise the fallback timer), and swipes with synthetic \`PointerEvent\`s. Autoplay is paused first so timers do not race the steps. Each line shows the status, the inline transform and the inline transition:

\`\`\`text
start     : 1 / 5 · Sunrise · auto | 7 slide nodes, 2 clones | translateX(calc(-100% + 0px)) / transform 400ms ease
prev      : 5 / 5 · Night sky · paused | translateX(calc(0% + 0px)) / transform 400ms ease
after end : 5 / 5 · Night sky · paused | translateX(calc(-500% + 0px)) / none
next      : 1 / 5 · Sunrise · paused | translateX(calc(-100% + 0px)) / none
dot 5     : 5 / 5 · Night sky · paused | translateX(calc(-500% + 0px)) / transform 400ms ease
next (to clone): 1 / 5 · Sunrise · paused | translateX(calc(-600% + 0px)) / transform 400ms ease
2nd click while moving: 1 / 5 · Sunrise · paused | translateX(calc(-600% + 0px)) / transform 400ms ease
after end : 1 / 5 · Sunrise · paused | translateX(calc(-100% + 0px)) / none
ArrowLeft to clone, no transitionend: 5 / 5 · Night sky · paused | translateX(calc(0% + 0px)) / transform 400ms ease
600ms later (fallback timer): 5 / 5 · Night sky · paused | translateX(calc(-500% + 0px)) / none
ArrowRight x2 (2nd ignored), 600ms: 1 / 5 · Sunrise · paused | translateX(calc(-100% + 0px)) / none
drag -30px: 1 / 5 · Sunrise · paused | translateX(calc(-100% + -30px)) / none
release (short): 1 / 5 · Sunrise · paused | translateX(calc(-100% + 0px)) / transform 400ms ease
swipe -80px: 2 / 5 · Harbour · paused | translateX(calc(-200% + 0px)) / transform 400ms ease
swipe +90px: 1 / 5 · Sunrise · paused | translateX(calc(-100% + 0px)) / transform 400ms ease
play      : 1 / 5 · Sunrise · auto
tab hidden: 1 / 5 · Sunrise · paused
hidden 3.3s: 1 / 5 · Sunrise · paused
tab visible: 1 / 5 · Sunrise · auto
visible 3.3s: 2 / 5 · Harbour · auto | translateX(calc(-200% + 0px)) / transform 400ms ease
\`\`\`

Previous from slide 1 animated to the clone at \`0%\`, then, after \`transitionend\`, jumped to \`-500%\` with the transition off. A second click during a move was ignored. With no \`transitionend\` at all, the fallback timer did the jump 600ms later. A 30px drag sprang back; 80px and 90px swipes committed. A hidden tab paused autoplay.

jsdom cannot show whether the jump is invisible, so the same build ran in **headless Chromium 141** with a real mouse and real CSS transitions (the computed transform is read back and divided by the viewport width):

\`\`\`text
start           : 1 / 5 · Sunrise · paused | -352px (-1.00 widths)
prev, mid-flight: 5 / 5 · Night sky · paused | -125px (-0.35 widths)
prev, settled   : 5 / 5 · Night sky · paused | -1760px (-5.00 widths)
next, settled   : 1 / 5 · Sunrise · paused | -352px (-1.00 widths)
drag -20px held : -372px (-1.06 widths)
released short  : 1 / 5 · Sunrise · paused | -352px (-1.00 widths)
swipe -100px    : 2 / 5 · Harbour · paused | -704px (-2.00 widths)
swipe +120px    : 1 / 5 · Sunrise · paused | -352px (-1.00 widths)
\`\`\`

Mid-flight, the track was travelling from \`-1\` towards the clone at \`0\`, not rewinding towards \`-5\`; once settled, the real \`transitionend\` had moved it to slot 5. The arrows still worked with pointer capture on the viewport. Not measured: real touch input (Playwright drove a mouse) and how the motion looks.

## 7. Edge Cases and Accessibility

| Case | Behaviour |
| :--- | :--- |
| Rapid Next clicks | Lock: only one move per transition |
| Reduced motion | No transition, fallback timer does the jump |
| Drag released outside the carousel | Pointer capture still delivers \`pointerup\` |
| Vertical scroll on a phone | \`touch-action: pan-y\` keeps it working |
| Tab hidden | Autoplay pauses via \`visibilitychange\` |
| Screen readers | Clones \`aria-hidden\` with empty \`alt\`; real slides "N of 5"; status live region quiet while rotating |
| Keyboard | Left / Right keys; pause on \`:focus-visible\` focus inside |

## 8. Common Pitfalls

- **Jumping without turning the transition off.** The user sees the track fly back across all slides, the exact thing clones were meant to hide.
- **Relying on \`transitionend\` alone.** It never fires with \`transition: none\` (reduced motion), so the lock never releases. Add a timeout fallback.
- **No transition lock.** Fast clicks push \`pos\` past the clones into blank space.
- **Not filtering \`transitionend\` by target.** A child transition bubbles the same event and triggers an early jump.
- **Pointer capture on the container swallowing button clicks.** Skip \`pointerdown\` that starts on a button.
- **Forgetting \`touch-action\`.** On touch devices the browser claims the gesture and sends \`pointercancel\` halfway through.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the problem:</strong> <span style="color:#f0e2c8;">"A modulo track rewinds visibly from the last slide to the first. I will put a clone of the last slide in front and a clone of the first at the end, so the track has n plus 2 slots."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The jump:</strong> <span style="color:#f0e2c8;">"Moves animate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pos</code>; on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transitionend</code>, or a fallback timeout for reduced motion, if we landed on a clone I switch the transition off and jump to the real twin, with a forced reflow in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useLayoutEffect</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The lock:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moving</code> ref ignores clicks while a transition runs, so fast clicks can never run past the clones."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Swipe:</strong> <span style="color:#f0e2c8;">"Pointer Events with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setPointerCapture</code>; the transform is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">calc(-pos * 100% + dx px)</code> with the transition off while dragging; release past 40px commits, else it springs back. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">touch-action: pan-y</code> keeps vertical scroll."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Autoplay and a11y:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code> is derived from playing, hover, keyboard focus, dragging and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.hidden</code>; clones are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-hidden</code> with empty alt so screen readers still count five slides."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add velocity, so a quick flick counts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Record the last few <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pointermove</code> timestamps and positions; on release compute pixels per millisecond and commit if it exceeds a threshold such as 0.5, even when the distance is below 40px.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes with peeking slides at 80% width?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You need as many clones on each side as slides that can be partly visible, the transform must centre the active slide (offset by half the leftover width), and the jump targets shift by the clone count.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use CSS scroll snap instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Scroll snap with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">scroll-snap-type: x mandatory</code> gives native swipe and momentum for free, and is a great answer for a non-looping carousel. Infinite looping still needs clones plus a silent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">scrollLeft</code> jump, and autoplay is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">scrollTo</code> with smooth behaviour.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop a drag from triggering a click on a link inside a slide?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track whether the pointer moved more than a few pixels; if so, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code> on the following <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">click</code> in the capture phase, or set a flag that the slide click handler checks.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the silent jump?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In jsdom, dispatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transitionend</code> on the track and assert the inline transform and that the transition is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">none</code>; also advance fake timers past the fallback without the event. Confirm the visual result in a real browser, as above.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Infinite carousel** | Always moves forward, wrapping without a visible rewind |
| **Cloned edge slides** | Copies of the last and first slides placed at the ends of the track |
| **Transition lock** | Ignore new moves while one is animating |
| **transitionend** | Event fired when a CSS transition finishes |
| **Forced reflow** | Reading layout to make the browser apply pending styles now |
| **Pointer Events** | One event family for mouse, pen and touch |
| **Pointer capture** | Route a pointer's later events to one element |
| **touch-action** | CSS telling the browser which touch gestures it may handle itself |

---
**Conclusion:** A seamless carousel is a basic carousel plus stage magic: put a clone at each end, animate onto the clone, and on \`transitionend\` (or a fallback timer) jump to the real twin with the transition switched off and a forced reflow. Lock moves while animating, drive the drag with Pointer Events and capture, commit past 40px, and pause autoplay for hover, keyboard focus, dragging and hidden tabs. Verified on React 19.3.1 in jsdom and with real transitions in Chromium 141, it never rewinds, ignores clicks mid-move, recovers without \`transitionend\`, and swipes both ways. For the fundamentals it builds on, see [the basic image carousel](/interview-question/build-an-image-carousel).`,
        files: {
          "/App.js": `import InfiniteCarousel from "./src/components/InfiniteCarousel";
import { slides } from "./src/data/slides";

export default function App() {
  return (
    <main className="app">
      <h1>Infinite carousel with swipe</h1>
      <InfiniteCarousel
        slides={slides}
        interval={3000}
        label="Featured photos"
      />
      <p className="hint">
        Drag or swipe the photo, use the arrows, dots or Left / Right keys. It
        never rewinds.
      </p>
    </main>
  );
}
`,
          "/src/components/InfiniteCarousel.js": `import { useEffect, useLayoutEffect, useRef, useState } from "react";

const DURATION = 400; // ms, must match the CSS transition below
const SWIPE_PX = 40; // drag distance that commits a slide change

export default function InfiniteCarousel({
  slides,
  interval = 3000,
  label = "Photos",
}) {
  const n = slides.length;
  // Track = [clone of last, ...slides, clone
  // of first]; pos 1..n are real slides.
  const track = [slides[n - 1], ...slides, slides[0]];
  const [pos, setPos] = useState(1);
  const [animate, setAnimate] = useState(true);
  const [dx, setDx] = useState(0); // live drag offset in px
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [playing, setPlaying] = useState(true);

  const trackRef = useRef(null);
  const moving = useRef(false); // true while a slide transition is running
  const fallback = useRef(0);
  const drag = useRef(null); // { startX, id }
  const posRef = useRef(pos);
  posRef.current = pos;

  const index = (pos - 1 + n) % n; // the real slide being shown
  const running = playing && !hovered && !focused && !hidden && !dragging;

  // After a jump made with the transition off, force a reflow so the browser
  // commits the new position before the transition is switched back on.
  useLayoutEffect(() => {
    if (!animate && trackRef.current) void trackRef.current.offsetWidth;
  }, [animate, pos]);

  function settle() {
    clearTimeout(fallback.current);
    moving.current = false;
    const p = posRef.current;
    if (p === n + 1 || p === 0) {
      setAnimate(false); // silent jump from a clone to its real twin
      setPos(p === 0 ? n : 1);
    }
  }

  function moveTo(next) {
    if (moving.current) return; // ignore clicks during a transition
    moving.current = true;
    setAnimate(true);
    setPos(next);
    // transitionend never fires with reduced motion or a cancelled transition.
    clearTimeout(fallback.current);
    fallback.current = setTimeout(settle, DURATION + 100);
  }
  const next = () => moveTo(posRef.current + 1);
  const prev = () => moveTo(posRef.current - 1);

  useEffect(() => () => clearTimeout(fallback.current), []);

  // Autoplay: one timeout per position, so any move restarts the countdown.
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(next, interval);
    return () => clearTimeout(id);
  }, [running, pos, interval]);

  // Pause when the tab is hidden.
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function onPointerDown(e) {
    // Arrow buttons sit inside the viewport: let their clicks through.
    if (e.target.closest("button") || moving.current || e.button !== 0) return;
    drag.current = { startX: e.clientX, id: e.pointerId };
    if (e.currentTarget.setPointerCapture)
      e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setAnimate(false); // the track follows the finger 1:1
  }
  function onPointerMove(e) {
    if (drag.current) setDx(e.clientX - drag.current.startX);
  }
  function onPointerUp(e) {
    if (!drag.current) return;
    const dist = e.clientX - drag.current.startX;
    drag.current = null;
    setDragging(false);
    setDx(0);
    if (dist <= -SWIPE_PX) next();
    else if (dist >= SWIPE_PX) prev();
    else setAnimate(true); // too short: spring back
  }

  function onKeyDown(e) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  }

  return (
    <section
      className="carousel"
      data-testid="carousel"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={(e) => {
        if (e.target.matches(":focus-visible")) setFocused(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      <div
        className="viewport"
        data-testid="viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={trackRef}
          className="track"
          data-testid="track"
          style={{
            transform: "translateX(calc(" + -pos * 100 + "% + " + dx + "px))",
            transition:
              animate && !dragging
                ? "transform " + DURATION + "ms ease"
                : "none",
          }}
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget) settle();
          }}
        >
          {track.map((s, i) => {
            const clone = i === 0 || i === n + 1;
            return (
              <div
                key={(clone ? "clone-" : "") + i}
                className="slide"
                role={clone ? undefined : "group"}
                aria-roledescription={clone ? undefined : "slide"}
                aria-label={clone ? undefined : i + " of " + n}
                aria-hidden={clone || i !== pos}
                data-clone={clone ? "true" : undefined}
              >
                <img src={s.src} alt={clone ? "" : s.alt} draggable={false} />
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="arrow prev"
          data-testid="prev"
          aria-label="Previous slide"
          onClick={prev}
        >
          ‹
        </button>
        <button
          type="button"
          className="arrow next"
          data-testid="next"
          aria-label="Next slide"
          onClick={next}
        >
          ›
        </button>
      </div>

      <div className="controls">
        <button
          type="button"
          data-testid="toggle"
          onClick={() => setPlaying((p) => !p)}
          aria-label={
            playing ? "Stop automatic slide show" : "Start automatic slide show"
          }
        >
          {playing ? "Pause" : "Play"}
        </button>
        <div className="dots">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="dot"
              data-testid="dot"
              aria-label={"Go to slide " + (i + 1)}
              aria-current={i === index ? "true" : undefined}
              onClick={() => moveTo(i + 1)}
            />
          ))}
        </div>
        <p
          className="status"
          data-testid="status"
          aria-live={running ? "off" : "polite"}
        >
          {index + 1} / {n} · {slides[index].alt} ·{" "}
          {running ? "auto" : "paused"}
        </p>
      </div>
    </section>
  );
}
`,
          "/src/data/slides.js": `// Offline slides: inline SVG data URLs, so the demo needs no network.
// Tiny markup helper: el("rect", { width: 9 }) gives <rect width="9"/>.
function el(tag, attrs, children) {
  const a = Object.keys(attrs)
    .map((k) => " " + k + '="' + attrs[k] + '"')
    .join("");
  return children
    ? "<" + tag + a + ">" + children.join("") + "</" + tag + ">"
    : "<" + tag + a + "/>";
}

function svgSlide(hue, title, n) {
  const svg = el(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 800,
      height: 450,
      viewBox: "0 0 800 450",
    },
    [
      el("defs", {}, [
        el("linearGradient", { id: "g", x1: 0, y1: 0, x2: 1, y2: 1 }, [
          el("stop", { offset: 0, "stop-color": "hsl(" + hue + ",70%,55%)" }),
          el("stop", {
            offset: 1,
            "stop-color": "hsl(" + (hue + 50) + ",65%,28%)",
          }),
        ]),
      ]),
      el("rect", { width: 800, height: 450, fill: "url(#g)" }),
      el("circle", {
        cx: 640,
        cy: 120,
        r: 70,
        fill: "hsla(" + (hue + 180) + ",80%,85%,0.55)",
      }),
      el("path", {
        d: "M0 450 L220 250 L360 370 L520 220 L800 450 Z",
        fill: "hsla(" + hue + ",40%,14%,0.7)",
      }),
      el(
        "text",
        {
          x: 40,
          y: 80,
          "font-family": "sans-serif",
          "font-size": 48,
          fill: "white",
        },
        [n + ". " + title],
      ),
    ],
  );
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const titles = ["Sunrise", "Harbour", "Pine ridge", "Red rocks", "Night sky"];

export const slides = titles.map((title, i) => ({
  id: i + 1,
  alt: title,
  src: svgSlide((i * 70 + 10) % 360, title, i + 1),
}));
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px;
}
h1 {
  font-size: 1.2rem;
}
.hint {
  color: #8a93a6;
  font-size: 0.85rem;
}
.carousel {
  border-radius: 12px;
  background: #181b22;
  padding: 8px;
  outline: none;
}
.carousel:focus-visible {
  box-shadow: 0 0 0 2px #7aa2ff;
}
.viewport {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  aspect-ratio: 16 / 9;
  touch-action: pan-y;
  cursor: grab;
  user-select: none;
}
.viewport:active {
  cursor: grabbing;
}
.track {
  display: flex;
  height: 100%;
  will-change: transform;
}
.slide {
  flex: 0 0 100%;
  height: 100%;
}
.slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
}
.arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 0;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}
.arrow:focus-visible,
.controls button:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.prev {
  left: 8px;
}
.next {
  right: 8px;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 10px 4px 2px;
}
.controls > button {
  background: #2a3142;
  color: #e6e6e6;
  border: 1px solid #3d4760;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
}
.dots {
  display: flex;
  gap: 6px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #8a93a6;
  background: transparent;
  padding: 0;
  cursor: pointer;
}
.dot[aria-current="true"] {
  background: #7aa2ff;
  border-color: #7aa2ff;
}
.status {
  margin: 0;
  margin-left: auto;
  color: #a8b3c7;
  font-size: 0.85rem;
}
@media (prefers-reduced-motion: reduce) {
  .track {
    transition: none !important;
  }
}
`,
        },
      },
      // ── vue ─────────────────────────────────────────────────────────
      vue: {
        answer: `**Target Audience:** Vue candidates who can build a basic carousel and now face the "make it loop forever and swipe" follow-up. Assumes \`<script setup>\`, \`ref\`, \`computed\` and \`watch\`.
**Difficulty:** Medium

> **How to read this doc:** Plain words first, then <code>📌 Interview term:</code> callouts. It builds on [the basic image carousel](/interview-question/build-an-image-carousel) (modulo wrap, timer cleanup, hover and \`:focus-visible\` pausing, carousel ARIA). The Verified output was produced on Vue 3.5.44 in jsdom and in headless Chromium 141.

## 1. A Story First

A merry-go-round never reverses through every horse to get back to horse 1; it just keeps turning. A basic carousel does reverse: from the last slide, Next flies backwards across all of them. The fix is a stage trick: place a copy of slide 1 after slide 5, slide forward onto the copy, and, the instant the animation ends, swap the copy for the real slide 1 with animation switched off. Both frames look identical, so nobody sees the swap. Add a finger drag that follows the touch and you have the native feel.

📌 **Interview term: Infinite (seamless) carousel** — a carousel that always moves in the direction of travel, built with cloned edge slides and a silent jump.

## 2. The Vue State Model

The track is a \`computed\` list, \`[last, ...slides, first]\`, and \`pos\` (1..n are real slides, 0 and n + 1 are clones) says which slot is on screen.

| Value | Vue tool | Why |
| :--- | :--- | :--- |
| \`pos\`, \`animate\`, \`dx\`, \`dragging\` | \`ref\` | Drive the track style |
| \`hovered\`, \`focused\`, \`hidden\`, \`playing\` | \`ref\` | Pause reasons |
| \`index\`, \`running\`, \`trackStyle\`, \`trackSlides\` | \`computed\` | Derived, never written |
| \`moving\`, \`drag\`, \`fallback\` | plain \`let\` | Bookkeeping that must not trigger renders |
| The track element | \`useTemplateRef("track")\` | For the forced reflow |

Keeping the lock and the drag start in plain variables is a Vue-specific choice worth saying out loud: a \`ref\` there would re-render the component on every pointer press for nothing.

## 3. Build It Step by Step

### Step 1: One computed style for rest, animation and drag

~~~js
const trackStyle = computed(() => ({
  transform:
    "translateX(calc(" + -pos.value * 100 + "% + " + dx.value + "px))",
  transition:
    animate.value && !dragging.value
      ? "transform " + DURATION + "ms ease"
      : "none",
}));
~~~

Clones render with \`aria-hidden="true"\`, no slide role and \`alt=""\`, so assistive technology still counts five slides.

### Step 2: Lock, move, settle

~~~js
function moveTo(next) {
  if (moving) return; // ignore clicks during a transition
  moving = true;
  animate.value = true;
  pos.value = next;
  clearTimeout(fallback);
  fallback = setTimeout(settle, DURATION + 100);
}

function settle() {
  clearTimeout(fallback);
  moving = false;
  if (pos.value === n.value + 1 || pos.value === 0) {
    animate.value = false; // silent jump from a clone to its real twin
    pos.value = pos.value === 0 ? n.value : 1;
  }
}
~~~

📌 **Interview term: Transition lock** — ignore new moves while one is animating, so fast clicks cannot run past the clones into blank space.

The template listens with \`@transitionend.self="settle"\`. The \`.self\` modifier only runs the handler when the event's target is the track itself, not a bubbling transition from a child, which is the same check React needs to write by hand. The timeout fallback covers the cases where \`transitionend\` never arrives, such as reduced motion (the CSS sets \`transition: none\`) or a cancelled transition.

### Step 3: Make the jump invisible

~~~js
watch(
  pos,
  () => {
    if (!animate.value && trackEl.value) void trackEl.value.offsetWidth;
  },
  { flush: "post" },
);
~~~

📌 **Interview term: \`flush: "post"\`** — runs the watcher after Vue has patched the DOM. Reading \`offsetWidth\` there forces a reflow, so the browser commits the jumped position before the next move switches the transition back on and cannot animate the jump.

### Step 4: Pointer swipe

~~~js
function onPointerdown(e) {
  // Arrow buttons sit inside the viewport: let their clicks through.
  if (e.target.closest("button") || moving || e.button !== 0) return;
  drag = { startX: e.clientX };
  if (e.currentTarget.setPointerCapture)
    e.currentTarget.setPointerCapture(e.pointerId);
  dragging.value = true;
  animate.value = false; // the track follows the finger 1:1
}
~~~

📌 **Interview term: Pointer capture** — \`setPointerCapture\` routes the rest of that pointer's events to the viewport, so a drag released outside still ends cleanly. The button check matters because capture would otherwise retarget the click away from the arrows.

\`@pointermove\` writes \`dx\`; \`@pointerup\` and \`@pointercancel\` commit to \`next()\` or \`prev()\` past 40px or spring back with \`animate.value = true\`. The viewport has \`touch-action: pan-y\`, so vertical page scrolling still works on phones.

### Step 5: Autoplay that knows about hidden tabs

~~~js
watch(
  [running, pos],
  ([isRunning], _old, onCleanup) => {
    if (!isRunning) return;
    const id = setTimeout(next, props.interval);
    onCleanup(() => clearTimeout(id));
  },
  { immediate: true },
);

const onVisibility = () => {
  hidden.value = document.hidden;
};
onMounted(() =>
  document.addEventListener("visibilitychange", onVisibility),
);
onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", onVisibility);
  clearTimeout(fallback);
});
~~~

\`running\` includes \`!hidden.value\` and \`!dragging.value\`, so a hidden tab or a finger on the photo pauses the countdown, and \`onCleanup\` clears it. Registering a \`document\` listener needs a matching removal in \`onBeforeUnmount\` ([lifecycle hooks](/interview-question/what-are-vue-lifecycle-hooks)); a [composable](/interview-question/what-are-composables-in-vue) such as \`usePageVisibility()\` is the natural way to reuse it.

## 4. Verified

Mounted in jsdom with \`createApp(App).mount("#app")\`. jsdom runs no CSS transitions, so the driver dispatches \`transitionend\` on the track by hand (once deliberately not, to test the fallback) and swipes with synthetic \`PointerEvent\`s; autoplay is paused first:

\`\`\`text
start     : 1 / 5 · Sunrise · auto | 7 slide nodes, 2 clones | translateX(calc(-100% + 0px)) / transform 400ms ease
prev      : 5 / 5 · Night sky · paused | translateX(calc(0% + 0px)) / transform 400ms ease
after end : 5 / 5 · Night sky · paused | translateX(calc(-500% + 0px)) / none
next (to clone): 1 / 5 · Sunrise · paused | translateX(calc(-600% + 0px)) / transform 400ms ease
2nd click while moving: 1 / 5 · Sunrise · paused | translateX(calc(-600% + 0px)) / transform 400ms ease
after end : 1 / 5 · Sunrise · paused | translateX(calc(-100% + 0px)) / none
ArrowLeft to clone, no transitionend: 5 / 5 · Night sky · paused | translateX(calc(0% + 0px)) / transform 400ms ease
600ms later (fallback timer): 5 / 5 · Night sky · paused | translateX(calc(-500% + 0px)) / none
drag -30px: 1 / 5 · Sunrise · paused | translateX(calc(-100% + -30px)) / none
release (short): 1 / 5 · Sunrise · paused | translateX(calc(-100% + 0px)) / transform 400ms ease
swipe -80px: 2 / 5 · Harbour · paused | translateX(calc(-200% + 0px)) / transform 400ms ease
swipe +90px: 1 / 5 · Sunrise · paused | translateX(calc(-100% + 0px)) / transform 400ms ease
tab hidden: 1 / 5 · Sunrise · paused
hidden 3.3s: 1 / 5 · Sunrise · paused
visible 3.3s: 2 / 5 · Harbour · auto | translateX(calc(-200% + 0px)) / transform 400ms ease
\`\`\`

(Trimmed to 15 of 20 lines; every line matched the React and Angular runs exactly.) In headless Chromium 141 with real transitions and a real mouse, Previous from slide 1 was caught mid-flight at -0.35 viewport widths, travelling towards the clone rather than rewinding, and settled at -5.00 after the real \`transitionend\`; a 20px drag sprang back and 100px / 120px drags committed. Real touch input was not tested.

## 5. Common Pitfalls

- **Making the lock a \`ref\`.** It works, but every press re-renders for a value the template never reads; a plain variable is enough.
- **\`@transitionend\` without \`.self\`.** A child transition bubbles and triggers an early jump.
- **Jumping with the transition still on**, or without the \`flush: "post"\` reflow, so the browser animates the jump.
- **No fallback timer.** Under reduced motion \`transitionend\` never fires and the carousel freezes on a clone.
- **Forgetting to remove the \`visibilitychange\` listener** on unmount.
- **Pointer capture swallowing arrow clicks.** Skip presses that start on a button.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Problem:</strong> <span style="color:#f0e2c8;">"A modulo track rewinds from the last slide to the first, so I add a clone at each end: a computed list of n plus 2 slides, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pos</code> from 0 to n plus 1."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Move and jump:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moveTo</code> sets a plain-variable lock and animates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pos</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@transitionend.self</code> or a fallback timeout settles, and on a clone I turn the transition off and jump to the real twin."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reflow:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pos</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flush: post</code> reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">offsetWidth</code> after the jump, so the browser commits the new position before the transition comes back."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Swipe:</strong> <span style="color:#f0e2c8;">"Pointer Events with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setPointerCapture</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">touch-action: pan-y</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dx</code> feeds the computed transform; past 40px commits, else spring back."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Autoplay:</strong> <span style="color:#f0e2c8;">"A watcher on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pos</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code> also requires not dragging and not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.hidden</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the lock a plain variable and not a ref?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing in the template reads it. A ref would trigger a re-render on every press and release for no visible change; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> is enough (one per instance; a module-level variable would be shared by every carousel on the page).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you extract the swipe logic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useSwipe(el, { threshold, onLeft, onRight })</code> composable that owns the pointer listeners and exposes a reactive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dx</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dragging</code>; the carousel only maps them to the transform.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.self</code> save you here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It makes the handler ignore <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transitionend</code> events that bubble from children, so only the track transition can trigger the silent jump.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support vertical carousels?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Swap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">translateX</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">translateY</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clientX</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clientY</code>, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">touch-action: pan-x</code> so horizontal page scroll stays native.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cloned edge slides** | Copies of the last and first slides at the ends of the track |
| **Transition lock** | Ignore moves while one is animating |
| **.self modifier** | Run the handler only when the event target is the element itself |
| **flush: "post"** | Run a watcher after the DOM is patched |
| **Pointer capture** | Route a pointer's later events to one element |
| **touch-action: pan-y** | Let the browser scroll vertically, leave horizontal gestures to the page |

---
**Conclusion:** In Vue the seamless carousel is a computed track with a clone at each end, a \`pos\` ref, one computed style that covers resting, animating and dragging, a plain-variable lock, \`@transitionend.self\` plus a fallback timer for the silent jump, a \`flush: "post"\` reflow, Pointer Events with capture, and a watcher-based autoplay that also pauses for dragging and hidden tabs. Verified on Vue 3.5.44, its output matches the React and Angular builds line for line, and Chromium confirmed the track never rewinds.`,
        files: {
          "/src/App.vue": `<script setup>
import InfiniteCarousel from "./components/InfiniteCarousel.vue";
import { slides } from "./data/slides.js";
</script>

<template>
  <main class="app">
    <h1>Infinite carousel with swipe</h1>
    <InfiniteCarousel
      :slides="slides"
      :interval="3000"
      label="Featured photos"
    />
    <p class="hint">Drag or swipe the photo, use the arrows, dots or Left / Right keys. It never rewinds.</p>
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px;
}
h1 {
  font-size: 1.2rem;
}
.hint {
  color: #8a93a6;
  font-size: 0.85rem;
}
</style>
`,
          "/src/components/InfiniteCarousel.vue": `<script setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  useTemplateRef,
} from "vue";

const props = defineProps({
  slides: { type: Array, required: true },
  interval: { type: Number, default: 3000 },
  label: { type: String, default: "Photos" },
});

const DURATION = 400; // ms, must match the transition below
const SWIPE_PX = 40; // drag distance that commits a slide change

const n = computed(() => props.slides.length);
// Track = [clone of last, ...slides, clone of first]; pos 1..n are real slides.
const trackSlides = computed(() => [
  props.slides[n.value - 1],
  ...props.slides,
  props.slides[0],
]);
const pos = ref(1);
const animate = ref(true);
const dx = ref(0); // live drag offset in px
const dragging = ref(false);
const hovered = ref(false);
const focused = ref(false);
const hidden = ref(false);
const playing = ref(true);

const index = computed(() => (pos.value - 1 + n.value) % n.value);
const running = computed(
  () =>
    playing.value &&
    !hovered.value &&
    !focused.value &&
    !hidden.value &&
    !dragging.value,
);
const trackStyle = computed(() => ({
  transform: "translateX(calc(" + -pos.value * 100 + "% + " + dx.value + "px))",
  transition:
    animate.value && !dragging.value
      ? "transform " + DURATION + "ms ease"
      : "none",
}));

const trackEl = useTemplateRef("track");
let moving = false; // plain variables: nothing renders from them
let fallback = 0;
let drag = null;

// After a jump made with the transition off, force a reflow so the browser
// commits the new position before the transition is switched back on.
watch(
  pos,
  () => {
    if (!animate.value && trackEl.value) void trackEl.value.offsetWidth;
  },
  { flush: "post" },
);

function settle() {
  clearTimeout(fallback);
  moving = false;
  if (pos.value === n.value + 1 || pos.value === 0) {
    animate.value = false; // silent jump from a clone to its real twin
    pos.value = pos.value === 0 ? n.value : 1;
  }
}

function moveTo(next) {
  if (moving) return; // ignore clicks during a transition
  moving = true;
  animate.value = true;
  pos.value = next;
  // transitionend never fires with reduced motion or a cancelled transition.
  clearTimeout(fallback);
  fallback = setTimeout(settle, DURATION + 100);
}
const next = () => moveTo(pos.value + 1);
const prev = () => moveTo(pos.value - 1);

// Autoplay: one timeout per position, so any move restarts the countdown.
watch(
  [running, pos],
  ([isRunning], _old, onCleanup) => {
    if (!isRunning) return;
    const id = setTimeout(next, props.interval);
    onCleanup(() => clearTimeout(id));
  },
  { immediate: true },
);

const onVisibility = () => {
  hidden.value = document.hidden;
};
onMounted(() => document.addEventListener("visibilitychange", onVisibility));
onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", onVisibility);
  clearTimeout(fallback);
});

function onPointerdown(e) {
  // Arrow buttons sit inside the viewport: let their clicks through.
  if (e.target.closest("button") || moving || e.button !== 0) return;
  drag = { startX: e.clientX };
  if (e.currentTarget.setPointerCapture)
    e.currentTarget.setPointerCapture(e.pointerId);
  dragging.value = true;
  animate.value = false; // the track follows the finger 1:1
}
function onPointermove(e) {
  if (drag) dx.value = e.clientX - drag.startX;
}
function onPointerup(e) {
  if (!drag) return;
  const dist = e.clientX - drag.startX;
  drag = null;
  dragging.value = false;
  dx.value = 0;
  if (dist <= -SWIPE_PX) next();
  else if (dist >= SWIPE_PX) prev();
  else animate.value = true; // too short: spring back
}

function onKeydown(e) {
  if (e.key === "ArrowRight") {
    e.preventDefault();
    next();
  }
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    prev();
  }
}
function onFocusin(e) {
  if (e.target.matches(":focus-visible")) focused.value = true;
}
function onFocusout(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) focused.value = false;
}
const isClone = (i) => i === 0 || i === n.value + 1;
</script>

<template>
  <section
    class="carousel"
    data-testid="carousel"
    aria-roledescription="carousel"
    :aria-label="label"
    tabindex="0"
    @keydown="onKeydown"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @focusin="onFocusin"
    @focusout="onFocusout"
  >
    <div
      class="viewport"
      data-testid="viewport"
      @pointerdown="onPointerdown"
      @pointermove="onPointermove"
      @pointerup="onPointerup"
      @pointercancel="onPointerup"
    >
      <div
        ref="track"
        class="track"
        data-testid="track"
        :style="trackStyle"
        @transitionend.self="settle"
      >
        <div
          v-for="(s, i) in trackSlides"
          :key="(isClone(i) ? 'clone-' : '') + i"
          class="slide"
          :role="isClone(i) ? undefined : 'group'"
          :aria-roledescription="isClone(i) ? undefined : 'slide'"
          :aria-label="isClone(i) ? undefined : i + ' of ' + n"
          :aria-hidden="isClone(i) || i !== pos"
          :data-clone="isClone(i) ? 'true' : undefined"
        >
          <img :src="s.src" :alt="isClone(i) ? '' : s.alt" draggable="false" />
        </div>
      </div>
      <button
        type="button"
        class="arrow prev"
        data-testid="prev"
        aria-label="Previous slide"
        @click="prev"
      >‹</button>
      <button
        type="button"
        class="arrow next"
        data-testid="next"
        aria-label="Next slide"
        @click="next"
      >›</button>
    </div>

    <div class="controls">
      <button type="button" data-testid="toggle" @click="playing = !playing"
        :aria-label="playing ? 'Stop automatic slide show' : 'Start automatic slide show'">
        {{ playing ? "Pause" : "Play" }}
      </button>
      <div class="dots">
        <button v-for="(s, i) in slides" :key="s.id" type="button" class="dot" data-testid="dot"
          :aria-label="'Go to slide ' + (i + 1)" :aria-current="i === index ? 'true' : undefined"
          @click="moveTo(i + 1)" />
      </div>
      <p
        class="status"
        data-testid="status"
        :aria-live="running ? 'off' : 'polite'"
      >
        {{ index + 1 }} / {{ n }} · {{ slides[index].alt }} · {{ running ? "auto" : "paused" }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.carousel {
  border-radius: 12px;
  background: #181b22;
  padding: 8px;
  outline: none;
}
.carousel:focus-visible {
  box-shadow: 0 0 0 2px #7aa2ff;
}
.viewport {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  aspect-ratio: 16 / 9;
  touch-action: pan-y;
  cursor: grab;
  user-select: none;
}
.viewport:active {
  cursor: grabbing;
}
.track {
  display: flex;
  height: 100%;
  will-change: transform;
}
.slide {
  flex: 0 0 100%;
  height: 100%;
}
.slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
}
.arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 0;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}
.arrow:focus-visible,
.controls button:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.prev {
  left: 8px;
}
.next {
  right: 8px;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 10px 4px 2px;
}
.controls > button {
  background: #2a3142;
  color: #e6e6e6;
  border: 1px solid #3d4760;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
}
.dots {
  display: flex;
  gap: 6px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #8a93a6;
  background: transparent;
  padding: 0;
  cursor: pointer;
}
.dot[aria-current="true"] {
  background: #7aa2ff;
  border-color: #7aa2ff;
}
.status {
  margin: 0;
  margin-left: auto;
  color: #a8b3c7;
  font-size: 0.85rem;
}
@media (prefers-reduced-motion: reduce) {
  .track {
    transition: none !important;
  }
}
</style>
`,
          "/src/data/slides.js": `// Offline slides: inline SVG data URLs, so the demo needs no network.
// Tiny markup helper: el("rect", { width: 9 }) gives <rect width="9"/>.
function el(tag, attrs, children) {
  const a = Object.keys(attrs)
    .map((k) => " " + k + '="' + attrs[k] + '"')
    .join("");
  return children
    ? "<" + tag + a + ">" + children.join("") + "</" + tag + ">"
    : "<" + tag + a + "/>";
}

function svgSlide(hue, title, n) {
  const svg = el(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 800,
      height: 450,
      viewBox: "0 0 800 450",
    },
    [
      el("defs", {}, [
        el("linearGradient", { id: "g", x1: 0, y1: 0, x2: 1, y2: 1 }, [
          el("stop", { offset: 0, "stop-color": "hsl(" + hue + ",70%,55%)" }),
          el("stop", {
            offset: 1,
            "stop-color": "hsl(" + (hue + 50) + ",65%,28%)",
          }),
        ]),
      ]),
      el("rect", { width: 800, height: 450, fill: "url(#g)" }),
      el("circle", {
        cx: 640,
        cy: 120,
        r: 70,
        fill: "hsla(" + (hue + 180) + ",80%,85%,0.55)",
      }),
      el("path", {
        d: "M0 450 L220 250 L360 370 L520 220 L800 450 Z",
        fill: "hsla(" + hue + ",40%,14%,0.7)",
      }),
      el(
        "text",
        {
          x: 40,
          y: 80,
          "font-family": "sans-serif",
          "font-size": 48,
          fill: "white",
        },
        [n + ". " + title],
      ),
    ],
  );
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const titles = ["Sunrise", "Harbour", "Pine ridge", "Red rocks", "Night sky"];

export const slides = titles.map((title, i) => ({
  id: i + 1,
  alt: title,
  src: svgSlide((i * 70 + 10) % 360, title, i + 1),
}));
`,
        },
      },
      // ── angular ─────────────────────────────────────────────────────
      angular: {
        answer: `**Target Audience:** Angular candidates who can build a basic carousel and now need a seamless loop and touch swipe. Assumes standalone components; signals, effects and render hooks are explained as they come up.
**Difficulty:** Medium

> **How to read this doc:** Plain words first, then <code>📌 Interview term:</code> callouts. It builds on [the basic image carousel](/interview-question/build-an-image-carousel) (modulo wrap, effect-based autoplay, \`:focus-visible\` pausing, carousel ARIA). The Verified output comes from Angular 22.2.3 under AOT and runtime JIT in jsdom, and from headless Chromium 141.

## 1. A Story First

A merry-go-round keeps turning in one direction; it never reverses through every horse to get back to horse 1. A basic carousel does: from slide 5, Next flies backwards over all slides. The trick is a copy of slide 1 placed after slide 5. Slide forward onto the copy, and the moment the animation ends, swap it for the real slide 1 with animation off. Identical frames, invisible swap. Add a finger drag that follows the touch, and it feels native.

📌 **Interview term: Infinite (seamless) carousel** — always moves in the direction of travel, using cloned edge slides and a silent jump.

## 2. The Angular State Model

| Value | Angular tool | Why |
| :--- | :--- | :--- |
| \`pos\`, \`animate\`, \`dx\`, \`dragging\` | \`signal\` | Drive the track bindings |
| \`hovered\`, \`focused\`, \`hidden\`, \`playing\` | \`signal\` | Pause reasons |
| \`index\`, \`running\`, \`transform\`, \`transition\` | \`computed\` | Derived, never written |
| \`trackSlides\` | \`signal\`, filled in \`ngOnInit\` | \`[last, ...slides, first]\`, once inputs are set |
| \`moving\`, \`drag\`, \`fallback\` | private fields | Bookkeeping the template never reads |
| Autoplay | \`effect()\` with \`onCleanup\` | Restarts per position |
| Reflow after a jump | \`afterRenderEffect()\` | Must run after the DOM is updated |

\`trackSlides\` is built in \`ngOnInit\` because \`@Input()\` values are not available in the constructor. In a CLI app with signal \`input()\` it would simply be a \`computed\`, but signal inputs do not register under the playground runtime JIT ([input() vs @Input()](/interview-question/signal-inputs-input-vs-input-what-changes-in-angular-17-1)).

## 3. Build It Step by Step

### Step 1: Bindings for rest, animation and drag

~~~ts
readonly transform = computed(
  () =>
    "translateX(calc(" +
    -this.pos() * 100 +
    "% + " +
    this.dx() +
    "px))",
);
readonly transition = computed(() =>
  this.animate() && !this.dragging()
    ? "transform " + DURATION + "ms ease"
    : "none",
);
~~~

~~~html
<div
  #track
  class="track"
  [style.transform]="transform()"
  [style.transition]="transition()"
  (transitionend)="onTransitionEnd($event)"
>
  @for (s of trackSlides(); track $index; let i = $index) {
    <div
      class="slide"
      [attr.role]="isClone(i) ? null : 'group'"
      [attr.aria-hidden]="isClone(i) || i !== pos()"
    >
      ...
    </div>
  }
</div>
~~~

Clones bind \`null\` for role and label (which removes the attribute) and \`alt=""\`, so screen readers count five slides. The clones are the same objects as real slides, so this \`@for\` tracks by \`$index\`: tracking by \`s.id\` would give two items the same key.

### Step 2: Lock, move, settle

~~~ts
moveTo(next: number): void {
  if (this.moving) return; // ignore clicks during a transition
  this.moving = true;
  this.animate.set(true);
  this.pos.set(next);
  clearTimeout(this.fallback);
  this.fallback = setTimeout(() => this.settle(), DURATION + 100);
}

settle(): void {
  clearTimeout(this.fallback);
  this.moving = false;
  const p = this.pos();
  const n = this.slides.length;
  if (p === n + 1 || p === 0) {
    // silent jump from a clone to its real twin
    this.animate.set(false);
    this.pos.set(p === 0 ? n : 1);
  }
}
~~~

📌 **Interview term: Transition lock** — ignore moves while one is animating, so fast clicks cannot run past the clones.

\`onTransitionEnd\` only calls \`settle()\` when \`e.target === e.currentTarget\`, ignoring transitions that bubble from children. The fallback timer covers reduced motion, where the CSS sets \`transition: none\` and no \`transitionend\` ever fires.

### Step 3: Force a reflow after the DOM updates

~~~ts
afterRenderEffect(() => {
  this.pos();
  if (!this.animate()) void this.trackEl.nativeElement.offsetWidth;
});
~~~

📌 **Interview term: \`afterRenderEffect()\`** — an effect that runs after Angular has rendered, when the DOM reflects the latest signals. Reading \`offsetWidth\` there forces the browser to commit the jumped position before the next move turns the transition back on. A plain \`effect()\` would be the wrong tool: it may run before the view is updated ([afterRender vs afterNextRender vs ngAfterViewInit](/interview-question/afterrender-vs-afternextrender-vs-ngafterviewinit-which-to-use)).

### Step 4: Pointer swipe

~~~ts
onPointerdown(e: PointerEvent): void {
  // Arrow buttons sit inside the viewport: let their clicks through.
  if (
    (e.target as HTMLElement).closest("button") ||
    this.moving ||
    e.button !== 0
  )
    return;
  this.drag = { startX: e.clientX };
  const el = e.currentTarget as HTMLElement;
  if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
  this.dragging.set(true);
  this.animate.set(false); // the track follows the finger 1:1
}
~~~

📌 **Interview term: Pointer capture** — routes the rest of a pointer's events to one element, so a drag released outside still ends. Skipping presses on the arrow buttons keeps their clicks working.

\`(pointermove)\` sets \`dx\`; \`(pointerup)\` and \`(pointercancel)\` commit past 40px or spring back. \`touch-action: pan-y\` on the viewport keeps vertical page scroll native on phones.

### Step 5: Autoplay with hidden-tab pause

~~~ts
effect((onCleanup) => {
  if (!this.running()) return;
  this.pos();
  const id = setTimeout(() => this.next(), this.interval);
  onCleanup(() => clearTimeout(id));
});
~~~

The section binds \`(document:visibilitychange)="hidden.set(doc.hidden)"\`: a global event target in a template binding, which Angular removes when the component is destroyed, so there is no manual cleanup ([@HostListener and global targets](/interview-question/what-do-hostlistener-and-hostbinding-do)). \`running\` requires not hovered, not focused, not hidden, not dragging and \`playing\`.

## 4. Verified

Booted in jsdom under AOT (\`ngc\`, \`strictTemplates\`) and runtime JIT; both printed identical lines, matching the React and Vue runs exactly. The driver dispatches \`transitionend\` by hand (once not at all, to test the fallback) and swipes with synthetic \`PointerEvent\`s:

\`\`\`text
start     : 1 / 5 · Sunrise · auto | 7 slide nodes, 2 clones | translateX(calc(-100% + 0px)) / transform 400ms ease
prev      : 5 / 5 · Night sky · paused | translateX(calc(0% + 0px)) / transform 400ms ease
after end : 5 / 5 · Night sky · paused | translateX(calc(-500% + 0px)) / none
2nd click while moving: 1 / 5 · Sunrise · paused | translateX(calc(-600% + 0px)) / transform 400ms ease
ArrowLeft to clone, no transitionend: 5 / 5 · Night sky · paused | translateX(calc(0% + 0px)) / transform 400ms ease
600ms later (fallback timer): 5 / 5 · Night sky · paused | translateX(calc(-500% + 0px)) / none
drag -30px: 1 / 5 · Sunrise · paused | translateX(calc(-100% + -30px)) / none
swipe -80px: 2 / 5 · Harbour · paused | translateX(calc(-200% + 0px)) / transform 400ms ease
tab hidden: 1 / 5 · Sunrise · paused
visible 3.3s: 2 / 5 · Harbour · auto | translateX(calc(-200% + 0px)) / transform 400ms ease
\`\`\`

(Trimmed to 10 of 20 lines.) In headless Chromium 141, without Zone.js, Previous was caught mid-flight at -0.42 viewport widths heading to the clone and settled at -5.00; drags of 20px sprang back and of 100px and 120px committed. The first browser run reported a failed swipe; the cause was the test pressing at x = 300 on a 336px-wide viewport, which is on the Next button, so the press was correctly ignored. Real touch input was not tested.

## 5. Common Pitfalls

- **Tracking the clone list by \`s.id\`.** Clones share ids with their twins; track \`$index\` here.
- **Using \`effect()\` for DOM measurement.** Use \`afterRenderEffect()\` so the DOM is already updated.
- **Building clones in the constructor.** \`@Input()\` values arrive later; use \`ngOnInit\` (or a \`computed\` over signal inputs in a CLI app).
- **Plain fields for anything the template reads.** Without Zone.js only signals schedule a re-render from timers and pointer handlers.
- **No fallback for \`transitionend\`.** Under reduced motion it never fires and the lock never releases.
- **Pointer capture swallowing arrow clicks.** Skip presses that start on a button.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Problem:</strong> <span style="color:#f0e2c8;">"A modulo track rewinds, so I build <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[last, ...slides, first]</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code> and keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pos</code> signal from 0 to n plus 1."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Move and jump:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moveTo</code> sets a private lock and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pos</code> signal; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transitionend</code> on the track, or a fallback timer, settles, and on a clone it turns the transition off and jumps to the real twin."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reflow:</strong> <span style="color:#f0e2c8;">"An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterRenderEffect</code> reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">offsetWidth</code> after the jump, once the DOM is updated, so the browser cannot animate it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Swipe:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(pointerdown)</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setPointerCapture</code> unless the press is on a button, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dx</code> feeds a computed transform, release past 40px commits; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">touch-action: pan-y</code> keeps page scroll."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Autoplay:</strong> <span style="color:#f0e2c8;">"An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect()</code> reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pos()</code> and clears its timeout in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code> also requires not dragging and not hidden, via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(document:visibilitychange)</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">afterRenderEffect</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">effect</code> for the reflow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A component <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> can run during change detection before the template bindings are applied. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterRenderEffect</code> runs after rendering, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">offsetWidth</code> reflects the jumped transform.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could the Angular CDK help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with the loop itself, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@angular/cdk/a11y</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LiveAnnouncer</code> for slide announcements and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FocusMonitor</code>, which tells you whether focus came from keyboard, mouse or touch instead of checking <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:focus-visible</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you animate with Angular animations instead of CSS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You could, but CSS transitions on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transform</code> are simpler and composited. The loop trick is the same either way: animate to the clone, then jump with no animation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the swipe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Dispatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PointerEvent</code>s with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clientX</code> on the viewport, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code> and assert the status text and transform; dispatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transitionend</code> on the track to settle a move onto a clone.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cloned edge slides** | Copies of the last and first slides at the ends of the track |
| **Transition lock** | Ignore moves while one is animating |
| **afterRenderEffect** | Effect that runs after Angular has updated the DOM |
| **Forced reflow** | Reading layout so the browser applies pending styles now |
| **Pointer capture** | Route a pointer's later events to one element |
| **(document:event)** | Template listener on a global target, removed on destroy |

---
**Conclusion:** In Angular the seamless carousel is a \`pos\` signal over a track with a clone at each end, computed \`transform\` and \`transition\` strings, a private-field lock, \`transitionend\` plus a fallback timer for the silent jump, an \`afterRenderEffect\` that forces the reflow, Pointer Events with capture, and an \`effect()\` autoplay that pauses for hover, keyboard focus, dragging and hidden tabs. Verified on Angular 22.2.3 under AOT and JIT, it matches the React and Vue builds line for line, and Chromium confirmed it never rewinds.`,
        files: {
          "/src/app/app.component.ts": `import { Component } from "@angular/core";
import { InfiniteCarouselComponent } from "./components/infinite-carousel.component";
import { slides } from "./data/slides";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [InfiniteCarouselComponent],
  template: \`
    <main class="app">
      <h1>Infinite carousel with swipe</h1>
      <app-infinite-carousel
        [slides]="slides"
        [interval]="3000"
        label="Featured photos"
      />
      <p class="hint">Drag or swipe the photo, use the arrows, dots or Left / Right keys. It never rewinds.</p>
    </main>
  \`,
  styles: [
    \`
    :host { display: block; min-height: 100vh; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
    .app { max-width: 720px; margin: 0 auto; padding: 16px; }
    h1 { font-size: 1.2rem; }
    .hint { color: #8a93a6; font-size: 0.85rem; }
  \`,
  ],
})
export class AppComponent {
  readonly slides = slides;
}
`,
          "/src/app/components/infinite-carousel.component.ts": `import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  afterRenderEffect,
  computed,
  effect,
  signal,
} from "@angular/core";
import { Slide } from "../data/slides";

const DURATION = 400; // ms, must match the transition below
const SWIPE_PX = 40; // drag distance that commits a slide change

@Component({
  selector: "app-infinite-carousel",
  standalone: true,
  template: \`
    <section
      class="carousel"
      data-testid="carousel"
      aria-roledescription="carousel"
      [attr.aria-label]="label"
      tabindex="0"
      (keydown)="onKeydown($event)"
      (mouseenter)="hovered.set(true)"
      (mouseleave)="hovered.set(false)"
      (focusin)="onFocusin($event)"
      (focusout)="onFocusout($event)"
      (document:visibilitychange)="hidden.set(doc.hidden)"
    >
      <div
        class="viewport"
        data-testid="viewport"
        (pointerdown)="onPointerdown($event)"
        (pointermove)="onPointermove($event)"
        (pointerup)="onPointerup($event)"
        (pointercancel)="onPointerup($event)"
      >
        <div
          #track
          class="track"
          data-testid="track"
          [style.transform]="transform()"
          [style.transition]="transition()"
          (transitionend)="onTransitionEnd($event)"
        >
          @for (s of trackSlides(); track $index; let i = $index) {
            <div
              class="slide"
              [attr.role]="isClone(i) ? null : 'group'"
              [attr.aria-roledescription]="isClone(i) ? null : 'slide'"
              [attr.aria-label]="isClone(i) ? null : i + ' of ' + slides.length"
              [attr.aria-hidden]="isClone(i) || i !== pos()"
              [attr.data-clone]="isClone(i) ? 'true' : null"
            >
              <img
                [src]="s.src"
                [alt]="isClone(i) ? '' : s.alt"
                draggable="false"
              />
            </div>
          }
        </div>
        <button
          type="button"
          class="arrow prev"
          data-testid="prev"
          aria-label="Previous slide"
          (click)="prev()"
        >‹</button>
        <button
          type="button"
          class="arrow next"
          data-testid="next"
          aria-label="Next slide"
          (click)="next()"
        >›</button>
      </div>

      <div class="controls">
        <button type="button" data-testid="toggle" (click)="playing.set(!playing())"
          [attr.aria-label]="playing() ? 'Stop automatic slide show' : 'Start automatic slide show'">
          {{ playing() ? "Pause" : "Play" }}
        </button>
        <div class="dots">
          @for (s of slides; track s.id; let i = $index) {
            <button type="button" class="dot" data-testid="dot"
              [attr.aria-label]="'Go to slide ' + (i + 1)" [attr.aria-current]="i === index() ? 'true' : null"
              (click)="moveTo(i + 1)"></button>
          }
        </div>
        <p
          class="status"
          data-testid="status"
          [attr.aria-live]="running() ? 'off' : 'polite'"
        >
          {{ index() + 1 }} / {{ slides.length }} · {{ slides[index()].alt }} · {{ running() ? "auto" : "paused" }}
        </p>
      </div>
    </section>
  \`,
  styles: [
    \`
    .carousel { border-radius: 12px; background: #181b22; padding: 8px; outline: none; }
    .carousel:focus-visible { box-shadow: 0 0 0 2px #7aa2ff; }
    .viewport { position: relative; overflow: hidden; border-radius: 8px; aspect-ratio: 16 / 9; touch-action: pan-y; cursor: grab; user-select: none; }
    .viewport:active { cursor: grabbing; }
    .track { display: flex; height: 100%; will-change: transform; }
    .slide { flex: 0 0 100%; height: 100%; }
    .slide img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
    .arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; border-radius: 50%; border: 0; background: rgba(0, 0, 0, 0.55); color: #fff; font-size: 24px; line-height: 1; cursor: pointer; }
    .arrow:focus-visible, .controls button:focus-visible { outline: 2px solid #7aa2ff; outline-offset: 2px; }
    .prev { left: 8px; }
    .next { right: 8px; }
    .controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 10px 4px 2px; }
    .controls > button { background: #2a3142; color: #e6e6e6; border: 1px solid #3d4760; border-radius: 6px; padding: 4px 10px; cursor: pointer; }
    .dots { display: flex; gap: 6px; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid #8a93a6; background: transparent; padding: 0; cursor: pointer; }
    .dot[aria-current="true"] { background: #7aa2ff; border-color: #7aa2ff; }
    .status { margin: 0; margin-left: auto; color: #a8b3c7; font-size: 0.85rem; }
    @media (prefers-reduced-motion: reduce) { .track { transition: none !important; } }
  \`,
  ],
})
export class InfiniteCarouselComponent implements OnInit, OnDestroy {
  @Input({ required: true }) slides: Slide[] = [];
  @Input() interval = 3000;
  @Input() label = "Photos";
  @ViewChild("track", { static: true }) trackEl!: ElementRef<HTMLDivElement>;

  readonly doc = document;
  // Track = [clone of last, ...slides, clone
  // of first]; pos 1..n are real slides.
  readonly pos = signal(1);
  readonly animate = signal(true);
  readonly dx = signal(0); // live drag offset in px
  readonly dragging = signal(false);
  readonly hovered = signal(false);
  readonly focused = signal(false);
  readonly hidden = signal(false);
  readonly playing = signal(true);

  readonly trackSlides = signal<Slide[]>([]);
  readonly index = computed(
    () => (this.pos() - 1 + this.slides.length) % this.slides.length,
  );
  readonly running = computed(
    () =>
      this.playing() &&
      !this.hovered() &&
      !this.focused() &&
      !this.hidden() &&
      !this.dragging(),
  );
  readonly transform = computed(
    () => "translateX(calc(" + -this.pos() * 100 + "% + " + this.dx() + "px))",
  );
  readonly transition = computed(() =>
    this.animate() && !this.dragging()
      ? "transform " + DURATION + "ms ease"
      : "none",
  );

  private moving = false; // plain fields: nothing renders from them
  private fallback: ReturnType<typeof setTimeout> | undefined;
  private drag: { startX: number } | null = null;

  constructor() {
    // Autoplay: one timeout per position, so any move restarts the countdown.
    effect((onCleanup) => {
      if (!this.running()) return;
      this.pos();
      const id = setTimeout(() => this.next(), this.interval);
      onCleanup(() => clearTimeout(id));
    });
    // After a jump made with the transition off, force a reflow so the browser
    // commits the new position before the transition is switched back on.
    afterRenderEffect(() => {
      this.pos();
      if (!this.animate()) void this.trackEl.nativeElement.offsetWidth;
    });
  }

  ngOnInit(): void {
    const n = this.slides.length;
    this.trackSlides.set([this.slides[n - 1], ...this.slides, this.slides[0]]);
  }

  ngOnDestroy(): void {
    clearTimeout(this.fallback);
  }

  isClone(i: number): boolean {
    return i === 0 || i === this.slides.length + 1;
  }

  settle(): void {
    clearTimeout(this.fallback);
    this.moving = false;
    const p = this.pos();
    const n = this.slides.length;
    if (p === n + 1 || p === 0) {
      this.animate.set(false); // silent jump from a clone to its real twin
      this.pos.set(p === 0 ? n : 1);
    }
  }

  moveTo(next: number): void {
    if (this.moving) return; // ignore clicks during a transition
    this.moving = true;
    this.animate.set(true);
    this.pos.set(next);
    // transitionend never fires with reduced motion or a cancelled transition.
    clearTimeout(this.fallback);
    this.fallback = setTimeout(() => this.settle(), DURATION + 100);
  }
  next(): void {
    this.moveTo(this.pos() + 1);
  }
  prev(): void {
    this.moveTo(this.pos() - 1);
  }

  onTransitionEnd(e: Event): void {
    if (e.target === e.currentTarget) this.settle();
  }

  onPointerdown(e: PointerEvent): void {
    // Arrow buttons sit inside the viewport: let their clicks through.
    if (
      (e.target as HTMLElement).closest("button") ||
      this.moving ||
      e.button !== 0
    )
      return;
    this.drag = { startX: e.clientX };
    const el = e.currentTarget as HTMLElement;
    if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
    this.dragging.set(true);
    this.animate.set(false); // the track follows the finger 1:1
  }
  onPointermove(e: PointerEvent): void {
    if (this.drag) this.dx.set(e.clientX - this.drag.startX);
  }
  onPointerup(e: PointerEvent): void {
    if (!this.drag) return;
    const dist = e.clientX - this.drag.startX;
    this.drag = null;
    this.dragging.set(false);
    this.dx.set(0);
    if (dist <= -SWIPE_PX) this.next();
    else if (dist >= SWIPE_PX) this.prev();
    else this.animate.set(true); // too short: spring back
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      this.next();
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      this.prev();
    }
  }
  onFocusin(e: FocusEvent): void {
    if ((e.target as HTMLElement).matches(":focus-visible"))
      this.focused.set(true);
  }
  onFocusout(e: FocusEvent): void {
    if (
      !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)
    )
      this.focused.set(false);
  }
}
`,
          "/src/app/data/slides.ts": `// Offline slides: inline SVG data URLs, so the demo needs no network.
// Tiny markup helper: el("rect", { width: 9 }) gives <rect width="9"/>.
function el(
  tag: string,
  attrs: Record<string, string | number>,
  children?: string[],
): string {
  const a = Object.keys(attrs)
    .map((k) => " " + k + '="' + attrs[k] + '"')
    .join("");
  return children
    ? "<" + tag + a + ">" + children.join("") + "</" + tag + ">"
    : "<" + tag + a + "/>";
}

function svgSlide(hue: number, title: string, n: number): string {
  const svg = el(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 800,
      height: 450,
      viewBox: "0 0 800 450",
    },
    [
      el("defs", {}, [
        el("linearGradient", { id: "g", x1: 0, y1: 0, x2: 1, y2: 1 }, [
          el("stop", { offset: 0, "stop-color": "hsl(" + hue + ",70%,55%)" }),
          el("stop", {
            offset: 1,
            "stop-color": "hsl(" + (hue + 50) + ",65%,28%)",
          }),
        ]),
      ]),
      el("rect", { width: 800, height: 450, fill: "url(#g)" }),
      el("circle", {
        cx: 640,
        cy: 120,
        r: 70,
        fill: "hsla(" + (hue + 180) + ",80%,85%,0.55)",
      }),
      el("path", {
        d: "M0 450 L220 250 L360 370 L520 220 L800 450 Z",
        fill: "hsla(" + hue + ",40%,14%,0.7)",
      }),
      el(
        "text",
        {
          x: 40,
          y: 80,
          "font-family": "sans-serif",
          "font-size": 48,
          fill: "white",
        },
        [n + ". " + title],
      ),
    ],
  );
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const titles = ["Sunrise", "Harbour", "Pine ridge", "Red rocks", "Night sky"];

export interface Slide {
  id: number;
  alt: string;
  src: string;
}

export const slides: Slide[] = titles.map((title, i) => ({
  id: i + 1,
  alt: title,
  src: svgSlide((i * 70 + 10) % 360, title, i + 1),
}));
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build an Image Gallery with lightbox",
    seoDescription:
      "Build an image gallery with a lightbox in React, Vue and Angular: grid, dialog with prev/next, keys, focus trap and return, scroll lock, preloading.",
    description: `**Question presented to candidate:**
"Build a photo gallery page: a responsive grid of thumbnails, and clicking one opens it full screen in a lightbox. In the lightbox the user can go to the previous or next photo, use the arrow keys, see a caption and a '3 / 9' counter, and close it with Escape, a close button or a click on the dark background. It must be usable with a keyboard and a screen reader."

**Requirements:**
- A CSS grid of thumbnail buttons that reflows from one column on a phone to many on a desktop.
- A lightbox overlay with the large photo, caption, counter, previous / next (wrapping) and close.
- Keys inside the lightbox: Left / Right, Escape, and Tab that stays inside the dialog.
- Opening moves focus into the dialog; closing returns focus to the thumbnail that opened it.
- The page behind does not scroll while the lightbox is open; neighbouring photos are preloaded.

**What a strong answer should cover:**
- One piece of shared state, the open index (or \`null\` for closed), owned by the gallery and passed to the lightbox: a controlled component.
- Dialog semantics: \`role="dialog"\`, \`aria-modal="true"\`, \`aria-labelledby\` pointing at the caption.
- Focus management: initial focus, a focus trap for Tab and Shift+Tab, and focus restore on close.
- Scroll lock that saves and restores the previous \`body\` overflow, and cleanup on unmount.
- Rendering the overlay at the end of \`body\` (portal / Teleport) or an equivalent, and why stacking contexts make that useful.
- Preloading neighbours with \`new Image()\` and lazy-loading thumbnails.

**Clarifying questions expected:**
- "Should the browser Back button close the lightbox (URL state), and should a photo be linkable?"
- "Do we need swipe or pinch-zoom on touch devices?"
- "Can we use the native \`<dialog>\` element, or must it support older browsers?"

**Code / implementation expected:** Yes. A gallery and lightbox component with keyboard support, focus trap and restore, scroll lock and wrap-around navigation.`,
    frameworks: {
      // ── react ───────────────────────────────────────────────────────
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. Assumes basic React (\`useState\`, props, refs); dialogs, focus management and portals are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain words, then tagged with <code>📌 Interview term:</code> so you learn the vocabulary an interviewer expects. The output in section 6 was produced by running the solution on React 19.3.1 in jsdom and in headless Chromium 141.

## 1. Why This Even Matters — A Story First

Picture a museum. The gallery wall holds small framed prints; when something catches your eye, a guide takes you into a quiet viewing room with the full-size piece, a label, and doors to the previous and next rooms. When you leave, the guide walks you back to the exact print you came from, not to the museum entrance.

A lightbox is that viewing room. The grid is the wall. The hard parts are the guide's manners: take the visitor in (move focus into the dialog), keep them in the room until they choose to leave (focus trap, scroll lock), let them walk to the neighbouring rooms (previous / next), and bring them back to where they were (focus restore). Get those wrong and a keyboard user is stranded behind a dark overlay, or dropped back at the top of the page.

📌 **Interview term: Lightbox** — a modal overlay that shows one item of a collection large, dimming the page behind it, usually with navigation between items.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Should Back close the lightbox, and should each photo have a URL? | Then the open index lives in the URL (\`?photo=3\`) instead of component state. |
| Native \`<dialog>\` allowed? | \`showModal()\` gives you top layer, inert background and Escape for free; the custom build shows you understand what it does. |
| Touch: swipe, pinch-zoom? | Swipe reuses carousel pointer logic; pinch-zoom is a separate feature. |
| How many photos, and how big? | Hundreds of thumbnails need lazy loading or virtualisation; huge originals need \`srcset\`. |
| Is the caption from data, and is there alt text? | Each photo needs a real \`alt\`; the caption becomes the dialog's accessible name. |
| Where does focus go on close if the thumbnail is gone? | For example after filtering; you need a fallback target. |

## 3. Requirements and Plan

**Component tree:** \`App\` → \`Gallery\` (grid of thumbnail buttons, owns the open index) → \`Lightbox\` (portal into \`document.body\`). Nine offline SVG photos come from \`photos.js\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="Gallery owns openIndex and passes it to Lightbox as index; Lightbox asks to change it through onIndexChange and onClose; the Lightbox renders through a portal into document body">
  <defs>
    <marker id="gbr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="70" width="210" height="80" rx="10"/>
  <text class="d-text" x="125" y="102" text-anchor="middle">Gallery</text>
  <text class="d-sub" x="125" y="126" text-anchor="middle">openIndex, opener ref</text>
  <rect class="d-box-accent" x="440" y="70" width="230" height="80" rx="10"/>
  <text class="d-text d-accent" x="555" y="102" text-anchor="middle">Lightbox</text>
  <text class="d-sub" x="555" y="126" text-anchor="middle">controlled, no own index</text>
  <path class="d-edge-accent" d="M 230 92 L 432 92" marker-end="url(#gbr-arrow)"/>
  <text class="d-sub" x="331" y="78" text-anchor="middle">index, items</text>
  <path class="d-edge-dashed" d="M 440 130 L 238 130" marker-end="url(#gbr-arrow)"/>
  <text class="d-sub" x="339" y="152" text-anchor="middle">onIndexChange, onClose</text>
  <rect class="d-box-muted" x="440" y="180" width="230" height="40" rx="8"/>
  <text class="d-sub" x="555" y="205" text-anchor="middle">portal into document.body</text>
  <path class="d-edge" d="M 555 150 L 555 172" marker-end="url(#gbr-arrow)"/>
</svg>

| Value | Where | Why |
| :--- | :--- | :--- |
| \`openIndex\` (\`null\` = closed) | \`Gallery\` state | One number says both "is it open" and "which photo" |
| Thumbnail elements | \`Gallery\` ref array | To give focus back |
| The opener | \`Gallery\` ref | Remembered at open time |
| Dialog and close button | \`Lightbox\` refs | Focus in, focus trap |
| Preloaded sources | \`Lightbox\` ref (\`Set\`) | Fetch each neighbour once |

📌 **Interview term: Controlled component** — a component whose important value is owned by its parent and passed in as a prop, with callbacks to request changes. The lightbox never keeps its own index, so the gallery always knows what is on screen (for example to scroll the grid or sync a URL).

## 4. Build It Step by Step

### Step 1: The grid of real buttons

~~~jsx
<ul className="grid" data-testid="grid">
  {items.map((p, i) => (
    <li key={p.id}>
      <button
        ref={(el) => {
          thumbs.current[i] = el;
        }}
        type="button"
        className="thumb"
        aria-label={"Open " + p.title}
        onClick={() => open(i)}
      >
        <img src={p.src} alt="" loading="lazy" />
      </button>
    </li>
  ))}
</ul>
~~~

Thumbnails are \`<button>\`s, not clickable \`div\` elements, so they are focusable and respond to Enter and Space for free. The button carries the label ("Open Harbour") and the thumbnail image gets \`alt=""\` so the name is not read twice. \`grid-template-columns: repeat(auto-fill, minmax(140px, 1fr))\` reflows the grid from two columns on a 360px phone to five in the 900px-wide desktop layout, without a media query.

The ref callback fills an array of thumbnail elements; React 19 also lets a ref callback return a cleanup function ([ref changes in React 19](/interview-question/how-did-ref-handling-change-in-react-19-ref-as-a-prop-forwardref-ref-cleanup)), not needed here.

### Step 2: Open, close and give focus back

~~~jsx
function open(i) {
  opener.current = thumbs.current[i];
  setOpenIndex(i);
}
function close() {
  setOpenIndex(null);
  if (opener.current) opener.current.focus(); // give focus back
}
~~~

📌 **Interview term: Focus restore** — when a dialog closes, focus returns to the element that opened it, so a keyboard user continues where they were. This follows the WAI-ARIA dialog pattern; the photo the user ended on may be different, which is why the opener is remembered separately from the index.

### Step 3: The dialog, in a portal

~~~jsx
return createPortal(
  <div
    className="backdrop"
    onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div
      ref={dialogRef}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-title"
      onKeyDown={onKeyDown}
    >
      <button
        ref={closeRef}
        type="button"
        className="close"
        aria-label="Close"
        onClick={onClose}
      >
        ✕
      </button>
      <figure>
        <img src={item.src} alt={item.alt} />
        <figcaption>
          <span id="lightbox-title">{item.title}</span>
          <span aria-live="polite">
            {index + 1} / {n}
          </span>
        </figcaption>
      </figure>
      <button
        type="button"
        aria-label="Previous photo"
        onClick={() => go(index - 1)}
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next photo"
        onClick={() => go(index + 1)}
      >
        ›
      </button>
    </div>
  </div>,
  document.body,
);
~~~

📌 **Interview term: Portal** — rendering a component's DOM somewhere else in the document (here, the end of \`body\`) while it stays in the same place in the React tree, so props, context and events still flow normally. Overlays use it to escape a parent's \`overflow: hidden\` or a stacking context that would trap \`z-index\`. See [portals in React](/interview-question/what-are-portals-in-react-and-when-would-you-use-them).

📌 **Interview term: \`aria-modal\` and \`aria-labelledby\`** — \`role="dialog"\` with \`aria-modal="true"\` tells assistive technology the rest of the page is inert while this is open; \`aria-labelledby\` makes the caption the dialog's accessible name, so a screen reader announces "Pine ridge, dialog".

The backdrop closes only when the click lands on the backdrop itself (\`e.target === e.currentTarget\`), not when it bubbles up from the photo or a button.

### Step 4: Focus in, scroll lock, focus trap

~~~jsx
useEffect(() => {
  closeRef.current.focus();
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = prevOverflow;
  };
}, []);
~~~

📌 **Interview term: Scroll lock** — stopping the page behind an overlay from scrolling, here with \`overflow: hidden\` on \`body\`. Saving and restoring the previous value (instead of resetting to \`""\`) keeps it correct if something else had already locked the page.

~~~jsx
else if (e.key === "Tab") {
  const f = dialogRef.current.querySelectorAll("button");
  const first = f[0];
  const last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
~~~

📌 **Interview term: Focus trap** — keeping Tab and Shift+Tab cycling inside a modal, so focus cannot wander to the page behind. The full treatment, including the \`inert\` attribute, is in [the accessible modal with focus trap and scroll lock](/interview-question/build-an-accessible-modal-with-focus-trap-scroll-lock).

Escape closes; Left / Right call \`go(index ± 1)\`, which wraps with \`((i % n) + n) % n\` and asks the parent through \`onIndexChange\`.

### Step 5: Preload the neighbours

~~~jsx
useEffect(() => {
  preloaded.add(items[index].src); // on screen already
  for (const i of [index - 1, index + 1]) {
    const src = items[((i % n) + n) % n].src;
    if (preloaded.has(src)) continue;
    preloaded.add(src);
    new Image().src = src;
  }
}, [index, items, n, preloaded]);
~~~

Creating an \`Image\` and setting \`src\` starts the download without putting anything in the DOM, so pressing Next shows a photo the browser already has. The \`Set\` (held in a ref) avoids requesting the same file twice, which also keeps StrictMode's double effect run from doubling the work.

## 5. Custom Overlay vs. Native \`<dialog>\`

| | This build | \`<dialog>\` with \`showModal()\` |
| :--- | :--- | :--- |
| Escape to close | Hand-written | Built in (fires \`cancel\`, then \`close\`) |
| Background inert | \`aria-modal\` + focus trap | Browser makes the rest of the page inert |
| Stacking | Portal plus \`z-index\` | Top layer, above everything |
| Scroll lock | Hand-written | Still yours to add |
| Focus restore | Hand-written | Browsers restore focus on close, but test it |

Saying "in production I would start from \`<dialog>\`, and here is what it does for me" is a strong senior signal; building it by hand shows you know each piece. Related: [the basic modal dialog](/interview-question/build-a-modal-dialog).

## 6. Verified

Mounted in jsdom with \`<StrictMode>\`. The lightbox renders into \`document.body\` through the portal, so the driver queries the whole document. It replaces \`window.Image\` with a spy that records which photo each preload requested:

\`\`\`text
grid    : 9 thumbnails | lightbox: (closed) | body overflow: ""
open #3 : Pine ridge · 3 / 9 | role dialog aria-modal true | labelledby -> Pine ridge
focus   : Close | body overflow: "hidden" | preloaded: Harbour, Red rocks
next    : Red rocks · 4 / 9 | preloaded: Harbour, Red rocks, Night sky
ArrowRight: Night sky · 5 / 9
ArrowLeft x4: Sunrise · 1 / 9 | img alt: Sunrise, illustration 1
ArrowLeft wraps: Snow peak · 9 / 9 | preloads so far: 7
Shift+Tab on first: Next photo
Tab on last: Close
Escape  : (closed) | focus back on: Open Pine ridge | body overflow: ""
click on photo: Sunrise · 1 / 9
click backdrop: (closed) | focus back on: Open Sunrise
close button: (closed) | focus back on: Open Snow peak
\`\`\`

Opening photo 3 focused the Close button, locked the page and preloaded photos 2 and 4; Next only fetched the one new neighbour. Left from photo 1 wrapped to 9. Tab and Shift+Tab cycled inside the dialog. Escape, the backdrop and the close button all closed it and gave focus back to the right thumbnail, and a click on the photo itself did not close it.

In **headless Chromium 141** (400 × 700 viewport): opening photo 5 put focus on Close, the backdrop covered the full 400 × 700 viewport, \`body\` computed \`overflow: hidden\`, and the backdrop's parent was \`BODY\` (the portal). Right then three Tabs ended back on Close; Escape returned focus to "Open Night sky"; a real click at the top-left corner of the backdrop closed it.

## 7. Edge Cases and Accessibility

| Case | Behaviour |
| :--- | :--- |
| Previous on the first photo | Wraps to the last |
| Click inside the photo | Does not close (target check) |
| Tab past the last button | Wraps to the first (focus trap) |
| Close | Focus returns to the opening thumbnail |
| Page already locked by something else | Previous \`overflow\` is restored, not reset |
| Screen reader | Dialog named by the caption, counter in a polite live region, real \`alt\` on the large image |
| Phone width | Grid reflows to two columns; lightbox image uses \`object-fit: contain\` and \`max-height: 80vh\` |

## 8. Common Pitfalls

- **Clickable \`div\` thumbnails.** Not focusable, no Enter / Space, no role; use buttons.
- **The lightbox keeping its own index copy.** The grid and the dialog drift apart; make it controlled.
- **Closing on any click inside the backdrop.** Clicking the photo or a button bubbles to the backdrop; check \`e.target === e.currentTarget\`.
- **No focus restore.** Keyboard users land at the top of the page after closing.
- **Resetting \`body.style.overflow = ""\` on close.** Breaks any other lock; save and restore the previous value.
- **Rendering the overlay inside a card with \`overflow: hidden\` or a transform.** It gets clipped or trapped under other content; portal it to \`body\`.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Should Back close it and should photos be linkable? Can I use native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;dialog&gt;</code>? Is swipe needed?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">openIndex</code>, null when closed, owned by the gallery. The lightbox is controlled: it gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code> and asks for changes through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onIndexChange</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onClose</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Markup:</strong> <span style="color:#f0e2c8;">"Thumbnails are buttons in an auto-fill CSS grid. The lightbox is a portal into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">body</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=dialog</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-modal</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-labelledby</code> pointing at the caption."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Focus and scroll:</strong> <span style="color:#f0e2c8;">"On open I focus Close and save then set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">body</code> overflow hidden; Tab is trapped between the first and last buttons; on close I restore overflow and focus the thumbnail that opened it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Polish:</strong> <span style="color:#f0e2c8;">"Arrows wrap with modulo, Escape and backdrop close with a target check, neighbours preload with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Image()</code>, and I would mention <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;dialog&gt;</code> and URL state."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make Back close the lightbox?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store the index in the URL, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?photo=3</code>. Opening pushes a history entry, closing goes back, and the gallery derives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">openIndex</code> from the location, so Back closes it and a link opens the right photo.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a portal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So the overlay is a child of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">body</code> and cannot be clipped by an ancestor with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">overflow: hidden</code>, or stuck under other content by an ancestor that creates a stacking context, such as a transform. Events still bubble through the React tree.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would native <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;dialog&gt;</code> give you?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">showModal()</code> puts it in the top layer, makes the rest of the page inert so focus cannot leave, and closes on Escape. You still add scroll lock, and you should test focus restore.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle 1,000 photos?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Lazy-load thumbnails with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loading=lazy</code> or an IntersectionObserver, serve small thumbnail files, and virtualise the grid if the DOM gets heavy. The lightbox only ever renders one photo plus preloads.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the focus trap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Open the dialog, focus the last button, fire <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keydown</code> Tab and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code> is the first button; Shift+Tab from the first should land on the last; Escape should return focus to the thumbnail.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lightbox** | Modal overlay that shows one item of a collection large |
| **Controlled component** | Parent owns the value and passes it down with change callbacks |
| **Portal** | Render DOM elsewhere (end of \`body\`) while staying in the React tree |
| **aria-modal** | Tells assistive technology the rest of the page is inert |
| **Focus trap** | Tab and Shift+Tab cycle inside the dialog |
| **Focus restore** | Focus returns to the opener when the dialog closes |
| **Scroll lock** | Stop the page behind the overlay from scrolling |

---
**Conclusion:** An image gallery with a lightbox is a grid of real buttons, one \`openIndex\` owned by the gallery, and a controlled lightbox rendered in a portal. The lightbox's manners carry the interview: focus moves in on open, Tab is trapped, Escape and the backdrop close, the page is scroll-locked and restored, focus returns to the opener, and neighbours are preloaded. Verified on React 19.3.1 in jsdom and Chromium 141, all of those behaviours held. Mention native \`<dialog>\` as the production starting point and the URL as the place for the index if Back must close it.`,
        files: {
          "/App.js": `import Gallery from "./src/components/Gallery";
import { photos } from "./src/data/photos";

export default function App() {
  return (
    <main className="app">
      <h1>Photo gallery</h1>
      <p className="hint">
        Click a photo. In the lightbox use the arrows or Left / Right keys, Esc
        or the backdrop to close.
      </p>
      <Gallery items={photos} />
    </main>
  );
}
`,
          "/src/components/Gallery.js": `import { useRef, useState } from "react";
import Lightbox from "./Lightbox";

export default function Gallery({ items }) {
  const [openIndex, setOpenIndex] = useState(null); // null = closed
  const thumbs = useRef([]);
  const opener = useRef(null); // the thumbnail that opened the lightbox

  function open(i) {
    opener.current = thumbs.current[i];
    setOpenIndex(i);
  }
  function close() {
    setOpenIndex(null);
    if (opener.current) opener.current.focus(); // give focus back
  }

  return (
    <>
      <ul className="grid" data-testid="grid">
        {items.map((p, i) => (
          <li key={p.id}>
            <button
              ref={(el) => {
                thumbs.current[i] = el;
              }}
              type="button"
              className="thumb"
              data-testid="thumb"
              aria-label={"Open " + p.title}
              onClick={() => open(i)}
            >
              <img src={p.src} alt="" loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
      {openIndex !== null && (
        <Lightbox
          items={items}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={close}
        />
      )}
    </>
  );
}
`,
          "/src/components/Lightbox.js": `import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// Controlled: the parent owns \`index\`; the lightbox only asks to change it.
export default function Lightbox({ items, index, onIndexChange, onClose }) {
  const n = items.length;
  const item = items[index];
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  // per open lightbox; each file fetched once
  const preloaded = useRef(new Set()).current;

  const go = (i) => onIndexChange(((i % n) + n) % n);

  // Move focus in on open; lock page scroll while open, restore the old value.
  useEffect(() => {
    closeRef.current.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Preload the neighbours so next / previous feel instant.
  useEffect(() => {
    preloaded.add(items[index].src); // on screen already
    for (const i of [index - 1, index + 1]) {
      const src = items[((i % n) + n) % n].src;
      if (preloaded.has(src)) continue;
      preloaded.add(src);
      new Image().src = src;
    }
  }, [index, items, n, preloaded]);

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    } else if (e.key === "Tab") {
      // Focus trap: wrap Tab / Shift+Tab inside the dialog.
      const f = dialogRef.current.querySelectorAll("button");
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return createPortal(
    <div
      className="backdrop"
      data-testid="backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="lightbox"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lightbox-title"
        data-testid="lightbox"
        onKeyDown={onKeyDown}
      >
        <button
          ref={closeRef}
          type="button"
          className="close"
          data-testid="close"
          aria-label="Close"
          onClick={onClose}
        >
          ✕
        </button>
        <figure>
          <img src={item.src} alt={item.alt} />
          <figcaption>
            <span id="lightbox-title">{item.title}</span>
            <span data-testid="counter" aria-live="polite">
              {index + 1} / {n}
            </span>
          </figcaption>
        </figure>
        <button
          type="button"
          className="nav prev"
          data-testid="prev"
          aria-label="Previous photo"
          onClick={() => go(index - 1)}
        >
          ‹
        </button>
        <button
          type="button"
          className="nav next"
          data-testid="next"
          aria-label="Next photo"
          onClick={() => go(index + 1)}
        >
          ›
        </button>
      </div>
    </div>,
    document.body,
  );
}
`,
          "/src/data/photos.js": `// Offline photos: inline SVG data URLs, so the demo needs no network.
// Tiny markup helper: el("rect", { width: 9 }) gives <rect width="9"/>.
function el(tag, attrs, children) {
  const a = Object.keys(attrs)
    .map((k) => " " + k + '="' + attrs[k] + '"')
    .join("");
  return children
    ? "<" + tag + a + ">" + children.join("") + "</" + tag + ">"
    : "<" + tag + a + "/>";
}

function svgPhoto(hue, title, n) {
  const svg = el(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 800,
      height: 450,
      viewBox: "0 0 800 450",
    },
    [
      el("defs", {}, [
        el("linearGradient", { id: "g", x1: 0, y1: 0, x2: 1, y2: 1 }, [
          el("stop", { offset: 0, "stop-color": "hsl(" + hue + ",70%,55%)" }),
          el("stop", {
            offset: 1,
            "stop-color": "hsl(" + (hue + 50) + ",65%,28%)",
          }),
        ]),
      ]),
      el("rect", { width: 800, height: 450, fill: "url(#g)" }),
      el("circle", {
        cx: 640,
        cy: 120,
        r: 70,
        fill: "hsla(" + (hue + 180) + ",80%,85%,0.55)",
      }),
      el("path", {
        d: "M0 450 L220 250 L360 370 L520 220 L800 450 Z",
        fill: "hsla(" + hue + ",40%,14%,0.7)",
      }),
      el(
        "text",
        {
          x: 40,
          y: 80,
          "font-family": "sans-serif",
          "font-size": 48,
          fill: "white",
        },
        [n + ". " + title],
      ),
    ],
  );
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const titles = [
  "Sunrise",
  "Harbour",
  "Pine ridge",
  "Red rocks",
  "Night sky",
  "Lavender",
  "Old town",
  "Waterfall",
  "Snow peak",
];

export const photos = titles.map((title, i) => ({
  id: i + 1,
  title,
  alt: title + ", illustration " + (i + 1),
  src: svgPhoto((i * 40 + 10) % 360, title, i + 1),
}));
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
}
h1 {
  font-size: 1.2rem;
}
.hint {
  color: #8a93a6;
  font-size: 0.85rem;
}
.grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}
.thumb {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: 8px;
  overflow: hidden;
  cursor: zoom-in;
  background: #181b22;
  aspect-ratio: 16 / 9;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.2s;
}
.thumb:hover img {
  transform: scale(1.05);
}
.thumb:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
  background: rgba(5, 6, 10, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.lightbox {
  position: relative;
  width: min(960px, 100%);
}
.lightbox figure {
  margin: 0;
}
.lightbox img {
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
  display: block;
  border-radius: 8px;
}
.lightbox figcaption {
  display: flex;
  justify-content: space-between;
  padding: 8px 2px;
  color: #cfd6e4;
}
.lightbox button {
  border: 0;
  border-radius: 50%;
  width: 42px;
  height: 42px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 22px;
  cursor: pointer;
}
.lightbox button:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.close {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
}
.nav {
  position: absolute;
  top: 45%;
  transform: translateY(-50%);
}
.prev {
  left: 8px;
}
.next {
  right: 8px;
}
`,
        },
      },
      // ── vue ─────────────────────────────────────────────────────────
      vue: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Vue. Assumes \`<script setup>\`, props and emits; Teleport, \`defineModel\` and focus management are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain words first, then <code>📌 Interview term:</code> callouts. The Verified output was produced by running this solution on Vue 3.5.44 in jsdom and in headless Chromium 141.

## 1. A Story First

A museum wall of small prints, and a viewing room for the full-size piece. A good guide walks you into the room, keeps you there until you choose to leave, lets you step to the neighbouring rooms, and walks you back to the exact print you came from. The grid is the wall, the lightbox is the room, and the guide's manners (focus in, focus trapped, scroll locked, focus restored) are what the interviewer grades.

📌 **Interview term: Lightbox** — a modal overlay showing one item of a collection large, with the page dimmed behind it.

## 2. The Vue Component Model

\`Gallery.vue\` renders the thumbnail grid and owns \`openIndex\` (\`null\` when closed). \`Lightbox.vue\` is mounted with \`v-if\` only while open and binds the index with \`v-model:index\`.

| Piece | Vue tool | Why |
| :--- | :--- | :--- |
| \`openIndex\` | \`ref(null)\` in Gallery | One value: open or not, and which photo |
| Index inside the lightbox | \`defineModel("index")\` | Two-way binding without hand-written prop + emit |
| Thumbnail elements | \`ref="thumbs"\` inside \`v-for\` | Vue fills an array of elements, used for focus restore |
| Overlay placement | \`<Teleport to="body">\` | Escapes ancestors that clip or trap stacking |
| Scroll lock, focus in | \`onMounted\` / \`onBeforeUnmount\` | The lightbox exists only while open |
| Neighbour preloading | \`watch(index, ..., { immediate: true })\` | Runs on open and on every move |

📌 **Interview term: \`defineModel()\`** — a \`<script setup>\` macro that declares a prop and its \`update:\` event together and returns a ref; writing to it emits the update. \`v-model:index="openIndex"\` in the parent keeps one source of truth ([defineModel](/interview-question/what-is-definemodel-in-vue-3-4-and-how-does-it-replace-manual-prop-emit)).

## 3. Build It Step by Step

### Step 1: Grid of buttons, remembering the opener

~~~vue
<li v-for="(p, i) in items" :key="p.id">
  <button
    ref="thumbs"
    type="button"
    class="thumb"
    :aria-label="'Open ' + p.title"
    @click="open(i)"
  >
    <img :src="p.src" alt="" loading="lazy" />
  </button>
</li>
~~~

~~~js
const openIndex = ref(null); // null = closed
const thumbs = ref([]); // filled by ref="thumbs" inside v-for
let opener = null;

function open(i) {
  opener = thumbs.value[i];
  openIndex.value = i;
}
function close() {
  openIndex.value = null;
  if (opener) opener.focus();
}
~~~

A \`ref\` attribute inside \`v-for\` gives an array of elements. Buttons are focusable and keyboard-activatable for free; the label lives on the button and the thumbnail has \`alt=""\`.

📌 **Interview term: Focus restore** — when the dialog closes, focus returns to the element that opened it, so a keyboard user continues where they were.

### Step 2: Teleport the dialog to \`body\`

~~~vue
<Teleport to="body">
  <div class="backdrop" @click.self="emit('close')">
    <div ref="dialog" class="lightbox" role="dialog" aria-modal="true"
         aria-labelledby="lightbox-title" @keydown="onKeydown">
      <button
        ref="closeBtn"
        type="button"
        class="close"
        aria-label="Close"
        @click="emit('close')"
      >✕</button>
      <figure>
        <img :src="item.src" :alt="item.alt" />
        <figcaption>
          <span id="lightbox-title">{{ item.title }}</span>
          <span aria-live="polite">{{ index + 1 }} / {{ n }}</span>
        </figcaption>
      </figure>
      <!-- Previous / Next buttons -->
    </div>
  </div>
</Teleport>
~~~

📌 **Interview term: Teleport** — renders part of a component's template somewhere else in the DOM (here the end of \`body\`) while it stays in the same component, with the same props, state and events. Overlays use it to escape \`overflow: hidden\` and stacking contexts. See [Teleport in Vue 3](/interview-question/what-is-teleport-in-vue-3).

\`@click.self\` closes only when the click lands on the backdrop itself, so clicking the photo or a button does not close it. \`role="dialog"\`, \`aria-modal="true"\` and \`aria-labelledby\` make a screen reader announce "Pine ridge, dialog".

### Step 3: Focus in, scroll lock, focus trap

~~~js
let prevOverflow = "";
onMounted(() => {
  closeBtn.value.focus();
  prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
});
onBeforeUnmount(() => {
  document.body.style.overflow = prevOverflow;
});
~~~

📌 **Interview term: Scroll lock** — stop the page behind the overlay from scrolling, and restore the previous value afterwards rather than resetting it.

\`onKeydown\` handles Escape (emit \`close\`), Left / Right (\`index.value = wrap(i)\`, which \`defineModel\` turns into an \`update:index\` event) and Tab: from the last button it moves to the first, and Shift+Tab from the first moves to the last.

📌 **Interview term: Focus trap** — Tab and Shift+Tab cycle inside the modal so focus never reaches the page behind. More in [the accessible modal with focus trap](/interview-question/build-an-accessible-modal-with-focus-trap-scroll-lock).

### Step 4: Preload neighbours

~~~js
// per open lightbox; each file fetched once
const preloaded = new Set();
watch(
  index,
  (i) => {
    preloaded.add(props.items[i].src); // on screen already
    for (const j of [i - 1, i + 1]) {
      const src = props.items[wrap(j)].src;
      if (preloaded.has(src)) continue;
      preloaded.add(src);
      new Image().src = src;
    }
  },
  { immediate: true },
);
~~~

\`immediate: true\` runs it on open as well as on every move.

## 4. Verified

Mounted in jsdom with \`createApp(App).mount("#app")\`. The lightbox is teleported into \`body\`, so the driver queries the whole document, and it replaces \`window.Image\` with a spy that records preloads:

\`\`\`text
grid    : 9 thumbnails | lightbox: (closed) | body overflow: ""
open #3 : Pine ridge · 3 / 9 | role dialog aria-modal true | labelledby -> Pine ridge
focus   : Close | body overflow: "hidden" | preloaded: Harbour, Red rocks
next    : Red rocks · 4 / 9 | preloaded: Harbour, Red rocks, Night sky
ArrowLeft wraps: Snow peak · 9 / 9 | preloads so far: 7
Shift+Tab on first: Next photo
Tab on last: Close
Escape  : (closed) | focus back on: Open Pine ridge | body overflow: ""
click on photo: Sunrise · 1 / 9
click backdrop: (closed) | focus back on: Open Sunrise
close button: (closed) | focus back on: Open Snow peak
\`\`\`

(Trimmed: two navigation lines omitted; every line matched the React and Angular runs.) In headless Chromium 141 the backdrop's parent was \`BODY\` (the Teleport), it covered the full 400 × 700 viewport, \`body\` computed \`overflow: hidden\`, three Tabs cycled back to Close, and Escape returned focus to the opening thumbnail.

## 5. Common Pitfalls

- **Teleporting with \`v-show\`.** The overlay stays in the DOM, with its scroll lock, while hidden; mount it with \`v-if\` so \`onMounted\` / \`onBeforeUnmount\` bracket the open state.
- **A local copy of the index in the lightbox.** Use \`defineModel\` so the gallery stays the source of truth.
- **\`@click\` instead of \`@click.self\` on the backdrop.** Every click on the photo closes it.
- **Forgetting focus restore.** Keyboard users jump back to the top of the page.
- **Resetting \`overflow\` to \`""\`.** Breaks any other lock; restore the saved value.
- **Expecting teleported content in the component root.** Tests that query \`wrapper.element\` miss it; query \`document.body\`.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Should Back close it, can I use native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;dialog&gt;</code>, and do we need swipe?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;">"The gallery owns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">openIndex</code>, null when closed, and remembers the opener. The lightbox is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> mounted and bound with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model:index</code> through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Markup:</strong> <span style="color:#f0e2c8;">"Button thumbnails in an auto-fill grid; the lightbox is teleported to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">body</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=dialog</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-modal</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-labelledby</code> on the caption."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Behaviour:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> focuses Close and locks scroll, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBeforeUnmount</code> restores it; keydown handles Escape, arrows with wrap-around and the Tab trap; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@click.self</code> closes on the backdrop."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close the loop:</strong> <span style="color:#f0e2c8;">"On close the gallery focuses the opener, and an immediate watcher preloads neighbours with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Image()</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-if</code> rather than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-show</code> for the lightbox?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The lightbox has side effects tied to being open: focus and the scroll lock. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> they live in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBeforeUnmount</code>; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-show</code> the component is mounted once and you would need watchers to emulate open and close.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add swipe on phones?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Listen to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pointerdown</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pointerup</code> on the figure, compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clientX</code>, and call the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">go(index + 1)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">go(index - 1)</code> past a 40px threshold. Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">touch-action: pan-y</code> so vertical gestures still work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you let consumers customise the caption?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a scoped slot, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;slot name=caption :item=item :index=index /&gt;</code>, with the title and counter as the fallback content.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it with Vue Test Utils?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mount with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">attachTo: document.body</code>, click a thumbnail, then query <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.body</code> for the dialog because it is teleported; trigger keydown events and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code>.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lightbox** | Modal overlay showing one item large |
| **defineModel** | Prop plus update event as one ref, for \`v-model\` |
| **Teleport** | Render part of a template elsewhere in the DOM |
| **@click.self** | Run the handler only when the element itself was clicked |
| **Focus trap** | Tab cycles inside the dialog |
| **Focus restore** | Focus returns to the opener on close |

---
**Conclusion:** In Vue the gallery owns one \`openIndex\` ref and remembers the opener; the lightbox is mounted with \`v-if\`, bound with \`v-model:index\` through \`defineModel\`, and teleported to \`body\`. Its lifecycle hooks bracket focus-in and the scroll lock, a keydown handler covers Escape, arrows and the focus trap, \`@click.self\` closes on the backdrop, and an immediate watcher preloads neighbours. Verified on Vue 3.5.44 in jsdom and Chromium 141, it matches the React and Angular builds line for line.`,
        files: {
          "/src/App.vue": `<script setup>
import Gallery from "./components/Gallery.vue";
import { photos } from "./data/photos.js";
</script>

<template>
  <main class="app">
    <h1>Photo gallery</h1>
    <p class="hint">Click a photo. In the lightbox use the arrows or Left / Right keys, Esc or the backdrop to close.</p>
    <Gallery :items="photos" />
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
}
h1 {
  font-size: 1.2rem;
}
.hint {
  color: #8a93a6;
  font-size: 0.85rem;
}
</style>
`,
          "/src/components/Gallery.vue": `<script setup>
import { ref } from "vue";
import Lightbox from "./Lightbox.vue";

defineProps({ items: { type: Array, required: true } });

const openIndex = ref(null); // null = closed
const thumbs = ref([]); // filled by ref="thumbs" inside v-for
let opener = null; // the thumbnail that opened the lightbox

function open(i) {
  opener = thumbs.value[i];
  openIndex.value = i;
}
function close() {
  openIndex.value = null;
  if (opener) opener.focus(); // give focus back
}
</script>

<template>
  <ul class="grid" data-testid="grid">
    <li v-for="(p, i) in items" :key="p.id">
      <button
        ref="thumbs"
        type="button"
        class="thumb"
        data-testid="thumb"
        :aria-label="'Open ' + p.title"
        @click="open(i)"
      >
        <img :src="p.src" alt="" loading="lazy" />
      </button>
    </li>
  </ul>
  <Lightbox
    v-if="openIndex !== null"
    v-model:index="openIndex"
    :items="items"
    @close="close"
  />
</template>

<style>
.grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}
.thumb {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: 8px;
  overflow: hidden;
  cursor: zoom-in;
  background: #181b22;
  aspect-ratio: 16 / 9;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.2s;
}
.thumb:hover img {
  transform: scale(1.05);
}
.thumb:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
</style>
`,
          "/src/components/Lightbox.vue": `<script setup>
import {
  onMounted,
  onBeforeUnmount,
  watch,
  computed,
  useTemplateRef,
} from "vue";

const props = defineProps({ items: { type: Array, required: true } });
// v-model:index — the parent owns the index; we only ask to change it.
const index = defineModel("index", { type: Number, required: true });
const emit = defineEmits(["close"]);

const n = computed(() => props.items.length);
const item = computed(() => props.items[index.value]);
const dialog = useTemplateRef("dialog");
const closeBtn = useTemplateRef("closeBtn");
const wrap = (i) => ((i % n.value) + n.value) % n.value;
const go = (i) => {
  index.value = wrap(i);
};

// Move focus in on open; lock page scroll while open, restore the old value.
let prevOverflow = "";
onMounted(() => {
  closeBtn.value.focus();
  prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
});
onBeforeUnmount(() => {
  document.body.style.overflow = prevOverflow;
});

// Preload the neighbours so next / previous feel instant.
const preloaded = new Set(); // per open lightbox; each file fetched once
watch(
  index,
  (i) => {
    preloaded.add(props.items[i].src); // on screen already
    for (const j of [i - 1, i + 1]) {
      const src = props.items[wrap(j)].src;
      if (preloaded.has(src)) continue;
      preloaded.add(src);
      new Image().src = src;
    }
  },
  { immediate: true },
);

function onKeydown(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    emit("close");
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    go(index.value + 1);
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    go(index.value - 1);
  } else if (e.key === "Tab") {
    // Focus trap: wrap Tab / Shift+Tab inside the dialog.
    const f = dialog.value.querySelectorAll("button");
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="backdrop" data-testid="backdrop" @click.self="emit('close')">
      <div
        ref="dialog"
        class="lightbox"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lightbox-title"
        data-testid="lightbox"
        @keydown="onKeydown"
      >
        <button
          ref="closeBtn"
          type="button"
          class="close"
          data-testid="close"
          aria-label="Close"
          @click="emit('close')"
        >✕</button>
        <figure>
          <img :src="item.src" :alt="item.alt" />
          <figcaption>
            <span id="lightbox-title">{{ item.title }}</span>
            <span
              data-testid="counter"
              aria-live="polite"
            >{{ index + 1 }} / {{ n }}</span>
          </figcaption>
        </figure>
        <button
          type="button"
          class="nav prev"
          data-testid="prev"
          aria-label="Previous photo"
          @click="go(index - 1)"
        >‹</button>
        <button
          type="button"
          class="nav next"
          data-testid="next"
          aria-label="Next photo"
          @click="go(index + 1)"
        >›</button>
      </div>
    </div>
  </Teleport>
</template>

<style>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
  background: rgba(5, 6, 10, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.lightbox {
  position: relative;
  width: min(960px, 100%);
}
.lightbox figure {
  margin: 0;
}
.lightbox img {
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
  display: block;
  border-radius: 8px;
}
.lightbox figcaption {
  display: flex;
  justify-content: space-between;
  padding: 8px 2px;
  color: #cfd6e4;
}
.lightbox button {
  border: 0;
  border-radius: 50%;
  width: 42px;
  height: 42px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 22px;
  cursor: pointer;
}
.lightbox button:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.lightbox .close {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
}
.lightbox .nav {
  position: absolute;
  top: 45%;
  transform: translateY(-50%);
}
.lightbox .prev {
  left: 8px;
}
.lightbox .next {
  right: 8px;
}
</style>
`,
          "/src/data/photos.js": `// Offline photos: inline SVG data URLs, so the demo needs no network.
// Tiny markup helper: el("rect", { width: 9 }) gives <rect width="9"/>.
function el(tag, attrs, children) {
  const a = Object.keys(attrs)
    .map((k) => " " + k + '="' + attrs[k] + '"')
    .join("");
  return children
    ? "<" + tag + a + ">" + children.join("") + "</" + tag + ">"
    : "<" + tag + a + "/>";
}

function svgPhoto(hue, title, n) {
  const svg = el(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 800,
      height: 450,
      viewBox: "0 0 800 450",
    },
    [
      el("defs", {}, [
        el("linearGradient", { id: "g", x1: 0, y1: 0, x2: 1, y2: 1 }, [
          el("stop", { offset: 0, "stop-color": "hsl(" + hue + ",70%,55%)" }),
          el("stop", {
            offset: 1,
            "stop-color": "hsl(" + (hue + 50) + ",65%,28%)",
          }),
        ]),
      ]),
      el("rect", { width: 800, height: 450, fill: "url(#g)" }),
      el("circle", {
        cx: 640,
        cy: 120,
        r: 70,
        fill: "hsla(" + (hue + 180) + ",80%,85%,0.55)",
      }),
      el("path", {
        d: "M0 450 L220 250 L360 370 L520 220 L800 450 Z",
        fill: "hsla(" + hue + ",40%,14%,0.7)",
      }),
      el(
        "text",
        {
          x: 40,
          y: 80,
          "font-family": "sans-serif",
          "font-size": 48,
          fill: "white",
        },
        [n + ". " + title],
      ),
    ],
  );
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const titles = [
  "Sunrise",
  "Harbour",
  "Pine ridge",
  "Red rocks",
  "Night sky",
  "Lavender",
  "Old town",
  "Waterfall",
  "Snow peak",
];

export const photos = titles.map((title, i) => ({
  id: i + 1,
  title,
  alt: title + ", illustration " + (i + 1),
  src: svgPhoto((i * 40 + 10) % 360, title, i + 1),
}));
`,
        },
      },
      // ── angular ─────────────────────────────────────────────────────
      angular: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Angular. Assumes standalone components and templates; two-way binding, \`@ViewChild\` and focus management are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain words first, then <code>📌 Interview term:</code> callouts. The Verified output comes from Angular 22.2.3 under AOT with strict templates and the playground runtime JIT, in jsdom and in headless Chromium 141.

## 1. A Story First

A wall of small prints and a viewing room for the full-size piece. The guide takes you in, keeps you in the room until you leave, lets you step to the neighbouring rooms, and walks you back to the print you came from. The grid is the wall, the lightbox is the room, and the guide's manners (focus in, Tab trapped, scroll locked, focus restored) are what gets graded.

📌 **Interview term: Lightbox** — a modal overlay showing one item of a collection large, with the page dimmed behind it.

## 2. The Angular Component Model

\`AppComponent\` renders the grid and owns \`openIndex = signal<number | null>(null)\`. \`LightboxComponent\` is created by \`@if (openIndex() !== null)\` and is controlled: \`[index]\` in, \`(indexChange)\` and \`(closed)\` out.

| Piece | Angular tool | Why |
| :--- | :--- | :--- |
| \`openIndex\` | \`signal\` in the parent | Open or not, and which photo |
| \`index\` in, \`indexChange\` out | \`@Input()\` + \`@Output()\` | The \`x\` / \`xChange\` pair is what \`[(index)]\` banana-box binding expects |
| The opener | \`$event.currentTarget\` saved on click | Focus restore |
| Dialog and close button | \`@ViewChild(..., { static: true })\` | Focus in, focus trap |
| Focus in and scroll lock | \`ngAfterViewInit\` / \`ngOnDestroy\` | The component exists only while open |
| Preloading | \`ngOnChanges\` | Runs whenever the parent sends a new \`index\` |

📌 **Interview term: \`x\` / \`xChange\` two-way binding** — a component with \`@Input() index\` and \`@Output() indexChange\` supports \`[(index)]="value"\`. The parent here writes the two halves explicitly, \`[index]="openIndex()!"\` and \`(indexChange)="openIndex.set($event)"\`, because the value lives in a signal. In a CLI app, \`model()\` does this in one line ([model() two-way binding](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs)), but it does not register under the playground runtime JIT.

The output is named \`closed\`, not \`close\`, to avoid confusion with the DOM \`close\` event that native \`<dialog>\` elements fire.

## 3. Build It Step by Step

### Step 1: The grid, and remembering the opener

~~~html
@for (p of photos; track p.id; let i = $index) {
  <li>
    <button
      type="button"
      class="thumb"
      [attr.aria-label]="'Open ' + p.title"
      (click)="open(i, $event)"
    >
      <img [src]="p.src" alt="" loading="lazy" />
    </button>
  </li>
}
@if (openIndex() !== null) {
  <app-lightbox
    [items]="photos"
    [index]="openIndex()!"
    (indexChange)="openIndex.set($event)"
    (closed)="close()"
  />
}
~~~

~~~ts
open(i: number, e: MouseEvent): void {
  this.opener = e.currentTarget as HTMLElement;
  this.openIndex.set(i);
}
close(): void {
  this.openIndex.set(null);
  if (this.opener) this.opener.focus(); // give focus back
}
~~~

📌 **Interview term: Focus restore** — when the dialog closes, focus returns to the element that opened it. Saving \`e.currentTarget\` avoids a \`@ViewChildren\` query just for this.

### Step 2: The dialog template

~~~html
<div class="backdrop" (click)="onBackdrop($event)">
  <div #dialog class="lightbox" role="dialog" aria-modal="true" aria-labelledby="lightbox-title"
       (keydown)="onKeydown($event)">
    <button
      #closeBtn
      type="button"
      class="close"
      aria-label="Close"
      (click)="closed.emit()"
    >✕</button>
    <figure>
      <img [src]="items[index].src" [alt]="items[index].alt" />
      <figcaption>
        <span id="lightbox-title">{{ items[index].title }}</span>
        <span aria-live="polite">{{ index + 1 }} / {{ items.length }}</span>
      </figcaption>
    </figure>
    <!-- Previous / Next buttons call go(index - 1) and go(index + 1) -->
  </div>
</div>
~~~

\`onBackdrop\` closes only when \`e.target === e.currentTarget\`, so clicks on the photo do not close it. The backdrop is \`position: fixed; inset: 0\`, which covers the viewport from where the component sits in the DOM.

📌 **Interview term: Rendering in place vs a portal** — React and Vue move the overlay to the end of \`body\` (portal, Teleport). Angular has no built-in equivalent in \`@angular/core\`; the CDK's \`Overlay\` service and \`cdkPortal\` do it in real apps. In place works here because no ancestor clips it, but a parent with \`overflow: hidden\` plus a transform, or a lower stacking context, would. The Chromium check below shows the backdrop's parent is \`APP-LIGHTBOX\`, not \`BODY\`.

### Step 3: Focus in, scroll lock, focus trap

~~~ts
ngAfterViewInit(): void {
  this.closeBtn.nativeElement.focus();
  this.prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
}

ngOnDestroy(): void {
  document.body.style.overflow = this.prevOverflow;
}
~~~

📌 **Interview term: Scroll lock** — stop the page behind the overlay from scrolling, and restore the saved value on destroy instead of resetting it.

\`onKeydown\` closes on Escape, moves on Left / Right through \`indexChange.emit(this.wrap(i))\`, and traps Tab: from the last button to the first, and with Shift from the first to the last.

📌 **Interview term: Focus trap** — Tab and Shift+Tab cycle inside the modal. The CDK's \`cdkTrapFocus\` directive does the same with more edge cases handled; see also [the accessible modal with focus trap](/interview-question/build-an-accessible-modal-with-focus-trap-scroll-lock).

### Step 4: Preload neighbours in \`ngOnChanges\`

~~~ts
ngOnChanges(): void {
  this.preloaded.add(this.items[this.index].src); // on screen already
  for (const j of [this.index - 1, this.index + 1]) {
    const src = this.items[this.wrap(j)].src;
    if (this.preloaded.has(src)) continue;
    this.preloaded.add(src);
    new Image().src = src;
  }
}
~~~

\`ngOnChanges\` runs before the first render and after every input change, which is exactly "on open and on every move" ([ngOnChanges](/interview-question/what-is-the-purpose-of-ngonchanges-and-how-does-it-capture-changes-in-input-prop)).

## 4. Verified

Booted in jsdom under AOT (\`ngc\`, \`strictTemplates\`) and runtime JIT; both printed identical lines that also matched the React and Vue runs. \`window.Image\` is replaced by a spy that records preloads:

\`\`\`text
grid    : 9 thumbnails | lightbox: (closed) | body overflow: ""
open #3 : Pine ridge · 3 / 9 | role dialog aria-modal true | labelledby -> Pine ridge
focus   : Close | body overflow: "hidden" | preloaded: Harbour, Red rocks
next    : Red rocks · 4 / 9 | preloaded: Harbour, Red rocks, Night sky
ArrowLeft wraps: Snow peak · 9 / 9 | preloads so far: 7
Shift+Tab on first: Next photo
Tab on last: Close
Escape  : (closed) | focus back on: Open Pine ridge | body overflow: ""
click on photo: Sunrise · 1 / 9
click backdrop: (closed) | focus back on: Open Sunrise
close button: (closed) | focus back on: Open Snow peak
\`\`\`

(Trimmed: two navigation lines omitted.) In headless Chromium 141 the fixed backdrop covered the full 400 × 700 viewport even though its parent was \`APP-LIGHTBOX\`, \`body\` computed \`overflow: hidden\`, three Tabs cycled back to Close, Escape returned focus to the opening thumbnail, and a real click on the backdrop corner closed it.

## 5. Common Pitfalls

- **Naming the output \`close\`.** It reads like the DOM event; \`closed\` is clearer.
- **Doing focus work in \`ngOnInit\`.** The view is not ready; with \`static: true\` the element exists, but \`ngAfterViewInit\` states the intent.
- **A local index copy in the lightbox.** It drifts from the parent; keep it controlled.
- **\`(click)="closed.emit()"\` on the backdrop.** Clicks on the photo bubble up and close it; check the target.
- **Assuming in-place rendering is always safe.** An ancestor with a transform makes \`position: fixed\` relative to that ancestor; use the CDK Overlay in real apps.
- **Signal \`model()\` in the playground.** Not registered under runtime JIT; \`@Input()\` + \`@Output()\` works everywhere.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Should Back close it, can I use native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;dialog&gt;</code> or the CDK, and do we need swipe?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;">"The parent owns an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">openIndex</code> signal and saves the opener from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$event.currentTarget</code>. The lightbox is created by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code> and controlled with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[index]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(indexChange)</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Markup:</strong> <span style="color:#f0e2c8;">"Button thumbnails in an auto-fill grid; the lightbox has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=dialog</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-modal</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-labelledby</code>, and a fixed backdrop that closes only on its own clicks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Lifecycle:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code> focuses Close and locks scroll, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnDestroy</code> restores it, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnChanges</code> preloads neighbours, and keydown handles Escape, arrows and the Tab trap."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Production notes:</strong> <span style="color:#f0e2c8;">"In a real app I would render it with the CDK Overlay and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cdkTrapFocus</code>, or start from native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;dialog&gt;</code>, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model()</code> for the index."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@ViewChildren</code> to find the thumbnail on close?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You could query all thumbnails and focus the one at the opening index, but saving <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">currentTarget</code> at click time is simpler and survives the grid re-ordering while the lightbox is open.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the CDK Overlay add?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It attaches the overlay to a container at the end of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">body</code>, handles positioning and backdrop clicks, and offers scroll strategies such as blocking page scroll, so you do not hand-write the portal or the lock.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make Back close it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put the index in a query parameter with the router; opening navigates to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?photo=3</code>, closing navigates back, and the gallery derives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">openIndex</code> from the route.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the focus trap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Create the component with TestBed, click a thumbnail, focus the last dialog button, dispatch a Tab keydown on it and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code> is the Close button.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lightbox** | Modal overlay showing one item large |
| **x / xChange** | Input and output pair that enables \`[(x)]\` two-way binding |
| **Focus trap** | Tab cycles inside the dialog |
| **Focus restore** | Focus returns to the opener on close |
| **Scroll lock** | Stop the page behind the overlay from scrolling |
| **CDK Overlay** | Angular CDK service that renders overlays at the end of \`body\` |

---
**Conclusion:** In Angular the gallery owns an \`openIndex\` signal and remembers the opener from \`$event.currentTarget\`; the lightbox is created by \`@if\`, controlled through \`[index]\` and \`(indexChange)\`, focuses Close and locks scroll in \`ngAfterViewInit\`, restores in \`ngOnDestroy\`, traps Tab, and preloads neighbours in \`ngOnChanges\`. Verified on Angular 22.2.3 under AOT and JIT, it matches the React and Vue builds line for line; the one structural difference is that it renders in place rather than in a portal, which a real app would solve with the CDK Overlay.`,
        files: {
          "/src/app/app.component.ts": `import { Component, signal } from "@angular/core";
import { LightboxComponent } from "./components/lightbox.component";
import { photos } from "./data/photos";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [LightboxComponent],
  template: \`
    <main class="app">
      <h1>Photo gallery</h1>
      <p class="hint">Click a photo. In the lightbox use the arrows or Left / Right keys, Esc or the backdrop to close.</p>
      <ul class="grid" data-testid="grid">
        @for (p of photos; track p.id; let i = $index) {
          <li>
            <button
              type="button"
              class="thumb"
              data-testid="thumb"
              [attr.aria-label]="'Open ' + p.title"
              (click)="open(i, $event)"
            >
              <img [src]="p.src" alt="" loading="lazy" />
            </button>
          </li>
        }
      </ul>
      @if (openIndex() !== null) {
        <app-lightbox
          [items]="photos"
          [index]="openIndex()!"
          (indexChange)="openIndex.set($event)"
          (closed)="close()"
        />
      }
    </main>
  \`,
  styles: [
    \`
    :host { display: block; min-height: 100vh; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
    .app { max-width: 900px; margin: 0 auto; padding: 16px; }
    h1 { font-size: 1.2rem; }
    .hint { color: #8a93a6; font-size: 0.85rem; }
    .grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
    .thumb { display: block; width: 100%; padding: 0; border: 0; border-radius: 8px; overflow: hidden; cursor: zoom-in; background: #181b22; aspect-ratio: 16 / 9; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.2s; }
    .thumb:hover img { transform: scale(1.05); }
    .thumb:focus-visible { outline: 2px solid #7aa2ff; outline-offset: 2px; }
  \`,
  ],
})
export class AppComponent {
  readonly photos = photos;
  readonly openIndex = signal<number | null>(null); // null = closed
  private opener: HTMLElement | null = null; // the thumbnail that opened it

  open(i: number, e: MouseEvent): void {
    this.opener = e.currentTarget as HTMLElement;
    this.openIndex.set(i);
  }

  close(): void {
    this.openIndex.set(null);
    if (this.opener) this.opener.focus(); // give focus back
  }
}
`,
          "/src/app/components/lightbox.component.ts": `import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  Output,
  ViewChild,
} from "@angular/core";
import { Photo } from "../data/photos";

// Controlled: the parent owns index ([(index)] two-way binding); we only ask
// to change it through indexChange.
@Component({
  selector: "app-lightbox",
  standalone: true,
  template: \`
    <div class="backdrop" data-testid="backdrop" (click)="onBackdrop($event)">
      <div
        #dialog
        class="lightbox"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lightbox-title"
        data-testid="lightbox"
        (keydown)="onKeydown($event)"
      >
        <button
          #closeBtn
          type="button"
          class="close"
          data-testid="close"
          aria-label="Close"
          (click)="closed.emit()"
        >✕</button>
        <figure>
          <img [src]="items[index].src" [alt]="items[index].alt" />
          <figcaption>
            <span id="lightbox-title">{{ items[index].title }}</span>
            <span
              data-testid="counter"
              aria-live="polite"
            >{{ index + 1 }} / {{ items.length }}</span>
          </figcaption>
        </figure>
        <button
          type="button"
          class="nav prev"
          data-testid="prev"
          aria-label="Previous photo"
          (click)="go(index - 1)"
        >‹</button>
        <button
          type="button"
          class="nav next"
          data-testid="next"
          aria-label="Next photo"
          (click)="go(index + 1)"
        >›</button>
      </div>
    </div>
  \`,
  styles: [
    \`
    .backdrop { position: fixed; inset: 0; z-index: 10; background: rgba(5, 6, 10, 0.88); display: flex; align-items: center; justify-content: center; padding: 16px; }
    .lightbox { position: relative; width: min(960px, 100%); }
    figure { margin: 0; }
    img { width: 100%; max-height: 80vh; object-fit: contain; display: block; border-radius: 8px; }
    figcaption { display: flex; justify-content: space-between; padding: 8px 2px; color: #cfd6e4; }
    button { border: 0; border-radius: 50%; width: 42px; height: 42px; background: rgba(0, 0, 0, 0.6); color: #fff; font-size: 22px; cursor: pointer; }
    button:focus-visible { outline: 2px solid #7aa2ff; outline-offset: 2px; }
    .close { position: absolute; top: 8px; right: 8px; z-index: 1; }
    .nav { position: absolute; top: 45%; transform: translateY(-50%); }
    .prev { left: 8px; }
    .next { right: 8px; }
  \`,
  ],
})
export class LightboxComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input({ required: true }) items: Photo[] = [];
  @Input({ required: true }) index = 0;
  @Output() indexChange = new EventEmitter<number>();
  @Output() closed = new EventEmitter<void>();
  @ViewChild("dialog", { static: true }) dialog!: ElementRef<HTMLDivElement>;
  @ViewChild("closeBtn", { static: true })
  closeBtn!: ElementRef<HTMLButtonElement>;

  private prevOverflow = "";
  // per open lightbox; each file fetched once
  private preloaded = new Set<string>();

  // Move focus in on open; lock page scroll while open, restore the old value.
  ngAfterViewInit(): void {
    this.closeBtn.nativeElement.focus();
    this.prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  ngOnDestroy(): void {
    document.body.style.overflow = this.prevOverflow;
  }

  // Preload the neighbours so next / previous feel instant.
  ngOnChanges(): void {
    this.preloaded.add(this.items[this.index].src); // on screen already
    for (const j of [this.index - 1, this.index + 1]) {
      const src = this.items[this.wrap(j)].src;
      if (this.preloaded.has(src)) continue;
      this.preloaded.add(src);
      new Image().src = src;
    }
  }

  wrap(i: number): number {
    const n = this.items.length;
    return ((i % n) + n) % n;
  }

  go(i: number): void {
    this.indexChange.emit(this.wrap(i));
  }

  onBackdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.closed.emit();
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      this.closed.emit();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      this.go(this.index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      this.go(this.index - 1);
    } else if (e.key === "Tab") {
      // Focus trap: wrap Tab / Shift+Tab inside the dialog.
      const f = this.dialog.nativeElement.querySelectorAll("button");
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
}
`,
          "/src/app/data/photos.ts": `// Offline photos: inline SVG data URLs, so the demo needs no network.
// Tiny markup helper: el("rect", { width: 9 }) gives <rect width="9"/>.
function el(
  tag: string,
  attrs: Record<string, string | number>,
  children?: string[],
): string {
  const a = Object.keys(attrs)
    .map((k) => " " + k + '="' + attrs[k] + '"')
    .join("");
  return children
    ? "<" + tag + a + ">" + children.join("") + "</" + tag + ">"
    : "<" + tag + a + "/>";
}

function svgPhoto(hue: number, title: string, n: number): string {
  const svg = el(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 800,
      height: 450,
      viewBox: "0 0 800 450",
    },
    [
      el("defs", {}, [
        el("linearGradient", { id: "g", x1: 0, y1: 0, x2: 1, y2: 1 }, [
          el("stop", { offset: 0, "stop-color": "hsl(" + hue + ",70%,55%)" }),
          el("stop", {
            offset: 1,
            "stop-color": "hsl(" + (hue + 50) + ",65%,28%)",
          }),
        ]),
      ]),
      el("rect", { width: 800, height: 450, fill: "url(#g)" }),
      el("circle", {
        cx: 640,
        cy: 120,
        r: 70,
        fill: "hsla(" + (hue + 180) + ",80%,85%,0.55)",
      }),
      el("path", {
        d: "M0 450 L220 250 L360 370 L520 220 L800 450 Z",
        fill: "hsla(" + hue + ",40%,14%,0.7)",
      }),
      el(
        "text",
        {
          x: 40,
          y: 80,
          "font-family": "sans-serif",
          "font-size": 48,
          fill: "white",
        },
        [n + ". " + title],
      ),
    ],
  );
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const titles = [
  "Sunrise",
  "Harbour",
  "Pine ridge",
  "Red rocks",
  "Night sky",
  "Lavender",
  "Old town",
  "Waterfall",
  "Snow peak",
];

export interface Photo {
  id: number;
  title: string;
  alt: string;
  src: string;
}

export const photos: Photo[] = titles.map((title, i) => ({
  id: i + 1,
  title,
  alt: title + ", illustration " + (i + 1),
  src: svgPhoto((i * 40 + 10) % 360, title, i + 1),
}));
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Canvas Drawing Board",
    seoDescription:
      "Build a canvas drawing board in React, Vue and Angular: pointer events, strokes as data, undo / redo / clear, eraser, HiDPI and PNG export, verified.",
    description: `**Question presented to candidate:**
"Build a simple drawing board, like a whiteboard: the user draws freehand on a \`<canvas>\` with a mouse, pen or finger, picks a colour and a brush size, can switch to an eraser, and has Undo, Redo and Clear buttons plus Ctrl+Z / Ctrl+Shift+Z. Finally they can export the drawing as a PNG. Walk me through how you store the drawing so that undo works."

**Requirements:**
- A canvas that stays sharp on high-density screens and scales with its container.
- Freehand strokes with Pointer Events (mouse, pen, touch); a tap draws a dot.
- Colour swatches, a size slider (2 to 40 px) and an eraser.
- Undo, Redo and Clear, where Clear itself can be undone; a new stroke after an undo discards the redo history.
- Keyboard shortcuts Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or Ctrl+Y).
- Export to PNG on a white background, offered as a download link.

**What a strong answer should cover:**
- Strokes stored as data (colour, size, tool, points) rather than pixel snapshots, and why that makes undo, redo and redraw cheap and exact.
- Two stacks (done / undone) and the rule that any new action clears redo; Clear modelled as an action.
- Drawing the live stroke incrementally from a ref or plain variable (no re-render per \`pointermove\`), then a full repaint from data on commit, undo or redo.
- \`setPointerCapture\`, \`touch-action: none\`, \`getCoalescedEvents()\` for smooth fast strokes, and mapping client coordinates to canvas coordinates.
- \`devicePixelRatio\` scaling, \`destination-out\` for the eraser, and compositing on white for export.
- Trade-offs: replay cost for very long histories (snapshots or an offscreen cache), and memory if you stored \`ImageData\` instead.

**Clarifying questions expected:**
- "How long can a session get? Thousands of strokes changes the redraw strategy."
- "Should the drawing survive a reload, or be shared live with other users?"
- "Does the eraser need to erase to transparent or to the background colour?"

**Code / implementation expected:** Yes. A working board with pointer drawing, stroke history with undo / redo / clear, tools and export.`,
    frameworks: {
      // ── react ───────────────────────────────────────────────────────
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a hard machine coding round. Assumes React hooks; the Canvas 2D API, Pointer Events and the history model are explained from zero.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain words, then tagged with <code>📌 Interview term:</code>. The output in section 6 comes from running the solution on React 19.3.1: the history logic in jsdom with a recording fake 2D context, and the real pixels in headless Chromium 141.

## 1. Why This Even Matters — A Story First

Imagine two ways to keep a diary of a painting. In the first, you photograph the canvas after every brush stroke and keep a shoebox of photos; undo means "pull out the previous photo". In the second, you write down each stroke ("red, 6 px, from here to here to here"); undo means "cross out the last line and repaint from the list".

The shoebox gets heavy fast: an 800 × 500 canvas at double density is 1600 × 1000 pixels × 4 bytes, about 6.4 MB per photo. The written list is a few hundred bytes per stroke, can be replayed at any size, and can be saved or sent to a collaborator. That written list is the heart of a good drawing board, and it is what interviewers mean when they ask "how do you store the drawing so undo works?"

📌 **Interview term: Retained (vector) model vs immediate (raster) model** — the canvas itself is immediate-mode: it only remembers pixels, not shapes. Keeping your own list of strokes gives you a retained model on top, from which the pixels can always be rebuilt.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How long can a session get? | Replaying 10,000 strokes on every undo gets slow; you would add periodic snapshots or an offscreen cache. |
| Must it survive reload, or be collaborative? | Strokes as JSON make both possible: \`localStorage\`, or sending each stroke over a socket. |
| Eraser: to transparent, or paint with the background? | Transparent needs \`destination-out\` and compositing on export; background-colour painting is simpler but breaks on a coloured background. |
| Pressure-sensitive pens? | Pointer Events expose \`pressure\`; you would store it per point and vary the width. |
| Is Clear undoable? | Usually yes, which means Clear is an action in the history, not a wipe of it. |
| Export format and background? | PNG keeps transparency; a white background must be composited explicitly. |

## 3. Requirements and Plan

**Component tree:** \`App\` → \`DrawingBoard\` (toolbar, canvas, status, export preview). The pure history logic lives in \`src/utils/history.js\`, with no React in it, so it can be tested on its own and reused unchanged in the Vue build.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 250" role="img" aria-label="Pointer events build the live stroke in a ref and draw each new segment; on pointerup the stroke is committed to the done stack; undo and redo move items between done and undone; every history change triggers a full repaint from the visible strokes">
  <defs>
    <marker id="dbr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="60" text-anchor="middle">pointer events</text>
  <text class="d-sub" x="105" y="82" text-anchor="middle">live stroke in a ref</text>
  <rect class="d-box-accent" x="270" y="30" width="180" height="70" rx="10"/>
  <text class="d-text d-accent" x="360" y="60" text-anchor="middle">done stack</text>
  <text class="d-sub" x="360" y="82" text-anchor="middle">strokes and clears</text>
  <rect class="d-box" x="270" y="160" width="180" height="70" rx="10"/>
  <text class="d-text" x="360" y="190" text-anchor="middle">undone stack</text>
  <text class="d-sub" x="360" y="212" text-anchor="middle">emptied by new actions</text>
  <rect class="d-box" x="530" y="30" width="170" height="70" rx="10"/>
  <text class="d-text" x="615" y="60" text-anchor="middle">full repaint</text>
  <text class="d-sub" x="615" y="82" text-anchor="middle">after last clear</text>
  <path class="d-edge-accent" d="M 190 65 L 262 65" marker-end="url(#dbr-arrow)"/>
  <text class="d-sub" x="226" y="52" text-anchor="middle">commit</text>
  <path class="d-edge" d="M 330 100 L 330 152" marker-end="url(#dbr-arrow)"/>
  <text class="d-sub" x="300" y="132" text-anchor="middle">undo</text>
  <path class="d-edge" d="M 390 160 L 390 108" marker-end="url(#dbr-arrow)"/>
  <text class="d-sub" x="420" y="132" text-anchor="middle">redo</text>
  <path class="d-edge" d="M 450 65 L 522 65" marker-end="url(#dbr-arrow)"/>
</svg>

| Value | Where | Why |
| :--- | :--- | :--- |
| \`history\` (\`{ done, undone }\`) | \`useReducer\` | All undo logic as pure transitions |
| \`color\`, \`size\`, \`erase\`, \`exportUrl\` | \`useState\` | Toolbar and preview |
| The stroke being drawn | \`useRef\` | Changes on every \`pointermove\`; must not re-render |
| The 2D context | \`useRef\`, created lazily | Expensive to look up, never rendered |
| Visible strokes | Derived with \`visibleStrokes(done)\` | Everything after the last Clear |

📌 **Interview term: \`useReducer\`** — keeps state transitions in one pure function \`(state, action) => newState\`. Undo, redo and commit are three cases of one reducer, easy to test without rendering ([useState vs useReducer](/interview-question/what-is-the-difference-between-usestate-and-usereducer)).

## 4. Build It Step by Step

### Step 1: The history as plain data

~~~js
export function historyReducer(state, action) {
  switch (action.type) {
    case "commit": // a finished stroke, or a clear
      return { done: [...state.done, action.item], undone: [] };
    case "undo":
      if (!state.done.length) return state;
      return {
        done: state.done.slice(0, -1),
        undone: [...state.undone, state.done[state.done.length - 1]],
      };
    case "redo":
      if (!state.undone.length) return state;
      return {
        done: [...state.done, state.undone[state.undone.length - 1]],
        undone: state.undone.slice(0, -1),
      };
    default:
      return state;
  }
}

export function visibleStrokes(done) {
  let start = 0;
  done.forEach((a, i) => {
    if (a.type === "clear") start = i + 1;
  });
  return done.slice(start);
}
~~~

📌 **Interview term: Undo / redo stacks** — \`done\` holds actions in order; undo moves the newest to \`undone\`; redo moves it back. **Any new action empties \`undone\`**, because redoing a stroke on top of a history that has since changed would make no sense. The same model drives a text editor's undo ([undo / redo command stack](/interview-question/build-an-undo-redo-command-stack-for-a-text-editor)).

Clear is not "empty the arrays"; it is an action \`{ type: "clear" }\` pushed onto \`done\`. The board shows only what comes after the last clear, so undoing a clear brings the drawing back. Every transition returns new arrays rather than mutating, so React sees a new \`history\` object and the repaint effect runs ([why state updates must be immutable](/interview-question/why-must-react-state-updates-be-immutable)).

A stroke is \`{ type: "stroke", color, size, erase, points: [[x, y], ...] }\`, stored in fixed **logical units** (800 × 500), so it does not depend on the CSS size of the canvas or the screen density.

### Step 2: A sharp canvas on any screen

~~~jsx
const W = 800; // logical drawing size
const H = 500;
const dpr = window.devicePixelRatio || 1;

<canvas ref={canvasRef} width={W * dpr} height={H * dpr} className="canvas" ... />

function getCtx() {
  if (!ctxRef.current) {
    const ctx = canvasRef.current.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in logical units
    ctxRef.current = ctx;
  }
  return ctxRef.current;
}
~~~

📌 **Interview term: \`devicePixelRatio\` (DPR)** — how many physical pixels make up one CSS pixel (2 on most phones). A canvas whose backing store matches its CSS size looks blurry on such screens. Making the backing store \`W * dpr\` wide and scaling the context by \`dpr\` keeps lines crisp while all drawing code still uses logical units. The CSS gives it \`width: 100%\` and \`aspect-ratio: 8 / 5\`.

The context is created **lazily**: an untouched board needs no paint, so the repaint effect returns early when there is nothing to draw and no context yet. That is also why the jsdom run below can count exactly when \`getContext\` is first called.

### Step 3: Drawing with Pointer Events

~~~jsx
function toPoint(e) {
  const r = canvasRef.current.getBoundingClientRect();
  const sx = r.width ? W / r.width : 1;
  const sy = r.height ? H / r.height : 1;
  return [
    Math.round((e.clientX - r.left) * sx),
    Math.round((e.clientY - r.top) * sy),
  ];
}

function onPointerDown(e) {
  if (e.button !== 0) return;
  if (e.currentTarget.setPointerCapture)
    e.currentTarget.setPointerCapture(e.pointerId);
  current.current = {
    type: "stroke",
    color,
    size,
    erase,
    points: [toPoint(e)],
  };
  drawStroke(getCtx(), current.current); // the dot shows at once
}

function onPointerMove(e) {
  const s = current.current;
  if (!s) return;
  const events = e.nativeEvent.getCoalescedEvents
    ? e.nativeEvent.getCoalescedEvents()
    : [];
  const ctx = getCtx();
  for (const ev of events.length ? events : [e]) {
    const p = toPoint(ev);
    const last = s.points[s.points.length - 1];
    s.points.push(p);
    // just the new segment
    drawStroke(ctx, { ...s, points: [last, p] });
  }
}

function onPointerUp() {
  if (!current.current) return;
  dispatch({ type: "commit", item: current.current });
  current.current = null;
}
~~~

📌 **Interview term: Pointer Events and pointer capture** — one event family for mouse, pen and touch. \`setPointerCapture\` keeps delivering the stroke's events to the canvas even if the pointer leaves it, so the stroke does not get stuck "down". The canvas CSS has \`touch-action: none\` so a finger draws instead of scrolling the page.

📌 **Interview term: \`getCoalescedEvents()\`** — browsers often deliver only about one \`pointermove\` per frame (Chrome aligns them to animation frames), while the hardware may report several positions in between. This method returns all of them, so a fast flick becomes a smooth curve instead of a few straight segments.

The live stroke lives in a **ref**, not state: a \`pointermove\` can fire 60 or more times a second, and re-rendering React for each one would be wasted work, since the pixels are drawn directly. Only \`pointerup\` touches React state, once, with \`dispatch\`. \`toPoint\` maps CSS pixels to logical units, which is why a stroke drawn on a 368px-wide phone canvas replays correctly on a desktop.

### Step 4: Painting a stroke, eraser included

~~~js
export function drawStroke(ctx, s) {
  ctx.globalCompositeOperation = s.erase
    ? "destination-out"
    : "source-over";
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const [x0, y0] = s.points[0];
  if (s.points.length === 1) {
    ctx.beginPath();
    ctx.arc(x0, y0, s.size / 2, 0, Math.PI * 2); // a tap is a dot
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (let i = 1; i < s.points.length; i++)
    ctx.lineTo(s.points[i][0], s.points[i][1]);
  ctx.stroke();
}
~~~

📌 **Interview term: \`globalCompositeOperation\`** — decides how new drawing combines with existing pixels. \`source-over\` paints on top; \`destination-out\` removes existing pixels where you draw, which is a true eraser that leaves transparency, so the white CSS background shows through.

A single-point stroke would be a zero-length path that draws nothing, so taps become filled circles of the brush diameter.

### Step 5: Full repaint, shortcuts and export

~~~jsx
useEffect(() => {
  const strokes = visibleStrokes(history.done);
  if (!ctxRef.current && !strokes.length) return;
  const ctx = getCtx();
  ctx.clearRect(0, 0, W, H);
  strokes.forEach((s) => drawStroke(ctx, s));
}, [history]);
~~~

Every history change repaints from data. That is simple and exact; its cost grows with the history (it was not benchmarked here), so for very long sessions you would cache a bitmap of everything except the last N strokes. A \`window\` \`keydown\` listener (added and removed in an effect) maps Ctrl/Cmd+Z to undo and Ctrl/Cmd+Shift+Z or Ctrl+Y to redo.

~~~jsx
function exportPng() {
  const out = document.createElement("canvas");
  out.width = canvasRef.current.width;
  out.height = canvasRef.current.height;
  const octx = out.getContext("2d");
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(canvasRef.current, 0, 0);
  setExportUrl(out.toDataURL("image/png"));
}
~~~

Erased pixels are transparent, so the export composites the drawing onto white in an offscreen canvas. The result is shown as a thumbnail and a \`<a download="drawing.png">\` link rather than a programmatic click, which also works in sandboxed iframes like the playground that may block automatic downloads. For a big canvas, \`toBlob\` plus \`URL.createObjectURL\` avoids a very long data URL string.

## 5. Strokes vs Snapshots

| | Strokes as data (this build) | \`ImageData\` snapshot per action |
| :--- | :--- | :--- |
| Memory per action | Bytes per point | About 6.4 MB at 1600 × 1000 |
| Undo | Pop and replay | Put the previous snapshot back |
| Resize / DPR change | Replays sharp at any size | Snapshots are fixed-size bitmaps |
| Save, sync, collaborate | JSON | Large binary blobs |
| Cost that grows | Replay time with history length | Memory with history length |
| Best for | Whiteboards, signatures, diagrams | Pixel tools such as flood fill or filters |

Real apps often combine them: strokes as the source of truth, plus a cached bitmap every 100 strokes so undo replays at most 100.

## 6. Verified

jsdom has no 2D context: calling \`getContext\` there logs "Not implemented" through \`console.error\`, and \`toDataURL\` is missing. So the driver installs a **recording fake context** on \`HTMLCanvasElement.prototype\` (it counts \`beginPath\`, \`lineTo\`, \`arc\`, \`stroke\`, \`fill\`, \`clearRect\` and records \`strokeStyle\`, \`lineWidth\` and the composite mode), fakes \`toDataURL\`, and draws with synthetic \`PointerEvent\`s. jsdom has no layout, so \`getBoundingClientRect()\` is all zeros and points map 1:1. Mounted with \`<StrictMode>\`:

\`\`\`text
mount   : On the board: 0 · undo steps: 0 · redo steps: 0 | getContext calls 0 | undo off | redo off | clear off | canvas 800x500
stroke 1: On the board: 1 · undo steps: 1 · redo steps: 0
  while moving: clearRect 0, beginPath 4, lineTo 3, arc 1, stroke 3, fill 1 | on release: clearRect 1, beginPath 1, lineTo 3, arc 0, stroke 1, fill 0 | style ["#ff6b6b",6,"source-over"]
tap dot : On the board: 2 · undo steps: 2 · redo steps: 0 | fill [["#4dabf7","source-over"]] | arc radius 10
eraser  : On the board: 3 · undo steps: 3 · redo steps: 0 | last op ["#4dabf7",20,"destination-out"]
undo    : On the board: 2 · undo steps: 2 · redo steps: 1 | repaint: clearRect 1, beginPath 2, lineTo 3, arc 1, stroke 1, fill 1 | undo on | redo on | clear on
undo    : On the board: 1 · undo steps: 1 · redo steps: 2
redo    : On the board: 2 · undo steps: 2 · redo steps: 1 | repaint: clearRect 1, beginPath 2, lineTo 3, arc 1, stroke 1, fill 1
clear   : On the board: 0 · undo steps: 3 · redo steps: 0 | repaint: clearRect 1, beginPath 0, lineTo 0, arc 0, stroke 0, fill 0 | undo on | redo off | clear off
undo clear: On the board: 2 · undo steps: 2 · redo steps: 1 | repaint: clearRect 1, beginPath 2, lineTo 3, arc 1, stroke 1, fill 1
Ctrl+Z  : On the board: 1 · undo steps: 1 · redo steps: 2
Ctrl+Shift+Z: On the board: 2 · undo steps: 2 · redo steps: 1
Ctrl+Z  : On the board: 1 · undo steps: 1 · redo steps: 2
new stroke after undo: On the board: 2 · undo steps: 2 · redo steps: 0 | undo on | redo off | clear on
export  : clearRect 0, beginPath 0, lineTo 0, arc 0, stroke 0, fill 0 | white fill [0,0,800,500] | drawImage 1 | link drawing.png data:image/png;base64,RkFLRQ==
getContext calls in total: 2
\`\`\`

What this proves: no context was created on mount; a 4-point stroke drew a dot and three live segments while moving and exactly one full repaint on release; the tap drew a 10px-radius dot for a 20px brush; the eraser used \`destination-out\`; every undo, redo and clear repainted from data; Clear was undoable and made Redo unavailable; a new stroke after an undo emptied the redo stack; and export filled white before drawing the board. Two \`getContext\` calls: one for the board, cached, and one for the export canvas.

The fake proves which calls are made, not what the pixels look like, so the same build was run in **headless Chromium 141** with a real mouse, reading pixels back with \`getImageData\`:

\`\`\`text
canvas css 368x230 | backing 800x500 at devicePixelRatio 1
before   : pixel 0,0,0,0
drawn    : On the board: 1 · undo steps: 1 · redo steps: 0 | pixel 255,107,107,255
erased   : On the board: 2 · undo steps: 2 · redo steps: 0 | pixel 0,0,0,0 | pixel 100px left 255,107,107,255
undo     : On the board: 1 · undo steps: 1 · redo steps: 1 | pixel 255,107,107,255
undo     : On the board: 0 · undo steps: 0 · redo steps: 2 | pixel 0,0,0,0
Ctrl+Shift+Z: On the board: 1 · undo steps: 1 · redo steps: 1 | pixel 255,107,107,255
export   : data:image/png;base64,... | decoded 800x500 | corner pixel 255,255,255,255
\`\`\`

The red stroke really painted \`255,107,107\` (the \`#ff6b6b\` swatch), the eraser cut a transparent hole only where it passed, undo and redo restored the exact pixels, and the exported PNG decoded at 800 × 500 with a white corner. Re-run at \`deviceScaleFactor: 2\`, the backing store was 1600 × 1000 and the export decoded at 1600 × 1000. Not tested: real touch or pen input and pressure.

## 7. Edge Cases and Accessibility

| Case | Behaviour |
| :--- | :--- |
| Tap without moving | Filled dot of the brush diameter |
| Pointer leaves the canvas mid-stroke | Pointer capture keeps the stroke going until release |
| Touch | \`touch-action: none\` stops the page scrolling while drawing |
| Undo with nothing to undo | Reducer returns the same state; button disabled |
| High-DPI screen | Backing store × DPR, context scaled, strokes in logical units |
| Screen readers | Canvas has \`role="img"\` and a label with the stroke count; the status line is a polite live region; toolbar buttons use \`aria-pressed\` |
| Keyboard | All tools are buttons and a range input; Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y |

A canvas cannot be drawn on with a keyboard; say so, and offer the alternative (for a signature pad, a typed-name fallback).

## 8. Common Pitfalls

- **Storing every \`pointermove\` in React state.** Re-renders 60+ times a second; keep the live stroke in a ref and commit once.
- **Undo by snapshotting \`ImageData\` each time.** Megabytes per step and blurry after a resize; store strokes.
- **Forgetting to clear redo on a new action.** Redo then replays a stroke onto a history it never belonged to.
- **Clear that wipes the history arrays.** It can no longer be undone; make it an action.
- **A canvas sized only with CSS.** The backing store stays 300 × 150 and stretches blurrily; set \`width\` / \`height\` attributes times DPR.
- **Using \`clientX\` directly as canvas coordinates.** Wrong as soon as the canvas is offset or scaled; subtract the rect and scale.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data model first:</strong> <span style="color:#f0e2c8;">"I store strokes, not pixels: colour, size, eraser flag and points in fixed logical units. The canvas is just a view I can always rebuild."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. History:</strong> <span style="color:#f0e2c8;">"A pure reducer with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">done</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undone</code> stacks. Commit pushes and empties redo, undo and redo move one item, and Clear is an action, so it can be undone."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Drawing:</strong> <span style="color:#f0e2c8;">"Pointer Events with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setPointerCapture</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">touch-action: none</code>. The live stroke lives in a ref; each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pointermove</code>, including coalesced events, draws one segment, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pointerup</code> dispatches a single commit."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Rendering:</strong> <span style="color:#f0e2c8;">"An effect on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">history</code> clears and replays the visible strokes. The backing store is width times <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">devicePixelRatio</code> with a scaled context, and the eraser uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">destination-out</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Finish:</strong> <span style="color:#f0e2c8;">"Ctrl+Z and Ctrl+Shift+Z on window, export by compositing onto white in an offscreen canvas, and I would mention snapshots for very long sessions."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Replaying every stroke on undo: what if there are 10,000?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a cached bitmap, for example in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OffscreenCanvas</code>, of everything up to a checkpoint every 100 strokes. Undo replays from the nearest checkpoint, so the cost is bounded.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make lines smoother?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the coalesced events, then draw quadratic curves through midpoints instead of straight <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lineTo</code> segments, and optionally vary width with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pressure</code> for pens.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add real-time collaboration?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each committed stroke is JSON, so broadcast it over a WebSocket and append remote strokes to the history. Give strokes ids and authors; undo then removes your own last stroke, not simply the last one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you persist the drawing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Save <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">history.done</code> as JSON to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code> or a server, debounced after each commit, and load it back on mount. Store points rounded to integers to keep it small.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test something drawn on a canvas?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Test the reducer as pure functions, test the component with a fake context that records calls, as in the Verified section, and keep a few real-browser tests that compare pixels or screenshots.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Retained vs immediate model** | Keeping your own list of shapes vs only the pixels |
| **Undo / redo stacks** | \`done\` and \`undone\`; new actions empty \`undone\` |
| **devicePixelRatio** | Physical pixels per CSS pixel |
| **Pointer capture** | Route a pointer's later events to one element |
| **getCoalescedEvents** | All hardware positions merged into one \`pointermove\` |
| **globalCompositeOperation** | How new drawing combines with existing pixels |
| **destination-out** | Composite mode that erases to transparency |

---
**Conclusion:** A drawing board is a small vector app on top of an immediate-mode canvas. Store each stroke as data in logical units, keep a \`done\` and an \`undone\` stack in a pure reducer where Clear is just another action and any new action empties redo, draw the live stroke incrementally from a ref, and repaint everything from data when the history changes. Scale the backing store by \`devicePixelRatio\`, erase with \`destination-out\`, and composite on white to export. Verified on React 19.3.1 with a recording context in jsdom and with real pixels in Chromium 141, undo, redo, clear-undo, the eraser and export all behaved exactly as designed.`,
        files: {
          "/App.js": `import DrawingBoard from "./src/components/DrawingBoard";

export default function App() {
  return (
    <main className="app">
      <h1>Drawing board</h1>
      <DrawingBoard />
      <p className="hint">
        Draw with a mouse, pen or finger. Ctrl+Z undoes, Ctrl+Shift+Z or Ctrl+Y
        redoes.
      </p>
    </main>
  );
}
`,
          "/src/components/DrawingBoard.js": `import { useEffect, useReducer, useRef, useState } from "react";
import {
  initialHistory,
  historyReducer,
  visibleStrokes,
  drawStroke,
} from "../utils/history";

const W = 800; // logical drawing size: points are stored in these units,
const H = 500; // so strokes survive any CSS size or devicePixelRatio
const COLORS = ["#f5f5f5", "#ff6b6b", "#ffd166", "#06d6a0", "#4dabf7"];

export default function DrawingBoard() {
  const [history, dispatch] = useReducer(historyReducer, initialHistory);
  const [color, setColor] = useState(COLORS[1]);
  const [size, setSize] = useState(6);
  const [erase, setErase] = useState(false);
  const [exportUrl, setExportUrl] = useState(null);

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const current = useRef(null); // the stroke being drawn: a ref, not state
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  function getCtx() {
    if (!ctxRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in logical units
      ctxRef.current = ctx;
    }
    return ctxRef.current;
  }

  // Full repaint from data whenever the history changes (undo, redo, clear).
  // An untouched board needs no paint, so the context is created lazily.
  useEffect(() => {
    const strokes = visibleStrokes(history.done);
    if (!ctxRef.current && !strokes.length) return;
    const ctx = getCtx();
    ctx.clearRect(0, 0, W, H);
    strokes.forEach((s) => drawStroke(ctx, s));
  }, [history]);

  // Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo.
  useEffect(() => {
    function onKey(e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "undo" });
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        dispatch({ type: "redo" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toPoint(e) {
    const r = canvasRef.current.getBoundingClientRect();
    const sx = r.width ? W / r.width : 1;
    const sy = r.height ? H / r.height : 1;
    return [
      Math.round((e.clientX - r.left) * sx),
      Math.round((e.clientY - r.top) * sy),
    ];
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    if (e.currentTarget.setPointerCapture)
      e.currentTarget.setPointerCapture(e.pointerId);
    current.current = {
      type: "stroke",
      color,
      size,
      erase,
      points: [toPoint(e)],
    };
    drawStroke(getCtx(), current.current); // the dot shows at once
  }

  function onPointerMove(e) {
    const s = current.current;
    if (!s) return;
    // Fast pointers deliver several positions per event: use them all.
    const events = e.nativeEvent.getCoalescedEvents
      ? e.nativeEvent.getCoalescedEvents()
      : [];
    const list = events.length ? events : [e];
    const ctx = getCtx();
    for (const ev of list) {
      const p = toPoint(ev);
      const last = s.points[s.points.length - 1];
      s.points.push(p);
      // Draw just the new segment; the full repaint happens on commit.
      drawStroke(ctx, { ...s, points: [last, p] });
    }
  }

  function onPointerUp() {
    if (!current.current) return;
    dispatch({ type: "commit", item: current.current });
    current.current = null;
  }

  function exportPng() {
    // Composite on white: erased pixels are transparent on the live canvas.
    const out = document.createElement("canvas");
    out.width = canvasRef.current.width;
    out.height = canvasRef.current.height;
    const octx = out.getContext("2d");
    octx.fillStyle = "#ffffff";
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(canvasRef.current, 0, 0);
    setExportUrl(out.toDataURL("image/png"));
  }

  const strokes = visibleStrokes(history.done);

  return (
    <div className="board">
      <div className="toolbar" role="toolbar" aria-label="Drawing tools">
        <div className="swatches">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="swatch"
              style={{ background: c }}
              aria-label={"Colour " + c}
              aria-pressed={!erase && color === c}
              onClick={() => {
                setColor(c);
                setErase(false);
              }}
            />
          ))}
        </div>
        <label className="size">
          Size
          <input
            type="range"
            min="2"
            max="40"
            value={size}
            data-testid="size"
            onChange={(e) => setSize(Number(e.target.value))}
          />
          <span>{size}px</span>
        </label>
        <button
          type="button"
          data-testid="eraser"
          aria-pressed={erase}
          onClick={() => setErase((v) => !v)}
        >
          Eraser
        </button>
        <button
          type="button"
          data-testid="undo"
          disabled={!history.done.length}
          onClick={() => dispatch({ type: "undo" })}
        >
          Undo
        </button>
        <button
          type="button"
          data-testid="redo"
          disabled={!history.undone.length}
          onClick={() => dispatch({ type: "redo" })}
        >
          Redo
        </button>
        <button
          type="button"
          data-testid="clear"
          disabled={!strokes.length}
          onClick={() => dispatch({ type: "commit", item: { type: "clear" } })}
        >
          Clear
        </button>
        <button type="button" data-testid="export" onClick={exportPng}>
          Export PNG
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="canvas"
        data-testid="canvas"
        width={W * dpr}
        height={H * dpr}
        role="img"
        aria-label={"Drawing canvas, " + strokes.length + " strokes"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      <p className="status" data-testid="status" aria-live="polite">
        On the board: {strokes.length} · undo steps: {history.done.length} ·
        redo steps: {history.undone.length}
      </p>
      {exportUrl && (
        <div className="export">
          <img src={exportUrl} alt="Exported drawing preview" />
          <a href={exportUrl} download="drawing.png" data-testid="download">
            Download drawing.png
          </a>
        </div>
      )}
    </div>
  );
}
`,
          "/src/utils/history.js": `// Drawing history as plain data, so undo / redo / clear never touch pixels.
// done: actions in order ({ type: "stroke", ... } or { type: "clear" })
// undone: actions popped by undo, newest last; any new action empties it.
export const initialHistory = { done: [], undone: [] };

export function historyReducer(state, action) {
  switch (action.type) {
    case "commit": // a finished stroke, or a clear
      return { done: [...state.done, action.item], undone: [] };
    case "undo":
      if (!state.done.length) return state;
      return {
        done: state.done.slice(0, -1),
        undone: [...state.undone, state.done[state.done.length - 1]],
      };
    case "redo":
      if (!state.undone.length) return state;
      return {
        done: [...state.done, state.undone[state.undone.length - 1]],
        undone: state.undone.slice(0, -1),
      };
    default:
      return state;
  }
}

// Only what comes after the last "clear" is on the board.
export function visibleStrokes(done) {
  let start = 0;
  done.forEach((a, i) => {
    if (a.type === "clear") start = i + 1;
  });
  return done.slice(start);
}

export function drawStroke(ctx, s) {
  ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const [x0, y0] = s.points[0];
  if (s.points.length === 1) {
    // A tap is a dot: a zero-length path would draw nothing.
    ctx.beginPath();
    ctx.arc(x0, y0, s.size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (let i = 1; i < s.points.length; i++)
    ctx.lineTo(s.points[i][0], s.points[i][1]);
  ctx.stroke();
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 840px;
  margin: 0 auto;
  padding: 16px;
}
h1 {
  font-size: 1.2rem;
}
.hint {
  color: #8a93a6;
  font-size: 0.85rem;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}
.toolbar button {
  background: #2a3142;
  color: #e6e6e6;
  border: 1px solid #3d4760;
  border-radius: 6px;
  padding: 5px 10px;
  cursor: pointer;
}
.toolbar button:disabled {
  opacity: 0.4;
  cursor: default;
}
.toolbar button[aria-pressed="true"] {
  border-color: #7aa2ff;
  box-shadow: 0 0 0 1px #7aa2ff;
}
.toolbar button:focus-visible,
.toolbar input:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.swatches {
  display: flex;
  gap: 6px;
}
.toolbar .swatch {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  padding: 0;
}
.size {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #a8b3c7;
}
.size input {
  width: 90px;
}
.canvas {
  display: block;
  width: 100%;
  aspect-ratio: 8 / 5;
  background: #ffffff;
  border-radius: 8px;
  touch-action: none;
  cursor: crosshair;
}
.status {
  color: #a8b3c7;
  font-size: 0.85rem;
}
.export {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.export img {
  width: 160px;
  border-radius: 6px;
  border: 1px solid #3d4760;
}
.export a {
  color: #7aa2ff;
}
`,
        },
      },
      // ── vue ─────────────────────────────────────────────────────────
      vue: {
        answer: `**Target Audience:** Vue candidates preparing for a hard machine coding round. Assumes \`<script setup>\`, \`ref\`, \`computed\` and \`watch\`; the Canvas 2D API, Pointer Events and the history model are explained from zero.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then <code>📌 Interview term:</code> callouts. The Verified output comes from Vue 3.5.44: the history logic in jsdom with a recording fake 2D context, and the real pixels in headless Chromium 141.

## 1. A Story First

You can keep a painting's history as a shoebox of photos, one after every brush stroke, or as a written list of strokes ("red, 6 px, from here to here"). The photos are megabytes each and blur when the canvas is resized; the list is tiny, replays sharp at any size and can be saved or shared. A good drawing board keeps the list and treats the canvas pixels as a view it can always rebuild.

📌 **Interview term: Retained model over an immediate-mode canvas** — the canvas only remembers pixels; your own list of strokes is the source of truth.

## 2. The Vue State Model

The pure history logic lives in \`src/utils/history.js\` (no Vue in it): a reducer over \`{ done, undone }\`, \`visibleStrokes()\` (everything after the last Clear) and \`drawStroke()\`.

| Value | Vue tool | Why |
| :--- | :--- | :--- |
| \`history\` | \`shallowRef(initialHistory)\` | Replaced on every action, never mutated |
| \`strokes\` | \`computed(() => visibleStrokes(...))\` | Derived |
| \`color\`, \`size\`, \`erase\`, \`exportUrl\` | \`ref\` | Toolbar and preview |
| The live stroke | plain \`let current\` | Changes on every \`pointermove\`; must not be reactive |
| The 2D context | plain \`let ctx\`, created lazily | Never rendered |
| The canvas | \`useTemplateRef("canvas")\` | Needed for context, rect and export |

📌 **Interview term: \`shallowRef\`** — a ref that only tracks replacement of its \`.value\`, not changes deep inside it. Each action builds a new \`{ done, undone }\` object, so replacing \`.value\` is the only change that happens; a deep \`ref\` would wrap every stroke and every point array in a reactive proxy for nothing. See [when to use shallowRef](/interview-question/when-should-you-use-shallowref-shallowreactive-triggerref).

~~~js
const history = shallowRef(initialHistory);
const dispatch = (action) => {
  history.value = historyReducer(history.value, action);
};
const strokes = computed(() => visibleStrokes(history.value.done));
~~~

The reducer is the same file as the React build: commit pushes and empties \`undone\`, undo and redo move one item, and Clear is an action \`{ type: "clear" }\`, so it can be undone.

📌 **Interview term: Undo / redo stacks** — \`done\` and \`undone\`; any new action empties \`undone\`, because a redo onto a changed history makes no sense ([undo / redo command stack](/interview-question/build-an-undo-redo-command-stack-for-a-text-editor)).

## 3. Build It Step by Step

### Step 1: A sharp canvas

~~~vue
<canvas
  ref="canvas"
  class="canvas"
  :width="W * dpr"
  :height="H * dpr"
  role="img"
  :aria-label="'Drawing canvas, ' + strokes.length + ' strokes'"
  @pointerdown="onPointerdown"
  @pointermove="onPointermove"
  @pointerup="onPointerup"
  @pointercancel="onPointerup"
/>
~~~

📌 **Interview term: \`devicePixelRatio\`** — physical pixels per CSS pixel. The backing store is 800 × 500 logical units times DPR, and \`getCtx()\` calls \`ctx.setTransform(dpr, 0, 0, dpr, 0, 0)\` once so all drawing code works in logical units. Strokes are stored in those units too, so they replay identically on any screen.

### Step 2: Draw live without reactivity

~~~js
function onPointerdown(e) {
  if (e.button !== 0) return;
  if (e.currentTarget.setPointerCapture)
    e.currentTarget.setPointerCapture(e.pointerId);
  current = {
    type: "stroke",
    color: color.value,
    size: size.value,
    erase: erase.value,
    points: [toPoint(e)],
  };
  drawStroke(getCtx(), current); // the dot shows at once
}

function onPointermove(e) {
  if (!current) return;
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
  const c = getCtx();
  for (const ev of events.length ? events : [e]) {
    const p = toPoint(ev);
    const last = current.points[current.points.length - 1];
    current.points.push(p);
    // just the new segment
    drawStroke(c, { ...current, points: [last, p] });
  }
}

function onPointerup() {
  if (!current) return;
  dispatch({ type: "commit", item: current });
  current = null;
}
~~~

📌 **Interview term: Pointer capture** — \`setPointerCapture\` keeps routing the stroke's events to the canvas even if the pointer leaves it. With \`touch-action: none\` in the CSS, a finger draws instead of scrolling.

📌 **Interview term: \`getCoalescedEvents()\`** — all the hardware positions merged into one \`pointermove\`, so fast strokes stay smooth.

\`current\` is a plain variable on purpose: making it a \`ref\` would trigger Vue's dependency tracking on every point pushed, dozens of times a second, for data the template never shows. Vue only hears about the stroke once, on \`pointerup\`.

### Step 3: Repaint from data after the DOM updates

~~~js
watch(
  history,
  () => {
    if (!ctx && !strokes.value.length) return;
    const c = getCtx();
    c.clearRect(0, 0, W, H);
    strokes.value.forEach((s) => drawStroke(c, s));
  },
  { flush: "post" },
);
~~~

\`flush: "post"\` runs the repaint after Vue has patched the DOM. The context is created lazily, so an untouched board never asks for one. \`drawStroke\` sets \`globalCompositeOperation\` to \`destination-out\` for the eraser, which erases to transparency.

📌 **Interview term: \`globalCompositeOperation\`** — how new drawing combines with existing pixels; \`destination-out\` removes pixels where you draw.

### Step 4: Toolbar, shortcuts, export

The size slider is \`v-model.number="size"\`, so \`size\` stays a number ([v-model modifiers](/interview-question/what-are-v-model-modifiers)). A \`window\` \`keydown\` listener added in \`onMounted\` and removed in \`onBeforeUnmount\` maps Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z or Ctrl+Y. Export draws the board onto a white offscreen canvas and shows a preview plus a \`download="drawing.png"\` link instead of auto-clicking, which also works in a sandboxed iframe.

## 4. Verified

jsdom has no 2D context (\`getContext\` logs "Not implemented" through \`console.error\`) and no \`toDataURL\`, so the driver installs a **recording fake context** on \`HTMLCanvasElement.prototype\` and a fake \`toDataURL\`, then draws with synthetic \`PointerEvent\`s; with no layout, points map 1:1:

\`\`\`text
mount   : On the board: 0 · undo steps: 0 · redo steps: 0 | getContext calls 0 | undo off | redo off | clear off | canvas 800x500
stroke 1: On the board: 1 · undo steps: 1 · redo steps: 0
  while moving: clearRect 0, beginPath 4, lineTo 3, arc 1, stroke 3, fill 1 | on release: clearRect 1, beginPath 1, lineTo 3, arc 0, stroke 1, fill 0 | style ["#ff6b6b",6,"source-over"]
tap dot : On the board: 2 · undo steps: 2 · redo steps: 0 | fill [["#4dabf7","source-over"]] | arc radius 10
eraser  : On the board: 3 · undo steps: 3 · redo steps: 0 | last op ["#4dabf7",20,"destination-out"]
undo    : On the board: 2 · undo steps: 2 · redo steps: 1 | repaint: clearRect 1, beginPath 2, lineTo 3, arc 1, stroke 1, fill 1 | undo on | redo on | clear on
clear   : On the board: 0 · undo steps: 3 · redo steps: 0 | repaint: clearRect 1, beginPath 0, lineTo 0, arc 0, stroke 0, fill 0 | undo on | redo off | clear off
undo clear: On the board: 2 · undo steps: 2 · redo steps: 1 | repaint: clearRect 1, beginPath 2, lineTo 3, arc 1, stroke 1, fill 1
Ctrl+Shift+Z: On the board: 2 · undo steps: 2 · redo steps: 1
new stroke after undo: On the board: 2 · undo steps: 2 · redo steps: 0 | undo on | redo off | clear on
export  : clearRect 0, beginPath 0, lineTo 0, arc 0, stroke 0, fill 0 | white fill [0,0,800,500] | drawImage 1 | link drawing.png data:image/png;base64,RkFLRQ==
getContext calls in total: 2
\`\`\`

(Trimmed to 12 of 16 lines, dropping the second undo, the redo and the two Ctrl+Z lines; all 16 matched the React and Angular runs exactly.) The fake shows which calls are made; the pixels were checked in headless Chromium 141 with a real mouse: the stroke painted \`255,107,107,255\`, the eraser left \`0,0,0,0\` only where it passed, undo and redo restored the pixel, and the exported PNG decoded at 800 × 500 with a white corner. Touch and pen input were not tested.

## 5. Common Pitfalls

- **A deep \`ref\` for the history.** Every point array becomes a proxy; \`shallowRef\` plus immutable updates is the right fit.
- **A reactive live stroke.** Tracking runs on every \`pointermove\`; keep it in a plain variable and commit once.
- **Repainting in a pre-flush watcher.** Use \`flush: "post"\` (or \`watchPostEffect\`) for DOM work.
- **Mutating \`history.value.done.push(...)\`.** With \`shallowRef\` nothing triggers; always assign a new object.
- **Canvas sized by CSS only.** The backing store stays 300 × 150 and stretches; set the attributes times DPR.
- **Not removing the window \`keydown\` listener** in \`onBeforeUnmount\`.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data model:</strong> <span style="color:#f0e2c8;">"Strokes as data in logical units, in a pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">history.js</code> reducer with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">done</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undone</code> stacks; Clear is an action so it can be undone."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Vue state:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">history</code> is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> replaced on every action, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strokes</code> is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>, toolbar values are refs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Drawing:</strong> <span style="color:#f0e2c8;">"Pointer Events with capture; the live stroke is a plain variable, each move draws one segment from coalesced events, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pointerup</code> dispatches one commit."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Repaint:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">history</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flush: post</code> clears and replays; the backing store is scaled by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">devicePixelRatio</code>, the eraser uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">destination-out</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Finish:</strong> <span style="color:#f0e2c8;">"Window shortcuts added in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> and removed in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBeforeUnmount</code>, and export composited onto white as a download link."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shallowRef</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ref</code> for the history?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every action creates a new object, so only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code> replacement matters. A deep ref would proxy every stroke and point array, costing memory and tracking work with no benefit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you write this as a composable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useDrawingHistory()</code> returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">history</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strokes</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dispatch</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">canUndo</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">canRedo</code>, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useCanvasDrawing(canvasRef, options)</code> for the pointer logic. The component then only wires the toolbar.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you persist it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Watch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">history</code> and save <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">history.value.done</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code> as JSON, debounced; on mount, parse it and assign a fresh <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ done, undone: [] }</code> to the shallow ref.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep long sessions fast?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Cache a bitmap of everything up to a checkpoint in an offscreen canvas every 100 strokes, and replay only the strokes after the nearest checkpoint on undo.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **shallowRef** | Ref that only reacts when \`.value\` is replaced |
| **Undo / redo stacks** | \`done\` and \`undone\`; new actions empty \`undone\` |
| **devicePixelRatio** | Physical pixels per CSS pixel |
| **Pointer capture** | Route a pointer's later events to one element |
| **getCoalescedEvents** | Hardware positions merged into one \`pointermove\` |
| **destination-out** | Composite mode that erases to transparency |

---
**Conclusion:** In Vue the drawing board keeps its history in a \`shallowRef\` updated by a pure reducer, derives the visible strokes with \`computed\`, draws the live stroke from a plain variable so reactivity never runs per point, and repaints from data in a \`flush: "post"\` watcher. DPR scaling, \`destination-out\` for the eraser and a white composite for export complete it. Verified on Vue 3.5.44 with a recording context in jsdom and with real pixels in Chromium 141, it matches the React and Angular builds line for line.`,
        files: {
          "/src/App.vue": `<script setup>
import DrawingBoard from "./components/DrawingBoard.vue";
</script>

<template>
  <main class="app">
    <h1>Drawing board</h1>
    <DrawingBoard />
    <p class="hint">Draw with a mouse, pen or finger. Ctrl+Z undoes, Ctrl+Shift+Z or Ctrl+Y redoes.</p>
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 840px;
  margin: 0 auto;
  padding: 16px;
}
h1 {
  font-size: 1.2rem;
}
.hint {
  color: #8a93a6;
  font-size: 0.85rem;
}
</style>
`,
          "/src/components/DrawingBoard.vue": `<script setup>
import {
  ref,
  shallowRef,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  useTemplateRef,
} from "vue";
import {
  initialHistory,
  historyReducer,
  visibleStrokes,
  drawStroke,
} from "../utils/history.js";

const W = 800; // logical drawing size: points are stored in these units,
const H = 500; // so strokes survive any CSS size or devicePixelRatio
const COLORS = ["#f5f5f5", "#ff6b6b", "#ffd166", "#06d6a0", "#4dabf7"];

// shallowRef: history is replaced, never mutated, so deep tracking of every
// point would be wasted work.
const history = shallowRef(initialHistory);
const dispatch = (action) => {
  history.value = historyReducer(history.value, action);
};
const strokes = computed(() => visibleStrokes(history.value.done));

const color = ref(COLORS[1]);
const size = ref(6);
const erase = ref(false);
const exportUrl = ref(null);

const canvas = useTemplateRef("canvas");
let ctx = null;
let current = null; // the stroke being drawn: plain data, not reactive
const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

function getCtx() {
  if (!ctx) {
    ctx = canvas.value.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in logical units
  }
  return ctx;
}

// Full repaint from data whenever the history changes (undo, redo, clear).
// An untouched board needs no paint, so the context is created lazily.
watch(
  history,
  () => {
    if (!ctx && !strokes.value.length) return;
    const c = getCtx();
    c.clearRect(0, 0, W, H);
    strokes.value.forEach((s) => drawStroke(c, s));
  },
  { flush: "post" },
);

// Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo.
function onKey(e) {
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k === "z" && !e.shiftKey) {
    e.preventDefault();
    dispatch({ type: "undo" });
  } else if ((k === "z" && e.shiftKey) || k === "y") {
    e.preventDefault();
    dispatch({ type: "redo" });
  }
}
onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));

function toPoint(e) {
  const r = canvas.value.getBoundingClientRect();
  const sx = r.width ? W / r.width : 1;
  const sy = r.height ? H / r.height : 1;
  return [
    Math.round((e.clientX - r.left) * sx),
    Math.round((e.clientY - r.top) * sy),
  ];
}

function onPointerdown(e) {
  if (e.button !== 0) return;
  if (e.currentTarget.setPointerCapture)
    e.currentTarget.setPointerCapture(e.pointerId);
  current = {
    type: "stroke",
    color: color.value,
    size: size.value,
    erase: erase.value,
    points: [toPoint(e)],
  };
  drawStroke(getCtx(), current); // the dot shows at once
}

function onPointermove(e) {
  if (!current) return;
  // Fast pointers deliver several positions per event: use them all.
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
  const c = getCtx();
  for (const ev of events.length ? events : [e]) {
    const p = toPoint(ev);
    const last = current.points[current.points.length - 1];
    current.points.push(p);
    // Draw just the new segment; the full repaint happens on commit.
    drawStroke(c, { ...current, points: [last, p] });
  }
}

function onPointerup() {
  if (!current) return;
  dispatch({ type: "commit", item: current });
  current = null;
}

function pick(c) {
  color.value = c;
  erase.value = false;
}

function exportPng() {
  // Composite on white: erased pixels are transparent on the live canvas.
  const out = document.createElement("canvas");
  out.width = canvas.value.width;
  out.height = canvas.value.height;
  const octx = out.getContext("2d");
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(canvas.value, 0, 0);
  exportUrl.value = out.toDataURL("image/png");
}
</script>

<template>
  <div class="board">
    <div class="toolbar" role="toolbar" aria-label="Drawing tools">
      <div class="swatches">
        <button v-for="c in COLORS" :key="c" type="button" class="swatch" :style="{ background: c }"
          :aria-label="'Colour ' + c" :aria-pressed="!erase && color === c" @click="pick(c)" />
      </div>
      <label class="size">
        Size
        <input
          v-model.number="size"
          type="range"
          min="2"
          max="40"
          data-testid="size"
        />
        <span>{{ size }}px</span>
      </label>
      <button
        type="button"
        data-testid="eraser"
        :aria-pressed="erase"
        @click="erase = !erase"
      >Eraser</button>
      <button
        type="button"
        data-testid="undo"
        :disabled="!history.done.length"
        @click="dispatch({ type: 'undo' })"
      >Undo</button>
      <button
        type="button"
        data-testid="redo"
        :disabled="!history.undone.length"
        @click="dispatch({ type: 'redo' })"
      >Redo</button>
      <button
        type="button"
        data-testid="clear"
        :disabled="!strokes.length"
        @click="dispatch({ type: 'commit', item: { type: 'clear' } })"
      >Clear</button>
      <button
        type="button"
        data-testid="export"
        @click="exportPng"
      >Export PNG</button>
    </div>

    <canvas
      ref="canvas"
      class="canvas"
      data-testid="canvas"
      :width="W * dpr"
      :height="H * dpr"
      role="img"
      :aria-label="'Drawing canvas, ' + strokes.length + ' strokes'"
      @pointerdown="onPointerdown"
      @pointermove="onPointermove"
      @pointerup="onPointerup"
      @pointercancel="onPointerup"
    />

    <p class="status" data-testid="status" aria-live="polite">
      On the board: {{ strokes.length }} · undo steps: {{ history.done.length }} · redo steps: {{ history.undone.length }}
    </p>
    <div v-if="exportUrl" class="export">
      <img :src="exportUrl" alt="Exported drawing preview" />
      <a
        :href="exportUrl"
        download="drawing.png"
        data-testid="download"
      >Download drawing.png</a>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}
.toolbar button {
  background: #2a3142;
  color: #e6e6e6;
  border: 1px solid #3d4760;
  border-radius: 6px;
  padding: 5px 10px;
  cursor: pointer;
}
.toolbar button:disabled {
  opacity: 0.4;
  cursor: default;
}
.toolbar button[aria-pressed="true"] {
  border-color: #7aa2ff;
  box-shadow: 0 0 0 1px #7aa2ff;
}
.toolbar button:focus-visible,
.toolbar input:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.swatches {
  display: flex;
  gap: 6px;
}
.toolbar .swatch {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  padding: 0;
}
.size {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #a8b3c7;
}
.size input {
  width: 90px;
}
.canvas {
  display: block;
  width: 100%;
  aspect-ratio: 8 / 5;
  background: #ffffff;
  border-radius: 8px;
  touch-action: none;
  cursor: crosshair;
}
.status {
  color: #a8b3c7;
  font-size: 0.85rem;
}
.export {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.export img {
  width: 160px;
  border-radius: 6px;
  border: 1px solid #3d4760;
}
.export a {
  color: #7aa2ff;
}
</style>
`,
          "/src/utils/history.js": `// Drawing history as plain data, so undo / redo / clear never touch pixels.
// done: actions in order ({ type: "stroke", ... } or { type: "clear" })
// undone: actions popped by undo, newest last; any new action empties it.
export const initialHistory = { done: [], undone: [] };

export function historyReducer(state, action) {
  switch (action.type) {
    case "commit": // a finished stroke, or a clear
      return { done: [...state.done, action.item], undone: [] };
    case "undo":
      if (!state.done.length) return state;
      return {
        done: state.done.slice(0, -1),
        undone: [...state.undone, state.done[state.done.length - 1]],
      };
    case "redo":
      if (!state.undone.length) return state;
      return {
        done: [...state.done, state.undone[state.undone.length - 1]],
        undone: state.undone.slice(0, -1),
      };
    default:
      return state;
  }
}

// Only what comes after the last "clear" is on the board.
export function visibleStrokes(done) {
  let start = 0;
  done.forEach((a, i) => {
    if (a.type === "clear") start = i + 1;
  });
  return done.slice(start);
}

export function drawStroke(ctx, s) {
  ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const [x0, y0] = s.points[0];
  if (s.points.length === 1) {
    // A tap is a dot: a zero-length path would draw nothing.
    ctx.beginPath();
    ctx.arc(x0, y0, s.size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (let i = 1; i < s.points.length; i++)
    ctx.lineTo(s.points[i][0], s.points[i][1]);
  ctx.stroke();
}
`,
        },
      },
      // ── angular ─────────────────────────────────────────────────────
      angular: {
        answer: `**Target Audience:** Angular candidates preparing for a hard machine coding round. Assumes standalone components; signals, render effects, the Canvas 2D API and Pointer Events are explained from zero.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then <code>📌 Interview term:</code> callouts. The Verified output comes from Angular 22.2.3 under AOT with strict templates and the playground runtime JIT, in jsdom with a recording fake 2D context, and from real pixels in headless Chromium 141.

## 1. A Story First

A painting's history can be a shoebox of photos, one per brush stroke, or a written list of the strokes themselves. Photos cost megabytes each and blur when resized; the list costs bytes, replays sharp at any size and can be saved or shared. The drawing board keeps the list, typed in TypeScript, and treats the canvas as a view it can always rebuild.

📌 **Interview term: Retained model over an immediate-mode canvas** — the canvas only remembers pixels; your typed list of strokes is the source of truth.

## 2. The Angular State Model

\`history.ts\` holds the types and pure functions: \`Stroke\`, \`Clear\`, \`History { done, undone }\`, a discriminated-union \`Action\`, \`historyReducer\`, \`visibleStrokes\` and \`drawStroke\`.

~~~ts
export interface Stroke {
  type: "stroke";
  color: string;
  size: number;
  erase: boolean;
  points: [number, number][];
}
export interface Clear {
  type: "clear";
}
export type Item = Stroke | Clear;
export type Action =
  { type: "commit"; item: Item } | { type: "undo" } | { type: "redo" };
~~~

📌 **Interview term: Discriminated union** — a union of object types that share a literal \`type\` field, so a \`switch (action.type)\` narrows each case. With strict mode, the reducer's \`switch\` covers every case and TypeScript knows nothing else can arrive.

| Value | Angular tool | Why |
| :--- | :--- | :--- |
| \`history\` | \`signal(initialHistory)\` | Replaced by the reducer on every action |
| \`strokes\` | \`computed()\` | Everything after the last Clear |
| \`color\`, \`size\`, \`erase\`, \`exportUrl\` | \`signal\` | Toolbar and preview |
| The live stroke | private field | Changes per \`pointermove\`; must not schedule renders |
| The canvas | \`@ViewChild("canvas", { static: true })\` | Context, rect and export |
| Repaint | \`afterRenderEffect()\` | Runs after Angular rendered, reads \`strokes()\` |
| Shortcuts | \`@HostListener("window:keydown")\` | Removed automatically on destroy |

📌 **Interview term: Undo / redo stacks** — \`done\` and \`undone\`; any new action empties \`undone\`, and Clear is an action so it can be undone ([undo / redo command stack](/interview-question/build-an-undo-redo-command-stack-for-a-text-editor)).

~~~ts
dispatch(action: Action): void {
  this.history.update((h) => historyReducer(h, action));
}
~~~

## 3. Build It Step by Step

### Step 1: A sharp canvas

~~~html
<canvas
  #canvas
  class="canvas"
  [width]="W * dpr"
  [height]="H * dpr"
  role="img"
  [attr.aria-label]="'Drawing canvas, ' + strokes().length + ' strokes'"
  (pointerdown)="onPointerdown($event)"
  (pointermove)="onPointermove($event)"
  (pointerup)="onPointerup()"
  (pointercancel)="onPointerup()"
></canvas>
~~~

📌 **Interview term: \`devicePixelRatio\`** — physical pixels per CSS pixel. The backing store is 800 × 500 logical units times DPR, and the context is scaled once with \`setTransform(dpr, 0, 0, dpr, 0, 0)\` so all drawing uses logical units, the same units the strokes are stored in.

### Step 2: Draw live from a field, commit once

~~~ts
onPointerdown(e: PointerEvent): void {
  if (e.button !== 0) return;
  const el = e.currentTarget as HTMLElement;
  if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
  this.current = {
    type: "stroke",
    color: this.color(),
    size: this.size(),
    erase: this.erase(),
    points: [this.toPoint(e)],
  };
  drawStroke(this.getCtx(), this.current); // the dot shows at once
}

onPointermove(e: PointerEvent): void {
  const s = this.current;
  if (!s) return;
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
  const c = this.getCtx();
  for (const ev of events.length ? events : [e]) {
    const p = this.toPoint(ev);
    const last = s.points[s.points.length - 1];
    s.points.push(p);
    drawStroke(c, { ...s, points: [last, p] }); // just the new segment
  }
}
~~~

📌 **Interview term: Pointer capture** — keeps routing the stroke's events to the canvas when the pointer leaves it; \`touch-action: none\` lets a finger draw instead of scroll.

📌 **Interview term: \`getCoalescedEvents()\`** — all hardware positions merged into one \`pointermove\`, for smooth fast strokes.

Template event bindings schedule change detection in zoneless Angular, but nothing in the view depends on \`current\`, so the work per move is just the segment drawn. Only \`onPointerup()\` touches a signal, through one \`dispatch\`.

### Step 3: Repaint after render

~~~ts
afterRenderEffect(() => {
  const strokes = this.strokes();
  if (!this.ctx && !strokes.length) return;
  const c = this.getCtx();
  c.clearRect(0, 0, W, H);
  strokes.forEach((s) => drawStroke(c, s));
});
~~~

📌 **Interview term: \`afterRenderEffect()\`** — an effect that runs after Angular has rendered, tracking the signals it reads. Here it re-runs only when \`strokes()\` changes, which is exactly undo, redo, clear and commit. It is the right hook for imperative DOM work such as painting a canvas ([afterRender vs afterNextRender](/interview-question/afterrender-vs-afternextrender-vs-ngafterviewinit-which-to-use)).

\`drawStroke\` switches \`globalCompositeOperation\` to \`destination-out\` for the eraser, which erases to transparency, and draws a filled circle for a single-point tap.

### Step 4: Shortcuts and export

~~~ts
@HostListener("window:keydown", ["$event"])
onKey(e: KeyboardEvent): void {
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k === "z" && !e.shiftKey) {
    e.preventDefault();
    this.dispatch({ type: "undo" });
  } else if ((k === "z" && e.shiftKey) || k === "y") {
    e.preventDefault();
    this.dispatch({ type: "redo" });
  }
}
~~~

\`@HostListener\` on a global target is removed when the component is destroyed, so there is no manual cleanup ([@HostListener](/interview-question/what-do-hostlistener-and-hostbinding-do)). Export composites the board onto white in an offscreen canvas and shows \`@if (exportUrl(); as url)\` with a preview and a \`download="drawing.png"\` link.

## 4. Verified

jsdom has no 2D context (\`getContext\` logs "Not implemented" through \`console.error\`) and no \`toDataURL\`, so the driver installs a **recording fake context** and a fake \`toDataURL\` on \`HTMLCanvasElement.prototype\`, then draws with synthetic \`PointerEvent\`s. Booted under AOT (\`ngc\`, \`strictTemplates\`) and runtime JIT; both printed identical lines, matching the React and Vue runs:

\`\`\`text
mount   : On the board: 0 · undo steps: 0 · redo steps: 0 | getContext calls 0 | undo off | redo off | clear off | canvas 800x500
stroke 1: On the board: 1 · undo steps: 1 · redo steps: 0
  while moving: clearRect 0, beginPath 4, lineTo 3, arc 1, stroke 3, fill 1 | on release: clearRect 1, beginPath 1, lineTo 3, arc 0, stroke 1, fill 0 | style ["#ff6b6b",6,"source-over"]
eraser  : On the board: 3 · undo steps: 3 · redo steps: 0 | last op ["#4dabf7",20,"destination-out"]
undo    : On the board: 2 · undo steps: 2 · redo steps: 1 | repaint: clearRect 1, beginPath 2, lineTo 3, arc 1, stroke 1, fill 1 | undo on | redo on | clear on
clear   : On the board: 0 · undo steps: 3 · redo steps: 0 | repaint: clearRect 1, beginPath 0, lineTo 0, arc 0, stroke 0, fill 0 | undo on | redo off | clear off
undo clear: On the board: 2 · undo steps: 2 · redo steps: 1 | repaint: clearRect 1, beginPath 2, lineTo 3, arc 1, stroke 1, fill 1
new stroke after undo: On the board: 2 · undo steps: 2 · redo steps: 0 | undo on | redo off | clear on
export  : clearRect 0, beginPath 0, lineTo 0, arc 0, stroke 0, fill 0 | white fill [0,0,800,500] | drawImage 1 | link drawing.png data:image/png;base64,RkFLRQ==
getContext calls in total: 2
\`\`\`

(Trimmed to 10 of 16 lines.) \`afterRenderEffect\` repainted exactly once per history change, the same counts as React's effect and Vue's post-flush watcher. In headless Chromium 141, without Zone.js, real pixels confirmed it: the stroke painted \`255,107,107,255\`, the eraser left \`0,0,0,0\` only where it passed, undo and redo restored the pixel, and the exported PNG decoded at 800 × 500 with a white corner. Touch and pen input were not tested.

## 5. Common Pitfalls

- **Repainting in a plain \`effect()\`.** It can run before the view is updated; \`afterRenderEffect\` is meant for DOM work.
- **A signal for the live stroke.** Each point would notify consumers; keep it in a field and commit once.
- **Mutating \`history().done.push(...)\`.** The signal keeps the same reference and nothing re-runs; always produce a new object.
- **\`(window:keydown)\` handled with \`addEventListener\` and no removal.** \`@HostListener\` cleans up for you.
- **Canvas sized by CSS only.** The backing store stays 300 × 150; bind \`[width]\` and \`[height]\` times DPR.
- **\`getContext\` in the constructor.** The view does not exist yet; get it lazily on first draw.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data model:</strong> <span style="color:#f0e2c8;">"Typed strokes in logical units and a discriminated-union <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Action</code>; a pure reducer over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">done</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undone</code>, where Clear is an action."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Signals:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">history</code> is a signal updated with the reducer, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strokes</code> is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>, toolbar values are signals, and the live stroke is a private field."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Drawing:</strong> <span style="color:#f0e2c8;">"Pointer Events with capture and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">touch-action: none</code>; each move draws one segment from coalesced events; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pointerup</code> dispatches one commit."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Repaint:</strong> <span style="color:#f0e2c8;">"An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterRenderEffect</code> reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strokes()</code> and replays them after render; the backing store is scaled by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">devicePixelRatio</code>; the eraser uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">destination-out</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Finish:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@HostListener(window:keydown)</code> for Ctrl+Z and Ctrl+Shift+Z, export composited onto white as a download link, and checkpoints for long sessions."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">afterRenderEffect</code> instead of calling <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">redraw()</code> after each dispatch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both work. The effect ties the repaint to the data: any code path that changes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">history</code> repaints, including ones added later, and it runs after the view is up to date.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you move the history into a service?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes if other components need it, such as a layers panel or a toolbar elsewhere: an injectable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DrawingStore</code> holding the signal and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dispatch</code>, provided at the component so each board gets its own.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add collaboration?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Send each committed stroke as JSON over a WebSocket, append remote strokes through the same reducer with an author id, and make undo remove the local user last stroke rather than the global last item.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you unit test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">historyReducer</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">visibleStrokes</code> as plain functions; for the component, stub <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getContext</code> with a recorder in TestBed, dispatch pointer events on the canvas, and assert the recorded calls and status text.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Discriminated union** | Union of types told apart by a literal field such as \`type\` |
| **Undo / redo stacks** | \`done\` and \`undone\`; new actions empty \`undone\` |
| **afterRenderEffect** | Effect that runs after Angular has rendered |
| **devicePixelRatio** | Physical pixels per CSS pixel |
| **Pointer capture** | Route a pointer's later events to one element |
| **destination-out** | Composite mode that erases to transparency |

---
**Conclusion:** In Angular the drawing board is a typed, pure reducer behind a \`history\` signal, a \`computed\` of the visible strokes, a private field for the live stroke so nothing re-renders per point, and an \`afterRenderEffect\` that repaints from data whenever the history changes. \`@HostListener\` handles the shortcuts, DPR scaling keeps it sharp, and export composites onto white. Verified on Angular 22.2.3 under AOT and JIT with a recording context, and with real pixels in Chromium 141, it matches the React and Vue builds line for line.`,
        files: {
          "/src/app/app.component.ts": `import { Component } from "@angular/core";
import { DrawingBoardComponent } from "./components/drawing-board.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [DrawingBoardComponent],
  template: \`
    <main class="app">
      <h1>Drawing board</h1>
      <app-drawing-board />
      <p class="hint">Draw with a mouse, pen or finger. Ctrl+Z undoes, Ctrl+Shift+Z or Ctrl+Y redoes.</p>
    </main>
  \`,
  styles: [
    \`
    :host { display: block; min-height: 100vh; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
    .app { max-width: 840px; margin: 0 auto; padding: 16px; }
    h1 { font-size: 1.2rem; }
    .hint { color: #8a93a6; font-size: 0.85rem; }
  \`,
  ],
})
export class AppComponent {}
`,
          "/src/app/components/drawing-board.component.ts": `import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  afterRenderEffect,
  computed,
  signal,
} from "@angular/core";
import {
  Action,
  Stroke,
  drawStroke,
  historyReducer,
  initialHistory,
  visibleStrokes,
} from "../utils/history";

const W = 800; // logical drawing size: points are stored in these units,
const H = 500; // so strokes survive any CSS size or devicePixelRatio

@Component({
  selector: "app-drawing-board",
  standalone: true,
  template: \`
    <div class="toolbar" role="toolbar" aria-label="Drawing tools">
      <div class="swatches">
        @for (c of colors; track c) {
          <button type="button" class="swatch" [style.background]="c"
            [attr.aria-label]="'Colour ' + c" [attr.aria-pressed]="!erase() && color() === c" (click)="pick(c)"></button>
        }
      </div>
      <label class="size">
        Size
        <input
          type="range"
          min="2"
          max="40"
          data-testid="size"
          [value]="size()"
          (input)="onSize($event)"
        />
        <span>{{ size() }}px</span>
      </label>
      <button
        type="button"
        data-testid="eraser"
        [attr.aria-pressed]="erase()"
        (click)="erase.set(!erase())"
      >Eraser</button>
      <button
        type="button"
        data-testid="undo"
        [disabled]="!history().done.length"
        (click)="dispatch({ type: 'undo' })"
      >Undo</button>
      <button
        type="button"
        data-testid="redo"
        [disabled]="!history().undone.length"
        (click)="dispatch({ type: 'redo' })"
      >Redo</button>
      <button
        type="button"
        data-testid="clear"
        [disabled]="!strokes().length"
        (click)="dispatch({ type: 'commit', item: { type: 'clear' } })"
      >Clear</button>
      <button
        type="button"
        data-testid="export"
        (click)="exportPng()"
      >Export PNG</button>
    </div>

    <canvas
      #canvas
      class="canvas"
      data-testid="canvas"
      [width]="W * dpr"
      [height]="H * dpr"
      role="img"
      [attr.aria-label]="'Drawing canvas, ' + strokes().length + ' strokes'"
      (pointerdown)="onPointerdown($event)"
      (pointermove)="onPointermove($event)"
      (pointerup)="onPointerup()"
      (pointercancel)="onPointerup()"
    ></canvas>

    <p class="status" data-testid="status" aria-live="polite">
      On the board: {{ strokes().length }} · undo steps: {{ history().done.length }} · redo steps: {{ history().undone.length }}
    </p>
    @if (exportUrl(); as url) {
      <div class="export">
        <img [src]="url" alt="Exported drawing preview" />
        <a
          [href]="url"
          download="drawing.png"
          data-testid="download"
        >Download drawing.png</a>
      </div>
    }
  \`,
  styles: [
    \`
    :host { display: block; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px; }
    .toolbar button { background: #2a3142; color: #e6e6e6; border: 1px solid #3d4760; border-radius: 6px; padding: 5px 10px; cursor: pointer; }
    .toolbar button:disabled { opacity: 0.4; cursor: default; }
    .toolbar button[aria-pressed="true"] { border-color: #7aa2ff; box-shadow: 0 0 0 1px #7aa2ff; }
    .toolbar button:focus-visible, .toolbar input:focus-visible { outline: 2px solid #7aa2ff; outline-offset: 2px; }
    .swatches { display: flex; gap: 6px; }
    .toolbar .swatch { width: 26px; height: 26px; border-radius: 50%; padding: 0; }
    .size { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: #a8b3c7; }
    .size input { width: 90px; }
    .canvas { display: block; width: 100%; aspect-ratio: 8 / 5; background: #ffffff; border-radius: 8px; touch-action: none; cursor: crosshair; }
    .status { color: #a8b3c7; font-size: 0.85rem; }
    .export { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .export img { width: 160px; border-radius: 6px; border: 1px solid #3d4760; }
    .export a { color: #7aa2ff; }
  \`,
  ],
})
export class DrawingBoardComponent {
  @ViewChild("canvas", { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  readonly W = W;
  readonly H = H;
  readonly dpr =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  readonly colors = ["#f5f5f5", "#ff6b6b", "#ffd166", "#06d6a0", "#4dabf7"];

  readonly history = signal(initialHistory);
  readonly strokes = computed(() => visibleStrokes(this.history().done));
  readonly color = signal(this.colors[1]);
  readonly size = signal(6);
  readonly erase = signal(false);
  readonly exportUrl = signal<string | null>(null);

  private ctx: CanvasRenderingContext2D | null = null;
  private current: Stroke | null = null; // the stroke being drawn: not a signal

  constructor() {
    // Full repaint from data whenever the history changes (undo, redo, clear),
    // after Angular has rendered. An untouched board needs no paint, so the
    // context is created lazily.
    afterRenderEffect(() => {
      const strokes = this.strokes();
      if (!this.ctx && !strokes.length) return;
      const c = this.getCtx();
      c.clearRect(0, 0, W, H);
      strokes.forEach((s) => drawStroke(c, s));
    });
  }

  dispatch(action: Action): void {
    this.history.update((h) => historyReducer(h, action));
  }

  // Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo.
  @HostListener("window:keydown", ["$event"])
  onKey(e: KeyboardEvent): void {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) {
      e.preventDefault();
      this.dispatch({ type: "undo" });
    } else if ((k === "z" && e.shiftKey) || k === "y") {
      e.preventDefault();
      this.dispatch({ type: "redo" });
    }
  }

  pick(c: string): void {
    this.color.set(c);
    this.erase.set(false);
  }

  onSize(e: Event): void {
    this.size.set(Number((e.target as HTMLInputElement).value));
  }

  private getCtx(): CanvasRenderingContext2D {
    if (!this.ctx) {
      const ctx = this.canvas.nativeElement.getContext(
        "2d",
      ) as CanvasRenderingContext2D;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); // draw in logical units
      this.ctx = ctx;
    }
    return this.ctx;
  }

  private toPoint(e: { clientX: number; clientY: number }): [number, number] {
    const r = this.canvas.nativeElement.getBoundingClientRect();
    const sx = r.width ? W / r.width : 1;
    const sy = r.height ? H / r.height : 1;
    return [
      Math.round((e.clientX - r.left) * sx),
      Math.round((e.clientY - r.top) * sy),
    ];
  }

  onPointerdown(e: PointerEvent): void {
    if (e.button !== 0) return;
    const el = e.currentTarget as HTMLElement;
    if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
    this.current = {
      type: "stroke",
      color: this.color(),
      size: this.size(),
      erase: this.erase(),
      points: [this.toPoint(e)],
    };
    drawStroke(this.getCtx(), this.current); // the dot shows at once
  }

  onPointermove(e: PointerEvent): void {
    const s = this.current;
    if (!s) return;
    // Fast pointers deliver several positions per event: use them all.
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    const c = this.getCtx();
    for (const ev of events.length ? events : [e]) {
      const p = this.toPoint(ev);
      const last = s.points[s.points.length - 1];
      s.points.push(p);
      // Draw just the new segment; the full repaint happens on commit.
      drawStroke(c, { ...s, points: [last, p] });
    }
  }

  onPointerup(): void {
    if (!this.current) return;
    this.dispatch({ type: "commit", item: this.current });
    this.current = null;
  }

  exportPng(): void {
    // Composite on white: erased pixels are transparent on the live canvas.
    const src = this.canvas.nativeElement;
    const out = document.createElement("canvas");
    out.width = src.width;
    out.height = src.height;
    const octx = out.getContext("2d") as CanvasRenderingContext2D;
    octx.fillStyle = "#ffffff";
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(src, 0, 0);
    this.exportUrl.set(out.toDataURL("image/png"));
  }
}
`,
          "/src/app/utils/history.ts": `// Drawing history as plain data, so undo / redo / clear never touch pixels.
// done: actions in order (strokes or clears)
// undone: actions popped by undo, newest last; any new action empties it.
export interface Stroke {
  type: "stroke";
  color: string;
  size: number;
  erase: boolean;
  points: [number, number][];
}
export interface Clear {
  type: "clear";
}
export type Item = Stroke | Clear;
export interface History {
  done: Item[];
  undone: Item[];
}
export type Action =
  { type: "commit"; item: Item } | { type: "undo" } | { type: "redo" };

export const initialHistory: History = { done: [], undone: [] };

export function historyReducer(state: History, action: Action): History {
  switch (action.type) {
    case "commit": // a finished stroke, or a clear
      return { done: [...state.done, action.item], undone: [] };
    case "undo":
      if (!state.done.length) return state;
      return {
        done: state.done.slice(0, -1),
        undone: [...state.undone, state.done[state.done.length - 1]],
      };
    case "redo":
      if (!state.undone.length) return state;
      return {
        done: [...state.done, state.undone[state.undone.length - 1]],
        undone: state.undone.slice(0, -1),
      };
  }
}

// Only what comes after the last "clear" is on the board.
export function visibleStrokes(done: Item[]): Stroke[] {
  let start = 0;
  done.forEach((a, i) => {
    if (a.type === "clear") start = i + 1;
  });
  return done.slice(start) as Stroke[];
}

export function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke): void {
  ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const [x0, y0] = s.points[0];
  if (s.points.length === 1) {
    // A tap is a dot: a zero-length path would draw nothing.
    ctx.beginPath();
    ctx.arc(x0, y0, s.size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (let i = 1; i < s.points.length; i++)
    ctx.lineTo(s.points[i][0], s.points[i][1]);
  ctx.stroke();
}
`,
        },
      },
    },
  },
];

export default augments;
