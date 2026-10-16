/**
 * Machine coding ULTRA — batch 09: search and select (debounced search bar,
 * search bar with history, autocomplete / typeahead, typeahead with debounce
 * and safe highlighting, the WAI-ARIA combobox, a multi-select dropdown and a
 * transfer list).
 *
 * Each question carries a Question Body (CLAUDE.md §6) and one bundle per
 * framework (React, Vue, Angular): a tutorial answer with a story first,
 * `📌 Interview term:` callouts, `.iq-diagram` SVGs, a Verified section quoting
 * real driver output, an accessibility table, widget-specific pitfalls, the §7
 * "How to Answer in an Interview" card, a glossary and a conclusion; plus a
 * runnable multi-file solution for the site playground.
 *
 * The seven questions are split by angle so they do not repeat each other:
 * debounce + AbortController (search bar), localStorage history + roving focus
 * (history), suggestions + keyboard + cache (autocomplete), safe highlighting +
 * out-of-order responses (typeahead), the full APG combobox contract
 * (combobox), Set-based multi-selection with chips (multi-select) and derived
 * lists in master order (transfer list).
 *
 * Every solution was booted with scripts/verify-mc-solution.mjs on React
 * 19.3.1, Vue 3.5.44 and Angular 22.2.3 (AOT with strict templates and the
 * playground's runtime JIT) in jsdom, driven by one shared driver per question,
 * and printed no console.error; the three frameworks print the same driver
 * output line for line. Network calls are simulated with in-file fake APIs.
 * Generator, drivers and sources: the session scratchpad mc/b09 (gen.mjs reads
 * the verified solution files directly, so the shipped code is byte-identical).
 *
 * Conventions: SVG attributes double-quoted with no apostrophes, no leading H1,
 * `description` is plain markdown (no HTML).
 */
import type { MachineCodingAugment } from "./machine-coding-augments.types";

const augments: MachineCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a debounced Search Bar",
    seoDescription:
      "Build a debounced search bar in React, Vue and Angular: wait 300 ms after typing, abort stale requests with AbortController, show loading and errors.",
    description: `**Question presented to candidate:**
"Build a search box for our book catalog. It should not hit the server on every keystroke: wait until the user pauses for about 300 ms, then search. If an older request is still running when a newer one starts, cancel it so stale results can never show up. Show a loading state, an empty state and an error state."

**Requirements:**
- One text input with a label and a clear (×) button.
- Fire the search 300 ms after the last keystroke (debounce), never once per key.
- Cancel the previous in-flight request when a new search starts, and cancel everything on unmount (no late state updates).
- Show "waiting", "searching", results, "no results" and error states; keep the previous results visible (dimmed) while the next request runs.
- The server can be simulated with a Promise and \`setTimeout\`.

**What a strong answer should cover:**
- Debounce as "reset a timer on every change, fire when it survives", implemented as a reusable hook / composable / RxJS operator, with the timer cleared on unmount.
- Separating the raw input value (updates every keystroke) from the debounced term (drives the request).
- \`AbortController\` passed to the request, aborted in the effect cleanup, and an \`AbortError\` treated as "not an error".
- Why debounce alone does not prevent stale results: requests can still finish out of order.
- Loading / empty / error states and an accessible status message (\`role="status"\`).
- How to test it: fake timers, or driving real time in small steps.

**Clarifying questions expected:**
- "How long should the debounce be, and should an empty box clear the results immediately?"
- "Does the API accept an abort signal, or do I need to ignore stale responses myself?"
- "Should results update while typing (search-as-you-type) or only on submit?"

**Code / implementation expected:** Yes. A working component with a debounce helper, an aborted fetch per new term and the loading / empty / error states.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round. Assumes basic React (components, \`useState\`), nothing about debouncing or request cancellation.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. The output in the Verified section was produced by actually running the solution on React 19.3.1 in jsdom with a scripted driver. The "server" is simulated in the file: there is no network.

## 1. Why This Even Matters — A Story First

Imagine a librarian behind a desk. You walk up and start spelling a book title: "J... A... V...". A bad librarian runs to the shelves after every single letter, comes back with the wrong books, and runs off again. A good librarian waits until you stop talking for a moment, then goes once.

There is a second, sneakier problem. Suppose you said "JA", paused, and the librarian set off. Then you said "JAVA" and a second librarian set off. If the first librarian is slow and comes back last, you end up holding books for "JA" while you asked for "JAVA". The fix is to call the first librarian back the moment you change your mind.

A debounced search bar is exactly those two habits in code: **wait for a pause** before searching, and **cancel the old search** when a new one starts. Every search box you have ever used does both, and interviewers like this question because it is small enough to build in 30 minutes but tests timers, effects, cleanup and async ordering all at once.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How long should the pause be? | 250-400 ms is typical. Too short and you still spam the server; too long and the box feels laggy. |
| Search as you type, or only on Enter? | Search-as-you-type needs debouncing; submit-only does not, but may want [history](/interview-question/build-a-search-bar-with-history). |
| Does the API accept an abort signal? | If yes, cancel with \`AbortController\`. If not, you must ignore stale responses yourself (a request id). |
| Should an empty box clear the results at once? | Usually yes: nobody wants to wait 300 ms to see the list disappear. |
| What should happen while the next request is loading? | Blank the list (flicker) or keep the old results dimmed (calmer). |
| Is there a minimum length? | Some APIs reject 1-character queries; that changes the empty state. |

## 3. Requirements and Plan

The widget is small, so the component tree is just \`App\` → \`SearchBar\`, plus two plain modules: a reusable \`useDebouncedValue\` hook and a fake \`searchBooks\` API.

The whole design rests on keeping **three values apart**:

| Value | Kind | Changes when |
| :--- | :--- | :--- |
| \`query\` | state | every keystroke (the input is controlled) |
| \`debouncedTerm\` | state inside the hook | 300 ms after \`query\` stops changing |
| \`result\` (\`status\`, \`items\`, \`error\`) | state | when a request settles |
| \`typing\` | **derived** (\`term !== debouncedTerm\`) | never stored |
| \`requestId\` | **ref** | incremented per request, only used for the log |

📌 **Interview term: Debounce** — delay a function until a burst of calls has stopped for a given time. Each new call resets the timer; only the last one fires. The plain JavaScript version is covered in [debounce vs throttle](/interview-question/javascript-debounce-throttle).

📌 **Interview term: Derived state** — a value you compute from other state during render instead of storing it. \`typing\` is derived; storing it in its own \`useState\` would let it drift out of sync.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Timeline: three keystrokes reset the debounce timer, one request is sent; a slow request is aborted when a newer term arrives">
  <defs>
    <marker id="q1r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="34">keys</text>
  <rect class="d-box-muted" x="90" y="16" width="44" height="28" rx="6"/>
  <text class="d-text" x="112" y="35" text-anchor="middle">j</text>
  <rect class="d-box-muted" x="150" y="16" width="44" height="28" rx="6"/>
  <text class="d-text" x="172" y="35" text-anchor="middle">ja</text>
  <rect class="d-box-muted" x="210" y="16" width="56" height="28" rx="6"/>
  <text class="d-text" x="238" y="35" text-anchor="middle">jav</text>
  <path class="d-edge-dashed" d="M 270 30 L 400 30"/>
  <text class="d-sub" x="335" y="62" text-anchor="middle">300 ms quiet</text>
  <rect class="d-box-accent" x="410" y="12" width="230" height="40" rx="8"/>
  <text class="d-text d-accent" x="525" y="37" text-anchor="middle">request 1: jav</text>
  <text class="d-sub" x="20" y="154">race</text>
  <rect class="d-box" x="90" y="132" width="250" height="40" rx="8"/>
  <text class="d-text" x="215" y="157" text-anchor="middle">request 2: ja (slow)</text>
  <rect class="d-box-accent" x="390" y="206" width="250" height="40" rx="8"/>
  <text class="d-text d-accent" x="515" y="231" text-anchor="middle">request 3: java (fast)</text>
  <path class="d-edge-accent" d="M 340 152 L 515 152 L 515 200" marker-end="url(#q1r-arrow)"/>
  <text class="d-sub" x="430" y="140" text-anchor="middle">abort() on new term</text>
  <text class="d-sub" x="515" y="272" text-anchor="middle">only these results reach the screen</text>
</svg>

Three keystrokes inside the 300 ms window produce one request. In the lower lane, the slow "ja" request is still running when "java" arrives, so the effect cleanup aborts it before it can overwrite the newer answer.

## 4. Build It Step by Step

### Step 1: a fake server that misbehaves on purpose

The fake API resolves after a delay and rejects when its \`AbortSignal\` fires. Short queries are slow (700 ms) and long ones fast (200 ms), which makes the out-of-order race easy to reproduce. The query \`error\` rejects so the error state can be tested.

\`\`\`js
const latency = query.length < 3 ? 700 : 200;
const timer = setTimeout(() => { /* resolve or reject */ }, latency);
if (signal) {
  signal.addEventListener("abort", () => {
    clearTimeout(timer);
    reject(abortError());
  }, { once: true });
}
\`\`\`

📌 **Interview term: AbortController** — a browser object with a \`signal\` you pass to an async API and an \`abort()\` method you call to cancel it. \`fetch(url, { signal })\` rejects with a \`DOMException\` named \`AbortError\` when aborted. See [aborting fetch with AbortController](/interview-question/how-do-you-abort-a-fetch-api-request-using-abortcontroller).

### Step 2: the debounce hook

\`\`\`js
export function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // a new keystroke cancels the old timer
  }, [value, delay]);
  return debounced;
}
\`\`\`

Every time \`value\` changes, React runs the cleanup of the previous effect first (clearing the old timer) and then starts a new timer. Only a value that survives 300 ms without a change makes it into \`debounced\`. The same cleanup also runs on unmount, so no timer fires into a dead component.

📌 **Interview term: Effect cleanup** — the function returned from \`useEffect\`. React calls it before re-running the effect and when the component unmounts. It is where timers are cleared, listeners removed and requests aborted; see [the purpose of useEffect](/interview-question/explain-the-purpose-of-useeffect).

📌 **Interview term: Custom hook** — a function starting with \`use\` that calls other hooks, so stateful logic can be reused. See [custom hooks](/interview-question/what-are-react-custom-hooks-and-when-should-you-use-them).

### Step 3: one request per debounced term, aborted on change

\`\`\`js
useEffect(() => {
  if (!debouncedTerm) {
    setResult({ status: "idle", items: [], error: "" });
    return;
  }
  const controller = new AbortController();
  const id = ++requestId.current;
  setResult((prev) => ({ ...prev, status: "loading", error: "" }));
  searchBooks(debouncedTerm, { signal: controller.signal })
    .then((items) => setResult({ status: "success", items, error: "" }))
    .catch((err) => {
      if (err.name === "AbortError") return; // replaced by a newer search
      setResult({ status: "error", items: [], error: err.message });
    });
  return () => controller.abort();
}, [debouncedTerm]);
\`\`\`

(Excerpt: the real file also writes each step to a small request log, shown in the UI.)

Three details carry the whole answer:

- **The effect depends only on \`debouncedTerm\`**, not on \`query\`, so typing does not start requests.
- **The cleanup aborts.** When \`debouncedTerm\` changes, React runs the old cleanup before the new effect, so the previous request is cancelled before the next is sent. This is the standard pattern from [handling race conditions in effects](/interview-question/how-do-you-safely-handle-async-work-and-race-conditions-inside-effects).
- **\`AbortError\` is not shown to the user.** It means "we cancelled this on purpose".

📌 **Interview term: Race condition** — a bug where the result depends on which of two async operations finishes first. Here: an older, slower response arriving after a newer one and overwriting it.

### Step 4: states and the status message

\`\`\`js
let statusText;
if (!term) statusText = "Type to search the catalog";
else if (typing) statusText = "Waiting for you to stop typing...";
else if (result.status === "loading") statusText = "Searching...";
else if (result.status === "error") statusText = "Error: " + result.error;
else if (result.items.length === 0) statusText = "No books match " + JSON.stringify(term);
else statusText = result.items.length + " results for " + JSON.stringify(term);
\`\`\`

The text lives in a \`<p role="status">\`, a polite live region, so a screen reader announces "4 results" without stealing focus. Previous results stay on screen with \`aria-busy="true"\` and reduced opacity while the next request runs, which avoids a flash of empty content.

📌 **Interview term: Live region** — an element whose text changes are announced by screen readers. \`role="status"\` is polite: it waits until the user is idle.

### Step 5: clear button and focus

The × button empties the query and puts focus back in the input, so a keyboard user can type again immediately. An empty term shows the idle message at once, without waiting for the debounce.

## 5. Verified: What the Driver Printed

The solution files were mounted with \`createRoot(...).render(<StrictMode><App /></StrictMode>)\` in jsdom. A driver typed with real \`input\` events and let real time pass. One lesson from building the driver: inside React's test helper \`act()\`, renders and effects are flushed when the \`act\` scope ends, so the driver advances time in 20 ms steps; one long wait would have hidden the debounce firing.

\`\`\`
start            : Type to search the catalog
typed j, ja, jav : Waiting for you to stop typing... | requests: 0
+300 ms          : Searching... | log: #1 "jav" sent
+250 ms          : 4 results for "jav"
results          : Eloquent JavaScript | JavaScript: The Good Parts | Effective Java | Java Concurrency in Practice
ja in flight     : Searching...
java in flight   : Searching... | stale list kept: true
after 800 ms     : 4 results for "java"
results          : Eloquent JavaScript | JavaScript: The Good Parts | Effective Java | Java Concurrency in Practice
request log      : #1 "jav" sent / #1 "jav" done: 4 results / #2 "ja" sent / #3 "java" sent / #2 "ja" aborted / #3 "java" done: 4 results
error query      : Error: Server error (simulated) | list shown: false
after clear      : Type to search the catalog | input: "" | focused: true
final log        : #2 "ja" sent / #3 "java" sent / #2 "ja" aborted / #3 "java" done: 4 results / #4 "error" sent / #4 "error" failed
\`\`\`

What this proves:

- Three keystrokes produced **zero** requests until the 300 ms pause, then exactly one (\`#1 "jav"\`).
- The slow \`"ja"\` request (700 ms) was **aborted** when \`"java"\` was debounced; "Jane Eyre", which only matches "ja", never appeared. The 800 ms wait was long enough for the old request to have finished had it not been cancelled.
- Note the log order: \`#3 "java" sent\` comes **before** \`#2 "ja" aborted\`. \`abort()\` is synchronous, but the promise rejection is delivered as a microtask, after the new effect has already started request #3.
- The error state replaces the list, and the clear button refocuses the input.

## 6. Edge Cases and Accessibility

| Concern | What the solution does |
| :--- | :--- |
| Label | A real \`<label for>\`; the input is \`type="search"\` with \`autocomplete="off"\` |
| Announcing results | \`role="status"\` live region holds the status sentence |
| Busy state | \`aria-busy\` on the results list while typing or loading |
| Clear button | Has \`aria-label="Clear search"\` (the × glyph alone means nothing to a screen reader) and refocuses the input |
| Leading / trailing spaces | The term is trimmed, so "java " does not start a second request |
| Unmount mid-request | The effect cleanup aborts it; the hook cleanup clears the timer |
| StrictMode double effects | On mount the term is empty, so the extra mount/unmount cycle sends nothing |

## 7. Common Pitfalls

- **Debouncing the handler with a new timer per render.** Writing \`setTimeout\` inside \`onChange\` without clearing the previous one is a delay, not a debounce: every keystroke still fires. The timer must be cleared on every change.
- **Re-creating a debounced function on every render.** \`const run = debounce(search, 300)\` in the component body gives each render its own timer. Use a hook like \`useDebouncedValue\`, or keep the debounced function in a ref.
- **Thinking debounce fixes stale results.** It reduces requests; it does not order them. Two debounced requests can still finish out of order, as the "ja" / "java" run shows. You need abort or an "is this still the latest?" check.
- **Showing \`AbortError\` as a failure.** It is expected; filter it by \`err.name\` before setting an error state.
- **Putting \`query\` in the request effect's dependencies.** Then every keystroke fires a request and the debounce is pointless.
- **Testing with one long wait under \`act()\`.** Effects queued during the wait only run when \`act\` finishes; use fake timers or small steps, as the driver here does.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it:</strong> <span style="color:#f0e2c8;">"I will keep the raw input and a debounced term separate: typing updates the input on every key, and only the debounced term triggers a request."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Debounce:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useDebouncedValue</code> hook sets a timeout on every change and clears it in the effect cleanup, so only a value that survives 300 ms gets through."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cancel:</strong> <span style="color:#f0e2c8;">"The request effect depends on the debounced term, creates an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code>, and aborts in its cleanup, so a newer term cancels the old request."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. States:</strong> <span style="color:#f0e2c8;">"I model idle, waiting, loading, success, empty and error, keep old results dimmed while loading, and announce the status in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=status</code> region."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it:</strong> <span style="color:#f0e2c8;">"I would test the race with a fake API where the older query is slower, and show the old request is aborted and its results never render."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just ignore stale responses with a flag?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That also works and is the fallback when an API cannot be aborted. Aborting is better when possible because the browser stops the network work and frees the connection; a request id or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ignore</code> flag only stops the state update.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Debounce or throttle here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Debounce: we want one request after the user pauses. Throttle (at most once per interval) suits continuous signals like scroll position or resize, where you want regular updates during the activity.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test this with Jest or Vitest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use fake timers (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vi.useFakeTimers()</code>), type with Testing Library, advance 299 ms and assert no call, advance 1 ms and assert one call; for the race, resolve the second mocked promise before the first and assert the screen shows the second.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add caching?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from term to results checked before sending, so backspacing to a previous term is instant. That is covered in the autocomplete build; keep the cache bounded (LRU) for long sessions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about React 19 features like <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useDeferredValue</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useDeferredValue</code> defers rendering of an expensive list but does not reduce network requests, so it complements a debounce rather than replacing it.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Debounce** | Wait until calls stop for N ms, then run once |
| **Derived state** | Computed during render from other state, never stored |
| **AbortController** | Object whose \`abort()\` cancels an async API that received its \`signal\` |
| **Effect cleanup** | Function React runs before the next effect run and on unmount |
| **Custom hook** | Reusable function that calls hooks (\`useDebouncedValue\`) |
| **Race condition** | Result depends on which async operation finishes first |
| **Live region** | Element whose text changes are read out by screen readers |

---
**Conclusion:** A debounced search bar is two ideas joined by one effect: a debounced term that changes only after the user pauses, and a request effect that aborts its predecessor in its cleanup. The verified run shows three keystrokes producing one request, and a slow older request being aborted so its results never reach the screen, with the abort landing one microtask after the newer request starts. Name both ideas, explain why debouncing alone does not prevent stale results, and handle the loading, empty and error states, and you have answered the question completely. For the history and suggestion variants, see [search with history](/interview-question/build-a-search-bar-with-history) and [autocomplete](/interview-question/build-an-autocomplete-typeahead-search).`,
        files: {
          "/App.js": `import SearchBar from "./src/SearchBar";

export default function App() {
  return (
    <main className="page">
      <h1>Book search</h1>
      <SearchBar />
    </main>
  );
}
`,
          "/src/api.js": `// Simulated server: there is no network in this demo.
// Latency depends on the query ON PURPOSE: short queries are slow (700 ms),
// longer ones are fast (200 ms), so an older request can finish after a newer one.
const BOOKS = [
  "Eloquent JavaScript",
  "JavaScript: The Good Parts",
  "Effective Java",
  "Java Concurrency in Practice",
  "Jane Eyre",
  "Clean Code",
  "The Pragmatic Programmer",
  "Refactoring",
  "Design Patterns",
  "Fluent Python",
  "Python Crash Course",
  "The Rust Programming Language",
  "Learning React",
  "Vue.js in Action",
  "Programming TypeScript",
  "Pride and Prejudice",
];

export function searchBooks(query, { signal } = {}) {
  return new Promise((resolve, reject) => {
    const abortError = () => new DOMException("Request aborted", "AbortError");
    if (signal && signal.aborted) return reject(abortError());
    const latency = query.length < 3 ? 700 : 200;
    const timer = setTimeout(() => {
      const q = query.toLowerCase();
      if (q === "error") return reject(new Error("Server error (simulated)"));
      resolve(BOOKS.filter((title) => title.toLowerCase().includes(q)).slice(0, 8));
    }, latency);
    if (signal) {
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(abortError());
      }, { once: true });
    }
  });
}
`,
          "/src/SearchBar.js": `import { useEffect, useRef, useState } from "react";
import { searchBooks } from "./api";
import { useDebouncedValue } from "./useDebouncedValue";

const DELAY = 300;

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState({ status: "idle", items: [], error: "" });
  const [log, setLog] = useState([]);
  const requestId = useRef(0);
  const inputRef = useRef(null);

  const term = query.trim();
  const debouncedTerm = useDebouncedValue(term, DELAY);
  const typing = term !== debouncedTerm;

  const addLog = (line) => setLog((prev) => [...prev.slice(-5), line]);

  useEffect(() => {
    if (!debouncedTerm) {
      setResult({ status: "idle", items: [], error: "" });
      return;
    }
    const controller = new AbortController();
    const id = ++requestId.current;
    // Keep the previous items on screen while the next request is in flight.
    setResult((prev) => ({ ...prev, status: "loading", error: "" }));
    addLog("#" + id + " " + JSON.stringify(debouncedTerm) + " sent");

    searchBooks(debouncedTerm, { signal: controller.signal })
      .then((items) => {
        setResult({ status: "success", items, error: "" });
        addLog("#" + id + " " + JSON.stringify(debouncedTerm) + " done: " + items.length + " results");
      })
      .catch((err) => {
        if (err.name === "AbortError") {
          addLog("#" + id + " " + JSON.stringify(debouncedTerm) + " aborted");
          return; // a newer search replaced this one: not an error
        }
        setResult({ status: "error", items: [], error: err.message });
        addLog("#" + id + " " + JSON.stringify(debouncedTerm) + " failed");
      });

    // Runs when debouncedTerm changes again or the component unmounts.
    return () => controller.abort();
  }, [debouncedTerm]);

  let statusText;
  if (!term) statusText = "Type to search the catalog";
  else if (typing) statusText = "Waiting for you to stop typing...";
  else if (result.status === "loading") statusText = "Searching...";
  else if (result.status === "error") statusText = "Error: " + result.error;
  else if (result.items.length === 0) statusText = "No books match " + JSON.stringify(term);
  else statusText = result.items.length + " results for " + JSON.stringify(term);

  const busy = typing || result.status === "loading";
  const showList = term && result.status !== "error" && result.items.length > 0;

  return (
    <div className="search">
      <label htmlFor="book-search" className="label">Search books</label>
      <div className="field">
        <input
          id="book-search"
          ref={inputRef}
          data-testid="search-input"
          type="search"
          autoComplete="off"
          placeholder="Try ja, java or error"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            type="button"
            className="clear"
            data-testid="clear"
            aria-label="Clear search"
            onClick={() => { setQuery(""); inputRef.current.focus(); }}
          >
            ×
          </button>
        )}
      </div>

      <p className="status" role="status" data-testid="status">{statusText}</p>

      {showList && (
        <ul className={busy ? "results stale" : "results"} aria-busy={busy} data-testid="results">
          {result.items.map((title) => <li key={title}>{title}</li>)}
        </ul>
      )}

      <h2 className="log-title">Request log</h2>
      <ol className="log" data-testid="log">
        {log.map((line, i) => <li key={i}>{line}</li>)}
      </ol>
    </div>
  );
}
`,
          "/src/useDebouncedValue.js": `import { useEffect, useState } from "react";

// Returns \`value\`, but only after it has stopped changing for \`delay\` ms.
export function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // a new keystroke cancels the old timer
  }, [value, delay]);
  return debounced;
}
`,
          "/styles.css": `:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
.page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 1.4rem; margin: 0 0 16px; }
.label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
.field { position: relative; }
.field input { width: 100%; padding: 10px 40px 10px 12px; font-size: 1rem; color: inherit; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
.field input:focus { outline: 2px solid #7aa2ff; outline-offset: 1px; }
.clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 28px; height: 28px; border: 0; border-radius: 6px; background: transparent; color: #a9b1c6; font-size: 1.2rem; cursor: pointer; }
.clear:hover { background: #2a2f3f; color: #fff; }
.status { min-height: 1.4em; font-size: 0.9rem; color: #a9b1c6; margin: 10px 0; }
.results { list-style: none; margin: 0; padding: 0; border: 1px solid #2a2f3f; border-radius: 8px; overflow: hidden; transition: opacity 0.15s; }
.results li { padding: 10px 12px; border-top: 1px solid #2a2f3f; }
.results li:first-child { border-top: 0; }
.results.stale { opacity: 0.55; }
.log-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; color: #7d859b; margin: 24px 0 6px; }
.log { margin: 0; padding-left: 20px; font: 0.8rem/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; color: #b8c0d6; }
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers preparing for a machine coding round. Assumes \`ref\` and templates, nothing about debouncing or request cancellation.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary interviewers expect. The Verified output was produced by compiling the SFCs with @vue/compiler-sfc and mounting them with \`createApp(App).mount("#app")\` on Vue 3.5.44 in jsdom. The server is simulated in \`api.js\`.

## 1. A Story First

A good librarian waits until you finish spelling a title before walking to the shelves, and if you change your mind halfway there, calls the first trip off. A debounced search bar does the same: it **waits for a pause** in typing, then searches, and it **cancels the previous search** when a newer one starts, so slow old answers can never overwrite new ones.

## 2. The Plan in Vue Terms

| Piece | Vue tool | Why |
| :--- | :--- | :--- |
| Raw input | \`ref("")\` + \`v-model\` | updates on every keystroke |
| Trimmed term | \`computed\` | derived, never stored |
| Debounced term | a composable \`useDebounced(term, 300)\` returning a \`ref\` | changes only after a 300 ms pause |
| The request | \`watch(debouncedTerm, (value, old, onCleanup) => ...)\` | runs once per debounced term, cancels the previous one |
| Status sentence | \`computed\` | one place that decides idle / waiting / loading / error / empty / results |

📌 **Interview term: Debounce** — delay work until a burst of calls stops for N ms; every new call resets the timer. The plain JavaScript version is in [what is debouncing and throttling](/interview-question/what-is-debouncing-and-throttling).

📌 **Interview term: Composable** — a function that uses Vue's reactivity APIs (\`ref\`, \`watch\`, lifecycle hooks) to package reusable stateful logic. See [composables in Vue](/interview-question/what-are-composables-in-vue).

## 3. Build It Step by Step

### Step 1: the debounce composable

\`\`\`js
export function useDebounced(source, delay) {
  const debounced = ref(source.value);
  let timer;
  watch(source, (value) => {
    clearTimeout(timer); // a new keystroke cancels the old timer
    timer = setTimeout(() => { debounced.value = value; }, delay);
  });
  onScopeDispose(() => clearTimeout(timer)); // component unmounted: no late update
  return debounced;
}
\`\`\`

\`onScopeDispose\` registers cleanup on the current effect scope, which for a composable called in \`<script setup>\` is the component; it runs on unmount. The \`watch\` itself is stopped automatically at the same moment. More on scopes in [effectScope and composable cleanup](/interview-question/what-is-effectscope-and-why-do-composables-use-it-for-cleanup).

### Step 2: one request per debounced term

\`\`\`js
watch(debouncedTerm, (value, _old, onCleanup) => {
  if (!value) { status.value = "idle"; items.value = []; return; }
  const controller = new AbortController();
  // Runs before the next search starts, and when the component unmounts.
  onCleanup(() => controller.abort());
  status.value = "loading"; // previous items stay on screen while this runs
  searchBooks(value, { signal: controller.signal })
    .then((found) => { items.value = found; status.value = "success"; })
    .catch((err) => {
      if (err.name === "AbortError") return; // replaced by a newer search
      items.value = []; error.value = err.message; status.value = "error";
    });
});
\`\`\`

(Excerpt: the real component also writes each step to a request log shown in the UI.)

📌 **Interview term: Watcher cleanup** — the \`onCleanup\` function passed as the third argument of a \`watch\` callback. Vue calls the registered function right before the watcher runs again and when the watcher is stopped. Vue 3.5.44 also exports \`onWatcherCleanup()\` (checked in its typings) which does the same without the parameter; either works, but \`onWatcherCleanup()\` must be called before the first \`await\`. Calling it after an \`await\` in Node with Vue 3.5.44 printed \`[Vue warn] onWatcherCleanup() was called when there was no active watcher to associate with.\` and the cleanup never ran. Compare the two watcher styles in [watch vs watchEffect](/interview-question/what-is-the-difference-between-watch-and-watcheffect).

📌 **Interview term: AbortController** — an object whose \`signal\` you pass to an async API and whose \`abort()\` cancels it; \`fetch\` rejects with an \`AbortError\`. See [aborting fetch](/interview-question/how-do-you-abort-a-fetch-api-request-using-abortcontroller).

📌 **Interview term: Race condition** — the result depends on which async call finishes first. Debounce reduces requests but does not order them; the abort is what stops an old, slow answer from winning.

### Step 3: the status sentence and template

\`\`\`js
const statusText = computed(() => {
  if (!term.value) return "Type to search the catalog";
  if (typing.value) return "Waiting for you to stop typing...";
  if (status.value === "loading") return "Searching...";
  if (status.value === "error") return "Error: " + error.value;
  if (items.value.length === 0) return "No books match " + JSON.stringify(term.value);
  return items.value.length + " results for " + JSON.stringify(term.value);
});
\`\`\`

\`typing\` is \`computed(() => term.value !== debouncedTerm.value)\`. The template binds the list with \`:class="['results', { stale: busy }]"\` and \`:aria-busy="busy"\`, so old results stay visible but dimmed during a search, and the sentence sits in a \`<p role="status">\` live region. The clear button sets \`query.value = ""\` and calls \`inputEl.value.focus()\` through a template ref.

## 4. Verified: What the Driver Printed

The driver typed with real \`input\` events and let real time pass in 20 ms steps:

\`\`\`
start            : Type to search the catalog
typed j, ja, jav : Waiting for you to stop typing... | requests: 0
+300 ms          : Searching... | log: #1 "jav" sent
+250 ms          : 4 results for "jav"
results          : Eloquent JavaScript | JavaScript: The Good Parts | Effective Java | Java Concurrency in Practice
ja in flight     : Searching...
java in flight   : Searching... | stale list kept: true
after 800 ms     : 4 results for "java"
results          : Eloquent JavaScript | JavaScript: The Good Parts | Effective Java | Java Concurrency in Practice
request log      : #1 "jav" sent / #1 "jav" done: 4 results / #2 "ja" sent / #3 "java" sent / #2 "ja" aborted / #3 "java" done: 4 results
error query      : Error: Server error (simulated) | list shown: false
after clear      : Type to search the catalog | input: "" | focused: true
final log        : #2 "ja" sent / #3 "java" sent / #2 "ja" aborted / #3 "java" done: 4 results / #4 "error" sent / #4 "error" failed
\`\`\`

Three keystrokes sent one request. The slow "ja" request (the fake server takes 700 ms for short queries) was aborted by the watcher cleanup when "java" arrived, so "Jane Eyre", which only matches "ja", never showed. The abort is logged after \`#3 "java" sent\` because the rejection is delivered as a microtask, after the watcher has already started the new request. The React and Angular builds of this question print the same lines.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Label and input type | \`<label for>\` plus \`type="search"\`, \`autocomplete="off"\` |
| Results announced | \`role="status"\` paragraph |
| Busy list | \`aria-busy\` while typing or loading |
| Clear button | \`aria-label="Clear search"\`, refocuses the input via a template ref |
| Unmount mid-search | watcher stopped and cleanup aborts; composable clears its timer in \`onScopeDispose\` |
| Spaces | the term is trimmed in a \`computed\`, so trailing spaces do not trigger a new search |

## 6. Common Pitfalls

- **Watching \`query\` instead of the debounced term** for the request: every keystroke fires.
- **Forgetting the timer on unmount.** Without \`onScopeDispose\`, a pending timer still writes to \`debounced\` after the component is gone.
- **Using \`watchEffect\` and reading extra refs inside the request code.** Every ref read becomes a dependency, so unrelated changes (like the log) can re-run the search. \`watch\` with an explicit source avoids that.
- **Treating \`AbortError\` as a failure** and flashing an error message during normal typing.
- **Debouncing with \`lodash.debounce\` created inside a template handler**, which makes a new debounced function per render. If you use a library, create it once in \`<script setup>\` and cancel it in \`onBeforeUnmount\`.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it:</strong> <span style="color:#f0e2c8;">"The raw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">query</code> is a ref bound with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code>; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useDebounced</code> composable turns it into a ref that only changes after 300 ms of quiet."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Request:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on the debounced ref runs one search per term and creates an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code> for it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cancel:</strong> <span style="color:#f0e2c8;">"The watcher <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> aborts the previous request before the next run and on unmount, so stale answers cannot land."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. States:</strong> <span style="color:#f0e2c8;">"A single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> decides the status sentence: idle, waiting, searching, error, empty or results, in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=status</code> region."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it:</strong> <span style="color:#f0e2c8;">"I test with a fake API where short queries are slower and show the older request is aborted and its results never render."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onCleanup</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onWatcherCleanup</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both register cleanup for the current watcher run. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> is the third callback argument; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onWatcherCleanup()</code> is a standalone import exported by Vue 3.5 that must be called synchronously inside the watcher, before any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a composable instead of a debounced function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A ref-based composable fits Vue: the template and other watchers can read the debounced value reactively, and cleanup is tied to the component scope automatically.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With Vitest fake timers and Vue Test Utils: set the input value, advance 299 ms, assert no call, advance 1 ms, assert one call; resolve mocked promises out of order to test the abort.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watchDebounced</code> from VueUse?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, it wraps the same idea. In an interview, write the composable by hand first to show you understand timer reset and cleanup, then mention the library.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Debounce** | Run once after calls stop for N ms |
| **Composable** | Reusable function built on Vue reactivity |
| **Watcher cleanup** | Function Vue runs before the next watcher run and on stop |
| **AbortController** | Cancels an async API that received its \`signal\` |
| **Race condition** | Outcome depends on which async call finishes first |
| **Live region** | Element whose text changes are read by screen readers |

---
**Conclusion:** In Vue, a debounced search bar is a composable that produces a debounced ref, plus a \`watch\` on that ref whose cleanup aborts the previous request. The verified run on Vue 3.5.44 shows one request for three keystrokes and an older, slower request aborted before it could overwrite newer results. Mention that debounce reduces requests while abort fixes ordering, and model every state explicitly. Related builds: [search with history](/interview-question/build-a-search-bar-with-history) and [autocomplete](/interview-question/build-an-autocomplete-typeahead-search).`,
        files: {
          "/src/App.vue": `<script setup>
import SearchBar from "./components/SearchBar.vue";
</script>

<template>
  <main class="page">
    <h1>Book search</h1>
    <SearchBar />
  </main>
</template>

<style>
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
.page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 1.4rem; margin: 0 0 16px; }
</style>
`,
          "/src/api.js": `// Simulated server: there is no network in this demo.
// Latency depends on the query ON PURPOSE: short queries are slow (700 ms),
// longer ones are fast (200 ms), so an older request can finish after a newer one.
const BOOKS = [
  "Eloquent JavaScript",
  "JavaScript: The Good Parts",
  "Effective Java",
  "Java Concurrency in Practice",
  "Jane Eyre",
  "Clean Code",
  "The Pragmatic Programmer",
  "Refactoring",
  "Design Patterns",
  "Fluent Python",
  "Python Crash Course",
  "The Rust Programming Language",
  "Learning React",
  "Vue.js in Action",
  "Programming TypeScript",
  "Pride and Prejudice",
];

export function searchBooks(query, { signal } = {}) {
  return new Promise((resolve, reject) => {
    const abortError = () => new DOMException("Request aborted", "AbortError");
    if (signal && signal.aborted) return reject(abortError());
    const latency = query.length < 3 ? 700 : 200;
    const timer = setTimeout(() => {
      const q = query.toLowerCase();
      if (q === "error") return reject(new Error("Server error (simulated)"));
      resolve(BOOKS.filter((title) => title.toLowerCase().includes(q)).slice(0, 8));
    }, latency);
    if (signal) {
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(abortError());
      }, { once: true });
    }
  });
}
`,
          "/src/components/SearchBar.vue": `<script setup>
import { computed, ref, watch } from "vue";
import { searchBooks } from "../api.js";
import { useDebounced } from "../composables/useDebounced.js";

const DELAY = 300;

const query = ref("");
const items = ref([]);
const status = ref("idle"); // idle | loading | success | error
const error = ref("");
const log = ref([]);
const inputEl = ref(null);
let requestId = 0;

const term = computed(() => query.value.trim());
const debouncedTerm = useDebounced(term, DELAY);
const typing = computed(() => term.value !== debouncedTerm.value);

function addLog(line) {
  log.value = [...log.value.slice(-5), line];
}

watch(debouncedTerm, (value, _old, onCleanup) => {
  if (!value) {
    status.value = "idle";
    items.value = [];
    return;
  }
  const controller = new AbortController();
  // Runs before the next search starts, and when the component unmounts.
  onCleanup(() => controller.abort());
  const id = ++requestId;
  const label = "#" + id + " " + JSON.stringify(value);
  status.value = "loading"; // previous items stay on screen while this runs
  error.value = "";
  addLog(label + " sent");

  searchBooks(value, { signal: controller.signal })
    .then((found) => {
      items.value = found;
      status.value = "success";
      addLog(label + " done: " + found.length + " results");
    })
    .catch((err) => {
      if (err.name === "AbortError") {
        addLog(label + " aborted");
        return; // a newer search replaced this one: not an error
      }
      items.value = [];
      error.value = err.message;
      status.value = "error";
      addLog(label + " failed");
    });
});

const statusText = computed(() => {
  if (!term.value) return "Type to search the catalog";
  if (typing.value) return "Waiting for you to stop typing...";
  if (status.value === "loading") return "Searching...";
  if (status.value === "error") return "Error: " + error.value;
  if (items.value.length === 0) return "No books match " + JSON.stringify(term.value);
  return items.value.length + " results for " + JSON.stringify(term.value);
});

const busy = computed(() => typing.value || status.value === "loading");
const showList = computed(() => term.value && status.value !== "error" && items.value.length > 0);

function clear() {
  query.value = "";
  inputEl.value.focus();
}
</script>

<template>
  <div class="search">
    <label for="book-search" class="label">Search books</label>
    <div class="field">
      <input
        id="book-search"
        ref="inputEl"
        v-model="query"
        data-testid="search-input"
        type="search"
        autocomplete="off"
        placeholder="Try ja, java or error"
      />
      <button
        v-if="query"
        type="button"
        class="clear"
        data-testid="clear"
        aria-label="Clear search"
        @click="clear"
      >×</button>
    </div>

    <p class="status" role="status" data-testid="status">{{ statusText }}</p>

    <ul v-if="showList" :class="['results', { stale: busy }]" :aria-busy="busy" data-testid="results">
      <li v-for="title in items" :key="title">{{ title }}</li>
    </ul>

    <h2 class="log-title">Request log</h2>
    <ol class="log" data-testid="log">
      <li v-for="(line, i) in log" :key="i">{{ line }}</li>
    </ol>
  </div>
</template>

<style scoped>
.label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
.field { position: relative; }
.field input { width: 100%; padding: 10px 40px 10px 12px; font-size: 1rem; color: inherit; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
.field input:focus { outline: 2px solid #7aa2ff; outline-offset: 1px; }
.clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 28px; height: 28px; border: 0; border-radius: 6px; background: transparent; color: #a9b1c6; font-size: 1.2rem; cursor: pointer; }
.clear:hover { background: #2a2f3f; color: #fff; }
.status { min-height: 1.4em; font-size: 0.9rem; color: #a9b1c6; margin: 10px 0; }
.results { list-style: none; margin: 0; padding: 0; border: 1px solid #2a2f3f; border-radius: 8px; overflow: hidden; transition: opacity 0.15s; }
.results li { padding: 10px 12px; border-top: 1px solid #2a2f3f; }
.results li:first-child { border-top: 0; }
.results.stale { opacity: 0.55; }
.log-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; color: #7d859b; margin: 24px 0 6px; }
.log { margin: 0; padding-left: 20px; font: 0.8rem/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; color: #b8c0d6; }
</style>
`,
          "/src/composables/useDebounced.js": `import { ref, watch, onScopeDispose } from "vue";

// A ref that follows \`source\`, but only after it has stopped changing for \`delay\` ms.
export function useDebounced(source, delay) {
  const debounced = ref(source.value);
  let timer;
  watch(source, (value) => {
    clearTimeout(timer); // a new keystroke cancels the old timer
    timer = setTimeout(() => { debounced.value = value; }, delay);
  });
  onScopeDispose(() => clearTimeout(timer)); // component unmounted: no late update
  return debounced;
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers preparing for a machine coding round. Assumes components and templates; RxJS operators are explained as they appear.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The Verified output was produced by booting the solution with \`bootstrapApplication(AppComponent)\` on Angular 22.2.3 in jsdom, twice: compiled ahead of time with strict templates, and compiled at runtime (JIT) the way the site playground runs it. The server is simulated in \`api.ts\`.

## 1. A Story First

Spell a book title to a librarian one letter at a time and a good one waits for you to finish before going to the shelves. If you change your mind while they are walking, you call them back. A debounced search bar does exactly that: it **waits for a pause** before searching, and it **cancels the previous search** when a newer one starts, so a slow, old answer cannot overwrite a newer one.

## 2. The Plan in Angular Terms

Angular has a ready-made vocabulary for "wait, then switch to the latest": RxJS. The component keeps its **view state in signals** (so the template re-renders whenever they change) and uses **one RxJS pipeline** for the timing:

\`\`\`
keystrokes  ->  Subject<string>  ->  debounceTime(300)  ->  distinctUntilChanged()  ->  switchMap(term => search$(term))
\`\`\`

| Piece | Tool | Why |
| :--- | :--- | :--- |
| Input value, items, status, error, log | \`signal()\` | template reads them; writes trigger rendering |
| \`typing\`, \`busy\`, \`statusText\` | \`computed()\` | derived, never stored |
| Timing and cancellation | \`Subject\` + operators | debounce and "latest wins" are one line each |
| Teardown | \`DestroyRef.onDestroy\` | unsubscribe when the component is destroyed |

📌 **Interview term: Signal** — a reactive value: read it by calling it (\`query()\`), change it with \`set\` / \`update\`, and any template or \`computed\` that read it updates. See [Angular signals](/interview-question/what-are-angular-signals).

📌 **Interview term: Debounce** — run once after a burst of calls has stopped for N ms. In RxJS that is \`debounceTime(300)\`. Plain JavaScript version: [debounce vs throttle](/interview-question/javascript-debounce-throttle).

## 3. Build It Step by Step

### Step 1: wrap the request in an Observable whose teardown aborts

\`\`\`ts
private search$(term: string): Observable<null> {
  return new Observable<null>((subscriber) => {
    const controller = new AbortController();
    this.status.set("loading"); // previous items stay on screen while this runs
    searchBooks(term, { signal: controller.signal })
      .then((found) => { this.items.set(found); this.status.set("success"); subscriber.complete(); })
      .catch((err: Error) => {
        if (err.name === "AbortError") return; // a newer search replaced this one
        this.items.set([]); this.error.set(err.message); this.status.set("error"); subscriber.complete();
      });
    return () => controller.abort(); // teardown: no-op if the request already settled
  });
}
\`\`\`

(Excerpt: the real file also writes every step to a request log shown in the UI.)

📌 **Interview term: Teardown logic** — the function returned from the \`new Observable(...)\` subscribe callback. RxJS calls it when the subscriber unsubscribes or the Observable completes. Putting \`abort()\` there turns "unsubscribe" into "cancel the network request".

📌 **Interview term: AbortController** — its \`signal\` goes to the async API and \`abort()\` cancels it; \`fetch\` then rejects with an \`AbortError\`. See [aborting fetch](/interview-question/how-do-you-abort-a-fetch-api-request-using-abortcontroller).

### Step 2: the pipeline

\`\`\`ts
const subscription = this.terms
  .pipe(
    debounceTime(DELAY),
    distinctUntilChanged(),
    switchMap((term) => {
      this.debouncedTerm.set(term);
      if (!term) { this.status.set("idle"); this.items.set([]); return of(null); }
      return this.search$(term);
    }),
  )
  .subscribe();
inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
\`\`\`

📌 **Interview term: switchMap** — maps each value to an inner Observable and **unsubscribes from the previous inner one** when a new value arrives. With our teardown, that unsubscribe aborts the old request. \`mergeMap\` would keep both running (the race bug), \`concatMap\` would queue them and \`exhaustMap\` would ignore new terms while one runs; see [switchMap vs mergeMap vs concatMap vs exhaustMap](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap).

\`distinctUntilChanged()\` drops a term equal to the previous one, so typing "jav", "ja", "jav" inside the window sends nothing new.

### Step 3: template wiring

\`\`\`html
<input #box id="book-search" type="search" [value]="query()" (input)="onInput(box.value)" />
@if (query()) { <button type="button" aria-label="Clear search" (click)="clear()">×</button> }
<p role="status">{{ statusText() }}</p>
@if (showList()) {
  <ul class="results" [class.stale]="busy()" [attr.aria-busy]="busy()"> ... </ul>
}
\`\`\`

\`onInput\` sets the signal and pushes the trimmed value into the Subject. \`#box\` is a template reference variable, so the handler reads the element value without \`$event.target\` casts that strict templates would reject. The state is in signals, so the template updates when the pipeline writes them from a timer callback, without relying on zone.js to notice.

## 4. Verified: What the Driver Printed

Both builds (AOT \`angular:app\` and JIT \`angular:playground\`) printed identical lines:

\`\`\`
start            : Type to search the catalog
typed j, ja, jav : Waiting for you to stop typing... | requests: 0
+300 ms          : Searching... | log: #1 "jav" sent
+250 ms          : 4 results for "jav"
results          : Eloquent JavaScript | JavaScript: The Good Parts | Effective Java | Java Concurrency in Practice
ja in flight     : Searching...
java in flight   : Searching... | stale list kept: true
after 800 ms     : 4 results for "java"
results          : Eloquent JavaScript | JavaScript: The Good Parts | Effective Java | Java Concurrency in Practice
request log      : #1 "jav" sent / #1 "jav" done: 4 results / #2 "ja" sent / #3 "java" sent / #2 "ja" aborted / #3 "java" done: 4 results
error query      : Error: Server error (simulated) | list shown: false
after clear      : Type to search the catalog | input: "" | focused: true
final log        : #2 "ja" sent / #3 "java" sent / #2 "ja" aborted / #3 "java" done: 4 results / #4 "error" sent / #4 "error" failed
\`\`\`

Three keystrokes became one request. The slow "ja" request was aborted by \`switchMap\`'s unsubscribe when "java" arrived, so "Jane Eyre" (which only matches "ja") never rendered. The abort is logged after \`#3 "java" sent\` because \`switchMap\` subscribes to the new inner Observable synchronously while the old promise rejection arrives a microtask later. The React and Vue versions print the same lines.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Label | \`<label for="book-search">\` |
| Status announced | \`<p role="status">\` holds the sentence |
| Busy results | \`[attr.aria-busy]\` and a dimmed \`.stale\` class |
| Clear | \`aria-label\`, refocus through \`@ViewChild("box")\` |
| Destroy mid-request | \`DestroyRef\` unsubscribes, teardown aborts, \`debounceTime\` drops its pending timer |
| Repeated term | \`distinctUntilChanged()\` skips it |

## 6. Common Pitfalls

- **Using \`mergeMap\` (or subscribing inside \`subscribe\`).** Every request runs to completion and the slowest one wins.
- **Wrapping a Promise with \`from(promise)\` and expecting cancellation.** Unsubscribing from \`from(fetch(...))\` stops listening but does not abort the request. Build the Observable by hand with a teardown that calls \`abort()\`, as above.
- **Forgetting to unsubscribe.** A Subject pipeline created in the constructor lives until you end it; tie it to \`DestroyRef\`.
- **Plain class fields for view state.** Changing a normal field from inside an RxJS callback is not tracked by signals, so the view may not update. Keep view state in signals.
- **\`$event.target.value\` in strict templates.** \`$event.target\` is typed \`EventTarget | null\` and fails \`strictTemplates\`; use a template reference variable.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it:</strong> <span style="color:#f0e2c8;">"View state lives in signals; timing lives in one RxJS pipeline fed by a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Subject</code> of trimmed keystrokes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Debounce:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">debounceTime(300)</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">distinctUntilChanged()</code> means one request per pause, and none for a repeated term."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cancel:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> unsubscribes from the previous search, and my Observable teardown calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abort()</code>, so the old request is actually cancelled."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. States:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> signals derive the status sentence and busy flag; the sentence sits in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=status</code> region."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Clean up:</strong> <span style="color:#f0e2c8;">"The subscription ends in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DestroyRef.onDestroy</code>, so nothing fires after the component is gone."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HttpClient</code> here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In a real app <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpClient</code> returns cancellable Observables and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> cancels the XHR for you. The playground boots with no providers, so this solution simulates the server with a Promise and adds the abort teardown by hand.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you do this with signals only?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> that starts a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> and clears it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code>, and a second effect that aborts in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code>. RxJS is shorter for timing; signals are better for state the template reads. The autocomplete build uses the signal-only style.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the debounce?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fakeAsync</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(299)</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(1)</code>, asserting the mocked search was called once; for the race, emit responses out of order from a test Subject.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">toSignal</code> add?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It turns the pipeline result into a signal and unsubscribes automatically on destroy. It lives in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@angular/core/rxjs-interop</code>, which this playground solution does not import, so the subscription is managed by hand.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Signal** | Reactive value read by calling it, changed with \`set\` / \`update\` |
| **Debounce** | Run once after calls stop for N ms (\`debounceTime\`) |
| **switchMap** | Map to an inner Observable, cancelling the previous inner one |
| **Teardown logic** | Function an Observable runs on unsubscribe or completion |
| **AbortController** | Cancels an async API that received its \`signal\` |
| **DestroyRef** | Injectable that runs callbacks when the component is destroyed |

---
**Conclusion:** The Angular answer is a short RxJS pipeline (\`debounceTime\`, \`distinctUntilChanged\`, \`switchMap\`) feeding signals the template reads, plus an Observable teardown that turns \`switchMap\`'s unsubscribe into a real \`abort()\`. The verified AOT and JIT runs on Angular 22.2.3 show one request for three keystrokes and a slow older request aborted before it could overwrite newer results. Related builds: [search with history](/interview-question/build-a-search-bar-with-history) and [autocomplete](/interview-question/build-an-autocomplete-typeahead-search).`,
        files: {
          "/src/app/app.component.ts": `import { Component } from "@angular/core";
import { SearchBarComponent } from "./search-bar.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [SearchBarComponent],
  template: \`
    <main class="page">
      <h1>Book search</h1>
      <app-search-bar />
    </main>
  \`,
  styles: [\`
    :host { display: block; min-height: 100vh; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color-scheme: dark; }
    .page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
    h1 { font-size: 1.4rem; margin: 0 0 16px; }
  \`],
})
export class AppComponent {}
`,
          "/src/app/api.ts": `// Simulated server: there is no network in this demo.
// Latency depends on the query ON PURPOSE: short queries are slow (700 ms),
// longer ones are fast (200 ms), so an older request can finish after a newer one.
const BOOKS: string[] = [
  "Eloquent JavaScript",
  "JavaScript: The Good Parts",
  "Effective Java",
  "Java Concurrency in Practice",
  "Jane Eyre",
  "Clean Code",
  "The Pragmatic Programmer",
  "Refactoring",
  "Design Patterns",
  "Fluent Python",
  "Python Crash Course",
  "The Rust Programming Language",
  "Learning React",
  "Vue.js in Action",
  "Programming TypeScript",
  "Pride and Prejudice",
];

export function searchBooks(query: string, { signal }: { signal?: AbortSignal } = {}): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    const abortError = () => new DOMException("Request aborted", "AbortError");
    if (signal && signal.aborted) return reject(abortError());
    const latency = query.length < 3 ? 700 : 200;
    const timer = setTimeout(() => {
      const q = query.toLowerCase();
      if (q === "error") return reject(new Error("Server error (simulated)"));
      resolve(BOOKS.filter((title) => title.toLowerCase().includes(q)).slice(0, 8));
    }, latency);
    if (signal) {
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(abortError());
      }, { once: true });
    }
  });
}
`,
          "/src/app/search-bar.component.ts": `import { Component, DestroyRef, ElementRef, ViewChild, computed, inject, signal } from "@angular/core";
import { Observable, Subject, debounceTime, distinctUntilChanged, of, switchMap } from "rxjs";
import { searchBooks } from "./api";

const DELAY = 300;
type Status = "idle" | "loading" | "success" | "error";

@Component({
  selector: "app-search-bar",
  standalone: true,
  template: \`
    <div class="search">
      <label for="book-search" class="label">Search books</label>
      <div class="field">
        <input
          #box
          id="book-search"
          data-testid="search-input"
          type="search"
          autocomplete="off"
          placeholder="Try ja, java or error"
          [value]="query()"
          (input)="onInput(box.value)"
        />
        @if (query()) {
          <button type="button" class="clear" data-testid="clear" aria-label="Clear search" (click)="clear()">×</button>
        }
      </div>

      <p class="status" role="status" data-testid="status">{{ statusText() }}</p>

      @if (showList()) {
        <ul class="results" [class.stale]="busy()" [attr.aria-busy]="busy()" data-testid="results">
          @for (title of items(); track title) {
            <li>{{ title }}</li>
          }
        </ul>
      }

      <h2 class="log-title">Request log</h2>
      <ol class="log" data-testid="log">
        @for (line of log(); track $index) {
          <li>{{ line }}</li>
        }
      </ol>
    </div>
  \`,
  styles: [\`
    .label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
    .field { position: relative; }
    .field input { width: 100%; box-sizing: border-box; padding: 10px 40px 10px 12px; font-size: 1rem; color: inherit; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
    .field input:focus { outline: 2px solid #7aa2ff; outline-offset: 1px; }
    .clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 28px; height: 28px; border: 0; border-radius: 6px; background: transparent; color: #a9b1c6; font-size: 1.2rem; cursor: pointer; }
    .clear:hover { background: #2a2f3f; color: #fff; }
    .status { min-height: 1.4em; font-size: 0.9rem; color: #a9b1c6; margin: 10px 0; }
    .results { list-style: none; margin: 0; padding: 0; border: 1px solid #2a2f3f; border-radius: 8px; overflow: hidden; transition: opacity 0.15s; }
    .results li { padding: 10px 12px; border-top: 1px solid #2a2f3f; }
    .results li:first-child { border-top: 0; }
    .results.stale { opacity: 0.55; }
    .log-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; color: #7d859b; margin: 24px 0 6px; }
    .log { margin: 0; padding-left: 20px; font: 0.8rem/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; color: #b8c0d6; }
  \`],
})
export class SearchBarComponent {
  @ViewChild("box") box?: ElementRef<HTMLInputElement>;

  readonly query = signal("");
  readonly debouncedTerm = signal("");
  readonly items = signal<string[]>([]);
  readonly status = signal<Status>("idle");
  readonly error = signal("");
  readonly log = signal<string[]>([]);

  readonly term = computed(() => this.query().trim());
  readonly typing = computed(() => this.term() !== this.debouncedTerm());
  readonly busy = computed(() => this.typing() || this.status() === "loading");
  readonly showList = computed(() => !!this.term() && this.status() !== "error" && this.items().length > 0);
  readonly statusText = computed(() => {
    const term = this.term();
    if (!term) return "Type to search the catalog";
    if (this.typing()) return "Waiting for you to stop typing...";
    if (this.status() === "loading") return "Searching...";
    if (this.status() === "error") return "Error: " + this.error();
    if (this.items().length === 0) return "No books match " + JSON.stringify(term);
    return this.items().length + " results for " + JSON.stringify(term);
  });

  private readonly terms = new Subject<string>();
  private requestId = 0;

  constructor() {
    const subscription = this.terms
      .pipe(
        debounceTime(DELAY),
        distinctUntilChanged(),
        // switchMap unsubscribes from the previous inner Observable before
        // subscribing to the next one; our teardown turns that into abort().
        switchMap((term) => {
          this.debouncedTerm.set(term);
          if (!term) {
            this.status.set("idle");
            this.items.set([]);
            return of(null);
          }
          return this.search$(term);
        }),
      )
      .subscribe();
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  onInput(value: string) {
    this.query.set(value);
    this.terms.next(value.trim());
  }

  clear() {
    this.onInput("");
    this.box?.nativeElement.focus();
  }

  private addLog(line: string) {
    this.log.update((prev) => [...prev.slice(-5), line]);
  }

  private search$(term: string): Observable<null> {
    return new Observable<null>((subscriber) => {
      const controller = new AbortController();
      const id = ++this.requestId;
      const label = "#" + id + " " + JSON.stringify(term);
      this.status.set("loading"); // previous items stay on screen while this runs
      this.error.set("");
      this.addLog(label + " sent");

      searchBooks(term, { signal: controller.signal })
        .then((found) => {
          this.items.set(found);
          this.status.set("success");
          this.addLog(label + " done: " + found.length + " results");
          subscriber.complete();
        })
        .catch((err: Error) => {
          if (err.name === "AbortError") {
            this.addLog(label + " aborted");
            return; // a newer search replaced this one: not an error
          }
          this.items.set([]);
          this.error.set(err.message);
          this.status.set("error");
          this.addLog(label + " failed");
          subscriber.complete();
        });

      return () => controller.abort(); // teardown: no-op if the request already settled
    });
  }
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Search Bar with History",
    seoDescription:
      "Build a search bar with recent-search history: localStorage persistence, case-insensitive dedupe, a cap, keyboard focus, and cross-tab sync.",
    description: `**Question presented to candidate:**
"Add recent searches to our article search. When someone submits a query, remember it. When they click into the box, show their last five searches; picking one runs it again. The list should survive a page reload, should not contain duplicates, and should be usable from the keyboard."

**Requirements:**
- Submitting (Enter or the Search button) runs the search and records the term: trimmed, newest first, case-insensitive de-duplication (a repeat moves to the top), capped at 5.
- Persist the list in \`localStorage\`; survive corrupt or missing data and storage that throws.
- Clicking the input opens a "Recent searches" dropdown, filtered by what is typed; each row re-runs its search and has a remove (×) button; there is a "Clear all".
- Keyboard: Down arrow moves into the list, Up / Down move between rows, Delete removes the focused row, Escape closes and returns to the input.
- Close on a press outside or when focus leaves the widget; follow changes made in another tab.

**What a strong answer should cover:**
- Pure helper functions (\`addToHistory\`, \`parseHistory\`) separate from the UI, so dedupe and cap logic are testable on their own.
- Defensive \`localStorage\` access: \`try/catch\` around reads and writes, validating the parsed JSON shape.
- One \`commit()\` path that updates state and storage together, instead of an effect that writes storage on every render.
- Focus management: where focus goes after a row is removed, and why real focus moving between buttons is used here instead of \`aria-activedescendant\`.
- Outside-press and focus-leave closing, and the \`storage\` event for cross-tab sync.

**Clarifying questions expected:**
- "Is history per device (localStorage) or per account (server)? Should it sync across tabs?"
- "How many entries, and should 'React' and 'react' count as the same search?"
- "Should the dropdown open on focus, on click, or only when the user presses Down?"

**Code / implementation expected:** Yes. A working component with persisted, de-duplicated, capped history and keyboard support.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round. Assumes basic React state and events; \`localStorage\` and focus management are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. The Verified output was produced by running the solution on React 19.3.1 in jsdom, with a driver that typed, pressed keys, fired storage events and moved focus.

## 1. Why This Even Matters — A Story First

Think of the sticky notes on a pharmacist's counter: the five prescriptions people asked about most recently. When a regular comes back, the pharmacist glances at the notes instead of starting from scratch. Nobody writes the same name twice; a returning name just moves to the top note. When the notes run out, the oldest is thrown away.

A search bar with history is those sticky notes. The interesting part is not the search, which can be anything; it is the **list**: keeping it de-duplicated and short, saving it so it survives a reload, and making it usable without a mouse. This question is a sibling of the [debounced search bar](/interview-question/build-a-debounced-search-bar), which is about request timing. Here the search is instant on purpose, so all the attention goes to history.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Per device or per account? | \`localStorage\` is per browser profile and origin; a per-account history needs a server API. |
| Do "React" and "react" count as one entry? | Decides the dedupe key (case-insensitive here) and which casing you keep (the newest). |
| How many entries? | A cap keeps the dropdown short and storage small; 5-10 is common. |
| Open on focus, on click, or on Down arrow? | Opening on focus can pop the list up when focus returns to the box after a search; this build opens on click, typing and Down. |
| Sync across tabs? | Needs a \`storage\` event listener. |
| Can users remove one entry or clear all? | Privacy expectation; both are included. |

## 3. Requirements and Plan

\`App\` → \`HistorySearch\`, plus a framework-free module \`history.js\` with every rule about the list:

\`\`\`js
export function addToHistory(list, term) {
  const clean = term.trim();
  if (!clean) return list;
  const rest = list.filter((t) => t.toLowerCase() !== clean.toLowerCase());
  return [clean, ...rest].slice(0, MAX_ITEMS); // newest first, capped
}
\`\`\`

| Value | Kind | Note |
| :--- | :--- | :--- |
| \`query\` | state | the input text |
| \`history\` | state, lazily initialised from storage | the source of truth while the page is open |
| \`open\` | state | is the dropdown visible |
| \`submitted\` | state | last searched term; results are derived from it |
| \`visible\` | derived | \`history\` filtered by the typed text |
| root and input elements | refs | for outside-press checks and focus |

📌 **Interview term: Pure function** — returns a value computed only from its arguments and changes nothing else. \`addToHistory\` is pure, so dedupe and cap rules can be unit-tested without React.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 280" role="img" aria-label="Data flow: user actions go through commit, which updates React state and localStorage; a storage event from another tab updates state">
  <defs>
    <marker id="q2r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="180" height="60" rx="10"/>
  <text class="d-text" x="110" y="56" text-anchor="middle">search, remove,</text>
  <text class="d-sub" x="110" y="76" text-anchor="middle">clear all</text>
  <rect class="d-box-accent" x="260" y="30" width="160" height="60" rx="10"/>
  <text class="d-text d-accent" x="340" y="66" text-anchor="middle">commit(next)</text>
  <rect class="d-box" x="480" y="10" width="180" height="50" rx="10"/>
  <text class="d-text" x="570" y="40" text-anchor="middle">history state</text>
  <rect class="d-box" x="480" y="110" width="180" height="50" rx="10"/>
  <text class="d-text" x="570" y="140" text-anchor="middle">localStorage</text>
  <rect class="d-box-muted" x="260" y="200" width="160" height="60" rx="10"/>
  <text class="d-text" x="340" y="226" text-anchor="middle">other tab</text>
  <text class="d-sub" x="340" y="246" text-anchor="middle">storage event</text>
  <path class="d-edge" d="M 200 60 L 252 60" marker-end="url(#q2r-arrow)"/>
  <path class="d-edge-accent" d="M 420 50 L 472 36" marker-end="url(#q2r-arrow)"/>
  <path class="d-edge-accent" d="M 420 72 L 472 128" marker-end="url(#q2r-arrow)"/>
  <path class="d-edge-dashed" d="M 420 230 L 590 230 L 590 66" marker-end="url(#q2r-arrow)"/>
</svg>

Every change goes through one \`commit()\` that writes state and storage together. Storage is only read once, at start-up, and again when another tab announces a change.

## 4. Build It Step by Step

### Step 1: read storage defensively

\`\`\`js
export function parseHistory(raw) {
  try {
    const value = JSON.parse(raw == null ? "[]" : raw);
    return Array.isArray(value) ? value.filter((t) => typeof t === "string").slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}
export function loadHistory() {
  try { return parseHistory(window.localStorage.getItem(STORAGE_KEY)); }
  catch { return []; } // storage blocked (privacy mode, sandboxed iframe)
}
\`\`\`

Never trust storage: an older version of your app, a browser extension or a curious user may have written anything there. \`getItem\` itself can throw when storage is disabled, and \`setItem\` can throw when the quota is full, so both are wrapped.

📌 **Interview term: localStorage** — a per-origin key/value store of strings that survives reloads and browser restarts, read and written synchronously. Compare it with sessionStorage and cookies in [localStorage vs sessionStorage vs cookies](/interview-question/what-is-the-difference-between-localstorage-sessionstorage-and-cookies).

### Step 2: lazy initial state and one commit path

\`\`\`js
const [history, setHistory] = useState(loadHistory); // lazy: read storage once

function commit(next) {
  setHistory(next);
  saveHistory(next);
}
\`\`\`

Passing the function \`loadHistory\` (not \`loadHistory()\`) means React calls it only on the first render.

📌 **Interview term: Lazy initial state** — giving \`useState\` a function so an expensive initial value is computed once instead of on every render.

Why not an effect that saves whenever \`history\` changes? It works, but it also writes on mount and writes back values that just arrived from another tab. An explicit \`commit()\` keeps "the user changed something" and "we were told something changed" separate.

### Step 3: running a search

\`\`\`js
function runSearch(term) {
  const clean = term.trim();
  if (!clean) return;
  commit(addToHistory(history, clean));
  setQuery(clean);
  setSubmitted(clean);
  setOpen(false);
  inputRef.current.focus();
}
\`\`\`

The form has \`role="search"\` and its \`onSubmit\` calls \`runSearch(query)\` after \`preventDefault()\`, so Enter and the Search button share one path.

### Step 4: keyboard with real focus

The dropdown rows are ordinary \`<button>\`s. Down arrow from the input moves **real DOM focus** onto the first row; Up and Down move between rows; Up from the first row goes back to the input.

\`\`\`js
function onItemKeyDown(e, i, term) {
  if (e.key === "ArrowDown") { e.preventDefault(); focusItem(Math.min(i + 1, visible.length - 1)); }
  else if (e.key === "ArrowUp") { e.preventDefault(); focusItem(i - 1); }
  else if (e.key === "Delete") { e.preventDefault(); remove(term, i); }
  else if (e.key === "Escape") { setOpen(false); inputRef.current.focus(); }
  // Enter and Space are not handled here: a button turns them into a click.
}
\`\`\`

Why buttons and real focus instead of the combobox pattern? Each row has two actions (re-run and remove). An ARIA \`option\` must not contain another interactive element, so a listbox does not fit. Buttons get Enter, Space, focus rings and screen-reader names for free. The single-action version with \`aria-activedescendant\` is the [combobox](/interview-question/build-a-combobox-search-select).

📌 **Interview term: Roving focus** — moving actual keyboard focus between items of a composite widget with arrow keys. The alternative, **active descendant**, keeps focus on one element and points at the highlighted item with \`aria-activedescendant\`.

### Step 5: focus after removing a row

\`\`\`js
function remove(term, index) {
  // flushSync renders now, so the DOM already shows the shorter list...
  flushSync(() => commit(removeFromHistory(history, term)));
  // ...and keyboard users stay in it: focus the row that slid into this slot.
  const list = rows();
  (list[Math.min(index, list.length - 1)] || inputRef.current).focus();
}
\`\`\`

If you remove the focused button and do nothing, focus falls to \`<body>\` and a keyboard user is lost at the top of the page. \`flushSync\` from \`react-dom\` applies the update synchronously, so the next line can find the new rows.

📌 **Interview term: flushSync** — forces React to apply the state updates inside its callback immediately, before returning. Use it sparingly; it is the right tool when the next line must read or focus the updated DOM.

### Step 6: closing and cross-tab sync

\`\`\`js
useEffect(() => {
  if (!open) return;
  const onPointerDown = (e) => { if (!rootRef.current.contains(e.target)) setOpen(false); };
  document.addEventListener("mousedown", onPointerDown);
  return () => document.removeEventListener("mousedown", onPointerDown);
}, [open]);

useEffect(() => {
  const onStorage = (e) => {
    if (e.key === STORAGE_KEY || e.key === null) setHistory(parseHistory(e.newValue));
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}, []);
\`\`\`

The outside-press listener is attached only while open. An \`onBlur\` on the root (React's \`onBlur\` bubbles, like \`focusout\`) closes the dropdown when \`relatedTarget\`, the element receiving focus, is outside the widget: that covers Tab.

📌 **Interview term: storage event** — fired on \`window\` in *other* same-origin tabs when \`localStorage\` changes (never in the tab that wrote). \`e.key\` is the changed key, or \`null\` after \`localStorage.clear()\`.

## 5. Verified: What the Driver Printed

Mounted under \`StrictMode\` in jsdom. The driver clicked, typed, pressed keys, dispatched a \`StorageEvent\` by hand to imitate another tab, and called \`focus()\` on an element outside the widget to imitate Tab. One limit: jsdom does not turn Enter on a focused button into a click the way a browser does, so the driver calls \`click()\` on the focused row for that step.

\`\`\`
focus only      : open: false
click input     : open: true | No recent searches yet
corrupt storage : items: [] | still open: true
after 8 searches: [] | open: false
localStorage    : ["vue","HTML","CSS grid","Svelte","Angular"]
results         : 1 results for "vue"
typed s         : ["CSS grid","Svelte"]
cleared input   : ["vue","HTML","CSS grid","Svelte","Angular"]
ArrowDown       : focus "vue"
ArrowDown       : focus "HTML"
Delete          : focus "CSS grid" | items: ["vue","CSS grid","Svelte","Angular"]
ArrowUp x2      : focus input
Enter on item   : input: "CSS grid" | open: false | focus input | 1 results for "CSS grid"
history now     : ["CSS grid","vue","Svelte","Angular"]
Escape          : open: false
click input     : open: true
press outside   : open: false
click again     : open: true
focus leaves    : open: false
storage event   : ["from another tab","React"]
click remove x  : ["React"]
Clear all       : items: 0 | No recent searches yet | storage: []
\`\`\`

Reading it: the eight searches were React, Vue, "  react  ", Angular, Svelte, CSS grid, HTML, vue. "react" replaced "React" and then fell off the end when the cap of 5 was reached; "vue" moved to the top with the newest casing. A corrupt value (\`{not json\`) from "another tab" produced an empty list instead of a crash. Delete kept focus in the list on the row that slid up. A storage event replaced the list live.

## 6. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Search landmark | \`<form role="search">\` |
| Discoverability | \`aria-describedby\` hint: "Press Down arrow to browse recent searches." |
| Row names | Each row is a \`<button>\` with the term as its name; × has \`aria-label="Remove react from history"\` |
| Remove without a mouse | Delete on a focused row; the × buttons are \`tabIndex={-1}\` so Tab does not stop twice per row |
| Focus after removal | Moves to the row that took its place, or back to the input |
| Results announced | Results section is \`aria-live="polite"\` |
| Storage unavailable | Reads and writes in \`try/catch\`; the list keeps working in memory |

## 7. Common Pitfalls

- **\`JSON.parse(localStorage.getItem(k))\` with no guard.** One bad value and the component throws on mount, every time, until the user clears site data.
- **Case-sensitive dedupe.** "React" and "react " become two entries. Trim, and compare lowercased.
- **Appending instead of moving to the top.** A repeated search should become the newest entry, not stay where it was.
- **Opening on \`focus\`.** Programmatic \`focus()\` after running a search re-opens the dropdown you just closed. Open on click, typing and Down arrow instead.
- **Closing on \`blur\` of the input.** Moving focus into the list blurs the input and closes the list before the user can use it. Check \`relatedTarget\` against the whole widget.
- **Removing the focused element without moving focus.** Focus drops to \`<body>\`.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Pure rules first:</strong> <span style="color:#f0e2c8;">"I put dedupe, cap and parsing in pure functions: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addToHistory</code> trims, removes a case-insensitive duplicate, puts the term first and slices to five."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Storage:</strong> <span style="color:#f0e2c8;">"History is lazy initial state read once from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try/catch</code>, validated as an array of strings, and every change goes through one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">commit</code> that sets state and storage."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Dropdown:</strong> <span style="color:#f0e2c8;">"Clicking or typing opens a filtered list of buttons; each row re-runs the search, and has a remove button plus a Clear all."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Keyboard:</strong> <span style="color:#f0e2c8;">"Down moves real focus into the rows, Up and Down move between them, Delete removes the focused row and focus lands on its neighbour, Escape returns to the input."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Edges:</strong> <span style="color:#f0e2c8;">"It closes on an outside press or when focus leaves, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">storage</code> listener keeps other tabs in sync."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useEffect(() =&gt; save(history), [history])</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works but writes on mount and echoes values received from other tabs back to storage. An explicit commit path separates user changes from external ones and is easier to reason about.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you store history per user?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the same pure helpers, but load from and save to an API (debounced or on submit), keyed by user id; keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code> as an offline cache and reconcile on login.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useSyncExternalStore</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the React hook for subscribing to an external store like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">storage</code> listener; it guarantees a consistent read during concurrent rendering. For one component, state plus a listener is enough; for many components sharing the history, wrap it in a store with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useSyncExternalStore</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addToHistory</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parseHistory</code> directly; component-test with Testing Library by seeding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code>, submitting, and asserting both the rendered rows and the stored JSON; dispatch a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StorageEvent</code> to test cross-tab sync.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is search history sensitive data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It can be. Offer clear-all and per-item removal, do not store queries typed into password-like fields, and consider <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sessionStorage</code> or an expiry if the device may be shared.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pure function** | Output depends only on inputs; no side effects |
| **localStorage** | Per-origin string store that survives reloads |
| **Lazy initial state** | \`useState(fn)\` runs \`fn\` only on the first render |
| **Roving focus** | Arrow keys move real focus between items |
| **flushSync** | Apply React updates synchronously so the DOM is current on the next line |
| **storage event** | Fired in other tabs when \`localStorage\` changes |
| **relatedTarget** | On blur / focusout, the element that is receiving focus |

---
**Conclusion:** A search bar with history is a small data-structure problem wrapped in a focus-management problem. Keep the rules (trim, case-insensitive dedupe, newest first, cap) in pure functions, read storage once and defensively, write through one commit path, and move real focus between button rows so removal and re-running are both keyboard-friendly. The verified run on React 19.3.1 shows the cap and dedupe working, a corrupt stored value handled safely, focus staying in the list after Delete, and a second tab's change arriving through the \`storage\` event. For the request-timing side of search, see the [debounced search bar](/interview-question/build-a-debounced-search-bar).`,
        files: {
          "/App.js": `import HistorySearch from "./src/HistorySearch";

export default function App() {
  return (
    <main className="page">
      <h1>Article search</h1>
      <HistorySearch />
    </main>
  );
}
`,
          "/src/history.js": `// Pure helpers for the recent-searches list. No framework code in here.
export const STORAGE_KEY = "recent-searches";
export const MAX_ITEMS = 5;

// Never trust what is in storage: another version of the app, an extension
// or the user may have written anything there.
export function parseHistory(raw) {
  try {
    const value = JSON.parse(raw == null ? "[]" : raw);
    return Array.isArray(value) ? value.filter((t) => typeof t === "string").slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

export function loadHistory() {
  try {
    return parseHistory(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return []; // storage blocked (privacy mode, sandboxed iframe)
  }
}

export function saveHistory(list) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // quota exceeded or storage blocked: keep the in-memory list
  }
}

// Newest first, case-insensitive de-duplication, capped length.
export function addToHistory(list, term) {
  const clean = term.trim();
  if (!clean) return list;
  const rest = list.filter((t) => t.toLowerCase() !== clean.toLowerCase());
  return [clean, ...rest].slice(0, MAX_ITEMS);
}

export function removeFromHistory(list, term) {
  return list.filter((t) => t !== term);
}

// Simulated, synchronous "search": the point of this widget is the history.
const ARTICLES = [
  "React hooks in depth",
  "Thinking in React",
  "React Server Components",
  "Vue reactivity explained",
  "Angular signals guide",
  "CSS grid layout",
  "Svelte for React developers",
];

export function searchArticles(term) {
  const q = term.toLowerCase();
  return ARTICLES.filter((a) => a.toLowerCase().includes(q));
}
`,
          "/src/HistorySearch.js": `import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  STORAGE_KEY, addToHistory, loadHistory, parseHistory, removeFromHistory, saveHistory, searchArticles,
} from "./history";

export default function HistorySearch() {
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState(loadHistory); // lazy: read storage once
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState("");
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const q = query.trim().toLowerCase();
  const visible = q ? history.filter((t) => t.toLowerCase().includes(q)) : history;
  const results = submitted ? searchArticles(submitted) : [];

  // Every change goes through here: state and storage stay in step.
  function commit(next) {
    setHistory(next);
    saveHistory(next);
  }

  function runSearch(term) {
    const clean = term.trim();
    if (!clean) return;
    commit(addToHistory(history, clean));
    setQuery(clean);
    setSubmitted(clean);
    setOpen(false);
    inputRef.current.focus();
  }

  // The history buttons currently on screen, in order.
  const rows = () => [...rootRef.current.querySelectorAll(".item")];

  function focusItem(i) {
    if (i < 0) inputRef.current.focus();
    else if (rows()[i]) rows()[i].focus();
  }

  function remove(term, index) {
    // flushSync renders now, so the DOM already shows the shorter list...
    flushSync(() => commit(removeFromHistory(history, term)));
    // ...and keyboard users stay in it: focus the row that slid into this slot.
    const list = rows();
    (list[Math.min(index, list.length - 1)] || inputRef.current).focus();
  }

  function onInputKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else focusItem(0);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function onItemKeyDown(e, i, term) {
    if (e.key === "ArrowDown") { e.preventDefault(); focusItem(Math.min(i + 1, visible.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusItem(i - 1); }
    else if (e.key === "Delete") { e.preventDefault(); remove(term, i); }
    else if (e.key === "Escape") { setOpen(false); inputRef.current.focus(); }
    // Enter and Space are not handled here: a button turns them into a click.
  }

  // Close on a pointer press outside the widget.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Another tab changed the list: follow it.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY || e.key === null) setHistory(parseHistory(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Focus left the widget (Tab, or a click on something focusable outside).
  function onBlur(e) {
    if (!rootRef.current.contains(e.relatedTarget)) setOpen(false);
  }

  return (
    <div className="history-search" ref={rootRef} onBlur={onBlur}>
      <form role="search" onSubmit={(e) => { e.preventDefault(); runSearch(query); }}>
        <label htmlFor="article-search" className="label">Search articles</label>
        <div className="row">
          <input
            id="article-search"
            ref={inputRef}
            data-testid="search-input"
            type="search"
            autoComplete="off"
            aria-describedby="history-hint"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onClick={() => setOpen(true)}
            onKeyDown={onInputKeyDown}
          />
          <button type="submit" data-testid="submit">Search</button>
        </div>
        <span id="history-hint" className="sr-only">Press Down arrow to browse recent searches.</span>
      </form>

      {open && (
        <div className="dropdown" data-testid="dropdown">
          <div className="dropdown-head">
            <span id="history-label">Recent searches</span>
            {history.length > 0 && (
              <button type="button" className="link" data-testid="clear-history" onClick={() => { commit([]); inputRef.current.focus(); }}>
                Clear all
              </button>
            )}
          </div>
          {visible.length === 0 ? (
            <p className="empty" data-testid="history-empty">
              {history.length ? "No recent searches match" : "No recent searches yet"}
            </p>
          ) : (
            <ul aria-labelledby="history-label" data-testid="history">
              {visible.map((term, i) => (
                <li key={term}>
                  <button
                    type="button"
                    className="item"
                    data-testid="history-item"
                    onClick={() => runSearch(term)}
                    onKeyDown={(e) => onItemKeyDown(e, i, term)}
                  >
                    {term}
                  </button>
                  <button
                    type="button"
                    className="remove"
                    tabIndex={-1}
                    aria-label={"Remove " + term + " from history"}
                    data-testid="remove"
                    onClick={() => remove(term, i)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {submitted && (
        <section className="results" aria-live="polite" data-testid="results">
          <p>{results.length} results for {JSON.stringify(submitted)}</p>
          <ul>{results.map((r) => <li key={r}>{r}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
`,
          "/styles.css": `:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
.page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 1.4rem; margin: 0 0 16px; }
.label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
.history-search { position: relative; }
.row { display: flex; gap: 8px; }
.row input { flex: 1; min-width: 0; padding: 10px 12px; font-size: 1rem; color: inherit; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
.row input:focus, button:focus-visible { outline: 2px solid #7aa2ff; outline-offset: 1px; }
.row button { padding: 0 16px; border: 0; border-radius: 8px; background: #3d5afe; color: #fff; font-weight: 600; cursor: pointer; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.dropdown { position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 10; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); padding: 6px; }

.dropdown-head { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: #7d859b; }
.link { background: none; border: 0; color: #7aa2ff; cursor: pointer; font-size: 0.8rem; }
.dropdown ul { list-style: none; margin: 0; padding: 0; }
.dropdown li { display: flex; align-items: center; border-radius: 6px; }
.dropdown li:hover, .dropdown li:focus-within { background: #262b3a; }
.item { flex: 1; text-align: left; padding: 8px; background: none; border: 0; color: inherit; font-size: 0.95rem; cursor: pointer; border-radius: 6px; }
.remove { width: 32px; height: 32px; background: none; border: 0; color: #7d859b; font-size: 1.1rem; cursor: pointer; border-radius: 6px; }
.remove:hover { color: #ff8a80; }
.empty { margin: 6px 8px; color: #7d859b; font-size: 0.9rem; }
.results ul { padding-left: 20px; }
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers preparing for a machine coding round. Assumes \`ref\`, \`computed\` and templates; \`localStorage\` and focus handling are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The Verified output came from compiling the SFCs with @vue/compiler-sfc and mounting with \`createApp(App).mount("#app")\` on Vue 3.5.44 in jsdom, driven by a script that typed, pressed keys, fired storage events and moved focus.

## 1. A Story First

A pharmacist keeps sticky notes of the last five things customers asked about. A returning name moves to the top note instead of being written twice, and the oldest note goes in the bin when space runs out. A search bar with history is those notes: **de-duplicated, newest first, capped, saved across reloads, and usable from the keyboard.** The search itself is instant and simulated here, so the whole build is about the list. Request timing is the topic of the [debounced search bar](/interview-question/build-a-debounced-search-bar).

## 2. The Plan in Vue Terms

| Piece | Vue tool |
| :--- | :--- |
| Typed text | \`ref("")\` with \`v-model\` |
| History | \`ref(loadHistory())\` read once when the component is created |
| Dropdown open | \`ref(false)\` |
| Filtered rows, results | \`computed\` |
| Rules (dedupe, cap, parse) | plain functions in \`history.js\`, no Vue inside |
| Outside press | a document listener added by \`watch(open)\` and removed on close and in \`onBeforeUnmount\` |
| Other tabs | \`storage\` listener added in \`onMounted\` |

\`\`\`js
export function addToHistory(list, term) {
  const clean = term.trim();
  if (!clean) return list;
  const rest = list.filter((t) => t.toLowerCase() !== clean.toLowerCase());
  return [clean, ...rest].slice(0, MAX_ITEMS); // newest first, capped
}
\`\`\`

📌 **Interview term: Pure function** — output computed only from its arguments, no side effects. The history rules are pure, so they can be unit-tested without mounting anything.

📌 **Interview term: localStorage** — a per-origin store of strings that survives reloads, read synchronously. It can throw (blocked storage, full quota), so every access is wrapped in \`try/catch\`, and the parsed value is checked to be an array of strings. Compare storage options in [localStorage vs sessionStorage vs cookies](/interview-question/what-is-the-difference-between-localstorage-sessionstorage-and-cookies).

## 3. Build It Step by Step

### Step 1: one commit path

\`\`\`js
function commit(next) {
  history.value = next;
  saveHistory(next);
}
function runSearch(term) {
  const clean = term.trim();
  if (!clean) return;
  commit(addToHistory(history.value, clean));
  query.value = clean;
  submitted.value = clean;
  open.value = false;
  inputEl.value.focus();
}
\`\`\`

A \`watch(history, saveHistory)\` would also work, but it would echo lists received from other tabs straight back into storage. Writing in \`commit()\` keeps user changes and external changes apart. The form uses \`@submit.prevent="runSearch(query)"\`, so Enter and the button share one path.

📌 **Interview term: Event modifier** — \`.prevent\` on \`@submit.prevent\` calls \`event.preventDefault()\` for you, so the form does not reload the page. More in [events and modifiers](/interview-question/how-do-you-handle-events-in-vue-v-on-and-event-modifiers).

### Step 2: rows are buttons, arrows move real focus

\`\`\`js
function onItemKeydown(e, i, term) {
  if (e.key === "ArrowDown") { e.preventDefault(); focusItem(Math.min(i + 1, visible.value.length - 1)); }
  else if (e.key === "ArrowUp") { e.preventDefault(); focusItem(i - 1); }
  else if (e.key === "Delete") { e.preventDefault(); remove(term, i); }
  else if (e.key === "Escape") { open.value = false; inputEl.value.focus(); }
}
\`\`\`

Each row has two actions (re-run, remove), which an ARIA \`option\` cannot hold, so the rows are plain \`<button>\`s and the arrow keys move real focus between them.

📌 **Interview term: Roving focus** — arrow keys move actual DOM focus across items. The other technique, \`aria-activedescendant\`, keeps focus in the input; it is used in the [combobox](/interview-question/build-a-combobox-search-select).

### Step 3: focus after removing a row

\`\`\`js
async function remove(term, index) {
  commit(removeFromHistory(history.value, term));
  await nextTick(); // wait for the DOM to show the shorter list
  const list = rows();
  (list[Math.min(index, list.length - 1)] || inputEl.value).focus();
}
\`\`\`

Vue batches DOM updates; right after \`commit()\` the old row is still in the DOM. \`nextTick()\` resolves after the re-render, so the next row can be focused. Without it, focus would fall to \`<body>\` when the focused button disappears.

📌 **Interview term: nextTick** — a promise that resolves after Vue has flushed pending DOM updates. See [what is nextTick](/interview-question/what-is-nexttick-in-vue).

### Step 4: closing and cross-tab sync

\`\`\`js
watch(open, (isOpen) => {
  if (isOpen) document.addEventListener("mousedown", onDocumentPointerDown);
  else document.removeEventListener("mousedown", onDocumentPointerDown);
});
function onStorage(e) {
  if (e.key === STORAGE_KEY || e.key === null) history.value = parseHistory(e.newValue);
}
onMounted(() => window.addEventListener("storage", onStorage));
onBeforeUnmount(() => {
  window.removeEventListener("storage", onStorage);
  document.removeEventListener("mousedown", onDocumentPointerDown);
});
\`\`\`

\`@focusout\` on the root closes the dropdown when \`e.relatedTarget\` (the element receiving focus) is outside, which handles Tab.

📌 **Interview term: storage event** — fired in *other* same-origin tabs when \`localStorage\` changes; \`e.key\` is \`null\` after \`localStorage.clear()\`.

## 4. Verified: What the Driver Printed

The driver dispatched a \`StorageEvent\` by hand to imitate another tab, called \`focus()\` on an outside button to imitate Tab, and called \`click()\` on the focused row for the Enter step (jsdom does not turn Enter on a button into a click the way a browser does).

\`\`\`
focus only      : open: false
click input     : open: true | No recent searches yet
corrupt storage : items: [] | still open: true
after 8 searches: [] | open: false
localStorage    : ["vue","HTML","CSS grid","Svelte","Angular"]
results         : 1 results for "vue"
typed s         : ["CSS grid","Svelte"]
cleared input   : ["vue","HTML","CSS grid","Svelte","Angular"]
ArrowDown       : focus "vue"
ArrowDown       : focus "HTML"
Delete          : focus "CSS grid" | items: ["vue","CSS grid","Svelte","Angular"]
ArrowUp x2      : focus input
Enter on item   : input: "CSS grid" | open: false | focus input | 1 results for "CSS grid"
history now     : ["CSS grid","vue","Svelte","Angular"]
Escape          : open: false
click input     : open: true
press outside   : open: false
click again     : open: true
focus leaves    : open: false
storage event   : ["from another tab","React"]
click remove x  : ["React"]
Clear all       : items: 0 | No recent searches yet | storage: []
\`\`\`

The searches were React, Vue, "  react  ", Angular, Svelte, CSS grid, HTML, vue: "react" replaced "React" and later fell off the five-item cap, and "vue" moved to the top with its newest casing. A corrupt stored value gave an empty list, not an error. These lines match the React and Angular builds exactly.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Landmark | \`<form role="search">\` |
| Hint | \`aria-describedby\` points at "Press Down arrow to browse recent searches." |
| Remove buttons | \`:aria-label="'Remove ' + term + ' from history'"\`, \`tabindex="-1"\` (Delete is the keyboard path) |
| Focus after removal | \`nextTick\` then focus the neighbour or the input |
| Storage blocked | \`try/catch\`; list still works in memory |

## 6. Common Pitfalls

- **Unguarded \`JSON.parse\`** of stored data: one bad value breaks the component on every load.
- **Opening the dropdown on \`@focus\`**: the \`focus()\` call after a search re-opens it immediately.
- **Closing on input \`@blur\`**: moving focus into the rows closes the list. Use \`@focusout\` on the wrapper and check \`relatedTarget\`.
- **Forgetting \`nextTick\` before focusing** a re-rendered row.
- **Leaving the document listener attached** after unmount; remove it in \`onBeforeUnmount\` too, not only when the dropdown closes.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Rules:</strong> <span style="color:#f0e2c8;">"Dedupe, cap and parsing live in pure functions; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addToHistory</code> trims, drops a case-insensitive duplicate, puts the new term first and slices to five."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;">"History is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> read once from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code> in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try/catch</code>, and one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">commit</code> function writes both the ref and storage."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rows:</strong> <span style="color:#f0e2c8;">"The dropdown is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code> of buttons filtered by a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>; each row re-runs its search and has a remove button."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Keyboard:</strong> <span style="color:#f0e2c8;">"Down moves real focus into the rows, Delete removes one and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code> lets me focus its neighbour, Escape returns to the input."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Edges:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@focusout</code> and a document <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mousedown</code> close it, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">storage</code> listener added in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> keeps tabs in sync."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you make this a composable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes for reuse: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useSearchHistory(key, max)</code> returning the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">history</code> ref plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clear</code>, with the storage listener registered and removed inside it. Multiple components calling it with the same key could share one module-level ref.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useStorage</code> from VueUse?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a good production choice and handles serialisation and cross-tab sync. In an interview, writing the guard and the storage event yourself shows you know the failure modes it hides.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test the pure helpers; with Vue Test Utils, seed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code>, submit the form, assert rendered rows and stored JSON, and dispatch a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StorageEvent</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if two tabs write at the same time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Last write wins, and each tab receives the other one's event. For history that is acceptable; for important data, merge on receive (for example union then re-cap) instead of replacing.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pure function** | Output from inputs only, no side effects |
| **localStorage** | Per-origin string store that survives reloads |
| **Event modifier** | \`.prevent\`, \`.stop\` and friends on \`v-on\` |
| **Roving focus** | Arrow keys move real focus between items |
| **nextTick** | Wait for Vue to finish updating the DOM |
| **storage event** | Fired in other tabs when \`localStorage\` changes |

---
**Conclusion:** In Vue the history bar is a \`ref\` initialised from storage, pure rules for dedupe and cap, a single commit path, and a list of buttons with roving focus, with \`nextTick\` used to keep focus in the list after a removal. The verified run on Vue 3.5.44 shows dedupe with newest casing, the five-item cap, safe handling of corrupt storage and live cross-tab updates. For suggestions fetched from a server instead of a local list, see the [autocomplete build](/interview-question/build-an-autocomplete-typeahead-search).`,
        files: {
          "/src/App.vue": `<script setup>
import HistorySearch from "./components/HistorySearch.vue";
</script>

<template>
  <main class="page">
    <h1>Article search</h1>
    <HistorySearch />
  </main>
</template>

<style>
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
.page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 1.4rem; margin: 0 0 16px; }
</style>
`,
          "/src/components/HistorySearch.vue": `<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  STORAGE_KEY, addToHistory, loadHistory, parseHistory, removeFromHistory, saveHistory, searchArticles,
} from "../history.js";

const query = ref("");
const history = ref(loadHistory());
const open = ref(false);
const submitted = ref("");
const root = ref(null);
const inputEl = ref(null);

const visible = computed(() => {
  const q = query.value.trim().toLowerCase();
  return q ? history.value.filter((t) => t.toLowerCase().includes(q)) : history.value;
});
const results = computed(() => (submitted.value ? searchArticles(submitted.value) : []));

// Every change goes through here: state and storage stay in step.
function commit(next) {
  history.value = next;
  saveHistory(next);
}

function runSearch(term) {
  const clean = term.trim();
  if (!clean) return;
  commit(addToHistory(history.value, clean));
  query.value = clean;
  submitted.value = clean;
  open.value = false;
  inputEl.value.focus();
}

// The history buttons currently on screen, in order.
const rows = () => [...root.value.querySelectorAll(".item")];

function focusItem(i) {
  if (i < 0) inputEl.value.focus();
  else if (rows()[i]) rows()[i].focus();
}

async function remove(term, index) {
  commit(removeFromHistory(history.value, term));
  await nextTick(); // wait for the DOM to show the shorter list
  const list = rows();
  (list[Math.min(index, list.length - 1)] || inputEl.value).focus();
}

function onInput() {
  open.value = true;
}

function onInputKeydown(e) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!open.value) open.value = true;
    else focusItem(0);
  } else if (e.key === "Escape") {
    open.value = false;
  }
}

function onItemKeydown(e, i, term) {
  if (e.key === "ArrowDown") { e.preventDefault(); focusItem(Math.min(i + 1, visible.value.length - 1)); }
  else if (e.key === "ArrowUp") { e.preventDefault(); focusItem(i - 1); }
  else if (e.key === "Delete") { e.preventDefault(); remove(term, i); }
  else if (e.key === "Escape") { open.value = false; inputEl.value.focus(); }
  // Enter and Space are not handled here: a button turns them into a click.
}

function clearAll() {
  commit([]);
  inputEl.value.focus();
}

// Focus left the widget (Tab, or a click on something focusable outside).
function onFocusout(e) {
  if (!root.value.contains(e.relatedTarget)) open.value = false;
}

// Close on a pointer press outside the widget, only while open.
function onDocumentPointerDown(e) {
  if (!root.value.contains(e.target)) open.value = false;
}
watch(open, (isOpen) => {
  if (isOpen) document.addEventListener("mousedown", onDocumentPointerDown);
  else document.removeEventListener("mousedown", onDocumentPointerDown);
});

// Another tab changed the list: follow it.
function onStorage(e) {
  if (e.key === STORAGE_KEY || e.key === null) history.value = parseHistory(e.newValue);
}
onMounted(() => window.addEventListener("storage", onStorage));
onBeforeUnmount(() => {
  window.removeEventListener("storage", onStorage);
  document.removeEventListener("mousedown", onDocumentPointerDown);
});
</script>

<template>
  <div ref="root" class="history-search" @focusout="onFocusout">
    <form role="search" @submit.prevent="runSearch(query)">
      <label for="article-search" class="label">Search articles</label>
      <div class="row">
        <input
          id="article-search"
          ref="inputEl"
          v-model="query"
          data-testid="search-input"
          type="search"
          autocomplete="off"
          aria-describedby="history-hint"
          @input="onInput"
          @click="open = true"
          @keydown="onInputKeydown"
        />
        <button type="submit" data-testid="submit">Search</button>
      </div>
      <span id="history-hint" class="sr-only">Press Down arrow to browse recent searches.</span>
    </form>

    <div v-if="open" class="dropdown" data-testid="dropdown">
      <div class="dropdown-head">
        <span id="history-label">Recent searches</span>
        <button v-if="history.length" type="button" class="link" data-testid="clear-history" @click="clearAll">Clear all</button>
      </div>
      <p v-if="visible.length === 0" class="empty" data-testid="history-empty">
        {{ history.length ? "No recent searches match" : "No recent searches yet" }}
      </p>
      <ul v-else aria-labelledby="history-label" data-testid="history">
        <li v-for="(term, i) in visible" :key="term">
          <button
            type="button"
            class="item"
            data-testid="history-item"
            @click="runSearch(term)"
            @keydown="onItemKeydown($event, i, term)"
          >{{ term }}</button>
          <button
            type="button"
            class="remove"
            tabindex="-1"
            :aria-label="'Remove ' + term + ' from history'"
            data-testid="remove"
            @click="remove(term, i)"
          >×</button>
        </li>
      </ul>
    </div>

    <section v-if="submitted" class="results" aria-live="polite" data-testid="results">
      <p>{{ results.length }} results for {{ JSON.stringify(submitted) }}</p>
      <ul>
        <li v-for="r in results" :key="r">{{ r }}</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
.history-search { position: relative; }
.row { display: flex; gap: 8px; }
.row input { flex: 1; min-width: 0; padding: 10px 12px; font-size: 1rem; color: inherit; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
.row input:focus, button:focus-visible { outline: 2px solid #7aa2ff; outline-offset: 1px; }
.row button { padding: 0 16px; border: 0; border-radius: 8px; background: #3d5afe; color: #fff; font-weight: 600; cursor: pointer; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.dropdown { position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 10; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); padding: 6px; }
.dropdown-head { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: #7d859b; }
.link { background: none; border: 0; color: #7aa2ff; cursor: pointer; font-size: 0.8rem; }
.dropdown ul { list-style: none; margin: 0; padding: 0; }
.dropdown li { display: flex; align-items: center; border-radius: 6px; }
.dropdown li:hover, .dropdown li:focus-within { background: #262b3a; }
.item { flex: 1; text-align: left; padding: 8px; background: none; border: 0; color: inherit; font-size: 0.95rem; cursor: pointer; border-radius: 6px; }
.remove { width: 32px; height: 32px; background: none; border: 0; color: #7d859b; font-size: 1.1rem; cursor: pointer; border-radius: 6px; }
.remove:hover { color: #ff8a80; }
.empty { margin: 6px 8px; color: #7d859b; font-size: 0.9rem; }
.results { margin-top: 20px; color: #c9cfdd; }
.results ul { padding-left: 20px; }
</style>
`,
          "/src/history.js": `// Pure helpers for the recent-searches list. No framework code in here.
export const STORAGE_KEY = "recent-searches";
export const MAX_ITEMS = 5;

// Never trust what is in storage: another version of the app, an extension
// or the user may have written anything there.
export function parseHistory(raw) {
  try {
    const value = JSON.parse(raw == null ? "[]" : raw);
    return Array.isArray(value) ? value.filter((t) => typeof t === "string").slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

export function loadHistory() {
  try {
    return parseHistory(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return []; // storage blocked (privacy mode, sandboxed iframe)
  }
}

export function saveHistory(list) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // quota exceeded or storage blocked: keep the in-memory list
  }
}

// Newest first, case-insensitive de-duplication, capped length.
export function addToHistory(list, term) {
  const clean = term.trim();
  if (!clean) return list;
  const rest = list.filter((t) => t.toLowerCase() !== clean.toLowerCase());
  return [clean, ...rest].slice(0, MAX_ITEMS);
}

export function removeFromHistory(list, term) {
  return list.filter((t) => t !== term);
}

// Simulated, synchronous "search": the point of this widget is the history.
const ARTICLES = [
  "React hooks in depth",
  "Thinking in React",
  "React Server Components",
  "Vue reactivity explained",
  "Angular signals guide",
  "CSS grid layout",
  "Svelte for React developers",
];

export function searchArticles(term) {
  const q = term.toLowerCase();
  return ARTICLES.filter((a) => a.toLowerCase().includes(q));
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers preparing for a machine coding round. Assumes components and templates; signals, \`@HostListener\` and focus handling are explained as they appear.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The Verified output came from booting the solution with \`bootstrapApplication(AppComponent)\` on Angular 22.2.3 in jsdom, both ahead-of-time with strict templates and with the runtime JIT compiler the site playground uses.

## 1. A Story First

A pharmacist's sticky notes hold the last five things customers asked about: a returning name moves to the top instead of being written twice, and the oldest note is thrown away when space runs out. A search bar with history is that: **de-duplicated, newest first, capped, saved across reloads, keyboard-friendly.** The search itself is instant and simulated; request timing is covered by the [debounced search bar](/interview-question/build-a-debounced-search-bar).

## 2. The Plan in Angular Terms

| Piece | Angular tool |
| :--- | :--- |
| Typed text, history, open, submitted | \`signal()\` |
| Filtered rows, results | \`computed()\` |
| Rules (dedupe, cap, parse) | plain functions in \`history.ts\` |
| Outside press, focus leaving, other tabs | \`@HostListener("document:mousedown")\`, \`@HostListener("focusout")\`, \`@HostListener("window:storage")\` |
| Focus after a removal | \`afterNextRender(..., { injector })\` |
| Elements | \`@ViewChild("box")\` and the host \`ElementRef\` |

\`\`\`ts
export function addToHistory(list: string[], term: string): string[] {
  const clean = term.trim();
  if (!clean) return list;
  const rest = list.filter((t) => t.toLowerCase() !== clean.toLowerCase());
  return [clean, ...rest].slice(0, MAX_ITEMS); // newest first, capped
}
\`\`\`

📌 **Interview term: Signal** — a reactive value read by calling it and changed with \`set\` / \`update\`; templates and \`computed\` signals that read it update automatically. See [Angular signals](/interview-question/what-are-angular-signals).

📌 **Interview term: localStorage** — a per-origin string store that survives reloads. \`getItem\` can throw when storage is blocked and \`setItem\` when the quota is full, and the stored text may not be valid JSON, so \`parseHistory\` wraps \`JSON.parse\` in \`try/catch\` and keeps only an array of strings. Storage options are compared in [localStorage vs sessionStorage vs cookies](/interview-question/what-is-the-difference-between-localstorage-sessionstorage-and-cookies).

## 3. Build It Step by Step

### Step 1: state and a single commit

\`\`\`ts
readonly history = signal<string[]>(loadHistory());

private commit(next: string[]) {
  this.history.set(next);
  saveHistory(next);
}
\`\`\`

Every user change (search, remove, clear) goes through \`commit\`. A list received from another tab only calls \`history.set\`, so it is not echoed back into storage. The form calls \`$event.preventDefault(); runSearch(query())\` on \`(submit)\`, so Enter and the button share one path.

### Step 2: host listeners for closing and syncing

\`\`\`ts
@HostListener("focusout", ["$event"])
onFocusout(e: FocusEvent) {
  if (!this.host.nativeElement.contains(e.relatedTarget as Node | null)) this.open.set(false);
}

@HostListener("document:mousedown", ["$event"])
onDocumentPointerDown(e: MouseEvent) {
  if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
}

@HostListener("window:storage", ["$event"])
onStorage(e: StorageEvent) {
  if (e.key === STORAGE_KEY || e.key === null) this.history.set(parseHistory(e.newValue));
}
\`\`\`

📌 **Interview term: @HostListener** — a decorator that subscribes a component method to an event on its host element, or on \`document\` / \`window\` with the \`"document:"\` / \`"window:"\` prefix. Angular removes the listener when the component is destroyed. See [@HostListener and @HostBinding](/interview-question/what-do-hostlistener-and-hostbinding-do).

📌 **Interview term: storage event** — fired in *other* same-origin tabs when \`localStorage\` changes; never in the tab that wrote it.

### Step 3: buttons and roving focus

Rows are \`<button class="item">\` elements in an \`@for\`; the arrow keys move real focus between them. Each row has two actions (re-run and remove), which an ARIA \`option\` cannot contain, so the button list is a better fit than a listbox here. The single-action alternative with \`aria-activedescendant\` is the [combobox](/interview-question/build-a-combobox-search-select).

\`\`\`ts
onItemKeydown(e: KeyboardEvent, i: number, term: string) {
  if (e.key === "ArrowDown") { e.preventDefault(); this.focusItem(Math.min(i + 1, this.visible().length - 1)); }
  else if (e.key === "ArrowUp") { e.preventDefault(); this.focusItem(i - 1); }
  else if (e.key === "Delete") { e.preventDefault(); this.remove(term, i); }
  else if (e.key === "Escape") { this.open.set(false); this.box.nativeElement.focus(); }
}
\`\`\`

📌 **Interview term: Roving focus** — arrow keys move actual DOM focus among the items of one widget.

### Step 4: focus after removing a row

\`\`\`ts
remove(term: string, index: number) {
  this.commit(removeFromHistory(this.history(), term));
  afterNextRender(() => {
    const list = this.rows();
    (list[Math.min(index, list.length - 1)] ?? this.box.nativeElement).focus();
  }, { injector: this.injector });
}
\`\`\`

Right after \`commit\` the old button is still in the DOM; \`afterNextRender\` runs the callback once Angular has rendered the shorter list. Outside a constructor it needs an \`injector\`, taken here with \`inject(Injector)\`.

📌 **Interview term: afterNextRender** — registers a callback that runs once after Angular's next render; the place for DOM reads and focus calls that need the updated view.

## 4. Verified: What the Driver Printed

The AOT (\`angular:app\`) and JIT (\`angular:playground\`) builds printed the same lines. The driver dispatched a \`StorageEvent\` to imitate another tab, focused an outside button to imitate Tab, and clicked the focused row for the Enter step, since jsdom does not turn Enter on a button into a click:

\`\`\`
focus only      : open: false
click input     : open: true | No recent searches yet
corrupt storage : items: [] | still open: true
after 8 searches: [] | open: false
localStorage    : ["vue","HTML","CSS grid","Svelte","Angular"]
results         : 1 results for "vue"
typed s         : ["CSS grid","Svelte"]
cleared input   : ["vue","HTML","CSS grid","Svelte","Angular"]
ArrowDown       : focus "vue"
ArrowDown       : focus "HTML"
Delete          : focus "CSS grid" | items: ["vue","CSS grid","Svelte","Angular"]
ArrowUp x2      : focus input
Enter on item   : input: "CSS grid" | open: false | focus input | 1 results for "CSS grid"
history now     : ["CSS grid","vue","Svelte","Angular"]
Escape          : open: false
click input     : open: true
press outside   : open: false
click again     : open: true
focus leaves    : open: false
storage event   : ["from another tab","React"]
click remove x  : ["React"]
Clear all       : items: 0 | No recent searches yet | storage: []
\`\`\`

The eight searches (React, Vue, "  react  ", Angular, Svelte, CSS grid, HTML, vue) show case-insensitive dedupe with the newest casing kept and the five-item cap. \`afterNextRender\` moved focus to "CSS grid" after "HTML" was deleted. The React and Vue builds print the same lines.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Landmark | \`<form role="search">\` |
| Hint | \`aria-describedby="history-hint"\` |
| Remove buttons | \`[attr.aria-label]\` "Remove X from history", \`tabindex="-1"\`; Delete is the keyboard path |
| Focus after removal | \`afterNextRender\` focuses the neighbour, or the input |
| Storage blocked | \`try/catch\` in the helpers |

## 6. Common Pitfalls

- **Touching \`this.box\` in the constructor.** A \`@ViewChild\` query is only filled once the view exists; use it from event handlers or after render.
- **Focusing synchronously after a state change.** The view has not re-rendered yet; use \`afterNextRender\`.
- **Opening on \`(focus)\`.** The \`focus()\` call after a search re-opens the dropdown.
- **A document listener added with \`addEventListener\` and never removed.** \`@HostListener\` is cleaned up for you.
- **Unguarded \`JSON.parse\`** of stored data.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Rules:</strong> <span style="color:#f0e2c8;">"Dedupe, cap and parsing are pure functions; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addToHistory</code> trims, removes a case-insensitive duplicate, puts the term first and keeps five."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;">"History is a signal read once from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try/catch</code>, and a single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">commit</code> writes the signal and storage together."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rows:</strong> <span style="color:#f0e2c8;">"An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> of buttons filtered by a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>; each row re-runs its search and has its own remove button."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Keyboard:</strong> <span style="color:#f0e2c8;">"Down moves real focus into the rows, Delete removes a row and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> focuses its neighbour, Escape returns to the input."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Edges:</strong> <span style="color:#f0e2c8;">"Host listeners close on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focusout</code> and outside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mousedown</code> and sync from the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">storage</code> event, and Angular removes them on destroy."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you move this into a service?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes if several components need the history: an injectable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SearchHistoryService</code> holding the signal and the storage logic, provided in root. The playground boots without providers, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providedIn: "root"</code> services still work because they need no bootstrap configuration.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">afterNextRender</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setTimeout</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> usually works but is a guess about timing. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> is tied to Angular's render cycle, runs only in the browser, and states the intent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test the pure helpers; with TestBed, seed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code>, set the input and submit, then assert rows and stored JSON; dispatch a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StorageEvent</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code> to test sync.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from an autocomplete?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">History is local, instant and has two actions per row, so real focus on buttons fits. An autocomplete fetches suggestions and has one action per row, so it uses a listbox with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code>.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Signal** | Reactive value; read by calling, change with \`set\` |
| **localStorage** | Per-origin string store that survives reloads |
| **@HostListener** | Decorator binding a method to a host, document or window event |
| **storage event** | Fired in other tabs when \`localStorage\` changes |
| **Roving focus** | Arrow keys move real focus between items |
| **afterNextRender** | Callback after Angular's next render |

---
**Conclusion:** The Angular build keeps history in a signal, its rules in pure functions, writes through one commit path, and uses \`@HostListener\` for outside presses, focus leaving and cross-tab sync, with \`afterNextRender\` to keep focus in the list after a removal. The verified AOT and JIT runs on Angular 22.2.3 show dedupe, the cap, safe parsing of corrupt storage and live updates from another tab. For server-fetched suggestions, see the [autocomplete build](/interview-question/build-an-autocomplete-typeahead-search).`,
        files: {
          "/src/app/app.component.ts": `import { Component } from "@angular/core";
import { HistorySearchComponent } from "./history-search.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [HistorySearchComponent],
  template: \`
    <main class="page">
      <h1>Article search</h1>
      <app-history-search />
    </main>
  \`,
  styles: [\`
    :host { display: block; min-height: 100vh; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color-scheme: dark; }
    .page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
    h1 { font-size: 1.4rem; margin: 0 0 16px; }
  \`],
})
export class AppComponent {}
`,
          "/src/app/history-search.component.ts": `import {
  Component, ElementRef, HostListener, Injector, ViewChild, afterNextRender, computed, inject, signal,
} from "@angular/core";
import {
  STORAGE_KEY, addToHistory, loadHistory, parseHistory, removeFromHistory, saveHistory, searchArticles,
} from "./history";

@Component({
  selector: "app-history-search",
  standalone: true,
  template: \`
    <form role="search" (submit)="$event.preventDefault(); runSearch(query())">
      <label for="article-search" class="label">Search articles</label>
      <div class="row">
        <input
          #box
          id="article-search"
          data-testid="search-input"
          type="search"
          autocomplete="off"
          aria-describedby="history-hint"
          [value]="query()"
          (input)="query.set(box.value); open.set(true)"
          (click)="open.set(true)"
          (keydown)="onInputKeydown($event)"
        />
        <button type="submit" data-testid="submit">Search</button>
      </div>
      <span id="history-hint" class="sr-only">Press Down arrow to browse recent searches.</span>
    </form>

    @if (open()) {
      <div class="dropdown" data-testid="dropdown">
        <div class="dropdown-head">
          <span id="history-label">Recent searches</span>
          @if (history().length) {
            <button type="button" class="link" data-testid="clear-history" (click)="clearAll()">Clear all</button>
          }
        </div>
        @if (visible().length === 0) {
          <p class="empty" data-testid="history-empty">
            {{ history().length ? "No recent searches match" : "No recent searches yet" }}
          </p>
        } @else {
          <ul aria-labelledby="history-label" data-testid="history">
            @for (term of visible(); track term; let i = $index) {
              <li>
                <button type="button" class="item" data-testid="history-item"
                        (click)="runSearch(term)" (keydown)="onItemKeydown($event, i, term)">{{ term }}</button>
                <button type="button" class="remove" tabindex="-1" data-testid="remove"
                        [attr.aria-label]="'Remove ' + term + ' from history'"
                        (click)="remove(term, i)">×</button>
              </li>
            }
          </ul>
        }
      </div>
    }

    @if (submitted()) {
      <section class="results" aria-live="polite" data-testid="results">
        <p>{{ results().length }} results for {{ quoted(submitted()) }}</p>
        <ul>
          @for (r of results(); track r) {
            <li>{{ r }}</li>
          }
        </ul>
      </section>
    }
  \`,
  styles: [\`
    :host { display: block; position: relative; }
    .label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
    .row { display: flex; gap: 8px; }
    .row input { flex: 1; min-width: 0; padding: 10px 12px; font-size: 1rem; color: inherit; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
    .row input:focus, button:focus-visible { outline: 2px solid #7aa2ff; outline-offset: 1px; }
    .row button { padding: 0 16px; border: 0; border-radius: 8px; background: #3d5afe; color: #fff; font-weight: 600; cursor: pointer; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .dropdown { position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 10; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); padding: 6px; }
    .dropdown-head { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: #7d859b; }
    .link { background: none; border: 0; color: #7aa2ff; cursor: pointer; font-size: 0.8rem; }
    .dropdown ul { list-style: none; margin: 0; padding: 0; }
    .dropdown li { display: flex; align-items: center; border-radius: 6px; }
    .dropdown li:hover, .dropdown li:focus-within { background: #262b3a; }
    .item { flex: 1; text-align: left; padding: 8px; background: none; border: 0; color: inherit; font-size: 0.95rem; cursor: pointer; border-radius: 6px; }
    .remove { width: 32px; height: 32px; background: none; border: 0; color: #7d859b; font-size: 1.1rem; cursor: pointer; border-radius: 6px; }
    .remove:hover { color: #ff8a80; }
    .empty { margin: 6px 8px; color: #7d859b; font-size: 0.9rem; }
    .results { margin-top: 20px; color: #c9cfdd; }
    .results ul { padding-left: 20px; }
  \`],
})
export class HistorySearchComponent {
  @ViewChild("box") box!: ElementRef<HTMLInputElement>;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly query = signal("");
  readonly history = signal<string[]>(loadHistory());
  readonly open = signal(false);
  readonly submitted = signal("");

  readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    return q ? this.history().filter((t) => t.toLowerCase().includes(q)) : this.history();
  });
  readonly results = computed(() => (this.submitted() ? searchArticles(this.submitted()) : []));

  quoted(value: string) {
    return JSON.stringify(value);
  }

  // Every change goes through here: state and storage stay in step.
  private commit(next: string[]) {
    this.history.set(next);
    saveHistory(next);
  }

  runSearch(term: string) {
    const clean = term.trim();
    if (!clean) return;
    this.commit(addToHistory(this.history(), clean));
    this.query.set(clean);
    this.submitted.set(clean);
    this.open.set(false);
    this.box.nativeElement.focus();
  }

  // The history buttons currently on screen, in order.
  private rows(): HTMLButtonElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLButtonElement>(".item"));
  }

  private focusItem(i: number) {
    if (i < 0) this.box.nativeElement.focus();
    else this.rows()[i]?.focus();
  }

  remove(term: string, index: number) {
    this.commit(removeFromHistory(this.history(), term));
    // Wait for the DOM to show the shorter list, then keep keyboard users in it.
    afterNextRender(() => {
      const list = this.rows();
      (list[Math.min(index, list.length - 1)] ?? this.box.nativeElement).focus();
    }, { injector: this.injector });
  }

  clearAll() {
    this.commit([]);
    this.box.nativeElement.focus();
  }

  onInputKeydown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!this.open()) this.open.set(true);
      else this.focusItem(0);
    } else if (e.key === "Escape") {
      this.open.set(false);
    }
  }

  onItemKeydown(e: KeyboardEvent, i: number, term: string) {
    if (e.key === "ArrowDown") { e.preventDefault(); this.focusItem(Math.min(i + 1, this.visible().length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); this.focusItem(i - 1); }
    else if (e.key === "Delete") { e.preventDefault(); this.remove(term, i); }
    else if (e.key === "Escape") { this.open.set(false); this.box.nativeElement.focus(); }
    // Enter and Space are not handled here: a button turns them into a click.
  }

  // Focus left the widget (Tab, or a click on something focusable outside).
  @HostListener("focusout", ["$event"])
  onFocusout(e: FocusEvent) {
    if (!this.host.nativeElement.contains(e.relatedTarget as Node | null)) this.open.set(false);
  }

  // Close on a pointer press outside the widget.
  @HostListener("document:mousedown", ["$event"])
  onDocumentPointerDown(e: MouseEvent) {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
  }

  // Another tab changed the list: follow it.
  @HostListener("window:storage", ["$event"])
  onStorage(e: StorageEvent) {
    if (e.key === STORAGE_KEY || e.key === null) this.history.set(parseHistory(e.newValue));
  }
}
`,
          "/src/app/history.ts": `// Pure helpers for the recent-searches list. No framework code in here.
export const STORAGE_KEY = "recent-searches";
export const MAX_ITEMS = 5;

// Never trust what is in storage: another version of the app, an extension
// or the user may have written anything there.
export function parseHistory(raw: string | null): string[] {
  try {
    const value = JSON.parse(raw == null ? "[]" : raw);
    return Array.isArray(value) ? value.filter((t: unknown): t is string => typeof t === "string").slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

export function loadHistory(): string[] {
  try {
    return parseHistory(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return []; // storage blocked (privacy mode, sandboxed iframe)
  }
}

export function saveHistory(list: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // quota exceeded or storage blocked: keep the in-memory list
  }
}

// Newest first, case-insensitive de-duplication, capped length.
export function addToHistory(list: string[], term: string): string[] {
  const clean = term.trim();
  if (!clean) return list;
  const rest = list.filter((t) => t.toLowerCase() !== clean.toLowerCase());
  return [clean, ...rest].slice(0, MAX_ITEMS);
}

export function removeFromHistory(list: string[], term: string): string[] {
  return list.filter((t) => t !== term);
}

// Simulated, synchronous "search": the point of this widget is the history.
const ARTICLES = [
  "React hooks in depth",
  "Thinking in React",
  "React Server Components",
  "Vue reactivity explained",
  "Angular signals guide",
  "CSS grid layout",
  "Svelte for React developers",
];

export function searchArticles(term: string): string[] {
  const q = term.toLowerCase();
  return ARTICLES.filter((a) => a.toLowerCase().includes(q));
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build an Autocomplete / Typeahead search",
    seoDescription:
      "Build an autocomplete typeahead in React, Vue and Angular: debounced suggestions, arrow-key navigation, Enter and mouse selection, and a query cache.",
    description: `**Question presented to candidate:**
"Build a country field that suggests matches as the user types. Suggestions come from an API. The user should be able to pick one with the arrow keys and Enter, or with the mouse. Do not call the API for a query we already asked about."

**Requirements:**
- Fetch suggestions (at most 6, prefix matches first) about 250 ms after the user stops typing.
- Show a dropdown with Loading / No matches / suggestion states.
- Keyboard: Down / Up move the highlight and wrap around, Enter picks the highlighted suggestion, Escape closes.
- Mouse: hovering highlights, clicking picks, and the input keeps focus.
- Cache results per query so going back to an earlier query (for example with Backspace) does not hit the API again; ignore a response if a newer lookup has started.
- Show the picked value and a small counter of requests sent and cache hits. The API is simulated.

**What a strong answer should cover:**
- State model: input text, open flag, suggestions, active index, picked value; the active index reset whenever suggestions change.
- Debounce reused from a small hook / composable, and a lookup that only runs when the dropdown is open and the debounced value has caught up.
- A \`Map\` cache keyed by the normalised query, and a "latest request id" check so an older response cannot replace newer suggestions.
- Keyboard handling on the input with wrap-around, \`mousedown\` \`preventDefault\` so clicking an option does not blur the input, and closing on blur.
- Basic combobox ARIA: \`role="combobox"\`, \`aria-expanded\`, \`aria-controls\`, \`aria-activedescendant\`, \`role="listbox"\` / \`role="option"\`.

**Clarifying questions expected:**
- "Is the list small enough to filter on the client, or must every query go to the server?"
- "Should picking a suggestion only fill the input, or also navigate somewhere?"
- "How long may cached results be reused?"

**Code / implementation expected:** Yes. A working autocomplete with debounced fetching, a cache and full keyboard and mouse selection.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round. Assumes basic React state and effects; keyboard navigation, caching and ARIA roles are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. The Verified output was produced by running the solution on React 19.3.1 in jsdom with a scripted driver; the country API is simulated in the file with a 150 ms delay.

## 1. Why This Even Matters — A Story First

At a busy coffee shop, a good barista starts reaching for your usual cup as soon as you say "the usual fl...". They guess from the first few letters, show you the guess, and you nod or correct them. If you ordered the same thing ten minutes ago, they do not even need to think.

An autocomplete is that barista. It turns a few typed letters into a short list of likely answers, lets you pick one without typing the rest, and remembers what it already looked up. Users expect it in every search box and address form, and interviewers like it because it combines async data, a little state machine, keyboard handling and accessibility in one small widget.

This doc is the **fundamentals** version: suggestions, keyboard and mouse selection, and caching. Two siblings go further: [typeahead with debounce and highlight](/interview-question/build-autocomplete-typeahead-with-debounce-highlight) covers safe match highlighting and out-of-order responses in depth, and the [combobox](/interview-question/build-a-combobox-search-select) covers the complete WAI-ARIA keyboard contract.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How big is the data set? | 200 countries can be filtered on the client with no API at all; millions of products cannot. |
| How should results be ranked? | Prefix matches first ("Ca" → Canada before Jamaica) is the usual expectation. |
| Is free text allowed, or must the value be one of the suggestions? | Free text is a search box; a forced choice is a combobox with a committed value. |
| How fresh must results be? | Decides whether a cache can live for the whole session or needs an expiry. |
| Does the API return quickly? | Affects the debounce delay and whether a Loading state is worth showing. |
| Mobile? | Touch has no hover, and on-screen keyboards hide part of the dropdown. |

## 3. Requirements and Plan

\`App\` → \`Autocomplete\`, plus \`api.js\` (the fake server) and the \`useDebouncedValue\` hook from the [debounced search bar](/interview-question/build-a-debounced-search-bar).

| Value | Kind | Why |
| :--- | :--- | :--- |
| \`query\` | state | controlled input text |
| \`open\` | state | is the dropdown allowed to show |
| \`suggestions\`, \`status\` | state | last applied lookup and its phase |
| \`active\` | state | index of the highlighted suggestion, \`-1\` for none |
| \`selected\` | state | the picked country |
| \`stats\` | state | requests sent and cache hits, for the demo |
| \`cache\` | ref holding a \`Map\` | survives renders, never needs to re-render anything |
| \`latest\` | ref | id of the newest lookup |
| \`showPanel\`, \`showList\` | derived | from \`open\`, \`query\` and \`suggestions\` |

📌 **Interview term: Autocomplete (typeahead)** — an input that proposes completions while you type. The suggestions are a popup list; the input keeps focus the whole time.

📌 **Interview term: useRef** — a box that keeps a value across renders without causing a render when it changes. The cache and the latest-request id live in refs because nothing on screen depends on them directly. See [useRef and its use cases](/interview-question/describe-the-useref-hook-and-its-typical-use-cases).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 250" role="img" aria-label="Lookup flow: the debounced query is checked against the cache; a hit applies immediately, a miss calls the API and stores the answer, and stale answers are ignored">
  <defs>
    <marker id="q3r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="90" width="150" height="56" rx="10"/>
  <text class="d-text" x="95" y="114" text-anchor="middle">debounced</text>
  <text class="d-sub" x="95" y="134" text-anchor="middle">query</text>
  <rect class="d-box-accent" x="230" y="90" width="140" height="56" rx="10"/>
  <text class="d-text d-accent" x="300" y="123" text-anchor="middle">in cache?</text>
  <rect class="d-box" x="450" y="16" width="210" height="56" rx="10"/>
  <text class="d-text" x="555" y="40" text-anchor="middle">yes: show at once</text>
  <text class="d-sub" x="555" y="60" text-anchor="middle">no request</text>
  <rect class="d-box" x="450" y="170" width="210" height="56" rx="10"/>
  <text class="d-text" x="555" y="194" text-anchor="middle">no: call the API</text>
  <text class="d-sub" x="555" y="214" text-anchor="middle">store, apply if latest</text>
  <path class="d-edge" d="M 170 118 L 222 118" marker-end="url(#q3r-arrow)"/>
  <path class="d-edge-accent" d="M 370 104 L 442 50" marker-end="url(#q3r-arrow)"/>
  <path class="d-edge" d="M 370 132 L 442 190" marker-end="url(#q3r-arrow)"/>
</svg>

The cache is checked first. On a miss, the response is always stored (it is still a correct answer for that query) but only applied to the screen if no newer lookup has started.

## 4. Build It Step by Step

### Step 1: the lookup effect

\`\`\`js
useEffect(() => {
  // Look up only when open and the debounced value has caught up with the box.
  if (!open || debounced !== term) return;
  const id = ++latest.current; // anything still in flight is now stale
  if (!debounced) { setSuggestions([]); setStatus("idle"); return; }
  const cached = cache.current.get(debounced);
  if (cached) {
    setSuggestions(cached); setActive(-1); setStatus("done");
    setStats((s) => ({ ...s, hits: s.hits + 1 }));
    return;
  }
  setStatus("loading");
  setStats((s) => ({ ...s, requests: s.requests + 1 }));
  fetchCountries(debounced).then((list) => {
    cache.current.set(debounced, list); // cache even if stale: the answer is still right
    if (id !== latest.current) return;
    setSuggestions(list); setActive(-1); setStatus("done");
  });
}, [debounced, term, open]);
\`\`\`

Two guards matter. \`debounced !== term\` means "the user is still typing": without it, reopening the dropdown with a new letter would briefly look up the *previous* debounced value (an early version of this solution counted a bogus cache hit exactly that way). \`id !== latest.current\` drops a response that a newer lookup has overtaken. A full treatment of out-of-order responses, including aborting, is in the [typeahead with highlight](/interview-question/build-autocomplete-typeahead-with-debounce-highlight).

📌 **Interview term: Memoization cache** — storing the result of a call by its input so the same input is answered from memory. Here a \`Map\` from lowercased query to suggestions.

📌 **Interview term: Stale response** — an answer to a question the user is no longer asking. It must never replace newer data on screen.

### Step 2: keyboard on the input

\`\`\`js
function onKeyDown(e) {
  const n = suggestions.length;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!open) setOpen(true);
    else if (n) setActive((i) => (i + 1) % n);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (n) setActive((i) => (i <= 0 ? n - 1 : i - 1));
  } else if (e.key === "Enter") {
    if (open && active >= 0) { e.preventDefault(); select(suggestions[active]); }
  } else if (e.key === "Escape") {
    setOpen(false); setActive(-1);
  }
}
\`\`\`

\`preventDefault()\` on the arrows stops the caret from jumping to the start or end of the text. The modulo makes Down wrap from the last item to the first, and the Up branch wraps from the first (or from "nothing highlighted") to the last.

📌 **Interview term: Active index** — which suggestion is highlighted, distinct from which one is *selected*. It resets to \`-1\` whenever a new list arrives, so Enter never picks an item from an old list.

### Step 3: mouse without losing focus

\`\`\`jsx
<li
  id={optionId(i)}
  role="option"
  aria-selected={i === active}
  onMouseMove={() => { if (i !== active) setActive(i); }}
  onMouseDown={(e) => e.preventDefault()} /* keep focus in the input */
  onClick={() => select(country)}
>
\`\`\`

Pressing the mouse on an element normally moves focus to it, which blurs the input, which closes the dropdown before the click lands. \`preventDefault()\` on \`mousedown\` stops the focus move. \`onMouseMove\` is used instead of \`onMouseEnter\` so that a list scrolling under a still mouse pointer (while the user presses arrow keys) does not steal the highlight.

### Step 4: picking a value

\`\`\`js
function select(country) {
  setQuery(country);
  setSelected(country);
  setSuggestions([]); // do not flash this list the next time the box opens
  setOpen(false);
  setActive(-1);
}
\`\`\`

Because the lookup only runs while \`open\` is true, filling the input with the picked name does not fire a new request.

### Step 5: the ARIA wiring

The input has \`role="combobox"\`, \`aria-autocomplete="list"\`, \`aria-expanded\`, \`aria-controls\` pointing at the listbox id, and \`aria-activedescendant\` pointing at the highlighted option's id. Ids come from \`useId()\`, so two autocompletes on one page never collide.

📌 **Interview term: aria-activedescendant** — an attribute on the focused element naming the id of the item that is *visually* focused. Focus stays in the input (so typing keeps working) while screen readers announce the highlighted option.

## 5. Verified: What the Driver Printed

Mounted under \`StrictMode\` in jsdom. The driver typed with \`input\` events, advanced real time in 20 ms steps, pressed keys on the input and dispatched \`mousemove\`, \`mousedown\` and \`click\` on an option:

\`\`\`
typed ca, 250 ms : hint: Loading... | Requests sent: 1 | Cache hits: 0
ca               : Cambodia, Cameroon, Canada, Jamaica, Nicaragua, South Africa | Requests sent: 1 | Cache hits: 0
can              : Canada | Requests sent: 2 | Cache hits: 0
ca again         : 6 options | Requests sent: 2 | Cache hits: 1
ArrowDown x2     : active = Cameroon | aria-expanded = true
ArrowUp x2       : active = South Africa (wrapped)
Enter            : input = "South Africa" | Selected: South Africa | aria-expanded = false
xyz              : No matches | Requests sent: 3 | Cache hits: 1
Escape           : panel open = false
ge               : Georgia, Germany, Argentina
mouse over #2    : active = Germany
mousedown        : defaultPrevented = true
click            : Selected: Germany | Requests sent: 4 | Cache hits: 1
\`\`\`

Typing "c", "ca" sent one request; prefix matches ranked first. Going back to "ca" was answered from the cache (requests stayed at 2). Up from the first item wrapped to the last. The \`mousedown\` default was prevented, which is what keeps focus in the input in a real browser; jsdom does not move focus on synthetic mouse events, so the focus effect itself was not observable here.

## 6. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Roles | \`combobox\` input, \`listbox\` popup, \`option\` items |
| Expanded state | \`aria-expanded\` is true only while options are shown |
| Highlighted item | \`aria-activedescendant\` + \`aria-selected\` on that option |
| Unique ids | \`useId()\` prefix |
| Focus | Never leaves the input; \`mousedown\` is prevented on options |
| Blur | Closes the dropdown (Tab away, or click elsewhere) |
| Empty and loading | "Loading..." and "No matches" inside the panel |
| Case and spaces | Query is trimmed and lowercased before caching and fetching |

## 7. Common Pitfalls

- **Not resetting the active index** when new suggestions arrive. Enter then picks whatever now sits at the old index.
- **Closing on blur without preventing \`mousedown\`.** Clicks on options never register because the list is gone first.
- **Caching by the raw input.** "Ca", "ca" and "ca " become three entries; normalise first.
- **Fetching after a pick.** Setting the input to the picked label triggers another lookup unless the lookup is gated on \`open\`.
- **Using \`onMouseEnter\` for hover.** Scrolling with the keyboard moves items under a still pointer and steals the highlight.
- **An unbounded cache in a long session.** Fine for 200 countries; for a product search, cap it (LRU) or add an expiry.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;">"I keep input text, an open flag, suggestions, an active index and the picked value in state, and the cache plus a latest-request id in refs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Lookup:</strong> <span style="color:#f0e2c8;">"A debounced value drives one effect: when open and caught up, check the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> cache, otherwise fetch, store the answer, and apply it only if it is still the latest."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Keyboard:</strong> <span style="color:#f0e2c8;">"Arrows move the active index with wrap-around and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code>, Enter picks, Escape closes; the active index resets when a new list arrives."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mouse:</strong> <span style="color:#f0e2c8;">"Options highlight on mouse move and pick on click, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mousedown</code> is prevented so the input never loses focus."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"The input is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">combobox</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-expanded</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-controls</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code>; the popup is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">listbox</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">option</code>s with ids from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useId</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make the cache smarter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bound it with an LRU (a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> re-inserting on read and deleting the first key when full), add a time-to-live, and optionally answer longer queries from a cached shorter one by filtering client-side when the shorter result was complete.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the list has 10,000 matches?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Limit server results, and if you must show many, virtualize the list so only visible rows render; keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-setsize</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-posinset</code> on options so screen readers still announce the total.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you highlight the typed part?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Split each suggestion on a case-insensitive, escaped match and wrap matches in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mark</code> elements rendered as text, never with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dangerouslySetInnerHTML</code>. The highlight sibling question builds that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test keyboard behaviour?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Testing Library with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">userEvent.type</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">userEvent.keyboard("{ArrowDown}{Enter}")</code>, a mocked API, and fake timers; assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code> points at the expected option and the picked value appears.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens on mobile?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No hover, so tap must pick directly; the on-screen keyboard can cover the list, so keep it short or position it above; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inputmode</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">enterkeyhint</code> attributes improve the keyboard.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Autocomplete / typeahead** | Input that suggests completions as you type |
| **useRef** | Value kept across renders without causing renders |
| **Memoization cache** | Results stored by input to avoid repeat calls |
| **Stale response** | An answer to an older query; must not overwrite newer data |
| **Active index** | The highlighted suggestion, separate from the picked one |
| **aria-activedescendant** | Points from the focused input to the highlighted option |

---
**Conclusion:** An autocomplete is a debounced lookup, a cache in front of the API, an active index the keyboard moves around, and a mouse handler that never steals focus from the input. The verified run on React 19.3.1 shows one request for a burst of typing, a cache hit when returning to an earlier query, wrap-around keyboard navigation and mouse selection with \`mousedown\` prevented. Name the active-index reset and the \`mousedown\` trick and you have covered the two bugs most candidates ship.`,
        files: {
          "/App.js": `import Autocomplete from "./src/Autocomplete";

export default function App() {
  return (
    <main className="page">
      <h1>Country finder</h1>
      <Autocomplete />
    </main>
  );
}
`,
          "/src/api.js": `// Simulated server: no network. Every call takes 150 ms.
const COUNTRIES = [
  "Afghanistan", "Argentina", "Australia", "Austria", "Brazil", "Cambodia", "Cameroon",
  "Canada", "Chile", "China", "Colombia", "Denmark", "Egypt", "France", "Georgia",
  "Germany", "Ghana", "Greece", "India", "Jamaica", "Japan", "Kenya", "Mexico",
  "Morocco", "Nepal", "Nicaragua", "Norway", "Portugal", "South Africa", "Spain",
  "Sweden", "United States", "Vietnam",
];

export function fetchCountries(query) {
  const q = query.toLowerCase();
  return new Promise((resolve) => {
    setTimeout(() => {
      const starts = COUNTRIES.filter((c) => c.toLowerCase().startsWith(q));
      const contains = COUNTRIES.filter((c) => !c.toLowerCase().startsWith(q) && c.toLowerCase().includes(q));
      resolve([...starts, ...contains].slice(0, 6)); // prefix matches rank first
    }, 150);
  });
}
`,
          "/src/Autocomplete.js": `import { useEffect, useId, useRef, useState } from "react";
import { fetchCountries } from "./api";
import { useDebouncedValue } from "./useDebouncedValue";

export default function Autocomplete() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | done
  const [active, setActive] = useState(-1);
  const [selected, setSelected] = useState("");
  const [stats, setStats] = useState({ requests: 0, hits: 0 });
  const cache = useRef(new Map()); // query -> suggestions, lives as long as the component
  const latest = useRef(0); // id of the newest lookup; older responses are ignored
  const listId = useId();

  const term = query.trim().toLowerCase();
  const debounced = useDebouncedValue(term, 250);

  useEffect(() => {
    // Look up only when open and the debounced value has caught up with the box.
    if (!open || debounced !== term) return;
    const id = ++latest.current; // anything still in flight is now stale
    if (!debounced) {
      setSuggestions([]);
      setStatus("idle");
      return;
    }
    const cached = cache.current.get(debounced);
    if (cached) {
      setSuggestions(cached);
      setActive(-1);
      setStatus("done");
      setStats((s) => ({ ...s, hits: s.hits + 1 }));
      return;
    }
    setStatus("loading");
    setStats((s) => ({ ...s, requests: s.requests + 1 }));
    fetchCountries(debounced).then((list) => {
      cache.current.set(debounced, list); // cache even if stale: the answer is still right
      if (id !== latest.current) return;
      setSuggestions(list);
      setActive(-1);
      setStatus("done");
    });
  }, [debounced, term, open]);

  function select(country) {
    setQuery(country);
    setSelected(country);
    setSuggestions([]); // do not flash this list the next time the box opens
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e) {
    const n = suggestions.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else if (n) setActive((i) => (i + 1) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (n) setActive((i) => (i <= 0 ? n - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (open && active >= 0) {
        e.preventDefault();
        select(suggestions[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  const showPanel = open && term !== "";
  const showList = showPanel && suggestions.length > 0;
  const optionId = (i) => listId + "-opt-" + i;

  return (
    <div className="ac">
      <label htmlFor="country" className="label">Country</label>
      <input
        id="country"
        data-testid="ac-input"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        placeholder="Start typing, e.g. ca"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
      />

      {showPanel && (
        <div className="panel">
          {showList ? (
            <ul id={listId} role="listbox" aria-label="Countries" data-testid="ac-list">
              {suggestions.map((country, i) => (
                <li
                  key={country}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  className={i === active ? "option active" : "option"}
                  onMouseMove={() => { if (i !== active) setActive(i); }}
                  onMouseDown={(e) => e.preventDefault()} /* keep focus in the input */
                  onClick={() => select(country)}
                >
                  {country}
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint" data-testid="ac-hint">{status === "done" ? "No matches" : "Loading..."}</p>
          )}
        </div>
      )}

      <p className="meta" data-testid="selected">{selected ? "Selected: " + selected : "Nothing selected yet"}</p>
      <p className="meta" data-testid="stats">Requests sent: {stats.requests} | Cache hits: {stats.hits}</p>
    </div>
  );
}
`,
          "/src/useDebouncedValue.js": `import { useEffect, useState } from "react";

// Returns \`value\`, but only after it has stopped changing for \`delay\` ms.
export function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // a new keystroke cancels the old timer
  }, [value, delay]);
  return debounced;
}
`,
          "/styles.css": `:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
.page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 1.4rem; margin: 0 0 16px; }
.ac { position: relative; }
.label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
.ac input { width: 100%; padding: 10px 12px; font-size: 1rem; color: inherit; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
.ac input:focus { outline: 2px solid #7aa2ff; outline-offset: 1px; }
.panel { position: absolute; left: 0; right: 0; top: 70px; z-index: 10; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); padding: 4px; }
.panel ul { list-style: none; margin: 0; padding: 0; max-height: 240px; overflow-y: auto; }
.option { padding: 8px 10px; border-radius: 6px; cursor: pointer; }
.option.active { background: #2f3b66; color: #fff; }
.hint { margin: 8px 10px; color: #7d859b; }
.meta { font-size: 0.85rem; color: #a9b1c6; margin: 12px 0 0; }
.meta + .meta { margin-top: 4px; color: #7d859b; }
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers preparing for a machine coding round. Assumes \`ref\`, \`computed\` and \`v-for\`; keyboard navigation, caching and ARIA roles are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The Verified output came from compiling the SFCs with @vue/compiler-sfc and mounting them on Vue 3.5.44 in jsdom with a scripted driver; the country API is simulated with a 150 ms delay.

## 1. A Story First

A good barista hears "the usual fl..." and already reaches for your flat white; if you ordered it ten minutes ago, they do not even think. An autocomplete does that for an input: it turns a few letters into a short list of likely answers, lets you pick one with the keyboard or the mouse, and remembers what it already looked up. This is the fundamentals version; [typeahead with debounce and highlight](/interview-question/build-autocomplete-typeahead-with-debounce-highlight) goes deep on highlighting and out-of-order responses, and the [combobox](/interview-question/build-a-combobox-search-select) covers the full ARIA keyboard contract.

## 2. The Plan in Vue Terms

| Piece | Vue tool |
| :--- | :--- |
| Input text | \`ref("")\` + \`v-model\` |
| Normalised term | \`computed(() => query.value.trim().toLowerCase())\` |
| Debounced term | \`useDebounced(term, 250)\` composable, shared with the [debounced search bar](/interview-question/build-a-debounced-search-bar) |
| Open flag, suggestions, status, active index, picked value, counters | \`ref\` |
| Cache and latest-request id | a plain \`Map\` and a plain \`let\`; nothing renders from them |
| Lookup | \`watch([debounced, term, open], ...)\` |
| Ids | \`useId()\` |

📌 **Interview term: Autocomplete (typeahead)** — an input that proposes completions as you type, shown in a popup list while focus stays in the input.

📌 **Interview term: Non-reactive state** — data kept in a plain variable inside \`<script setup>\` because no template or \`computed\` reads it. Making the cache a \`ref\` would only add proxy overhead. More in [reactivity caveats](/interview-question/what-are-common-reactivity-caveats-in-vue).

## 3. Build It Step by Step

### Step 1: one watcher for every lookup

\`\`\`js
watch([debounced, term, open], ([dq, t, isOpen]) => {
  // Look up only when open and the debounced value has caught up with the box.
  if (!isOpen || dq !== t) return;
  const id = ++latest; // anything still in flight is now stale
  if (!dq) { suggestions.value = []; status.value = "idle"; return; }
  const cached = cache.get(dq);
  if (cached) {
    suggestions.value = cached; active.value = -1; status.value = "done";
    stats.value.hits++;
    return;
  }
  status.value = "loading";
  stats.value.requests++;
  fetchCountries(dq).then((list) => {
    cache.set(dq, list); // cache even if stale: the answer is still right
    if (id !== latest) return;
    suggestions.value = list; active.value = -1; status.value = "done";
  });
});
\`\`\`

Watching an array of sources runs the callback when any of them changes and passes their current values. The \`dq !== t\` guard skips the moment between a keystroke and the end of the debounce, so reopening the box never looks up an old query.

📌 **Interview term: Memoization cache** — answers stored by input; here lowercased query to suggestion list.

📌 **Interview term: Stale response** — an answer to a query the user is no longer asking. The \`id !== latest\` check drops it; the [highlight build](/interview-question/build-autocomplete-typeahead-with-debounce-highlight) adds \`AbortController\` and proves the race.

### Step 2: keyboard

\`\`\`js
function onKeydown(e) {
  const n = suggestions.value.length;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!open.value) open.value = true;
    else if (n) active.value = (active.value + 1) % n;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (n) active.value = active.value <= 0 ? n - 1 : active.value - 1;
  } else if (e.key === "Enter") {
    if (open.value && active.value >= 0) { e.preventDefault(); select(suggestions.value[active.value]); }
  } else if (e.key === "Escape") {
    open.value = false; active.value = -1;
  }
}
\`\`\`

📌 **Interview term: Active index** — which option is highlighted; reset to \`-1\` whenever a new list arrives so Enter never picks from an old list.

### Step 3: options that never steal focus

\`\`\`html
<li
  v-for="(country, i) in suggestions"
  :id="optionId(i)" :key="country" role="option" :aria-selected="i === active"
  @mousemove="active = i"
  @mousedown.prevent
  @click="select(country)"
>{{ country }}</li>
\`\`\`

\`@mousedown.prevent\` is the whole trick: pressing on an option would otherwise move focus off the input, the input's \`@blur\` would close the list, and the click would land on nothing. \`@mousemove\` (not \`@mouseenter\`) keeps keyboard scrolling from stealing the highlight.

### Step 4: ARIA

The input carries \`role="combobox"\`, \`aria-autocomplete="list"\`, \`:aria-expanded="showList"\`, \`:aria-controls="listId"\` and \`:aria-activedescendant\` (bound to \`undefined\` when nothing is active, which removes the attribute). \`useId()\` (exported by Vue 3.5.44) builds the ids, so several instances on a page do not collide; see [useId for SSR-safe ids](/interview-question/useid-vs-getcurrentinstance-how-do-you-generate-ssr-safe-ids-in-vue-3-5).

📌 **Interview term: aria-activedescendant** — on the focused input, the id of the visually highlighted option; screen readers announce it while typing still works.

## 4. Verified: What the Driver Printed

\`\`\`
typed ca, 250 ms : hint: Loading... | Requests sent: 1 | Cache hits: 0
ca               : Cambodia, Cameroon, Canada, Jamaica, Nicaragua, South Africa | Requests sent: 1 | Cache hits: 0
can              : Canada | Requests sent: 2 | Cache hits: 0
ca again         : 6 options | Requests sent: 2 | Cache hits: 1
ArrowDown x2     : active = Cameroon | aria-expanded = true
ArrowUp x2       : active = South Africa (wrapped)
Enter            : input = "South Africa" | Selected: South Africa | aria-expanded = false
xyz              : No matches | Requests sent: 3 | Cache hits: 1
Escape           : panel open = false
ge               : Georgia, Germany, Argentina
mouse over #2    : active = Germany
mousedown        : defaultPrevented = true
click            : Selected: Germany | Requests sent: 4 | Cache hits: 1
\`\`\`

Returning to "ca" was a cache hit, Up wrapped from the first item to the last, and the option's \`mousedown\` was prevented (jsdom does not move focus on synthetic mouse events, so the focus-keeping effect itself is a browser behaviour not observed here). The React and Angular builds print the same lines.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Roles | \`combobox\`, \`listbox\`, \`option\` |
| Highlight | \`aria-activedescendant\` and \`aria-selected\` |
| Focus | Stays in the input; \`@mousedown.prevent\` on options |
| Blur | \`@blur\` closes the panel |
| After a pick | \`open\` is false, so filling the input does not trigger a lookup |
| Normalisation | Trim + lowercase before caching and fetching |

## 6. Common Pitfalls

- **Putting the cache in a \`ref\` or \`reactive\`.** Works, but every stored list becomes a deep proxy for no benefit.
- **Forgetting \`@mousedown.prevent\`.** The blur closes the panel before the click.
- **Using \`v-model\` and also setting \`:value\`.** Pick one; here \`v-model\` owns the text and \`select()\` writes the same ref.
- **Not resetting \`active\`** when suggestions change.
- **Watching only \`debounced\`.** Reopening the list (open changes, debounced does not) would not look anything up; watch the open flag too.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;">"Refs for text, open flag, suggestions, status, active index and picked value; a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> cache and a plain latest-id counter because nothing renders from them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Lookup:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on the debounced term, the live term and the open flag: when open and caught up, answer from the cache or fetch, store, and apply only if still latest."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Keyboard:</strong> <span style="color:#f0e2c8;">"Arrows move the active index with wrap-around and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code>, Enter picks, Escape closes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mouse:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@mousemove</code> highlights, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@click</code> picks, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@mousedown.prevent</code> keeps focus in the input so blur does not close the list."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"The input is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">combobox</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-expanded</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-controls</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code>; ids come from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useId</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you extract a composable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useAutocomplete(fetcher, { delay })</code> returning query, suggestions, active and the key handler, so the template stays presentational and the logic can be tested without mounting.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you bound the cache?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Turn the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> into an LRU: on a hit, delete and re-set the key; on insert, if over the limit, delete <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map.keys().next().value</code>. Add a timestamp for expiry if data changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watchEffect</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It would track every ref read in the callback, including <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stats</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">suggestions</code>, and re-run when they change. An explicit source list keeps the triggers obvious.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue Test Utils with a mocked API and fake timers: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue("ca")</code>, advance timers, assert options; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trigger("keydown", { key: "ArrowDown" })</code> and check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code>.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Autocomplete / typeahead** | Input that suggests completions as you type |
| **Non-reactive state** | Plain variable for data nothing renders from |
| **Memoization cache** | Results stored by input |
| **Stale response** | Answer to an older query |
| **Active index** | The highlighted option, separate from the picked value |
| **aria-activedescendant** | Points from the input to the highlighted option |

---
**Conclusion:** In Vue the autocomplete is one watcher over the debounced term, the live term and the open flag, a plain \`Map\` cache in front of the API, an active index the keyboard moves, and \`@mousedown.prevent\` so options never steal focus. The verified run on Vue 3.5.44 shows a single request per burst of typing, a cache hit on returning to a query, wrap-around navigation and mouse selection.`,
        files: {
          "/src/App.vue": `<script setup>
import Autocomplete from "./components/Autocomplete.vue";
</script>

<template>
  <main class="page">
    <h1>Country finder</h1>
    <Autocomplete />
  </main>
</template>

<style>
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
.page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 1.4rem; margin: 0 0 16px; }
</style>
`,
          "/src/api.js": `// Simulated server: no network. Every call takes 150 ms.
const COUNTRIES = [
  "Afghanistan", "Argentina", "Australia", "Austria", "Brazil", "Cambodia", "Cameroon",
  "Canada", "Chile", "China", "Colombia", "Denmark", "Egypt", "France", "Georgia",
  "Germany", "Ghana", "Greece", "India", "Jamaica", "Japan", "Kenya", "Mexico",
  "Morocco", "Nepal", "Nicaragua", "Norway", "Portugal", "South Africa", "Spain",
  "Sweden", "United States", "Vietnam",
];

export function fetchCountries(query) {
  const q = query.toLowerCase();
  return new Promise((resolve) => {
    setTimeout(() => {
      const starts = COUNTRIES.filter((c) => c.toLowerCase().startsWith(q));
      const contains = COUNTRIES.filter((c) => !c.toLowerCase().startsWith(q) && c.toLowerCase().includes(q));
      resolve([...starts, ...contains].slice(0, 6)); // prefix matches rank first
    }, 150);
  });
}
`,
          "/src/components/Autocomplete.vue": `<script setup>
import { computed, ref, useId, watch } from "vue";
import { fetchCountries } from "../api.js";
import { useDebounced } from "../composables/useDebounced.js";

const query = ref("");
const open = ref(false);
const suggestions = ref([]);
const status = ref("idle"); // idle | loading | done
const active = ref(-1);
const selected = ref("");
const stats = ref({ requests: 0, hits: 0 });
const cache = new Map(); // query -> suggestions; plain Map, nothing reactive needed
let latest = 0; // id of the newest lookup; older responses are ignored
const listId = useId();

const term = computed(() => query.value.trim().toLowerCase());
const debounced = useDebounced(term, 250);

watch([debounced, term, open], ([dq, t, isOpen]) => {
  // Look up only when open and the debounced value has caught up with the box.
  if (!isOpen || dq !== t) return;
  const id = ++latest; // anything still in flight is now stale
  if (!dq) {
    suggestions.value = [];
    status.value = "idle";
    return;
  }
  const cached = cache.get(dq);
  if (cached) {
    suggestions.value = cached;
    active.value = -1;
    status.value = "done";
    stats.value.hits++;
    return;
  }
  status.value = "loading";
  stats.value.requests++;
  fetchCountries(dq).then((list) => {
    cache.set(dq, list); // cache even if stale: the answer is still right
    if (id !== latest) return;
    suggestions.value = list;
    active.value = -1;
    status.value = "done";
  });
});

const showPanel = computed(() => open.value && term.value !== "");
const showList = computed(() => showPanel.value && suggestions.value.length > 0);
const optionId = (i) => listId + "-opt-" + i;

function select(country) {
  query.value = country;
  selected.value = country;
  suggestions.value = []; // do not flash this list the next time the box opens
  open.value = false;
  active.value = -1;
}

function onInput() {
  open.value = true;
}

function onKeydown(e) {
  const n = suggestions.value.length;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!open.value) open.value = true;
    else if (n) active.value = (active.value + 1) % n;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (n) active.value = active.value <= 0 ? n - 1 : active.value - 1;
  } else if (e.key === "Enter") {
    if (open.value && active.value >= 0) {
      e.preventDefault();
      select(suggestions.value[active.value]);
    }
  } else if (e.key === "Escape") {
    open.value = false;
    active.value = -1;
  }
}
</script>

<template>
  <div class="ac">
    <label for="country" class="label">Country</label>
    <input
      id="country"
      v-model="query"
      data-testid="ac-input"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="showList"
      :aria-controls="listId"
      :aria-activedescendant="showList && active >= 0 ? optionId(active) : undefined"
      autocomplete="off"
      placeholder="Start typing, e.g. ca"
      @input="onInput"
      @keydown="onKeydown"
      @blur="open = false"
    />

    <div v-if="showPanel" class="panel">
      <ul v-if="showList" :id="listId" role="listbox" aria-label="Countries" data-testid="ac-list">
        <li
          v-for="(country, i) in suggestions"
          :id="optionId(i)"
          :key="country"
          role="option"
          :aria-selected="i === active"
          :class="['option', { active: i === active }]"
          @mousemove="active = i"
          @mousedown.prevent
          @click="select(country)"
        >{{ country }}</li>
      </ul>
      <p v-else class="hint" data-testid="ac-hint">{{ status === "done" ? "No matches" : "Loading..." }}</p>
    </div>

    <p class="meta" data-testid="selected">{{ selected ? "Selected: " + selected : "Nothing selected yet" }}</p>
    <p class="meta" data-testid="stats">Requests sent: {{ stats.requests }} | Cache hits: {{ stats.hits }}</p>
  </div>
</template>

<style scoped>
.ac { position: relative; }
.label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
.ac input { width: 100%; padding: 10px 12px; font-size: 1rem; color: inherit; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
.ac input:focus { outline: 2px solid #7aa2ff; outline-offset: 1px; }
.panel { position: absolute; left: 0; right: 0; top: 70px; z-index: 10; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); padding: 4px; }
.panel ul { list-style: none; margin: 0; padding: 0; max-height: 240px; overflow-y: auto; }
.option { padding: 8px 10px; border-radius: 6px; cursor: pointer; }
.option.active { background: #2f3b66; color: #fff; }
.hint { margin: 8px 10px; color: #7d859b; }
.meta { font-size: 0.85rem; color: #a9b1c6; margin: 12px 0 0; }
.meta + .meta { margin-top: 4px; color: #7d859b; }
</style>
`,
          "/src/composables/useDebounced.js": `import { ref, watch, onScopeDispose } from "vue";

// A ref that follows \`source\`, but only after it has stopped changing for \`delay\` ms.
export function useDebounced(source, delay) {
  const debounced = ref(source.value);
  let timer;
  watch(source, (value) => {
    clearTimeout(timer); // a new keystroke cancels the old timer
    timer = setTimeout(() => { debounced.value = value; }, delay);
  });
  onScopeDispose(() => clearTimeout(timer)); // component unmounted: no late update
  return debounced;
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers preparing for a machine coding round. Assumes components and templates; signals, effects and ARIA roles are explained as they appear.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The Verified output came from booting the solution on Angular 22.2.3 in jsdom, both AOT with strict templates and with the runtime JIT compiler the site playground uses. The country API is simulated with a 150 ms delay.

## 1. A Story First

A barista who hears "the usual fl..." already reaches for your cup, and does not need to think at all if you ordered the same thing ten minutes ago. An autocomplete gives an input that skill: a few letters become a short list of likely answers, picked with the keyboard or mouse, and answers already looked up come from memory. This is the fundamentals version; [typeahead with debounce and highlight](/interview-question/build-autocomplete-typeahead-with-debounce-highlight) goes deep on highlighting and races, and the [combobox](/interview-question/build-a-combobox-search-select) covers the full ARIA contract.

## 2. The Plan in Angular Terms

This build uses **signals only** (no RxJS), to show the other Angular idiom next to the RxJS pipeline in the [debounced search bar](/interview-question/build-a-debounced-search-bar).

| Piece | Tool |
| :--- | :--- |
| Text, open flag, suggestions, status, active index, picked value, counters | \`signal()\` |
| Normalised term, panel visibility | \`computed()\` |
| Debounced term | a small \`debounced(source, ms)\` helper built on \`effect\` |
| Lookup | \`effect()\` in the constructor, body wrapped in \`untracked\` |
| Cache, latest id | plain private fields |
| Ids | a module-level counter |

\`\`\`ts
export function debounced<T>(source: () => T, ms: number): Signal<T> {
  const out = signal(source());
  effect((onCleanup) => {
    const value = source();
    const timer = setTimeout(() => out.set(value), ms);
    onCleanup(() => clearTimeout(timer)); // a new keystroke cancels the old timer
  });
  return out.asReadonly();
}
\`\`\`

📌 **Interview term: effect** — a function Angular re-runs when signals it read change. Its \`onCleanup\` callback runs before the next run and when the effect is destroyed, which is what clears the pending timer. When not to use it: [effect() and when to avoid it](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it).

The helper must be called in an injection context (a field initializer is one), because \`effect()\` needs the component's injector to know when to stop.

## 3. Build It Step by Step

### Step 1: the lookup effect

\`\`\`ts
constructor() {
  effect(() => {
    const dq = this.debouncedTerm();
    const t = this.term();
    const isOpen = this.open();
    // Look up only when open and the debounced value has caught up with the box.
    if (!isOpen || dq !== t) return;
    untracked(() => this.lookup(dq)); // signals read inside lookup are not dependencies
  });
}
\`\`\`

\`\`\`ts
private lookup(dq: string) {
  const id = ++this.latest; // anything still in flight is now stale
  if (!dq) { this.suggestions.set([]); this.status.set("idle"); return; }
  const cached = this.cache.get(dq);
  if (cached) {
    this.suggestions.set(cached); this.active.set(-1); this.status.set("done");
    this.stats.update((s) => ({ ...s, hits: s.hits + 1 }));
    return;
  }
  this.status.set("loading");
  this.stats.update((s) => ({ ...s, requests: s.requests + 1 }));
  fetchCountries(dq).then((list) => {
    this.cache.set(dq, list); // cache even if stale: the answer is still right
    if (id !== this.latest) return;
    this.suggestions.set(list); this.active.set(-1); this.status.set("done");
  });
}
\`\`\`

📌 **Interview term: untracked** — runs a function without recording the signals it reads as dependencies of the surrounding effect. Without it, reading \`this.suggestions()\` or \`this.active()\` inside \`lookup\` could make the effect re-run on its own writes.

📌 **Interview term: Memoization cache** — answers stored by input; a \`Map\` from lowercased query to suggestions.

📌 **Interview term: Stale response** — an answer to an older query, dropped by the \`id !== this.latest\` check.

### Step 2: keyboard and mouse

\`\`\`ts
onKeydown(e: KeyboardEvent) {
  const n = this.suggestions().length;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!this.open()) this.open.set(true);
    else if (n) this.active.update((i) => (i + 1) % n);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (n) this.active.update((i) => (i <= 0 ? n - 1 : i - 1));
  } else if (e.key === "Enter") {
    if (this.open() && this.active() >= 0) { e.preventDefault(); this.select(this.suggestions()[this.active()]); }
  } else if (e.key === "Escape") {
    this.open.set(false); this.active.set(-1);
  }
}
\`\`\`

Each option binds \`(mousemove)="active.set(i)"\`, \`(mousedown)="$event.preventDefault()"\` and \`(click)="select(country)"\`. Preventing \`mousedown\` keeps focus in the input, so its \`(blur)\` does not close the list before the click arrives.

📌 **Interview term: Active index** — the highlighted option, reset to \`-1\` whenever a new list is applied.

### Step 3: ARIA bindings

\`\`\`html
<input role="combobox" aria-autocomplete="list"
  [attr.aria-expanded]="showList()"
  [attr.aria-controls]="listId"
  [attr.aria-activedescendant]="showList() && active() >= 0 ? optionId(active()) : null" />
\`\`\`

Binding \`null\` removes the attribute. \`[attr.aria-expanded]\` with a boolean renders \`"true"\` / \`"false"\`, which is what screen readers expect.

📌 **Interview term: aria-activedescendant** — on the focused input, the id of the visually highlighted option.

## 4. Verified: What the Driver Printed

Both the AOT and JIT builds printed:

\`\`\`
typed ca, 250 ms : hint: Loading... | Requests sent: 1 | Cache hits: 0
ca               : Cambodia, Cameroon, Canada, Jamaica, Nicaragua, South Africa | Requests sent: 1 | Cache hits: 0
can              : Canada | Requests sent: 2 | Cache hits: 0
ca again         : 6 options | Requests sent: 2 | Cache hits: 1
ArrowDown x2     : active = Cameroon | aria-expanded = true
ArrowUp x2       : active = South Africa (wrapped)
Enter            : input = "South Africa" | Selected: South Africa | aria-expanded = false
xyz              : No matches | Requests sent: 3 | Cache hits: 1
Escape           : panel open = false
ge               : Georgia, Germany, Argentina
mouse over #2    : active = Germany
mousedown        : defaultPrevented = true
click            : Selected: Germany | Requests sent: 4 | Cache hits: 1
\`\`\`

The effect-based debounce produced one request for "c", "ca"; returning to "ca" was a cache hit; Up wrapped to the last option; the option's \`mousedown\` was prevented (jsdom does not move focus on synthetic mouse events, so the focus-keeping effect is browser behaviour not observed here). Identical to the React and Vue builds.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Roles | \`combobox\`, \`listbox\`, \`option\` |
| Highlight | \`aria-activedescendant\` + \`aria-selected\` |
| Focus | Stays in the input; options prevent \`mousedown\` |
| Blur | \`(blur)\` closes the panel |
| After a pick | \`open\` is false, so no lookup |
| Several instances | Ids built from a module-level counter |

## 6. Common Pitfalls

- **Reading signals inside an effect body you did not mean to depend on.** Wrap side-effect work in \`untracked\`.
- **Calling \`debounced()\` or \`effect()\` outside an injection context**, for example inside an event handler: Angular throws because there is no injector to tie cleanup to.
- **Plain fields for view state.** Changing a normal field from a promise callback may not re-render; keep view state in signals.
- **\`[attr.aria-activedescendant]\` set to an empty string** instead of \`null\`: an empty attribute is still present and points at nothing.
- **Not resetting the active index** when a new list arrives.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;">"Signals for text, open flag, suggestions, status, active index and picked value; the cache and latest id are plain fields because nothing renders from them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Debounce:</strong> <span style="color:#f0e2c8;">"A tiny <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">debounced()</code> helper: an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> that starts a timeout and clears it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code>, returning a read-only signal."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Lookup:</strong> <span style="color:#f0e2c8;">"A second effect reads the debounced term, live term and open flag, and calls the lookup in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">untracked</code>: cache hit, or fetch, store and apply if still latest."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Keyboard and mouse:</strong> <span style="color:#f0e2c8;">"Arrows move the active index with wrap, Enter picks, Escape closes; options prevent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mousedown</code> so the input keeps focus."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=combobox</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[attr.aria-expanded]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-controls</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[attr.aria-activedescendant]</code>, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">listbox</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">option</code>s with unique ids."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would RxJS be better here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It would be equally valid: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">debounceTime</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">distinctUntilChanged</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> with a cache check in front. Signals keep everything in one model the template already reads; RxJS shines when you need cancellation operators.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you turn this into a form control?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ControlValueAccessor</code> so it works with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formControlName</code>, writing the picked value through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code> and marking touched on blur; see [custom form controls with ControlValueAccessor](/interview-question/how-do-you-build-a-custom-form-control-by-implementing-the-controlvalueaccessor-).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the effect-based debounce?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fakeAsync</code>, set the input, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(249)</code> and assert no call, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(1)</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code> and assert one call; resolve the mocked promise and assert options.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a module-level id counter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each instance needs unique option ids for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code>. A counter is enough for a client-only app. With server rendering, a module-level counter can count differently on the server and in the browser, so pass an id in as an input or derive it from something stable instead.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **effect** | Re-runs when signals it read change; \`onCleanup\` before the next run |
| **untracked** | Run code without recording signal reads as dependencies |
| **Memoization cache** | Results stored by input |
| **Stale response** | Answer to an older query |
| **Active index** | The highlighted option |
| **aria-activedescendant** | Points from the input to the highlighted option |

---
**Conclusion:** The Angular autocomplete is signals for state, an effect-based \`debounced()\` helper, a lookup effect that reads its triggers and then works in \`untracked\`, a \`Map\` cache with a latest-id check, and options that prevent \`mousedown\`. The verified AOT and JIT runs on Angular 22.2.3 show one request per burst, a cache hit when returning to a query, wrap-around navigation and mouse selection.`,
        files: {
          "/src/app/app.component.ts": `import { Component } from "@angular/core";
import { AutocompleteComponent } from "./autocomplete.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [AutocompleteComponent],
  template: \`
    <main class="page">
      <h1>Country finder</h1>
      <app-autocomplete />
    </main>
  \`,
  styles: [\`
    :host { display: block; min-height: 100vh; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color-scheme: dark; }
    .page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
    h1 { font-size: 1.4rem; margin: 0 0 16px; }
  \`],
})
export class AppComponent {}
`,
          "/src/app/api.ts": `// Simulated server: no network. Every call takes 150 ms.
const COUNTRIES = [
  "Afghanistan", "Argentina", "Australia", "Austria", "Brazil", "Cambodia", "Cameroon",
  "Canada", "Chile", "China", "Colombia", "Denmark", "Egypt", "France", "Georgia",
  "Germany", "Ghana", "Greece", "India", "Jamaica", "Japan", "Kenya", "Mexico",
  "Morocco", "Nepal", "Nicaragua", "Norway", "Portugal", "South Africa", "Spain",
  "Sweden", "United States", "Vietnam",
];

export function fetchCountries(query: string): Promise<string[]> {
  const q = query.toLowerCase();
  return new Promise<string[]>((resolve) => {
    setTimeout(() => {
      const starts = COUNTRIES.filter((c) => c.toLowerCase().startsWith(q));
      const contains = COUNTRIES.filter((c) => !c.toLowerCase().startsWith(q) && c.toLowerCase().includes(q));
      resolve([...starts, ...contains].slice(0, 6)); // prefix matches rank first
    }, 150);
  });
}
`,
          "/src/app/autocomplete.component.ts": `import { Component, computed, effect, signal, untracked } from "@angular/core";
import { fetchCountries } from "./api";
import { debounced } from "./debounced";

let nextId = 0;

@Component({
  selector: "app-autocomplete",
  standalone: true,
  template: \`
    <label for="country" class="label">Country</label>
    <input
      #box
      id="country"
      data-testid="ac-input"
      role="combobox"
      aria-autocomplete="list"
      autocomplete="off"
      placeholder="Start typing, e.g. ca"
      [attr.aria-expanded]="showList()"
      [attr.aria-controls]="listId"
      [attr.aria-activedescendant]="showList() && active() >= 0 ? optionId(active()) : null"
      [value]="query()"
      (input)="query.set(box.value); open.set(true)"
      (keydown)="onKeydown($event)"
      (blur)="open.set(false)"
    />

    @if (showPanel()) {
      <div class="panel">
        @if (showList()) {
          <ul [id]="listId" role="listbox" aria-label="Countries" data-testid="ac-list">
            @for (country of suggestions(); track country; let i = $index) {
              <li
                [id]="optionId(i)"
                role="option"
                class="option"
                [class.active]="i === active()"
                [attr.aria-selected]="i === active()"
                (mousemove)="active.set(i)"
                (mousedown)="$event.preventDefault()"
                (click)="select(country)"
              >{{ country }}</li>
            }
          </ul>
        } @else {
          <p class="hint" data-testid="ac-hint">{{ status() === "done" ? "No matches" : "Loading..." }}</p>
        }
      </div>
    }

    <p class="meta" data-testid="selected">{{ selected() ? "Selected: " + selected() : "Nothing selected yet" }}</p>
    <p class="meta" data-testid="stats">Requests sent: {{ stats().requests }} | Cache hits: {{ stats().hits }}</p>
  \`,
  styles: [\`
    :host { display: block; position: relative; }
    .label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
    input { width: 100%; box-sizing: border-box; padding: 10px 12px; font-size: 1rem; color: inherit; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
    input:focus { outline: 2px solid #7aa2ff; outline-offset: 1px; }
    .panel { position: absolute; left: 0; right: 0; top: 70px; z-index: 10; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); padding: 4px; }
    .panel ul { list-style: none; margin: 0; padding: 0; max-height: 240px; overflow-y: auto; }
    .option { padding: 8px 10px; border-radius: 6px; cursor: pointer; }
    .option.active { background: #2f3b66; color: #fff; }
    .hint { margin: 8px 10px; color: #7d859b; }
    .meta { font-size: 0.85rem; color: #a9b1c6; margin: 12px 0 0; }
    .meta + .meta { margin-top: 4px; color: #7d859b; }
  \`],
})
export class AutocompleteComponent {
  readonly listId = "country-list-" + nextId++;

  readonly query = signal("");
  readonly open = signal(false);
  readonly suggestions = signal<string[]>([]);
  readonly status = signal<"idle" | "loading" | "done">("idle");
  readonly active = signal(-1);
  readonly selected = signal("");
  readonly stats = signal({ requests: 0, hits: 0 });

  readonly term = computed(() => this.query().trim().toLowerCase());
  readonly debouncedTerm = debounced(this.term, 250);
  readonly showPanel = computed(() => this.open() && this.term() !== "");
  readonly showList = computed(() => this.showPanel() && this.suggestions().length > 0);

  private readonly cache = new Map<string, string[]>(); // query -> suggestions
  private latest = 0; // id of the newest lookup; older responses are ignored

  constructor() {
    effect(() => {
      const dq = this.debouncedTerm();
      const t = this.term();
      const isOpen = this.open();
      // Look up only when open and the debounced value has caught up with the box.
      if (!isOpen || dq !== t) return;
      untracked(() => this.lookup(dq)); // signals read inside lookup are not dependencies
    });
  }

  optionId(i: number) {
    return this.listId + "-opt-" + i;
  }

  private lookup(dq: string) {
    const id = ++this.latest; // anything still in flight is now stale
    if (!dq) {
      this.suggestions.set([]);
      this.status.set("idle");
      return;
    }
    const cached = this.cache.get(dq);
    if (cached) {
      this.suggestions.set(cached);
      this.active.set(-1);
      this.status.set("done");
      this.stats.update((s) => ({ ...s, hits: s.hits + 1 }));
      return;
    }
    this.status.set("loading");
    this.stats.update((s) => ({ ...s, requests: s.requests + 1 }));
    fetchCountries(dq).then((list) => {
      this.cache.set(dq, list); // cache even if stale: the answer is still right
      if (id !== this.latest) return;
      this.suggestions.set(list);
      this.active.set(-1);
      this.status.set("done");
    });
  }

  select(country: string) {
    this.query.set(country);
    this.selected.set(country);
    this.suggestions.set([]); // do not flash this list the next time the box opens
    this.open.set(false);
    this.active.set(-1);
  }

  onKeydown(e: KeyboardEvent) {
    const n = this.suggestions().length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!this.open()) this.open.set(true);
      else if (n) this.active.update((i) => (i + 1) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (n) this.active.update((i) => (i <= 0 ? n - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (this.open() && this.active() >= 0) {
        e.preventDefault();
        this.select(this.suggestions()[this.active()]);
      }
    } else if (e.key === "Escape") {
      this.open.set(false);
      this.active.set(-1);
    }
  }
}
`,
          "/src/app/debounced.ts": `import { Signal, effect, signal } from "@angular/core";

// A signal that follows \`source\`, but only after it has stopped changing for \`ms\`.
// Call it in an injection context (a field initializer or constructor).
export function debounced<T>(source: () => T, ms: number): Signal<T> {
  const out = signal(source());
  effect((onCleanup) => {
    const value = source();
    const timer = setTimeout(() => out.set(value), ms);
    onCleanup(() => clearTimeout(timer)); // a new keystroke cancels the old timer
  });
  return out.asReadonly();
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build Autocomplete / Typeahead with Debounce & Highlight",
    seoDescription:
      "Typeahead with safe match highlighting and race-proof requests: escaped regex split into mark elements, AbortController plus request ids, verified.",
    description: `**Question presented to candidate:**
"You already have a basic typeahead. Now make it production-safe: highlight the part of each suggestion that matches what the user typed, without ever injecting HTML, and make sure a slow, older response can never replace the results for what is in the box right now. Show me the race happening and show me your fix."

**Requirements:**
- Debounce input by 300 ms and fetch suggestions from a simulated API whose latency depends on the query, so older requests can resolve last.
- Highlight every case-insensitive occurrence of the query inside each suggestion with \`mark\` elements, treating the query as literal text: \`c++\`, \`(\` and \`.\` must not break or change matching.
- Render suggestions as text: an item containing markup such as \`<img src=x onerror=...>\` must be displayed, never parsed.
- Guard against out-of-order responses with \`AbortController\` plus a request-id check; include a toggle that turns the guard off so the bug can be demonstrated.
- Keyboard Up / Down / Enter / Escape and \`aria-activedescendant\`, as in the basic version.

**What a strong answer should cover:**
- Why debounce alone does not order responses, with a concrete timeline (\`r\` slow, \`re\` slower than \`rea\`).
- Two layers of protection: abort the previous request, and still ignore any response whose id is not the latest (for APIs that ignore abort).
- Highlighting by splitting on an escaped regex with one capture group, then rendering parts as text nodes; no \`innerHTML\`, \`v-html\`, \`[innerHTML]\` or \`dangerouslySetInnerHTML\`.
- Why lowercasing and slicing by \`indexOf\` can misalign (\`İ\` lowercases to two characters).
- Showing which query the visible results belong to, and testing the race deterministically.

**Clarifying questions expected:**
- "Can the API be cancelled, or must I ignore stale responses client-side?"
- "Should highlighting match whole words, prefixes, or any substring? Should it ignore accents?"
- "Can suggestion text contain user-generated content?"

**Code / implementation expected:** Yes. A working typeahead with safe highlighting and a demonstrable race guard.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend developers who can already build a basic autocomplete and want the two details that separate a demo from production: safe highlighting and race-proof requests.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. The Verified output was produced by running the solution on React 19.3.1 in jsdom; regex and string facts were run on Node 22.22. The package API is simulated in the file with deliberately uneven delays.

## 1. Why This Even Matters — A Story First

You ask three friends, one after another, "what is the capital of Aus...", "of Austr...", "of Australia?". The friend you asked last answers first ("Canberra"), then the first friend finally shouts "Vienna!" because they heard "Aus" and thought Austria. If you write down whatever you heard last, your notes say Vienna. Asking later does not mean hearing back later.

That is the typeahead race: requests for "r", "re" and "rea" can come back in the order rea, re, r, and naive code shows results for "r" while the box says "rea". The second problem is quieter: to highlight the matching letters, many people build HTML strings and inject them, which turns any suggestion containing markup into a script-injection hole.

This doc assumes the [basic autocomplete](/interview-question/build-an-autocomplete-typeahead-search) (suggestions, keyboard, cache) and focuses only on those two problems. The debounce itself is covered in the [debounced search bar](/interview-question/build-a-debounced-search-bar).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the API be cancelled? | \`fetch\` accepts an \`AbortSignal\`; some SDKs do not, so you also need a client-side "is this the latest?" check. |
| Can suggestions contain user-generated text? | If yes, highlighting through HTML strings is an XSS risk; render text nodes. |
| What counts as a match: substring, prefix, word start? | Changes the highlight logic and the ranking. |
| Should accents and case be ignored ("Montreal" vs "Montréal")? | Accent-insensitive matching needs normalisation and careful index mapping. |
| Should we cache? | A cache hides the race in demos; this build leaves it out on purpose so the race is visible. |

## 3. Requirements and Plan

\`App\` → \`Typeahead\` → \`Highlight\` per option, plus \`matchParts.js\` (pure highlight logic), \`api.js\` (fake server) and the \`useDebouncedValue\` hook.

| Value | Kind | Note |
| :--- | :--- | :--- |
| \`query\` | state | input text |
| \`guard\` | state | demo toggle: protection on or off |
| \`results\`, \`shownFor\` | state | the visible list **and the query it belongs to** |
| \`active\`, \`picked\`, \`events\` | state | keyboard highlight, chosen item, network log |
| \`latest\` | ref | id of the newest request |
| \`mismatch\` | derived | \`shownFor !== term\`: the screen is showing someone else's answer |

📌 **Interview term: Race condition** — the outcome depends on which async operation finishes first. Here, the response for an older query arriving after the newer one.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Timeline: requests for r, re and rea are sent in order but their responses arrive in reverse; without a guard the last response, for r, is shown">
  <defs>
    <marker id="q4r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="46">r</text>
  <rect class="d-box-muted" x="60" y="26" width="560" height="32" rx="6"/>
  <text class="d-text" x="340" y="47" text-anchor="middle">1500 ms</text>
  <text class="d-sub" x="20" y="106">re</text>
  <rect class="d-box-muted" x="180" y="86" width="330" height="32" rx="6"/>
  <text class="d-text" x="345" y="107" text-anchor="middle">900 ms</text>
  <text class="d-sub" x="20" y="166">rea</text>
  <rect class="d-box-accent" x="300" y="146" width="90" height="32" rx="6"/>
  <text class="d-text d-accent" x="345" y="167" text-anchor="middle">150 ms</text>
  <path class="d-edge-accent" d="M 390 178 L 390 230" marker-end="url(#q4r-arrow)"/>
  <text class="d-sub" x="390" y="256" text-anchor="middle">rea arrives first</text>
  <path class="d-edge-dashed" d="M 620 58 L 620 230" marker-end="url(#q4r-arrow)"/>
  <text class="d-sub" x="590" y="256" text-anchor="middle">r arrives last</text>
</svg>

Requests start left to right as the user types, but the fake server answers short queries slowly. Without a guard, whichever response lands last wins, and that is the oldest one.

## 4. Build It Step by Step

### Step 1: a server that answers in the wrong order

\`\`\`js
const latency = query.length === 1 ? 1500 : query.length === 2 ? 900 : 150;
\`\`\`

Real APIs do this too: a one-letter query matches far more rows, caches are cold, and networks reorder. Making the latency depend on the query turns a rare production bug into a reproducible demo.

### Step 2: two layers of protection

\`\`\`js
useEffect(() => {
  if (!debounced) { setResults([]); setShownFor(""); return; }
  const id = ++latest.current;
  const controller = guard ? new AbortController() : null;
  searchPackages(debounced, controller ? { signal: controller.signal } : {})
    .then((list) => {
      // Belt and braces: even if an API ignores abort(), drop old answers.
      if (guard && id !== latest.current) return;
      setResults(list);
      setShownFor(debounced);
      setActive(-1);
    })
    .catch((err) => { /* AbortError: expected, not shown */ });
  return () => { if (controller) controller.abort(); };
}, [debounced, guard]);
\`\`\`

(Excerpt: the real file also writes sent / aborted / ignored / applied events to an on-screen log.)

📌 **Interview term: AbortController** — \`abort()\` cancels the async work that received its \`signal\`; \`fetch\` rejects with an \`AbortError\`. See [aborting fetch](/interview-question/how-do-you-abort-a-fetch-api-request-using-abortcontroller).

📌 **Interview term: Request id (sequence number)** — a counter incremented per request; a response is applied only if its id is still the latest. It protects you even when the API ignores the abort signal or the response was already in the browser when you aborted.

The cleanup runs before the next effect, so by the time "rea" is requested, "re" has been aborted. The deeper React discussion is in [async work and race conditions inside effects](/interview-question/how-do-you-safely-handle-async-work-and-race-conditions-inside-effects). With the guard off, nothing is aborted and nothing is checked: the naive version most candidates write first.

### Step 3: split the text, do not build HTML

\`\`\`js
export function escapeRegExp(text) {
  return text.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
}
export function splitMatches(text, query) {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  return text
    .split(new RegExp("(" + escapeRegExp(q) + ")", "gi"))
    .map((part, i) => ({ text: part, match: i % 2 === 1 }))
    .filter((part) => part.text !== "");
}
\`\`\`

\`String.prototype.split\` with a regex that has **one capture group** includes the captured matches in the output, always at odd indexes. In Node 22.22, \`"Create React App".split(/(rea)/gi)\` returned \`["C","rea","te ","Rea","ct App"]\`: two matches, original casing kept.

📌 **Interview term: Regex escaping** — turning characters that mean something in a regular expression (\`. * + ? ( ) [ ] { } | ^ $ \\\`) into literal ones. Unescaped, \`new RegExp("(")\` throws; in Node 22.22 the message was \`Invalid regular expression: /(/: Unterminated group\`. Newer engines also ship a built-in \`RegExp.escape()\`, but Node 22.22 used here does not have it (\`typeof RegExp.escape\` printed \`undefined\`), so the solution escapes by hand.

Why not lowercase both strings and slice by \`indexOf\`? Because lowercasing can change length. In Node 22.22, \`"İstanbul".toLowerCase().indexOf("stan")\` was \`2\` while \`"İstanbul".indexOf("stan")\` was \`1\`: slicing the original string with the lowercased index highlights the wrong letters. The \`i\` flag matches on the original string, so its indexes are always right.

### Step 4: render parts as text

\`\`\`jsx
export default function Highlight({ text, query }) {
  return splitMatches(text, query).map((part, i) =>
    part.match ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>
  );
}
\`\`\`

Every part is a React text child, which React writes with \`textContent\` semantics. A suggestion that literally contains \`<img src=x onerror=alert(1)>\` is shown as those characters. The tempting shortcut, \`dangerouslySetInnerHTML={{ __html: text.replace(re, "<mark>$1</mark>") }}\`, would create a real \`img\` element and run its handler. See [how React handles XSS](/interview-question/how-does-react-handle-security-concerns-like-xss).

📌 **Interview term: XSS (cross-site scripting)** — running attacker-supplied script in your page, typically by inserting untrusted text as HTML.

📌 **Interview term: mark element** — the HTML element for text highlighted for relevance, such as search matches. It carries meaning, unlike a styled \`span\`.

### Step 5: show whose answer is on screen

The status line reads "Showing results for "rea"", and adds "(does not match the box)" in amber when \`shownFor !== term\`. In production you would not show the warning, but tracking \`shownFor\` is useful anyway: it lets you dim results that belong to an older query.

## 5. Verified: What the Driver Printed

Mounted under \`StrictMode\` in jsdom. The driver typed with real \`input\` events, waited longer than the 300 ms debounce between "r", "re" and "rea" so each one was actually sent, and advanced time in 20 ms steps. Option text is printed with \`mark\` parts in [brackets]:

\`\`\`
rea            : [Rea]ct, [Rea]ct Router, P[rea]ct, C[rea]te [Rea]ct App
c++            : [C++]
(              : Showing results for "(" | options: 1
<img           : [<img] src=x onerror=alert(1)> | <img> elements in the page: 0
ArrowDown+Enter: Picked: <img src=x onerror=alert(1)>
--- guard ON: type r, re, rea; answers come back rea, re, r ---
box            : "rea" | Showing results for "rea"
events         : sent "<img" / applied "<img" / sent "r" / sent "re" / aborted "r" / sent "rea" / aborted "re" / applied "rea"
--- guard OFF: same typing ---
after rea sent : No results yet
box            : "rea" | Showing results for "r" (does not match the box)
options        : [Rea]ct, [Rea]ct Router, Redux, Remix, Rust, Ruby on Rails, Rollup, Ramda
events         : sent "rea" / applied "rea" / sent "r" / sent "re" / sent "rea" / applied "rea" / applied "re" / applied "r"
\`\`\`

What this proves:

- Highlighting found both matches in "Create React App", kept the original casing, and treated \`c++\` and \`(\` literally (the \`(\` matched the test entry, which contains \`alert(1)\`).
- The markup entry rendered as text: **zero** \`img\` elements in the document, even after picking it.
- **Guard on:** "r" and "re" were aborted as soon as the next term was debounced; only "rea" was applied.
- **Guard off:** responses arrived rea, re, r, and each one was applied, so the box says "rea" while the list shows results for "r". Only the two React items are highlighted because the highlight uses the current box text: the visual tell of the bug. (The first \`sent "rea" / applied "rea"\` pair comes from flipping the toggle: \`guard\` is an effect dependency, so the current term is fetched again.)

## 6. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Special characters | Query escaped before building the regex |
| Markup in data | Rendered as text; no HTML injection API anywhere |
| Unicode case | Regex \`i\` flag on the original string; no lowercased index arithmetic |
| Multiple matches | \`g\` flag; every occurrence highlighted |
| Accessible name | \`mark\` only wraps parts of the text, so the option name computed from its text is still "Create React App" |
| Combobox roles | \`combobox\` input, \`listbox\` / \`option\`, \`aria-activedescendant\`, ids from \`useId()\` |
| Long items | \`overflow-wrap: anywhere\` so long tokens do not overflow at 360 px |

## 7. Common Pitfalls

- **\`dangerouslySetInnerHTML\` for highlighting.** The one-line regex replace is exactly how highlight XSS bugs are born.
- **\`new RegExp(query)\` without escaping.** \`(\` throws, \`.\` matches everything, \`c++\` throws (Node 22.22: \`Invalid regular expression: /c++/: Nothing to repeat\`).
- **Slicing the original text with indexes from a lowercased copy.** Misaligns for characters whose lowercase form has a different length.
- **Only aborting.** If the API ignores the signal, or the response was already received, abort does nothing; keep the id check.
- **Only checking ids.** Correct, but the server still does all the work; abort when you can.
- **Highlighting with the query the results were fetched for, while showing them under a newer query** (or the reverse) without realising: decide which one you mean; this build highlights with the current box text.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The race:</strong> <span style="color:#f0e2c8;">"Debounce reduces requests but does not order them: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r</code> can take longer than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rea</code>, so the last response to land may be the oldest."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Two guards:</strong> <span style="color:#f0e2c8;">"In the effect I create an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code> and abort it in cleanup, and I also apply a response only if its request id is still the latest."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Highlight:</strong> <span style="color:#f0e2c8;">"I escape the query, split each suggestion on a case-insensitive regex with one capture group, and odd indexes are the matches."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Render safely:</strong> <span style="color:#f0e2c8;">"Parts become <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mark</code> and text children, so a suggestion containing HTML is shown as text; no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dangerouslySetInnerHTML</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it:</strong> <span style="color:#f0e2c8;">"A fake API with longer latency for shorter queries reproduces the race; with the guard off the list shows results for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r</code> under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rea</code>, with it on only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rea</code> is applied."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why keep the request id if you abort?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Abort only helps if the API honours the signal and the response has not already arrived. The id check is a cheap, universal backstop that guarantees ordering on the client.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you ignore accents when highlighting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Normalise both strings with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">normalize("NFD")</code> and strip combining marks for matching, but keep a map from normalised indexes back to the original string so the highlighted slice is the original text.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">RegExp.escape</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a newer built-in that does the escaping for you. Node 22.22 does not have it, so the solution keeps a hand-written <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">escapeRegExp</code>; feature-detect it before relying on it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the race deterministically?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mock the API with promises you resolve by hand: start <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">re</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rea</code>, resolve <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rea</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">re</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r</code>, and assert the list still shows the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rea</code> results and the old promises were aborted.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useDeferredValue</code> or transitions fix this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. They change rendering priority, not network ordering. The fetch race has to be handled where the requests are made.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Race condition** | Result depends on which async call finishes first |
| **AbortController** | Cancels async work that received its \`signal\` |
| **Request id** | Counter used to apply only the newest response |
| **Regex escaping** | Making special regex characters literal |
| **XSS** | Running injected script by inserting untrusted text as HTML |
| **mark element** | HTML element for highlighted, relevant text |

---
**Conclusion:** A production typeahead needs two guarantees on top of the basics: the screen only ever shows the answer to the current query, and suggestion text is never parsed as HTML. The first comes from aborting the previous request and checking a request id; the second from splitting on an escaped regex and rendering text nodes inside \`mark\` elements. The verified run on React 19.3.1 shows the race reproduced with the guard off (results for "r" under "rea"), fixed with it on, and a markup entry rendered as plain text with zero \`img\` elements created. For the full ARIA keyboard contract, continue with the [combobox](/interview-question/build-a-combobox-search-select).`,
        files: {
          "/App.js": `import Typeahead from "./src/Typeahead";

export default function App() {
  return (
    <main className="page">
      <h1>Package search</h1>
      <Typeahead />
    </main>
  );
}
`,
          "/src/api.js": `// Simulated server: no network. Latency depends on the query ON PURPOSE:
// 1 letter = 1500 ms, 2 letters = 900 ms, longer = 150 ms. Typing "r", "re", "rea"
// therefore gets its answers back in the order rea, re, r: oldest LAST.
const PACKAGES = [
  "React", "React Router", "Redux", "Remix", "Rust", "Ruby on Rails", "Rollup", "Ramda",
  "Preact", "Create React App", "Express", "Ember", "C++", "C#",
  "<img src=x onerror=alert(1)>",
];

export function searchPackages(query, { signal } = {}) {
  return new Promise((resolve, reject) => {
    const latency = query.length === 1 ? 1500 : query.length === 2 ? 900 : 150;
    const timer = setTimeout(() => {
      const q = query.toLowerCase();
      resolve(PACKAGES.filter((p) => p.toLowerCase().includes(q)).slice(0, 8));
    }, latency);
    if (signal) {
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Request aborted", "AbortError"));
      }, { once: true });
    }
  });
}
`,
          "/src/Highlight.js": `import { splitMatches } from "./matchParts";

// Renders text with the matching parts wrapped in <mark>. Every part is a
// React text child, so a result containing markup is shown, never parsed.
export default function Highlight({ text, query }) {
  return splitMatches(text, query).map((part, i) =>
    part.match ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>
  );
}
`,
          "/src/matchParts.js": `// Escape every character that means something in a regular expression,
// so a query like "c++" or "(" is searched for literally.
export function escapeRegExp(text) {
  return text.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
}

// "Create React App" + "rea" -> [{C} {rea*} {te } {Rea*} {ct App}]
// split() with ONE capture group puts the matches at the odd indexes.
export function splitMatches(text, query) {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  return text
    .split(new RegExp("(" + escapeRegExp(q) + ")", "gi"))
    .map((part, i) => ({ text: part, match: i % 2 === 1 }))
    .filter((part) => part.text !== "");
}
`,
          "/src/Typeahead.js": `import { useEffect, useId, useRef, useState } from "react";
import { searchPackages } from "./api";
import { useDebouncedValue } from "./useDebouncedValue";
import Highlight from "./Highlight";

export default function Typeahead() {
  const [query, setQuery] = useState("");
  const [guard, setGuard] = useState(true);
  const [results, setResults] = useState([]);
  const [shownFor, setShownFor] = useState(""); // the query the visible results belong to
  const [active, setActive] = useState(-1);
  const [picked, setPicked] = useState("");
  const [events, setEvents] = useState([]);
  const latest = useRef(0);
  const listId = useId();

  const term = query.trim();
  const debounced = useDebouncedValue(term, 300);
  const note = (line) => setEvents((prev) => [...prev.slice(-7), line]);

  useEffect(() => {
    if (!debounced) {
      setResults([]);
      setShownFor("");
      return;
    }
    const id = ++latest.current;
    const controller = guard ? new AbortController() : null;
    note("sent " + JSON.stringify(debounced));

    searchPackages(debounced, controller ? { signal: controller.signal } : {})
      .then((list) => {
        // Belt and braces: even if an API ignores abort(), drop old answers.
        if (guard && id !== latest.current) { note("ignored " + JSON.stringify(debounced)); return; }
        setResults(list);
        setShownFor(debounced);
        setActive(-1);
        note("applied " + JSON.stringify(debounced));
      })
      .catch((err) => {
        if (err.name === "AbortError") note("aborted " + JSON.stringify(debounced));
      });

    return () => { if (controller) controller.abort(); };
  }, [debounced, guard]);

  function pick(item) {
    setPicked(item);
    setQuery(item);
    setResults([]);
    setActive(-1);
  }

  function onKeyDown(e) {
    const n = results.length;
    if (e.key === "ArrowDown" && n) { e.preventDefault(); setActive((i) => (i + 1) % n); }
    else if (e.key === "ArrowUp" && n) { e.preventDefault(); setActive((i) => (i <= 0 ? n - 1 : i - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(results[active]); }
    else if (e.key === "Escape") { setResults([]); setActive(-1); }
  }

  const open = term !== "" && results.length > 0;
  const mismatch = shownFor !== "" && shownFor !== term;
  const optionId = (i) => listId + "-" + i;

  return (
    <div className="ta">
      <label className="toggle">
        <input type="checkbox" data-testid="guard" checked={guard} onChange={(e) => setGuard(e.target.checked)} />
        Guard against stale responses (abort + request id)
      </label>

      <label htmlFor="pkg" className="label">Package</label>
      <input
        id="pkg"
        data-testid="ta-input"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        placeholder="Type r, then re, then rea"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
      />

      <p className={mismatch ? "showing warn" : "showing"} data-testid="showing">
        {shownFor ? "Showing results for " + JSON.stringify(shownFor) + (mismatch ? " (does not match the box)" : "") : "No results yet"}
      </p>

      {open && (
        <ul id={listId} role="listbox" aria-label="Packages" className="list" data-testid="ta-list">
          {results.map((item, i) => (
            <li
              key={item}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              className={i === active ? "option active" : "option"}
              onMouseMove={() => { if (i !== active) setActive(i); }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(item)}
            >
              <Highlight text={item} query={term} />
            </li>
          ))}
        </ul>
      )}

      <p className="picked" data-testid="picked">{picked ? "Picked: " + picked : "Nothing picked yet"}</p>
      <h2 className="log-title">Network events</h2>
      <ol className="log" data-testid="events">{events.map((e, i) => <li key={i}>{e}</li>)}</ol>
    </div>
  );
}
`,
          "/src/useDebouncedValue.js": `import { useEffect, useState } from "react";

// Returns \`value\`, but only after it has stopped changing for \`delay\` ms.
export function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // a new keystroke cancels the old timer
  }, [value, delay]);
  return debounced;
}
`,
          "/styles.css": `:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
.page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 1.4rem; margin: 0 0 16px; }
.toggle { display: flex; gap: 8px; align-items: center; font-size: 0.85rem; color: #c9cfdd; margin-bottom: 14px; }
.label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
#pkg { width: 100%; padding: 10px 12px; font-size: 1rem; color: inherit; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
#pkg:focus { outline: 2px solid #7aa2ff; outline-offset: 1px; }
.showing { font-size: 0.85rem; color: #a9b1c6; margin: 8px 0; }
.showing.warn { color: #ffb74d; }
.list { list-style: none; margin: 0; padding: 4px; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
.option { padding: 8px 10px; border-radius: 6px; cursor: pointer; overflow-wrap: anywhere; }
.option.active { background: #2f3b66; }
mark { background: #f9a825; color: #111; border-radius: 2px; padding: 0 1px; }
.picked { font-size: 0.85rem; color: #a9b1c6; margin-top: 12px; }
.log-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; color: #7d859b; margin: 20px 0 6px; }
.log { margin: 0; padding-left: 20px; font: 0.8rem/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; color: #b8c0d6; }
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers who can already build a basic autocomplete and need safe highlighting and race-proof requests.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The Verified output came from compiling the SFCs with @vue/compiler-sfc and mounting them on Vue 3.5.44 in jsdom; regex facts were run on Node 22.22. The API is simulated with deliberately uneven delays.

## 1. A Story First

Ask three friends "capital of Aus...", "of Austr...", "of Australia?" and the last one you asked may answer first, while the first one shouts "Vienna!" last. Writing down whatever you heard last gives the wrong answer. Typeahead requests behave the same way: "r", "re", "rea" can come back as rea, re, r. And if you highlight matches by building HTML strings, any suggestion containing markup becomes a script injection. This build assumes the [basic autocomplete](/interview-question/build-an-autocomplete-typeahead-search) and fixes exactly those two problems.

## 2. The Plan in Vue Terms

| Piece | Vue tool |
| :--- | :--- |
| Text, guard toggle, results, \`shownFor\`, active, picked, events | \`ref\` (\`v-model\` on the input and the checkbox) |
| Debounced term | \`useDebounced(term, 300)\` from the [debounced search bar](/interview-question/build-a-debounced-search-bar) |
| Request and cancellation | \`watch([debounced, guard], cb)\` with \`onCleanup\` |
| Highlighting | \`splitMatches()\` in \`matchParts.js\` + a tiny \`HighlightText.vue\` |
| Mismatch warning | \`computed(() => shownFor.value !== "" && shownFor.value !== term.value)\` |

📌 **Interview term: Race condition** — the result depends on which async call finishes first; here an older response landing after a newer one.

## 3. Build It Step by Step

### Step 1: the watcher with two guards

\`\`\`js
watch([debounced, guard], ([dq, guarded], _old, onCleanup) => {
  if (!dq) { results.value = []; shownFor.value = ""; return; }
  const id = ++latest;
  const controller = guarded ? new AbortController() : null;
  onCleanup(() => { if (controller) controller.abort(); });
  searchPackages(dq, controller ? { signal: controller.signal } : {})
    .then((list) => {
      // Belt and braces: even if an API ignores abort(), drop old answers.
      if (guarded && id !== latest) return;
      results.value = list;
      shownFor.value = dq;
      active.value = -1;
    })
    .catch(() => { /* AbortError is expected */ });
});
\`\`\`

(Excerpt: the real component also logs sent / aborted / ignored / applied events on screen.)

📌 **Interview term: AbortController** — cancels the async work holding its \`signal\`; \`fetch\` rejects with an \`AbortError\`. In Vue, abort in the watcher's \`onCleanup\`, which runs before the next run and on unmount. See also [fetching data in Vue with cancellation](/interview-question/how-do-you-fetch-data-in-a-vue-component-loading-errors-cancellation).

📌 **Interview term: Request id** — a counter; a response is applied only while its id is the latest. It still protects you when an API ignores abort.

### Step 2: split on an escaped regex

\`\`\`js
export function escapeRegExp(text) {
  return text.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
}
export function splitMatches(text, query) {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  return text
    .split(new RegExp("(" + escapeRegExp(q) + ")", "gi"))
    .map((part, i) => ({ text: part, match: i % 2 === 1 }))
    .filter((part) => part.text !== "");
}
\`\`\`

With one capture group, \`split\` keeps the matches at odd indexes, with their original casing. Unescaped, \`new RegExp("(")\` throws \`Invalid regular expression: /(/: Unterminated group\` (Node 22.22). Lowercasing both strings and slicing by \`indexOf\` is a trap: \`"İstanbul".toLowerCase().indexOf("stan")\` is \`2\` but \`"İstanbul".indexOf("stan")\` is \`1\`, so the highlight lands on the wrong letters.

📌 **Interview term: Regex escaping** — making \`. * + ? ( ) [ ] { } | ^ $ \\\` literal before building a \`RegExp\` from user input.

### Step 3: a highlight component with no \`v-html\`

\`\`\`html
<template><template v-for="(part, i) in parts" :key="i"><mark v-if="part.match">{{ part.text }}</mark><span v-else>{{ part.text }}</span></template></template>
\`\`\`

Mustache interpolation always writes text, so a suggestion containing \`<img src=x onerror=alert(1)>\` is displayed, not parsed. The tempting \`v-html="text.replace(re, '<mark>$1</mark>')"\` would create the image and run its handler; see [what v-html is and its risk](/interview-question/what-is-v-html-and-what-is-the-risk-of-using-it). The template is written on one line on purpose: whitespace between \`mark\` and \`span\` would show up as spaces inside the word.

📌 **Interview term: XSS** — running injected script by inserting untrusted text as HTML.

📌 **Interview term: mark element** — HTML element for text highlighted for relevance, such as search matches.

## 4. Verified: What the Driver Printed

Option text is printed with \`mark\` parts in [brackets]:

\`\`\`
rea            : [Rea]ct, [Rea]ct Router, P[rea]ct, C[rea]te [Rea]ct App
c++            : [C++]
(              : Showing results for "(" | options: 1
<img           : [<img] src=x onerror=alert(1)> | <img> elements in the page: 0
ArrowDown+Enter: Picked: <img src=x onerror=alert(1)>
--- guard ON: type r, re, rea; answers come back rea, re, r ---
box            : "rea" | Showing results for "rea"
events         : sent "<img" / applied "<img" / sent "r" / sent "re" / aborted "r" / sent "rea" / aborted "re" / applied "rea"
--- guard OFF: same typing ---
after rea sent : No results yet
box            : "rea" | Showing results for "r" (does not match the box)
options        : [Rea]ct, [Rea]ct Router, Redux, Remix, Rust, Ruby on Rails, Rollup, Ramda
events         : sent "rea" / applied "rea" / sent "r" / sent "re" / sent "rea" / applied "rea" / applied "re" / applied "r"
\`\`\`

With the guard on, "r" and "re" were aborted and only "rea" was applied. With it off, the answers landed rea, re, r and the screen ended on results for "r" under the text "rea": the bug, reproduced. The markup entry produced zero \`img\` elements. The leading \`sent "rea" / applied "rea"\` in the last line is the watcher re-running because \`guard\` changed. Same lines as the React and Angular builds.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Special characters | Escaped before building the regex |
| Markup in data | Interpolation only, no \`v-html\` |
| Unicode case | Regex \`i\` flag on the original string |
| Multiple matches | \`g\` flag |
| Accessible name | \`mark\` wraps parts only; the option text is unchanged |
| Combobox roles | \`combobox\`, \`listbox\`, \`option\`, \`aria-activedescendant\` with \`useId()\` ids |

## 6. Common Pitfalls

- **\`v-html\` for highlighting**: the classic highlight XSS.
- **Unescaped \`new RegExp(query)\`**: \`(\` and \`c++\` throw, \`.\` matches anything.
- **Index arithmetic on a lowercased copy** of the text.
- **Aborting without an id check** (or the reverse): use both.
- **Whitespace inside the highlight template** that puts visible spaces between parts of one word.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The race:</strong> <span style="color:#f0e2c8;">"Debounce does not order responses; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r</code> can be slower than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rea</code>, so the last response may be the oldest."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Two guards:</strong> <span style="color:#f0e2c8;">"My <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> aborts the previous request in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> and also applies a response only if its id is still the latest."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Highlight:</strong> <span style="color:#f0e2c8;">"I escape the query, split each suggestion with a case-insensitive regex that has one capture group, and odd parts are matches."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Render safely:</strong> <span style="color:#f0e2c8;">"A small component renders parts with interpolation inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mark</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">span</code>; there is no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-html</code>, so markup in data stays text."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it:</strong> <span style="color:#f0e2c8;">"With a fake API that is slower for short queries, turning the guard off shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r</code> results under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rea</code>; turning it on fixes it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why both abort and an id?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Abort saves server and network work but only if honoured and in time; the id guarantees client-side ordering in every case.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use a render function instead of a template?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h("mark", part.text)</code> and plain strings in an array. Render functions also produce text nodes, so they are equally safe.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle accents?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Match on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">normalize("NFD")</code> text with combining marks removed, and map the matched range back to the original string before slicing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mock the API with promises resolved by hand in reverse order; mount with Vue Test Utils, assert the final list and that the earlier signals were aborted.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Race condition** | Result depends on which async call finishes first |
| **AbortController** | Cancels async work holding its \`signal\` |
| **Request id** | Counter so only the newest response is applied |
| **Regex escaping** | Making special characters literal |
| **XSS** | Script injection through untrusted HTML |
| **mark element** | Element for highlighted, relevant text |

---
**Conclusion:** In Vue, a race-proof, injection-proof typeahead is a \`watch\` that aborts in \`onCleanup\` and checks a request id, plus a highlight component that renders escaped-regex parts with interpolation and never \`v-html\`. The verified run on Vue 3.5.44 reproduced the race with the guard off, fixed it with the guard on, and rendered a markup entry as text. Next step: the full keyboard contract in the [combobox](/interview-question/build-a-combobox-search-select).`,
        files: {
          "/src/App.vue": `<script setup>
import Typeahead from "./components/Typeahead.vue";
</script>

<template>
  <main class="page">
    <h1>Package search</h1>
    <Typeahead />
  </main>
</template>

<style>
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
.page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 1.4rem; margin: 0 0 16px; }
mark { background: #f9a825; color: #111; border-radius: 2px; padding: 0 1px; }
</style>
`,
          "/src/api.js": `// Simulated server: no network. Latency depends on the query ON PURPOSE:
// 1 letter = 1500 ms, 2 letters = 900 ms, longer = 150 ms. Typing "r", "re", "rea"
// therefore gets its answers back in the order rea, re, r: oldest LAST.
const PACKAGES = [
  "React", "React Router", "Redux", "Remix", "Rust", "Ruby on Rails", "Rollup", "Ramda",
  "Preact", "Create React App", "Express", "Ember", "C++", "C#",
  "<img src=x onerror=alert(1)>",
];

export function searchPackages(query, { signal } = {}) {
  return new Promise((resolve, reject) => {
    const latency = query.length === 1 ? 1500 : query.length === 2 ? 900 : 150;
    const timer = setTimeout(() => {
      const q = query.toLowerCase();
      resolve(PACKAGES.filter((p) => p.toLowerCase().includes(q)).slice(0, 8));
    }, latency);
    if (signal) {
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Request aborted", "AbortError"));
      }, { once: true });
    }
  });
}
`,
          "/src/components/HighlightText.vue": `<script setup>
import { computed } from "vue";
import { splitMatches } from "../matchParts.js";

const props = defineProps({ text: { type: String, required: true }, query: { type: String, default: "" } });
const parts = computed(() => splitMatches(props.text, props.query));
</script>

<!-- Mustache output is text, never HTML: no v-html anywhere. -->
<template><template v-for="(part, i) in parts" :key="i"><mark v-if="part.match">{{ part.text }}</mark><span v-else>{{ part.text }}</span></template></template>
`,
          "/src/components/Typeahead.vue": `<script setup>
import { computed, ref, useId, watch } from "vue";
import { searchPackages } from "../api.js";
import { useDebounced } from "../composables/useDebounced.js";
import HighlightText from "./HighlightText.vue";

const query = ref("");
const guard = ref(true);
const results = ref([]);
const shownFor = ref(""); // the query the visible results belong to
const active = ref(-1);
const picked = ref("");
const events = ref([]);
let latest = 0;
const listId = useId();

const term = computed(() => query.value.trim());
const debounced = useDebounced(term, 300);
const note = (line) => { events.value = [...events.value.slice(-7), line]; };

watch([debounced, guard], ([dq, guarded], _old, onCleanup) => {
  if (!dq) {
    results.value = [];
    shownFor.value = "";
    return;
  }
  const id = ++latest;
  const controller = guarded ? new AbortController() : null;
  onCleanup(() => { if (controller) controller.abort(); });
  note("sent " + JSON.stringify(dq));

  searchPackages(dq, controller ? { signal: controller.signal } : {})
    .then((list) => {
      // Belt and braces: even if an API ignores abort(), drop old answers.
      if (guarded && id !== latest) { note("ignored " + JSON.stringify(dq)); return; }
      results.value = list;
      shownFor.value = dq;
      active.value = -1;
      note("applied " + JSON.stringify(dq));
    })
    .catch((err) => {
      if (err.name === "AbortError") note("aborted " + JSON.stringify(dq));
    });
});

const open = computed(() => term.value !== "" && results.value.length > 0);
const mismatch = computed(() => shownFor.value !== "" && shownFor.value !== term.value);
const optionId = (i) => listId + "-" + i;

function pick(item) {
  picked.value = item;
  query.value = item;
  results.value = [];
  active.value = -1;
}

function onKeydown(e) {
  const n = results.value.length;
  if (e.key === "ArrowDown" && n) { e.preventDefault(); active.value = (active.value + 1) % n; }
  else if (e.key === "ArrowUp" && n) { e.preventDefault(); active.value = active.value <= 0 ? n - 1 : active.value - 1; }
  else if (e.key === "Enter" && active.value >= 0) { e.preventDefault(); pick(results.value[active.value]); }
  else if (e.key === "Escape") { results.value = []; active.value = -1; }
}
</script>

<template>
  <div class="ta">
    <label class="toggle">
      <input v-model="guard" type="checkbox" data-testid="guard" />
      Guard against stale responses (abort + request id)
    </label>

    <label for="pkg" class="label">Package</label>
    <input
      id="pkg"
      v-model="query"
      data-testid="ta-input"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-activedescendant="open && active >= 0 ? optionId(active) : undefined"
      autocomplete="off"
      placeholder="Type r, then re, then rea"
      @keydown="onKeydown"
    />

    <p :class="['showing', { warn: mismatch }]" data-testid="showing">
      {{ shownFor ? "Showing results for " + JSON.stringify(shownFor) + (mismatch ? " (does not match the box)" : "") : "No results yet" }}
    </p>

    <ul v-if="open" :id="listId" role="listbox" aria-label="Packages" class="list" data-testid="ta-list">
      <li
        v-for="(item, i) in results"
        :id="optionId(i)"
        :key="item"
        role="option"
        :aria-selected="i === active"
        :class="['option', { active: i === active }]"
        @mousemove="active = i"
        @mousedown.prevent
        @click="pick(item)"
      ><HighlightText :text="item" :query="term" /></li>
    </ul>

    <p class="picked" data-testid="picked">{{ picked ? "Picked: " + picked : "Nothing picked yet" }}</p>
    <h2 class="log-title">Network events</h2>
    <ol class="log" data-testid="events">
      <li v-for="(e, i) in events" :key="i">{{ e }}</li>
    </ol>
  </div>
</template>

<style scoped>
.toggle { display: flex; gap: 8px; align-items: center; font-size: 0.85rem; color: #c9cfdd; margin-bottom: 14px; }
.label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
#pkg { width: 100%; padding: 10px 12px; font-size: 1rem; color: inherit; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
#pkg:focus { outline: 2px solid #7aa2ff; outline-offset: 1px; }
.showing { font-size: 0.85rem; color: #a9b1c6; margin: 8px 0; }
.showing.warn { color: #ffb74d; }
.list { list-style: none; margin: 0; padding: 4px; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
.option { padding: 8px 10px; border-radius: 6px; cursor: pointer; overflow-wrap: anywhere; }
.option.active { background: #2f3b66; }
.picked { font-size: 0.85rem; color: #a9b1c6; margin-top: 12px; }
.log-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; color: #7d859b; margin: 20px 0 6px; }
.log { margin: 0; padding-left: 20px; font: 0.8rem/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; color: #b8c0d6; }
</style>
`,
          "/src/composables/useDebounced.js": `import { ref, watch, onScopeDispose } from "vue";

// A ref that follows \`source\`, but only after it has stopped changing for \`delay\` ms.
export function useDebounced(source, delay) {
  const debounced = ref(source.value);
  let timer;
  watch(source, (value) => {
    clearTimeout(timer); // a new keystroke cancels the old timer
    timer = setTimeout(() => { debounced.value = value; }, delay);
  });
  onScopeDispose(() => clearTimeout(timer)); // component unmounted: no late update
  return debounced;
}
`,
          "/src/matchParts.js": `// Escape every character that means something in a regular expression,
// so a query like "c++" or "(" is searched for literally.
export function escapeRegExp(text) {
  return text.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
}

// "Create React App" + "rea" -> [{C} {rea*} {te } {Rea*} {ct App}]
// split() with ONE capture group puts the matches at the odd indexes.
export function splitMatches(text, query) {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  return text
    .split(new RegExp("(" + escapeRegExp(q) + ")", "gi"))
    .map((part, i) => ({ text: part, match: i % 2 === 1 }))
    .filter((part) => part.text !== "");
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers who can already build a basic autocomplete and need safe highlighting and race-proof requests.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The Verified output came from booting the solution on Angular 22.2.3 in jsdom, AOT with strict templates and with the playground's runtime JIT compiler; regex facts were run on Node 22.22. The API is simulated with deliberately uneven delays.

## 1. A Story First

Ask three friends in a row about "Aus...", "Austr..." and "Australia" and the last one may answer first, while the first one shouts "Vienna!" at the end. Typeahead requests do the same: "r", "re", "rea" can return as rea, re, r. And highlighting matches by building HTML strings turns any suggestion containing markup into script injection. This build assumes the [basic autocomplete](/interview-question/build-an-autocomplete-typeahead-search) and solves just those two problems.

## 2. The Plan in Angular Terms

| Piece | Tool |
| :--- | :--- |
| Text, guard, results, \`shownFor\`, active, picked, events | \`signal()\` |
| Debounced term | the effect-based \`debounced()\` helper |
| Request and cancellation | \`effect((onCleanup) => ...)\` with the body in \`untracked\` |
| Highlighting | \`splitMatches()\` in \`match-parts.ts\` + \`HighlightComponent\` with \`@Input\`s |
| Status sentence | \`computed()\` |

📌 **Interview term: Race condition** — the result depends on which async call finishes first.

## 3. Build It Step by Step

### Step 1: the request effect

\`\`\`ts
effect((onCleanup) => {
  const dq = this.debouncedTerm();
  const guarded = this.guard();
  untracked(() => {
    if (!dq) { this.results.set([]); this.shownFor.set(""); return; }
    const id = ++this.latest;
    const controller = guarded ? new AbortController() : null;
    onCleanup(() => controller?.abort());
    searchPackages(dq, controller ? { signal: controller.signal } : {})
      .then((list) => {
        // Belt and braces: even if an API ignores abort(), drop old answers.
        if (guarded && id !== this.latest) return;
        this.results.set(list);
        this.shownFor.set(dq);
        this.active.set(-1);
      })
      .catch(() => { /* AbortError is expected */ });
  });
});
\`\`\`

(Excerpt: the real component also logs network events on screen.)

The effect depends only on \`debouncedTerm\` and \`guard\`, the two signals read *outside* \`untracked\`. \`onCleanup\` runs before the next run and when the component is destroyed, which is where the old request is aborted.

📌 **Interview term: AbortController** — cancels the async work holding its \`signal\`; \`fetch\` rejects with an \`AbortError\`. See [aborting fetch](/interview-question/how-do-you-abort-a-fetch-api-request-using-abortcontroller).

📌 **Interview term: Request id** — counter; apply a response only while its id is the latest. Protects you when an API ignores abort.

In RxJS terms, guard on is \`switchMap\` and guard off is \`mergeMap\`: see [switchMap vs mergeMap](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap). The [debounced search bar](/interview-question/build-a-debounced-search-bar) builds that version.

### Step 2: split on an escaped regex

\`\`\`ts
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
}
export function splitMatches(text: string, query: string): Part[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  return text
    .split(new RegExp("(" + escapeRegExp(q) + ")", "gi"))
    .map((part, i) => ({ text: part, match: i % 2 === 1 }))
    .filter((part) => part.text !== "");
}
\`\`\`

One capture group makes \`split\` keep the matches at odd indexes, original casing intact. Without escaping, \`new RegExp("(")\` throws \`Invalid regular expression: /(/: Unterminated group\` (Node 22.22). And do not slice by indexes from a lowercased copy: \`"İstanbul".toLowerCase().indexOf("stan")\` is \`2\` while the original's is \`1\`.

📌 **Interview term: Regex escaping** — making \`. * + ? ( ) [ ] { } | ^ $ \\\` literal before building a \`RegExp\` from user input.

### Step 3: a highlight component with no \`[innerHTML]\`

\`\`\`ts
@Component({
  selector: "app-highlight",
  standalone: true,
  template: \`@for (part of parts; track $index) {@if (part.match) {<mark>{{ part.text }}</mark>} @else {<span>{{ part.text }}</span>}}\`,
})
export class HighlightComponent {
  @Input({ required: true }) text = "";
  @Input() query = "";
  get parts() { return splitMatches(this.text, this.query); }
}
\`\`\`

Interpolation writes text nodes, so a suggestion containing \`<img src=x onerror=alert(1)>\` is shown, not parsed. \`[innerHTML]\` would be sanitised by Angular's \`DomSanitizer\`: binding \`<mark>C++</mark><img src=x onerror=alert(1)>\` on Angular 22.2.3 rendered \`<mark>C++</mark><img src="x">\` and logged \`WARNING: sanitizing HTML stripped some content\`. The handler is gone, but a real \`img\` element (and its network request) still appears. Sanitising is a safety net, not a design: text nodes need no sanitising at all. See [Angular XSS and DomSanitizer](/interview-question/what-are-security-vulnerabilities-in-angular-apps-and-how-does-domsanitizer-prev).

📌 **Interview term: XSS** — running injected script by inserting untrusted text as HTML.

📌 **Interview term: mark element** — element for text highlighted for relevance.

The component uses decorator \`@Input\`s rather than signal \`input()\` because the site playground compiles at runtime (JIT), where signal inputs do not register.

## 4. Verified: What the Driver Printed

Both builds printed the same lines; option text is shown with \`mark\` parts in [brackets]. The driver walks the text nodes, since in Angular the \`mark\` sits inside the \`app-highlight\` element:

\`\`\`
rea            : [Rea]ct, [Rea]ct Router, P[rea]ct, C[rea]te [Rea]ct App
c++            : [C++]
(              : Showing results for "(" | options: 1
<img           : [<img] src=x onerror=alert(1)> | <img> elements in the page: 0
ArrowDown+Enter: Picked: <img src=x onerror=alert(1)>
--- guard ON: type r, re, rea; answers come back rea, re, r ---
box            : "rea" | Showing results for "rea"
events         : sent "<img" / applied "<img" / sent "r" / sent "re" / aborted "r" / sent "rea" / aborted "re" / applied "rea"
--- guard OFF: same typing ---
after rea sent : No results yet
box            : "rea" | Showing results for "r" (does not match the box)
options        : [Rea]ct, [Rea]ct Router, Redux, Remix, Rust, Ruby on Rails, Rollup, Ramda
events         : sent "rea" / applied "rea" / sent "r" / sent "re" / sent "rea" / applied "rea" / applied "re" / applied "r"
\`\`\`

Guard on: older requests aborted, only "rea" applied. Guard off: answers landed rea, re, r and the list ended on results for "r" under "rea". The markup entry created no \`img\` element. Identical to the React and Vue builds.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Special characters | Escaped before the regex is built |
| Markup in data | Interpolation only |
| Unicode case | Regex \`i\` flag on the original text |
| Accessible name | \`mark\` wraps parts only; option text unchanged |
| Combobox roles | \`combobox\`, \`listbox\`, \`option\`, \`[attr.aria-activedescendant]\` |

## 6. Common Pitfalls

- **\`[innerHTML]\` with a replaced string.** Sanitised, but fragile and unnecessary.
- **Unescaped \`new RegExp(query)\`.**
- **Reading extra signals in the effect body outside \`untracked\`**, which makes the request re-run when the log or results change.
- **\`bypassSecurityTrustHtml\` to "fix" a stripped highlight.** That removes the safety net entirely.
- **Index arithmetic on a lowercased copy.**

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The race:</strong> <span style="color:#f0e2c8;">"Debounce does not order responses; shorter queries can be slower, so the last response to land may be the oldest."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Two guards:</strong> <span style="color:#f0e2c8;">"My effect aborts the previous request in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> and applies a response only if its id is the latest; with RxJS that is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Highlight:</strong> <span style="color:#f0e2c8;">"Escape the query, split with a case-insensitive regex that has one capture group, odd parts are matches."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Render safely:</strong> <span style="color:#f0e2c8;">"A highlight component renders parts with interpolation in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mark</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">span</code>; no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[innerHTML]</code>, nothing to sanitise."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it:</strong> <span style="color:#f0e2c8;">"A fake API slower for short queries reproduces the race: guard off shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r</code> results under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rea</code>, guard on fixes it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[innerHTML]</code> be safe here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Angular sanitises it, so the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onerror</code> would be removed, but you still turn data into markup and invite someone to bypass the sanitiser later. Text nodes are safe by construction.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">untracked</code> in the effect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">debouncedTerm</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">guard</code> are dependencies. Signals read while writing results or logging must not retrigger the request.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the race?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fakeAsync</code> with a mocked service returning Subjects; emit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rea</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">re</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick()</code>, and assert the list shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rea</code> results and earlier subscriptions were torn down.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you do this with RxJS only?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">terms$.pipe(debounceTime(300), distinctUntilChanged(), switchMap(q =&gt; search$(q)))</code>, then write results to a signal in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">subscribe</code> or with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal</code>.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Race condition** | Result depends on which async call finishes first |
| **AbortController** | Cancels async work holding its \`signal\` |
| **Request id** | Counter so only the newest response is applied |
| **Regex escaping** | Making special characters literal |
| **XSS** | Script injection through untrusted HTML |
| **mark element** | Element for highlighted, relevant text |

---
**Conclusion:** In Angular, the production-safe typeahead is an effect whose \`onCleanup\` aborts the previous request and whose callback checks a request id, plus a highlight component that renders escaped-regex parts as text inside \`mark\` elements. The verified AOT and JIT runs on Angular 22.2.3 reproduced the race with the guard off, fixed it with the guard on, and showed a markup entry as plain text. Continue with the full keyboard contract in the [combobox](/interview-question/build-a-combobox-search-select).`,
        files: {
          "/src/app/app.component.ts": `import { Component } from "@angular/core";
import { TypeaheadComponent } from "./typeahead.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [TypeaheadComponent],
  template: \`
    <main class="page">
      <h1>Package search</h1>
      <app-typeahead />
    </main>
  \`,
  styles: [\`
    :host { display: block; min-height: 100vh; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color-scheme: dark; }
    .page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
    h1 { font-size: 1.4rem; margin: 0 0 16px; }
  \`],
})
export class AppComponent {}
`,
          "/src/app/api.ts": `// Simulated server: no network. Latency depends on the query ON PURPOSE:
// 1 letter = 1500 ms, 2 letters = 900 ms, longer = 150 ms. Typing "r", "re", "rea"
// therefore gets its answers back in the order rea, re, r: oldest LAST.
const PACKAGES: string[] = [
  "React", "React Router", "Redux", "Remix", "Rust", "Ruby on Rails", "Rollup", "Ramda",
  "Preact", "Create React App", "Express", "Ember", "C++", "C#",
  "<img src=x onerror=alert(1)>",
];

export function searchPackages(query: string, { signal }: { signal?: AbortSignal } = {}): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    const latency = query.length === 1 ? 1500 : query.length === 2 ? 900 : 150;
    const timer = setTimeout(() => {
      const q = query.toLowerCase();
      resolve(PACKAGES.filter((p) => p.toLowerCase().includes(q)).slice(0, 8));
    }, latency);
    if (signal) {
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Request aborted", "AbortError"));
      }, { once: true });
    }
  });
}
`,
          "/src/app/debounced.ts": `import { Signal, effect, signal } from "@angular/core";

// A signal that follows \`source\`, but only after it has stopped changing for \`ms\`.
// Call it in an injection context (a field initializer or constructor).
export function debounced<T>(source: () => T, ms: number): Signal<T> {
  const out = signal(source());
  effect((onCleanup) => {
    const value = source();
    const timer = setTimeout(() => out.set(value), ms);
    onCleanup(() => clearTimeout(timer)); // a new keystroke cancels the old timer
  });
  return out.asReadonly();
}
`,
          "/src/app/highlight.component.ts": `import { Component, Input } from "@angular/core";
import { splitMatches } from "./match-parts";

// Interpolation writes text nodes, so markup inside a result is shown, never parsed.
// No [innerHTML] anywhere.
@Component({
  selector: "app-highlight",
  standalone: true,
  template: \`@for (part of parts; track $index) {@if (part.match) {<mark>{{ part.text }}</mark>} @else {<span>{{ part.text }}</span>}}\`,
  styles: [\`mark { background: #f9a825; color: #111; border-radius: 2px; padding: 0 1px; }\`],
})
export class HighlightComponent {
  @Input({ required: true }) text = "";
  @Input() query = "";

  get parts() {
    return splitMatches(this.text, this.query);
  }
}
`,
          "/src/app/match-parts.ts": `// Escape every character that means something in a regular expression,
// so a query like "c++" or "(" is searched for literally.
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
}

// "Create React App" + "rea" -> [{C} {rea*} {te } {Rea*} {ct App}]
// split() with ONE capture group puts the matches at the odd indexes.
export interface Part { text: string; match: boolean; }

export function splitMatches(text: string, query: string): Part[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  return text
    .split(new RegExp("(" + escapeRegExp(q) + ")", "gi"))
    .map((part, i) => ({ text: part, match: i % 2 === 1 }))
    .filter((part) => part.text !== "");
}
`,
          "/src/app/typeahead.component.ts": `import { Component, computed, effect, signal, untracked } from "@angular/core";
import { searchPackages } from "./api";
import { debounced } from "./debounced";
import { HighlightComponent } from "./highlight.component";

let nextId = 0;

@Component({
  selector: "app-typeahead",
  standalone: true,
  imports: [HighlightComponent],
  template: \`
    <label class="toggle">
      <input #g type="checkbox" data-testid="guard" [checked]="guard()" (change)="guard.set(g.checked)" />
      Guard against stale responses (abort + request id)
    </label>

    <label for="pkg" class="label">Package</label>
    <input
      #box
      id="pkg"
      data-testid="ta-input"
      role="combobox"
      aria-autocomplete="list"
      autocomplete="off"
      placeholder="Type r, then re, then rea"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="listId"
      [attr.aria-activedescendant]="open() && active() >= 0 ? optionId(active()) : null"
      [value]="query()"
      (input)="query.set(box.value)"
      (keydown)="onKeydown($event)"
    />

    <p class="showing" [class.warn]="mismatch()" data-testid="showing">{{ showingText() }}</p>

    @if (open()) {
      <ul [id]="listId" role="listbox" aria-label="Packages" class="list" data-testid="ta-list">
        @for (item of results(); track item; let i = $index) {
          <li
            [id]="optionId(i)"
            role="option"
            class="option"
            [class.active]="i === active()"
            [attr.aria-selected]="i === active()"
            (mousemove)="active.set(i)"
            (mousedown)="$event.preventDefault()"
            (click)="pick(item)"
          ><app-highlight [text]="item" [query]="term()" /></li>
        }
      </ul>
    }

    <p class="picked" data-testid="picked">{{ picked() ? "Picked: " + picked() : "Nothing picked yet" }}</p>
    <h2 class="log-title">Network events</h2>
    <ol class="log" data-testid="events">
      @for (e of events(); track $index) {
        <li>{{ e }}</li>
      }
    </ol>
  \`,
  styles: [\`
    :host { display: block; }
    .toggle { display: flex; gap: 8px; align-items: center; font-size: 0.85rem; color: #c9cfdd; margin-bottom: 14px; }
    .label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
    #pkg { width: 100%; box-sizing: border-box; padding: 10px 12px; font-size: 1rem; color: inherit; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
    #pkg:focus { outline: 2px solid #7aa2ff; outline-offset: 1px; }
    .showing { font-size: 0.85rem; color: #a9b1c6; margin: 8px 0; }
    .showing.warn { color: #ffb74d; }
    .list { list-style: none; margin: 0; padding: 4px; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
    .option { padding: 8px 10px; border-radius: 6px; cursor: pointer; overflow-wrap: anywhere; }
    .option.active { background: #2f3b66; }
    .picked { font-size: 0.85rem; color: #a9b1c6; margin-top: 12px; }
    .log-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; color: #7d859b; margin: 20px 0 6px; }
    .log { margin: 0; padding-left: 20px; font: 0.8rem/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; color: #b8c0d6; }
  \`],
})
export class TypeaheadComponent {
  readonly listId = "pkg-list-" + nextId++;

  readonly query = signal("");
  readonly guard = signal(true);
  readonly results = signal<string[]>([]);
  readonly shownFor = signal(""); // the query the visible results belong to
  readonly active = signal(-1);
  readonly picked = signal("");
  readonly events = signal<string[]>([]);
  private latest = 0;

  readonly term = computed(() => this.query().trim());
  readonly debouncedTerm = debounced(this.term, 300);
  readonly open = computed(() => this.term() !== "" && this.results().length > 0);
  readonly mismatch = computed(() => this.shownFor() !== "" && this.shownFor() !== this.term());
  readonly showingText = computed(() =>
    this.shownFor()
      ? "Showing results for " + JSON.stringify(this.shownFor()) + (this.mismatch() ? " (does not match the box)" : "")
      : "No results yet",
  );

  constructor() {
    // Re-runs when the debounced term or the guard changes. onCleanup runs
    // before the next run and on destroy: that is where the old request is aborted.
    effect((onCleanup) => {
      const dq = this.debouncedTerm();
      const guarded = this.guard();
      untracked(() => {
        if (!dq) {
          this.results.set([]);
          this.shownFor.set("");
          return;
        }
        const id = ++this.latest;
        const controller = guarded ? new AbortController() : null;
        onCleanup(() => controller?.abort());
        this.note("sent " + JSON.stringify(dq));

        searchPackages(dq, controller ? { signal: controller.signal } : {})
          .then((list) => {
            // Belt and braces: even if an API ignores abort(), drop old answers.
            if (guarded && id !== this.latest) { this.note("ignored " + JSON.stringify(dq)); return; }
            this.results.set(list);
            this.shownFor.set(dq);
            this.active.set(-1);
            this.note("applied " + JSON.stringify(dq));
          })
          .catch((err: Error) => {
            if (err.name === "AbortError") this.note("aborted " + JSON.stringify(dq));
          });
      });
    });
  }

  optionId(i: number) {
    return this.listId + "-" + i;
  }

  private note(line: string) {
    this.events.update((prev) => [...prev.slice(-7), line]);
  }

  pick(item: string) {
    this.picked.set(item);
    this.query.set(item);
    this.results.set([]);
    this.active.set(-1);
  }

  onKeydown(e: KeyboardEvent) {
    const n = this.results().length;
    if (e.key === "ArrowDown" && n) { e.preventDefault(); this.active.update((i) => (i + 1) % n); }
    else if (e.key === "ArrowUp" && n) { e.preventDefault(); this.active.update((i) => (i <= 0 ? n - 1 : i - 1)); }
    else if (e.key === "Enter" && this.active() >= 0) { e.preventDefault(); this.pick(this.results()[this.active()]); }
    else if (e.key === "Escape") { this.results.set([]); this.active.set(-1); }
  }
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Combobox (search + select)",
    seoDescription:
      "Build an accessible WAI-ARIA combobox: editable input, filtered listbox, aria-activedescendant, disabled options, Alt+Down, Escape and blur rules.",
    description: `**Question presented to candidate:**
"Build a reusable combobox for a 'Favourite language' field: the user can type to filter the options or open the full list, move with the keyboard, and select one value. It must follow the WAI-ARIA combobox pattern closely enough that a screen-reader user can use it, and the parent form must be able to read and set the value."

**Requirements:**
- Controlled component: the parent owns \`value\` (an option id or null) and receives changes; the input shows the selected option's label, and a value set from outside updates the label.
- Typing filters options (case-insensitive substring) and highlights the first enabled match automatically; Enter commits it; leaving the field (Tab, click elsewhere) also commits the highlighted match, and with no match the previous label is restored.
- Down / Up open the list (on the selected option, or the first / last) and move with wrap-around, skipping disabled options; Alt+Down opens without highlighting; Escape closes and restores the label, and a second Escape clears the value.
- A toggle button (▾) and a clear button (×) that never take focus away from the input; mouse hover highlights, click commits, disabled options cannot be chosen.
- DOM focus always stays in the input; the highlighted option is exposed with \`aria-activedescendant\`; a polite live region announces the number of options.

**What a strong answer should cover:**
- The difference between the text in the input, the filter, the highlighted (active) option and the committed value, and why they are separate pieces of state.
- The ARIA wiring: \`role="combobox"\`, \`aria-autocomplete="list"\`, \`aria-expanded\`, \`aria-controls\`, \`aria-activedescendant\`, \`role="listbox"\` / \`role="option"\`, \`aria-selected\`, \`aria-disabled\`, unique stable ids.
- A keyboard map for the closed and open states, and the blur rule for "list autocomplete with automatic selection".
- \`mousedown\` \`preventDefault\` on options and buttons so focus never leaves the input.
- Scrolling the active option into view, and how the component exposes its value (props + callback, \`v-model\`, \`[(value)]\` / \`ControlValueAccessor\`).

**Clarifying questions expected:**
- "Must the value be one of the options, or is free text allowed?"
- "Should the first match be highlighted automatically, and should leaving the field commit it?"
- "Are options local or loaded from a server? How many?"

**Code / implementation expected:** Yes. A reusable, controlled combobox component with full keyboard support and correct ARIA attributes.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend developers preparing for a senior machine coding round. Assumes React components, state and props; the WAI-ARIA combobox pattern is explained from zero.
**Difficulty:** Hard

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. The Verified output was produced by running the solution on React 19.3.1 in jsdom with a driver that printed the ARIA state after every step. Behaviour rules follow the WAI-ARIA Authoring Practices (APG) combobox pattern; where the APG marks a key as optional, this doc says so.

## 1. Why This Even Matters — A Story First

A \`<select>\` is a vending machine: you can only press the buttons it has. A plain text input is a blank notepad: you can write anything, including things that do not exist. A **combobox** is a shop assistant holding a catalogue: you start saying a name, they flip to the matching pages, you point at one, and that is what goes on the order form. You can browse, you can type, but what ends up on the form is always a real item.

That is why forms use comboboxes for countries, languages, assignees and tags. It is also why the question is rated hard: a combobox has four different pieces of state that look alike, a keyboard contract with a dozen rules, and focus that must never leave the input. Interviewers use it to see whether you can be precise.

This is the most complete of the search widgets. Its siblings are the [autocomplete](/interview-question/build-an-autocomplete-typeahead-search) (server suggestions and caching) and the [multi-select dropdown](/interview-question/build-a-custom-multi-select-dropdown) (many values at once).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must the value be one of the options? | A strict combobox commits option ids; a free-text one is an autocomplete. |
| Highlight the first match automatically? | APG calls this "list autocomplete with automatic selection"; it also means blur commits the highlighted match. |
| Local or async options? | Async needs loading states and race handling; local can filter synchronously. |
| How many options? | Hundreds need virtualization and \`aria-setsize\` / \`aria-posinset\`. |
| Any disabled options? | Arrow keys must skip them and clicks must be ignored. |
| What should Escape do when closed? | APG marks clearing the text as optional; agree on it. |

## 3. Requirements and Plan

\`App\` owns the value (\`"rs"\`); \`Combobox\` is controlled and reusable; \`options.js\` holds the data plus two pure helpers, \`filterOptions\` and \`step\`.

The four look-alike pieces of state:

| State | Example | Owner |
| :--- | :--- | :--- |
| **Committed value** | \`"kt"\` | parent (prop \`value\` + \`onChange\`) |
| **Input text** | \`"o"\` while typing, \`"Kotlin"\` after commit | \`Combobox\` state \`text\` |
| **Filter** | \`"o"\`, or \`""\` when opened with the arrow / button to show everything | \`Combobox\` state \`filter\` |
| **Active option** | index of the highlighted option in the visible list | \`Combobox\` state \`active\` |

Plus \`open\`, a \`prevValue\` used to notice when the parent changes \`value\`, and derived values: \`selected\` (the option for \`value\`), \`visible\` (options after the filter), \`activeOption\`.

📌 **Interview term: Combobox** — an input with an associated popup (here a listbox) that helps the user set its value. In ARIA terms, \`role="combobox"\` on the input.

📌 **Interview term: Controlled component** — a component whose value comes from props and which reports changes through a callback instead of owning the value. See [controlled vs uncontrolled](/interview-question/what-is-the-difference-between-controlled-and-uncontrolled-components).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="State machine: closed and open states with the keys that move between them">
  <defs>
    <marker id="q5r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="100" width="190" height="80" rx="12"/>
  <text class="d-text" x="135" y="134" text-anchor="middle">Closed</text>
  <text class="d-sub" x="135" y="156" text-anchor="middle">input shows the label</text>
  <rect class="d-box-accent" x="450" y="100" width="190" height="80" rx="12"/>
  <text class="d-text d-accent" x="545" y="134" text-anchor="middle">Open</text>
  <text class="d-sub" x="545" y="156" text-anchor="middle">one option active</text>
  <path class="d-edge-accent" d="M 230 118 L 442 118" marker-end="url(#q5r-arrow)"/>
  <text class="d-sub" x="336" y="100" text-anchor="middle">type, Down, Up, Alt+Down, toggle</text>
  <path class="d-edge" d="M 450 164 L 238 164" marker-end="url(#q5r-arrow)"/>
  <text class="d-sub" x="344" y="192" text-anchor="middle">Enter, click, Escape, blur, Alt+Up</text>
  <path class="d-edge-dashed" d="M 545 180 C 545 260, 640 260, 640 186" marker-end="url(#q5r-arrow)"/>
  <text class="d-sub" x="560" y="278" text-anchor="middle">Up / Down move active</text>
  <path class="d-edge-dashed" d="M 135 180 C 135 260, 40 260, 40 186" marker-end="url(#q5r-arrow)"/>
  <text class="d-sub" x="140" y="278" text-anchor="middle">Escape clears value</text>
</svg>

Opening keys and typing go right, committing and dismissing keys go left. While open, Up and Down only move the active option. Escape in the closed state clears the value (an optional APG behaviour this build implements).

## 4. Build It Step by Step

### Step 1: pure helpers

\`\`\`js
// Next enabled index after \`from\`, moving by \`dir\` (+1 or -1), wrapping around.
// step(list, -1, 1) is the first enabled option, step(list, 0, -1) the last.
export function step(list, from, dir) {
  const n = list.length;
  for (let k = 1; k <= n; k++) {
    const i = (((from + dir * k) % n) + n) % n;
    if (!list[i].disabled) return i;
  }
  return -1; // nothing enabled
}
\`\`\`

The double modulo keeps the index positive when moving backwards. Skipping disabled options here means every key handler gets it for free.

### Step 2: syncing the label when the parent changes the value

\`\`\`js
const selected = options.find((o) => o.value === value) || null;
const [text, setText] = useState(selected ? selected.label : "");
const [prevValue, setPrevValue] = useState(value);
if (value !== prevValue) {
  setPrevValue(value);
  setText(selected ? selected.label : "");
}
\`\`\`

Calling \`setState\` during render for "props changed, adjust state" is the pattern the React docs recommend over an effect: React re-renders immediately, before painting, so there is no flash of the old label.

📌 **Interview term: Adjusting state on prop change** — storing the previous prop and updating dependent state during render when it differs, instead of in \`useEffect\`.

### Step 3: the keyboard map

\`\`\`js
function onKeyDown(e) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!open) openList(e.altKey ? 0 : 1);
    else if (!e.altKey) setActive((i) => step(visible, i, 1));
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (e.altKey) revert();
    else if (!open) openList(-1);
    else setActive((i) => step(visible, i < 0 ? 0 : i, -1));
  } else if (e.key === "Enter") {
    if (activeOption) { e.preventDefault(); commit(activeOption); }
  } else if (e.key === "Escape") {
    e.preventDefault();
    if (open) revert();
    else { setText(""); onChange(null); } // second Escape clears
  }
}
\`\`\`

\`openList(dir)\` clears the filter (show everything) and puts the highlight on the selected option if there is one, otherwise the first (\`dir = 1\`) or last (\`dir = -1\`) enabled option, or nothing (\`dir = 0\`, used by Alt+Down and the toggle button). The APG list-autocomplete example describes Alt+Down as opening the listbox without moving focus or changing selection.

📌 **Interview term: aria-activedescendant** — on the focused input, the id of the option that is visually focused. DOM focus never moves into the list; screen readers follow this attribute instead.

### Step 4: typing, and the automatic selection rule

\`\`\`js
function onInputChange(e) {
  const next = e.target.value;
  setText(next);
  setFilter(next);
  setOpen(true);
  setActive(step(filterOptions(options, next), -1, 1)); // first enabled match
}

// Tab or a click elsewhere. With automatic selection, the highlighted
// suggestion becomes the value when focus leaves (APG).
function onBlur() {
  if (activeOption) { commit(activeOption); return; }
  if (!open && text === (selected ? selected.label : "")) return;
  if (text.trim() === "") { onChange(null); close(); }
  else revert();
}
\`\`\`

📌 **Interview term: List autocomplete with automatic selection** — the APG variant where typing filters the popup and the first suggestion is highlighted automatically; that suggestion becomes the value if the user leaves the field. The alternative, manual selection, highlights nothing until the user presses an arrow.

When nothing matches ("zz"), blur restores the committed label instead of leaving junk text in the box.

### Step 5: ids, options and buttons

\`\`\`jsx
const base = useId();
const optionId = (o) => base + "-opt-" + o.value; // stable while the list filters

<li
  id={optionId(o)}
  role="option"
  aria-selected={i === active}
  aria-disabled={o.disabled ? true : undefined}
  onMouseMove={() => { if (!o.disabled && i !== active) setActive(i); }}
  onMouseDown={(e) => e.preventDefault()}
  onClick={() => { if (!o.disabled) commit(o); }}
>
\`\`\`

Option ids are built from the option **value**, not its position, so the active option keeps its id while the list re-filters. \`aria-selected\` marks the highlighted option, as in the APG listbox-popup examples; the committed value is visible in the input itself and as a ✓ that is \`aria-hidden\`. The × and ▾ buttons are \`tabIndex={-1}\` and prevent \`mousedown\`, so clicking them never blurs the input.

📌 **Interview term: useId** — a React hook that returns an id unique to the component instance and stable between server and client renders.

### Step 6: scrolling and announcing

An effect calls \`scrollIntoView({ block: "nearest" })\` on the active option (guarded, because jsdom does not implement it), so keyboard users never highlight an option they cannot see. A \`role="status"\` element says "12 options available." or "No results." while open.

## 5. Verified: What the Driver Printed

Mounted under \`StrictMode\`; after each step the driver printed the input value, \`aria-expanded\`, and the text and id suffix of the element \`aria-activedescendant\` points at. Blur was simulated by focusing a button outside the widget.

\`\`\`
start          : input="Rust" expanded=false active=none | Form value: "rs"
ArrowDown      : input="Rust" expanded=true active=Rust #rs | 12 options | 12 options available.
ArrowDown      : input="Rust" expanded=true active=Go #go
Escape         : input="Rust" expanded=false active=none | Form value: "rs"
type o         : input="o" expanded=true active=Python #py | Python, Go, Kotlin, COBOL (retired) (disabled) | 4 options available.
ArrowDown x2   : input="o" expanded=true active=Kotlin #kt
ArrowDown      : input="o" expanded=true active=Python #py (skipped the disabled one, wrapped)
ArrowUp        : input="o" expanded=true active=Kotlin #kt
Enter          : input="Kotlin" expanded=false active=none | Form value: "kt"
type zz        : input="zz" expanded=false active=none | No matches | No results.
blur           : input="Kotlin" expanded=false active=none | Form value: "kt"
type sw        : input="sw" expanded=true active=Swift #swift
blur (Tab)     : input="Swift" expanded=false active=none | Form value: "swift" (highlighted match committed)
Escape (closed): input="" expanded=false active=none | Form value: null
toggle button  : input="" expanded=true active=none | 12 options
click disabled : input="" expanded=true active=none | Form value: null
hover Haskell  : input="" expanded=true active=Haskell #hs
click Haskell  : input="Haskell" expanded=false active=none | Form value: "hs"
parent sets ts : input="TypeScript" expanded=false active=none | Form value: "ts"
clear button   : input="" expanded=false active=none | Form value: null
ArrowUp (none) : input="" expanded=true active=Haskell #hs (opens on the last option)
Alt+ArrowDown  : input="" expanded=true active=none (open, nothing highlighted)
\`\`\`

Every rule in the requirements shows up: opening on the selected option, wrap-around that skips "COBOL (retired)", Enter committing an id while the input shows a label, blur restoring the label for "zz" but committing the highlighted "Swift", two-step Escape, hovering and clicking a disabled option doing nothing, and the parent setting "ts" from outside. jsdom has no layout, so \`scrollIntoView\` and real screen-reader output were not observable here; the attributes a screen reader reads were.

## 6. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Roles | \`combobox\` input, \`listbox\` popup, \`option\` items |
| Autocomplete type | \`aria-autocomplete="list"\` |
| Expanded | \`aria-expanded\` true only while options are shown ("No matches" counts as closed) |
| Highlight | \`aria-activedescendant\` + \`aria-selected\` on the active option |
| Disabled | \`aria-disabled="true"\`, skipped by \`step\`, click ignored |
| Labelling | \`<label for>\` on the input; the listbox has \`aria-label\` |
| Buttons | \`aria-label\`s "Show Favourite language options" and "Clear selection"; \`tabIndex={-1}\`; \`mousedown\` prevented |
| Announcements | \`role="status"\` with the option count |
| Ids | \`useId()\` + option value: unique per instance, stable while filtering |

## 7. Common Pitfalls

- **One piece of state for text and value.** Typing "o" must not change the form value; only commit does.
- **Moving real focus into the list.** Typing stops working and screen readers lose the input. Keep focus in the input, use \`aria-activedescendant\`.
- **Index-based option ids.** When the list filters, id \`opt-2\` suddenly means a different option and screen readers re-announce the wrong thing.
- **Forgetting \`mousedown\` \`preventDefault\` on options and buttons.** The blur handler runs first and commits or reverts before the click.
- **Arrow keys landing on disabled options**, or Enter committing them.
- **Syncing the label in \`useEffect\`.** It works but renders once with the stale label first; adjust state during render instead.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Separate state:</strong> <span style="color:#f0e2c8;">"I separate four things: the committed value owned by the parent, the input text, the filter, and the active option index; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">open</code> decides whether the listbox shows."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. ARIA:</strong> <span style="color:#f0e2c8;">"The input is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=combobox</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-autocomplete=list</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-expanded</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-controls</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code>; options have ids built from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useId</code> plus their value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Keyboard:</strong> <span style="color:#f0e2c8;">"Down and Up open on the selected option and then move with wrap-around, skipping disabled ones; Alt+Down opens without a highlight; Enter commits; Escape closes, and a second Escape clears."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Automatic selection:</strong> <span style="color:#f0e2c8;">"Typing filters and highlights the first enabled match, and blur commits that match, or restores the old label when nothing matches."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Focus:</strong> <span style="color:#f0e2c8;">"Options and the toggle and clear buttons prevent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mousedown</code>, so DOM focus never leaves the input; the active option is scrolled into view and the count is announced in a status region."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you load options from a server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Debounce the filter text, fetch with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code> aborted on the next keystroke, show a loading option or status, and keep option ids derived from the server id so the active option survives refreshes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle 10,000 options?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Virtualize the listbox so only visible rows render, keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code> pointing at a rendered row by scrolling the virtual list to the active index, and add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-setsize</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-posinset</code> to each rendered option.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use a native <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">datalist</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">datalist</code> gives free-text suggestions with browser-specific styling and behaviour, cannot hold disabled options consistently or separate label from value, and offers little control over filtering.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Testing Library with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">userEvent</code>: type, press <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ArrowDown}{Enter}</code>, assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code> was called with the id and the input shows the label; assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code> matches the highlighted option at each step; run an axe check for ARIA errors.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it work in a form library?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep it controlled: React Hook Form's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Controller</code> passes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBlur</code> can be forwarded for touched state.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Combobox** | Input with a popup that helps set its value |
| **Controlled component** | Value from props, changes reported by callback |
| **Active option** | The highlighted option, not yet committed |
| **aria-activedescendant** | Points from the focused input to the active option |
| **List autocomplete with automatic selection** | First match highlighted while typing; blur commits it |
| **Adjusting state on prop change** | Updating state during render when a prop differs from its stored previous value |
| **useId** | Instance-unique id, stable across server and client |

---
**Conclusion:** A correct combobox is mostly precision: four separate pieces of state, a keyboard map for the closed and open states, a blur rule that matches the autocomplete variant you chose, and focus that never leaves the input. The verified run on React 19.3.1 walks through every rule with the ARIA attributes printed at each step: opening on the selected option, skipping a disabled option while wrapping, committing ids while showing labels, blur committing or restoring, two-step Escape, and a value set by the parent. That precision is what turns a hard rating into a straightforward answer.`,
        files: {
          "/App.js": `import { useState } from "react";
import Combobox from "./src/Combobox";
import { LANGUAGES } from "./src/options";

export default function App() {
  const [lang, setLang] = useState("rs");
  return (
    <main className="page">
      <h1>Profile</h1>
      <Combobox label="Favourite language" options={LANGUAGES} value={lang} onChange={setLang} />
      <p className="value" data-testid="value">Form value: {lang === null ? "null" : JSON.stringify(lang)}</p>
      <button type="button" className="secondary" data-testid="reset" onClick={() => setLang("ts")}>
        Set to TypeScript from outside
      </button>
    </main>
  );
}
`,
          "/src/Combobox.js": `import { useEffect, useId, useRef, useState } from "react";
import { filterOptions, step } from "./options";

// WAI-ARIA combobox: editable input + listbox popup, "list autocomplete with
// automatic selection". DOM focus never leaves the input; the highlighted
// option is announced through aria-activedescendant.
export default function Combobox({ label, options, value, onChange }) {
  const selected = options.find((o) => o.value === value) || null;
  const [text, setText] = useState(selected ? selected.label : "");
  const [filter, setFilter] = useState(""); // "" = show every option
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef(null);
  const base = useId();

  // The parent changed \`value\`: show its label (adjusting state during render).
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(selected ? selected.label : "");
  }

  const visible = filterOptions(options, filter);
  const listId = base + "-listbox";
  const optionId = (o) => base + "-opt-" + o.value; // stable while the list filters
  const activeOption = open && active >= 0 ? visible[active] : null;

  // Keep the highlighted option visible inside a scrolling list.
  useEffect(() => {
    if (!activeOption) return;
    const el = document.getElementById(optionId(activeOption));
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  });

  function openList(dir) {
    setFilter("");
    setOpen(true);
    const i = selected ? options.indexOf(selected) : -1;
    setActive(i >= 0 ? i : dir === 1 ? step(options, -1, 1) : dir === -1 ? step(options, 0, -1) : -1);
  }

  function close() {
    setOpen(false);
    setActive(-1);
    setFilter("");
  }

  function commit(option) {
    onChange(option.value);
    setText(option.label);
    close();
  }

  // Leaving without choosing puts the committed label back.
  function revert() {
    setText(selected ? selected.label : "");
    close();
  }

  function onInputChange(e) {
    const next = e.target.value;
    setText(next);
    setFilter(next);
    setOpen(true);
    setActive(step(filterOptions(options, next), -1, 1)); // first enabled match
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openList(e.altKey ? 0 : 1);
      else if (!e.altKey) setActive((i) => step(visible, i, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (e.altKey) revert();
      else if (!open) openList(-1);
      else setActive((i) => step(visible, i < 0 ? 0 : i, -1));
    } else if (e.key === "Enter") {
      if (activeOption) { e.preventDefault(); commit(activeOption); }
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (open) revert();
      else { setText(""); onChange(null); } // second Escape clears
    }
  }

  // Tab or a click elsewhere. With automatic selection, the highlighted
  // suggestion becomes the value when focus leaves (APG).
  function onBlur() {
    if (activeOption) { commit(activeOption); return; }
    if (!open && text === (selected ? selected.label : "")) return;
    if (text.trim() === "") { onChange(null); close(); }
    else revert();
  }

  const showList = open && visible.length > 0;
  const status = !open ? "" : visible.length ? visible.length + " options available." : "No results.";

  return (
    <div className="combo">
      <label htmlFor={base + "-input"} className="label">{label}</label>
      <div className="combo-field">
        <input
          id={base + "-input"}
          ref={inputRef}
          data-testid="combo-input"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={activeOption ? optionId(activeOption) : undefined}
          autoComplete="off"
          value={text}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        />
        {value !== null && (
          <button type="button" className="icon" tabIndex={-1} aria-label="Clear selection" data-testid="combo-clear"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onChange(null); setText(""); close(); inputRef.current.focus(); }}>×</button>
        )}
        <button type="button" className="icon" tabIndex={-1} aria-label={"Show " + label + " options"} data-testid="combo-toggle"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { if (open) revert(); else openList(0); inputRef.current.focus(); }}>▾</button>
      </div>

      <ul id={listId} role="listbox" aria-label={label} className="combo-list" hidden={!showList} data-testid="combo-list">
        {showList && visible.map((o, i) => (
          <li
            key={o.value}
            id={optionId(o)}
            role="option"
            aria-selected={i === active}
            aria-disabled={o.disabled ? true : undefined}
            className={"combo-option" + (i === active ? " active" : "") + (o.disabled ? " disabled" : "")}
            onMouseMove={() => { if (!o.disabled && i !== active) setActive(i); }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { if (!o.disabled) commit(o); }}
          >
            <span className="check" aria-hidden="true">{o.value === value ? "✓" : ""}</span>
            {o.label}
          </li>
        ))}
      </ul>
      {open && visible.length === 0 && <div className="combo-empty" data-testid="combo-empty">No matches</div>}
      <div role="status" className="sr-only" data-testid="combo-status">{status}</div>
    </div>
  );
}
`,
          "/src/options.js": `export const LANGUAGES = [
  { value: "ts", label: "TypeScript" },
  { value: "js", label: "JavaScript" },
  { value: "py", label: "Python" },
  { value: "rs", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "kt", label: "Kotlin" },
  { value: "swift", label: "Swift" },
  { value: "rb", label: "Ruby" },
  { value: "ex", label: "Elixir" },
  { value: "cobol", label: "COBOL (retired)", disabled: true },
  { value: "hs", label: "Haskell" },
];

// Next enabled index after \`from\`, moving by \`dir\` (+1 or -1), wrapping around.
// step(list, -1, 1) is the first enabled option, step(list, 0, -1) the last.
export function step(list, from, dir) {
  const n = list.length;
  for (let k = 1; k <= n; k++) {
    const i = (((from + dir * k) % n) + n) % n;
    if (!list[i].disabled) return i;
  }
  return -1; // nothing enabled
}

export function filterOptions(options, text) {
  const q = text.trim().toLowerCase();
  return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
}
`,
          "/styles.css": `:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
.page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 1.4rem; margin: 0 0 16px; }
.combo { position: relative; }
.label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
.combo-field { display: flex; align-items: center; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
.combo-field:focus-within { outline: 2px solid #7aa2ff; outline-offset: 1px; }
.combo-field input { flex: 1; min-width: 0; padding: 10px 12px; font-size: 1rem; color: inherit; background: transparent; border: 0; outline: none; }
.icon { width: 34px; height: 34px; border: 0; background: transparent; color: #a9b1c6; font-size: 1rem; cursor: pointer; border-radius: 6px; }
.icon:hover { background: #2a2f3f; color: #fff; }
.combo-list { position: absolute; left: 0; right: 0; top: 72px; z-index: 10; list-style: none; margin: 0; padding: 4px; max-height: 260px; overflow-y: auto; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); }
.combo-list[hidden] { display: none; }
.combo-option { display: flex; gap: 6px; padding: 8px 10px; border-radius: 6px; cursor: pointer; }
.combo-option.active { background: #2f3b66; color: #fff; }
.combo-option.disabled { color: #5d6478; cursor: not-allowed; }
.check { width: 1em; color: #81c784; }
.combo-empty { position: absolute; left: 0; right: 0; top: 72px; padding: 10px 12px; color: #7d859b; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.value { margin-top: 18px; font-size: 0.9rem; color: #c9cfdd; }
.secondary { padding: 8px 12px; border: 1px solid #343a4f; border-radius: 8px; background: #1a1d27; color: #e6e8ee; cursor: pointer; }
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers preparing for a senior machine coding round. Assumes props, emits and \`v-model\` on native inputs; the WAI-ARIA combobox pattern is explained from zero.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The Verified output came from compiling the SFCs with @vue/compiler-sfc and mounting them on Vue 3.5.44 in jsdom, with a driver that printed the ARIA state after every step. Behaviour follows the WAI-ARIA Authoring Practices (APG) combobox pattern; optional APG behaviours are labelled as such.

## 1. A Story First

A \`<select>\` is a vending machine with fixed buttons; a text input is a blank notepad. A **combobox** is a shop assistant with a catalogue: you start saying a name, they flip to matching pages, you point, and only a real item goes on the order form. Forms use it for languages, countries and assignees, and interviewers use it to test precision: four look-alike pieces of state, a dozen keyboard rules, and focus that must never leave the input. Siblings: the [autocomplete](/interview-question/build-an-autocomplete-typeahead-search) and the [multi-select dropdown](/interview-question/build-a-custom-multi-select-dropdown).

## 2. The Plan in Vue Terms

\`App.vue\` holds \`const lang = ref("rs")\` and renders \`<Combobox v-model="lang" label="Favourite language" :options="LANGUAGES" />\`.

| State | Vue tool | Example |
| :--- | :--- | :--- |
| Committed value | prop \`modelValue\` + \`emit("update:modelValue")\` | \`"kt"\` |
| Input text | \`ref\` | \`"o"\`, then \`"Kotlin"\` |
| Filter | \`ref\` (\`""\` = show all) | \`"o"\` |
| Active option | \`ref\` index into \`visible\` | \`2\` |
| Open | \`ref\` | \`true\` |
| Selected option, visible list, active option, status | \`computed\` | |

📌 **Interview term: v-model on a component** — shorthand for passing \`modelValue\` down and listening for \`update:modelValue\`. See [v-model on components](/interview-question/how-does-v-model-work-on-components). Vue 3.4+ also offers \`defineModel()\`, covered in [defineModel](/interview-question/what-is-definemodel-in-vue-3-4-and-how-does-it-replace-manual-prop-emit); this solution uses the explicit prop and emit so every step is visible.

📌 **Interview term: Combobox** — \`role="combobox"\` on an input with an associated popup listbox that helps set its value.

## 3. Build It Step by Step

### Step 1: pure helpers shared with the other builds

\`\`\`js
export function step(list, from, dir) {
  const n = list.length;
  for (let k = 1; k <= n; k++) {
    const i = (((from + dir * k) % n) + n) % n;
    if (!list[i].disabled) return i;
  }
  return -1;
}
\`\`\`

\`step(list, -1, 1)\` is the first enabled option, \`step(list, 0, -1)\` the last, and every arrow key skips disabled options through it.

### Step 2: following the parent's value

\`\`\`js
const selected = computed(() => props.options.find((o) => o.value === props.modelValue) || null);
const text = ref(selected.value ? selected.value.label : "");
watch(() => props.modelValue, () => {
  text.value = selected.value ? selected.value.label : "";
});
\`\`\`

When the parent sets \`lang.value = "ts"\`, the watcher rewrites the input text to "TypeScript". Watching a getter (\`() => props.modelValue\`) is required: \`props\` is reactive, but passing \`props.modelValue\` directly would pass a plain string.

### Step 3: keyboard map

\`\`\`js
function onKeydown(e) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!open.value) openList(e.altKey ? 0 : 1);
    else if (!e.altKey) active.value = step(visible.value, active.value, 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (e.altKey) revert();
    else if (!open.value) openList(-1);
    else active.value = step(visible.value, active.value < 0 ? 0 : active.value, -1);
  } else if (e.key === "Enter") {
    if (activeOption.value) { e.preventDefault(); commit(activeOption.value); }
  } else if (e.key === "Escape") {
    e.preventDefault();
    if (open.value) revert();
    else { text.value = ""; emit("update:modelValue", null); } // second Escape clears
  }
}
\`\`\`

\`openList(dir)\` shows all options and highlights the selected one, else the first / last enabled, else none (Alt+Down and the toggle). The APG list-autocomplete example describes Alt+Down as opening without moving focus or changing selection; clearing on Escape when closed is marked optional in the APG.

📌 **Interview term: aria-activedescendant** — on the focused input, the id of the visually focused option; focus never moves into the list.

### Step 4: typing and blur

\`\`\`js
function onInput(e) {
  const next = e.target.value;
  text.value = next;
  filter.value = next;
  open.value = true;
  active.value = step(filterOptions(props.options, next), -1, 1); // first enabled match
}
function onBlur() {
  if (activeOption.value) { commit(activeOption.value); return; }
  if (!open.value && text.value === (selected.value ? selected.value.label : "")) return;
  if (text.value.trim() === "") { emit("update:modelValue", null); close(); }
  else revert();
}
\`\`\`

The input uses \`:value\` + \`@input\` rather than \`v-model\`, because one keystroke has to update three refs at once.

📌 **Interview term: List autocomplete with automatic selection** — the APG variant where the first match is highlighted while typing and becomes the value when focus leaves.

### Step 5: options and ids

\`\`\`html
<li
  v-for="(o, i) in visible" :id="optionId(o)" :key="o.value"
  role="option" :aria-selected="i === active" :aria-disabled="o.disabled ? true : undefined"
  @mousemove="hover(o, i)" @mousedown.prevent @click="!o.disabled && commit(o)"
>
\`\`\`

\`useId()\` (exported by Vue 3.5.44) gives an instance prefix, and the option value completes the id, so ids stay stable while filtering; see [useId in Vue 3.5](/interview-question/useid-vs-getcurrentinstance-how-do-you-generate-ssr-safe-ids-in-vue-3-5). \`@mousedown.prevent\` on options and on the × and ▾ buttons keeps focus in the input. A watcher on \`activeOption\` waits for \`nextTick()\` and calls \`scrollIntoView({ block: "nearest" })\`.

## 4. Verified: What the Driver Printed

\`\`\`
start          : input="Rust" expanded=false active=none | Form value: "rs"
ArrowDown      : input="Rust" expanded=true active=Rust #rs | 12 options | 12 options available.
ArrowDown      : input="Rust" expanded=true active=Go #go
Escape         : input="Rust" expanded=false active=none | Form value: "rs"
type o         : input="o" expanded=true active=Python #py | Python, Go, Kotlin, COBOL (retired) (disabled) | 4 options available.
ArrowDown x2   : input="o" expanded=true active=Kotlin #kt
ArrowDown      : input="o" expanded=true active=Python #py (skipped the disabled one, wrapped)
ArrowUp        : input="o" expanded=true active=Kotlin #kt
Enter          : input="Kotlin" expanded=false active=none | Form value: "kt"
type zz        : input="zz" expanded=false active=none | No matches | No results.
blur           : input="Kotlin" expanded=false active=none | Form value: "kt"
type sw        : input="sw" expanded=true active=Swift #swift
blur (Tab)     : input="Swift" expanded=false active=none | Form value: "swift" (highlighted match committed)
Escape (closed): input="" expanded=false active=none | Form value: null
toggle button  : input="" expanded=true active=none | 12 options
click disabled : input="" expanded=true active=none | Form value: null
hover Haskell  : input="" expanded=true active=Haskell #hs
click Haskell  : input="Haskell" expanded=false active=none | Form value: "hs"
parent sets ts : input="TypeScript" expanded=false active=none | Form value: "ts"
clear button   : input="" expanded=false active=none | Form value: null
ArrowUp (none) : input="" expanded=true active=Haskell #hs (opens on the last option)
Alt+ArrowDown  : input="" expanded=true active=none (open, nothing highlighted)
\`\`\`

The output matches the React and Angular builds line for line: opening on the selected option, wrap-around that skips the disabled COBOL entry, ids committed while labels display, blur restoring for "zz" and committing "Swift", two-step Escape, disabled clicks ignored, and \`v-model\` updates from the parent. jsdom has no layout, so \`scrollIntoView\` was not observable.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Roles | \`combobox\`, \`listbox\`, \`option\` |
| Attributes | \`aria-autocomplete="list"\`, \`:aria-expanded\`, \`:aria-controls\`, \`:aria-activedescendant\` (undefined removes it) |
| Disabled | \`:aria-disabled\`, skipped by \`step\`, click guarded |
| Buttons | \`tabindex="-1"\`, \`@mousedown.prevent\`, \`aria-label\`s |
| Announcements | \`role="status"\` option count |
| Ids | \`useId()\` + option value |

## 6. Common Pitfalls

- **\`v-model\` on the inner input** bound straight to \`modelValue\`: typing "o" would set the form value to "o". The text and the value are different state.
- **\`watch(props.modelValue, ...)\`** instead of a getter: watches a constant.
- **Mutating the \`modelValue\` prop** instead of emitting \`update:modelValue\`; Vue warns and the parent does not update.
- **Index-based option ids**, which change meaning as the list filters.
- **Missing \`@mousedown.prevent\`**, so blur commits or reverts before the click lands.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Separate state:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">modelValue</code> is the committed id from the parent; inside I keep the input text, the filter, the active index and the open flag, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> for the selected option and the visible list."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. ARIA:</strong> <span style="color:#f0e2c8;">"The input is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=combobox</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-autocomplete=list</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-expanded</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-controls</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code>; option ids come from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useId</code> plus the option value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Keyboard:</strong> <span style="color:#f0e2c8;">"Down and Up open on the selection then move with wrap, skipping disabled; Alt+Down opens without a highlight; Enter commits; Escape closes, then clears."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Automatic selection:</strong> <span style="color:#f0e2c8;">"Typing filters and highlights the first enabled match, and blur commits it, or restores the label when nothing matches."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Focus:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@mousedown.prevent</code> on options and buttons keeps focus in the input; a watcher scrolls the active option into view after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defineModel</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes in a real codebase: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const model = defineModel()</code> replaces the prop and emit. I wrote them out here so the data flow is explicit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you let callers customise options?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A scoped slot: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;slot name="option" :option="o" :active="i === active" /&gt;</code> with the label as fallback content, so callers can add icons without breaking the ARIA structure.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue Test Utils: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue("o")</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trigger("keydown", { key: "ArrowDown" })</code>, assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code>, then Enter and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emitted("update:modelValue")</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for async options?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Debounce the filter, abort the previous fetch in the watcher cleanup, show a loading status, and derive option ids from server ids.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Combobox** | Input with a popup that helps set its value |
| **v-model on a component** | \`modelValue\` prop + \`update:modelValue\` event |
| **Active option** | Highlighted, not yet committed |
| **aria-activedescendant** | Points from the input to the active option |
| **List autocomplete with automatic selection** | First match highlighted while typing; blur commits it |
| **useId** | Instance-unique id generator in Vue 3.5 |

---
**Conclusion:** The Vue combobox is a \`v-model\` component that never confuses its input text with its committed value, drives the listbox through \`aria-activedescendant\`, and applies the APG keyboard and blur rules through small, pure helpers. The verified run on Vue 3.5.44 prints the ARIA state for every rule, line for line identical to the React and Angular builds.`,
        files: {
          "/src/App.vue": `<script setup>
import { ref } from "vue";
import Combobox from "./components/Combobox.vue";
import { LANGUAGES } from "./options.js";

const lang = ref("rs");
</script>

<template>
  <main class="page">
    <h1>Profile</h1>
    <Combobox v-model="lang" label="Favourite language" :options="LANGUAGES" />
    <p class="value" data-testid="value">Form value: {{ lang === null ? "null" : JSON.stringify(lang) }}</p>
    <button type="button" class="secondary" data-testid="reset" @click="lang = 'ts'">Set to TypeScript from outside</button>
  </main>
</template>

<style>
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
.page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 1.4rem; margin: 0 0 16px; }
.value { margin-top: 18px; font-size: 0.9rem; color: #c9cfdd; }
.secondary { padding: 8px 12px; border: 1px solid #343a4f; border-radius: 8px; background: #1a1d27; color: #e6e8ee; cursor: pointer; }
</style>
`,
          "/src/components/Combobox.vue": `<script setup>
import { computed, nextTick, ref, useId, watch } from "vue";
import { filterOptions, step } from "../options.js";

// WAI-ARIA combobox: editable input + listbox popup, "list autocomplete with
// automatic selection". DOM focus never leaves the input; the highlighted
// option is announced through aria-activedescendant.
const props = defineProps({
  label: { type: String, required: true },
  options: { type: Array, required: true },
  modelValue: { type: String, default: null },
});
const emit = defineEmits(["update:modelValue"]);

const selected = computed(() => props.options.find((o) => o.value === props.modelValue) || null);
const text = ref(selected.value ? selected.value.label : "");
const filter = ref(""); // "" = show every option
const open = ref(false);
const active = ref(-1);
const inputEl = ref(null);
const base = useId();

// The parent changed v-model: show its label.
watch(() => props.modelValue, () => {
  text.value = selected.value ? selected.value.label : "";
});

const visible = computed(() => filterOptions(props.options, filter.value));
const listId = base + "-listbox";
const optionId = (o) => base + "-opt-" + o.value; // stable while the list filters
const activeOption = computed(() => (open.value && active.value >= 0 ? visible.value[active.value] : null));
const showList = computed(() => open.value && visible.value.length > 0);
const status = computed(() =>
  !open.value ? "" : visible.value.length ? visible.value.length + " options available." : "No results."
);

// Keep the highlighted option visible inside a scrolling list.
watch(activeOption, async (o) => {
  if (!o) return;
  await nextTick();
  const el = document.getElementById(optionId(o));
  if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
});

function openList(dir) {
  filter.value = "";
  open.value = true;
  const i = selected.value ? props.options.indexOf(selected.value) : -1;
  active.value = i >= 0 ? i : dir === 1 ? step(props.options, -1, 1) : dir === -1 ? step(props.options, 0, -1) : -1;
}

function close() {
  open.value = false;
  active.value = -1;
  filter.value = "";
}

function commit(option) {
  emit("update:modelValue", option.value);
  text.value = option.label;
  close();
}

// Leaving without choosing puts the committed label back.
function revert() {
  text.value = selected.value ? selected.value.label : "";
  close();
}

function onInput(e) {
  const next = e.target.value;
  text.value = next;
  filter.value = next;
  open.value = true;
  active.value = step(filterOptions(props.options, next), -1, 1); // first enabled match
}

function onKeydown(e) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!open.value) openList(e.altKey ? 0 : 1);
    else if (!e.altKey) active.value = step(visible.value, active.value, 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (e.altKey) revert();
    else if (!open.value) openList(-1);
    else active.value = step(visible.value, active.value < 0 ? 0 : active.value, -1);
  } else if (e.key === "Enter") {
    if (activeOption.value) { e.preventDefault(); commit(activeOption.value); }
  } else if (e.key === "Escape") {
    e.preventDefault();
    if (open.value) revert();
    else { text.value = ""; emit("update:modelValue", null); } // second Escape clears
  }
}

// Tab or a click elsewhere. With automatic selection, the highlighted
// suggestion becomes the value when focus leaves (APG).
function onBlur() {
  if (activeOption.value) { commit(activeOption.value); return; }
  if (!open.value && text.value === (selected.value ? selected.value.label : "")) return;
  if (text.value.trim() === "") { emit("update:modelValue", null); close(); }
  else revert();
}

function clearSelection() {
  emit("update:modelValue", null);
  text.value = "";
  close();
  inputEl.value.focus();
}

function toggle() {
  if (open.value) revert();
  else openList(0);
  inputEl.value.focus();
}

function hover(o, i) {
  if (!o.disabled) active.value = i;
}
</script>

<template>
  <div class="combo">
    <label :for="base + '-input'" class="label">{{ label }}</label>
    <div class="combo-field">
      <input
        :id="base + '-input'"
        ref="inputEl"
        :value="text"
        data-testid="combo-input"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="showList"
        :aria-controls="listId"
        :aria-activedescendant="activeOption ? optionId(activeOption) : undefined"
        autocomplete="off"
        @input="onInput"
        @keydown="onKeydown"
        @blur="onBlur"
      />
      <button v-if="modelValue !== null" type="button" class="icon" tabindex="-1" aria-label="Clear selection"
        data-testid="combo-clear" @mousedown.prevent @click="clearSelection">×</button>
      <button type="button" class="icon" tabindex="-1" :aria-label="'Show ' + label + ' options'"
        data-testid="combo-toggle" @mousedown.prevent @click="toggle">▾</button>
    </div>

    <ul :id="listId" role="listbox" :aria-label="label" class="combo-list" :hidden="!showList" data-testid="combo-list">
      <template v-if="showList">
        <li
          v-for="(o, i) in visible"
          :id="optionId(o)"
          :key="o.value"
          role="option"
          :aria-selected="i === active"
          :aria-disabled="o.disabled ? true : undefined"
          :class="['combo-option', { active: i === active, disabled: o.disabled }]"
          @mousemove="hover(o, i)"
          @mousedown.prevent
          @click="!o.disabled && commit(o)"
        >
          <span class="check" aria-hidden="true">{{ o.value === modelValue ? "✓" : "" }}</span>{{ o.label }}
        </li>
      </template>
    </ul>
    <div v-if="open && visible.length === 0" class="combo-empty" data-testid="combo-empty">No matches</div>
    <div role="status" class="sr-only" data-testid="combo-status">{{ status }}</div>
  </div>
</template>

<style scoped>
.combo { position: relative; }
.label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
.combo-field { display: flex; align-items: center; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
.combo-field:focus-within { outline: 2px solid #7aa2ff; outline-offset: 1px; }
.combo-field input { flex: 1; min-width: 0; padding: 10px 12px; font-size: 1rem; color: inherit; background: transparent; border: 0; outline: none; }
.icon { width: 34px; height: 34px; border: 0; background: transparent; color: #a9b1c6; font-size: 1rem; cursor: pointer; border-radius: 6px; }
.icon:hover { background: #2a2f3f; color: #fff; }
.combo-list { position: absolute; left: 0; right: 0; top: 72px; z-index: 10; list-style: none; margin: 0; padding: 4px; max-height: 260px; overflow-y: auto; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); }
.combo-list[hidden] { display: none; }
.combo-option { display: flex; gap: 6px; padding: 8px 10px; border-radius: 6px; cursor: pointer; }
.combo-option.active { background: #2f3b66; color: #fff; }
.combo-option.disabled { color: #5d6478; cursor: not-allowed; }
.check { width: 1em; color: #81c784; }
.combo-empty { position: absolute; left: 0; right: 0; top: 72px; padding: 10px 12px; color: #7d859b; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
`,
          "/src/options.js": `export const LANGUAGES = [
  { value: "ts", label: "TypeScript" },
  { value: "js", label: "JavaScript" },
  { value: "py", label: "Python" },
  { value: "rs", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "kt", label: "Kotlin" },
  { value: "swift", label: "Swift" },
  { value: "rb", label: "Ruby" },
  { value: "ex", label: "Elixir" },
  { value: "cobol", label: "COBOL (retired)", disabled: true },
  { value: "hs", label: "Haskell" },
];

// Next enabled index after \`from\`, moving by \`dir\` (+1 or -1), wrapping around.
// step(list, -1, 1) is the first enabled option, step(list, 0, -1) the last.
export function step(list, from, dir) {
  const n = list.length;
  for (let k = 1; k <= n; k++) {
    const i = (((from + dir * k) % n) + n) % n;
    if (!list[i].disabled) return i;
  }
  return -1; // nothing enabled
}

export function filterOptions(options, text) {
  const q = text.trim().toLowerCase();
  return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers preparing for a senior machine coding round. Assumes components, \`@Input\` and \`@Output\`; the WAI-ARIA combobox pattern is explained from zero.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The Verified output came from booting the solution on Angular 22.2.3 in jsdom, AOT with strict templates and with the playground's runtime JIT compiler, with a driver that printed the ARIA state after every step. Behaviour follows the WAI-ARIA Authoring Practices (APG) combobox pattern; optional APG behaviours are labelled.

## 1. A Story First

A \`<select>\` is a vending machine with fixed buttons and a text input is a blank notepad. A **combobox** is a shop assistant with a catalogue: say part of a name, they flip to the matches, you point, and only a real item reaches the order form. Interviewers rate it hard because it needs precision: four look-alike pieces of state, a dozen keyboard rules, and focus that never leaves the input. Siblings: the [autocomplete](/interview-question/build-an-autocomplete-typeahead-search) and the [multi-select dropdown](/interview-question/build-a-custom-multi-select-dropdown).

## 2. The Plan in Angular Terms

\`AppComponent\` holds \`lang = signal<string | null>("rs")\` and renders \`<app-combobox label="Favourite language" [options]="languages" [(value)]="lang" />\`.

| State | Angular tool | Example |
| :--- | :--- | :--- |
| Committed value | \`@Input() set value(...)\` + \`@Output() valueChange\` | \`"kt"\` |
| Input text, filter, active index, open | \`signal()\` | \`"o"\`, \`"o"\`, \`2\`, \`true\` |
| Options | \`@Input() set options(...)\` copied into a signal | |
| Selected, visible, active option, status | \`computed()\` | |

📌 **Interview term: Two-way binding \`[( )]\`** — "banana in a box": \`[(value)]="lang"\` is \`[value]="lang()"\` plus \`(valueChange)="lang.set($event)"\`. The parent side can be a writable signal, as here: in both builds on Angular 22.2.3, \`[(value)]="lang"\` read the signal and wrote \`valueChange\` events back into it. Signal-based \`model()\` inputs do the same in one line but do not register under the playground's JIT, so this solution uses \`@Input\` + \`@Output\`; see [model() two-way binding](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs).

📌 **Interview term: Combobox** — \`role="combobox"\` on an input with a popup listbox that helps set its value.

## 3. Build It Step by Step

### Step 1: inputs that feed signals

\`\`\`ts
@Input({ required: true }) set options(list: Option[]) {
  this.optionsSig.set(list);
  // Inputs arrive in template order: if [(value)] came first, its label was
  // looked up in an empty list. Re-sync unless the user is editing.
  if (!this.open()) this.text.set(this.selected()?.label ?? "");
}
@Input() set value(v: string | null) {
  this.valueSig.set(v);
  this.text.set(this.selected()?.label ?? ""); // the parent changed it: show its label
}
@Output() valueChange = new EventEmitter<string | null>();
\`\`\`

Input setters copy decorator inputs into signals, so the rest of the component is pure signal code. The re-sync in the \`options\` setter fixes a real bug found while verifying: with \`[(value)]\` written before \`[options]\` in the parent template, the first version showed an empty input in both builds, because the \`value\` setter ran first and looked the label up in an empty option list.

### Step 2: the keyboard map

\`\`\`ts
onKeydown(e: KeyboardEvent) {
  const list = this.visible();
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!this.open()) this.openList(e.altKey ? 0 : 1);
    else if (!e.altKey) this.active.update((i) => step(list, i, 1));
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (e.altKey) this.revert();
    else if (!this.open()) this.openList(-1);
    else this.active.update((i) => step(list, i < 0 ? 0 : i, -1));
  } else if (e.key === "Enter") {
    const o = this.activeOption();
    if (o) { e.preventDefault(); this.commit(o); }
  } else if (e.key === "Escape") {
    e.preventDefault();
    if (this.open()) this.revert();
    else { this.text.set(""); this.emit(null); } // second Escape clears
  }
}
\`\`\`

\`step()\` returns the next enabled index with wrap-around, so disabled options are skipped everywhere. \`openList(dir)\` highlights the selected option, else the first / last enabled, else nothing (Alt+Down, toggle button). The APG list-autocomplete example describes Alt+Down as opening without changing selection; clearing on a closed Escape is optional in the APG.

📌 **Interview term: aria-activedescendant** — on the focused input, the id of the visually focused option; focus never moves into the list.

### Step 3: typing and blur

\`\`\`ts
onInput(next: string) {
  this.text.set(next);
  this.filter.set(next);
  this.open.set(true);
  this.active.set(step(filterOptions(this.optionsSig(), next), -1, 1)); // first enabled match
}
onBlur() {
  const o = this.activeOption();
  if (o) { this.commit(o); return; }
  if (!this.open() && this.text() === (this.selected()?.label ?? "")) return;
  if (this.text().trim() === "") { this.emit(null); this.close(); }
  else this.revert();
}
\`\`\`

📌 **Interview term: List autocomplete with automatic selection** — the APG variant where the first match is highlighted while typing and becomes the value when focus leaves.

### Step 4: template bindings

\`\`\`html
<input #box role="combobox" aria-autocomplete="list"
  [attr.aria-expanded]="showList()" [attr.aria-controls]="listId"
  [attr.aria-activedescendant]="activeOption() ? optionId(activeOption()!) : null"
  [value]="text()" (input)="onInput(box.value)" (keydown)="onKeydown($event)" (blur)="onBlur()" />
...
<li [id]="optionId(o)" role="option" [attr.aria-selected]="i === active()"
  [attr.aria-disabled]="o.disabled ? true : null"
  (mousemove)="hover(o, i)" (mousedown)="$event.preventDefault()" (click)="!o.disabled && commit(o)">
\`\`\`

Option ids are the instance prefix plus the option value, stable while filtering. The \`!\` in \`activeOption()!\` is needed because strict templates do not narrow a signal call between the condition and the branch. An \`effect\` scrolls the active option into view.

## 4. Verified: What the Driver Printed

Both builds printed:

\`\`\`
start          : input="Rust" expanded=false active=none | Form value: "rs"
ArrowDown      : input="Rust" expanded=true active=Rust #rs | 12 options | 12 options available.
ArrowDown      : input="Rust" expanded=true active=Go #go
Escape         : input="Rust" expanded=false active=none | Form value: "rs"
type o         : input="o" expanded=true active=Python #py | Python, Go, Kotlin, COBOL (retired) (disabled) | 4 options available.
ArrowDown x2   : input="o" expanded=true active=Kotlin #kt
ArrowDown      : input="o" expanded=true active=Python #py (skipped the disabled one, wrapped)
ArrowUp        : input="o" expanded=true active=Kotlin #kt
Enter          : input="Kotlin" expanded=false active=none | Form value: "kt"
type zz        : input="zz" expanded=false active=none | No matches | No results.
blur           : input="Kotlin" expanded=false active=none | Form value: "kt"
type sw        : input="sw" expanded=true active=Swift #swift
blur (Tab)     : input="Swift" expanded=false active=none | Form value: "swift" (highlighted match committed)
Escape (closed): input="" expanded=false active=none | Form value: null
toggle button  : input="" expanded=true active=none | 12 options
click disabled : input="" expanded=true active=none | Form value: null
hover Haskell  : input="" expanded=true active=Haskell #hs
click Haskell  : input="Haskell" expanded=false active=none | Form value: "hs"
parent sets ts : input="TypeScript" expanded=false active=none | Form value: "ts"
clear button   : input="" expanded=false active=none | Form value: null
ArrowUp (none) : input="" expanded=true active=Haskell #hs (opens on the last option)
Alt+ArrowDown  : input="" expanded=true active=none (open, nothing highlighted)
\`\`\`

\`[(value)]\` with a signal round-tripped in both directions ("Form value" updated on commit, and the parent's \`lang.set("ts")\` updated the input). The output is identical to the React and Vue builds; \`scrollIntoView\` is not observable in jsdom.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Roles | \`combobox\`, \`listbox\`, \`option\` |
| Attributes | \`[attr.aria-*]\`; \`null\` removes an attribute |
| Disabled | \`aria-disabled\`, skipped by \`step\`, click guarded |
| Buttons | \`tabindex="-1"\`, \`mousedown\` prevented, \`aria-label\`s |
| Announcements | \`role="status"\` option count |
| Ids | \`combo-N\` prefix + option value |

## 6. Common Pitfalls

- **Binding \`[value]\` to the committed label and writing it back on \`(input)\`**: text and value become one, and typing changes the form value.
- **Signal \`input()\` / \`model()\` in a JIT playground**: they do not register there; use decorators or test both builds.
- **\`[attr.aria-activedescendant]\` set to \`""\`** instead of \`null\`, leaving an attribute that points at nothing.
- **Missing \`(mousedown)="$event.preventDefault()"\`** on options and buttons.
- **Setters that read other inputs.** Inputs are set in the order they appear in the template, so a setter must not assume another input has arrived (see Step 1).

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Separate state:</strong> <span style="color:#f0e2c8;">"The committed id comes in through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(value)]</code>; inside, signals hold the input text, filter, active index and open flag, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> derives the selected option and visible list."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. ARIA:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=combobox</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-autocomplete=list</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[attr.aria-expanded]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-controls</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code>; options have ids from an instance prefix plus their value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Keyboard:</strong> <span style="color:#f0e2c8;">"Down and Up open on the selection then wrap, skipping disabled; Alt+Down opens with nothing highlighted; Enter commits; Escape closes, then clears."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Automatic selection:</strong> <span style="color:#f0e2c8;">"Typing filters and highlights the first enabled match; blur commits it, or restores the label when nothing matches."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Focus:</strong> <span style="color:#f0e2c8;">"Options and buttons prevent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mousedown</code>, so focus never leaves the input; an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> scrolls the active option into view."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you plug it into Reactive Forms?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ControlValueAccessor</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">writeValue</code> sets the value signal and label, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">registerOnChange</code> stores the callback called in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">commit</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">registerOnTouched</code> is called on blur, and the component provides <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG_VALUE_ACCESSOR</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forwardRef</code>; see [ControlValueAccessor](/interview-question/how-do-you-build-a-custom-form-control-by-implementing-the-controlvalueaccessor-).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not Angular CDK or Angular Aria?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In production, use a tested library. In an interview, building it shows you know the contract those libraries implement.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TestBed with a host component bound with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(value)]</code>; dispatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keydown</code> events, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code>, assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code>, the emitted value and the host signal.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for async options?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Debounce the text, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> to cancel the previous request, show a loading status, and derive option ids from server ids.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Combobox** | Input with a popup that helps set its value |
| **Two-way binding** | \`[(value)]\` = \`[value]\` + \`(valueChange)\` |
| **Active option** | Highlighted, not yet committed |
| **aria-activedescendant** | Points from the input to the active option |
| **List autocomplete with automatic selection** | First match highlighted while typing; blur commits it |
| **ControlValueAccessor** | Interface that lets a component act as a form control |

---
**Conclusion:** The Angular combobox keeps the committed id, the input text, the filter and the active option apart in signals, exposes the value through \`[(value)]\`, and drives the listbox with \`aria-activedescendant\` and the APG keyboard and blur rules. The verified AOT and JIT runs on Angular 22.2.3 print the ARIA state at every step and match the React and Vue builds exactly.`,
        files: {
          "/src/app/app.component.ts": `import { Component, signal } from "@angular/core";
import { ComboboxComponent } from "./combobox.component";
import { LANGUAGES } from "./options";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [ComboboxComponent],
  template: \`
    <main class="page">
      <h1>Profile</h1>
      <app-combobox label="Favourite language" [options]="languages" [(value)]="lang" />
      <p class="value" data-testid="value">Form value: {{ lang() === null ? "null" : quoted(lang()) }}</p>
      <button type="button" class="secondary" data-testid="reset" (click)="lang.set('ts')">Set to TypeScript from outside</button>
    </main>
  \`,
  styles: [\`
    :host { display: block; min-height: 100vh; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color-scheme: dark; }
    .page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
    h1 { font-size: 1.4rem; margin: 0 0 16px; }
    .value { margin-top: 18px; font-size: 0.9rem; color: #c9cfdd; }
    .secondary { padding: 8px 12px; border: 1px solid #343a4f; border-radius: 8px; background: #1a1d27; color: #e6e8ee; cursor: pointer; }
  \`],
})
export class AppComponent {
  readonly languages = LANGUAGES;
  readonly lang = signal<string | null>("rs");

  quoted(v: string | null) {
    return JSON.stringify(v);
  }
}
`,
          "/src/app/combobox.component.ts": `import { Component, EventEmitter, Input, Output, computed, effect, signal } from "@angular/core";
import { Option, filterOptions, step } from "./options";

let nextId = 0;

// WAI-ARIA combobox: editable input + listbox popup, "list autocomplete with
// automatic selection". DOM focus never leaves the input; the highlighted
// option is announced through aria-activedescendant.
@Component({
  selector: "app-combobox",
  standalone: true,
  template: \`
    <label [for]="base + '-input'" class="label">{{ label }}</label>
    <div class="combo-field">
      <input
        #box
        [id]="base + '-input'"
        data-testid="combo-input"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        autocomplete="off"
        [attr.aria-expanded]="showList()"
        [attr.aria-controls]="listId"
        [attr.aria-activedescendant]="activeOption() ? optionId(activeOption()!) : null"
        [value]="text()"
        (input)="onInput(box.value)"
        (keydown)="onKeydown($event)"
        (blur)="onBlur()"
      />
      @if (valueSig() !== null) {
        <button type="button" class="icon" tabindex="-1" aria-label="Clear selection" data-testid="combo-clear"
          (mousedown)="$event.preventDefault()" (click)="clearSelection(); box.focus()">×</button>
      }
      <button type="button" class="icon" tabindex="-1" [attr.aria-label]="'Show ' + label + ' options'" data-testid="combo-toggle"
        (mousedown)="$event.preventDefault()" (click)="toggle(); box.focus()">▾</button>
    </div>

    <ul [id]="listId" role="listbox" [attr.aria-label]="label" class="combo-list" [hidden]="!showList()" data-testid="combo-list">
      @if (showList()) {
        @for (o of visible(); track o.value; let i = $index) {
          <li
            [id]="optionId(o)"
            role="option"
            class="combo-option"
            [class.active]="i === active()"
            [class.disabled]="o.disabled"
            [attr.aria-selected]="i === active()"
            [attr.aria-disabled]="o.disabled ? true : null"
            (mousemove)="hover(o, i)"
            (mousedown)="$event.preventDefault()"
            (click)="!o.disabled && commit(o)"
          ><span class="check" aria-hidden="true">{{ o.value === valueSig() ? "✓" : "" }}</span>{{ o.label }}</li>
        }
      }
    </ul>
    @if (open() && visible().length === 0) {
      <div class="combo-empty" data-testid="combo-empty">No matches</div>
    }
    <div role="status" class="sr-only" data-testid="combo-status">{{ status() }}</div>
  \`,
  styles: [\`
    :host { display: block; position: relative; }
    .label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
    .combo-field { display: flex; align-items: center; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
    .combo-field:focus-within { outline: 2px solid #7aa2ff; outline-offset: 1px; }
    .combo-field input { flex: 1; min-width: 0; padding: 10px 12px; font-size: 1rem; color: inherit; background: transparent; border: 0; outline: none; }
    .icon { width: 34px; height: 34px; border: 0; background: transparent; color: #a9b1c6; font-size: 1rem; cursor: pointer; border-radius: 6px; }
    .icon:hover { background: #2a2f3f; color: #fff; }
    .combo-list { position: absolute; left: 0; right: 0; top: 72px; z-index: 10; list-style: none; margin: 0; padding: 4px; max-height: 260px; overflow-y: auto; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); }
    .combo-list[hidden] { display: none; }
    .combo-option { display: flex; gap: 6px; padding: 8px 10px; border-radius: 6px; cursor: pointer; }
    .combo-option.active { background: #2f3b66; color: #fff; }
    .combo-option.disabled { color: #5d6478; cursor: not-allowed; }
    .check { width: 1em; color: #81c784; }
    .combo-empty { position: absolute; left: 0; right: 0; top: 72px; padding: 10px 12px; color: #7d859b; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  \`],
})
export class ComboboxComponent {
  @Input({ required: true }) label = "";
  @Input({ required: true }) set options(list: Option[]) {
    this.optionsSig.set(list);
    // Inputs arrive in template order: if [(value)] came first, its label was
    // looked up in an empty list. Re-sync unless the user is editing.
    if (!this.open()) this.text.set(this.selected()?.label ?? "");
  }
  // [(value)] two-way binding = @Input value + @Output valueChange.
  @Input() set value(v: string | null) {
    this.valueSig.set(v);
    this.text.set(this.selected()?.label ?? ""); // the parent changed it: show its label
  }
  @Output() valueChange = new EventEmitter<string | null>();

  readonly base = "combo-" + nextId++;
  readonly listId = this.base + "-listbox";

  readonly optionsSig = signal<Option[]>([]);
  readonly valueSig = signal<string | null>(null);
  readonly text = signal("");
  readonly filter = signal(""); // "" = show every option
  readonly open = signal(false);
  readonly active = signal(-1);

  readonly selected = computed(() => this.optionsSig().find((o) => o.value === this.valueSig()) ?? null);
  readonly visible = computed(() => filterOptions(this.optionsSig(), this.filter()));
  readonly activeOption = computed(() => (this.open() && this.active() >= 0 ? this.visible()[this.active()] ?? null : null));
  readonly showList = computed(() => this.open() && this.visible().length > 0);
  readonly status = computed(() =>
    !this.open() ? "" : this.visible().length ? this.visible().length + " options available." : "No results.",
  );

  constructor() {
    // Keep the highlighted option visible inside a scrolling list.
    effect(() => {
      const o = this.activeOption();
      if (!o) return;
      const el = document.getElementById(this.optionId(o));
      if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
    });
  }

  optionId(o: Option) {
    return this.base + "-opt-" + o.value; // stable while the list filters
  }

  private emit(v: string | null) {
    this.valueSig.set(v);
    this.valueChange.emit(v);
  }

  private openList(dir: 1 | -1 | 0) {
    const all = this.optionsSig();
    this.filter.set("");
    this.open.set(true);
    const sel = this.selected();
    const i = sel ? all.indexOf(sel) : -1;
    this.active.set(i >= 0 ? i : dir === 1 ? step(all, -1, 1) : dir === -1 ? step(all, 0, -1) : -1);
  }

  private close() {
    this.open.set(false);
    this.active.set(-1);
    this.filter.set("");
  }

  commit(o: Option) {
    this.emit(o.value);
    this.text.set(o.label);
    this.close();
  }

  // Leaving without choosing puts the committed label back.
  private revert() {
    this.text.set(this.selected()?.label ?? "");
    this.close();
  }

  onInput(next: string) {
    this.text.set(next);
    this.filter.set(next);
    this.open.set(true);
    this.active.set(step(filterOptions(this.optionsSig(), next), -1, 1)); // first enabled match
  }

  onKeydown(e: KeyboardEvent) {
    const list = this.visible();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!this.open()) this.openList(e.altKey ? 0 : 1);
      else if (!e.altKey) this.active.update((i) => step(list, i, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (e.altKey) this.revert();
      else if (!this.open()) this.openList(-1);
      else this.active.update((i) => step(list, i < 0 ? 0 : i, -1));
    } else if (e.key === "Enter") {
      const o = this.activeOption();
      if (o) { e.preventDefault(); this.commit(o); }
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (this.open()) this.revert();
      else { this.text.set(""); this.emit(null); } // second Escape clears
    }
  }

  // Tab or a click elsewhere. With automatic selection, the highlighted
  // suggestion becomes the value when focus leaves (APG).
  onBlur() {
    const o = this.activeOption();
    if (o) { this.commit(o); return; }
    if (!this.open() && this.text() === (this.selected()?.label ?? "")) return;
    if (this.text().trim() === "") { this.emit(null); this.close(); }
    else this.revert();
  }

  clearSelection() {
    this.emit(null);
    this.text.set("");
    this.close();
  }

  toggle() {
    if (this.open()) this.revert();
    else this.openList(0);
  }

  hover(o: Option, i: number) {
    if (!o.disabled) this.active.set(i);
  }
}
`,
          "/src/app/options.ts": `export interface Option { value: string; label: string; disabled?: boolean; }

export const LANGUAGES: Option[] = [
  { value: "ts", label: "TypeScript" },
  { value: "js", label: "JavaScript" },
  { value: "py", label: "Python" },
  { value: "rs", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "kt", label: "Kotlin" },
  { value: "swift", label: "Swift" },
  { value: "rb", label: "Ruby" },
  { value: "ex", label: "Elixir" },
  { value: "cobol", label: "COBOL (retired)", disabled: true },
  { value: "hs", label: "Haskell" },
];

// Next enabled index after \`from\`, moving by \`dir\` (+1 or -1), wrapping around.
// step(list, -1, 1) is the first enabled option, step(list, 0, -1) the last.
export function step(list: Option[], from: number, dir: 1 | -1): number {
  const n = list.length;
  for (let k = 1; k <= n; k++) {
    const i = (((from + dir * k) % n) + n) % n;
    if (!list[i].disabled) return i;
  }
  return -1; // nothing enabled
}

export function filterOptions(options: Option[], text: string): Option[] {
  const q = text.trim().toLowerCase();
  return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Custom Multi-select Dropdown",
    seoDescription:
      "Build a multi-select dropdown with search, removable chips, keyboard toggling, select-all-shown, Backspace removal and outside-click close.",
    description: `**Question presented to candidate:**
"Our profile form needs a 'Skills' picker. Users open a dropdown, filter by typing, and pick as many skills as they like; picked skills appear as chips in the field and each chip can be removed. It must work with the keyboard and close when you click away."

**Requirements:**
- A field showing the selected values as chips (each with a remove button) followed by a search input; the dropdown lists options with a checkmark for selected ones.
- Typing filters options; Up / Down move the highlight; Enter toggles the highlighted option and the dropdown **stays open** for more picks; Escape closes.
- Backspace in an empty search removes the last chip; removing a chip returns focus to the input.
- "Select all shown" adds every currently visible option (disabled when they are all selected already); "Clear all" empties the selection.
- The emitted value is an array of option ids in the options order, whatever order they were clicked in; close on an outside press or when focus leaves; announce changes politely.

**What a strong answer should cover:**
- Controlled value (array of ids) with a \`Set\` derived for O(1) membership checks while rendering.
- Normalising the value to the options order so the output is stable.
- A \`listbox\` with \`aria-multiselectable="true"\` where \`aria-selected\` means *chosen* (unlike a single-select popup, where it marks the highlighted option), and \`aria-activedescendant\` for the highlight.
- Focus management for chip removal and Backspace, and \`mousedown\` \`preventDefault\` on options.
- Outside-press and focus-leave closing, and a live region for "React selected. 3 selected."

**Clarifying questions expected:**
- "Is there a maximum number of selections?"
- "Should the selection order matter, or is the options order fine?"
- "Do 'Select all' and 'Clear' apply to the filtered options or to everything?"

**Code / implementation expected:** Yes. A reusable, controlled multi-select component with chips, filtering and keyboard support.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round. Assumes React state and props; sets, chips, focus handling and multi-select ARIA are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. The Verified output was produced by running the solution on React 19.3.1 in jsdom with a driver that clicked, typed and pressed keys.

## 1. Why This Even Matters — A Story First

At a salad bar you walk along the counter with a bowl, adding things you like. You do not walk back to the start after each topping; you keep going. If you change your mind, you pick the olives back out. At the till, the receipt lists your toppings in the counter's order, not the order you grabbed them.

A multi-select dropdown is that salad bar: the list **stays open** while you pick, every pick shows up as a removable **chip**, and the value the form receives is in a predictable order. It is a staple of filter panels and profile forms, and an interview favourite because it reuses everything from a [single-value combobox](/interview-question/build-a-combobox-search-select) while changing the selection model from "one value" to "a set". The free-form cousin, where users type new values instead of choosing from a list, is the [tag / chip input](/interview-question/build-a-tag-chip-input).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is there a maximum? | Changes disabled states and messages ("You can pick 3"). |
| Does selection order matter? | Options order gives stable output; click order needs an ordered list and drag-to-reorder chips. |
| Do "Select all" / "Clear" act on the filtered list? | "Select all shown" is predictable; "select everything" while filtered surprises people. |
| Can users create new values? | Then it is a tag input, not a picker. |
| How many options? | Hundreds of chips need a "+12 more" summary; thousands of options need virtualization. |
| Where does the value go? | A form library usually wants an array of ids. |

## 3. Requirements and Plan

\`App\` owns \`skills\` (array of ids); \`MultiSelect\` is controlled; \`skills.js\` holds the options and a \`normalize()\` helper.

| Value | Kind | Note |
| :--- | :--- | :--- |
| \`value\` | prop | array of ids, from the parent |
| \`selected\` | derived \`Set\` | \`new Set(value)\` each render |
| \`open\`, \`search\`, \`active\` | state | dropdown, filter text, highlighted index |
| \`announcement\` | state | live-region sentence |
| \`visible\` | derived | options filtered by \`search\` |
| root and input elements | refs | outside-press checks and focus |

\`\`\`js
// The value is always kept in the options order, whatever order things were clicked in.
export function normalize(options, values) {
  const set = new Set(values);
  return options.filter((o) => set.has(o.value)).map((o) => o.value);
}
\`\`\`

📌 **Interview term: Set** — a JavaScript collection of unique values with O(1) \`has\`, \`add\` and \`delete\`. Perfect for "is this option selected?" while rendering a list. React state should stay serialisable and simple, so the component stores (receives) an array and derives the \`Set\` each render.

📌 **Interview term: Normalisation** — converting data to one canonical form; here, sorting the selection into the options order, so \`["react", "js"]\` and \`["js", "react"]\` both become \`["js", "react"]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 260" role="img" aria-label="Component layout: the control holds chips and the search input; the panel below holds actions and a multiselectable listbox; focus stays in the input">
  <rect class="d-box" x="20" y="20" width="640" height="70" rx="12"/>
  <rect class="d-box-accent" x="40" y="38" width="120" height="34" rx="17"/>
  <text class="d-text d-accent" x="100" y="60" text-anchor="middle">React  x</text>
  <rect class="d-box-accent" x="180" y="38" width="120" height="34" rx="17"/>
  <text class="d-text d-accent" x="240" y="60" text-anchor="middle">CSS  x</text>
  <rect class="d-box-muted" x="330" y="38" width="310" height="34" rx="6"/>
  <text class="d-sub" x="485" y="60" text-anchor="middle">search input (keeps focus)</text>
  <rect class="d-box-muted" x="20" y="130" width="640" height="110" rx="12"/>
  <text class="d-sub" x="120" y="160" text-anchor="middle">Select all shown</text>
  <text class="d-sub" x="580" y="160" text-anchor="middle">Clear all</text>
  <text class="d-text" x="340" y="196" text-anchor="middle">listbox, aria-multiselectable</text>
  <text class="d-sub" x="340" y="222" text-anchor="middle">aria-selected = chosen</text>
</svg>

Chips and the search input share one bordered control; the panel below has the two bulk actions and the multiselectable listbox. DOM focus stays in the search input the whole time; the highlighted option is announced through \`aria-activedescendant\`.

## 4. Build It Step by Step

### Step 1: one function changes the value

\`\`\`js
function set(nextValues, message) {
  const next = normalize(options, nextValues);
  onChange(next);
  setAnnouncement(message + " " + next.length + " selected.");
}

function toggle(o) {
  if (selected.has(o.value)) set(value.filter((v) => v !== o.value), o.label + " removed.");
  else set([...value, o.value], o.label + " selected.");
}
\`\`\`

Every change (toggle, chip removal, Backspace, select-all, clear) goes through \`set\`, so normalisation and the announcement can never be forgotten.

📌 **Interview term: Live region** — an element whose text changes are announced by screen readers; \`role="status"\` is polite. Selected chips appear silently above the input, so without it a screen-reader user would not know the click worked.

### Step 2: keyboard on the search input

\`\`\`js
function onKeyDown(e) {
  const n = visible.length;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!open) setOpen(true);
    if (n) setActive((i) => (i + 1) % n);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (!open) setOpen(true);
    if (n) setActive((i) => (i <= 0 ? n - 1 : i - 1));
  } else if (e.key === "Enter") {
    if (open && active >= 0 && visible[active]) {
      e.preventDefault(); // stay open: several picks in a row
      toggle(visible[active]);
    }
  } else if (e.key === "Escape") {
    setOpen(false);
    setActive(-1);
  } else if (e.key === "Backspace" && search === "" && value.length) {
    removeChip(value[value.length - 1]);
  }
}
\`\`\`

Enter toggles and **does not close**: the main behavioural difference from a single-select. Space is left alone so users can type multi-word searches; typing resets \`active\` to \`0\`, so Enter right after typing toggles the first match.

### Step 3: chips and focus

\`\`\`js
function removeChip(v) {
  set(value.filter((x) => x !== v), labelOf(v) + " removed.");
  inputRef.current.focus(); // the chip button is about to disappear
}
\`\`\`

Each chip's × is a real, tabbable \`<button aria-label="Remove React">\`. When it is clicked, the button is removed from the DOM; without moving focus, focus would fall to \`<body>\`. The input is always present, so it is the natural target. The chip \`onClick\` also calls \`stopPropagation()\` so the control's own click handler (which focuses the input and opens the list) does not fire.

📌 **Interview term: Focus management** — deciding where keyboard focus goes when the focused element disappears or a widget opens or closes. Losing focus to \`<body>\` is one of the most common accessibility bugs in custom widgets.

### Step 4: the listbox

\`\`\`jsx
<ul id={listId} role="listbox" aria-multiselectable="true" aria-label={label}>
  {visible.map((o, i) => (
    <li
      id={optionId(o)}
      role="option"
      aria-selected={selected.has(o.value)}
      className={"ms-option" + (i === active ? " active" : "")}
      onMouseMove={() => { if (i !== active) setActive(i); }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => toggle(o)}
    >
\`\`\`

📌 **Interview term: aria-multiselectable** — tells assistive technology that several options in this listbox can be selected at once. In such a listbox, \`aria-selected="true"\` means *chosen*; the keyboard highlight is a separate thing, expressed by \`aria-activedescendant\` on the input. In the single-select [combobox](/interview-question/build-a-combobox-search-select), \`aria-selected\` marks the highlighted option instead.

\`onMouseDown\` \`preventDefault\` keeps focus in the input, so the panel does not close on blur and the user can keep clicking.

### Step 5: bulk actions and closing

"Select all shown" adds only options that are not already selected, so the announcement says how many were really added ("Added 5."), and the button is disabled when everything visible is already chosen. Closing uses a document \`mousedown\` listener (attached only while open) and an \`onBlur\` on the root that checks whether \`relatedTarget\` is outside the widget.

## 5. Verified: What the Driver Printed

Mounted under \`StrictMode\` in jsdom. The driver clicked the input, pressed keys on it, typed into it, clicked buttons and dispatched a \`mousedown\` on the page body. \`*\` marks options whose \`aria-selected\` is \`"true"\`; "said" is the live-region text.

\`\`\`
start          : chips: [] | open: false | Value: []
click          : open: true | options: 10 | multiselectable: true
Down+Enter     : active: JavaScript | open: true | chips: ["JavaScript"] | said: JavaScript selected. 1 selected.
Down x2+Enter  : active: React | chips: ["JavaScript","React"]
type s         : *JavaScript, TypeScript, Node.js, CSS, Testing, Accessibility | active: JavaScript
select shown   : chips: ["JavaScript","TypeScript","React","Node.js","CSS","Testing","Accessibility"] | said: Added 5. 7 selected.
value order    : Value: ["js","ts","react","node","css","testing","a11y"]
button disabled: true
Backspace      : chips: ["JavaScript","TypeScript","React","Node.js","CSS","Testing"] | said: Accessibility removed. 6 selected.
chip x React   : chips: ["JavaScript","TypeScript","Node.js","CSS","Testing"] | focus on input: true
count          : 5 selected
Escape         : open: false
click again    : open: true
press outside  : open: false
Clear all      : chips: [] | Value: [] | said: Cleared. 0 selected.
\`\`\`

The list stayed open after Enter; filtering on "s" kept JavaScript marked as selected; "Select all shown" added the five unselected matches and the value came out in options order (React, picked earlier, sits between TypeScript and Node.js); Backspace removed the last chip; clicking a chip's × removed it and left focus on the input.

## 6. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Roles | Input \`role="combobox"\` with \`aria-expanded\`, \`aria-controls\`, \`aria-activedescendant\`; popup \`role="listbox"\` \`aria-multiselectable="true"\` |
| Chosen vs highlighted | \`aria-selected\` = chosen; highlight via \`aria-activedescendant\` and a CSS class |
| Chips | A labelled list (\`aria-label="Selected Skills"\`) of chips, each with \`aria-label="Remove X"\` |
| Feedback | \`role="status"\` sentence after every change |
| Focus | Stays in the input; returns there after a chip is removed |
| Placeholder | Only when nothing is selected, so chips and placeholder never overlap |
| Narrow screens | Chips wrap (\`flex-wrap\`); the input keeps a 100 px minimum width |

## 7. Common Pitfalls

- **Closing after every pick.** It turns a five-skill choice into five open-pick-close cycles.
- **Storing a \`Set\` in React state and mutating it.** \`selected.add(x)\` keeps the same object, so React sees no change. Keep an array and derive the \`Set\`, or always create a new \`Set\`.
- **Output order depending on click order.** Two users with the same skills submit different arrays; normalise.
- **\`aria-selected\` on the highlighted option** in a multi-select. It must reflect chosen state.
- **Removing a chip without moving focus.** Focus falls to \`<body>\`.
- **"Select all" ignoring the filter.** Users expect it to act on what they can see.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"The value is a controlled array of ids; each render I derive a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> for O(1) lookups, and every change goes through one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> function that normalises to the options order and announces it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Layout:</strong> <span style="color:#f0e2c8;">"Chips and a search input share one control; the panel has Select all shown, Clear all and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">listbox</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-multiselectable</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Keyboard:</strong> <span style="color:#f0e2c8;">"Arrows move the highlight via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code>, Enter toggles and keeps the panel open, Escape closes, Backspace in an empty search removes the last chip."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Focus:</strong> <span style="color:#f0e2c8;">"Options prevent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mousedown</code> so focus stays in the input, and removing a chip puts focus back in the input."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Closing and feedback:</strong> <span style="color:#f0e2c8;">"An outside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mousedown</code> or focus leaving closes it, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=status</code> region says things like React selected, three selected."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a maximum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code> as a prop; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value.length === max</code>, mark unselected options <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-disabled</code>, skip them in navigation, disable Select all shown, and announce "Maximum of 3 reached".</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if users select 40 items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Collapse chips after a few into a "+37 more" button that opens the list, or show a count in the field; keep the full list accessible in the panel.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you virtualize the options?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Render only visible rows; keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code> pointing at a rendered row by scrolling to the active index, and add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-setsize</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-posinset</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Testing Library: click the input, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">userEvent.keyboard("{ArrowDown}{Enter}")</code>, assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code> received the normalised array and the chip rendered; assert the panel is still open; press Backspace and assert the last chip is gone.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Native <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">select multiple</code> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is accessible out of the box but awkward to use (Ctrl-click, no search, tall box). For short lists, a group of checkboxes is often the simplest accessible choice.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Set** | Collection of unique values with fast membership checks |
| **Normalisation** | Converting data to one canonical form (options order) |
| **Chip** | Small removable token showing one selected value |
| **aria-multiselectable** | Listbox allows several selected options |
| **Live region** | Element whose text changes are announced |
| **Focus management** | Deciding where focus goes when elements appear or disappear |

---
**Conclusion:** A multi-select dropdown is a single-value combobox with a different selection model: a controlled array of ids, a derived \`Set\` for rendering, one normalising \`set\` function for every change, a panel that stays open on Enter, and focus that always returns to the search input. The verified run on React 19.3.1 shows the list staying open while picking, select-all-shown respecting the filter, output in options order, Backspace and chip removal, and the live-region sentences a screen reader would hear.`,
        files: {
          "/App.js": `import { useState } from "react";
import MultiSelect from "./src/MultiSelect";
import { SKILLS } from "./src/skills";

export default function App() {
  const [skills, setSkills] = useState([]);
  return (
    <main className="page">
      <h1>Your skills</h1>
      <MultiSelect label="Skills" options={SKILLS} value={skills} onChange={setSkills} />
      <p className="value" data-testid="value">Value: {JSON.stringify(skills)}</p>
    </main>
  );
}
`,
          "/src/MultiSelect.js": `import { useEffect, useId, useRef, useState } from "react";
import { normalize } from "./skills";

export default function MultiSelect({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(-1);
  const [announcement, setAnnouncement] = useState("");
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const base = useId();

  const selected = new Set(value); // derived: O(1) lookups while rendering
  const q = search.trim().toLowerCase();
  const visible = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  const labelOf = (v) => options.find((o) => o.value === v).label;
  const optionId = (o) => base + "-opt-" + o.value;
  const listId = base + "-list";

  function set(nextValues, message) {
    const next = normalize(options, nextValues);
    onChange(next);
    setAnnouncement(message + " " + next.length + " selected.");
  }

  function toggle(o) {
    if (selected.has(o.value)) set(value.filter((v) => v !== o.value), o.label + " removed.");
    else set([...value, o.value], o.label + " selected.");
  }

  function removeChip(v) {
    set(value.filter((x) => x !== v), labelOf(v) + " removed.");
    inputRef.current.focus(); // the chip button is about to disappear
  }

  function onKeyDown(e) {
    const n = visible.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      if (n) setActive((i) => (i + 1) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      if (n) setActive((i) => (i <= 0 ? n - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (open && active >= 0 && visible[active]) {
        e.preventDefault(); // stay open: several picks in a row
        toggle(visible[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (e.key === "Backspace" && search === "" && value.length) {
      removeChip(value[value.length - 1]);
    }
  }

  // Close on a pointer press outside, only while open.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div
      className="ms"
      ref={rootRef}
      onBlur={(e) => { if (!rootRef.current.contains(e.relatedTarget)) setOpen(false); }}
    >
      <label htmlFor={base + "-input"} className="label">{label}</label>
      <div className="ms-control" onClick={() => inputRef.current.focus()}>
        <ul className="chips" aria-label={"Selected " + label} data-testid="chips">
          {value.map((v) => (
            <li key={v} className="chip">
              {labelOf(v)}
              <button type="button" aria-label={"Remove " + labelOf(v)} data-testid="chip-remove"
                onClick={(e) => { e.stopPropagation(); removeChip(v); }}>×</button>
            </li>
          ))}
        </ul>
        <input
          id={base + "-input"}
          ref={inputRef}
          data-testid="ms-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 && visible[active] ? optionId(visible[active]) : undefined}
          autoComplete="off"
          placeholder={value.length ? "" : "Pick skills..."}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); setActive(0); }}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>
      <p className="count" data-testid="count">{value.length} selected</p>

      {open && (
        <div className="ms-panel" data-testid="ms-panel">
          <div className="ms-actions">
            <button type="button" data-testid="select-shown" disabled={visible.every((o) => selected.has(o.value))}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const added = visible.filter((o) => !selected.has(o.value));
                set([...value, ...added.map((o) => o.value)], "Added " + added.length + ".");
              }}>
              Select all shown
            </button>
            <button type="button" data-testid="clear-all" disabled={value.length === 0}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => set([], "Cleared.")}>
              Clear all
            </button>
          </div>
          {visible.length === 0 ? (
            <p className="empty">No skills match</p>
          ) : (
            <ul id={listId} role="listbox" aria-multiselectable="true" aria-label={label} data-testid="ms-list">
              {visible.map((o, i) => (
                <li
                  key={o.value}
                  id={optionId(o)}
                  role="option"
                  aria-selected={selected.has(o.value)}
                  className={"ms-option" + (i === active ? " active" : "")}
                  onMouseMove={() => { if (i !== active) setActive(i); }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggle(o)}
                >
                  <span className="box" aria-hidden="true">{selected.has(o.value) ? "✓" : ""}</span>
                  {o.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div role="status" className="sr-only" data-testid="ms-status">{announcement}</div>
    </div>
  );
}
`,
          "/src/skills.js": `export const SKILLS = [
  { value: "js", label: "JavaScript" },
  { value: "ts", label: "TypeScript" },
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "angular", label: "Angular" },
  { value: "node", label: "Node.js" },
  { value: "graphql", label: "GraphQL" },
  { value: "css", label: "CSS" },
  { value: "testing", label: "Testing" },
  { value: "a11y", label: "Accessibility" },
];

// The value is always kept in the options order, whatever order things were clicked in.
export function normalize(options, values) {
  const set = new Set(values);
  return options.filter((o) => set.has(o.value)).map((o) => o.value);
}
`,
          "/styles.css": `:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
.page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 1.4rem; margin: 0 0 16px; }
.ms { position: relative; }
.label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
.ms-control { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px 8px; min-height: 44px; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; cursor: text; }
.ms-control:focus-within { outline: 2px solid #7aa2ff; outline-offset: 1px; }
.chips { display: contents; list-style: none; }
.chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 4px 2px 10px; background: #2f3b66; border-radius: 999px; font-size: 0.85rem; }
.chip button { width: 22px; height: 22px; border: 0; border-radius: 50%; background: transparent; color: #c9d4ff; cursor: pointer; }
.chip button:hover, .chip button:focus-visible { background: #4a5a95; color: #fff; }
.ms-control input { flex: 1; min-width: 100px; padding: 4px; font-size: 1rem; color: inherit; background: transparent; border: 0; outline: none; }
.count { font-size: 0.8rem; color: #7d859b; margin: 6px 0 0; }
.ms-panel { position: absolute; left: 0; right: 0; z-index: 10; margin-top: 4px; padding: 4px; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); }
.ms-actions { display: flex; justify-content: space-between; padding: 4px 6px 6px; border-bottom: 1px solid #2a2f3f; }
.ms-actions button { background: none; border: 0; color: #7aa2ff; cursor: pointer; font-size: 0.85rem; }
.ms-actions button:disabled { color: #4b5267; cursor: default; }
.ms-panel ul { list-style: none; margin: 4px 0 0; padding: 0; max-height: 240px; overflow-y: auto; }
.ms-option { display: flex; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 6px; cursor: pointer; }
.ms-option.active { background: #262b3a; }
.box { display: inline-grid; place-items: center; width: 18px; height: 18px; border: 1px solid #5d6478; border-radius: 4px; color: #81c784; font-size: 0.8rem; }
.empty { margin: 8px 10px; color: #7d859b; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.value { margin-top: 18px; font: 0.85rem ui-monospace, SFMono-Regular, Menlo, monospace; color: #c9cfdd; }
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers preparing for a machine coding round. Assumes props, emits and \`v-for\`; sets, chips, focus handling and multi-select ARIA are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The Verified output came from compiling the SFCs with @vue/compiler-sfc and mounting them on Vue 3.5.44 in jsdom with a driver that clicked, typed and pressed keys.

## 1. A Story First

At a salad bar you walk along the counter adding toppings, you do not go back to the start after each one, and the receipt lists them in the counter's order. A multi-select dropdown works the same: the list **stays open** while you pick, each pick becomes a removable **chip**, and the form receives the picks in a stable order. It reuses the ideas of the single-value [combobox](/interview-question/build-a-combobox-search-select) with a set-based selection; free-typed values belong to the [tag / chip input](/interview-question/build-a-tag-chip-input).

## 2. The Plan in Vue Terms

\`App.vue\`: \`const skills = ref([])\` and \`<MultiSelect v-model="skills" label="Skills" :options="SKILLS" />\`.

| Piece | Vue tool |
| :--- | :--- |
| Value | \`modelValue\` prop (array of ids) + \`emit("update:modelValue")\` |
| Membership | \`computed(() => new Set(props.modelValue))\` |
| Open, search, active index, announcement | \`ref\` |
| Visible options, "all shown selected", active option | \`computed\` |
| Outside press | document listener added by \`watch(open)\`, removed on close and in \`onBeforeUnmount\` |
| Focus leaving | \`@focusout\` on the root |

\`\`\`js
export function normalize(options, values) {
  const set = new Set(values);
  return options.filter((o) => set.has(o.value)).map((o) => o.value);
}
\`\`\`

📌 **Interview term: Set** — a collection of unique values with O(1) \`has\`; ideal for "is this option chosen?" in a \`v-for\`. It is derived in a \`computed\`, so it is rebuilt only when the value changes.

📌 **Interview term: Normalisation** — one canonical form; here the options order, so the same choices always produce the same array.

## 3. Build It Step by Step

### Step 1: one function for every change

\`\`\`js
function set(nextValues, message) {
  const next = normalize(props.options, nextValues);
  emit("update:modelValue", next);
  announcement.value = message + " " + next.length + " selected.";
}
function toggle(o) {
  if (selected.value.has(o.value)) set(props.modelValue.filter((v) => v !== o.value), o.label + " removed.");
  else set([...props.modelValue, o.value], o.label + " selected.");
}
\`\`\`

The component never mutates the prop array; it emits a new one. See [how v-model works on components](/interview-question/how-does-v-model-work-on-components).

📌 **Interview term: One-way data flow** — props flow down and are read-only; the child asks for changes by emitting events.

### Step 2: keyboard

\`\`\`js
function onKeydown(e) {
  const n = visible.value.length;
  if (e.key === "ArrowDown") { e.preventDefault(); open.value = true; if (n) active.value = (active.value + 1) % n; }
  else if (e.key === "ArrowUp") { e.preventDefault(); open.value = true; if (n) active.value = active.value <= 0 ? n - 1 : active.value - 1; }
  else if (e.key === "Enter") {
    if (activeOption.value) { e.preventDefault(); toggle(activeOption.value); } // stay open
  }
  else if (e.key === "Escape") { open.value = false; active.value = -1; }
  else if (e.key === "Backspace" && search.value === "" && props.modelValue.length) {
    removeChip(props.modelValue[props.modelValue.length - 1]);
  }
}
\`\`\`

Enter toggles without closing. Typing (\`@input\`) opens the list and sets \`active\` to \`0\`.

### Step 3: chips and focus

\`\`\`html
<li v-for="v in modelValue" :key="v" class="chip">{{ labelOf(v) }}<button
    type="button" :aria-label="'Remove ' + labelOf(v)" @click.stop="removeChip(v)">×</button></li>
\`\`\`

\`@click.stop\` keeps the control's own click handler (focus the input, open the list) from running. \`removeChip\` focuses the input, because the clicked button is about to disappear and focus would otherwise fall to \`<body>\`.

📌 **Interview term: Focus management** — choosing where focus goes when the focused element disappears.

### Step 4: the listbox

\`\`\`html
<ul :id="listId" role="listbox" aria-multiselectable="true" :aria-label="label">
  <li v-for="(o, i) in visible" :id="optionId(o)" :key="o.value" role="option"
      :aria-selected="selected.has(o.value)" :class="['ms-option', { active: i === active }]"
      @mousemove="active = i" @mousedown.prevent @click="toggle(o)">...</li>
</ul>
\`\`\`

📌 **Interview term: aria-multiselectable** — several options can be selected; \`aria-selected\` then means *chosen*, while the keyboard highlight is \`aria-activedescendant\` on the input.

\`@mousedown.prevent\` keeps focus in the input so the panel survives a click. The \`role="status"\` region holds sentences like "React selected. 2 selected."

## 4. Verified: What the Driver Printed

\`*\` marks options with \`aria-selected="true"\`; "said" is the live-region text.

\`\`\`
start          : chips: [] | open: false | Value: []
click          : open: true | options: 10 | multiselectable: true
Down+Enter     : active: JavaScript | open: true | chips: ["JavaScript"] | said: JavaScript selected. 1 selected.
Down x2+Enter  : active: React | chips: ["JavaScript","React"]
type s         : *JavaScript, TypeScript, Node.js, CSS, Testing, Accessibility | active: JavaScript
select shown   : chips: ["JavaScript","TypeScript","React","Node.js","CSS","Testing","Accessibility"] | said: Added 5. 7 selected.
value order    : Value: ["js","ts","react","node","css","testing","a11y"]
button disabled: true
Backspace      : chips: ["JavaScript","TypeScript","React","Node.js","CSS","Testing"] | said: Accessibility removed. 6 selected.
chip x React   : chips: ["JavaScript","TypeScript","Node.js","CSS","Testing"] | focus on input: true
count          : 5 selected
Escape         : open: false
click again    : open: true
press outside  : open: false
Clear all      : chips: [] | Value: [] | said: Cleared. 0 selected.
\`\`\`

The panel stayed open after Enter, filtering kept selection marks, Select all shown added only the five unselected matches, the value came out in options order, and focus returned to the input after a chip was removed. Same lines as the React and Angular builds.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Roles | \`combobox\` input; \`listbox\` with \`aria-multiselectable="true"\` |
| Chosen vs highlighted | \`aria-selected\` vs \`aria-activedescendant\` |
| Chip buttons | \`aria-label="Remove X"\`, tabbable |
| Feedback | \`role="status"\` sentence |
| Focus | Input keeps focus; returns there after removals |
| Wrapping | Chips wrap; input keeps a minimum width |

## 6. Common Pitfalls

- **Mutating \`props.modelValue\`** with \`push\` or \`splice\`: Vue warns in dev, and the parent's state changes behind its back.
- **Closing on every pick.**
- **Output in click order**, so identical selections produce different arrays.
- **Forgetting \`@click.stop\`** on the chip button, so removing a chip also reopens the list.
- **A document listener left behind** after unmount.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> carries an array of ids; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> turns it into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>, and one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> function normalises to options order, emits, and writes the announcement."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Layout:</strong> <span style="color:#f0e2c8;">"Chips and a search input in one control, then a panel with Select all shown, Clear all and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">listbox</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-multiselectable</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Keyboard:</strong> <span style="color:#f0e2c8;">"Arrows move the highlight through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code>, Enter toggles and stays open, Escape closes, Backspace in an empty search removes the last chip."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Focus:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@mousedown.prevent</code> on options keeps focus in the input; removing a chip focuses the input again."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Closing:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@focusout</code> and a document <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mousedown</code> listener close it; the listener is removed on close and on unmount."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defineModel</code> simplify this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const model = defineModel({ default: () =&gt; [] })</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model.value = next</code> replaces the prop and the emit, with the same one-way flow underneath.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you let callers render custom options?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A scoped slot <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#option="{ option, selected, active }"</code> inside each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">li</code>, keeping the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">li</code> with its role and ids owned by the component.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue Test Utils: click the input, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trigger("keydown", { key: "ArrowDown" })</code> and Enter, assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emitted("update:modelValue")</code> holds the normalised array, re-render with the new prop and assert the chip.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Large option lists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Virtualize the listbox and keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-setsize</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-posinset</code>; see [virtual scrolling in Vue](/interview-question/how-do-you-render-very-large-lists-efficiently-in-vue-virtual-scrolling).</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Set** | Unique values with fast membership checks |
| **Normalisation** | Canonical form: options order |
| **One-way data flow** | Props down, events up |
| **aria-multiselectable** | Listbox with several chosen options |
| **Focus management** | Where focus goes when elements disappear |
| **Chip** | Removable token for one selected value |

---
**Conclusion:** In Vue the multi-select is a \`v-model\` array of ids, a \`computed\` \`Set\` for rendering, one normalising \`set\` function that emits, a panel that stays open on Enter, and focus that returns to the search input after removals. The verified run on Vue 3.5.44 matches the React and Angular builds line for line.`,
        files: {
          "/src/App.vue": `<script setup>
import { ref } from "vue";
import MultiSelect from "./components/MultiSelect.vue";
import { SKILLS } from "./skills.js";

const skills = ref([]);
</script>

<template>
  <main class="page">
    <h1>Your skills</h1>
    <MultiSelect v-model="skills" label="Skills" :options="SKILLS" />
    <p class="value" data-testid="value">Value: {{ JSON.stringify(skills) }}</p>
  </main>
</template>

<style>
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
.page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 1.4rem; margin: 0 0 16px; }
.value { margin-top: 18px; font: 0.85rem ui-monospace, SFMono-Regular, Menlo, monospace; color: #c9cfdd; }
</style>
`,
          "/src/components/MultiSelect.vue": `<script setup>
import { computed, onBeforeUnmount, ref, useId, watch } from "vue";
import { normalize } from "../skills.js";

const props = defineProps({
  label: { type: String, required: true },
  options: { type: Array, required: true },
  modelValue: { type: Array, default: () => [] },
});
const emit = defineEmits(["update:modelValue"]);

const open = ref(false);
const search = ref("");
const active = ref(-1);
const announcement = ref("");
const root = ref(null);
const inputEl = ref(null);
const base = useId();

const selected = computed(() => new Set(props.modelValue)); // O(1) lookups while rendering
const visible = computed(() => {
  const q = search.value.trim().toLowerCase();
  return q ? props.options.filter((o) => o.label.toLowerCase().includes(q)) : props.options;
});
const allShownSelected = computed(() => visible.value.every((o) => selected.value.has(o.value)));
const activeOption = computed(() => (open.value && active.value >= 0 ? visible.value[active.value] : null));
const labelOf = (v) => props.options.find((o) => o.value === v).label;
const optionId = (o) => base + "-opt-" + o.value;
const listId = base + "-list";

function set(nextValues, message) {
  const next = normalize(props.options, nextValues);
  emit("update:modelValue", next);
  announcement.value = message + " " + next.length + " selected.";
}

function toggle(o) {
  if (selected.value.has(o.value)) set(props.modelValue.filter((v) => v !== o.value), o.label + " removed.");
  else set([...props.modelValue, o.value], o.label + " selected.");
}

function removeChip(v) {
  set(props.modelValue.filter((x) => x !== v), labelOf(v) + " removed.");
  inputEl.value.focus(); // the chip button is about to disappear
}

function selectShown() {
  const added = visible.value.filter((o) => !selected.value.has(o.value));
  set([...props.modelValue, ...added.map((o) => o.value)], "Added " + added.length + ".");
}

function onInput() {
  open.value = true;
  active.value = 0;
}

function onKeydown(e) {
  const n = visible.value.length;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    open.value = true;
    if (n) active.value = (active.value + 1) % n;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    open.value = true;
    if (n) active.value = active.value <= 0 ? n - 1 : active.value - 1;
  } else if (e.key === "Enter") {
    if (activeOption.value) {
      e.preventDefault(); // stay open: several picks in a row
      toggle(activeOption.value);
    }
  } else if (e.key === "Escape") {
    open.value = false;
    active.value = -1;
  } else if (e.key === "Backspace" && search.value === "" && props.modelValue.length) {
    removeChip(props.modelValue[props.modelValue.length - 1]);
  }
}

function onFocusout(e) {
  if (!root.value.contains(e.relatedTarget)) open.value = false;
}

// Close on a pointer press outside, only while open.
function onDocumentDown(e) {
  if (!root.value.contains(e.target)) open.value = false;
}
watch(open, (isOpen) => {
  if (isOpen) document.addEventListener("mousedown", onDocumentDown);
  else document.removeEventListener("mousedown", onDocumentDown);
});
onBeforeUnmount(() => document.removeEventListener("mousedown", onDocumentDown));
</script>

<template>
  <div ref="root" class="ms" @focusout="onFocusout">
    <label :for="base + '-input'" class="label">{{ label }}</label>
    <div class="ms-control" @click="inputEl.focus()">
      <ul class="chips" :aria-label="'Selected ' + label" data-testid="chips">
        <li v-for="v in modelValue" :key="v" class="chip">{{ labelOf(v) }}<button
            type="button" :aria-label="'Remove ' + labelOf(v)" data-testid="chip-remove"
            @click.stop="removeChip(v)">×</button></li>
      </ul>
      <input
        :id="base + '-input'"
        ref="inputEl"
        v-model="search"
        data-testid="ms-input"
        role="combobox"
        :aria-expanded="open"
        :aria-controls="listId"
        aria-autocomplete="list"
        :aria-activedescendant="activeOption ? optionId(activeOption) : undefined"
        autocomplete="off"
        :placeholder="modelValue.length ? '' : 'Pick skills...'"
        @input="onInput"
        @click="open = true"
        @keydown="onKeydown"
      />
    </div>
    <p class="count" data-testid="count">{{ modelValue.length }} selected</p>

    <div v-if="open" class="ms-panel" data-testid="ms-panel">
      <div class="ms-actions">
        <button type="button" data-testid="select-shown" :disabled="allShownSelected" @mousedown.prevent @click="selectShown">Select all shown</button>
        <button type="button" data-testid="clear-all" :disabled="modelValue.length === 0" @mousedown.prevent @click="set([], 'Cleared.')">Clear all</button>
      </div>
      <p v-if="visible.length === 0" class="empty">No skills match</p>
      <ul v-else :id="listId" role="listbox" aria-multiselectable="true" :aria-label="label" data-testid="ms-list">
        <li
          v-for="(o, i) in visible"
          :id="optionId(o)"
          :key="o.value"
          role="option"
          :aria-selected="selected.has(o.value)"
          :class="['ms-option', { active: i === active }]"
          @mousemove="active = i"
          @mousedown.prevent
          @click="toggle(o)"
        ><span class="box" aria-hidden="true">{{ selected.has(o.value) ? "✓" : "" }}</span>{{ o.label }}</li>
      </ul>
    </div>
    <div role="status" class="sr-only" data-testid="ms-status">{{ announcement }}</div>
  </div>
</template>

<style scoped>
.ms { position: relative; }
.label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
.ms-control { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px 8px; min-height: 44px; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; cursor: text; }
.ms-control:focus-within { outline: 2px solid #7aa2ff; outline-offset: 1px; }
.chips { display: contents; list-style: none; }
.chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 4px 2px 10px; background: #2f3b66; border-radius: 999px; font-size: 0.85rem; }
.chip button { width: 22px; height: 22px; border: 0; border-radius: 50%; background: transparent; color: #c9d4ff; cursor: pointer; }
.chip button:hover, .chip button:focus-visible { background: #4a5a95; color: #fff; }
.ms-control input { flex: 1; min-width: 100px; padding: 4px; font-size: 1rem; color: inherit; background: transparent; border: 0; outline: none; }
.count { font-size: 0.8rem; color: #7d859b; margin: 6px 0 0; }
.ms-panel { position: absolute; left: 0; right: 0; z-index: 10; margin-top: 4px; padding: 4px; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); }
.ms-actions { display: flex; justify-content: space-between; padding: 4px 6px 6px; border-bottom: 1px solid #2a2f3f; }
.ms-actions button { background: none; border: 0; color: #7aa2ff; cursor: pointer; font-size: 0.85rem; }
.ms-actions button:disabled { color: #4b5267; cursor: default; }
.ms-panel ul { list-style: none; margin: 4px 0 0; padding: 0; max-height: 240px; overflow-y: auto; }
.ms-option { display: flex; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 6px; cursor: pointer; }
.ms-option.active { background: #262b3a; }
.box { display: inline-grid; place-items: center; width: 18px; height: 18px; border: 1px solid #5d6478; border-radius: 4px; color: #81c784; font-size: 0.8rem; }
.empty { margin: 8px 10px; color: #7d859b; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
`,
          "/src/skills.js": `export const SKILLS = [
  { value: "js", label: "JavaScript" },
  { value: "ts", label: "TypeScript" },
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "angular", label: "Angular" },
  { value: "node", label: "Node.js" },
  { value: "graphql", label: "GraphQL" },
  { value: "css", label: "CSS" },
  { value: "testing", label: "Testing" },
  { value: "a11y", label: "Accessibility" },
];

// The value is always kept in the options order, whatever order things were clicked in.
export function normalize(options, values) {
  const set = new Set(values);
  return options.filter((o) => set.has(o.value)).map((o) => o.value);
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers preparing for a machine coding round. Assumes components, \`@Input\`, \`@Output\` and \`@for\`; sets, chips, focus handling and multi-select ARIA are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The Verified output came from booting the solution on Angular 22.2.3 in jsdom twice, once AOT with strict templates and once with the playground's runtime JIT compiler, with a driver that clicked, typed and pressed keys.

## 1. A Story First

At a salad bar you keep walking along the counter adding toppings, and the receipt lists them in the counter's order. A multi-select dropdown works the same way: the list **stays open** while you pick, each pick becomes a removable **chip**, and the form receives the picks in a stable order. It reuses the ideas of the single-value [combobox](/interview-question/build-a-combobox-search-select) but swaps the single value for a set. Free-typed values belong to the [tag / chip input](/interview-question/build-a-tag-chip-input).

## 2. The Plan in Angular Terms

\`AppComponent\` holds \`chosen = signal<string[]>([])\` and renders \`<app-multi-select label="Skills" [options]="skills" [(value)]="chosen" />\`.

| Piece | Angular tool |
| :--- | :--- |
| Value | \`@Input() set value(...)\` into \`valueSig\`, plus \`@Output() valueChange\` |
| Options | \`@Input() set options(...)\` into \`optionsSig\` |
| Open, search, active index, announcement | \`signal()\` |
| Membership, visible options, "all shown selected", active option | \`computed()\` |
| Outside press | \`@HostListener("document:mousedown")\` |
| Focus leaving | \`@HostListener("focusout")\` |

\`\`\`ts
export function normalize(options: Option[], values: string[]): string[] {
  const set = new Set(values);
  return options.filter((o) => set.has(o.value)).map((o) => o.value);
}

readonly selected = computed(() => new Set(this.valueSig())); // O(1) lookups while rendering
\`\`\`

📌 **Interview term: Set** — a collection of unique values with an O(1) \`has\`. It answers "is this option chosen?" for every row of the \`@for\`. As a \`computed\`, it is rebuilt only when the value changes.

📌 **Interview term: Normalisation** — one canonical form for a value. Here that is the options order, so the same choices always produce the same array.

## 3. Build It Step by Step

### Step 1: inputs into signals, one function for every change

\`\`\`ts
@Input({ required: true }) set options(list: Option[]) { this.optionsSig.set(list); }
@Input() set value(v: string[]) { this.valueSig.set(v); }
@Output() valueChange = new EventEmitter<string[]>();

set(nextValues: string[], message: string) {
  const next = normalize(this.optionsSig(), nextValues);
  this.valueSig.set(next);
  this.valueChange.emit(next);
  this.announcement.set(message + " " + next.length + " selected.");
}
toggle(o: Option) {
  const value = this.valueSig();
  if (this.selected().has(o.value)) this.set(value.filter((v) => v !== o.value), o.label + " removed.");
  else this.set([...value, o.value], o.label + " selected.");
}
\`\`\`

Every change goes through \`set\`; the array is always replaced, so the \`computed\` Set and the parent both see a new reference. Unlike the [combobox](/interview-question/build-a-combobox-search-select), neither setter reads another input, so the order of \`[options]\` and \`[(value)]\` in the parent template does not matter here.

📌 **Interview term: Two-way binding \`[( )]\`** — \`[(value)]="chosen"\` expands to \`[value]="chosen()"\` plus \`(valueChange)="chosen.set($event)"\`. In both builds on Angular 22.2.3 the parent signal received every emitted array, which is what the "Value:" line in the run shows. Signal \`model()\` inputs would do this in one line but do not register under the playground's JIT compiler, so this solution uses decorators.

### Step 2: keyboard

\`\`\`ts
onKeydown(e: KeyboardEvent) {
  const n = this.visible().length;
  if (e.key === "ArrowDown") { e.preventDefault(); this.open.set(true); if (n) this.active.update((i) => (i + 1) % n); }
  else if (e.key === "ArrowUp") { e.preventDefault(); this.open.set(true); if (n) this.active.update((i) => (i <= 0 ? n - 1 : i - 1)); }
  else if (e.key === "Enter") {
    const o = this.activeOption();
    if (o) { e.preventDefault(); this.toggle(o); } // stay open: several picks in a row
  }
  else if (e.key === "Escape") { this.open.set(false); this.active.set(-1); }
  else if (e.key === "Backspace" && this.search() === "" && this.valueSig().length) {
    const value = this.valueSig();
    this.removeChip(value[value.length - 1]);
  }
}
\`\`\`

Enter toggles without closing. Typing, through \`(input)\`, opens the list and highlights the first visible option.

### Step 3: chips, the template ref and focus

\`\`\`html
<div class="ms-control" (click)="box.focus()">
  @for (v of valueSig(); track v) {
    <li class="chip">{{ labelOf(v) }}<button type="button" [attr.aria-label]="'Remove ' + labelOf(v)"
        (click)="$event.stopPropagation(); removeChip(v)">×</button></li>
  }
  <input #box role="combobox" ... [value]="search()" (input)="search.set(box.value); open.set(true); active.set(0)" />
</div>
\`\`\`

\`#box\` on an \`<input>\` is a template reference to the element itself, so the template calls \`box.focus()\` directly. The first draft wrote \`box.nativeElement.focus()\`, and the strict AOT build rejected it, because \`nativeElement\` belongs to \`ElementRef\`, not to \`HTMLInputElement\`. In the class the same element comes from \`@ViewChild("box", { static: true })\` as an \`ElementRef\`, so there the call is \`this.box.nativeElement.focus()\`. \`removeChip\` makes that call because the clicked chip button is about to disappear, and focus would otherwise fall to \`<body>\`.

\`$event.stopPropagation()\` keeps the control's own click handler from running after a chip is removed.

📌 **Interview term: Focus management** — choosing where focus goes when the focused element disappears.

### Step 4: the listbox and closing

\`\`\`html
<ul [id]="listId" role="listbox" aria-multiselectable="true" [attr.aria-label]="label">
  @for (o of visible(); track o.value; let i = $index) {
    <li [id]="optionId(o)" role="option" [class.active]="i === active()"
        [attr.aria-selected]="selected().has(o.value)"
        (mousemove)="active.set(i)" (mousedown)="$event.preventDefault()" (click)="toggle(o)">...</li>
  }
</ul>
\`\`\`

\`\`\`ts
@HostListener("focusout", ["$event"])
onFocusout(e: FocusEvent) {
  if (!this.host.nativeElement.contains(e.relatedTarget as Node | null)) this.open.set(false);
}
@HostListener("document:mousedown", ["$event"])
onDocumentDown(e: MouseEvent) {
  if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
}
\`\`\`

📌 **Interview term: aria-multiselectable** — several options can be selected at once. \`aria-selected\` then means *chosen*, while the keyboard highlight is \`aria-activedescendant\` on the input.

\`@HostListener("document:...")\` is removed by Angular when the component is destroyed, so there is no manual cleanup. \`(mousedown)="$event.preventDefault()"\` keeps focus in the input so a click on an option does not fire \`focusout\` and close the panel first.

## 4. Verified: What the Driver Printed

\`*\` marks options with \`aria-selected="true"\`, and "said" is the live-region text. Both builds printed:

\`\`\`
start          : chips: [] | open: false | Value: []
click          : open: true | options: 10 | multiselectable: true
Down+Enter     : active: JavaScript | open: true | chips: ["JavaScript"] | said: JavaScript selected. 1 selected.
Down x2+Enter  : active: React | chips: ["JavaScript","React"]
type s         : *JavaScript, TypeScript, Node.js, CSS, Testing, Accessibility | active: JavaScript
select shown   : chips: ["JavaScript","TypeScript","React","Node.js","CSS","Testing","Accessibility"] | said: Added 5. 7 selected.
value order    : Value: ["js","ts","react","node","css","testing","a11y"]
button disabled: true
Backspace      : chips: ["JavaScript","TypeScript","React","Node.js","CSS","Testing"] | said: Accessibility removed. 6 selected.
chip x React   : chips: ["JavaScript","TypeScript","Node.js","CSS","Testing"] | focus on input: true
count          : 5 selected
Escape         : open: false
click again    : open: true
press outside  : open: false
Clear all      : chips: [] | Value: [] | said: Cleared. 0 selected.
\`\`\`

The panel stayed open after Enter, filtering kept the selection marks, Select all shown added only the five unselected matches, the value came out in options order, and focus returned to the input after a chip was removed. The lines are identical to the React and Vue builds.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Roles | \`combobox\` input; \`listbox\` with \`aria-multiselectable="true"\` |
| Chosen vs highlighted | \`[attr.aria-selected]\` vs \`[attr.aria-activedescendant]\` (\`null\` removes it) |
| Chip buttons | \`[attr.aria-label]="'Remove ' + label"\`, tabbable |
| Feedback | \`role="status"\` sentence |
| Focus | Input keeps focus; returns there after removals |
| Empty filter | "No skills match" instead of an empty listbox |

## 6. Common Pitfalls

- **Pushing into the input array** instead of emitting a new one: the parent's signal does not change, and \`computed\` values that depend on it do not rerun.
- **\`box.nativeElement\` in the template**: a template ref on a plain element is the element itself; strict templates reject the call.
- **Closing on every pick**, which turns multi-select into a chore.
- **Output in click order**, so identical selections produce different arrays.
- **Forgetting \`stopPropagation()\`** on the chip button, so removing a chip also reopens the list.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(value)]</code> carries an array of ids; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> turns it into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>, and one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> method normalises to options order, updates the signal, emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueChange</code> and writes the announcement."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Layout:</strong> <span style="color:#f0e2c8;">"Chips and a search input in one control, then a panel with Select all shown, Clear all and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">listbox</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-multiselectable</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Keyboard:</strong> <span style="color:#f0e2c8;">"Arrows move the highlight through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code>, Enter toggles and stays open, Escape closes, Backspace in an empty search removes the last chip."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Focus:</strong> <span style="color:#f0e2c8;">"Options prevent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mousedown</code>, so focus stays in the input; removing a chip focuses the input through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChild</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Closing:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@HostListener</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focusout</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document:mousedown</code> closes it, and Angular removes both listeners on destroy."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it work with Reactive Forms?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ControlValueAccessor</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">writeValue</code> sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueSig</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">registerOnChange</code> stores the callback that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> calls, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">registerOnTouched</code> runs on focus leaving, and provide <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG_VALUE_ACCESSOR</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forwardRef</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you let callers render custom options?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Accept an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Input()</code> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TemplateRef</code> and render it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngTemplateOutlet</code> inside each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">li</code>, passing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">option</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">selected</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">active</code> as context, so the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">li</code> keeps its role and id.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TestBed with a host component bound with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(value)]</code>; click the input, dispatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keydown</code> ArrowDown and Enter, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code>, then assert the host signal holds the normalised array and the chip is rendered.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Large option lists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Virtualize the listbox, for example with the CDK virtual scroll viewport, and keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-setsize</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-posinset</code> on each rendered option.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Set** | Unique values with fast membership checks |
| **Normalisation** | Canonical form: options order |
| **Two-way binding** | \`[(value)]\` = \`[value]\` + \`(valueChange)\` |
| **aria-multiselectable** | Listbox with several chosen options |
| **Focus management** | Where focus goes when elements disappear |
| **Chip** | Removable token for one selected value |

---
**Conclusion:** In Angular the multi-select is a \`[(value)]\` array of ids copied into a signal, a \`computed\` \`Set\` for rendering, one normalising \`set\` method that emits, a panel that stays open on Enter, and \`@HostListener\`s that close it when focus or the pointer leaves. The verified AOT and JIT runs on Angular 22.2.3 match the React and Vue builds line for line.`,
        files: {
          "/src/app/app.component.ts": `import { Component, signal } from "@angular/core";
import { MultiSelectComponent } from "./multi-select.component";
import { SKILLS } from "./skills";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [MultiSelectComponent],
  template: \`
    <main class="page">
      <h1>Your skills</h1>
      <app-multi-select label="Skills" [options]="skills" [(value)]="chosen" />
      <p class="value" data-testid="value">Value: {{ json(chosen()) }}</p>
    </main>
  \`,
  styles: [\`
    :host { display: block; min-height: 100vh; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color-scheme: dark; }
    .page { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
    h1 { font-size: 1.4rem; margin: 0 0 16px; }
    .value { margin-top: 18px; font: 0.85rem ui-monospace, SFMono-Regular, Menlo, monospace; color: #c9cfdd; }
  \`],
})
export class AppComponent {
  readonly skills = SKILLS;
  readonly chosen = signal<string[]>([]);

  json(v: unknown) {
    return JSON.stringify(v);
  }
}
`,
          "/src/app/multi-select.component.ts": `import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild, computed, inject, signal } from "@angular/core";
import { Option, normalize } from "./skills";

let nextId = 0;

@Component({
  selector: "app-multi-select",
  standalone: true,
  template: \`
    <label [for]="base + '-input'" class="label">{{ label }}</label>
    <div class="ms-control" (click)="box.focus()">
      <ul class="chips" [attr.aria-label]="'Selected ' + label" data-testid="chips">
        @for (v of valueSig(); track v) {
          <li class="chip">{{ labelOf(v) }}<button type="button" [attr.aria-label]="'Remove ' + labelOf(v)"
              data-testid="chip-remove" (click)="$event.stopPropagation(); removeChip(v)">×</button></li>
        }
      </ul>
      <input
        #box
        [id]="base + '-input'"
        data-testid="ms-input"
        role="combobox"
        aria-autocomplete="list"
        autocomplete="off"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="listId"
        [attr.aria-activedescendant]="activeOption() ? optionId(activeOption()!) : null"
        [placeholder]="valueSig().length ? '' : 'Pick skills...'"
        [value]="search()"
        (input)="search.set(box.value); open.set(true); active.set(0)"
        (click)="open.set(true)"
        (keydown)="onKeydown($event)"
      />
    </div>
    <p class="count" data-testid="count">{{ valueSig().length }} selected</p>

    @if (open()) {
      <div class="ms-panel" data-testid="ms-panel">
        <div class="ms-actions">
          <button type="button" data-testid="select-shown" [disabled]="allShownSelected()"
            (mousedown)="$event.preventDefault()" (click)="selectShown()">Select all shown</button>
          <button type="button" data-testid="clear-all" [disabled]="valueSig().length === 0"
            (mousedown)="$event.preventDefault()" (click)="set([], 'Cleared.')">Clear all</button>
        </div>
        @if (visible().length === 0) {
          <p class="empty">No skills match</p>
        } @else {
          <ul [id]="listId" role="listbox" aria-multiselectable="true" [attr.aria-label]="label" data-testid="ms-list">
            @for (o of visible(); track o.value; let i = $index) {
              <li
                [id]="optionId(o)"
                role="option"
                class="ms-option"
                [class.active]="i === active()"
                [attr.aria-selected]="selected().has(o.value)"
                (mousemove)="active.set(i)"
                (mousedown)="$event.preventDefault()"
                (click)="toggle(o)"
              ><span class="box" aria-hidden="true">{{ selected().has(o.value) ? "✓" : "" }}</span>{{ o.label }}</li>
            }
          </ul>
        }
      </div>
    }
    <div role="status" class="sr-only" data-testid="ms-status">{{ announcement() }}</div>
  \`,
  styles: [\`
    :host { display: block; position: relative; }
    .label { display: block; font-size: 0.85rem; color: #a9b1c6; margin-bottom: 6px; }
    .ms-control { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px 8px; min-height: 44px; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; cursor: text; }
    .ms-control:focus-within { outline: 2px solid #7aa2ff; outline-offset: 1px; }
    .chips { display: contents; list-style: none; }
    .chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 4px 2px 10px; background: #2f3b66; border-radius: 999px; font-size: 0.85rem; }
    .chip button { width: 22px; height: 22px; border: 0; border-radius: 50%; background: transparent; color: #c9d4ff; cursor: pointer; }
    .chip button:hover, .chip button:focus-visible { background: #4a5a95; color: #fff; }
    .ms-control input { flex: 1; min-width: 100px; padding: 4px; font-size: 1rem; color: inherit; background: transparent; border: 0; outline: none; }
    .count { font-size: 0.8rem; color: #7d859b; margin: 6px 0 0; }
    .ms-panel { position: absolute; left: 0; right: 0; z-index: 10; margin-top: 4px; padding: 4px; background: #1a1d27; border: 1px solid #343a4f; border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); }
    .ms-actions { display: flex; justify-content: space-between; padding: 4px 6px 6px; border-bottom: 1px solid #2a2f3f; }
    .ms-actions button { background: none; border: 0; color: #7aa2ff; cursor: pointer; font-size: 0.85rem; }
    .ms-actions button:disabled { color: #4b5267; cursor: default; }
    .ms-panel ul { list-style: none; margin: 4px 0 0; padding: 0; max-height: 240px; overflow-y: auto; }
    .ms-option { display: flex; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 6px; cursor: pointer; }
    .ms-option.active { background: #262b3a; }
    .box { display: inline-grid; place-items: center; width: 18px; height: 18px; border: 1px solid #5d6478; border-radius: 4px; color: #81c784; font-size: 0.8rem; }
    .empty { margin: 8px 10px; color: #7d859b; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  \`],
})
export class MultiSelectComponent {
  @Input({ required: true }) label = "";
  @Input({ required: true }) set options(list: Option[]) { this.optionsSig.set(list); }
  @Input() set value(v: string[]) { this.valueSig.set(v); }
  @Output() valueChange = new EventEmitter<string[]>();
  @ViewChild("box", { static: true }) box!: ElementRef<HTMLInputElement>;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly base = "ms-" + nextId++;
  readonly listId = this.base + "-list";

  readonly optionsSig = signal<Option[]>([]);
  readonly valueSig = signal<string[]>([]);
  readonly open = signal(false);
  readonly search = signal("");
  readonly active = signal(-1);
  readonly announcement = signal("");

  readonly selected = computed(() => new Set(this.valueSig())); // O(1) lookups while rendering
  readonly visible = computed(() => {
    const q = this.search().trim().toLowerCase();
    return q ? this.optionsSig().filter((o) => o.label.toLowerCase().includes(q)) : this.optionsSig();
  });
  readonly allShownSelected = computed(() => this.visible().every((o) => this.selected().has(o.value)));
  readonly activeOption = computed(() => (this.open() && this.active() >= 0 ? this.visible()[this.active()] ?? null : null));

  labelOf(v: string) {
    return this.optionsSig().find((o) => o.value === v)?.label ?? v;
  }

  optionId(o: Option) {
    return this.base + "-opt-" + o.value;
  }

  set(nextValues: string[], message: string) {
    const next = normalize(this.optionsSig(), nextValues);
    this.valueSig.set(next);
    this.valueChange.emit(next);
    this.announcement.set(message + " " + next.length + " selected.");
  }

  toggle(o: Option) {
    const value = this.valueSig();
    if (this.selected().has(o.value)) this.set(value.filter((v) => v !== o.value), o.label + " removed.");
    else this.set([...value, o.value], o.label + " selected.");
  }

  removeChip(v: string) {
    this.set(this.valueSig().filter((x) => x !== v), this.labelOf(v) + " removed.");
    this.box.nativeElement.focus(); // the chip button is about to disappear
  }

  selectShown() {
    const added = this.visible().filter((o) => !this.selected().has(o.value));
    this.set([...this.valueSig(), ...added.map((o) => o.value)], "Added " + added.length + ".");
  }

  onKeydown(e: KeyboardEvent) {
    const n = this.visible().length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.open.set(true);
      if (n) this.active.update((i) => (i + 1) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.open.set(true);
      if (n) this.active.update((i) => (i <= 0 ? n - 1 : i - 1));
    } else if (e.key === "Enter") {
      const o = this.activeOption();
      if (o) {
        e.preventDefault(); // stay open: several picks in a row
        this.toggle(o);
      }
    } else if (e.key === "Escape") {
      this.open.set(false);
      this.active.set(-1);
    } else if (e.key === "Backspace" && this.search() === "" && this.valueSig().length) {
      const value = this.valueSig();
      this.removeChip(value[value.length - 1]);
    }
  }

  @HostListener("focusout", ["$event"])
  onFocusout(e: FocusEvent) {
    if (!this.host.nativeElement.contains(e.relatedTarget as Node | null)) this.open.set(false);
  }

  @HostListener("document:mousedown", ["$event"])
  onDocumentDown(e: MouseEvent) {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
  }
}
`,
          "/src/app/skills.ts": `export interface Option { value: string; label: string; }

export const SKILLS: Option[] = [
  { value: "js", label: "JavaScript" },
  { value: "ts", label: "TypeScript" },
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "angular", label: "Angular" },
  { value: "node", label: "Node.js" },
  { value: "graphql", label: "GraphQL" },
  { value: "css", label: "CSS" },
  { value: "testing", label: "Testing" },
  { value: "a11y", label: "Accessibility" },
];

// The value is always kept in the options order, whatever order things were clicked in.
export function normalize(options: Option[], values: string[]): string[] {
  const set = new Set(values);
  return options.filter((o) => set.has(o.value)).map((o) => o.value);
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Transfer List",
    seoDescription:
      "Build a dual-list transfer component: check items, move them between panels, check-all with indeterminate state, per-side filters and stable master order.",
    description: `**Question presented to candidate:**
"Our report builder lets users pick which columns appear in an export. Build a transfer list: available columns on the left, chosen columns on the right, checkboxes to mark items, and buttons to move the checked ones across, or everything at once."

**Requirements:**
- Two panels, "Available" and "Chosen", each with a list of checkboxes, a filter box and a header checkbox that checks every item currently shown.
- The header checkbox is checked when all shown items are checked, unchecked when none are, and **indeterminate** when only some are.
- Four buttons: move all shown right, move checked right, move checked left, move all shown left; each is disabled when it would do nothing.
- Items keep the original (master) order on both sides, whatever order they were moved in; moved items arrive unchecked.
- The component is controlled: the parent receives the ids on the right as an array, in master order.

**What a strong answer should cover:**
- A single source of truth: one master list plus the set of chosen ids, with both panels **derived** from it instead of two arrays that are spliced back and forth.
- A \`Set\` of checked ids, filtering that applies only to what is shown, and moves that act on the shown and checked items.
- The \`indeterminate\` state is a DOM property with no HTML attribute, so it must be set through a ref (React) or a property binding (Vue / Angular).
- Disabled logic derived from the same data, and accessible labels for the icon buttons and checkboxes.
- Splitting a stateful container from a presentational panel used twice.

**Clarifying questions expected:**
- "Should the chosen side keep the master order or the order items were moved in?"
- "Do 'move all' buttons act on everything or only on the filtered items?"
- "Should the chosen list be reorderable?"

**Code / implementation expected:** Yes. A controlled transfer-list component built from a reusable panel component.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round. Assumes React state, props and lists; derived state, sets and the indeterminate checkbox are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. The Verified output was produced by running the solution on React 19.3.1 (StrictMode) in jsdom with a driver that clicked checkboxes, typed into the filters and pressed the move buttons.

## 1. Why This Even Matters — A Story First

Picture packing for a trip with two piles on the bed: "staying home" and "in the suitcase". You tick a few things on your list, carry them across, change your mind about the umbrella and carry it back. A sensible packing list never reshuffles itself: socks are always above the toothbrush, whichever pile they are in.

A **transfer list** is that bed with two piles. Report builders use it to choose export columns, admin panels to assign permissions, and dashboards to pick widgets. It looks like a junior exercise ("two arrays, splice between them"), and that is exactly why interviewers like it: the splice-based version breaks in five small ways (order drift, stale checks, filters fighting with moves, wrong disabled states, a header checkbox that lies), while a version built on **one source of truth** has none of those bugs. It is the bulk-move cousin of the [multi-select dropdown](/interview-question/build-a-custom-multi-select-dropdown), which picks from a list without moving anything.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does the chosen side keep master order or move order? | Master order lets both sides be derived; move order needs an ordered array and usually reordering controls. |
| Do "move all" buttons act on everything or only the filtered items? | "All shown" is predictable; moving hidden items surprises users. |
| Must the chosen list be reorderable? | Adds up / down buttons or drag and drop, and a different value model. |
| How many items? | Hundreds are fine; tens of thousands need virtualization and a search on the server. |
| Who owns the value? | A form usually wants a controlled component that reports the chosen ids. |
| Are some items locked (always chosen)? | Then moves must skip them and the header checkbox must ignore them. |

## 3. Requirements and Plan

The parent owns \`value\`, the ids on the right. \`TransferList\` owns UI-only state, and a presentational \`TransferPanel\` renders each side.

| Value | Kind | Note |
| :--- | :--- | :--- |
| \`items\` | prop | master list, fixed order |
| \`value\` | prop | ids on the right, from the parent |
| \`checked\` | state | a \`Set\` of checked ids, both sides |
| \`leftFilter\`, \`rightFilter\` | state | text in each filter box |
| \`left\`, \`right\` | derived | \`items\` split by membership in \`value\` |
| \`leftShown\`, \`rightShown\` | derived | each side after its filter |
| \`leftChecked\`, \`rightChecked\` | derived | shown items that are checked |

<svg class="iq-diagram" width="100%" viewBox="0 0 680 360" role="img" aria-label="Derivation: items and value produce left and right, and each filter produces the shown list for its side">
  <defs>
    <marker id="q7r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="20" width="260" height="64" rx="12"/>
  <text class="d-text d-accent" x="170" y="47" text-anchor="middle">items</text>
  <text class="d-sub" x="170" y="69" text-anchor="middle">master order, never changes</text>
  <rect class="d-box-accent" x="380" y="20" width="260" height="64" rx="12"/>
  <text class="d-text d-accent" x="510" y="47" text-anchor="middle">value</text>
  <text class="d-sub" x="510" y="69" text-anchor="middle">ids on the right, from parent</text>
  <path class="d-edge" d="M 170 84 L 170 146" marker-end="url(#q7r-arrow)"/>
  <path class="d-edge" d="M 250 84 L 470 146" marker-end="url(#q7r-arrow)"/>
  <path class="d-edge-dashed" d="M 510 84 L 510 146" marker-end="url(#q7r-arrow)"/>
  <path class="d-edge-dashed" d="M 430 84 L 230 146" marker-end="url(#q7r-arrow)"/>
  <rect class="d-box" x="40" y="154" width="260" height="64" rx="12"/>
  <text class="d-text" x="170" y="181" text-anchor="middle">left</text>
  <text class="d-sub" x="170" y="203" text-anchor="middle">items not in value</text>
  <rect class="d-box" x="380" y="154" width="260" height="64" rx="12"/>
  <text class="d-text" x="510" y="181" text-anchor="middle">right</text>
  <text class="d-sub" x="510" y="203" text-anchor="middle">items in value</text>
  <path class="d-edge" d="M 170 218 L 170 280" marker-end="url(#q7r-arrow)"/>
  <text class="d-sub" x="186" y="254">leftFilter</text>
  <path class="d-edge" d="M 510 218 L 510 280" marker-end="url(#q7r-arrow)"/>
  <text class="d-sub" x="526" y="254">rightFilter</text>
  <rect class="d-box-muted" x="40" y="288" width="260" height="56" rx="12"/>
  <text class="d-text" x="170" y="321" text-anchor="middle">leftShown</text>
  <rect class="d-box-muted" x="380" y="288" width="260" height="56" rx="12"/>
  <text class="d-text" x="510" y="321" text-anchor="middle">rightShown</text>
</svg>

Only \`items\`, \`value\`, \`checked\` and the two filters are stored. Everything in the lower rows is recomputed on each render, so the two panels can never disagree about who is where, and a move is just "write a new \`value\`".

📌 **Interview term: Single source of truth** — every fact lives in exactly one place; anything else is computed from it. Two arrays that you splice between are two sources of truth that can drift apart.

📌 **Interview term: Derived state** — values computed during render from props and state instead of being stored. Storing \`left\` and \`right\` in \`useState\` would need syncing code; deriving them needs none.

📌 **Interview term: Lifting state up** — moving state to the closest common parent so siblings share it. \`checked\` and both filters live in \`TransferList\`, not in each panel, because the move buttons between the panels need them; see [lifting state up](/interview-question/explain-the-concept-of-lifting-state-up-in-react).

## 4. Build It Step by Step

### Step 1: derive both sides from the master list

\`\`\`js
const chosen = new Set(value);
const left = items.filter((i) => !chosen.has(i.id));
const right = items.filter((i) => chosen.has(i.id));
const leftShown = left.filter((i) => matches(i, leftFilter));
const rightShown = right.filter((i) => matches(i, rightFilter));
const leftChecked = leftShown.filter((i) => checked.has(i.id));
const rightChecked = rightShown.filter((i) => checked.has(i.id));
\`\`\`

Because both lists are \`items.filter(...)\`, they are always in master order. The \`Set\` makes each membership check O(1), so the whole derivation is O(n) per render. With eight report columns this is nothing; for thousands, wrap it in \`useMemo\` keyed on \`items\`, \`value\`, \`checked\` and the filters.

📌 **Interview term: Set** — a JavaScript collection of unique values with O(1) \`has\`, \`add\` and \`delete\`.

### Step 2: checking with immutable updates

\`\`\`js
const [checked, setChecked] = useState(() => new Set());

function toggle(id) {
  setChecked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
}

function toggleAll(shown) {
  const allOn = shown.every((i) => checked.has(i.id));
  setChecked((prev) => {
    const next = new Set(prev);
    for (const i of shown) { if (allOn) next.delete(i.id); else next.add(i.id); }
    return next;
  });
}
\`\`\`

Each update copies the \`Set\`. Calling \`prev.add(id)\` and returning \`prev\` would keep the same reference, and React would skip the re-render because \`Object.is(prev, next)\` is true; see [why state updates must be immutable](/interview-question/why-must-react-state-updates-be-immutable). The lazy initializer \`() => new Set()\` builds the set once instead of on every render.

\`toggleAll\` follows the common header-checkbox rule: if every shown item is already checked, uncheck them; otherwise (none or some checked) check them all. It acts on \`shown\`, so a filter limits it.

📌 **Interview term: Functional update** — passing a function to the setter (\`setChecked(prev => ...)\`) so the update is computed from the latest state, not from a value captured by an older render.

### Step 3: moving keeps master order

\`\`\`js
function move(moving, toRight) {
  const ids = new Set(moving.map((i) => i.id));
  const nextChosen = toRight ? new Set([...value, ...ids]) : new Set(value.filter((id) => !ids.has(id)));
  onChange(items.filter((i) => nextChosen.has(i.id)).map((i) => i.id)); // master order
  setChecked((prev) => new Set([...prev].filter((id) => !ids.has(id)))); // moved = unchecked
}
\`\`\`

The four buttons call \`move(leftShown, true)\`, \`move(leftChecked, true)\`, \`move(rightChecked, false)\` and \`move(rightShown, false)\`. Building the next value with \`items.filter\` is what puts "Name" before "Email" even though "Name" was moved later; the run below prints exactly that. Moved items are unchecked so that nothing on the new side arrives pre-checked and gets bounced straight back by the next click.

The component is **controlled**: it never stores \`value\` itself, it calls \`onChange\` and waits for the parent to pass the new array back. See [controlled vs uncontrolled components](/interview-question/what-is-the-difference-between-controlled-and-uncontrolled-components).

📌 **Interview term: Controlled component** — a component whose value comes from props and whose changes are reported through a callback, so the parent always holds the truth.

### Step 4: the panel and the indeterminate checkbox

\`\`\`js
export default function TransferPanel({ title, side, total, items, checked, filter, onFilter, onToggle, onToggleAll }) {
  const allRef = useRef(null);
  const checkedCount = items.filter((i) => checked.has(i.id)).length;
  const all = items.length > 0 && checkedCount === items.length;
  const some = checkedCount > 0 && !all;

  // \`indeterminate\` is a DOM property with no HTML attribute: set it by hand.
  useEffect(() => {
    allRef.current.indeterminate = some;
  }, [some]);
  ...
  <input ref={allRef} type="checkbox" checked={all} disabled={items.length === 0}
    onChange={onToggleAll} aria-label={"Check all shown in " + title} />
\`\`\`

A checkbox has three visual states, but only two (\`checked\`) can be set from markup. The third, the dash that means "some", exists only as the \`indeterminate\` property in JavaScript. Two checks run while writing this doc, both in jsdom with React 19.3.1:

- An \`indeterminate\` attribute written in HTML left the property \`false\`.
- \`<input type="checkbox" indeterminate={true} />\` did not set the property either, and React logged "Received \`true\` for a non-boolean attribute \`indeterminate\`".

So the property has to be set through a ref after render. That is what \`useEffect\` with \`[some]\` does, and the driver read \`indeterminate === true\` back from the DOM node.

📌 **Interview term: Indeterminate checkbox** — the "partially selected" state of a header checkbox, shown as a dash. It is presentation only: the box still submits as unchecked, and clicking it fires a normal change.

📌 **Interview term: Presentational component** — a component with no state of its own that renders props and reports events. \`TransferPanel\` is rendered twice with different props.

### Step 5: disabled states and labels

\`\`\`js
<button type="button" aria-label="Move all shown to Chosen" disabled={leftShown.length === 0} onClick={() => move(leftShown, true)}>»</button>
<button type="button" aria-label="Move checked to Chosen" disabled={leftChecked.length === 0} onClick={() => move(leftChecked, true)}>›</button>
<button type="button" aria-label="Move checked to Available" disabled={rightChecked.length === 0} onClick={() => move(rightChecked, false)}>‹</button>
<button type="button" aria-label="Move all shown to Available" disabled={rightShown.length === 0} onClick={() => move(rightShown, false)}>«</button>
\`\`\`

Every \`disabled\` comes from the same derived arrays that the click uses, so a button is enabled exactly when its click would move something. The arrow glyphs mean nothing to a screen reader, so each button has an \`aria-label\`, and the four sit in a \`role="group"\` labelled "Move columns". Each panel is a \`<section aria-labelledby>\` pointing at its title, and its tally ("2/8 checked, 8 total") gives the same information the header checkbox shows visually.

## 5. Verified: What the Driver Printed

Lines list item labels in DOM order; "Value" is the parent's paragraph.

\`\`\`
start        : left ["Name","Email","Role","Team","Location","Start date","Manager","Status"] | right []
buttons      : to-right-all:on to-right:off to-left:off to-left-all:off
check Team, Email: to-right-all:on to-right:on to-left:off to-left-all:off | left header: indeterminate, 2/8 checked, 8 total
move right   : right ["Email","Team"] | Value: ["email","team"]
move Name    : right ["Name","Email","Team"] (master order, not click order)
filter at    : left shows ["Location","Start date","Status"] | unchecked, 0/3 checked, 5 total
move all shown: right ["Name","Email","Team","Location","Start date","Status"]
clear filter : left ["Role","Manager"]
check Team   : right header: indeterminate, 1/6 checked, 6 total
click header : right header: checked, 6/6 checked, 6 total
click again  : right header: unchecked, 0/6 checked, 6 total | to-right-all:on to-right:off to-left:off to-left-all:on
move back    : left ["Email","Role","Manager","Status"] | right ["Name","Team","Location","Start date"]
value        : Value: ["name","team","location","start"]
all left     : right [] | Value: [] | to-right-all:on to-right:off to-left:off to-left-all:off
\`\`\`

What this proves:

- Team and Email were checked in that order but arrived as \`["email","team"]\`, and Name moved later still landed first.
- The header checkbox went through all three states and the click rule (some, then all, then none) held.
- With the filter "at", "move all shown" moved the three visible items and left Role and Manager behind.
- "move back" (Email and Status checked, then ‹) returned them to their master positions on the left.
- Every disabled state matched what the button could do.

The Vue and Angular builds printed identical lines; there was no console error or warning in any run.

## 6. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Empty side | "Nothing here" row; header checkbox disabled; move buttons disabled |
| Filter hides checked items | They stay in \`checked\` but are not moved: moves use \`leftChecked\`, derived from \`leftShown\` |
| Header state | \`checked\` when all shown, \`indeterminate\` when some, plain when none |
| Icon buttons | \`aria-label\` on each; \`role="group"\` with a label around them |
| Panels | \`<section aria-labelledby>\`; tally text for counts |
| Filter inputs | \`type="search"\` with \`aria-label="Filter Available"\` |
| Narrow screens | Grid collapses to one column; buttons switch to a row |

## 7. Common Pitfalls

- **Two arrays spliced back and forth.** Order drifts with every move and the two arrays can disagree; derive both from \`items\` and \`value\`.
- **\`indeterminate\` as a prop or attribute.** Neither sets the DOM property (verified above); use a ref and an effect.
- **Mutating the checked \`Set\`** (\`prev.add(id); return prev\`): same reference, so React skips the re-render.
- **"Move all" acting on hidden items**, or a header checkbox that counts hidden items, so a filtered view shows "all checked" while hidden items are not.
- **Leaving moved items checked**, so the next click on the opposite button sends them straight back.
- **Disabled logic written separately from the click logic**, so a button is enabled while its click does nothing.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data model:</strong> <span style="color:#f0e2c8;">"The parent owns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code>, the ids on the right. I keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of checked ids and two filter strings, and derive both sides from the master <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items</code>, so order never drifts."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Derivation:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> split <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items</code> by membership, the filters give the shown lists, and the checked-and-shown lists drive the two single-arrow buttons."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Moves:</strong> <span style="color:#f0e2c8;">"A move builds the next chosen set, writes it back in master order through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code>, and unchecks the moved ids."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Header checkbox:</strong> <span style="color:#f0e2c8;">"Checked when every shown item is checked, indeterminate when some are; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">indeterminate</code> is a DOM property, so I set it in an effect through a ref."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Polish:</strong> <span style="color:#f0e2c8;">"Disabled states come from the same arrays as the clicks, icon buttons get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-label</code>s, and each panel is a labelled section with a count."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not store <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">left</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">right</code> in state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then every move has to update two arrays and keep them in sync with the parent. Deriving them from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> is cheaper to reason about and keeps master order for free.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support reordering the chosen side?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> the ordered source for the right side (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value.map(id =&gt; byId.get(id))</code>), append on move instead of re-sorting, and add up / down buttons or drag and drop that reorder <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">React Testing Library: click checkboxes by label, click the button by its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-label</code>, assert the order of items in each section with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">within</code>, and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">checkbox.indeterminate</code> on the header.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for 10,000 items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo</code> around the derivation, a virtualized list in each panel, a debounced filter, and probably server-side search for the available side.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add keyboard shortcuts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Space already toggles a focused checkbox. Optional extras such as Enter to move are custom shortcuts, so announce them and keep the buttons as the primary path.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Single source of truth** | Each fact stored once, everything else computed |
| **Derived state** | Values computed during render, not stored |
| **Lifting state up** | Shared state moved to the closest common parent |
| **Set** | Unique values with fast membership checks |
| **Functional update** | Setter that receives the previous state |
| **Controlled component** | Value from props, changes through a callback |
| **Indeterminate checkbox** | Header "some selected" state, a DOM property |
| **Presentational component** | Stateless renderer used with different props |

---
**Conclusion:** A good transfer list stores very little: the master items, the chosen ids, a set of checked ids and two filters. Everything else, both panels, what is shown, what can move and what the header checkbox shows, is derived each render, so order never drifts and disabled states never lie. The indeterminate header needs a ref because it is a property without an attribute. The verified run on React 19.3.1 shows master order kept through mixed moves, filtered bulk moves and all three header states, identical to the Vue and Angular builds.`,
        files: {
          "/App.js": `import { useState } from "react";
import TransferList from "./src/TransferList";
import { COLUMNS } from "./src/columns";

export default function App() {
  const [chosen, setChosen] = useState([]);
  return (
    <main className="page">
      <h1>Report columns</h1>
      <TransferList items={COLUMNS} value={chosen} onChange={setChosen} />
      <p className="value" data-testid="value">Value: {JSON.stringify(chosen)}</p>
    </main>
  );
}
`,
          "/src/columns.js": `// The master list. Its order is the order both sides always show.
export const COLUMNS = [
  { id: "name", label: "Name" },
  { id: "email", label: "Email" },
  { id: "role", label: "Role" },
  { id: "team", label: "Team" },
  { id: "location", label: "Location" },
  { id: "start", label: "Start date" },
  { id: "manager", label: "Manager" },
  { id: "status", label: "Status" },
];

export function matches(item, filter) {
  const q = filter.trim().toLowerCase();
  return !q || item.label.toLowerCase().includes(q);
}
`,
          "/src/TransferList.js": `import { useState } from "react";
import TransferPanel from "./TransferPanel";
import { matches } from "./columns";

// \`value\` = ids on the right. Both lists are DERIVED from \`items\` (master
// order), so moving things never reorders them.
export default function TransferList({ items, value, onChange }) {
  const [checked, setChecked] = useState(() => new Set());
  const [leftFilter, setLeftFilter] = useState("");
  const [rightFilter, setRightFilter] = useState("");

  const chosen = new Set(value);
  const left = items.filter((i) => !chosen.has(i.id));
  const right = items.filter((i) => chosen.has(i.id));
  const leftShown = left.filter((i) => matches(i, leftFilter));
  const rightShown = right.filter((i) => matches(i, rightFilter));
  const leftChecked = leftShown.filter((i) => checked.has(i.id));
  const rightChecked = rightShown.filter((i) => checked.has(i.id));

  function toggle(id) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll(shown) {
    const allOn = shown.every((i) => checked.has(i.id));
    setChecked((prev) => {
      const next = new Set(prev);
      for (const i of shown) { if (allOn) next.delete(i.id); else next.add(i.id); }
      return next;
    });
  }

  function move(moving, toRight) {
    const ids = new Set(moving.map((i) => i.id));
    const nextChosen = toRight ? new Set([...value, ...ids]) : new Set(value.filter((id) => !ids.has(id)));
    onChange(items.filter((i) => nextChosen.has(i.id)).map((i) => i.id)); // master order
    setChecked((prev) => new Set([...prev].filter((id) => !ids.has(id)))); // moved = unchecked
  }

  return (
    <div className="transfer">
      <TransferPanel title="Available" side="left" total={left.length} items={leftShown} checked={checked}
        filter={leftFilter} onFilter={setLeftFilter} onToggle={toggle} onToggleAll={() => toggleAll(leftShown)} />

      <div className="moves" role="group" aria-label="Move columns">
        <button type="button" data-testid="to-right-all" aria-label="Move all shown to Chosen" disabled={leftShown.length === 0} onClick={() => move(leftShown, true)}>»</button>
        <button type="button" data-testid="to-right" aria-label="Move checked to Chosen" disabled={leftChecked.length === 0} onClick={() => move(leftChecked, true)}>›</button>
        <button type="button" data-testid="to-left" aria-label="Move checked to Available" disabled={rightChecked.length === 0} onClick={() => move(rightChecked, false)}>‹</button>
        <button type="button" data-testid="to-left-all" aria-label="Move all shown to Available" disabled={rightShown.length === 0} onClick={() => move(rightShown, false)}>«</button>
      </div>

      <TransferPanel title="Chosen" side="right" total={right.length} items={rightShown} checked={checked}
        filter={rightFilter} onFilter={setRightFilter} onToggle={toggle} onToggleAll={() => toggleAll(rightShown)} />
    </div>
  );
}
`,
          "/src/TransferPanel.js": `import { useEffect, useRef } from "react";

// Presentational: renders one side. All state lives in TransferList.
export default function TransferPanel({ title, side, total, items, checked, filter, onFilter, onToggle, onToggleAll }) {
  const allRef = useRef(null);
  const checkedCount = items.filter((i) => checked.has(i.id)).length;
  const all = items.length > 0 && checkedCount === items.length;
  const some = checkedCount > 0 && !all;

  // \`indeterminate\` is a DOM property with no HTML attribute: set it by hand.
  useEffect(() => {
    allRef.current.indeterminate = some;
  }, [some]);

  return (
    <section className="panel" aria-labelledby={side + "-title"} data-testid={side}>
      <header className="panel-head">
        <label className="all">
          <input ref={allRef} type="checkbox" data-testid={side + "-all"} checked={all}
            disabled={items.length === 0} onChange={onToggleAll} aria-label={"Check all shown in " + title} />
          <span id={side + "-title"}>{title}</span>
        </label>
        <span className="tally" data-testid={side + "-tally"}>{checkedCount}/{items.length} checked, {total} total</span>
      </header>
      <input className="filter" type="search" placeholder="Filter" data-testid={side + "-filter"}
        aria-label={"Filter " + title} value={filter} onChange={(e) => onFilter(e.target.value)} />
      <ul className="items">
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input type="checkbox" data-testid={side + "-item"} checked={checked.has(item.id)} onChange={() => onToggle(item.id)} />
              {item.label}
            </label>
          </li>
        ))}
        {items.length === 0 && <li className="none">Nothing here</li>}
      </ul>
    </section>
  );
}
`,
          "/styles.css": `:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
.page { max-width: 760px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 1.4rem; margin: 0 0 16px; }
.transfer { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: start; }
.panel { background: #1a1d27; border: 1px solid #343a4f; border-radius: 10px; padding: 10px; min-width: 0; }
.panel-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
.all { display: flex; gap: 8px; align-items: center; font-weight: 600; }
.tally { font-size: 0.75rem; color: #7d859b; }
.filter { width: 100%; padding: 6px 8px; margin-bottom: 6px; color: inherit; background: #11131a; border: 1px solid #343a4f; border-radius: 6px; }
.items { list-style: none; margin: 0; padding: 0; max-height: 260px; overflow-y: auto; }
.items label { display: flex; gap: 8px; align-items: center; padding: 6px 4px; border-radius: 6px; cursor: pointer; }
.items label:hover { background: #262b3a; }
.none { padding: 6px 4px; color: #5d6478; font-size: 0.9rem; }
.moves { display: flex; flex-direction: column; gap: 8px; padding-top: 70px; }
.moves button { width: 44px; height: 36px; font-size: 1.2rem; border: 1px solid #343a4f; border-radius: 8px; background: #22263a; color: #e6e8ee; cursor: pointer; }
.moves button:disabled { opacity: 0.35; cursor: not-allowed; }
.moves button:focus-visible, .panel input:focus-visible { outline: 2px solid #7aa2ff; outline-offset: 1px; }
.value { margin-top: 18px; font: 0.85rem ui-monospace, SFMono-Regular, Menlo, monospace; color: #c9cfdd; overflow-wrap: anywhere; }
@media (max-width: 560px) {
  .transfer { grid-template-columns: 1fr; }
  .moves { flex-direction: row; justify-content: center; padding-top: 0; }
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers preparing for a machine coding round. Assumes props, emits, \`computed\` and \`v-for\`; derived state, reactive sets and the indeterminate checkbox are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The Verified output came from compiling the SFCs with @vue/compiler-sfc and mounting them on Vue 3.5.44 in jsdom, with a driver that clicked checkboxes, typed into the filters and pressed the move buttons.

## 1. A Story First

Packing for a trip, you keep two piles on the bed: "staying home" and "in the suitcase". You tick a few things, carry them across, then carry the umbrella back. A good packing list never reshuffles: socks are always above the toothbrush, whichever pile they are in. A **transfer list** is that bed. The naive build splices between two arrays and slowly scrambles the order; the robust build stores **one** list plus the chosen ids and computes both piles. It is the bulk-move cousin of the [multi-select dropdown](/interview-question/build-a-custom-multi-select-dropdown).

## 2. The Plan in Vue Terms

\`App.vue\`: \`const chosen = ref([])\` and \`<TransferList v-model="chosen" :items="COLUMNS" />\`.

| Piece | Vue tool |
| :--- | :--- |
| Chosen ids (right side) | \`modelValue\` prop + \`emit("update:modelValue")\` |
| Checked ids | \`ref(new Set())\`, mutated in place |
| Filter text per side | \`ref("")\`, passed to each panel with \`v-model:filter\` |
| \`left\`, \`right\`, shown and checked lists | \`computed\` |
| Indeterminate header | \`:indeterminate\` on the checkbox |

\`\`\`js
const chosen = computed(() => new Set(props.modelValue));
const left = computed(() => props.items.filter((i) => !chosen.value.has(i.id)));
const right = computed(() => props.items.filter((i) => chosen.value.has(i.id)));
const leftShown = computed(() => left.value.filter((i) => matches(i, leftFilter.value)));
const rightShown = computed(() => right.value.filter((i) => matches(i, rightFilter.value)));
const leftChecked = computed(() => leftShown.value.filter((i) => checked.value.has(i.id)));
const rightChecked = computed(() => rightShown.value.filter((i) => checked.value.has(i.id)));
\`\`\`

📌 **Interview term: Single source of truth** — each fact is stored once. Both panels are \`items.filter(...)\`, so they are always in master order and can never disagree.

📌 **Interview term: Derived state** — values computed from other state. In Vue that is \`computed\`, which caches the result and recomputes only when a dependency changes; see [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch).

## 3. Build It Step by Step

### Step 1: a reactive Set for checked ids

\`\`\`js
const checked = ref(new Set()); // Vue 3 tracks Set.add / delete / has

function toggle(id) {
  if (checked.value.has(id)) checked.value.delete(id);
  else checked.value.add(id);
}
function toggleAll(shown) {
  const allOn = shown.every((i) => checked.value.has(i.id));
  for (const i of shown) {
    if (allOn) checked.value.delete(i.id);
    else checked.value.add(i.id);
  }
}
\`\`\`

Unlike React, Vue 3 can mutate the \`Set\` in place: its reactive proxy has collection handlers that track \`has\` and trigger on \`add\` and \`delete\`. The run proves it: the \`leftChecked\` computed and the "2/8 checked" tally updated after each click without the set ever being replaced.

📌 **Interview term: Reactive collection** — a \`Map\` or \`Set\` wrapped by \`reactive()\` (here through \`ref\`) so reads are tracked and mutations trigger updates.

### Step 2: moving keeps master order

\`\`\`js
function move(moving, toRight) {
  const ids = new Set(moving.map((i) => i.id));
  const nextChosen = toRight
    ? new Set([...props.modelValue, ...ids])
    : new Set(props.modelValue.filter((id) => !ids.has(id)));
  emit("update:modelValue", props.items.filter((i) => nextChosen.has(i.id)).map((i) => i.id)); // master order
  for (const id of ids) checked.value.delete(id); // moved = unchecked
}
\`\`\`

The component never mutates \`modelValue\`; it emits a new array in master order and lets the parent pass it back. See [v-model on components](/interview-question/how-does-v-model-work-on-components).

### Step 3: a presentational panel with \`v-model:filter\`

\`\`\`html
<TransferPanel v-model:filter="leftFilter" title="Available" side="left" :total="left.length"
  :items="leftShown" :checked="checked" @toggle="toggle" @toggle-all="toggleAll(leftShown)" />
\`\`\`

Inside the panel:

\`\`\`js
const props = defineProps({ title: String, side: String, total: Number, items: Array, checked: Set, filter: String });
const emit = defineEmits(["update:filter", "toggle", "toggle-all"]);
\`\`\`

\`\`\`html
<input type="search" :value="filter" :aria-label="'Filter ' + title"
  @input="emit('update:filter', $event.target.value)" />
\`\`\`

\`v-model:filter\` is the named form of component \`v-model\`: it passes a \`filter\` prop and listens for \`update:filter\`. The panel owns no state, so both filter strings live in \`TransferList\`, next to the buttons that depend on them.

📌 **Interview term: Named v-model** — \`v-model:name\` binds the \`name\` prop and the \`update:name\` event, so one component can expose several two-way values.

### Step 4: the indeterminate header checkbox

\`\`\`js
const checkedCount = computed(() => props.items.filter((i) => props.checked.has(i.id)).length);
const all = computed(() => props.items.length > 0 && checkedCount.value === props.items.length);
const some = computed(() => checkedCount.value > 0 && !all.value);
\`\`\`

\`\`\`html
<input type="checkbox" :checked="all" :indeterminate="some" :disabled="items.length === 0"
  :aria-label="'Check all shown in ' + title" @change="emit('toggle-all')" />
\`\`\`

\`indeterminate\` is a DOM property with no HTML attribute; an \`indeterminate\` attribute in markup leaves the property \`false\` (checked in jsdom). Vue's runtime sets a binding as a DOM property when the element has a property of that name, so \`:indeterminate="some"\` works with no ref; the driver read \`indeterminate === true\` from the node. React needs a ref and an effect for the same thing.

📌 **Interview term: Indeterminate checkbox** — the "some selected" dash on a header checkbox. Presentation only: the box still submits as unchecked.

### Step 5: disabled states and labels

\`\`\`html
<button type="button" aria-label="Move checked to Chosen" :disabled="leftChecked.length === 0" @click="move(leftChecked, true)">›</button>
\`\`\`

Every \`:disabled\` reads the same \`computed\` the click uses, so a button is enabled exactly when its click would move something. Each arrow button has an \`aria-label\`, the four sit in a labelled \`role="group"\`, and each panel is a \`<section>\` labelled by its title.

## 4. Verified: What the Driver Printed

\`\`\`
start        : left ["Name","Email","Role","Team","Location","Start date","Manager","Status"] | right []
buttons      : to-right-all:on to-right:off to-left:off to-left-all:off
check Team, Email: to-right-all:on to-right:on to-left:off to-left-all:off | left header: indeterminate, 2/8 checked, 8 total
move right   : right ["Email","Team"] | Value: ["email","team"]
move Name    : right ["Name","Email","Team"] (master order, not click order)
filter at    : left shows ["Location","Start date","Status"] | unchecked, 0/3 checked, 5 total
move all shown: right ["Name","Email","Team","Location","Start date","Status"]
clear filter : left ["Role","Manager"]
check Team   : right header: indeterminate, 1/6 checked, 6 total
click header : right header: checked, 6/6 checked, 6 total
click again  : right header: unchecked, 0/6 checked, 6 total | to-right-all:on to-right:off to-left:off to-left-all:on
move back    : left ["Email","Role","Manager","Status"] | right ["Name","Team","Location","Start date"]
value        : Value: ["name","team","location","start"]
all left     : right [] | Value: [] | to-right-all:on to-right:off to-left:off to-left-all:off
\`\`\`

Master order held through mixed moves (Team and Email checked in that order arrived as \`["email","team"]\`), the filtered "move all shown" left Role and Manager behind, and the header went through all three states. These lines are identical to the React and Angular builds, with no Vue warnings.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Empty side | "Nothing here" row; header and buttons disabled |
| Filter hides checked items | They stay in \`checked\` but are not moved: moves use the shown lists |
| Header state | \`:checked\` all, \`:indeterminate\` some |
| Icon buttons | \`aria-label\`s inside a labelled \`role="group"\` |
| Panels | \`<section :aria-labelledby>\` and a count tally |

## 6. Common Pitfalls

- **Two arrays spliced back and forth**, so order drifts and the sides disagree.
- **Mutating \`props.modelValue\`** with \`push\` or \`splice\`: Vue warns and the parent's array changes behind its back.
- **Keeping filter state inside each panel**, so the parent cannot compute shown lists for the buttons.
- **"Move all" acting on hidden items** or a header that counts them.
- **Leaving moved items checked**, so the next opposite click bounces them back.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data model:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> carries the chosen ids; inside I keep a reactive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of checked ids and two filter refs, and derive both sides from the master <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Derivation:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> split <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items</code> by membership, filters give the shown lists, and checked-and-shown lists drive the single-arrow buttons."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Moves:</strong> <span style="color:#f0e2c8;">"A move builds the next chosen set, emits it in master order, and deletes the moved ids from the checked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Panel:</strong> <span style="color:#f0e2c8;">"A presentational <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TransferPanel</code> used twice, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model:filter</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggle</code> events; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:indeterminate</code> binds the DOM property directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Polish:</strong> <span style="color:#f0e2c8;">"Disabled states read the same computeds as the clicks, and icon buttons and panels have accessible names."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does mutating the Set work here but not in React?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue wraps the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> in a reactive proxy that tracks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code> and triggers on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code>. React compares state by reference, so a mutated set looks unchanged.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defineModel</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes in real code: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const model = defineModel({ default: () =&gt; [] })</code> in the list and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel("filter")</code> in the panel replace the props and emits.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue Test Utils: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue(true)</code> on item checkboxes, click a button found by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-label</code>, assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emitted("update:modelValue")</code> holds master-order ids, and check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">element.indeterminate</code> on the header.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for 10,000 items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Virtualize each list, debounce the filters, and keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> (it already caches); consider server-side search for the available side.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Single source of truth** | Each fact stored once |
| **Derived state** | \`computed\` values, not stored |
| **Reactive collection** | \`Set\` / \`Map\` whose mutations trigger updates |
| **Named v-model** | \`v-model:x\` = \`x\` prop + \`update:x\` event |
| **Indeterminate checkbox** | Header "some selected" state, a DOM property |

---
**Conclusion:** In Vue the transfer list is a \`v-model\` array of chosen ids, a reactive \`Set\` of checked ids, two filter refs shared through \`v-model:filter\`, and \`computed\` lists derived from one master array, so order never drifts. \`:indeterminate\` binds the DOM property directly. The verified run on Vue 3.5.44 matches the React and Angular builds line for line.`,
        files: {
          "/src/App.vue": `<script setup>
import { ref } from "vue";
import TransferList from "./components/TransferList.vue";
import { COLUMNS } from "./columns.js";

const chosen = ref([]);
</script>

<template>
  <main class="page">
    <h1>Report columns</h1>
    <TransferList v-model="chosen" :items="COLUMNS" />
    <p class="value" data-testid="value">Value: {{ JSON.stringify(chosen) }}</p>
  </main>
</template>

<style>
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
.page { max-width: 760px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 1.4rem; margin: 0 0 16px; }
.value { margin-top: 18px; font: 0.85rem ui-monospace, SFMono-Regular, Menlo, monospace; color: #c9cfdd; overflow-wrap: anywhere; }
</style>
`,
          "/src/columns.js": `// The master list. Its order is the order both sides always show.
export const COLUMNS = [
  { id: "name", label: "Name" },
  { id: "email", label: "Email" },
  { id: "role", label: "Role" },
  { id: "team", label: "Team" },
  { id: "location", label: "Location" },
  { id: "start", label: "Start date" },
  { id: "manager", label: "Manager" },
  { id: "status", label: "Status" },
];

export function matches(item, filter) {
  const q = filter.trim().toLowerCase();
  return !q || item.label.toLowerCase().includes(q);
}
`,
          "/src/components/TransferList.vue": `<script setup>
import { computed, ref } from "vue";
import TransferPanel from "./TransferPanel.vue";
import { matches } from "../columns.js";

// v-model = ids on the right. Both lists are DERIVED from \`items\` (master
// order), so moving things never reorders them.
const props = defineProps({
  items: { type: Array, required: true },
  modelValue: { type: Array, default: () => [] },
});
const emit = defineEmits(["update:modelValue"]);

const checked = ref(new Set()); // Vue 3 tracks Set.add / delete / has
const leftFilter = ref("");
const rightFilter = ref("");

const chosen = computed(() => new Set(props.modelValue));
const left = computed(() => props.items.filter((i) => !chosen.value.has(i.id)));
const right = computed(() => props.items.filter((i) => chosen.value.has(i.id)));
const leftShown = computed(() => left.value.filter((i) => matches(i, leftFilter.value)));
const rightShown = computed(() => right.value.filter((i) => matches(i, rightFilter.value)));
const leftChecked = computed(() => leftShown.value.filter((i) => checked.value.has(i.id)));
const rightChecked = computed(() => rightShown.value.filter((i) => checked.value.has(i.id)));

function toggle(id) {
  if (checked.value.has(id)) checked.value.delete(id);
  else checked.value.add(id);
}

function toggleAll(shown) {
  const allOn = shown.every((i) => checked.value.has(i.id));
  for (const i of shown) {
    if (allOn) checked.value.delete(i.id);
    else checked.value.add(i.id);
  }
}

function move(moving, toRight) {
  const ids = new Set(moving.map((i) => i.id));
  const nextChosen = toRight
    ? new Set([...props.modelValue, ...ids])
    : new Set(props.modelValue.filter((id) => !ids.has(id)));
  emit("update:modelValue", props.items.filter((i) => nextChosen.has(i.id)).map((i) => i.id)); // master order
  for (const id of ids) checked.value.delete(id); // moved = unchecked
}
</script>

<template>
  <div class="transfer">
    <TransferPanel v-model:filter="leftFilter" title="Available" side="left" :total="left.length" :items="leftShown"
      :checked="checked" @toggle="toggle" @toggle-all="toggleAll(leftShown)" />

    <div class="moves" role="group" aria-label="Move columns">
      <button type="button" data-testid="to-right-all" aria-label="Move all shown to Chosen" :disabled="leftShown.length === 0" @click="move(leftShown, true)">»</button>
      <button type="button" data-testid="to-right" aria-label="Move checked to Chosen" :disabled="leftChecked.length === 0" @click="move(leftChecked, true)">›</button>
      <button type="button" data-testid="to-left" aria-label="Move checked to Available" :disabled="rightChecked.length === 0" @click="move(rightChecked, false)">‹</button>
      <button type="button" data-testid="to-left-all" aria-label="Move all shown to Available" :disabled="rightShown.length === 0" @click="move(rightShown, false)">«</button>
    </div>

    <TransferPanel v-model:filter="rightFilter" title="Chosen" side="right" :total="right.length" :items="rightShown"
      :checked="checked" @toggle="toggle" @toggle-all="toggleAll(rightShown)" />
  </div>
</template>

<style scoped>
.transfer { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: start; }
.moves { display: flex; flex-direction: column; gap: 8px; padding-top: 70px; }
.moves button { width: 44px; height: 36px; font-size: 1.2rem; border: 1px solid #343a4f; border-radius: 8px; background: #22263a; color: #e6e8ee; cursor: pointer; }
.moves button:disabled { opacity: 0.35; cursor: not-allowed; }
.moves button:focus-visible { outline: 2px solid #7aa2ff; outline-offset: 1px; }
@media (max-width: 560px) {
  .transfer { grid-template-columns: 1fr; }
  .moves { flex-direction: row; justify-content: center; padding-top: 0; }
}
</style>
`,
          "/src/components/TransferPanel.vue": `<script setup>
import { computed } from "vue";

// Presentational: renders one side. All state lives in TransferList.
const props = defineProps({
  title: { type: String, required: true },
  side: { type: String, required: true },
  total: { type: Number, required: true },
  items: { type: Array, required: true },
  checked: { type: Set, required: true },
  filter: { type: String, required: true },
});
const emit = defineEmits(["update:filter", "toggle", "toggle-all"]);

const checkedCount = computed(() => props.items.filter((i) => props.checked.has(i.id)).length);
const all = computed(() => props.items.length > 0 && checkedCount.value === props.items.length);
const some = computed(() => checkedCount.value > 0 && !all.value);
</script>

<template>
  <section class="panel" :aria-labelledby="side + '-title'" :data-testid="side">
    <header class="panel-head">
      <label class="all">
        <!-- :indeterminate binds the DOM property; there is no HTML attribute for it -->
        <input type="checkbox" :data-testid="side + '-all'" :checked="all" :indeterminate="some"
          :disabled="items.length === 0" :aria-label="'Check all shown in ' + title" @change="emit('toggle-all')" />
        <span :id="side + '-title'">{{ title }}</span>
      </label>
      <span class="tally" :data-testid="side + '-tally'">{{ checkedCount }}/{{ items.length }} checked, {{ total }} total</span>
    </header>
    <input class="filter" type="search" placeholder="Filter" :data-testid="side + '-filter'" :aria-label="'Filter ' + title"
      :value="filter" @input="emit('update:filter', $event.target.value)" />
    <ul class="items">
      <li v-for="item in items" :key="item.id">
        <label>
          <input type="checkbox" :data-testid="side + '-item'" :checked="checked.has(item.id)" @change="emit('toggle', item.id)" />
          {{ item.label }}
        </label>
      </li>
      <li v-if="items.length === 0" class="none">Nothing here</li>
    </ul>
  </section>
</template>

<style scoped>
.panel { background: #1a1d27; border: 1px solid #343a4f; border-radius: 10px; padding: 10px; min-width: 0; }
.panel-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
.all { display: flex; gap: 8px; align-items: center; font-weight: 600; }
.tally { font-size: 0.75rem; color: #7d859b; }
.filter { width: 100%; padding: 6px 8px; margin-bottom: 6px; color: inherit; background: #11131a; border: 1px solid #343a4f; border-radius: 6px; }
.items { list-style: none; margin: 0; padding: 0; max-height: 260px; overflow-y: auto; }
.items label { display: flex; gap: 8px; align-items: center; padding: 6px 4px; border-radius: 6px; cursor: pointer; }
.items label:hover { background: #262b3a; }
.none { padding: 6px 4px; color: #5d6478; font-size: 0.9rem; }
.panel input:focus-visible { outline: 2px solid #7aa2ff; outline-offset: 1px; }
</style>
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers preparing for a machine coding round. Assumes components, \`@Input\`, \`@Output\` and \`@for\`; derived state with signals and the indeterminate checkbox are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The Verified output came from booting the solution on Angular 22.2.3 in jsdom twice, AOT with strict templates and with the playground's runtime JIT compiler, with a driver that clicked checkboxes, typed into the filters and pressed the move buttons.

## 1. A Story First

Packing for a trip, you keep two piles on the bed, "staying home" and "in the suitcase", and carry things between them. A good packing list never reshuffles, whichever pile an item is in. A **transfer list** is that bed. Splicing between two arrays slowly scrambles the order. The robust version stores **one** master list plus the chosen ids and computes both piles. It is the bulk-move cousin of the [multi-select dropdown](/interview-question/build-a-custom-multi-select-dropdown).

## 2. The Plan in Angular Terms

\`AppComponent\` holds \`chosen = signal<string[]>([])\` and renders \`<app-transfer-list [items]="columns" [(value)]="chosen" />\`.

| Piece | Angular tool |
| :--- | :--- |
| Chosen ids (right side) | \`@Input() set value(...)\` into \`valueSig\` + \`@Output() valueChange\` |
| Master items | \`@Input() set items(...)\` into \`itemsSig\` |
| Checked ids | \`signal<ReadonlySet<string>>\`, replaced on every change |
| Filter text per side | \`signal("")\`, bound to each panel with \`[(filter)]\` |
| \`left\`, \`right\`, shown and checked lists | \`computed()\` |
| Indeterminate header | \`[indeterminate]\` property binding |

\`\`\`ts
readonly chosen = computed(() => new Set(this.valueSig()));
readonly left = computed(() => this.itemsSig().filter((i) => !this.chosen().has(i.id)));
readonly right = computed(() => this.itemsSig().filter((i) => this.chosen().has(i.id)));
readonly leftShown = computed(() => this.left().filter((i) => matches(i, this.leftFilter())));
readonly rightShown = computed(() => this.right().filter((i) => matches(i, this.rightFilter())));
readonly leftChecked = computed(() => this.leftShown().filter((i) => this.checked().has(i.id)));
readonly rightChecked = computed(() => this.rightShown().filter((i) => this.checked().has(i.id)));
\`\`\`

📌 **Interview term: Single source of truth** — each fact is stored once. Both panels are \`items.filter(...)\`, so they are always in master order and can never disagree.

📌 **Interview term: Computed signal** — a read-only signal derived from others, cached until a dependency changes. Unlike a template method call, it does not rerun on every change detection pass; see [computed signals vs getters](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls).

## 3. Build It Step by Step

### Step 1: a Set in a signal, replaced not mutated

\`\`\`ts
readonly checked = signal<ReadonlySet<string>>(new Set()); // replaced, never mutated

toggle(id: string) {
  this.checked.update((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
}
\`\`\`

A signal notifies only when it is \`set\` or \`update\`d to a value that is not \`Object.is\` equal to the old one. Calling \`this.checked().add(id)\` would change the set without telling anyone, and every \`computed\` that reads it would keep its stale cache. Typing it \`ReadonlySet\` makes the compiler reject \`add\` and \`delete\`.

📌 **Interview term: Immutable update** — produce a new value instead of changing the old one, so reference equality tells the framework something changed.

### Step 2: moving keeps master order

\`\`\`ts
move(moving: Item[], toRight: boolean) {
  const ids = new Set(moving.map((i) => i.id));
  const value = this.valueSig();
  const nextChosen = toRight ? new Set([...value, ...ids]) : new Set(value.filter((id) => !ids.has(id)));
  const next = this.itemsSig().filter((i) => nextChosen.has(i.id)).map((i) => i.id); // master order
  this.valueSig.set(next);
  this.valueChange.emit(next);
  this.checked.update((prev) => new Set([...prev].filter((id) => !ids.has(id)))); // moved = unchecked
}
\`\`\`

The buttons call \`move(leftShown(), true)\`, \`move(leftChecked(), true)\`, \`move(rightChecked(), false)\` and \`move(rightShown(), false)\`, and each \`[disabled]\` reads the same signal, for example \`[disabled]="leftChecked().length === 0"\`.

📌 **Interview term: Two-way binding \`[( )]\`** — \`[(value)]="chosen"\` is \`[value]="chosen()"\` plus \`(valueChange)="chosen.set($event)"\`. Signal \`model()\` inputs would do this in one line, but they do not register under the playground's JIT compiler, so decorators are used; see [model() inputs](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs).

### Step 3: a presentational panel with \`[(filter)]\`

\`\`\`html
<app-transfer-panel title="Available" side="left" [total]="left().length" [items]="leftShown()"
  [checked]="checked()" [(filter)]="leftFilter" (toggle)="toggle($event)" (toggleAll)="toggleAll(leftShown())" />
\`\`\`

\`\`\`ts
export class TransferPanelComponent {
  @Input({ required: true }) items: Item[] = [];
  @Input({ required: true }) checked: ReadonlySet<string> = new Set();
  @Input({ required: true }) filter = "";
  @Output() filterChange = new EventEmitter<string>(); // pairs with [(filter)]
  @Output() toggle = new EventEmitter<string>();
  @Output() toggleAll = new EventEmitter<void>();
  ...
}
\`\`\`

The \`filter\` input and the \`filterChange\` output follow the \`x\` / \`xChange\` naming that \`[(x)]\` expands to, so the parent can bind the writable signal \`leftFilter\` straight in. In both builds on Angular 22.2.3, typing "at" into the left filter updated \`leftFilter\` and the shown list. The panel owns no state, so the filters live next to the buttons that depend on them.

📌 **Interview term: Presentational component** — no state of its own; renders inputs and reports events. The panel is used twice with different inputs.

### Step 4: the indeterminate header checkbox

\`\`\`ts
get checkedCount() { return this.items.filter((i) => this.checked.has(i.id)).length; }
get all() { return this.items.length > 0 && this.checkedCount === this.items.length; }
get some() { return this.checkedCount > 0 && !this.all; }
\`\`\`

\`\`\`html
<input type="checkbox" [checked]="all" [indeterminate]="some" [disabled]="items.length === 0"
  [attr.aria-label]="'Check all shown in ' + title" (change)="toggleAll.emit()" />
\`\`\`

\`indeterminate\` is a DOM property with no HTML attribute; an \`indeterminate\` attribute in markup leaves the property \`false\` (checked in jsdom). Angular's \`[prop]\` syntax binds DOM properties, so \`[indeterminate]="some"\` sets it directly with no \`@ViewChild\`, and the driver read \`indeterminate === true\` from the node in both builds. \`[attr.indeterminate]\` would only write an attribute and show nothing. With large lists, compute the counts in the parent with \`computed\` and pass them in instead of using getters.

📌 **Interview term: Property vs attribute binding** — \`[x]\` sets the DOM property \`x\`; \`[attr.x]\` sets the HTML attribute. ARIA and \`data-*\` need \`attr.\`; \`indeterminate\`, \`checked\` and \`value\` are properties.

📌 **Interview term: Indeterminate checkbox** — the "some selected" dash on a header checkbox. Presentation only: the box still submits as unchecked.

## 4. Verified: What the Driver Printed

Both builds printed:

\`\`\`
start        : left ["Name","Email","Role","Team","Location","Start date","Manager","Status"] | right []
buttons      : to-right-all:on to-right:off to-left:off to-left-all:off
check Team, Email: to-right-all:on to-right:on to-left:off to-left-all:off | left header: indeterminate, 2/8 checked, 8 total
move right   : right ["Email","Team"] | Value: ["email","team"]
move Name    : right ["Name","Email","Team"] (master order, not click order)
filter at    : left shows ["Location","Start date","Status"] | unchecked, 0/3 checked, 5 total
move all shown: right ["Name","Email","Team","Location","Start date","Status"]
clear filter : left ["Role","Manager"]
check Team   : right header: indeterminate, 1/6 checked, 6 total
click header : right header: checked, 6/6 checked, 6 total
click again  : right header: unchecked, 0/6 checked, 6 total | to-right-all:on to-right:off to-left:off to-left-all:on
move back    : left ["Email","Role","Manager","Status"] | right ["Name","Team","Location","Start date"]
value        : Value: ["name","team","location","start"]
all left     : right [] | Value: [] | to-right-all:on to-right:off to-left:off to-left-all:off
\`\`\`

Master order held through mixed moves, the filtered "move all shown" left Role and Manager behind, the header went through all three states, and the parent signal behind \`[(value)]\` tracked every move. The lines are identical to the React and Vue builds, with no console errors.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Empty side | \`@empty\` block renders "Nothing here"; header and buttons disabled |
| Filter hides checked items | They stay in \`checked\` but are not moved: moves use the shown lists |
| Header state | \`[checked]\` all, \`[indeterminate]\` some |
| Icon buttons | \`aria-label\`s inside a labelled \`role="group"\` |
| Panels | \`<section [attr.aria-labelledby]>\` and a count tally |

## 6. Common Pitfalls

- **Mutating the Set inside the signal**: no notification, stale \`computed\` values. Replace it, and type it \`ReadonlySet\`.
- **\`[attr.indeterminate]\`** instead of \`[indeterminate]\`: an attribute the browser ignores.
- **Two arrays spliced back and forth**, so order drifts.
- **Keeping filter state inside each panel**, so the parent cannot compute shown lists for the buttons.
- **"Move all" acting on hidden items** or leaving moved items checked.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data model:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(value)]</code> carries the chosen ids into a signal; a signal holds a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReadonlySet</code> of checked ids and two signals hold the filters, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> derives both sides from the master <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Derivation:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> split <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items</code> by membership, filters give the shown lists, and checked-and-shown lists drive the single-arrow buttons."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Moves:</strong> <span style="color:#f0e2c8;">"A move builds the next chosen set, writes it in master order to the signal, emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueChange</code>, and replaces the checked set without the moved ids."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Panel:</strong> <span style="color:#f0e2c8;">"A presentational panel used twice, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(filter)]</code> bound to a signal, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggle</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggleAll</code> outputs, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[indeterminate]</code> as a property binding."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Polish:</strong> <span style="color:#f0e2c8;">"Every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[disabled]</code> reads the same computed as its click, and icon buttons and panels have accessible names."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why replace the Set instead of mutating it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Signals compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is</code>; a mutated set is the same reference, so nothing downstream recomputes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update(prev =&gt; new Set(prev))</code> gives a new reference.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it a form control?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ControlValueAccessor</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">writeValue</code> sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueSig</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">move</code> calls the registered <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code>, and provide <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG_VALUE_ACCESSOR</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forwardRef</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TestBed with a host component bound with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(value)]</code>; click item checkboxes and a button found by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-label</code>, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code>, and assert the host signal and the header <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">indeterminate</code> property.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for 10,000 items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the CDK virtual scroll viewport in each panel, debounce the filters, pass precomputed counts into the panel, and consider server-side search.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Single source of truth** | Each fact stored once |
| **Computed signal** | Cached read-only value derived from signals |
| **Immutable update** | New value instead of changing the old one |
| **Two-way binding** | \`[(x)]\` = \`[x]\` + \`(xChange)\` |
| **Property vs attribute binding** | \`[x]\` sets a DOM property, \`[attr.x]\` an attribute |
| **Indeterminate checkbox** | Header "some selected" state, a DOM property |

---
**Conclusion:** In Angular the transfer list keeps the chosen ids, a replaced-not-mutated checked set and two filters in signals, derives both panels from one master list with \`computed\`, and binds \`[indeterminate]\` as a DOM property. The verified AOT and JIT runs on Angular 22.2.3 match the React and Vue builds line for line.`,
        files: {
          "/src/app/app.component.ts": `import { Component, signal } from "@angular/core";
import { TransferListComponent } from "./transfer-list.component";
import { COLUMNS } from "./columns";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [TransferListComponent],
  template: \`
    <main class="page">
      <h1>Report columns</h1>
      <app-transfer-list [items]="columns" [(value)]="chosen" />
      <p class="value" data-testid="value">Value: {{ json(chosen()) }}</p>
    </main>
  \`,
  styles: [\`
    :host { display: block; min-height: 100vh; background: #0f1117; color: #e6e8ee; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color-scheme: dark; }
    .page { max-width: 760px; margin: 0 auto; padding: 24px 16px; }
    h1 { font-size: 1.4rem; margin: 0 0 16px; }
    .value { margin-top: 18px; font: 0.85rem ui-monospace, SFMono-Regular, Menlo, monospace; color: #c9cfdd; overflow-wrap: anywhere; }
  \`],
})
export class AppComponent {
  readonly columns = COLUMNS;
  readonly chosen = signal<string[]>([]);

  json(v: unknown) {
    return JSON.stringify(v);
  }
}
`,
          "/src/app/columns.ts": `// The master list. Its order is the order both sides always show.
export interface Item { id: string; label: string; }

export const COLUMNS: Item[] = [
  { id: "name", label: "Name" },
  { id: "email", label: "Email" },
  { id: "role", label: "Role" },
  { id: "team", label: "Team" },
  { id: "location", label: "Location" },
  { id: "start", label: "Start date" },
  { id: "manager", label: "Manager" },
  { id: "status", label: "Status" },
];

export function matches(item: Item, filter: string): boolean {
  const q = filter.trim().toLowerCase();
  return !q || item.label.toLowerCase().includes(q);
}
`,
          "/src/app/transfer-list.component.ts": `import { Component, EventEmitter, Input, Output, computed, signal } from "@angular/core";
import { TransferPanelComponent } from "./transfer-panel.component";
import { Item, matches } from "./columns";

// [(value)] = ids on the right. Both lists are DERIVED from \`items\` (master
// order), so moving things never reorders them.
@Component({
  selector: "app-transfer-list",
  standalone: true,
  imports: [TransferPanelComponent],
  template: \`
    <div class="transfer">
      <app-transfer-panel title="Available" side="left" [total]="left().length" [items]="leftShown()" [checked]="checked()"
        [(filter)]="leftFilter" (toggle)="toggle($event)" (toggleAll)="toggleAll(leftShown())" />

      <div class="moves" role="group" aria-label="Move columns">
        <button type="button" data-testid="to-right-all" aria-label="Move all shown to Chosen" [disabled]="leftShown().length === 0" (click)="move(leftShown(), true)">»</button>
        <button type="button" data-testid="to-right" aria-label="Move checked to Chosen" [disabled]="leftChecked().length === 0" (click)="move(leftChecked(), true)">›</button>
        <button type="button" data-testid="to-left" aria-label="Move checked to Available" [disabled]="rightChecked().length === 0" (click)="move(rightChecked(), false)">‹</button>
        <button type="button" data-testid="to-left-all" aria-label="Move all shown to Available" [disabled]="rightShown().length === 0" (click)="move(rightShown(), false)">«</button>
      </div>

      <app-transfer-panel title="Chosen" side="right" [total]="right().length" [items]="rightShown()" [checked]="checked()"
        [(filter)]="rightFilter" (toggle)="toggle($event)" (toggleAll)="toggleAll(rightShown())" />
    </div>
  \`,
  styles: [\`
    .transfer { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: start; }
    .moves { display: flex; flex-direction: column; gap: 8px; padding-top: 70px; }
    .moves button { width: 44px; height: 36px; font-size: 1.2rem; border: 1px solid #343a4f; border-radius: 8px; background: #22263a; color: #e6e8ee; cursor: pointer; }
    .moves button:disabled { opacity: 0.35; cursor: not-allowed; }
    .moves button:focus-visible { outline: 2px solid #7aa2ff; outline-offset: 1px; }
    @media (max-width: 560px) {
      .transfer { grid-template-columns: 1fr; }
      .moves { flex-direction: row; justify-content: center; padding-top: 0; }
    }
  \`],
})
export class TransferListComponent {
  @Input({ required: true }) set items(list: Item[]) { this.itemsSig.set(list); }
  @Input() set value(ids: string[]) { this.valueSig.set(ids); }
  @Output() valueChange = new EventEmitter<string[]>();

  readonly itemsSig = signal<Item[]>([]);
  readonly valueSig = signal<string[]>([]);
  readonly checked = signal<ReadonlySet<string>>(new Set()); // replaced, never mutated
  readonly leftFilter = signal("");
  readonly rightFilter = signal("");

  readonly chosen = computed(() => new Set(this.valueSig()));
  readonly left = computed(() => this.itemsSig().filter((i) => !this.chosen().has(i.id)));
  readonly right = computed(() => this.itemsSig().filter((i) => this.chosen().has(i.id)));
  readonly leftShown = computed(() => this.left().filter((i) => matches(i, this.leftFilter())));
  readonly rightShown = computed(() => this.right().filter((i) => matches(i, this.rightFilter())));
  readonly leftChecked = computed(() => this.leftShown().filter((i) => this.checked().has(i.id)));
  readonly rightChecked = computed(() => this.rightShown().filter((i) => this.checked().has(i.id)));

  toggle(id: string) {
    this.checked.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  toggleAll(shown: Item[]) {
    const allOn = shown.every((i) => this.checked().has(i.id));
    this.checked.update((prev) => {
      const next = new Set(prev);
      for (const i of shown) { if (allOn) next.delete(i.id); else next.add(i.id); }
      return next;
    });
  }

  move(moving: Item[], toRight: boolean) {
    const ids = new Set(moving.map((i) => i.id));
    const value = this.valueSig();
    const nextChosen = toRight ? new Set([...value, ...ids]) : new Set(value.filter((id) => !ids.has(id)));
    const next = this.itemsSig().filter((i) => nextChosen.has(i.id)).map((i) => i.id); // master order
    this.valueSig.set(next);
    this.valueChange.emit(next);
    this.checked.update((prev) => new Set([...prev].filter((id) => !ids.has(id)))); // moved = unchecked
  }
}
`,
          "/src/app/transfer-panel.component.ts": `import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Item } from "./columns";

// Presentational: renders one side. All state lives in TransferListComponent.
@Component({
  selector: "app-transfer-panel",
  standalone: true,
  template: \`
    <section class="panel" [attr.aria-labelledby]="side + '-title'" [attr.data-testid]="side">
      <header class="panel-head">
        <label class="all">
          <!-- [indeterminate] binds the DOM property; there is no HTML attribute for it -->
          <input type="checkbox" [attr.data-testid]="side + '-all'" [checked]="all" [indeterminate]="some"
            [disabled]="items.length === 0" [attr.aria-label]="'Check all shown in ' + title" (change)="toggleAll.emit()" />
          <span [id]="side + '-title'">{{ title }}</span>
        </label>
        <span class="tally" [attr.data-testid]="side + '-tally'">{{ checkedCount }}/{{ items.length }} checked, {{ total }} total</span>
      </header>
      <input #f class="filter" type="search" placeholder="Filter" [attr.data-testid]="side + '-filter'"
        [attr.aria-label]="'Filter ' + title" [value]="filter" (input)="filterChange.emit(f.value)" />
      <ul class="items">
        @for (item of items; track item.id) {
          <li>
            <label>
              <input type="checkbox" [attr.data-testid]="side + '-item'" [checked]="checked.has(item.id)" (change)="toggle.emit(item.id)" />
              {{ item.label }}
            </label>
          </li>
        } @empty {
          <li class="none">Nothing here</li>
        }
      </ul>
    </section>
  \`,
  styles: [\`
    .panel { background: #1a1d27; border: 1px solid #343a4f; border-radius: 10px; padding: 10px; min-width: 0; }
    .panel-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
    .all { display: flex; gap: 8px; align-items: center; font-weight: 600; }
    .tally { font-size: 0.75rem; color: #7d859b; }
    .filter { width: 100%; box-sizing: border-box; padding: 6px 8px; margin-bottom: 6px; color: inherit; background: #11131a; border: 1px solid #343a4f; border-radius: 6px; }
    .items { list-style: none; margin: 0; padding: 0; max-height: 260px; overflow-y: auto; }
    .items label { display: flex; gap: 8px; align-items: center; padding: 6px 4px; border-radius: 6px; cursor: pointer; }
    .items label:hover { background: #262b3a; }
    .none { padding: 6px 4px; color: #5d6478; font-size: 0.9rem; }
    .panel input:focus-visible { outline: 2px solid #7aa2ff; outline-offset: 1px; }
  \`],
})
export class TransferPanelComponent {
  @Input({ required: true }) title = "";
  @Input({ required: true }) side = "";
  @Input({ required: true }) total = 0;
  @Input({ required: true }) items: Item[] = [];
  @Input({ required: true }) checked: ReadonlySet<string> = new Set();
  @Input({ required: true }) filter = "";
  @Output() filterChange = new EventEmitter<string>(); // pairs with [(filter)]
  @Output() toggle = new EventEmitter<string>();
  @Output() toggleAll = new EventEmitter<void>();

  get checkedCount() {
    return this.items.filter((i) => this.checked.has(i.id)).length;
  }
  get all() {
    return this.items.length > 0 && this.checkedCount === this.items.length;
  }
  get some() {
    return this.checkedCount > 0 && !this.all;
  }
}
`,
        },
      },
    },
  },
];

export default augments;
