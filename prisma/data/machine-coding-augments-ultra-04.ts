/**
 * Machine coding ULTRA — batch 04: timers and clocks (Digital Clock, Analog
 * Clock, Stopwatch, Countdown Timer, Traffic Light, Typewriter Effect).
 *
 * Each question carries a §6 Question Body and one bundle per framework
 * (React, Vue, Angular): a tutorial answer (story first, clarifying questions
 * in the React tab, state model, `📌 Interview term:` callouts, `.iq-diagram`
 * SVGs, a Verified section, edge cases and accessibility, pitfalls, the §7
 * interview card, glossary, conclusion) and a runnable multi-file solution.
 *
 * The theme of the batch is time: every solution reads the clock
 * (Date.now / performance.now / a deadline) instead of counting ticks, keeps
 * exactly one pending timer, and cleans it up. Every solution was booted with
 * scripts/verify-mc-solution.mjs on React 19.3.1 (inside StrictMode),
 * Vue 3.5.44 and Angular 22.2.3 (AOT with strict templates, and runtime JIT as
 * in the playground) in jsdom, driven by per-question drivers. Those runs were
 * preloaded with a small wrapper (node --import) that counts the timers the
 * solution itself creates, and some drivers shifted or froze the global Date
 * to hit midnight or 12 o clock on cue; the answers say so where it applies.
 * The setInterval / setTimeout drift comparison was also measured in real
 * Chromium 141 through playwright-core. Every "Verified" block is pasted from
 * those runs by the generator.
 *
 * Generator, drivers and solution sources: the session scratchpad,
 * mc/b04/{build.mjs,lib.mjs,timers.mjs,qN/}. The shipped files are read from
 * the verified folders byte for byte.
 */
import type { MachineCodingAugment } from "./machine-coding-augments.types";

const augments: MachineCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Digital Clock",
    seoDescription:
      "Build a digital clock in React, Vue and Angular: drift-free ticks aimed at each second, 12/24-hour toggle, zero-padding and timer cleanup, all verified.",
    description: `**Question presented to candidate:**
"Build a digital clock widget that shows the current time and updates every second. Users should be able to switch between 24-hour and 12-hour (AM/PM) format. Keep it accurate: if I leave it open for an hour, it should still match my system clock to the second."

**Requirements:**
- Show \`HH:MM:SS\`, every unit zero-padded, plus the current date.
- A toggle between 24-hour and 12-hour format (12-hour shows \`12\` for midnight and noon, never \`00\`, plus AM/PM).
- The display changes as close to the real second boundary as possible and never drifts.
- No timers left running after the clock unmounts.

**What a strong answer should cover:**
- The **source of truth is the system clock**: every tick reads \`new Date()\` instead of adding 1 to a counter, so a late or skipped tick cannot accumulate as drift.
- Scheduling: a \`setTimeout\` aimed at the next second boundary (\`1000 - now % 1000\`) instead of a free-running \`setInterval(1000)\` started at an arbitrary millisecond.
- **Cleanup**: clearing the timer on unmount, and why React StrictMode in development runs the effect twice (mount, cleanup, mount).
- Formatting as a **pure function** (\`Date\` + format flag in, strings out): \`padStart\`, \`h % 12 || 12\`, AM/PM.
- State model: the format flag is state; the formatted strings are derived, not stored.
- Accessibility: a semantic \`<time datetime>\` element, no \`aria-live\` announcing every second, and a toggle button with \`aria-pressed\`.

**Clarifying questions expected:**
- "Local time only, or should it support other time zones?"
- "Does it need seconds, or would minute precision be enough (which changes how often it renders)?"
- "Should the 12/24-hour choice follow the user locale or be a manual toggle?"

**Code / implementation expected:** Yes. A working component with a self-correcting timer, cleanup, a pure formatting function and the format toggle.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Beginners preparing for a frontend machine coding round. You know a little JavaScript and have seen a React component; timers and effects are explained from zero.
**Difficulty:** Easy

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every output quoted under "Verified" was printed by actually running the solution below on React 19.3.1 in jsdom, plus one measurement in real Chromium 141.

## 1. Why This Even Matters — A Story First

Picture a wall clock with a cheap motor. Every second the motor gives the hands a nudge. If the battery is weak, a nudge comes a little late, and the clock never makes up for it: by the end of the week it is three minutes slow. That clock *counts nudges*.

Now picture a clock that, every second, glances at a radio time signal and simply shows whatever the signal says. If one glance is late, the next glance is still correct. That clock *reads the time*.

A digital clock on a web page is the same choice. The tempting version counts: start at the current time and add one second every time <code>setInterval</code> fires. The correct version reads: every time the timer fires, ask the system clock what time it is and show that. The interview is really about whether you know the difference, whether you clean up your timer, and whether you can format time without off-by-one bugs at midnight and noon.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Local time only, or other time zones too? | Other zones push you to <code>Intl.DateTimeFormat</code> with a <code>timeZone</code> option instead of <code>getHours()</code>. |
| Do we show seconds? | Minute precision means one render per minute and a timer aimed at the next minute instead of the next second. |
| 12/24-hour: a toggle, or follow the user locale? | A locale default means reading <code>Intl.DateTimeFormat().resolvedOptions().hourCycle</code>; a toggle is simple state. |
| Should the choice persist across reloads? | Persisting means <code>localStorage</code>, read once in the initial state. |
| How accurate does it need to be? | "Matches the system clock to the second" rules out tick counting, which is the main point of the build. |
| Is a date line wanted? | It makes the midnight rollover visible and gives you a free test case. |

For this build: local time, seconds shown, a manual toggle, no persistence, and a date line.

## 3. Requirements and Plan

**Component tree.** <code>App</code> renders one <code>DigitalClock</code>. The clock uses a tiny custom hook <code>useNow()</code> that owns the timer, and a pure function <code>formatClock()</code> that turns a <code>Date</code> into strings.

**State model.**

| Piece | Kind | Why |
| :--- | :--- | :--- |
| <code>now</code> (a <code>Date</code>) | State, inside <code>useNow</code> | Changing it must re-render. |
| <code>hour12</code> | State | The toggle. |
| <code>time</code>, <code>period</code>, <code>date</code>, <code>iso</code> | Derived on every render | Storing them would mean keeping two copies of the same truth in sync. |
| The timer id | A local variable inside the effect | Only the cleanup needs it, and it never affects what is drawn. |

📌 **Interview term: Derived state** — a value you can compute from existing state or props. Compute it during render instead of storing it, so it can never be out of date.

The heart of the build is the tick loop:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 260" role="img" aria-label="Tick loop: the timer fires, the code reads the clock, renders, then aims the next timer at the next second boundary">
  <defs>
    <marker id="dc-r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="180" height="64" rx="10"/>
  <text class="d-text" x="110" y="58" text-anchor="middle">Timer fires</text>
  <text class="d-sub" x="110" y="80" text-anchor="middle">maybe a little late</text>
  <rect class="d-box-accent" x="250" y="30" width="180" height="64" rx="10"/>
  <text class="d-text d-accent" x="340" y="58" text-anchor="middle">Read the clock</text>
  <text class="d-sub" x="340" y="80" text-anchor="middle">d = new Date()</text>
  <rect class="d-box" x="480" y="30" width="180" height="64" rx="10"/>
  <text class="d-text" x="570" y="58" text-anchor="middle">Render</text>
  <text class="d-sub" x="570" y="80" text-anchor="middle">setNow(d)</text>
  <rect class="d-box-muted" x="250" y="170" width="180" height="64" rx="10"/>
  <text class="d-text" x="340" y="198" text-anchor="middle">Aim at next second</text>
  <text class="d-sub" x="340" y="220" text-anchor="middle">1000 minus ms of d</text>
  <path class="d-edge" d="M 200 62 L 244 62" marker-end="url(#dc-r-arrow)"/>
  <path class="d-edge" d="M 430 62 L 474 62" marker-end="url(#dc-r-arrow)"/>
  <path class="d-edge" d="M 570 94 L 570 202 L 436 202" marker-end="url(#dc-r-arrow)"/>
  <path class="d-edge-accent" d="M 250 202 L 110 202 L 110 100" marker-end="url(#dc-r-arrow)"/>
</svg>

Because the time shown always comes from the clock, a late tick only delays one update. The next delay is computed from the real time, so the loop re-aims itself at the true boundary every second.

## 4. Build It Step by Step

### Step 1: a pure formatting function

Start with the part that has no timers at all. It takes a <code>Date</code> and the format flag and returns strings, which makes it trivial to test.

~~~js
const pad = (n) => String(n).padStart(2, "0");

// Pure function: Date + format flag in,
// display strings out. Easy to test.
export function formatClock(date, hour12) {
  const h = date.getHours();
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  const iso = pad(h) + ":" + m + ":" + s;
  const shownHour = hour12 ? h % 12 || 12 : h;
  return {
    time: pad(shownHour) + ":" + m + ":" + s,
    period: hour12 ? (h < 12 ? "AM" : "PM") : "",
    iso,
    date: date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}
~~~

Two details interviewers check:

- <code>String(n).padStart(2, "0")</code> zero-pads, so 9:05:03 becomes <code>09:05:03</code>.
- <code>h % 12 || 12</code> maps 0 to 12 and 13 to 1. Plain <code>h % 12</code> shows <code>00:00:01 AM</code> at midnight, a classic bug. Hours 0-11 are AM, 12-23 are PM, so noon is <code>12:00 PM</code>.

<code>iso</code> is always the 24-hour value; it feeds the machine-readable <code>dateTime</code> attribute.

### Step 2: a hook that re-renders on every new second

~~~js
import { useEffect, useState } from "react";

// Returns the current Date and re-renders
// on every new wall-clock second.
// Each tick reads the real time and
// schedules itself for the NEXT second
// boundary, so a late or skipped tick never accumulates as drift.
export function useNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let id;
    const tick = () => {
      const d = new Date();
      setNow(d);
      id = setTimeout(tick, 1000 - (d.getTime() % 1000));
    };
    id = setTimeout(tick, 1000 - (Date.now() % 1000));
    // runs on unmount and in the StrictMode re-run
    return () => clearTimeout(id);
  }, []);

  return now;
}
~~~

📌 **Interview term: Drift** — the growing gap between what a timer-driven display shows and the real time. It appears when you *count* ticks, because each tick can be late (the main thread was busy, the tab was in the background) and lateness adds up. Reading the clock on every tick removes it.

📌 **Interview term: Aligning to the second boundary** — scheduling the next tick for <code>1000 - (now % 1000)</code> milliseconds, the time left until the clock reaches the next whole second. A plain <code>setInterval(fn, 1000)</code> started at, say, 12:00:00.700 updates at .700 every second, so the display is up to 0.7 s behind the real second for its whole life.

Why <code>setTimeout</code> and not <code>setInterval</code>? Each delay is different (it depends on when this tick actually ran), and an interval has one fixed delay.

📌 **Interview term: Effect cleanup** — the function you return from <code>useEffect</code>. React calls it before re-running the effect and when the component unmounts. Here it cancels the one pending timeout, so the loop stops. See [the cleanup function in useEffect](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect).

Notice the closure trick: <code>id</code> is a variable in the effect scope that every <code>tick</code> overwrites, so the cleanup always clears the *latest* timeout, not the first one.

📌 **Interview term: StrictMode double effect** — in development, <code>&lt;StrictMode&gt;</code> mounts each component, runs its effects, runs their cleanups, then runs the effects again. It exists to flush out effects that do not clean up. A correct effect survives it with one timer left; the Verified section shows exactly that. More in [why StrictMode double-invokes effects](/interview-question/why-does-react-18-strictmode-double-invoke-your-components-and-effects).

### Step 3: the component

~~~jsx
import { useState } from "react";
import { useNow } from "./useNow";
import { formatClock } from "./formatClock";

export default function DigitalClock() {
  const now = useNow();
  const [hour12, setHour12] = useState(false);
  const { time, period, iso, date } = formatClock(now, hour12);

  return (
    <section className="clock" aria-labelledby="clock-title">
      <h1 id="clock-title" className="title">
        Digital Clock
      </h1>
      <time className="time" dateTime={iso} data-testid="time">
        {time}
        {period && <span className="period"> {period}</span>}
      </time>
      <p className="date" data-testid="date">
        {date}
      </p>
      <button
        type="button"
        className="toggle"
        aria-pressed={hour12}
        onClick={() => setHour12((v) => !v)}
        data-testid="format"
      >
        12-hour format
      </button>
    </section>
  );
}
~~~

- <code>hour12</code> is the only state the component owns. Everything shown is derived from <code>now</code> and <code>hour12</code> on every render.
- The toggle keeps a **stable label** ("12-hour format") and exposes on/off through <code>aria-pressed</code>. Changing the label *and* using <code>aria-pressed</code> would make a screen reader say something like "Switch to 24-hour, pressed", which is confusing.
- <code>setHour12((v) =&gt; !v)</code> uses the updater form, a good habit whenever new state depends on old state.

📌 **Interview term: Semantic &lt;time&gt; element** — HTML element for a time or date; its <code>datetime</code> attribute carries a machine-readable value (here <code>23:59:58</code>) while the text can be formatted for people.

<code>App.js</code> only renders the clock inside a centred <code>&lt;main&gt;</code>, and <code>styles.css</code> gives it a dark card with <code>font-variant-numeric: tabular-nums</code> so digits have equal width and the time does not wiggle as it changes.

## 5. Verified

The solution was mounted exactly as the playground does it (<code>createRoot(#root).render(&lt;StrictMode&gt;&lt;App /&gt;&lt;/StrictMode&gt;)</code>) in jsdom with <code>scripts/verify-mc-solution.mjs</code>. Two helpers were added for the run, both outside the solution code:

- A **timer counter** preloaded with <code>node --import</code> that wraps <code>setTimeout</code>/<code>clearTimeout</code> and counts only the timers created by the solution bundle.
- A **fake clock**: the driver replaced the global <code>Date</code> with one shifted by a whole number of seconds to 23:59:57 UTC, keeping the real millisecond phase, so the midnight rollover happens on cue while real time still passes.

The driver waited for each tick, clicked the toggle twice, then started a naive "add one second per <code>setInterval</code> tick" counter next to the app and blocked the main thread for 1500 ms with a busy loop:

~~~text
RENDERED: Digital Clock18:15:23Friday, October 16, 202612-hour format
timers after mount: created 2 timeout(s) + 0 interval(s), cleared 1, pending now 1
start  : 23:59:58 | Friday, October 16, 2026
ticks  : 23:59:59 -> 00:00:00 -> 00:00:01 | Saturday, October 17, 2026
ms after each second boundary that the tick fired: 1, 0, -1, 1
12-hour: 12:00:01 AM | aria-pressed = true
24-hour: 00:00:01
after a 1500 ms long task: true time 00:00:06 | app shows 00:00:06 | a setInterval tick counter shows 00:00:05
timers now: created 11 timeout(s) + 0 interval(s), cleared 1, pending now 1
timers after unmount: 11 timeout(s) + 0 interval(s) created, 2 cleared, 0 still pending
~~~

What this proves:

- **StrictMode**: right after mount the counter shows 2 timeouts created and 1 cleared: the effect ran, was cleaned up, and ran again, leaving exactly one pending timer.
- **Alignment**: each tick fired within about a millisecond of the true second boundary, a negative value meaning a millisecond early (the values differ between runs). Node timers occasionally fire a millisecond *early*; when that happens the tick reads the previous second, re-renders the same text and aims 1 ms later, so it heals itself.
- **Midnight**: <code>23:59:59 -> 00:00:00</code> rolled the date to Saturday, and 12-hour mode shows <code>12:00:01 AM</code>, not <code>00:00:01 AM</code>.
- **Drift**: after a 1.5 s long task the app still matches the true time, while the tick counter is a second behind for good.
- **Cleanup**: after the verifier unmounted the app, 0 timers were still pending. (Total timeout counts can differ by one between runs, because an early tick adds one 1 ms re-aim.)

The same three strategies were measured in real **Chromium 141** (headless, via <code>playwright-core</code>), with a long task injected after the third tick and the page stopped at 8.5 s. "Shows" is the number of seconds each approach would display:

~~~text
Chromium 141.0.7390.37, 300 ms long task after the 3rd tick, stopped at 8.5 s:
  setInterval(fn, 1000), count ticks   fired at 1000, 2000, 3012, 4000, 5004, 6000, 7000, 8000 ms | shows 8 s
  setTimeout(fn, 1000) chain, count    fired at 1001, 2001, 3002, 4305, 5305, 6305, 7308, 8308 ms | shows 8 s
  next-boundary timeout, read clock    fired at 1001, 2000, 2000, 3000, 4001, 5000, 5004, 5999, 6007, 7000, 8000 ms | shows 8 s
Chromium 141.0.7390.37, 1500 ms long task after the 3rd tick, stopped at 8.5 s:
  setInterval(fn, 1000), count ticks   fired at 1001, 2000, 3000, 4501, 5001, 6001, 7005, 8000 ms | shows 8 s
  setTimeout(fn, 1000) chain, count    fired at 1001, 2001, 3001, 5501, 6503, 7503 ms | shows 6 s
  next-boundary timeout, read clock    fired at 1001, 2000, 3000, 5001, 6000, 7000, 8000, 8004 ms | shows 8 s
Chromium 141.0.7390.37, 2500 ms long task after the 3rd tick, stopped at 8.5 s:
  setInterval(fn, 1000), count ticks   fired at 1001, 2000, 3004, 5505, 6000, 7000, 8000 ms | shows 7 s
  setTimeout(fn, 1000) chain, count    fired at 1001, 2001, 3001, 6502, 7502 ms | shows 5 s
  next-boundary timeout, read clock    fired at 1001, 2000, 2999, 5999, 5999, 5999, 6004, 7000, 7004, 7999, 8003 ms | shows 8 s
~~~

Two surprises worth knowing. Chromium's <code>setInterval</code> keeps a fixed schedule and delivers a missed tick late, so tick counting survived a 1.5 s task, but lost a second at 2.5 s; a <code>setTimeout</code> chain lost one second per long task. And the boundary-aimed timeout fired a millisecond early several times (1999, 5999), which is harmless only because the code reads the clock rather than counting. Exact milliseconds vary from run to run.

## 6. Edge Cases and Accessibility

| Case | What the solution does |
| :--- | :--- |
| Midnight and noon in 12-hour mode | Hour 0 and hour 12 both display as 12 (verified at 00:00:01 AM). |
| Date rollover | The date line is derived from the same <code>now</code>, so it flips at the same tick. |
| Busy main thread | The next tick reads the clock, so the display jumps straight to the right second. |
| Background tab | Chrome throttles timers in hidden pages (to about once per second, and for chained timers to once per minute after 5 minutes hidden, per [Chrome's timer throttling notes](https://developer.chrome.com/blog/timer-throttling-in-chrome-88)). The first tick after returning still shows the correct time. Not testable in jsdom. |
| System clock or DST change | <code>new Date()</code> follows the system clock, which is exactly what a wall clock should do. |
| Screen readers | The time is plain text in a <code>&lt;time&gt;</code>; there is no <code>aria-live</code>, so it is not announced every second (which would be unbearable). Users read it on demand. |
| Toggle | A real <code>&lt;button&gt;</code> with <code>aria-pressed</code> and a visible focus ring. |

## 7. Common Pitfalls

- **Counting ticks.** <code>setSeconds(s =&gt; s + 1)</code> every 1000 ms drifts; the Verified run shows a counter one second behind after a single long task.
- **Starting <code>setInterval(1000)</code> at a random millisecond.** The display lags the real second by a fixed, random amount (up to almost a second) forever. Aim at the boundary.
- **No cleanup.** Without <code>clearTimeout</code> the loop keeps running after unmount, and under StrictMode two loops run at once. The [StrictMode doc](/interview-question/what-is-the-purpose-of-react-strictmode) explains why development makes this visible.
- **Storing formatted strings in state.** Keeping <code>timeString</code> next to <code>now</code> means two pieces of state that can disagree. Derive it.
- **<code>h % 12</code> without <code>|| 12</code>.** Shows 00 at midnight and noon.
- **Clearing the first timer id only.** With a <code>setTimeout</code> chain, the cleanup must clear the latest id; keep it in a variable the cleanup closes over (or a ref).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Source of truth:</strong> <span style="color:#f0e2c8;">"The system clock is the truth. Every tick reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Date()</code>; I never add one to a counter, so late ticks cannot drift."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Scheduling:</strong> <span style="color:#f0e2c8;">"I use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> chain aimed at the next second boundary, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1000 - now % 1000</code>, so the digits flip within a millisecond or two of the real second."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cleanup:</strong> <span style="color:#f0e2c8;">"The effect returns a cleanup that clears the latest timeout id. In dev, StrictMode mounts, cleans up and mounts again, and I end with exactly one timer."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Formatting:</strong> <span style="color:#f0e2c8;">"A pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formatClock(date, hour12)</code> does <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">padStart</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h % 12 || 12</code> and AM/PM. Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">now</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hour12</code> are state; the strings are derived."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility and testing:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;time datetime&gt;</code> element, no live region, a toggle with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-pressed</code>. I test the formatter directly and the hook with a fake <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date</code> at 23:59:58."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you show another time zone?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replace <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getHours()</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Intl.DateTimeFormat</code> and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timeZone</code> option, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })</code>. The tick loop stays the same, because a second boundary is the same instant everywhere.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setInterval(fn, 1000)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It fires at whatever millisecond it was started on, so the display lags the real second by a fixed amount, and if you count its ticks you drift. If you read the clock inside it you avoid drift but still keep the lag. Aiming each timeout at the boundary fixes both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">requestAnimationFrame</code> be better?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for a clock that changes once per second: it runs about 60 times a second and pauses in background tabs. It is the right tool for a smooth sweeping hand, as in the analog clock.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test this without waiting for real seconds?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formatClock</code> with fixed dates (midnight, noon, 23:59:59). For the hook, use fake timers with a controllable clock, such as Vitest or Jest modern fake timers with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setSystemTime</code>, advance by 1000 ms and assert the text. The run in this doc used a shifted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date</code> and real time instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Many clocks on one page: one timer each?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Better one shared ticker: a small module that keeps one timeout loop and notifies subscribers, exposed through a hook built on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useSyncExternalStore</code>. Every clock then flips on the same tick and you pay for one timer.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Derived state** | A value computed from state during render instead of being stored |
| **Drift** | Accumulated error from counting timer ticks instead of reading the clock |
| **Aligning to the second boundary** | Scheduling the next tick for the time left until the next whole second |
| **Effect cleanup** | The function returned from <code>useEffect</code>; React calls it before a re-run and on unmount |
| **StrictMode double effect** | Development-only mount, cleanup, mount cycle that exposes missing cleanups |
| **Semantic &lt;time&gt; element** | HTML element whose <code>datetime</code> attribute holds a machine-readable time |

---

**Conclusion:** A good digital clock is a loop that reads the system clock, renders, and re-aims at the next second, plus a cleanup that stops it. Keep formatting in a pure function, keep only <code>now</code> and the format flag as state, and the rest is presentation. The same ideas carry straight into the [Analog Clock](/interview-question/build-an-analog-clock), where the time becomes angles, and into the [Stopwatch](/interview-question/build-a-stopwatch) and [Countdown Timer](/interview-question/build-a-countdown-timer), where the clock you read becomes the start time or the deadline.`,
        files: {
          "/App.js": `import DigitalClock from "./src/DigitalClock";

export default function App() {
  return (
    <main className="page">
      <DigitalClock />
    </main>
  );
}
`,
          "/src/DigitalClock.js": `import { useState } from "react";
import { useNow } from "./useNow";
import { formatClock } from "./formatClock";

export default function DigitalClock() {
  const now = useNow();
  const [hour12, setHour12] = useState(false);
  const { time, period, iso, date } = formatClock(now, hour12);

  return (
    <section className="clock" aria-labelledby="clock-title">
      <h1 id="clock-title" className="title">
        Digital Clock
      </h1>
      <time className="time" dateTime={iso} data-testid="time">
        {time}
        {period && <span className="period"> {period}</span>}
      </time>
      <p className="date" data-testid="date">
        {date}
      </p>
      <button
        type="button"
        className="toggle"
        aria-pressed={hour12}
        onClick={() => setHour12((v) => !v)}
        data-testid="format"
      >
        12-hour format
      </button>
    </section>
  );
}
`,
          "/src/formatClock.js": `const pad = (n) => String(n).padStart(2, "0");

// Pure function: Date + format flag in, display strings out. Easy to test.
export function formatClock(date, hour12) {
  const h = date.getHours();
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  const iso = pad(h) + ":" + m + ":" + s;
  const shownHour = hour12 ? h % 12 || 12 : h;
  return {
    time: pad(shownHour) + ":" + m + ":" + s,
    period: hour12 ? (h < 12 ? "AM" : "PM") : "",
    iso,
    date: date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}
`,
          "/src/useNow.js": `import { useEffect, useState } from "react";

// Returns the current Date and re-renders on every new wall-clock second.
// Each tick reads the real time and schedules itself for the NEXT second
// boundary, so a late or skipped tick never accumulates as drift.
export function useNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let id;
    const tick = () => {
      const d = new Date();
      setNow(d);
      id = setTimeout(tick, 1000 - (d.getTime() % 1000));
    };
    id = setTimeout(tick, 1000 - (Date.now() % 1000));
    // runs on unmount and in the StrictMode re-run
    return () => clearTimeout(id);
  }, []);

  return now;
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0b1120;
  color: #e2e8f0;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.clock {
  width: 100%;
  max-width: 420px;
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 24px 16px;
  text-align: center;
  box-sizing: border-box;
}
.title {
  margin: 0 0 12px;
  font-size: 1rem;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.time {
  display: block;
  font-size: clamp(2.4rem, 13vw, 3.6rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #38bdf8;
}
.period {
  font-size: 0.45em;
  color: #7dd3fc;
}
.date {
  margin: 8px 0 20px;
  color: #cbd5e1;
}
.toggle {
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid #334155;
  border-radius: 999px;
  padding: 8px 16px;
  font: inherit;
  cursor: pointer;
}
.toggle[aria-pressed="true"] {
  background: #0369a1;
  border-color: #38bdf8;
}
.toggle:focus-visible {
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Beginners preparing for a frontend machine coding round in Vue. You know basic JavaScript; refs, computed and lifecycle hooks are explained as they come up.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. The output under "Verified" was printed by running this solution on Vue 3.5.44, compiled with <code>@vue/compiler-sfc</code> and mounted with <code>createApp(App).mount("#app")</code> in jsdom.

## 1. A Story First

A cheap wall clock moves its hands one nudge per second. If a nudge is late it never catches up, and after a week the clock is minutes slow: it *counts nudges*. A radio-controlled clock instead keeps checking the time signal and shows what the signal says: it *reads the time*. Your Vue clock should be the second kind. Every tick asks the system clock for the time; a late tick only delays one update and never adds up.

## 2. Requirements and Plan

Show <code>HH:MM:SS</code> zero-padded with the date, toggle 12/24-hour, flip the digits right on the real second, and leave no timer running after unmount.

| Piece | Vue tool | Why |
| :--- | :--- | :--- |
| Current time | <code>shallowRef(new Date())</code> in a composable | A <code>Date</code> is replaced, never mutated, so shallow tracking is enough. |
| 12-hour flag | <code>ref(false)</code> | The toggle. |
| Strings shown | <code>computed</code> over both | Derived, cached, recomputed only when <code>now</code> or the flag changes. |
| Timer id | A plain <code>let</code> in the composable | Never rendered, so it does not need to be reactive. |

📌 **Interview term: Composable** — a function, by convention named <code>useX</code>, that uses Vue reactivity and lifecycle hooks so a piece of stateful logic can be reused. <code>useNow()</code> here owns the timer and returns a ref.

📌 **Interview term: shallowRef** — a ref that tracks only replacement of <code>.value</code>, not changes inside the object. Ideal for a <code>Date</code> you swap every second. See [shallowRef and shallowReactive](/interview-question/what-are-shallowref-and-shallowreactive).

## 3. Build It

### The formatter (pure, no Vue at all)

~~~js
const pad = (n) => String(n).padStart(2, "0");

// Pure function: Date + format flag in,
// display strings out. Easy to test.
export function formatClock(date, hour12) {
  const h = date.getHours();
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  const iso = pad(h) + ":" + m + ":" + s;
  const shownHour = hour12 ? h % 12 || 12 : h;
  return {
    time: pad(shownHour) + ":" + m + ":" + s,
    period: hour12 ? (h < 12 ? "AM" : "PM") : "",
    iso,
    date: date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}
~~~

<code>padStart</code> gives the zeros; <code>h % 12 || 12</code> turns hour 0 and hour 12 into 12, so midnight is <code>12:00:00 AM</code> rather than <code>00:00:00 AM</code>.

### The composable

~~~js
import { onMounted, onUnmounted, shallowRef } from "vue";

// A ref holding the current Date, refreshed
// on every new wall-clock second.
// Each tick reads the real time and aims at the NEXT second boundary,
// so a late tick is corrected on the
// following one instead of adding up.
export function useNow() {
  const now = shallowRef(new Date());
  let id;
  const tick = () => {
    now.value = new Date();
    id = setTimeout(tick, 1000 - (now.value.getTime() % 1000));
  };
  onMounted(() => {
    id = setTimeout(tick, 1000 - (Date.now() % 1000));
  });
  onUnmounted(() => clearTimeout(id));
  return now;
}
~~~

📌 **Interview term: Drift** — the growing gap between a timer-driven display and real time, caused by counting ticks. Each tick can be late (busy main thread, background tab), and lateness accumulates. Reading the clock on every tick removes it.

📌 **Interview term: Aligning to the second boundary** — the delay <code>1000 - (time % 1000)</code> is the time left until the next whole second, so each tick lands just after the digits should change. A free-running <code>setInterval(1000)</code> would lag by whatever millisecond it happened to start on.

The timer starts in <code>onMounted</code> and stops in <code>onUnmounted</code>. Because <code>tick</code> overwrites <code>id</code> each time, the unmount hook always clears the latest timeout of the chain. Starting in <code>onMounted</code> rather than at the top of <code>setup</code> also means nothing runs during server-side rendering. More on the hooks in [Vue lifecycle hooks](/interview-question/what-are-vue-lifecycle-hooks).

### The component

~~~vue
<script setup>
import { computed, ref } from "vue";
import { useNow } from "../composables/useNow";
import { formatClock } from "../formatClock";

const now = useNow();
const hour12 = ref(false);
const view = computed(() => formatClock(now.value, hour12.value));
</script>

<template>
  <section class="clock" aria-labelledby="clock-title">
    <h1 id="clock-title" class="title">Digital Clock</h1>
    <time class="time" :datetime="view.iso" data-testid="time">
      {{ view.time }}
      <span v-if="view.period" class="period">{{ view.period }}</span>
    </time>
    <p class="date" data-testid="date">{{ view.date }}</p>
    <button
      type="button"
      class="toggle"
      :aria-pressed="hour12"
      data-testid="format"
      @click="hour12 = !hour12"
    >
      12-hour format
    </button>
  </section>
</template>

<style scoped>
.clock {
  width: 100%;
  max-width: 420px;
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 24px 16px;
  text-align: center;
  box-sizing: border-box;
}
.title {
  margin: 0 0 12px;
  font-size: 1rem;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.time {
  display: block;
  font-size: clamp(2.4rem, 13vw, 3.6rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #38bdf8;
}
.period {
  font-size: 0.45em;
  color: #7dd3fc;
}
.date {
  margin: 8px 0 20px;
  color: #cbd5e1;
}
.toggle {
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid #334155;
  border-radius: 999px;
  padding: 8px 16px;
  font: inherit;
  cursor: pointer;
}
.toggle[aria-pressed="true"] {
  background: #0369a1;
  border-color: #38bdf8;
}
.toggle:focus-visible {
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
}
</style>
~~~

- One <code>computed</code> returns all four strings, so the template reads <code>view.time</code>, <code>view.period</code> and so on. See [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch) for why this is a computed and not a watcher.
- The space between the time and the AM/PM span sits *outside* the span. An early version wrote <code>&lt;span&gt; {{ view.period }}&lt;/span&gt;</code> and the compiled template (default <code>whitespace: "condense"</code>) printed <code>12:00:01AM</code>: the leading space inside the span did not survive. Moving the space outside fixed it.
- <code>:aria-pressed="hour12"</code> renders <code>"true"</code>/<code>"false"</code>, and the label stays "12-hour format" so a screen reader says "12-hour format, toggle button, pressed".

📌 **Interview term: Semantic &lt;time&gt; element** — the HTML element for a time; its <code>datetime</code> attribute holds the machine-readable 24-hour value while the visible text is formatted for people.

## 4. Verified

The driver swapped the global <code>Date</code> for one shifted to 23:59:57 UTC (real milliseconds kept), recorded every tick, toggled the format, and then ran a naive "add a second per <code>setInterval</code> tick" counter next to the app while blocking the main thread for 1500 ms. A preloaded wrapper counted the solution's own timers:

~~~text
RENDERED: Digital Clock18:15:34 Friday, October 16, 2026 12-hour format
timers after mount: created 1 timeout(s) + 0 interval(s), cleared 0, pending now 1
start  : 23:59:58 | Friday, October 16, 2026
ticks  : 23:59:59 -> 00:00:00 -> 00:00:01 | Saturday, October 17, 2026
ms after each second boundary that the tick fired: 0, 0, 0
12-hour: 12:00:01 AM | aria-pressed = true
24-hour: 00:00:01
after a 1500 ms long task: true time 00:00:06 | app shows 00:00:06 | a setInterval tick counter shows 00:00:05
timers now: created 10 timeout(s) + 0 interval(s), cleared 0, pending now 1
timers after unmount: 10 timeout(s) + 0 interval(s) created, 1 cleared, 0 still pending
~~~

- One timeout was pending after mount: Vue has no StrictMode-style double mount, so the composable starts one loop.
- Ticks fired within a millisecond of each boundary (exact values vary per run; Node can fire a timer 1 ms early, and the loop then re-aims 1 ms later).
- <code>23:59:59 -> 00:00:00</code> also rolled the date to Saturday; 12-hour mode printed <code>12:00:01 AM</code>.
- After the long task the app matched true time while the counter stayed a second behind.
- After <code>app.unmount()</code>, 0 timers were still pending, so <code>onUnmounted</code> cleaned up. Total timeout counts can differ by one between runs for the same early-tick reason.

## 5. Edge Cases and Accessibility

| Case | Behaviour |
| :--- | :--- |
| Midnight, noon | Hour 0 and 12 display as 12 in 12-hour mode |
| Busy main thread or background tab | The next tick reads the real time, so the display corrects itself |
| Server rendering | The timer starts in <code>onMounted</code>, which does not run on the server |
| Screen readers | No <code>aria-live</code>, so the time is not announced every second |
| Toggle | Native button, stable label, <code>aria-pressed</code>, visible focus ring |

## 6. Common Pitfalls

- **Counting ticks** with <code>seconds.value++</code>: drifts, as the counter in the Verified run shows.
- **Starting the timer in <code>setup</code> and never clearing it**: the loop outlives the component, and every remount adds another loop.
- **Watching <code>now</code> to write a <code>timeString</code> ref**: that is a computed in disguise, with a chance to get out of sync.
- **A leading space inside the AM/PM span**: condensed away by the template compiler, giving <code>12:00:01AM</code>.
- **A deep <code>ref</code> for the Date**: harmless here, but <code>shallowRef</code> states the intent: the value is replaced, not mutated.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Truth:</strong> <span style="color:#f0e2c8;">"Every tick reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Date()</code>. I never increment a counter, so the clock cannot drift."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Composable:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useNow()</code> composable holds a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> Date and a timeout chain aimed at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1000 - now % 1000</code>, the next second boundary."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Lifecycle:</strong> <span style="color:#f0e2c8;">"The loop starts in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUnmounted</code> clears the latest timeout id, so nothing leaks and nothing runs during SSR."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Derived view:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> calls a pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formatClock(date, hour12)</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">padStart</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h % 12 || 12</code>, AM/PM. Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">now</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hour12</code> are state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;time datetime&gt;</code> element without a live region, and a toggle button with a stable label and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:aria-pressed</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onUnmounted</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onBeforeUnmount</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either works for clearing a timer. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBeforeUnmount</code> runs while the DOM is still there, which matters only if cleanup needs the DOM. Clearing a timeout does not.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watchEffect</code> to drive the clock?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You could start the loop in a watcher and clear it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code>, but nothing reactive drives the loop, so a watcher adds nothing. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUnmounted</code> says exactly what happens and when.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you share one ticker between many clocks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Create the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> and the timeout loop once at module scope (or in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effectScope</code>), start it when the first subscriber mounts and stop it when the last one unmounts, keeping a subscriber count.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formatClock</code> with fixed dates. Mount the component with Vue Test Utils and fake timers (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vi.useFakeTimers()</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vi.setSystemTime</code>), advance 1000 ms, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await nextTick()</code>, and assert the text.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Composable** | A reusable <code>useX</code> function built on Vue reactivity and lifecycle hooks |
| **shallowRef** | A ref that reacts only when <code>.value</code> is replaced |
| **Drift** | Error that builds up when you count ticks instead of reading the clock |
| **Aligning to the second boundary** | Scheduling the next tick for the time left until the next whole second |
| **Semantic &lt;time&gt; element** | HTML element with a machine-readable <code>datetime</code> |

---

**Conclusion:** In Vue the digital clock is a composable holding a <code>shallowRef</code> Date, a timeout chain that reads the clock and aims at the next second, and a lifecycle hook that stops it, with a <code>computed</code> doing all the formatting. The [Analog Clock](/interview-question/build-an-analog-clock) reuses the same loop and turns the time into angles.`,
        files: {
          "/src/App.vue": `<script setup>
import DigitalClock from "./components/DigitalClock.vue";
</script>

<template>
  <main class="page">
    <DigitalClock />
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0b1120;
  color: #e2e8f0;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
</style>
`,
          "/src/components/DigitalClock.vue": `<script setup>
import { computed, ref } from "vue";
import { useNow } from "../composables/useNow";
import { formatClock } from "../formatClock";

const now = useNow();
const hour12 = ref(false);
const view = computed(() => formatClock(now.value, hour12.value));
</script>

<template>
  <section class="clock" aria-labelledby="clock-title">
    <h1 id="clock-title" class="title">Digital Clock</h1>
    <time class="time" :datetime="view.iso" data-testid="time">
      {{ view.time }}
      <span v-if="view.period" class="period">{{ view.period }}</span>
    </time>
    <p class="date" data-testid="date">{{ view.date }}</p>
    <button
      type="button"
      class="toggle"
      :aria-pressed="hour12"
      data-testid="format"
      @click="hour12 = !hour12"
    >
      12-hour format
    </button>
  </section>
</template>

<style scoped>
.clock {
  width: 100%;
  max-width: 420px;
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 24px 16px;
  text-align: center;
  box-sizing: border-box;
}
.title {
  margin: 0 0 12px;
  font-size: 1rem;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.time {
  display: block;
  font-size: clamp(2.4rem, 13vw, 3.6rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #38bdf8;
}
.period {
  font-size: 0.45em;
  color: #7dd3fc;
}
.date {
  margin: 8px 0 20px;
  color: #cbd5e1;
}
.toggle {
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid #334155;
  border-radius: 999px;
  padding: 8px 16px;
  font: inherit;
  cursor: pointer;
}
.toggle[aria-pressed="true"] {
  background: #0369a1;
  border-color: #38bdf8;
}
.toggle:focus-visible {
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
}
</style>
`,
          "/src/composables/useNow.js": `import { onMounted, onUnmounted, shallowRef } from "vue";

// A ref holding the current Date, refreshed on every new wall-clock second.
// Each tick reads the real time and aims at the NEXT second boundary,
// so a late tick is corrected on the following one instead of adding up.
export function useNow() {
  const now = shallowRef(new Date());
  let id;
  const tick = () => {
    now.value = new Date();
    id = setTimeout(tick, 1000 - (now.value.getTime() % 1000));
  };
  onMounted(() => {
    id = setTimeout(tick, 1000 - (Date.now() % 1000));
  });
  onUnmounted(() => clearTimeout(id));
  return now;
}
`,
          "/src/formatClock.js": `const pad = (n) => String(n).padStart(2, "0");

// Pure function: Date + format flag in, display strings out. Easy to test.
export function formatClock(date, hour12) {
  const h = date.getHours();
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  const iso = pad(h) + ":" + m + ":" + s;
  const shownHour = hour12 ? h % 12 || 12 : h;
  return {
    time: pad(shownHour) + ":" + m + ":" + s,
    period: hour12 ? (h < 12 ? "AM" : "PM") : "",
    iso,
    date: date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Beginners preparing for a frontend machine coding round in Angular. You know basic TypeScript; signals, standalone components and <code>DestroyRef</code> are explained as they come up.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. The output under "Verified" was printed by booting this solution on Angular 22.2.3 with <code>bootstrapApplication(AppComponent)</code> in jsdom, twice: AOT-compiled with strict templates, and JIT-compiled the way the playground runs it.

## 1. A Story First

A battery wall clock nudges its hands once a second; when a nudge is late it never catches up, so after a week it is slow. A radio-controlled clock keeps checking the time signal and shows what it says. Build the second kind: every tick asks the system clock what time it is. A late tick then delays one update and nothing more.

## 2. Requirements and Plan

Show <code>HH:MM:SS</code> zero-padded with the date, toggle 12/24-hour, flip right on the real second, and leave nothing running after the component is destroyed.

| Piece | Angular tool | Why |
| :--- | :--- | :--- |
| Current time | <code>signal(new Date())</code> | Setting it schedules a re-render. |
| 12-hour flag | <code>signal(false)</code> | The toggle. |
| Strings shown | <code>computed(() =&gt; formatClock(...))</code> | Derived and cached; recomputed only when a signal it reads changes. |
| Timer id | A private field | Never rendered, so it does not need to be a signal. |
| Cleanup | <code>inject(DestroyRef).onDestroy(...)</code> | Runs when the component is destroyed. |

📌 **Interview term: Signal** — a reactive value: read it by calling it (<code>now()</code>), change it with <code>set</code> or <code>update</code>, and any template or <code>computed</code> that read it updates. See [Angular signals](/interview-question/what-are-angular-signals).

📌 **Interview term: Zoneless change detection** — the playground boots Angular 22 without zone.js-driven change detection (the bootstrap stack in this run shows <code>NoopNgZone</code>). Angular then re-renders when a signal used by the template changes, not after every <code>setTimeout</code>. A plain field updated inside a timer would never show up; a signal does. Background in [zoneless Angular](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18).

## 3. Build It

### The formatter

~~~ts
export interface ClockView {
  time: string;
  period: string;
  iso: string;
  date: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Pure function: Date + format flag in,
// display strings out. Easy to test.
export function formatClock(date: Date, hour12: boolean): ClockView {
  const h = date.getHours();
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  const shownHour = hour12 ? h % 12 || 12 : h;
  return {
    time: pad(shownHour) + ":" + m + ":" + s,
    period: hour12 ? (h < 12 ? "AM" : "PM") : "",
    iso: pad(h) + ":" + m + ":" + s,
    date: date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}
~~~

<code>h % 12 || 12</code> maps hours 0 and 12 to 12, so midnight shows <code>12:00:00 AM</code>. Keeping this pure means it can be unit-tested without TestBed.

### The component

~~~ts
import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from "@angular/core";
import { formatClock } from "./format-clock";

@Component({
  selector: "app-digital-clock",
  standalone: true,
  template: \`
    <section class="clock" aria-labelledby="clock-title">
      <h1 id="clock-title" class="title">Digital Clock</h1>
      <time
        class="time"
        [attr.datetime]="view().iso"
        data-testid="time"
      >
        {{ view().time }}@if (view().period) {<span class="period"> {{ view().period }}</span>}
      </time>
      <p class="date" data-testid="date">{{ view().date }}</p>
      <button
        type="button"
        class="toggle"
        [attr.aria-pressed]="hour12()"
        data-testid="format"
        (click)="hour12.set(!hour12())"
      >
        12-hour format
      </button>
    </section>
  \`,
  styles: [
    \`
    .clock { width: 100%; max-width: 420px; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 24px 16px; text-align: center; box-sizing: border-box; }
    .title { margin: 0 0 12px; font-size: 1rem; font-weight: 600; color: #94a3b8; letter-spacing: 0.08em; text-transform: uppercase; }
    .time { display: block; font-size: clamp(2.4rem, 13vw, 3.6rem); font-weight: 700; font-variant-numeric: tabular-nums; color: #38bdf8; }
    .period { font-size: 0.45em; color: #7dd3fc; }
    .date { margin: 8px 0 20px; color: #cbd5e1; }
    .toggle { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-radius: 999px; padding: 8px 16px; font: inherit; cursor: pointer; }
    .toggle[aria-pressed="true"] { background: #0369a1; border-color: #38bdf8; }
    .toggle:focus-visible { outline: 3px solid #fbbf24; outline-offset: 2px; }
  \`,
  ],
})
export class DigitalClockComponent {
  readonly now = signal(new Date());
  readonly hour12 = signal(false);
  readonly view = computed(() =>
    formatClock(this.now(), this.hour12()),
  );

  private timerId: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Each tick reads the real time and
    // aims at the NEXT second boundary.
    const tick = () => {
      const d = new Date();
      this.now.set(d);
      this.timerId = setTimeout(tick, 1000 - (d.getTime() % 1000));
    };
    this.timerId = setTimeout(tick, 1000 - (Date.now() % 1000));
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timerId));
  }
}
~~~

📌 **Interview term: Drift** — the gap that grows when a display counts timer ticks instead of reading the clock, because every late tick adds its lateness. Here each <code>tick</code> calls <code>new Date()</code>, so there is nothing to accumulate.

📌 **Interview term: Aligning to the second boundary** — the next delay is <code>1000 - (time % 1000)</code>, the time until the next whole second, so the digits change within a millisecond of the real second instead of lagging by whatever millisecond a <code>setInterval</code> happened to start on.

📌 **Interview term: DestroyRef** — an injectable handle on the current component lifetime; <code>onDestroy(fn)</code> registers cleanup without implementing <code>ngOnDestroy</code>. It must be called in an injection context, which the constructor is. Compare with [Angular lifecycle hooks](/interview-question/what-are-angular-lifecycle-hooks).

Template notes:

- The built-in <code>@if</code> block renders the AM/PM span only in 12-hour mode; no <code>NgIf</code> import needed.
- <code>[attr.datetime]</code> and <code>[attr.aria-pressed]</code> are attribute bindings: <code>datetime</code> and <code>aria-pressed</code> are attributes, not DOM properties.
- The button label stays "12-hour format"; <code>aria-pressed</code> carries the state.

<code>app.component.ts</code> is the <code>app-root</code> shell. It uses <code>ViewEncapsulation.None</code> only for the <code>body</code> and page rules, which must be global.

## 4. Verified

The driver replaced the global <code>Date</code> with one shifted to 23:59:57 UTC (real milliseconds kept), recorded each tick, toggled the format, then blocked the main thread for 1500 ms next to a naive "add a second per <code>setInterval</code> tick" counter. A preloaded wrapper counted only the timers the component created, ignoring Angular's own scheduler.

AOT build with strict templates:

~~~text
RENDERED: Digital Clock 18:15:51Friday, October 16, 2026 12-hour format
timers after mount: created 1 timeout(s) + 0 interval(s), cleared 0, pending now 1
start  : 23:59:58 | Friday, October 16, 2026
ticks  : 23:59:59 -> 00:00:00 -> 00:00:01 | Saturday, October 17, 2026
ms after each second boundary that the tick fired: 1, 1, 1
12-hour: 12:00:01 AM | aria-pressed = true
24-hour: 00:00:01
after a 1500 ms long task: true time 00:00:06 | app shows 00:00:06 | a setInterval tick counter shows 00:00:05
timers now: created 9 timeout(s) + 0 interval(s), cleared 0, pending now 1
timers after unmount: 9 timeout(s) + 0 interval(s) created, 1 cleared, 0 still pending
~~~

JIT, as in the playground:

~~~text
RENDERED: Digital Clock 18:16:02Friday, October 16, 2026 12-hour format
timers after mount: created 1 timeout(s) + 0 interval(s), cleared 0, pending now 1
start  : 23:59:58 | Friday, October 16, 2026
ticks  : 23:59:59 -> 00:00:00 -> 00:00:01 | Saturday, October 17, 2026
ms after each second boundary that the tick fired: 1, 1, 0
12-hour: 12:00:01 AM | aria-pressed = true
24-hour: 00:00:01
after a 1500 ms long task: true time 00:00:06 | app shows 00:00:06 | a setInterval tick counter shows 00:00:05
timers now: created 9 timeout(s) + 0 interval(s), cleared 0, pending now 1
timers after unmount: 9 timeout(s) + 0 interval(s) created, 1 cleared, 0 still pending
~~~

- One timeout pending after mount, and 0 pending after <code>appRef.destroy()</code>, so <code>DestroyRef</code> cleaned up. Total timeout counts can differ by one between runs (an early tick adds a 1 ms re-aim).
- Ticks landed within about a millisecond of each boundary (values vary per run; a negative value would mean a millisecond early, which the loop absorbs by re-aiming).
- Midnight rolled the date to Saturday; 12-hour mode printed <code>12:00:01 AM</code>.
- After the long task the clock matched true time; the tick counter stayed a second behind.

## 5. Edge Cases and Accessibility

| Case | Behaviour |
| :--- | :--- |
| Midnight, noon | Hours 0 and 12 display as 12 in 12-hour mode |
| Busy main thread or background tab | The next tick reads the real time, so the display corrects itself |
| Zoneless rendering | Only signals drive updates; the timer writes a signal |
| Screen readers | No <code>aria-live</code>, so the time is not read out every second |
| Toggle | Native button with stable text and <code>aria-pressed</code> |

## 6. Common Pitfalls

- **Counting ticks** (<code>this.seconds.update(s =&gt; s + 1)</code>): drifts.
- **Updating a plain field in the timer**: in a zoneless app nothing re-renders. Use a signal.
- **Forgetting cleanup**: without <code>clearTimeout</code> in <code>onDestroy</code> the chain keeps running after the component is gone.
- **Using <code>effect()</code> to copy <code>now</code> into a formatted signal**: that is what <code>computed</code> is for. See [when not to use effect](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it).
- **Binding <code>[aria-pressed]</code> as a property**: it is an attribute; use <code>[attr.aria-pressed]</code>.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Truth:</strong> <span style="color:#f0e2c8;">"Every tick reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Date()</code> and sets a signal; I never increment a counter, so it cannot drift."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Scheduling:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> chain aimed at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1000 - now % 1000</code> flips the digits right on the second."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cleanup:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject(DestroyRef).onDestroy</code> clears the latest timeout id, so nothing runs after the component is destroyed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Derived view:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> calls a pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formatClock(date, hour12)</code>; only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">now</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hour12</code> are signals."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Template:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code> for AM/PM, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[attr.datetime]</code> on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;time&gt;</code> element, a toggle with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[attr.aria-pressed]</code> and no live region."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not RxJS <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">interval(1000)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works if you map each emission to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Date()</code> (never count emissions) and unsubscribe, for example with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">takeUntilDestroyed()</code>. But <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">interval</code> keeps its own fixed phase, so the display lags the true second unless you add the boundary alignment by hand.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the timer write a signal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">This app is zoneless, so Angular re-renders when a signal read by the template changes. With zone.js, a timer callback would trigger change detection automatically; without it, a plain field change is invisible.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where else could the timer start?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code>, or in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> if it must not run during server rendering. The constructor is fine in a browser-only app and gives a natural injection context for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DestroyRef</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formatClock</code> directly. For the component, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed</code> with Jasmine <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jasmine.clock().mockDate()</code> or Jest fake timers, advance 1000 ms, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code> and read the text.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Signal** | A reactive value read by calling it and changed with <code>set</code>/<code>update</code> |
| **Zoneless change detection** | Angular re-renders on signal changes instead of after every async task |
| **Drift** | Error that builds up when you count ticks instead of reading the clock |
| **Aligning to the second boundary** | Scheduling the next tick for the time left until the next whole second |
| **DestroyRef** | Injectable that lets you register cleanup for the current component |

---

**Conclusion:** In Angular the digital clock is two signals, one <code>computed</code>, a timeout chain that reads the clock and aims at the next second, and a <code>DestroyRef</code> cleanup. Zoneless rendering makes the signal essential rather than optional. The [Analog Clock](/interview-question/build-an-analog-clock) builds on the same loop with an <code>effect()</code> that can switch between per-second and per-frame updates.`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation } from "@angular/core";
import { DigitalClockComponent } from "./digital-clock.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [DigitalClockComponent],
  template: \`<main class="page"><app-digital-clock /></main>\`,
  // these two rules are global on purpose
  encapsulation: ViewEncapsulation.None,
  styles: [
    \`
      body {
        margin: 0;
        background: #0b1120;
        color: #e2e8f0;
        font-family: system-ui, sans-serif;
      }
      .page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 16px;
        box-sizing: border-box;
      }
    \`,
  ],
})
export class AppComponent {}
`,
          "/src/app/digital-clock.component.ts": `import { Component, DestroyRef, computed, inject, signal } from "@angular/core";
import { formatClock } from "./format-clock";

@Component({
  selector: "app-digital-clock",
  standalone: true,
  template: \`
    <section class="clock" aria-labelledby="clock-title">
      <h1 id="clock-title" class="title">Digital Clock</h1>
      <time class="time" [attr.datetime]="view().iso" data-testid="time">
        {{ view().time }}@if (view().period) {<span class="period"> {{ view().period }}</span>}
      </time>
      <p class="date" data-testid="date">{{ view().date }}</p>
      <button
        type="button"
        class="toggle"
        [attr.aria-pressed]="hour12()"
        data-testid="format"
        (click)="hour12.set(!hour12())"
      >
        12-hour format
      </button>
    </section>
  \`,
  styles: [
    \`
    .clock { width: 100%; max-width: 420px; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 24px 16px; text-align: center; box-sizing: border-box; }
    .title { margin: 0 0 12px; font-size: 1rem; font-weight: 600; color: #94a3b8; letter-spacing: 0.08em; text-transform: uppercase; }
    .time { display: block; font-size: clamp(2.4rem, 13vw, 3.6rem); font-weight: 700; font-variant-numeric: tabular-nums; color: #38bdf8; }
    .period { font-size: 0.45em; color: #7dd3fc; }
    .date { margin: 8px 0 20px; color: #cbd5e1; }
    .toggle { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-radius: 999px; padding: 8px 16px; font: inherit; cursor: pointer; }
    .toggle[aria-pressed="true"] { background: #0369a1; border-color: #38bdf8; }
    .toggle:focus-visible { outline: 3px solid #fbbf24; outline-offset: 2px; }
  \`,
  ],
})
export class DigitalClockComponent {
  readonly now = signal(new Date());
  readonly hour12 = signal(false);
  readonly view = computed(() => formatClock(this.now(), this.hour12()));

  private timerId: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Each tick reads the real time and aims at the NEXT second boundary.
    const tick = () => {
      const d = new Date();
      this.now.set(d);
      this.timerId = setTimeout(tick, 1000 - (d.getTime() % 1000));
    };
    this.timerId = setTimeout(tick, 1000 - (Date.now() % 1000));
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timerId));
  }
}
`,
          "/src/app/format-clock.ts": `export interface ClockView {
  time: string;
  period: string;
  iso: string;
  date: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Pure function: Date + format flag in, display strings out. Easy to test.
export function formatClock(date: Date, hour12: boolean): ClockView {
  const h = date.getHours();
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  const shownHour = hour12 ? h % 12 || 12 : h;
  return {
    time: pad(shownHour) + ":" + m + ":" + s,
    period: hour12 ? (h < 12 ? "AM" : "PM") : "",
    iso: pad(h) + ":" + m + ":" + s,
    date: date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build an Analog Clock",
    seoDescription:
      "Build an analog clock in React, Vue and Angular: correct hand angles, a smooth requestAnimationFrame sweep or per-second ticks, drift-free and cleaned up.",
    description: `**Question presented to candidate:**
"Build an analog clock: a round face with hour, minute and second hands that always show the current time. I would like the second hand to sweep smoothly, but give me a way to switch it to a classic one-tick-per-second movement. Walk me through the angle maths."

**Requirements:**
- A clock face with 60 tick marks and the numbers 1 to 12, drawn with SVG.
- Hour, minute and second hands rotated to the current time; the hour hand moves gradually between numbers, not in jumps.
- A "Smooth second hand" switch: on means a continuous sweep, off means one step per second.
- Drift-free (angles always come from the real time) and nothing left running after unmount.
- An accessible text equivalent of the time.

**What a strong answer should cover:**
- The angle formulas: 6 degrees per second, 6 degrees per minute, 30 degrees per hour, each including the fraction of the smaller unit (\`hour = 30 * (h % 12 + m / 60)\`).
- Rotating around the centre with SVG \`transform="rotate(deg cx cy)"\` (or CSS \`transform-origin\`).
- \`requestAnimationFrame\` for the smooth sweep versus a timeout aimed at the next second for tick mode, switching cleanly with cancellation (\`cancelAnimationFrame\` / \`clearTimeout\`).
- Reading the time every frame or tick instead of adding to an angle, so the hands cannot drift.
- The 360-to-0 wrap at 12 o clock, and why a CSS transition on \`rotate\` makes the hand spin backwards there.
- Rendering cost of 60 updates per second and when to bypass the framework with direct DOM writes.

**Clarifying questions expected:**
- "Is a smooth sweep required, or is one tick per second enough?"
- "SVG or CSS-rotated divs? Should it scale to any size?"
- "Local time only, or a configurable time zone?"

**Code / implementation expected:** Yes. A working SVG clock with correct hand angles, both movement modes, a clean switch between them and cleanup.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Developers preparing for a frontend machine coding round who have built a simple React component before. Angles, SVG transforms and <code>requestAnimationFrame</code> are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary interviewers expect. Every output under "Verified" was printed by running this exact solution on React 19.3.1 inside <code>&lt;StrictMode&gt;</code> in jsdom.

## 1. Why This Even Matters — A Story First

An analog clock is a tiny physics problem dressed up as a widget. Look at a real one at half past ten: the hour hand is not on the 10, it is halfway between 10 and 11. The minute hand at 30 minutes and 30 seconds is a little past the 6. Every hand carries a bit of the smaller units with it.

There are two ways to make hands move on screen. You can *push* them: every second, add 6 degrees to the second hand. Or you can *point* them: every frame, look at the clock and point each hand at the angle that time deserves. Pushing drifts and gets confused at 12 o clock. Pointing is always right, which is why this build points.

The interviewer is checking three things: do you get the angle maths right, do you pick the right timing primitive for a smooth sweep, and do you stop that loop properly when the user switches modes or leaves the page. If you have not built the [Digital Clock](/interview-question/build-a-digital-clock) yet, it covers the "read the clock, never count" idea in its simplest form.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Smooth sweep or one tick per second? | Smooth needs a per-frame loop (<code>requestAnimationFrame</code>); ticks need one timer per second. We support both behind a switch. |
| SVG or CSS-rotated divs? | SVG scales cleanly from a phone to a wall display with one <code>viewBox</code>; divs need <code>transform-origin</code> tricks. |
| Should it scale to any size? | Decide early to avoid pixel maths; a <code>viewBox</code> makes everything relative. |
| Local time or a configurable time zone? | A zone means getting hours and minutes from <code>Intl.DateTimeFormat</code> parts instead of <code>getHours()</code>. |
| Numbers on the face, or only ticks? | Affects layout and the label maths; we draw 60 ticks and 12 numbers. |
| Any accessibility expectation? | An image-only clock is invisible to screen readers; we expose the time as a label. |

## 3. Requirements and Plan

**Component tree.** <code>App</code> renders <code>AnalogClock</code>. The clock uses <code>useClockTime(smooth)</code>, a hook that owns the timing loop, and imports pure helpers from <code>clockMath.js</code>: <code>handAngles()</code>, <code>spokenTime()</code> and the static face geometry.

**State model.**

| Piece | Kind | Why |
| :--- | :--- | :--- |
| <code>now</code> (a <code>Date</code>) | State inside the hook | Every change must re-render the hands. |
| <code>smooth</code> | State | The switch; it decides which loop runs. |
| Hand angles, aria label | Derived each render | Pure functions of <code>now</code> and <code>smooth</code>. |
| Tick and number positions | Module constants | They never change, so compute them once at load time, not per frame. |
| Frame id, timer id | Locals in the effect | Only the cleanup needs them. |

<svg class="iq-diagram" width="100%" viewBox="0 0 680 280" role="img" aria-label="The smooth switch picks a per frame loop or a per second timeout; both read the clock and feed the same angle function">
  <defs>
    <marker id="ac-r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="108" width="150" height="64" rx="10"/>
  <text class="d-text" x="95" y="136" text-anchor="middle">smooth switch</text>
  <text class="d-sub" x="95" y="158" text-anchor="middle">state</text>
  <rect class="d-box" x="240" y="24" width="190" height="64" rx="10"/>
  <text class="d-text" x="335" y="52" text-anchor="middle">rAF loop</text>
  <text class="d-sub" x="335" y="74" text-anchor="middle">about 60 reads a second</text>
  <rect class="d-box" x="240" y="192" width="190" height="64" rx="10"/>
  <text class="d-text" x="335" y="220" text-anchor="middle">Boundary timeout</text>
  <text class="d-sub" x="335" y="242" text-anchor="middle">1 read a second</text>
  <rect class="d-box-accent" x="500" y="108" width="160" height="64" rx="10"/>
  <text class="d-text d-accent" x="580" y="136" text-anchor="middle">handAngles</text>
  <text class="d-sub" x="580" y="158" text-anchor="middle">new Date() in</text>
  <path class="d-edge" d="M 170 130 L 205 130 L 205 56 L 234 56" marker-end="url(#ac-r-arrow)"/>
  <path class="d-edge-dashed" d="M 170 150 L 205 150 L 205 224 L 234 224" marker-end="url(#ac-r-arrow)"/>
  <path class="d-edge-accent" d="M 430 56 L 465 56 L 465 130 L 494 130" marker-end="url(#ac-r-arrow)"/>
  <path class="d-edge-accent" d="M 430 224 L 465 224 L 465 150 L 494 150" marker-end="url(#ac-r-arrow)"/>
</svg>

Only one of the two loops runs at a time. Switching tears down the old loop in the effect cleanup and starts the other one; both feed the same pure angle function.

## 4. Build It Step by Step

### Step 1: the angle maths

~~~js
// clockMath.js (excerpt)
export function handAngles(date, smooth) {
  const ms = smooth ? date.getMilliseconds() : 0;
  const s = date.getSeconds() + ms / 1000;
  const m = date.getMinutes() + s / 60;
  const h = (date.getHours() % 12) + m / 60;
  return { hour: h * 30, minute: m * 6, second: s * 6 };
}
~~~

A full turn is 360 degrees. The second hand makes a turn in 60 seconds, so 360 / 60 = **6 degrees per second**. The minute hand also makes a turn in 60 minutes: **6 degrees per minute**. The hour hand makes a turn in 12 hours: **30 degrees per hour**.

The key move is to build *fractional* units first: seconds including milliseconds, minutes including seconds, hours including minutes. At 10:08:30.500 that gives <code>s = 30.5</code>, <code>m = 8.508</code>, <code>h = 10.142</code>, so the hands sit at 183, 51.05 and 304.25 degrees. In tick mode the milliseconds are dropped, so the second hand jumps in exact 6-degree steps.

📌 **Interview term: Fractional time units** — expressing the time as a single decimal per hand (10.142 hours) so each hand moves continuously. Without it, the hour hand sits on the 10 for a whole hour and then jumps.

<code>% 12</code> folds the 24-hour clock onto the 12-hour face. It also explains the only "jump": at 12:00:00 the hour angle goes from about 359.99 to 0, which is the same position on the dial.

### Step 2: the static face, computed once

~~~js
// clockMath.js (excerpt)
export const TICKS = Array.from({ length: 60 }, (_, i) => {
  const major = i % 5 === 0;
  const a = rad(i * 6);
  const r1 = major ? 80 : 85;
  return {
    i,
    major,
    x1: round(100 + r1 * Math.sin(a)),
    y1: round(100 - r1 * Math.cos(a)),
    x2: round(100 + 90 * Math.sin(a)),
    y2: round(100 - 90 * Math.cos(a)),
  };
});
~~~

The face is a 200 by 200 <code>viewBox</code> centred on (100, 100). A point at angle <code>a</code> and radius <code>r</code> is at <code>x = 100 + r sin a</code>, <code>y = 100 - r cos a</code>: SVG's y axis points down, and 0 degrees should be 12 o clock, hence <code>sin</code> for x and minus <code>cos</code> for y. Every fifth tick is longer. The numbers use the same formula at radius 68. All of this lives at module scope, so it is computed once, not 60 times a second.

### Step 3: the timing hook

~~~js
import { useEffect, useState } from "react";

// smooth = true : re-read the time on
// every animation frame (sweeping hand).
// smooth = false: re-read it once per
// second, aimed at the next second boundary.
// Either way the angle comes from the
// real time, never from a tick counter.
export function useClockTime(smooth) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let frame = 0;
    let timer = 0;
    if (smooth) {
      const loop = () => {
        setNow(new Date());
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    } else {
      const tick = () => {
        const d = new Date();
        setNow(d);
        timer = setTimeout(tick, 1000 - (d.getTime() % 1000));
      };
      tick();
    }
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [smooth]);

  return now;
}
~~~

📌 **Interview term: requestAnimationFrame (rAF)** — asks the browser to call your function right before the next repaint, typically 60 times a second (more on high-refresh screens), and not at all in a background tab. That makes it the right tool for motion and the wrong tool for anything that must run while the tab is hidden.

📌 **Interview term: Drift-free animation** — every frame reads <code>new Date()</code> and computes the angle from scratch. A missed or late frame cannot add up, because nothing is accumulated. The opposite, <code>angle += 0.1</code> per frame, runs slow on a 30 fps phone and fast on a 120 Hz monitor.

The effect depends on <code>[smooth]</code>. When the switch flips, React runs the cleanup (which cancels both the frame and the timer, whichever exists) and then the effect again with the new mode. The same cleanup runs on unmount and during the StrictMode mount-cleanup-mount cycle, which is covered in [the cleanup function in useEffect](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect).

Notice that <code>frame</code> is reassigned on every frame. The cleanup closes over the variable, not the first value, so it always cancels the latest request.

### Step 4: the hands

~~~jsx
// AnalogClock.js (excerpt)
const rotate = (deg) => "rotate(" + deg.toFixed(2) + " 100 100)";

const now = useClockTime(smooth);
const a = handAngles(now, smooth);
const label = "Analog clock showing " + spokenTime(now);

<line
  x1="100"
  y1="112"
  x2="100"
  y2="52"
  className="hand hour"
  transform={rotate(a.hour)}
  data-testid="hand-hour"
/>
<line x1="100" y1="114" x2="100" y2="30" className="hand minute" transform={rotate(a.minute)} data-testid="hand-minute" />
<line x1="100" y1="120" x2="100" y2="22" className="hand second" transform={rotate(a.second)} data-testid="hand-second" />
~~~

Every hand is drawn pointing straight up at 12, from slightly below the centre (a small tail) to its length. Then <code>rotate(deg 100 100)</code> spins it around the centre.

📌 **Interview term: SVG rotate with a pivot** — <code>transform="rotate(angle cx cy)"</code> rotates an SVG element around the point (cx, cy) instead of the origin (0, 0). It replaces the CSS dance of <code>transform-origin</code> plus <code>transform-box</code>.

The <code>&lt;svg&gt;</code> itself has <code>role="img"</code> and <code>aria-label={label}</code>, for example "Analog clock showing 10:08:30". The label is derived from <code>now</code> like everything else; it only changes text once per second even though the component renders 60 times a second.

The switch is a native checkbox inside a <code>&lt;label&gt;</code>: <code>checked={smooth}</code> and <code>onChange={(e) =&gt; setSmooth(e.target.checked)}</code>.

## 5. Verified

Run with <code>scripts/verify-mc-solution.mjs</code>, rendered as <code>&lt;StrictMode&gt;&lt;App /&gt;&lt;/StrictMode&gt;</code> in jsdom (which runs rAF at 60 Hz with <code>pretendToBeVisual</code>). The driver first **froze** the global <code>Date</code> at 10:08:30.500 UTC to check the angles exactly, then installed a **moving** fake clock shifted to 11:59:57 to cross 12 o clock, and counted <code>requestAnimationFrame</code> calls by wrapping the global. A preloaded wrapper counted the solution's timeouts:

~~~text
RENDERED: Analog Clock123456789101112Smooth second hand
ticks: 60 | numbers: 1 2 3 4 5 6 7 8 9 10 11 12
frozen at 10:08:30.500, smooth: hour 304.25, minute 51.05, second 183.00 | Analog clock showing 10:08:30
smooth off              : hour 304.25, minute 51.00, second 180.00 | checkbox checked = false
smooth on again         : hour 304.25, minute 51.05, second 183.00
smooth for 1000 ms      : 62 animation frames requested; second hand moved in 61 steps of 0.10 deg on average
12 o clock wrap         : hour hand went from 360.00 to 0.00 | Analog clock showing 12:00:00
smooth off for 1500 ms  : 0 animation frames, second-hand angles seen: 6.00 12.00
timers now: created 4 timeout(s) + 0 interval(s), cleared 1, pending now 1
timers after unmount: 4 timeout(s) + 0 interval(s) created, 2 cleared, 0 still pending
~~~

Reading it:

- **Angles**: 304.25 / 51.05 / 183.00 match the hand calculation in Step 1; tick mode drops the milliseconds to 180.00 and 51.00.
- **Smooth mode**: about 60 frames in a second, and the second hand advanced 0.10 degrees per frame on average, which is 6 degrees per second divided by 60 frames. Frame counts vary by a frame or two between runs.
- **The wrap**: the attribute is rounded to 2 decimals, so 359.999 prints as 360.00; the next frame is 0.00, the same position on the dial.
- **Switching**: with smooth off, zero animation frames were requested in 1.5 s and the second hand stepped from 6.00 to 12.00, so the rAF loop really stopped.
- **Cleanup**: 0 timers pending after unmount.

What jsdom cannot show: real paint timing and how smooth the sweep looks. That needs a real browser.

## 6. Edge Cases and Accessibility

| Case | What happens |
| :--- | :--- |
| 12 o clock | Hour angle wraps from 359.99 to 0; no CSS transition, so no backwards spin. |
| Background tab | rAF stops; on return the first frame reads the real time and the hands jump to it. |
| High-refresh screens | More frames, same angles, because each frame reads the clock. |
| Screen readers | <code>role="img"</code> with a time label, updated once a second; no live region, so it is not announced constantly. |
| Reduced motion | Users who prefer less motion can switch the sweep off; an extension is to default <code>smooth</code> from <code>matchMedia("(prefers-reduced-motion: reduce)")</code> (not available in jsdom, so not exercised here). |
| Resizing | The <code>viewBox</code> scales everything; CSS caps the face at 300 px wide. |

## 7. Common Pitfalls

- **Accumulating angles** (<code>angle += 6</code> per tick): drifts and depends on the frame rate. Always compute from the time.
- **A CSS <code>transition</code> on the hand transform**: at 59 seconds the hand goes from 354 to 0 degrees and the transition animates it *backwards* almost a full turn. Either skip transitions (as here), or keep an ever-increasing angle that never wraps.
- **Forgetting the fractional part of the hour**: the hour hand sits on the number for 59 minutes and then jumps.
- **Not cancelling the frame on mode switch**: both loops run, and in StrictMode you would even get two rAF loops. The effect cleanup cancels both kinds.
- **Rotating around the wrong origin**: CSS <code>rotate()</code> on an SVG line without a pivot spins it around the top-left corner. Pass the centre to SVG <code>rotate(deg 100 100)</code>.
- **Recomputing the face every frame**: 264 sine and cosine calls (60 ticks and 12 numbers) 60 times a second, for shapes that never move. Compute them once at module scope.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Maths first:</strong> <span style="color:#f0e2c8;">"Six degrees per second, six per minute, thirty per hour, and each hand includes the fraction of the smaller unit: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hour = 30 * (h % 12 + m / 60)</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Draw:</strong> <span style="color:#f0e2c8;">"An SVG <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewBox</code> of 200 by 200; each hand is a line pointing up from the centre, rotated with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rotate(deg 100 100)</code>. Ticks and numbers are computed once at module scope."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Timing:</strong> <span style="color:#f0e2c8;">"Smooth mode is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">requestAnimationFrame</code> loop, tick mode a timeout aimed at the next second; both read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Date()</code> every time, so nothing drifts."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Switch and cleanup:</strong> <span style="color:#f0e2c8;">"One effect keyed on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">smooth</code>. Its cleanup calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cancelAnimationFrame</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clearTimeout</code>, so switching, unmounting and StrictMode all leave exactly one loop."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Edges:</strong> <span style="color:#f0e2c8;">"No CSS transition, because of the 360-to-0 wrap; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=img</code> label with the spoken time; and the face scales with the viewBox."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Rendering 60 times a second in React: is that a problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For one small SVG it measured fine in the run here. If it were heavy, keep the loop but skip React: hold refs to the three lines and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">el.setAttribute("transform", ...)</code> inside the rAF callback, re-rendering through state only once a second for the label.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could CSS animation do the sweep with no JavaScript loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: set the start angle from the time once, then a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@keyframes</code> rotation of 360 degrees over 60 s, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">linear</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infinite</code>. It is cheap, but you must re-sync after the tab sleeps or the system clock changes, because CSS does not know the time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle another time zone?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Get hour, minute and second from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Intl.DateTimeFormat(..., { timeZone }).formatToParts(date)</code>, then feed them to the same angle maths. The milliseconds are the same in every zone.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the angles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">handAngles</code> is pure, so assert it directly: 3:00 gives hour 90, 6:30 gives hour 195 and minute 180, 12:00 gives 0. For the component, freeze <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date</code> as in the Verified run and read the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transform</code> attributes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the second hand step even in smooth mode on a slow device?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each frame shows the correct angle for its moment, so a device at 20 fps shows 0.3-degree steps instead of 0.1. It is still correct, just less smooth; that is the right failure mode.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Fractional time units** | Hours, minutes and seconds as decimals, so hands move between marks |
| **requestAnimationFrame (rAF)** | Browser callback before each repaint, paused in background tabs |
| **Drift-free animation** | Computing every frame from the clock instead of adding increments |
| **SVG rotate with a pivot** | <code>rotate(angle cx cy)</code>: rotate around a chosen point |

---

**Conclusion:** An analog clock is a pure angle function plus a loop that keeps asking the clock what time it is. Get the fractional units right, rotate around the centre, pick <code>requestAnimationFrame</code> for the sweep and a boundary-aimed timeout for ticks, and cancel whichever loop is running whenever the mode changes. The same "read the time, never accumulate" rule drives the [Stopwatch](/interview-question/build-a-stopwatch) and the [Countdown Timer](/interview-question/build-a-countdown-timer).`,
        files: {
          "/App.js": `import AnalogClock from "./src/AnalogClock";

export default function App() {
  return (
    <main className="page">
      <AnalogClock />
    </main>
  );
}
`,
          "/src/AnalogClock.js": `import { useState } from "react";
import { useClockTime } from "./useClockTime";
import { handAngles, spokenTime, TICKS, NUMBERS } from "./clockMath";

const rotate = (deg) => "rotate(" + deg.toFixed(2) + " 100 100)";

export default function AnalogClock() {
  const [smooth, setSmooth] = useState(true);
  const now = useClockTime(smooth);
  const a = handAngles(now, smooth);
  const label = "Analog clock showing " + spokenTime(now);

  return (
    <section className="card">
      <h1 className="title">Analog Clock</h1>
      <svg
        className="face"
        viewBox="0 0 200 200"
        role="img"
        aria-label={label}
        data-testid="clock"
      >
        <circle cx="100" cy="100" r="96" className="rim" />
        {TICKS.map((t) => (
          <line
            key={t.i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            className={t.major ? "tick major" : "tick"}
          />
        ))}
        {NUMBERS.map((n) => (
          <text
            key={n.n}
            x={n.x}
            y={n.y}
            className="num"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {n.n}
          </text>
        ))}
        <line
          x1="100"
          y1="112"
          x2="100"
          y2="52"
          className="hand hour"
          transform={rotate(a.hour)}
          data-testid="hand-hour"
        />
        <line
          x1="100"
          y1="114"
          x2="100"
          y2="30"
          className="hand minute"
          transform={rotate(a.minute)}
          data-testid="hand-minute"
        />
        <line
          x1="100"
          y1="120"
          x2="100"
          y2="22"
          className="hand second"
          transform={rotate(a.second)}
          data-testid="hand-second"
        />
        <circle cx="100" cy="100" r="4" className="pin" />
      </svg>
      <label className="switch">
        <input
          type="checkbox"
          checked={smooth}
          onChange={(e) => setSmooth(e.target.checked)}
          data-testid="smooth"
        />
        Smooth second hand
      </label>
    </section>
  );
}
`,
          "/src/clockMath.js": `// Degrees per unit: second hand 6 deg/s,
// minute hand 6 deg/min, hour hand 30 deg/h.
// Each hand also moves by the fraction of the smaller unit, so 10:30 puts the
// hour hand halfway between 10 and 11.
export function handAngles(date, smooth) {
  const ms = smooth ? date.getMilliseconds() : 0;
  const s = date.getSeconds() + ms / 1000;
  const m = date.getMinutes() + s / 60;
  const h = (date.getHours() % 12) + m / 60;
  return { hour: h * 30, minute: m * 6, second: s * 6 };
}

export const pad = (n) => String(n).padStart(2, "0");

export function spokenTime(date) {
  return (
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds())
  );
}

// Static face geometry, computed once at module load.
const rad = (deg) => (deg * Math.PI) / 180;
const round = (n) => Math.round(n * 100) / 100;

export const TICKS = Array.from({ length: 60 }, (_, i) => {
  const major = i % 5 === 0;
  const a = rad(i * 6);
  const r1 = major ? 80 : 85;
  return {
    i,
    major,
    x1: round(100 + r1 * Math.sin(a)),
    y1: round(100 - r1 * Math.cos(a)),
    x2: round(100 + 90 * Math.sin(a)),
    y2: round(100 - 90 * Math.cos(a)),
  };
});

export const NUMBERS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  const a = rad(n * 30);
  return {
    n,
    x: round(100 + 68 * Math.sin(a)),
    y: round(100 - 68 * Math.cos(a)),
  };
});
`,
          "/src/useClockTime.js": `import { useEffect, useState } from "react";

// smooth = true : re-read the time on every animation frame (sweeping hand).
// smooth = false: re-read it once per
// second, aimed at the next second boundary.
// Either way the angle comes from the real time, never from a tick counter.
export function useClockTime(smooth) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let frame = 0;
    let timer = 0;
    if (smooth) {
      const loop = () => {
        setNow(new Date());
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    } else {
      const tick = () => {
        const d = new Date();
        setNow(d);
        timer = setTimeout(tick, 1000 - (d.getTime() % 1000));
      };
      tick();
    }
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [smooth]);

  return now;
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0b1120;
  color: #e2e8f0;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.card {
  width: 100%;
  max-width: 360px;
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 20px 16px;
  text-align: center;
  box-sizing: border-box;
}
.title {
  margin: 0 0 12px;
  font-size: 1rem;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.face {
  width: 100%;
  max-width: 300px;
  height: auto;
}
.rim {
  fill: #0f172a;
  stroke: #334155;
  stroke-width: 3;
}
.tick {
  stroke: #475569;
  stroke-width: 1;
}
.tick.major {
  stroke: #cbd5e1;
  stroke-width: 2.5;
}
.num {
  fill: #e2e8f0;
  font-size: 13px;
  font-weight: 600;
}
.hand {
  stroke-linecap: round;
}
.hour {
  stroke: #e2e8f0;
  stroke-width: 6;
}
.minute {
  stroke: #94a3b8;
  stroke-width: 4;
}
.second {
  stroke: #f97316;
  stroke-width: 1.5;
}
.pin {
  fill: #f97316;
}
.switch {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
  cursor: pointer;
}
.switch input {
  width: 18px;
  height: 18px;
  accent-color: #38bdf8;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Developers preparing for a frontend machine coding round in Vue who know refs and components. Angles, SVG transforms and <code>requestAnimationFrame</code> are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The output under "Verified" was printed by running this exact solution on Vue 3.5.44 (compiled with <code>@vue/compiler-sfc</code>, mounted with <code>createApp(App).mount("#app")</code>) in jsdom.

## 1. A Story First

At half past ten a real clock's hour hand is halfway between 10 and 11, not on the 10. Every hand carries a bit of the smaller units with it. On screen you can either *push* hands (add 6 degrees per tick, which drifts and trips at 12 o clock) or *point* them (each frame, read the time and compute the angle). This build points. The [Digital Clock](/interview-question/build-a-digital-clock) covers the same "read the clock, never count" rule in its simplest form.

## 2. Requirements and Plan

A 200 by 200 SVG face with 60 ticks and 12 numbers, three hands at the right angles, a "Smooth second hand" switch (continuous sweep or one step per second), no drift, nothing left running after unmount, and a text equivalent for screen readers.

| Piece | Vue tool | Why |
| :--- | :--- | :--- |
| <code>smooth</code> | <code>ref(true)</code> with <code>v-model</code> on a checkbox | The switch. |
| <code>now</code> | <code>shallowRef(new Date())</code> in <code>useClockTime(smooth)</code> | Replaced every frame or second, never mutated. |
| Angles, label | <code>computed</code> | Pure functions of <code>now</code> and <code>smooth</code>. |
| Ticks, numbers | Module constants in <code>clockMath.js</code> | Never change; computed once. |
| Loop handles | Plain <code>let</code> variables | Never rendered. |

## 3. Build It

### The angle maths

~~~js
// clockMath.js (excerpt)
export function handAngles(date, smooth) {
  const ms = smooth ? date.getMilliseconds() : 0;
  const s = date.getSeconds() + ms / 1000;
  const m = date.getMinutes() + s / 60;
  const h = (date.getHours() % 12) + m / 60;
  return { hour: h * 30, minute: m * 6, second: s * 6 };
}
~~~

360 degrees per turn: the second hand turns in 60 s (6 degrees per second), the minute hand in 60 min (6 per minute), the hour hand in 12 h (30 per hour). Building fractional units first (seconds with milliseconds, minutes with seconds, hours with minutes) makes every hand move continuously.

📌 **Interview term: Fractional time units** — one decimal per hand, such as 10.142 hours at 10:08:30, so the hour hand glides between numbers instead of jumping once an hour.

The face uses <code>x = 100 + r sin a</code>, <code>y = 100 - r cos a</code> (SVG y points down and 0 degrees is 12 o clock), computed once at module load for 60 ticks and 12 numbers.

### The composable: one loop, switchable

~~~js
import { onUnmounted, shallowRef, watch } from "vue";

// smooth = true : re-read the time on
// every animation frame (sweeping hand).
// smooth = false: re-read it once per
// second, aimed at the next second boundary.
// Either way the angle comes from the
// real time, never from a tick counter.
export function useClockTime(smooth) {
  const now = shallowRef(new Date());
  let frame = 0;
  let timer = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
  };

  watch(
    smooth,
    (isSmooth) => {
      stop();
      if (isSmooth) {
        const loop = () => {
          now.value = new Date();
          frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
      } else {
        const tick = () => {
          now.value = new Date();
          timer = setTimeout(tick, 1000 - (now.value.getTime() % 1000));
        };
        tick();
      }
    },
    { immediate: true },
  );

  onUnmounted(stop);
  return now;
}
~~~

📌 **Interview term: requestAnimationFrame (rAF)** — a browser callback before each repaint, about 60 times a second and paused in background tabs. Right for motion, wrong for anything that must keep running hidden.

📌 **Interview term: watch with immediate** — <code>watch(source, cb, { immediate: true })</code> runs the callback once right away and again whenever the source changes. Here the source is the <code>smooth</code> ref passed in, so one function both starts the first loop and switches loops later. Compare with [watch vs watchEffect](/interview-question/what-is-the-difference-between-watch-and-watcheffect).

The callback calls <code>stop()</code> before starting a loop, so a switch never leaves two loops alive, and <code>onUnmounted(stop)</code> handles the end of life. Vue 3.5 also offers <code>onWatcherCleanup()</code> (exported from <code>vue</code>; see the 3.5 typings) for registering cleanup from inside a watcher; the explicit <code>stop()</code> is used here because the same function also serves <code>onUnmounted</code>.

### The template

~~~vue
<!-- AnalogClock.vue (excerpt) -->
<line
  x1="100"
  y1="112"
  x2="100"
  y2="52"
  class="hand hour"
  :transform="rotate(angles.hour)"
  data-testid="hand-hour"
/>
<line
  x1="100"
  y1="114"
  x2="100"
  y2="30"
  class="hand minute"
  :transform="rotate(angles.minute)"
  data-testid="hand-minute"
/>
<line
  x1="100"
  y1="120"
  x2="100"
  y2="22"
  class="hand second"
  :transform="rotate(angles.second)"
  data-testid="hand-second"
/>

<label class="switch">
  <input v-model="smooth" type="checkbox" data-testid="smooth" />
  Smooth second hand
</label>
~~~

with, in the script, <code>const rotate = (deg) =&gt; "rotate(" + deg.toFixed(2) + " 100 100)"</code> and <code>const angles = computed(() =&gt; handAngles(now.value, smooth.value))</code>. The ticks and numbers are <code>v-for</code> loops over the constants, keyed by index.

📌 **Interview term: SVG rotate with a pivot** — <code>rotate(angle cx cy)</code> spins an element around (cx, cy); every hand is drawn pointing up and rotated around the centre (100, 100).

The <code>&lt;svg&gt;</code> has <code>role="img"</code> and <code>:aria-label="label"</code>, a computed like "Analog clock showing 10:08:30".

## 4. Verified

The driver froze <code>Date</code> at 10:08:30.500 UTC to check exact angles, toggled the checkbox, then installed a moving fake clock shifted to 11:59:57 to cross 12 o clock, counting <code>requestAnimationFrame</code> calls through a wrapper on the global. A preloaded wrapper counted the solution's timeouts:

~~~text
RENDERED: Analog Clock123456789101112 Smooth second hand
ticks: 60 | numbers: 1 2 3 4 5 6 7 8 9 10 11 12
frozen at 10:08:30.500, smooth: hour 304.25, minute 51.05, second 183.00 | Analog clock showing 10:08:30
smooth off              : hour 304.25, minute 51.00, second 180.00 | checkbox checked = false
smooth on again         : hour 304.25, minute 51.05, second 183.00
smooth for 1000 ms      : 61 animation frames requested; second hand moved in 61 steps of 0.10 deg on average
12 o clock wrap         : hour hand went from 360.00 to 0.00 | Analog clock showing 12:00:00
smooth off for 1500 ms  : 0 animation frames, second-hand angles seen: 6.00 12.00
timers now: created 4 timeout(s) + 0 interval(s), cleared 1, pending now 1
timers after unmount: 4 timeout(s) + 0 interval(s) created, 2 cleared, 0 still pending
~~~

- 304.25 / 51.05 / 183.00 are exactly the formula's values; tick mode gives 180.00 and 51.00.
- Smooth mode: about 60 frames a second, 0.10 degrees per frame (6 degrees per second over 60 frames). Counts vary by a frame or two per run.
- 359.999 degrees prints as 360.00 (two decimals); the next frame is 0.00, the same position.
- Smooth off: no frames at all, second hand stepping 6.00 to 12.00, so the watcher really stopped the rAF loop.
- 0 timers pending after unmount.

Real paint smoothness is not observable in jsdom.

## 5. Edge Cases and Accessibility

| Case | Behaviour |
| :--- | :--- |
| 12 o clock | Angle wraps 359.99 to 0 with no CSS transition, so no backwards spin |
| Background tab | rAF pauses; the first frame back reads the real time |
| Different refresh rates | More or fewer frames, identical angles |
| Screen readers | <code>role="img"</code> plus a label that changes once a second; no live region |
| Size | One <code>viewBox</code>, CSS width capped at 300 px |

## 6. Common Pitfalls

- **Adding to an angle each frame**: drifts and depends on frame rate.
- **A CSS transition on <code>transform</code>**: at the wrap the hand animates backwards almost a full turn.
- **Starting a new loop on switch without stopping the old one**: two loops, double the work, and one survives unmount.
- **Making the Date a deep <code>ref</code> and mutating it** with <code>setSeconds()</code>: shallow replacement is simpler and clearly reactive.
- **Computing tick coordinates in a <code>computed</code> that depends on <code>now</code>**: recalculated every frame for static shapes.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Maths:</strong> <span style="color:#f0e2c8;">"Six degrees per second and per minute, thirty per hour, each including the fraction of the smaller unit."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Drawing:</strong> <span style="color:#f0e2c8;">"SVG with a 200 by 200 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewBox</code>; hands drawn pointing up, rotated with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rotate(deg 100 100)</code>; ticks and numbers precomputed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Composable:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useClockTime(smooth)</code> keeps a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> Date. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">immediate</code> starts an rAF loop or a boundary timeout, stopping the previous one first."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cleanup:</strong> <span style="color:#f0e2c8;">"The same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stop()</code> runs on every switch and in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUnmounted</code>, so there is always exactly one loop or none."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Template:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> angles bound with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:transform</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> on the checkbox, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=img</code> label with the spoken time."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">60 renders a second: does Vue cope?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For this small SVG, yes, and only the three hand attributes and the label actually patch. For heavier scenes, keep the loop but write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transform</code> straight to template refs (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTemplateRef</code> in 3.5) and update reactive state once a second.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you write it with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watchEffect</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, by reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">smooth.value</code> inside and registering cleanup with the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> argument or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onWatcherCleanup()</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> with an explicit source makes it obvious that only the switch restarts the loop, not every frame.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make the clock reusable with a time-zone prop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Accept <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timeZone</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineProps</code>, compute hours and minutes from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Intl.DateTimeFormat(..., { timeZone }).formatToParts(now)</code>, and keep the loop unchanged.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">handAngles</code> with fixed dates (3:00 is hour 90, 6:30 is hour 195). Mount with Vue Test Utils, freeze <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date</code> or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vi.setSystemTime</code>, and read the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transform</code> attributes.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Fractional time units** | Hours, minutes, seconds as decimals so hands glide |
| **requestAnimationFrame (rAF)** | Per-repaint callback, paused in hidden tabs |
| **watch with immediate** | A watcher that also runs once at setup |
| **SVG rotate with a pivot** | Rotation around a chosen centre point |

---

**Conclusion:** In Vue the analog clock is a pure angle function, a composable whose watcher picks between a per-frame and a per-second loop and always stops the old one, and computed bindings for the hands. The [Stopwatch](/interview-question/build-a-stopwatch) applies the same "compute from the clock" rule to elapsed time.`,
        files: {
          "/src/App.vue": `<script setup>
import AnalogClock from "./components/AnalogClock.vue";
</script>

<template>
  <main class="page">
    <AnalogClock />
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0b1120;
  color: #e2e8f0;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
</style>
`,
          "/src/clockMath.js": `// Degrees per unit: second hand 6 deg/s,
// minute hand 6 deg/min, hour hand 30 deg/h.
// Each hand also moves by the fraction of the smaller unit, so 10:30 puts the
// hour hand halfway between 10 and 11.
export function handAngles(date, smooth) {
  const ms = smooth ? date.getMilliseconds() : 0;
  const s = date.getSeconds() + ms / 1000;
  const m = date.getMinutes() + s / 60;
  const h = (date.getHours() % 12) + m / 60;
  return { hour: h * 30, minute: m * 6, second: s * 6 };
}

export const pad = (n) => String(n).padStart(2, "0");

export function spokenTime(date) {
  return (
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds())
  );
}

// Static face geometry, computed once at module load.
const rad = (deg) => (deg * Math.PI) / 180;
const round = (n) => Math.round(n * 100) / 100;

export const TICKS = Array.from({ length: 60 }, (_, i) => {
  const major = i % 5 === 0;
  const a = rad(i * 6);
  const r1 = major ? 80 : 85;
  return {
    i,
    major,
    x1: round(100 + r1 * Math.sin(a)),
    y1: round(100 - r1 * Math.cos(a)),
    x2: round(100 + 90 * Math.sin(a)),
    y2: round(100 - 90 * Math.cos(a)),
  };
});

export const NUMBERS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  const a = rad(n * 30);
  return {
    n,
    x: round(100 + 68 * Math.sin(a)),
    y: round(100 - 68 * Math.cos(a)),
  };
});
`,
          "/src/components/AnalogClock.vue": `<script setup>
import { computed, ref } from "vue";
import { useClockTime } from "../composables/useClockTime";
import { handAngles, spokenTime, TICKS, NUMBERS } from "../clockMath";

const smooth = ref(true);
const now = useClockTime(smooth);
const angles = computed(() => handAngles(now.value, smooth.value));
const label = computed(() => "Analog clock showing " + spokenTime(now.value));
const rotate = (deg) => "rotate(" + deg.toFixed(2) + " 100 100)";
</script>

<template>
  <section class="card">
    <h1 class="title">Analog Clock</h1>
    <svg
      class="face"
      viewBox="0 0 200 200"
      role="img"
      :aria-label="label"
      data-testid="clock"
    >
      <circle cx="100" cy="100" r="96" class="rim" />
      <line
        v-for="t in TICKS"
        :key="t.i"
        :x1="t.x1"
        :y1="t.y1"
        :x2="t.x2"
        :y2="t.y2"
        class="tick"
        :class="{ major: t.major }"
      />
      <text
        v-for="n in NUMBERS"
        :key="n.n"
        :x="n.x"
        :y="n.y"
        class="num"
        text-anchor="middle"
        dominant-baseline="central"
      >
        {{ n.n }}
      </text>
      <line
        x1="100"
        y1="112"
        x2="100"
        y2="52"
        class="hand hour"
        :transform="rotate(angles.hour)"
        data-testid="hand-hour"
      />
      <line
        x1="100"
        y1="114"
        x2="100"
        y2="30"
        class="hand minute"
        :transform="rotate(angles.minute)"
        data-testid="hand-minute"
      />
      <line
        x1="100"
        y1="120"
        x2="100"
        y2="22"
        class="hand second"
        :transform="rotate(angles.second)"
        data-testid="hand-second"
      />
      <circle cx="100" cy="100" r="4" class="pin" />
    </svg>
    <label class="switch">
      <input v-model="smooth" type="checkbox" data-testid="smooth" />
      Smooth second hand
    </label>
  </section>
</template>

<style scoped>
.card {
  width: 100%;
  max-width: 360px;
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 20px 16px;
  text-align: center;
  box-sizing: border-box;
}
.title {
  margin: 0 0 12px;
  font-size: 1rem;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.face {
  width: 100%;
  max-width: 300px;
  height: auto;
}
.rim {
  fill: #0f172a;
  stroke: #334155;
  stroke-width: 3;
}
.tick {
  stroke: #475569;
  stroke-width: 1;
}
.tick.major {
  stroke: #cbd5e1;
  stroke-width: 2.5;
}
.num {
  fill: #e2e8f0;
  font-size: 13px;
  font-weight: 600;
}
.hand {
  stroke-linecap: round;
}
.hour {
  stroke: #e2e8f0;
  stroke-width: 6;
}
.minute {
  stroke: #94a3b8;
  stroke-width: 4;
}
.second {
  stroke: #f97316;
  stroke-width: 1.5;
}
.pin {
  fill: #f97316;
}
.switch {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
  cursor: pointer;
}
.switch input {
  width: 18px;
  height: 18px;
  accent-color: #38bdf8;
}
</style>
`,
          "/src/composables/useClockTime.js": `import { onUnmounted, shallowRef, watch } from "vue";

// smooth = true : re-read the time on every animation frame (sweeping hand).
// smooth = false: re-read it once per
// second, aimed at the next second boundary.
// Either way the angle comes from the real time, never from a tick counter.
export function useClockTime(smooth) {
  const now = shallowRef(new Date());
  let frame = 0;
  let timer = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
  };

  watch(
    smooth,
    (isSmooth) => {
      stop();
      if (isSmooth) {
        const loop = () => {
          now.value = new Date();
          frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
      } else {
        const tick = () => {
          now.value = new Date();
          timer = setTimeout(tick, 1000 - (now.value.getTime() % 1000));
        };
        tick();
      }
    },
    { immediate: true },
  );

  onUnmounted(stop);
  return now;
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Developers preparing for a frontend machine coding round in Angular who know components and signals at a basic level. Angles, SVG transforms and <code>requestAnimationFrame</code> are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The output under "Verified" was printed by booting this exact solution on Angular 22.2.3 in jsdom, both AOT-compiled with strict templates and JIT-compiled as in the playground.

## 1. A Story First

At half past ten the hour hand of a real clock sits halfway between 10 and 11. Each hand carries a fraction of the smaller units. On screen you can *push* hands (add 6 degrees per tick, which drifts) or *point* them (read the time every frame and compute the angle). Pointing is always right. If you have not yet built the [Digital Clock](/interview-question/build-a-digital-clock), it shows the same rule with plain text.

## 2. Requirements and Plan

An SVG face (60 ticks, 12 numbers), three hands at the correct angles, a "Smooth second hand" switch, no drift, nothing running after destroy, and a text equivalent of the time.

| Piece | Angular tool | Why |
| :--- | :--- | :--- |
| <code>smooth</code>, <code>now</code> | <code>signal</code> | The template and computeds re-render on change, which a zoneless app requires. |
| Angles, label | <code>computed</code> | Pure functions of the two signals. |
| The loop | <code>effect((onCleanup) =&gt; ...)</code> | Re-runs when <code>smooth()</code> changes and cleans up before re-running and on destroy. |
| Ticks, numbers | Constants exposed as fields | Computed once at module load. |

📌 **Interview term: effect with onCleanup** — <code>effect()</code> runs a function now and again whenever a signal it read changes. The <code>onCleanup</code> callback it receives registers teardown that Angular runs before the next run and when the owning component is destroyed. Starting and stopping a timer that depends on a signal is one of the legitimate uses; see [when not to use effect](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it).

## 3. Build It

### The angle maths

~~~ts
// clock-math.ts (excerpt)
export function handAngles(date: Date, smooth: boolean): Angles {
  const ms = smooth ? date.getMilliseconds() : 0;
  const s = date.getSeconds() + ms / 1000;
  const m = date.getMinutes() + s / 60;
  const h = (date.getHours() % 12) + m / 60;
  return { hour: h * 30, minute: m * 6, second: s * 6 };
}
~~~

A full turn is 360 degrees: 6 per second for the second hand, 6 per minute for the minute hand, 30 per hour for the hour hand. Fractional units (minutes including seconds, hours including minutes) make each hand glide.

📌 **Interview term: Fractional time units** — one decimal per hand (10.142 hours at 10:08:30) so the hour hand moves between numbers instead of jumping once an hour.

Tick and number positions use <code>x = 100 + r sin a</code>, <code>y = 100 - r cos a</code> once at load time.

### The component's loop

~~~ts
// analog-clock.component.ts (excerpt)
readonly smooth = signal(true);
readonly now = signal(new Date());
readonly angles = computed(() => handAngles(this.now(), this.smooth()));
readonly label = computed(
  () => "Analog clock showing " + spokenTime(this.now()),
);

constructor() {
  effect((onCleanup) => {
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (this.smooth()) {
      const loop = () => {
        this.now.set(new Date());
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    } else {
      const tick = () => {
        const d = new Date();
        this.now.set(d);
        timer = setTimeout(tick, 1000 - (d.getTime() % 1000));
      };
      tick();
    }
    onCleanup(() => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    });
  });
}
~~~

📌 **Interview term: requestAnimationFrame (rAF)** — a browser callback just before each repaint, about 60 times a second, paused in background tabs: ideal for a sweeping hand.

The effect reads only <code>smooth()</code> synchronously. <code>now</code> is written inside the callbacks, which run later, outside the effect's tracking, so writing it does not make the effect re-run itself. In tick mode the first <code>tick()</code> call does run inside the effect and writes <code>now</code>; Angular 22 allows signal writes in effects, and it did not loop because the effect never reads <code>now</code>.

### The template

~~~html
<!-- analog-clock.component.ts template (excerpt) -->
@for (t of ticks; track t.i) {
  <line
    [attr.x1]="t.x1"
    [attr.y1]="t.y1"
    [attr.x2]="t.x2"
    [attr.y2]="t.y2"
    class="tick"
    [class.major]="t.major"
  />
}
<line
  x1="100"
  y1="120"
  x2="100"
  y2="22"
  class="hand second"
  [attr.transform]="rotate(angles().second)"
  data-testid="hand-second"
/>
<input
  type="checkbox"
  [checked]="smooth()"
  (change)="onToggle($event)"
  data-testid="smooth"
/>
~~~

📌 **Interview term: Attribute binding** — <code>[attr.name]</code> sets an HTML or SVG attribute rather than a DOM property. SVG geometry such as <code>x1</code> and <code>transform</code> must be bound this way; <code>[x1]</code> fails the AOT build here with NG8002, "Can't bind to 'x1' since it isn't a known property of ':svg:line'".

📌 **Interview term: SVG rotate with a pivot** — <code>rotate(angle 100 100)</code> spins each hand around the centre.

The <code>&lt;svg&gt;</code> carries <code>role="img"</code> and <code>[attr.aria-label]="label()"</code>. The checkbox uses a plain <code>(change)</code> handler that sets the signal, so no <code>FormsModule</code> is needed.

## 4. Verified

The driver froze <code>Date</code> at 10:08:30.500 UTC, toggled the switch, then used a moving fake clock shifted to 11:59:57 to cross 12 o clock. It counted the component's <code>requestAnimationFrame</code> calls through a wrapper on the global (skipping the calls Angular's own zoneless scheduler makes) and a preloaded wrapper counted the component's timeouts.

AOT with strict templates:

~~~text
RENDERED: Analog Clock123456789101112 Smooth second hand
ticks: 60 | numbers: 1 2 3 4 5 6 7 8 9 10 11 12
frozen at 10:08:30.500, smooth: hour 304.25, minute 51.05, second 183.00 | Analog clock showing 10:08:30
smooth off              : hour 304.25, minute 51.00, second 180.00 | checkbox checked = false
smooth on again         : hour 304.25, minute 51.05, second 183.00
smooth for 1000 ms      : 61 animation frames requested; second hand moved in 60 steps of 0.10 deg on average
12 o clock wrap         : hour hand went from 360.00 to 0.00 | Analog clock showing 12:00:00
smooth off for 1500 ms  : 0 animation frames, second-hand angles seen: 6.00 12.00
timers now: created 4 timeout(s) + 0 interval(s), cleared 1, pending now 1
timers after unmount: 4 timeout(s) + 0 interval(s) created, 2 cleared, 0 still pending
~~~

JIT, as in the playground:

~~~text
RENDERED: Analog Clock123456789101112 Smooth second hand
ticks: 60 | numbers: 1 2 3 4 5 6 7 8 9 10 11 12
frozen at 10:08:30.500, smooth: hour 304.25, minute 51.05, second 183.00 | Analog clock showing 10:08:30
smooth off              : hour 304.25, minute 51.00, second 180.00 | checkbox checked = false
smooth on again         : hour 304.25, minute 51.05, second 183.00
smooth for 1000 ms      : 61 animation frames requested; second hand moved in 60 steps of 0.10 deg on average
12 o clock wrap         : hour hand went from 360.00 to 0.00 | Analog clock showing 12:00:00
smooth off for 1500 ms  : 0 animation frames, second-hand angles seen: 6.00 12.00
timers now: created 4 timeout(s) + 0 interval(s), cleared 1, pending now 1
timers after unmount: 4 timeout(s) + 0 interval(s) created, 2 cleared, 0 still pending
~~~

- Angles 304.25 / 51.05 / 183.00 match the formulas; tick mode 180.00 / 51.00.
- Smooth mode requested roughly one frame per 16.7 ms and moved the second hand about 0.1 degrees per frame. The JIT run is a little slower in jsdom; frame counts vary per run.
- The 12 o clock wrap printed 360.00 (that is 359.999 rounded) and then 0.00.
- Smooth off: zero animation frames from the component and a 6-degree step per second.
- 0 timers pending after the app was destroyed: <code>onCleanup</code> ran.

jsdom cannot show visual smoothness or paint timing.

## 5. Edge Cases and Accessibility

| Case | Behaviour |
| :--- | :--- |
| 12 o clock | Wrap from 359.99 to 0; no CSS transition, so no reverse spin |
| Background tab | rAF pauses; the next frame reads the real time |
| Zoneless rendering | Signals drive every update; no zone.js needed |
| Screen readers | <code>role="img"</code> label with the time; no live region |
| Size | <code>viewBox</code> scaling, width capped by CSS |

## 6. Common Pitfalls

- **Incrementing an angle signal per frame** instead of computing from the time: drifts with frame rate.
- **Property binding on SVG**: <code>[x1]</code> or <code>[transform]</code> instead of <code>[attr.x1]</code> / <code>[attr.transform]</code>.
- **Cleaning up in <code>ngOnDestroy</code> only**: a mode switch would then leave the old loop running. <code>onCleanup</code> covers both.
- **Reading <code>now()</code> inside the effect**: it would re-run the effect on every frame and restart the loop each time.
- **A CSS transition on the hand**: spins backwards at the wrap.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Maths:</strong> <span style="color:#f0e2c8;">"Six degrees per second and per minute, thirty per hour, each with the fraction of the smaller unit."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Drawing:</strong> <span style="color:#f0e2c8;">"SVG <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewBox</code> 200 by 200; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> over precomputed ticks; hands rotated with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[attr.transform]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rotate(deg 100 100)</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">smooth</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">now</code> are signals; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">angles</code> and the aria label are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Loop:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">smooth()</code> and starts either an rAF loop or a boundary timeout; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> cancels it on switch and on destroy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Edges:</strong> <span style="color:#f0e2c8;">"No transitions because of the wrap, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=img</code> label, and nothing but signals because the app is zoneless."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">effect</code> here when the docs warn against it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The warning is about using effects to copy one signal into another, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> does better. Starting and stopping an external resource (a timer, an rAF loop) in response to a signal is exactly what an effect with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> is for.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">60 change detections a second: acceptable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For three bound attributes, yes. For heavy views, run the loop with direct <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Renderer2.setAttribute</code> or element writes through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChild</code> refs, and only set a signal once a second for the label.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could RxJS do this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">animationFrames()</code> from RxJS emits on each frame, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">interval</code> can drive ticks; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal</code> would bridge either into the template. It works, but the effect version needs no extra concepts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the angle maths?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a pure function, so test it directly with fixed dates; for the component, freeze <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date</code> as in the Verified run, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code> and read the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transform</code> attributes.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **effect with onCleanup** | A signal-driven side effect with teardown before re-runs and on destroy |
| **Fractional time units** | Hours, minutes, seconds as decimals so hands glide |
| **requestAnimationFrame (rAF)** | Per-repaint browser callback, paused in hidden tabs |
| **Attribute binding** | <code>[attr.x]</code>: sets an attribute, required for SVG geometry |
| **SVG rotate with a pivot** | Rotation around a chosen centre point |

---

**Conclusion:** In Angular the analog clock is a pure angle function, two signals, two computeds and one effect whose <code>onCleanup</code> switches cleanly between a per-frame and a per-second loop. The [Stopwatch](/interview-question/build-a-stopwatch) uses the same "compute from the clock" idea for elapsed time.`,
        files: {
          "/src/app/analog-clock.component.ts": `import { Component, computed, effect, signal } from "@angular/core";
import { handAngles, spokenTime, TICKS, NUMBERS } from "./clock-math";

@Component({
  selector: "app-analog-clock",
  standalone: true,
  template: \`
    <section class="card">
      <h1 class="title">Analog Clock</h1>
      <svg
        class="face"
        viewBox="0 0 200 200"
        role="img"
        [attr.aria-label]="label()"
        data-testid="clock"
      >
        <circle cx="100" cy="100" r="96" class="rim" />
        @for (t of ticks; track t.i) {
          <line
            [attr.x1]="t.x1"
            [attr.y1]="t.y1"
            [attr.x2]="t.x2"
            [attr.y2]="t.y2"
            class="tick"
            [class.major]="t.major"
          />
        }
        @for (n of numbers; track n.n) {
          <text
            [attr.x]="n.x"
            [attr.y]="n.y"
            class="num"
            text-anchor="middle"
            dominant-baseline="central"
          >{{ n.n }}</text>
        }
        <line
          x1="100"
          y1="112"
          x2="100"
          y2="52"
          class="hand hour"
          [attr.transform]="rotate(angles().hour)"
          data-testid="hand-hour"
        />
        <line
          x1="100"
          y1="114"
          x2="100"
          y2="30"
          class="hand minute"
          [attr.transform]="rotate(angles().minute)"
          data-testid="hand-minute"
        />
        <line
          x1="100"
          y1="120"
          x2="100"
          y2="22"
          class="hand second"
          [attr.transform]="rotate(angles().second)"
          data-testid="hand-second"
        />
        <circle cx="100" cy="100" r="4" class="pin" />
      </svg>
      <label class="switch">
        <input
          type="checkbox"
          [checked]="smooth()"
          (change)="onToggle($event)"
          data-testid="smooth"
        />
        Smooth second hand
      </label>
    </section>
  \`,
  styles: [
    \`
    .card { width: 100%; max-width: 360px; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 20px 16px; text-align: center; box-sizing: border-box; }
    .title { margin: 0 0 12px; font-size: 1rem; font-weight: 600; color: #94a3b8; letter-spacing: 0.08em; text-transform: uppercase; }
    .face { width: 100%; max-width: 300px; height: auto; }
    .rim { fill: #0f172a; stroke: #334155; stroke-width: 3; }
    .tick { stroke: #475569; stroke-width: 1; }
    .tick.major { stroke: #cbd5e1; stroke-width: 2.5; }
    .num { fill: #e2e8f0; font-size: 13px; font-weight: 600; }
    .hand { stroke-linecap: round; }
    .hour { stroke: #e2e8f0; stroke-width: 6; }
    .minute { stroke: #94a3b8; stroke-width: 4; }
    .second { stroke: #f97316; stroke-width: 1.5; }
    .pin { fill: #f97316; }
    .switch { display: inline-flex; gap: 8px; align-items: center; margin-top: 12px; cursor: pointer; }
    .switch input { width: 18px; height: 18px; accent-color: #38bdf8; }
  \`,
  ],
})
export class AnalogClockComponent {
  readonly ticks = TICKS;
  readonly numbers = NUMBERS;
  readonly smooth = signal(true);
  readonly now = signal(new Date());
  readonly angles = computed(() => handAngles(this.now(), this.smooth()));
  readonly label = computed(
    () => "Analog clock showing " + spokenTime(this.now()),
  );

  constructor() {
    // Re-runs whenever smooth() changes;
    // onCleanup stops the previous loop first
    // and also runs when the component is destroyed.
    effect((onCleanup) => {
      let frame = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      if (this.smooth()) {
        const loop = () => {
          this.now.set(new Date());
          frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
      } else {
        const tick = () => {
          const d = new Date();
          this.now.set(d);
          timer = setTimeout(tick, 1000 - (d.getTime() % 1000));
        };
        tick();
      }
      onCleanup(() => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      });
    });
  }

  rotate(deg: number): string {
    return "rotate(" + deg.toFixed(2) + " 100 100)";
  }

  onToggle(event: Event): void {
    this.smooth.set((event.target as HTMLInputElement).checked);
  }
}
`,
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation } from "@angular/core";
import { AnalogClockComponent } from "./analog-clock.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [AnalogClockComponent],
  template: \`<main class="page"><app-analog-clock /></main>\`,
  // these two rules are global on purpose
  encapsulation: ViewEncapsulation.None,
  styles: [
    \`
      body {
        margin: 0;
        background: #0b1120;
        color: #e2e8f0;
        font-family: system-ui, sans-serif;
      }
      .page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 16px;
        box-sizing: border-box;
      }
    \`,
  ],
})
export class AppComponent {}
`,
          "/src/app/clock-math.ts": `// Degrees per unit: second hand 6 deg/s,
// minute hand 6 deg/min, hour hand 30 deg/h.
// Each hand also moves by the fraction of the smaller unit, so 10:30 puts the
// hour hand halfway between 10 and 11.
export interface Angles {
  hour: number;
  minute: number;
  second: number;
}

export function handAngles(date: Date, smooth: boolean): Angles {
  const ms = smooth ? date.getMilliseconds() : 0;
  const s = date.getSeconds() + ms / 1000;
  const m = date.getMinutes() + s / 60;
  const h = (date.getHours() % 12) + m / 60;
  return { hour: h * 30, minute: m * 6, second: s * 6 };
}

export const pad = (n: number) => String(n).padStart(2, "0");

export function spokenTime(date: Date): string {
  return (
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds())
  );
}

// Static face geometry, computed once at module load.
const rad = (deg: number) => (deg * Math.PI) / 180;
const round = (n: number) => Math.round(n * 100) / 100;

export const TICKS = Array.from({ length: 60 }, (_, i) => {
  const major = i % 5 === 0;
  const a = rad(i * 6);
  const r1 = major ? 80 : 85;
  return {
    i,
    major,
    x1: round(100 + r1 * Math.sin(a)),
    y1: round(100 - r1 * Math.cos(a)),
    x2: round(100 + 90 * Math.sin(a)),
    y2: round(100 - 90 * Math.cos(a)),
  };
});

export const NUMBERS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  const a = rad(n * 30);
  return {
    n,
    x: round(100 + 68 * Math.sin(a)),
    y: round(100 - 68 * Math.cos(a)),
  };
});
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Stopwatch",
    seoDescription:
      "Build a stopwatch in React, Vue and Angular: Start, Pause, Resume, Lap and Reset with timestamp maths that stays accurate across pauses and long tasks.",
    description: `**Question presented to candidate:**
"Build a stopwatch. It shows minutes, seconds and hundredths, has Start, Pause, Resume and Reset, and a Lap button that records split times in a list. It has to stay accurate: if I run it for ten minutes and pause and resume a few times, it should match a real stopwatch."

**Requirements:**
- Display \`mm:ss.cc\` (minutes, seconds, centiseconds).
- One primary button that reads Start, then Pause while running, then Resume while paused.
- Lap (only while running) adds a row with the lap number, the split for that lap and the running total.
- Reset (when there is anything to reset) clears the time and the laps.
- Accurate across pauses and when the page is busy; no timers left running.

**What a strong answer should cover:**
- Accuracy from **timestamps**, not tick counts: \`elapsed = banked + (now - startedAt)\`, where \`banked\` holds time from earlier runs.
- \`performance.now()\` (monotonic) rather than \`Date.now()\` for measuring durations.
- The redraw timer only triggers re-renders; its interval (here 25 ms) has nothing to do with accuracy.
- Pausing banks the current run; resuming only sets a new \`startedAt\`.
- Laps stored as cumulative totals, with splits derived as differences.
- Interval cleanup, and avoiding **stale closures** in the tick callback.
- Accessibility: \`role="timer"\` (not announced every 25 ms), real buttons with disabled states, a polite live region for laps.

**Clarifying questions expected:**
- "What precision do you want displayed: tenths, hundredths or milliseconds?"
- "Should laps highlight the fastest and slowest?"
- "Does it need to survive a page reload?"

**Code / implementation expected:** Yes. A working stopwatch with the timestamp model, pause/resume, laps, reset and cleanup.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Beginners preparing for a frontend machine coding round. You know a little JavaScript and React; timestamps, intervals and effect cleanup are explained from zero.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary interviewers expect. Every output under "Verified" was printed by running this exact solution on React 19.3.1 inside <code>&lt;StrictMode&gt;</code> in jsdom.

## 1. Why This Even Matters — A Story First

Imagine timing a friend's run with a paper notebook. You could make a pencil mark every second and count the marks at the end. If you sneeze and miss three marks, your friend just got three seconds faster. Or you could write down the time on the big station clock when they start, and again when they finish, and subtract. Sneezing changes nothing.

A browser timer is the sneezy pencil. <code>setInterval(fn, 10)</code> promises "no sooner than 10 ms", not "exactly 10 ms", and a busy page or a background tab makes it late or skips it. A stopwatch that adds 10 ms per tick runs slow, and the Verified section below measures by how much.

So the stopwatch writes down *when it started* and subtracts. The interval is only there to repaint the digits. Pause and resume add one twist: you have to remember the time from earlier runs. This question is a sibling of the [Countdown Timer](/interview-question/build-a-countdown-timer), which flips the same idea around a deadline; the [Digital Clock](/interview-question/build-a-digital-clock) is the simplest version of "read the clock, never count".

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What precision on screen: tenths, hundredths, milliseconds? | Sets the format and how often it is worth repainting. We show hundredths and repaint every 25 ms. |
| Separate Pause and Resume buttons, or one toggle? | Changes the button logic; one toggle labelled Start / Pause / Resume is the common phone layout. |
| Should Lap work while paused? | It is usually disabled, because a lap of zero length is meaningless. |
| Highlight fastest and slowest laps? | Needs a min/max pass over splits; easy to add once splits are derived. |
| Must it survive a reload or keep running in the background? | Reload needs the start timestamp in <code>localStorage</code>, with <code>Date.now()</code> instead of <code>performance.now()</code>. |
| Hours? | Format changes past 59:59.99; we let minutes grow. |

## 3. Requirements and Plan

**Component tree.** <code>App</code> renders <code>Stopwatch</code>. A pure <code>formatElapsed(ms)</code> lives in its own file.

**State model.** The trick is to store *facts about time*, not the number on screen:

| Piece | Kind | Meaning |
| :--- | :--- | :--- |
| <code>bankedMs</code> | State | Time from earlier runs, saved at each pause. |
| <code>startedAt</code> | State | <code>performance.now()</code> when the current run began, or <code>null</code> when stopped. |
| <code>now</code> | State | The last redraw time; only changes so React re-renders. |
| <code>laps</code> | State | Total elapsed at each Lap press. |
| <code>running</code>, <code>elapsed</code>, label, splits | Derived | Computed in render from the above. |

<svg class="iq-diagram" width="100%" viewBox="0 0 680 250" role="img" aria-label="Stopwatch states: idle, running and paused, with start, pause, resume and reset transitions">
  <defs>
    <marker id="sw-r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="90" width="160" height="70" rx="10"/>
  <text class="d-text" x="100" y="118" text-anchor="middle">Idle</text>
  <text class="d-sub" x="100" y="140" text-anchor="middle">banked 0, no laps</text>
  <rect class="d-box-accent" x="260" y="90" width="160" height="70" rx="10"/>
  <text class="d-text d-accent" x="340" y="118" text-anchor="middle">Running</text>
  <text class="d-sub" x="340" y="140" text-anchor="middle">startedAt set</text>
  <rect class="d-box" x="500" y="90" width="160" height="70" rx="10"/>
  <text class="d-text" x="580" y="118" text-anchor="middle">Paused</text>
  <text class="d-sub" x="580" y="140" text-anchor="middle">time banked</text>
  <path class="d-edge" d="M 180 112 L 254 112" marker-end="url(#sw-r-arrow)"/>
  <text class="d-sub" x="217" y="98" text-anchor="middle">Start</text>
  <path class="d-edge" d="M 420 112 L 494 112" marker-end="url(#sw-r-arrow)"/>
  <text class="d-sub" x="457" y="98" text-anchor="middle">Pause</text>
  <path class="d-edge" d="M 500 140 L 426 140" marker-end="url(#sw-r-arrow)"/>
  <text class="d-sub" x="463" y="178" text-anchor="middle">Resume</text>
  <path class="d-edge-dashed" d="M 580 160 L 580 220 L 100 220 L 100 166" marker-end="url(#sw-r-arrow)"/>
  <text class="d-sub" x="340" y="240" text-anchor="middle">Reset</text>
</svg>

In every state the number on screen is <code>bankedMs + (startedAt === null ? 0 : now - startedAt)</code>. Reset from Running also returns to Idle.

## 4. Build It Step by Step

### Step 1: format milliseconds

~~~js
const pad = (n) => String(n).padStart(2, "0");

// 83456 ms -> "01:23.45" (minutes : seconds . centiseconds)
export function formatElapsed(ms) {
  const cs = Math.floor(ms / 10);
  return (
    pad(Math.floor(cs / 6000)) +
    ":" +
    pad(Math.floor(cs / 100) % 60) +
    "." +
    pad(cs % 100)
  );
}
~~~

Work in whole centiseconds first (<code>Math.floor(ms / 10)</code>), then split into minutes, seconds and hundredths. Flooring matters: a stopwatch should never show 1.00 before a full second has passed.

### Step 2: state and the derived number

~~~jsx
// Stopwatch.js (excerpt)
const [bankedMs, setBankedMs] = useState(0);
const [startedAt, setStartedAt] = useState(null);
const [now, setNow] = useState(0);
const [laps, setLaps] = useState([]);

const running = startedAt !== null;
const elapsed = bankedMs + (running ? Math.max(0, now - startedAt) : 0);
~~~

📌 **Interview term: Timestamp-based timing** — measure a duration as "now minus when it started" from a real clock, instead of adding a fixed amount on every timer tick. Late or skipped ticks then only delay a repaint; they never change the number.

📌 **Interview term: performance.now()** — milliseconds since the page started, from a **monotonic** clock: it only moves forward and is not affected if the user or NTP changes the system time. That makes it the right clock for durations, while <code>Date.now()</code> is for wall-clock times. See [performance.now() vs Date.now()](/interview-question/why-would-you-use-performance-now-instead-of-date-now-to-measure-how-long-a-func).

<code>Math.max(0, ...)</code> guards the first render after Start, before the first tick, in case <code>now</code> is a hair behind <code>startedAt</code>.

### Step 3: the redraw interval

~~~jsx
// Stopwatch.js (excerpt)
const TICK_MS = 25; // how often we REDRAW; accuracy never depends on it

useEffect(() => {
  if (!running) return;
  const id = setInterval(() => setNow(performance.now()), TICK_MS);
  return () => clearInterval(id);
}, [running]);
~~~

The effect is keyed on <code>running</code>. Start flips it to true and an interval begins; Pause flips it to false and React runs the cleanup, which clears the interval. Unmount runs the same cleanup. See [the cleanup function in useEffect](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect).

📌 **Interview term: Stale closure** — a callback that captured old values of state or props from the render where it was created. The classic stopwatch bug is <code>setInterval(() =&gt; setElapsed(elapsed + 10), 10)</code> created once: it captured <code>elapsed = 0</code> forever, so the display sticks at 0.01. This tick avoids the problem completely: it reads nothing from React state, only <code>performance.now()</code>. More in [stale closures in React hooks](/interview-question/what-causes-stale-closures-in-react-hooks-and-how-do-you-fix-them-correctly).

Why 25 ms? Hundredths change every 10 ms, but repainting 100 times a second is wasted work; 40 repaints a second looks continuous. A <code>requestAnimationFrame</code> loop would also be fine. The interval value does not affect accuracy at all.

### Step 4: the actions

~~~jsx
// Stopwatch.js (excerpt)
const start = () => {
  const t = performance.now();
  setStartedAt(t);
  setNow(t);
};
const pause = () => {
  setBankedMs(bankedMs + performance.now() - startedAt);
  setStartedAt(null);
};
const lap = () =>
  setLaps([...laps, bankedMs + performance.now() - startedAt]);
const reset = () => {
  setBankedMs(0);
  setStartedAt(null);
  setLaps([]);
};
~~~

📌 **Interview term: Banking elapsed time** — on pause, add the current run to a running total and forget the start time. On resume, set a fresh <code>startedAt</code>. The paused interval never enters the maths, so pausing for an hour adds nothing.

These handlers read <code>bankedMs</code>, <code>startedAt</code> and <code>laps</code> from the current render. That is safe because React creates new handlers on every render, so a click always sees fresh values.

Pause and Lap read <code>performance.now()</code> at the moment of the click, not the last tick's <code>now</code>, so a lap pressed between two repaints is still exact.

📌 **Interview term: Cumulative laps** — store the total at each lap and derive each split as <code>total - previousTotal</code>. Splits then always add up to the total, and you never store two numbers that can disagree.

### Step 5: render

~~~jsx
// Stopwatch.js (excerpt)
<div
  className="display"
  role="timer"
  aria-label="Elapsed time"
  data-testid="display"
>
  {formatElapsed(elapsed)}
</div>
<div className="controls">
  <button type="button" className="primary" onClick={running ? pause : start} data-testid="toggle">
    {label}
  </button>
  <button type="button" onClick={lap} disabled={!running} data-testid="lap">
    Lap
  </button>
  <button type="button" onClick={reset} disabled={elapsed === 0 && laps.length === 0} data-testid="reset">
    Reset
  </button>
</div>
{laps.length > 0 && (
  <ol className="laps" aria-label="Laps" aria-live="polite" data-testid="laps">
    {laps.map((total, i) => (
      <li key={i}>
        <span>Lap {i + 1}</span>
        <span>{formatElapsed(total - (i > 0 ? laps[i - 1] : 0))}</span>
        <span className="muted">{formatElapsed(total)}</span>
      </li>
    ))}
  </ol>
)}
~~~

<code>label</code> is <code>running ? "Pause" : elapsed &gt; 0 ? "Resume" : "Start"</code>. Using the index as <code>key</code> is fine here because laps are only appended, never reordered or removed one by one.

📌 **Interview term: role="timer"** — an ARIA role for a counter of elapsed or remaining time. Its implicit <code>aria-live</code> is <code>off</code>, so screen readers do not read every change (40 a second would be unusable), but users can still read it on demand.

## 5. Verified

Run with <code>scripts/verify-mc-solution.mjs</code> as <code>&lt;StrictMode&gt;&lt;App /&gt;&lt;/StrictMode&gt;</code> in jsdom, with real time passing. A preloaded wrapper counted the intervals the solution created. The driver started, paused after about 1 s, waited, resumed, pressed Lap twice, then resumed again and blocked the main thread with a 700 ms busy loop while a naive stopwatch (+25 ms per <code>setInterval</code> tick) ran alongside:

~~~text
RENDERED: Stopwatch00:00.00StartLapReset
initial : 00:00.00 | button Start, lap disabled, reset disabled | created 0 timeout(s) + 0 interval(s), cleared 0, pending now 0
started : button Pause, lap enabled, reset enabled | created 0 timeout(s) + 1 interval(s), cleared 0, pending now 1
paused after about 1 s of wall time: shows 1.0 s | error vs wall clock under 40 ms: true | button Resume, lap disabled, reset enabled
0.5 s later, still paused, display unchanged: true
lap rows: Lap 1 00:01.57 00:01.57 | Lap 2 00:00.34 00:01.91
laps    : 2 rows; lap 1 split 1.6 s (1.0 + 0.5 s + click settling), lap 2 split 0.3 s | displayed lap 2 total minus (lap 1 + lap 2 split), in ms: within 10: true
long task: wall time 1.3 s | app added 1.3 s | app error under 40 ms: true | tick counter added 0.7 s and lost over 0.5 s: true
reset   : 00:00.00 | lap rows: 0 | button Start, lap disabled, reset disabled
timers  : created 0 timeout(s) + 3 interval(s), cleared 3, pending now 0
timers after unmount: 0 timeout(s) + 3 interval(s) created, 3 cleared, 0 still pending
~~~

- **Accuracy**: every comparison against the wall clock was within 40 ms (each click in the driver also waits about 30 ms to settle, which is why lap 1 is 1.6 s, not 1.5 s). The raw hundredths differ slightly from run to run.
- **Pause**: the display did not move for 0.5 s while paused.
- **Long task**: the app added the full 1.3 s; the tick counter lost more than half a second, because ticks that could not run during the busy loop were simply never delivered.
- **Rounding**: each displayed value is floored separately, so a displayed split plus the previous total can differ from the displayed total by 0.01 s. Splits are derived from exact totals, so the underlying numbers always agree.
- **Cleanup**: 3 runs created 3 intervals and all 3 were cleared. StrictMode did not double this effect at mount because it does nothing until <code>running</code> is true.

## 6. Edge Cases and Accessibility

| Case | What the solution does |
| :--- | :--- |
| Busy main thread | Next repaint reads <code>performance.now()</code>; the time is right, as measured above. |
| Background tab | The interval is throttled, but the elapsed time stays correct on return. Not observable in jsdom. |
| System clock change | <code>performance.now()</code> is monotonic, so the stopwatch is unaffected. |
| Pausing for a long time | The pause gap is never added. |
| Lap between repaints | Lap reads the clock directly, so it is exact. |
| Screen readers | <code>role="timer"</code> stays silent; new laps are announced through <code>aria-live="polite"</code>; buttons are real <code>&lt;button&gt;</code>s with disabled states. |
| Keyboard | Tab to each button; Enter and Space work natively. |

## 7. Common Pitfalls

- **Adding a fixed amount per tick.** The Verified run shows a tick counter losing over 0.5 s to one long task.
- **A stale closure in <code>setInterval</code>.** <code>setElapsed(elapsed + 10)</code> inside an interval created once never sees the new value. Use timestamps, or at least the updater form.
- **Forgetting to bank on pause.** Resetting <code>startedAt</code> on resume without banking loses everything before the pause; never resetting it counts the pause.
- **Using <code>Date.now()</code> for durations.** A clock change or NTP sync mid-run makes the stopwatch jump. <code>performance.now()</code> cannot go backwards.
- **Starting a new interval on every render.** Without the <code>[running]</code> dependency and a cleanup, intervals pile up.
- **Storing splits and totals separately.** Two sources of truth that can drift apart; store totals, derive splits.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"I store facts, not the display: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bankedMs</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startedAt</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">performance.now()</code>, and lap totals. Elapsed is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">banked + now - startedAt</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Clock:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">performance.now()</code> is monotonic, so clock changes cannot break a duration. The interval only repaints; its 25 ms has nothing to do with accuracy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Actions:</strong> <span style="color:#f0e2c8;">"Start sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startedAt</code>; Pause banks the current run and clears it; Resume is just Start again; Lap and Pause read the clock at click time."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Effect:</strong> <span style="color:#f0e2c8;">"One effect keyed on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code> starts the interval and its cleanup clears it, on pause, on unmount and in StrictMode."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. UI:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mm:ss.cc</code> via a pure formatter, splits derived from totals, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=timer</code> so it is not read aloud constantly, and a polite live region for laps."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it survive a page reload?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Persist <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bankedMs</code>, the laps and the start as a wall-clock <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date.now()</code> value in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">performance.now()</code> restarts at 0 on every page load. On load, rebuild the running state from the saved start.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">requestAnimationFrame</code> for the repaint?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works and syncs with the display. It also pauses in background tabs, which is fine here because the timestamps keep the time right. The interval version is simpler to explain and test.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you highlight the fastest and slowest laps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Derive the splits array, find the min and max indexes in one pass (once there are at least two laps) and add a class to those rows. Still no extra state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test a stopwatch without waiting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use fake timers that also control <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">performance.now()</code>, such as Vitest or Jest modern fake timers. Click Start, advance 1500 ms, click Pause and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">00:01.50</code>; then advance again and assert it did not move.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useRef</code> be better than state for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">startedAt</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A ref works for values that never render, but here <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startedAt</code> decides whether we are running, which changes the buttons, so it must be state. The interval id needs no ref because it lives inside the effect.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Timestamp-based timing** | Duration = now minus start, from a real clock |
| **performance.now()** | Monotonic milliseconds since page start, for measuring durations |
| **Stale closure** | A callback still using state values from an old render |
| **Banking elapsed time** | Adding the current run to a total on pause |
| **Cumulative laps** | Storing totals and deriving each split as a difference |
| **role="timer"** | ARIA role for a time counter, silent by default |

---

**Conclusion:** A stopwatch is subtraction, not counting. Keep the banked time, the start timestamp from a monotonic clock and the lap totals; derive everything on screen; let a cleaned-up interval do nothing but repaint. Its sibling, the [Countdown Timer](/interview-question/build-a-countdown-timer), applies the same idea to a deadline and adds input validation and a completion announcement.`,
        files: {
          "/App.js": `import Stopwatch from "./src/Stopwatch";

export default function App() {
  return (
    <main className="page">
      <Stopwatch />
    </main>
  );
}
`,
          "/src/Stopwatch.js": `import { useEffect, useState } from "react";
import { formatElapsed } from "./formatElapsed";

const TICK_MS = 25; // how often we REDRAW; accuracy never depends on it

export default function Stopwatch() {
  // time from earlier runs, before the last pause
  const [bankedMs, setBankedMs] = useState(0);
  // performance.now() of the current run, or null
  const [startedAt, setStartedAt] = useState(null);
  // last redraw time, only used while running
  const [now, setNow] = useState(0);
  const [laps, setLaps] = useState([]); // total elapsed at each lap press

  const running = startedAt !== null;
  const elapsed = bankedMs + (running ? Math.max(0, now - startedAt) : 0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(performance.now()), TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  const start = () => {
    const t = performance.now();
    setStartedAt(t);
    setNow(t);
  };
  const pause = () => {
    setBankedMs(bankedMs + performance.now() - startedAt);
    setStartedAt(null);
  };
  const lap = () =>
    setLaps([...laps, bankedMs + performance.now() - startedAt]);
  const reset = () => {
    setBankedMs(0);
    setStartedAt(null);
    setLaps([]);
  };

  const label = running ? "Pause" : elapsed > 0 ? "Resume" : "Start";

  return (
    <section className="card" aria-labelledby="sw-title">
      <h1 id="sw-title" className="title">
        Stopwatch
      </h1>
      <div
        className="display"
        role="timer"
        aria-label="Elapsed time"
        data-testid="display"
      >
        {formatElapsed(elapsed)}
      </div>
      <div className="controls">
        <button
          type="button"
          className="primary"
          onClick={running ? pause : start}
          data-testid="toggle"
        >
          {label}
        </button>
        <button
          type="button"
          onClick={lap}
          disabled={!running}
          data-testid="lap"
        >
          Lap
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={elapsed === 0 && laps.length === 0}
          data-testid="reset"
        >
          Reset
        </button>
      </div>
      {laps.length > 0 && (
        <ol
          className="laps"
          aria-label="Laps"
          aria-live="polite"
          data-testid="laps"
        >
          {laps.map((total, i) => (
            <li key={i}>
              <span>Lap {i + 1}</span>
              <span>{formatElapsed(total - (i > 0 ? laps[i - 1] : 0))}</span>
              <span className="muted">{formatElapsed(total)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
`,
          "/src/formatElapsed.js": `const pad = (n) => String(n).padStart(2, "0");

// 83456 ms -> "01:23.45" (minutes : seconds . centiseconds)
export function formatElapsed(ms) {
  const cs = Math.floor(ms / 10);
  return (
    pad(Math.floor(cs / 6000)) +
    ":" +
    pad(Math.floor(cs / 100) % 60) +
    "." +
    pad(cs % 100)
  );
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0b1120;
  color: #e2e8f0;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.card {
  width: 100%;
  max-width: 400px;
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 24px 16px;
  box-sizing: border-box;
}
.title {
  margin: 0 0 12px;
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.display {
  text-align: center;
  font-size: clamp(2.6rem, 14vw, 3.8rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #a5f3fc;
}
.controls {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin: 16px 0;
}
.controls button {
  flex: 1;
  max-width: 120px;
  padding: 10px 0;
  border-radius: 10px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #e2e8f0;
  font: inherit;
  cursor: pointer;
}
.controls .primary {
  background: #0e7490;
  border-color: #22d3ee;
}
.controls button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.controls button:focus-visible {
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
}
.laps {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid #1f2937;
  font-variant-numeric: tabular-nums;
}
.laps li {
  display: flex;
  justify-content: space-between;
  padding: 8px 4px;
  border-bottom: 1px solid #1f2937;
}
.muted {
  color: #94a3b8;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Beginners preparing for a frontend machine coding round in Vue. You know refs and templates at a basic level; timestamps and timer cleanup are explained from zero.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The output under "Verified" was printed by running this exact solution on Vue 3.5.44 (compiled with <code>@vue/compiler-sfc</code>, mounted with <code>createApp(App).mount("#app")</code>) in jsdom.

## 1. A Story First

Timing a run by making a pencil mark every second goes wrong the moment you sneeze and miss marks. Writing down the station clock at the start and the finish, then subtracting, cannot go wrong. Browser timers are the sneezy pencil: <code>setInterval(fn, 10)</code> means "no sooner than 10 ms", and a busy page delays or drops ticks. So this stopwatch records *when* it started and subtracts; the interval only repaints. Its sibling, the [Countdown Timer](/interview-question/build-a-countdown-timer), applies the same idea to a deadline.

## 2. Requirements and Plan

<code>mm:ss.cc</code> display; one Start / Pause / Resume button; Lap (only while running) adding lap number, split and total; Reset; accurate across pauses and busy moments; nothing left running.

| Piece | Vue tool | Meaning |
| :--- | :--- | :--- |
| <code>bankedMs</code> | <code>ref(0)</code> | Time from earlier runs, saved at each pause |
| <code>startedAt</code> | <code>ref(null)</code> | <code>performance.now()</code> when this run began |
| <code>now</code> | <code>ref(0)</code> | Last repaint time |
| <code>laps</code> | <code>ref([])</code> | Total elapsed at each Lap press |
| <code>running</code>, <code>elapsed</code>, <code>label</code>, <code>rows</code> | <code>computed</code> | All derived |
| Interval id | Plain <code>let</code> | Never rendered |

## 3. Build It

### The formatter

~~~js
const pad = (n) => String(n).padStart(2, "0");

// 83456 ms -> "01:23.45" (minutes : seconds . centiseconds)
export function formatElapsed(ms) {
  const cs = Math.floor(ms / 10);
  return (
    pad(Math.floor(cs / 6000)) +
    ":" +
    pad(Math.floor(cs / 100) % 60) +
    "." +
    pad(cs % 100)
  );
}
~~~

Flooring to whole centiseconds first means the display never shows a second that has not fully passed.

### State and derived values

~~~js
// Stopwatch.vue, script setup (excerpt)
const running = computed(() => startedAt.value !== null);
const elapsed = computed(
  () =>
    bankedMs.value +
    (running.value ? Math.max(0, now.value - startedAt.value) : 0),
);
const label = computed(() =>
  running.value ? "Pause" : elapsed.value > 0 ? "Resume" : "Start",
);
const rows = computed(() =>
  laps.value.map((total, i) => ({
    n: i + 1,
    split: total - (i > 0 ? laps.value[i - 1] : 0),
    total,
  })),
);
~~~

📌 **Interview term: Timestamp-based timing** — a duration is "now minus start" from a real clock, never a sum of tick sizes. A late tick delays a repaint, not the number.

📌 **Interview term: performance.now()** — milliseconds since page load from a monotonic clock that never jumps when the system time changes; the right clock for durations. See [performance.now() vs Date.now()](/interview-question/why-would-you-use-performance-now-instead-of-date-now-to-measure-how-long-a-func).

📌 **Interview term: Cumulative laps** — store each lap's running total and derive the split as a difference in a <code>computed</code>, so splits can never disagree with totals.

### The actions own the interval

~~~js
<script setup>
import { computed, onUnmounted, ref } from "vue";
import { formatElapsed } from "../formatElapsed";

const TICK_MS = 25; // how often we REDRAW; accuracy never depends on it

// time from earlier runs, before the last pause
const bankedMs = ref(0);
// performance.now() of the current run, or null
const startedAt = ref(null);
const now = ref(0); // last redraw time, only used while running
const laps = ref([]); // total elapsed at each lap press
let timer = 0;

const running = computed(() => startedAt.value !== null);
const elapsed = computed(() => bankedMs.value + (running.value ? Math.max(0, now.value - startedAt.value) : 0));
const label = computed(() => (running.value ? "Pause" : elapsed.value > 0 ? "Resume" : "Start"));
const rows = computed(() =>
  laps.value.map((total, i) => ({ n: i + 1, split: total - (i > 0 ? laps.value[i - 1] : 0), total })),
);

function start() {
  startedAt.value = now.value = performance.now();
  timer = setInterval(() => (now.value = performance.now()), TICK_MS);
}
function pause() {
  clearInterval(timer);
  bankedMs.value += performance.now() - startedAt.value;
  startedAt.value = null;
}
function lap() {
  laps.value.push(bankedMs.value + performance.now() - startedAt.value);
}
function reset() {
  clearInterval(timer);
  bankedMs.value = 0;
  startedAt.value = null;
  laps.value = [];
}

onUnmounted(() => clearInterval(timer));
</script>

<template>
  <section class="card" aria-labelledby="sw-title">
    <h1 id="sw-title" class="title">Stopwatch</h1>
    <div class="display" role="timer" aria-label="Elapsed time" data-testid="display">{{ formatElapsed(elapsed) }}</div>
    <div class="controls">
      <button type="button" class="primary" data-testid="toggle" @click="running ? pause() : start()">{{ label }}</button>
      <button type="button" :disabled="!running" data-testid="lap" @click="lap">Lap</button>
      <button type="button" :disabled="elapsed === 0 && laps.length === 0" data-testid="reset" @click="reset">Reset</button>
    </div>
    <ol v-if="rows.length" class="laps" aria-label="Laps" aria-live="polite" data-testid="laps">
      <li v-for="row in rows" :key="row.n">
        <span>Lap {{ row.n }}</span>
        <span>{{ formatElapsed(row.split) }}</span>
        <span class="muted">{{ formatElapsed(row.total) }}</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.card { width: 100%; max-width: 400px; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 24px 16px; box-sizing: border-box; }
.title { margin: 0 0 12px; text-align: center; font-size: 1rem; font-weight: 600; color: #94a3b8; letter-spacing: 0.08em; text-transform: uppercase; }
.display { text-align: center; font-size: clamp(2.6rem, 14vw, 3.8rem); font-weight: 700; font-variant-numeric: tabular-nums; color: #a5f3fc; }
.controls { display: flex; gap: 8px; justify-content: center; margin: 16px 0; }
.controls button { flex: 1; max-width: 120px; padding: 10px 0; border-radius: 10px; border: 1px solid #334155; background: #1e293b; color: #e2e8f0; font: inherit; cursor: pointer; }
.controls .primary { background: #0e7490; border-color: #22d3ee; }
.controls button:disabled { opacity: 0.45; cursor: not-allowed; }
.controls button:focus-visible { outline: 3px solid #fbbf24; outline-offset: 2px; }
.laps { list-style: none; margin: 0; padding: 0; border-top: 1px solid #1f2937; font-variant-numeric: tabular-nums; }
.laps li { display: flex; justify-content: space-between; padding: 8px 4px; border-bottom: 1px solid #1f2937; }
.muted { color: #94a3b8; }
</style>
~~~

That is the whole component. Compared with a hook-based design, the Vue version starts and stops the interval directly in the click handlers: <code>start()</code> creates it, <code>pause()</code> and <code>reset()</code> clear it, and <code>onUnmounted</code> clears it if the component disappears mid-run. With no StrictMode-style double mount in Vue, there is no effect to re-run, so this direct ownership is simple and safe.

📌 **Interview term: Banking elapsed time** — on pause, add the current run to <code>bankedMs</code> and set <code>startedAt</code> to <code>null</code>; resume is just <code>start()</code> again. The pause gap never enters the maths.

Notes on the rest:

- The tick, <code>() =&gt; (now.value = performance.now())</code>, reads no state, so there is nothing stale to capture. Pause and Lap read <code>performance.now()</code> at click time, so they are exact even between repaints.
- <code>laps.value.push(...)</code> is reactive because <code>laps</code> is a deep <code>ref</code> of an array; Vue tracks the push. Reset replaces the array.
- <code>:disabled</code> on Lap and Reset keeps impossible actions impossible.

📌 **Interview term: role="timer"** — ARIA role for a time counter; its implicit live setting is off, so the 40 repaints a second are not read aloud. New laps are announced through <code>aria-live="polite"</code> on the list.

## 4. Verified

The driver clicked Start, paused after about 1 s, waited 0.5 s, resumed, pressed Lap twice and paused; then it resumed again and blocked the main thread for 700 ms with a busy loop while a naive stopwatch (+25 ms per <code>setInterval</code> tick) ran alongside. A preloaded wrapper counted the solution's intervals. Real time passed throughout:

~~~text
RENDERED: Stopwatch00:00.00StartLapReset
initial : 00:00.00 | button Start, lap disabled, reset disabled | created 0 timeout(s) + 0 interval(s), cleared 0, pending now 0
started : button Pause, lap enabled, reset enabled | created 0 timeout(s) + 1 interval(s), cleared 0, pending now 1
paused after about 1 s of wall time: shows 1.0 s | error vs wall clock under 40 ms: true | button Resume, lap disabled, reset enabled
0.5 s later, still paused, display unchanged: true
lap rows: Lap 1 00:01.56 00:01.56 | Lap 2 00:00.33 00:01.89
laps    : 2 rows; lap 1 split 1.6 s (1.0 + 0.5 s + click settling), lap 2 split 0.3 s | displayed lap 2 total minus (lap 1 + lap 2 split), in ms: within 10: true
long task: wall time 1.3 s | app added 1.3 s | app error under 40 ms: true | tick counter added 0.6 s and lost over 0.5 s: true
reset   : 00:00.00 | lap rows: 0 | button Start, lap disabled, reset disabled
timers  : created 0 timeout(s) + 3 interval(s), cleared 3, pending now 0
timers after unmount: 0 timeout(s) + 3 interval(s) created, 3 cleared, 0 still pending
~~~

- Every comparison with the wall clock was within 40 ms; the driver's clicks each settle for about 30 ms, which is why lap 1 reads 1.6 s. Exact hundredths vary per run.
- While paused the display did not move.
- During the long task the app kept the full 1.3 s; the tick counter lost more than half a second.
- Because each value is floored separately, displayed split + previous total can be 0.01 s off the displayed total; the stored totals are exact.
- 3 intervals created over 3 runs, 3 cleared, 0 pending after unmount.

## 5. Edge Cases and Accessibility

| Case | Behaviour |
| :--- | :--- |
| Busy thread, background tab | Next repaint reads the clock; time stays right |
| System clock change | No effect: <code>performance.now()</code> is monotonic |
| Unmount while running | <code>onUnmounted</code> clears the interval |
| Double-clicking Start | The button becomes Pause after the first click, so a second interval cannot start |
| Screen readers | Silent <code>role="timer"</code>, polite lap list, native buttons with disabled states |

## 6. Common Pitfalls

- **<code>elapsed.value += 10</code> in the interval**: drifts; one long task cost the tick counter over half a second.
- **Not banking on pause**: either the pause gap is counted or earlier runs are lost.
- **Forgetting <code>onUnmounted</code>**: an interval started in a handler keeps running after the component is gone.
- **<code>Date.now()</code> for durations**: a clock change mid-run makes the time jump.
- **Storing splits and totals separately**: two truths that can disagree.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"Refs for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bankedMs</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startedAt</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">performance.now()</code> and lap totals; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">elapsed</code> is a computed: banked plus now minus start."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Clock:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">performance.now()</code> is monotonic; the 25 ms interval only repaints and has no effect on accuracy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Ownership:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start()</code> creates the interval; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pause()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reset()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUnmounted</code> clear it, so there is never more than one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Actions:</strong> <span style="color:#f0e2c8;">"Pause banks the current run; Resume is Start again; Lap and Pause read the clock at click time."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. UI:</strong> <span style="color:#f0e2c8;">"Rows are a computed with derived splits; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=timer</code> stays silent and the lap list is a polite live region."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watch</code> on <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">running</code> be cleaner?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You could start and stop the interval in a watcher with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onWatcherCleanup()</code> in 3.5), which centralises the timer if many actions change <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code>. With two actions, direct handlers are just as clear.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you extract a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useStopwatch()</code> composable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Move the refs, computeds, actions and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUnmounted</code> call into a function that returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">elapsed</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">laps</code> and the actions. The component keeps only the template.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you persist across reloads?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Save <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bankedMs</code>, laps and a wall-clock start (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date.now()</code>) to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">performance.now()</code> restarts at 0 each page load.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue Test Utils plus fake timers that also mock <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">performance.now()</code> (Vitest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vi.useFakeTimers()</code>). Click Start, advance, click Pause, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await nextTick()</code>, assert the text.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Timestamp-based timing** | Duration = now minus start, from a real clock |
| **performance.now()** | Monotonic milliseconds since page load |
| **Cumulative laps** | Store totals, derive splits |
| **Banking elapsed time** | Adding the current run to a total on pause |
| **role="timer"** | ARIA role for a time counter, silent by default |

---

**Conclusion:** The Vue stopwatch is four refs that record facts about time, computeds that turn them into the display and the lap rows, and click handlers that own a single repaint interval, with <code>onUnmounted</code> as the safety net. The [Countdown Timer](/interview-question/build-a-countdown-timer) reuses the model with a deadline.`,
        files: {
          "/src/App.vue": `<script setup>
import Stopwatch from "./components/Stopwatch.vue";
</script>

<template>
  <main class="page">
    <Stopwatch />
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0b1120;
  color: #e2e8f0;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
</style>
`,
          "/src/components/Stopwatch.vue": `<script setup>
import { computed, onUnmounted, ref } from "vue";
import { formatElapsed } from "../formatElapsed";

const TICK_MS = 25; // how often we REDRAW; accuracy never depends on it

const bankedMs = ref(0); // time from earlier runs, before the last pause
const startedAt = ref(null); // performance.now() of the current run, or null
const now = ref(0); // last redraw time, only used while running
const laps = ref([]); // total elapsed at each lap press
let timer = 0;

const running = computed(() => startedAt.value !== null);
const elapsed = computed(
  () =>
    bankedMs.value +
    (running.value ? Math.max(0, now.value - startedAt.value) : 0),
);
const label = computed(() =>
  running.value ? "Pause" : elapsed.value > 0 ? "Resume" : "Start",
);
const rows = computed(() =>
  laps.value.map((total, i) => ({
    n: i + 1,
    split: total - (i > 0 ? laps.value[i - 1] : 0),
    total,
  })),
);

function start() {
  startedAt.value = now.value = performance.now();
  timer = setInterval(() => (now.value = performance.now()), TICK_MS);
}
function pause() {
  clearInterval(timer);
  bankedMs.value += performance.now() - startedAt.value;
  startedAt.value = null;
}
function lap() {
  laps.value.push(bankedMs.value + performance.now() - startedAt.value);
}
function reset() {
  clearInterval(timer);
  bankedMs.value = 0;
  startedAt.value = null;
  laps.value = [];
}

onUnmounted(() => clearInterval(timer));
</script>

<template>
  <section class="card" aria-labelledby="sw-title">
    <h1 id="sw-title" class="title">Stopwatch</h1>
    <div
      class="display"
      role="timer"
      aria-label="Elapsed time"
      data-testid="display"
    >{{ formatElapsed(elapsed) }}</div>
    <div class="controls">
      <button
        type="button"
        class="primary"
        data-testid="toggle"
        @click="running ? pause() : start()"
      >{{ label }}</button>
      <button
        type="button"
        :disabled="!running"
        data-testid="lap"
        @click="lap"
      >Lap</button>
      <button
        type="button"
        :disabled="elapsed === 0 && laps.length === 0"
        data-testid="reset"
        @click="reset"
      >Reset</button>
    </div>
    <ol
      v-if="rows.length"
      class="laps"
      aria-label="Laps"
      aria-live="polite"
      data-testid="laps"
    >
      <li v-for="row in rows" :key="row.n">
        <span>Lap {{ row.n }}</span>
        <span>{{ formatElapsed(row.split) }}</span>
        <span class="muted">{{ formatElapsed(row.total) }}</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.card {
  width: 100%;
  max-width: 400px;
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 24px 16px;
  box-sizing: border-box;
}
.title {
  margin: 0 0 12px;
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.display {
  text-align: center;
  font-size: clamp(2.6rem, 14vw, 3.8rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #a5f3fc;
}
.controls {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin: 16px 0;
}
.controls button {
  flex: 1;
  max-width: 120px;
  padding: 10px 0;
  border-radius: 10px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #e2e8f0;
  font: inherit;
  cursor: pointer;
}
.controls .primary {
  background: #0e7490;
  border-color: #22d3ee;
}
.controls button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.controls button:focus-visible {
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
}
.laps {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid #1f2937;
  font-variant-numeric: tabular-nums;
}
.laps li {
  display: flex;
  justify-content: space-between;
  padding: 8px 4px;
  border-bottom: 1px solid #1f2937;
}
.muted {
  color: #94a3b8;
}
</style>
`,
          "/src/formatElapsed.js": `const pad = (n) => String(n).padStart(2, "0");

// 83456 ms -> "01:23.45" (minutes : seconds . centiseconds)
export function formatElapsed(ms) {
  const cs = Math.floor(ms / 10);
  return (
    pad(Math.floor(cs / 6000)) +
    ":" +
    pad(Math.floor(cs / 100) % 60) +
    "." +
    pad(cs % 100)
  );
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Beginners preparing for a frontend machine coding round in Angular. You know components and the idea of signals; timestamps and timer cleanup are explained from zero.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The output under "Verified" was printed by booting this exact solution on Angular 22.2.3 in jsdom, AOT-compiled with strict templates and JIT-compiled as in the playground.

## 1. A Story First

Counting pencil marks once a second to time a run fails the moment you miss a mark; noting the clock at start and finish and subtracting never fails. Browser timers miss marks: <code>setInterval(fn, 10)</code> only promises "no sooner than 10 ms". So this stopwatch subtracts timestamps and uses the interval only to repaint. Its sibling [Countdown Timer](/interview-question/build-a-countdown-timer) applies the idea to a deadline.

## 2. Requirements and Plan

<code>mm:ss.cc</code>; one Start / Pause / Resume button; Lap (while running) with split and total; Reset; accurate across pauses and busy moments; no timer after destroy.

| Piece | Angular tool | Meaning |
| :--- | :--- | :--- |
| <code>bankedMs</code>, <code>startedAt</code>, <code>now</code>, <code>laps</code> | <code>signal</code> | Facts about time |
| <code>running</code>, <code>elapsed</code>, <code>label</code>, <code>rows</code> | <code>computed</code> | Derived for the template |
| Interval id | Private field | Never rendered |
| Cleanup | <code>inject(DestroyRef).onDestroy</code> | Clears a running interval |

📌 **Interview term: Signal** — a reactive value read by calling it; in a zoneless app like this one, writing a signal is what schedules a re-render, so the tick must write <code>now</code> as a signal. See [Angular signals](/interview-question/what-are-angular-signals).

## 3. Build It

### The formatter

~~~ts
const pad = (n: number) => String(n).padStart(2, "0");

// 83456 ms -> "01:23.45" (minutes : seconds . centiseconds)
export function formatElapsed(ms: number): string {
  const cs = Math.floor(ms / 10);
  return (
    pad(Math.floor(cs / 6000)) +
    ":" +
    pad(Math.floor(cs / 100) % 60) +
    "." +
    pad(cs % 100)
  );
}
~~~

### The component class

~~~ts
// stopwatch.component.ts (class)
export class StopwatchComponent {
  // time from earlier runs, before the last pause
  readonly bankedMs = signal(0);
  // performance.now() of the current run
  readonly startedAt = signal<number | null>(null);
  readonly now = signal(0); // last redraw time, only used while running
  // total elapsed at each lap press
  readonly laps = signal<number[]>([]);

  readonly running = computed(() => this.startedAt() !== null);
  readonly elapsed = computed(() => {
    const s = this.startedAt();
    return (
      this.bankedMs() + (s === null ? 0 : Math.max(0, this.now() - s))
    );
  });
  readonly label = computed(() =>
    this.running() ? "Pause" : this.elapsed() > 0 ? "Resume" : "Start",
  );
  readonly rows = computed(() =>
    this.laps().map((total, i, all) => ({
      n: i + 1,
      split: total - (i > 0 ? all[i - 1] : 0),
      total,
    })),
  );
  readonly fmt = formatElapsed;

  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
  }

  start(): void {
    const t = performance.now();
    this.startedAt.set(t);
    this.now.set(t);
    this.timer = setInterval(
      () => this.now.set(performance.now()),
      TICK_MS,
    );
  }

  pause(): void {
    clearInterval(this.timer);
    this.bankedMs.update(
      (b) => b + performance.now() - (this.startedAt() ?? 0),
    );
    this.startedAt.set(null);
  }

  lap(): void {
    const total =
      this.bankedMs() + performance.now() - (this.startedAt() ?? 0);
    this.laps.update((l) => [...l, total]);
  }

  reset(): void {
    clearInterval(this.timer);
    this.bankedMs.set(0);
    this.startedAt.set(null);
    this.laps.set([]);
  }
}
~~~

📌 **Interview term: Timestamp-based timing** — the duration is now minus start from a real clock, never a sum of tick sizes.

📌 **Interview term: performance.now()** — a monotonic millisecond clock that ignores system time changes, ideal for durations; see [performance.now() vs Date.now()](/interview-question/why-would-you-use-performance-now-instead-of-date-now-to-measure-how-long-a-func).

📌 **Interview term: Banking elapsed time** — <code>pause()</code> adds the current run to <code>bankedMs</code> and clears <code>startedAt</code>; resume calls <code>start()</code> again.

Things to point out:

- <code>TICK_MS</code> is 25: the interval only repaints. It reads no state, so there is no stale value to capture.
- <code>laps.update((l) =&gt; [...l, total])</code> creates a new array. Signals compare by identity, so <code>l.push()</code> would not notify anyone.
- The <code>?? 0</code> fallbacks keep strict TypeScript happy: <code>startedAt()</code> is <code>number | null</code>, though Lap and Pause are only reachable while running.
- The interval is owned by the actions (created in <code>start</code>, cleared in <code>pause</code> and <code>reset</code>), and <code>DestroyRef</code> covers destruction mid-run.

📌 **Interview term: Cumulative laps** — store totals, derive each split in <code>rows</code> as a difference.

### The template

~~~html
<div
  class="display"
  role="timer"
  aria-label="Elapsed time"
  data-testid="display"
>{{ fmt(elapsed()) }}</div>
<div class="controls">
  <button
    type="button"
    class="primary"
    data-testid="toggle"
    (click)="running() ? pause() : start()"
  >{{ label() }}</button>
  <button
    type="button"
    [disabled]="!running()"
    data-testid="lap"
    (click)="lap()"
  >Lap</button>
  <button
    type="button"
    [disabled]="elapsed() === 0 && laps().length === 0"
    data-testid="reset"
    (click)="reset()"
  >Reset</button>
</div>
@if (rows().length) {
  <ol
    class="laps"
    aria-label="Laps"
    aria-live="polite"
    data-testid="laps"
  >
    @for (row of rows(); track row.n) {
      <li>
        <span>Lap {{ row.n }}</span>
        <span>{{ fmt(row.split) }}</span>
        <span class="muted">{{ fmt(row.total) }}</span>
      </li>
    }
  </ol>
}
~~~

📌 **Interview term: role="timer"** — ARIA role for a time counter, silent by default (implicit <code>aria-live="off"</code>), so constant repaints are not read out. The lap list is a polite live region instead.

<code>@for</code> requires a <code>track</code> expression; the lap number is unique and stable.

## 4. Verified

The driver clicked Start, paused after about 1 s, waited, resumed, pressed Lap twice and paused; then it resumed and blocked the main thread for 700 ms next to a naive +25 ms per tick stopwatch. A preloaded wrapper counted the component's intervals.

AOT with strict templates:

~~~text
RENDERED: Stopwatch00:00.00StartLapReset
initial : 00:00.00 | button Start, lap disabled, reset disabled | created 0 timeout(s) + 0 interval(s), cleared 0, pending now 0
started : button Pause, lap enabled, reset enabled | created 0 timeout(s) + 1 interval(s), cleared 0, pending now 1
paused after about 1 s of wall time: shows 1.0 s | error vs wall clock under 40 ms: true | button Resume, lap disabled, reset enabled
0.5 s later, still paused, display unchanged: true
lap rows: Lap 1 00:01.57 00:01.57 | Lap 2 00:00.33 00:01.90
laps    : 2 rows; lap 1 split 1.6 s (1.0 + 0.5 s + click settling), lap 2 split 0.3 s | displayed lap 2 total minus (lap 1 + lap 2 split), in ms: within 10: true
long task: wall time 1.3 s | app added 1.3 s | app error under 40 ms: true | tick counter added 0.6 s and lost over 0.5 s: true
reset   : 00:00.00 | lap rows: 0 | button Start, lap disabled, reset disabled
timers  : created 0 timeout(s) + 3 interval(s), cleared 3, pending now 0
timers after unmount: 0 timeout(s) + 3 interval(s) created, 3 cleared, 0 still pending
~~~

JIT, as in the playground:

~~~text
RENDERED: Stopwatch00:00.00StartLapReset
initial : 00:00.00 | button Start, lap disabled, reset disabled | created 0 timeout(s) + 0 interval(s), cleared 0, pending now 0
started : button Pause, lap enabled, reset enabled | created 0 timeout(s) + 1 interval(s), cleared 0, pending now 1
paused after about 1 s of wall time: shows 1.0 s | error vs wall clock under 40 ms: true | button Resume, lap disabled, reset enabled
0.5 s later, still paused, display unchanged: true
lap rows: Lap 1 00:01.57 00:01.57 | Lap 2 00:00.33 00:01.90
laps    : 2 rows; lap 1 split 1.6 s (1.0 + 0.5 s + click settling), lap 2 split 0.3 s | displayed lap 2 total minus (lap 1 + lap 2 split), in ms: within 10: true
long task: wall time 1.3 s | app added 1.3 s | app error under 40 ms: true | tick counter added 0.7 s and lost over 0.5 s: true
reset   : 00:00.00 | lap rows: 0 | button Start, lap disabled, reset disabled
timers  : created 0 timeout(s) + 3 interval(s), cleared 3, pending now 0
timers after unmount: 0 timeout(s) + 3 interval(s) created, 3 cleared, 0 still pending
~~~

- All wall-clock comparisons within 40 ms (each driver click settles about 30 ms, hence 1.6 s for lap 1); exact hundredths vary per run.
- Paused display frozen; the long task did not cost the app any time, while the tick counter lost more than 0.5 s.
- Displayed split plus previous total can be 0.01 s off the displayed total because each is floored separately; stored totals are exact.
- 3 intervals created, 3 cleared, 0 pending after destroy.

## 5. Edge Cases and Accessibility

| Case | Behaviour |
| :--- | :--- |
| Busy thread, background tab | Next repaint reads the clock, so time stays right |
| System clock change | No effect, thanks to <code>performance.now()</code> |
| Destroyed while running | <code>DestroyRef</code> clears the interval |
| Zoneless rendering | The tick writes a signal, which schedules the repaint |
| Screen readers | Silent timer, polite lap list, native buttons with <code>[disabled]</code> |

## 6. Common Pitfalls

- **<code>this.elapsed.update(e =&gt; e + 25)</code> per tick**: drifts, as the tick counter shows.
- **Plain fields for time**: in a zoneless app a field set inside <code>setInterval</code> never re-renders.
- **Mutating the laps array with <code>push</code>**: a signal holding the same array does not notify.
- **No destroy cleanup**: the interval outlives the component.
- **<code>Date.now()</code> for durations**: jumps with clock changes.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"Signals for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bankedMs</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startedAt</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">performance.now()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">now</code> and lap totals; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">elapsed</code> is a computed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Clock:</strong> <span style="color:#f0e2c8;">"Monotonic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">performance.now()</code>; the 25 ms interval only repaints, so accuracy never depends on it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Actions:</strong> <span style="color:#f0e2c8;">"Start sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startedAt</code> and the interval; Pause banks the run and clears it; Lap reads the clock at click time; Reset clears everything."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cleanup:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject(DestroyRef).onDestroy</code> clears a running interval; there is never more than one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Template:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=timer</code> that stays silent, a polite lap list, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[disabled]</code> buttons."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">effect</code> that starts the interval when <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">running()</code> is true?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That works too, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> clearing it, and it centralises the timer. With only two actions changing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code>, handling it in the actions is just as clear and avoids an effect.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use RxJS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">interval(25).pipe(takeUntilDestroyed())</code> mapped to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">performance.now()</code> and bridged with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal</code> works, as long as you never count emissions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you persist across reloads?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bankedMs</code>, laps and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date.now()</code> start in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">performance.now()</code> restarts each page load.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TestBed plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fakeAsync</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick</code> or Jest fake timers that mock <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">performance.now()</code>; click Start, advance, click Pause, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code>, assert the text.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Signal** | Reactive value; writing it schedules a re-render here |
| **Timestamp-based timing** | Duration = now minus start |
| **performance.now()** | Monotonic millisecond clock for durations |
| **Banking elapsed time** | Adding the current run to a total on pause |
| **Cumulative laps** | Store totals, derive splits |
| **role="timer"** | ARIA role for a time counter, silent by default |

---

**Conclusion:** The Angular stopwatch is four signals of facts about time, computeds for everything shown, action methods that own a single repaint interval, and a <code>DestroyRef</code> safety net. The [Countdown Timer](/interview-question/build-a-countdown-timer) turns the same model towards a deadline.`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation } from "@angular/core";
import { StopwatchComponent } from "./stopwatch.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [StopwatchComponent],
  template: \`<main class="page"><app-stopwatch /></main>\`,
  // these two rules are global on purpose
  encapsulation: ViewEncapsulation.None,
  styles: [
    \`
      body {
        margin: 0;
        background: #0b1120;
        color: #e2e8f0;
        font-family: system-ui, sans-serif;
      }
      .page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 16px;
        box-sizing: border-box;
      }
    \`,
  ],
})
export class AppComponent {}
`,
          "/src/app/format-elapsed.ts": `const pad = (n: number) => String(n).padStart(2, "0");

// 83456 ms -> "01:23.45" (minutes : seconds . centiseconds)
export function formatElapsed(ms: number): string {
  const cs = Math.floor(ms / 10);
  return (
    pad(Math.floor(cs / 6000)) +
    ":" +
    pad(Math.floor(cs / 100) % 60) +
    "." +
    pad(cs % 100)
  );
}
`,
          "/src/app/stopwatch.component.ts": `import { Component, DestroyRef, computed, inject, signal } from "@angular/core";
import { formatElapsed } from "./format-elapsed";

const TICK_MS = 25; // how often we REDRAW; accuracy never depends on it

@Component({
  selector: "app-stopwatch",
  standalone: true,
  template: \`
    <section class="card" aria-labelledby="sw-title">
      <h1 id="sw-title" class="title">Stopwatch</h1>
      <div
        class="display"
        role="timer"
        aria-label="Elapsed time"
        data-testid="display"
      >{{ fmt(elapsed()) }}</div>
      <div class="controls">
        <button
          type="button"
          class="primary"
          data-testid="toggle"
          (click)="running() ? pause() : start()"
        >{{ label() }}</button>
        <button
          type="button"
          [disabled]="!running()"
          data-testid="lap"
          (click)="lap()"
        >Lap</button>
        <button
          type="button"
          [disabled]="elapsed() === 0 && laps().length === 0"
          data-testid="reset"
          (click)="reset()"
        >Reset</button>
      </div>
      @if (rows().length) {
        <ol
          class="laps"
          aria-label="Laps"
          aria-live="polite"
          data-testid="laps"
        >
          @for (row of rows(); track row.n) {
            <li>
              <span>Lap {{ row.n }}</span>
              <span>{{ fmt(row.split) }}</span>
              <span class="muted">{{ fmt(row.total) }}</span>
            </li>
          }
        </ol>
      }
    </section>
  \`,
  styles: [
    \`
    .card { width: 100%; max-width: 400px; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 24px 16px; box-sizing: border-box; }
    .title { margin: 0 0 12px; text-align: center; font-size: 1rem; font-weight: 600; color: #94a3b8; letter-spacing: 0.08em; text-transform: uppercase; }
    .display { text-align: center; font-size: clamp(2.6rem, 14vw, 3.8rem); font-weight: 700; font-variant-numeric: tabular-nums; color: #a5f3fc; }
    .controls { display: flex; gap: 8px; justify-content: center; margin: 16px 0; }
    .controls button { flex: 1; max-width: 120px; padding: 10px 0; border-radius: 10px; border: 1px solid #334155; background: #1e293b; color: #e2e8f0; font: inherit; cursor: pointer; }
    .controls .primary { background: #0e7490; border-color: #22d3ee; }
    .controls button:disabled { opacity: 0.45; cursor: not-allowed; }
    .controls button:focus-visible { outline: 3px solid #fbbf24; outline-offset: 2px; }
    .laps { list-style: none; margin: 0; padding: 0; border-top: 1px solid #1f2937; font-variant-numeric: tabular-nums; }
    .laps li { display: flex; justify-content: space-between; padding: 8px 4px; border-bottom: 1px solid #1f2937; }
    .muted { color: #94a3b8; }
  \`,
  ],
})
export class StopwatchComponent {
  // time from earlier runs, before the last pause
  readonly bankedMs = signal(0);
  // performance.now() of the current run
  readonly startedAt = signal<number | null>(null);
  readonly now = signal(0); // last redraw time, only used while running
  readonly laps = signal<number[]>([]); // total elapsed at each lap press

  readonly running = computed(() => this.startedAt() !== null);
  readonly elapsed = computed(() => {
    const s = this.startedAt();
    return this.bankedMs() + (s === null ? 0 : Math.max(0, this.now() - s));
  });
  readonly label = computed(() =>
    this.running() ? "Pause" : this.elapsed() > 0 ? "Resume" : "Start",
  );
  readonly rows = computed(() =>
    this.laps().map((total, i, all) => ({
      n: i + 1,
      split: total - (i > 0 ? all[i - 1] : 0),
      total,
    })),
  );
  readonly fmt = formatElapsed;

  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
  }

  start(): void {
    const t = performance.now();
    this.startedAt.set(t);
    this.now.set(t);
    this.timer = setInterval(() => this.now.set(performance.now()), TICK_MS);
  }

  pause(): void {
    clearInterval(this.timer);
    this.bankedMs.update(
      (b) => b + performance.now() - (this.startedAt() ?? 0),
    );
    this.startedAt.set(null);
  }

  lap(): void {
    const total = this.bankedMs() + performance.now() - (this.startedAt() ?? 0);
    this.laps.update((l) => [...l, total]);
  }

  reset(): void {
    clearInterval(this.timer);
    this.bankedMs.set(0);
    this.startedAt.set(null);
    this.laps.set([]);
  }
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Countdown Timer",
    seoDescription:
      "Build a countdown timer in React, Vue and Angular: minutes and seconds input, a deadline that survives pauses and long tasks, and an accessible done alert.",
    description: `**Question presented to candidate:**
"Build a countdown timer. The user enters minutes and seconds, presses Start, and can pause, resume and reset it. It must stop exactly at zero and tell the user, including screen-reader users, that time is up."

**Requirements:**
- Two number inputs: minutes (0-99) and seconds (0-59); out-of-range or junk input is clamped.
- Start is disabled when the total is zero; inputs are locked while the timer is running or paused.
- One button reads Start, Pause while running, Resume while paused; Reset returns to the entered time.
- The display is \`mm:ss\` and reaches \`00:00\` exactly when the time is over, then shows a "Time is up!" alert once.
- Correct even if the page is busy or the tab was in the background; no timers left running.

**What a strong answer should cover:**
- A **deadline** (\`endAt = Date.now() + remaining\`) as the source of truth, with remaining time derived as \`endAt - now\`, instead of decrementing a counter.
- Rounding the display **up** (\`Math.ceil\`) so \`00:00\` appears only when time has really run out.
- Pausing banks the remaining milliseconds; resuming creates a new deadline.
- A single timer, ideally a timeout aimed at the moment the shown second changes (\`left % 1000\`), cleared on pause, reset and unmount.
- Completion handled in exactly one place so it fires once.
- Input validation (clamping) and an accessible completion message with \`role="alert"\`.

**Clarifying questions expected:**
- "Should it keep counting if the user reloads the page?"
- "Any sound or browser notification at the end, or only an on-screen message?"
- "Is hours support needed, or are 99 minutes enough?"

**Code / implementation expected:** Yes. A working countdown with validated inputs, a deadline model, pause/resume/reset, single-fire completion and cleanup.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Beginners preparing for a frontend machine coding round. You know a little JavaScript and React; deadlines, timeouts, effect cleanup and live regions are explained from zero.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary interviewers expect. Every output under "Verified" was printed by running this exact solution on React 19.3.1 inside <code>&lt;StrictMode&gt;</code> in jsdom.

## 1. Why This Even Matters — A Story First

You put a pizza in the oven and need it out in 12 minutes. You could stand there counting "one, two, three..." up to 720. Lose count once and the pizza burns. Or you could look at the kitchen clock, see it is 7:03, and decide: "out at 7:15". From then on you only glance at the clock and compare. Get distracted for five minutes and you still know exactly how long is left.

A countdown timer in the browser has the same two options. Decrementing a <code>secondsLeft</code> counter on every <code>setInterval</code> tick is counting out loud: a busy page or a background tab skips ticks and the timer finishes late. Writing down the **deadline** once and computing "deadline minus now" whenever you look is the kitchen-clock way, and it is what this build does.

This is a sibling of the [Stopwatch](/interview-question/build-a-stopwatch), which measures *up* from a start time with laps. Here the angle is different: user input that must be validated, a display that must round correctly, and a completion event that must fire exactly once and be announced.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Should it keep running across a page reload? | Then the deadline must be stored as a wall-clock <code>Date.now()</code> value in <code>localStorage</code>, which is one reason this build uses <code>Date.now()</code>. |
| Input as minutes + seconds, or one free-text field like "5:30"? | Two clamped number inputs avoid parsing; free text needs a parser and error messages. |
| What happens at zero: message, sound, notification? | A sound or a Notification needs a user gesture and permissions; an on-screen alert does not. |
| Can the user edit the time while it runs? | We lock the inputs while running or paused, which removes a whole class of state bugs. |
| Hours needed? | We cap minutes at 99. |
| How precise must the end be? | "On the second" rules out decrementing a counter. |

## 3. Requirements and Plan

**Component tree.** <code>App</code> renders <code>CountdownTimer</code>. Pure helpers <code>formatRemaining(ms)</code> and <code>clamp(value, max)</code> live in <code>time.js</code>.

**State model.**

| Piece | Kind | Meaning |
| :--- | :--- | :--- |
| <code>minutes</code>, <code>seconds</code> | State | What the user entered (already clamped). |
| <code>status</code> | State | One of <code>"idle"</code>, <code>"running"</code>, <code>"paused"</code>, <code>"done"</code>. |
| <code>endAt</code> | State | <code>Date.now()</code> deadline while running. |
| <code>pausedLeft</code> | State | Milliseconds left, banked on pause. |
| <code>now</code> | State | Last time we looked; only there to trigger re-renders. |
| <code>totalMs</code>, <code>leftMs</code>, button label, locked flag | Derived | Computed in render. |

📌 **Interview term: Finite state machine** — a model where the component is always in exactly one named state (idle, running, paused, done) and only specific events move it between them. One <code>status</code> string is easier to reason about than three booleans like <code>isRunning</code>, <code>isPaused</code>, <code>isDone</code> that can contradict each other.

How the timer wakes up, for a 3.3 s countdown:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Wake ups for a 3.3 second countdown: first after 300 ms, then every second, and the last one exactly at the deadline">
  <defs>
    <marker id="cd-r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="270" height="70" rx="10"/>
  <text class="d-text" x="155" y="58" text-anchor="middle">Start: 3300 ms left</text>
  <text class="d-sub" x="155" y="80" text-anchor="middle">shows 00:04, wake in 300</text>
  <rect class="d-box" x="390" y="30" width="270" height="70" rx="10"/>
  <text class="d-text" x="525" y="58" text-anchor="middle">3000 ms left</text>
  <text class="d-sub" x="525" y="80" text-anchor="middle">shows 00:03, wake in 1000</text>
  <rect class="d-box" x="390" y="190" width="270" height="70" rx="10"/>
  <text class="d-text" x="525" y="218" text-anchor="middle">1000 ms left</text>
  <text class="d-sub" x="525" y="240" text-anchor="middle">shows 00:01, wake in 1000</text>
  <rect class="d-box-accent" x="20" y="190" width="270" height="70" rx="10"/>
  <text class="d-text d-accent" x="155" y="218" text-anchor="middle">0 ms left: done</text>
  <text class="d-sub" x="155" y="240" text-anchor="middle">shows 00:00 and the alert</text>
  <path class="d-edge" d="M 290 65 L 384 65" marker-end="url(#cd-r-arrow)"/>
  <path class="d-edge-dashed" d="M 525 100 L 525 184" marker-end="url(#cd-r-arrow)"/>
  <path class="d-edge-accent" d="M 390 225 L 296 225" marker-end="url(#cd-r-arrow)"/>
</svg>

Each wake-up recomputes the time left from the deadline and sleeps exactly until the number on screen should change (the dashed arrow hides the 2000 ms step). The last sleep ends on the deadline itself, so "done" is not up to a whole tick late.

## 4. Build It Step by Step

### Step 1: formatting and clamping

~~~js
const pad = (n) => String(n).padStart(2, "0");

// Round UP: with 2.3 s left the display says 00:03, and 00:00 appears
// only when the time is really over.
export function formatRemaining(ms) {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  return pad(Math.floor(s / 60)) + ":" + pad(s % 60);
}

// Whole number between 0 and max; empty or junk input becomes 0.
export const clamp = (value, max) =>
  Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));
~~~

📌 **Interview term: Rounding up the display** — show <code>Math.ceil(ms / 1000)</code> seconds. With 2.3 s left the screen says 00:03; it says 00:00 only when time is really over. Flooring would show 00:00 for the whole final second while the timer is still running, which looks broken.

<code>clamp</code> turns <code>"75"</code> into 59, <code>"-3"</code> into 0 and <code>""</code> or <code>"abc"</code> into 0, so the rest of the code can trust <code>minutes</code> and <code>seconds</code>.

### Step 2: state and the derived time left

~~~jsx
// CountdownTimer.js (excerpt)
const totalMs = (minutes * 60 + seconds) * 1000;
const leftMs =
  status === "running"
    ? Math.max(0, endAt - now)
    : status === "paused"
      ? pausedLeft
      : status === "done"
        ? 0
        : totalMs;
~~~

📌 **Interview term: Deadline-based countdown** — store when the countdown ends and compute <code>endAt - now</code> whenever you render. Nothing is ever decremented, so missed ticks cannot make it late.

<code>leftMs</code> is derived for every status, which is why there is no <code>secondsLeft</code> state to keep in sync.

### Step 3: the effect that wakes up on each second

~~~jsx
// CountdownTimer.js (excerpt)
useEffect(() => {
  if (status !== "running") return;
  let id;
  const tick = () => {
    const left = endAt - Date.now();
    if (left <= 0) {
      // the only place "done" is set, so it happens once
      setStatus("done");
      return;
    }
    setNow(Date.now());
    // Wake up exactly when the shown
    // second changes (or at the deadline).
    id = setTimeout(tick, left % 1000 || 1000);
  };
  tick();
  return () => clearTimeout(id);
}, [status, endAt]);
~~~

📌 **Interview term: Wake-up scheduling** — instead of polling every 100 or 250 ms, compute when the display will next change and sleep until then. With <code>left = 2300</code>, <code>left % 1000</code> is 300: in 300 ms the display moves from 00:03 to 00:02. When <code>left</code> is an exact multiple of 1000 the remainder is 0, so <code>|| 1000</code> sleeps a full second. One render per second, and the final wake-up lands on the deadline.

📌 **Interview term: Single-fire completion** — exactly one code path sets <code>"done"</code>, and setting it makes the effect clean up and not restart (the status is no longer <code>"running"</code>). There is no way to show the alert twice or to keep ticking after zero.

The cleanup clears the latest timeout id when the status changes (Pause, Reset), when <code>endAt</code> changes, on unmount, and in the StrictMode mount-cleanup-mount cycle. See [the cleanup function in useEffect](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect) and the [deps array](/interview-question/what-is-the-purpose-of-the-deps-array-in-useeffect-and-usecallback).

### Step 4: the actions

~~~jsx
// CountdownTimer.js (excerpt)
const start = () => {
  const t = Date.now();
  setEndAt(t + (status === "paused" ? pausedLeft : totalMs));
  setNow(t);
  setStatus("running");
};
const pause = () => {
  setPausedLeft(Math.max(0, endAt - Date.now()));
  setStatus("paused");
};
const edit = (setter, max) => (e) => {
  setter(clamp(e.target.value, max));
  setStatus("idle");
};
~~~

📌 **Interview term: Banking the remaining time** — Pause saves how many milliseconds are left and forgets the deadline; Resume creates a new deadline from that amount. The paused minutes never count.

Start doubles as Resume (it checks <code>status</code>) and as "start again" after done. Reset is one line, <code>setStatus("idle")</code>: in idle, <code>leftMs</code> is derived from the inputs again, so there is nothing else to restore.

### Step 5: render and accessibility

~~~jsx
// CountdownTimer.js (excerpt)
<div
  className={status === "done" ? "display done" : "display"}
  role="timer"
  aria-label="Time remaining"
  data-testid="display"
>
  {formatRemaining(leftMs)}
</div>
...
{
  status === "done" && (
    <p className="alert" role="alert" data-testid="alert">
      Time is up!
    </p>
  );
}
~~~

📌 **Interview term: role="alert"** — an assertive live region. When an element with this role appears, screen readers interrupt and read it. It is the right tool for "time is up", and the wrong one for the ticking digits, which use the silent <code>role="timer"</code>.

The inputs are real <code>&lt;input type="number"&gt;</code> fields inside <code>&lt;label&gt;</code>s with <code>min</code>, <code>max</code> and <code>inputMode="numeric"</code> (a numeric keypad on phones), and <code>disabled</code> while locked. Start is disabled when the total is zero.

## 5. Verified

Run with <code>scripts/verify-mc-solution.mjs</code> as <code>&lt;StrictMode&gt;&lt;App /&gt;&lt;/StrictMode&gt;</code> in jsdom, with real time passing. A preloaded wrapper counted the solution's timeouts. The driver typed into the inputs, ran a 2 s countdown, a 3 s countdown paused for 1 s after 1.2 s, and a 3 s countdown during which it blocked the main thread for 1.5 s. Each change of the display is shown as <code>value@seconds-since-start</code>:

~~~text
RENDERED: Countdown TimerMinutesSeconds00:10StartReset
initial   : 00:10 | start Start | reset disabled: true
type 75 s : input shows 59 | display 00:59
0 m 0 s   : start disabled: true
run 2 s   : inputs disabled: true | 00:02@0.0s -> 00:01@1.0s -> 00:00@2.0s | alert: Time is up! @2.0s
after done: 00:00 | alerts in DOM: 1 | button Start | created 2 timeout(s) + 0 interval(s), cleared 0, pending now 0
paused    : 00:02 -> 1 s later 00:02 | button Resume
resumed   : 00:02@2.3s -> 00:01@3.0s -> 00:00@4.0s | alert: Time is up! @4.0s (3 s of running + 1 s paused)
long task : 00:03@2.0s -> 00:01@2.0s -> 00:00@3.0s | alert: Time is up! @3.0s
reset     : 00:03 | alerts: 0 | inputs disabled: false | created 9 timeout(s) + 0 interval(s), cleared 1, pending now 0
timers after unmount: 9 timeout(s) + 0 interval(s) created, 1 cleared, 0 still pending
~~~

- **Validation**: typing 75 in seconds left 59 in the box; 0 minutes 0 seconds disabled Start.
- **Timing**: the 2 s run changed at 1.0 s and 2.0 s and announced at 2.0 s. The timeout count includes one extra 1 ms wake-up when a Node timer fires a hair early and re-aims; it varies between runs.
- **Pause**: frozen at 00:02 for the whole second; the paused run ended at 4.0 s, which is 3 s of running plus 1 s paused.
- **Long task**: the display was stuck at 00:03 while the thread was blocked, then jumped straight to 00:01 (skipping 00:02) and still finished at 3.0 s. A decrementing counter would have finished late.
- **Once**: one alert element; Reset removed it and unlocked the inputs.
- **Cleanup**: 0 timers pending after unmount.

Not checkable in jsdom: what a real screen reader says, and background-tab throttling.

## 6. Edge Cases and Accessibility

| Case | What the solution does |
| :--- | :--- |
| Junk or out-of-range input | Clamped to 0-99 minutes and 0-59 seconds. |
| Zero total | Start is disabled. |
| Busy thread or background tab | The next wake-up computes from the deadline. Chrome throttles hidden-page timers to roughly once a second, and chained timers to once a minute after 5 minutes hidden ([Chrome timer throttling](https://developer.chrome.com/blog/timer-throttling-in-chrome-88)), so the alert can be late in a hidden tab but the time is never wrong. |
| System clock change mid-run | <code>Date.now()</code> follows it, so the countdown jumps too. The trade-off for reload support; <code>performance.now()</code> would avoid it but restarts on every page load. |
| Completion | Announced once by <code>role="alert"</code>; digits use silent <code>role="timer"</code>. |
| Keyboard | Native inputs and buttons; Tab, typing, Enter and Space all work. |

## 7. Common Pitfalls

- **Decrementing a counter** with <code>setSeconds(s =&gt; s - 1)</code> every second: finishes late after every long task or background stint.
- **Flooring the display**: shows 00:00 for the last second while still running.
- **Firing completion from several places** (in the tick and in a separate effect watching <code>leftMs</code>): two alerts, or a sound playing twice.
- **Polling every 100 ms** "to be safe": ten renders a second for a display that changes once a second, and still up to 100 ms late at the end.
- **Letting the user edit inputs mid-run**: now <code>totalMs</code>, <code>endAt</code> and the display disagree. Lock them.
- **A stale <code>endAt</code> in the timer**: keep <code>endAt</code> in the dependency list so a new run gets a new loop. More on this in [stale closures](/interview-question/what-causes-stale-closures-in-react-hooks-and-how-do-you-fix-them-correctly).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"A status machine (idle, running, paused, done) plus a deadline <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endAt = Date.now() + remaining</code>. Time left is always <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endAt - now</code>; nothing is decremented."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Display:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.ceil</code> to whole seconds, so 00:00 appears only at the real end, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mm:ss</code> from a pure formatter."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Timer:</strong> <span style="color:#f0e2c8;">"One effect while running: compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code>, set done if it is zero, otherwise sleep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left % 1000 || 1000</code> so I wake exactly when the digits change."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Actions:</strong> <span style="color:#f0e2c8;">"Pause banks the milliseconds left; Resume makes a new deadline; Reset is just status idle because everything else is derived."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Inputs and a11y:</strong> <span style="color:#f0e2c8;">"Clamp inputs, lock them while running, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=timer</code> for the silent digits and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=alert</code> for a single Time is up message."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it survive a reload?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Save <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endAt</code> (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pausedLeft</code>) to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code> on change and read them in the initial state. Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endAt</code> is a wall-clock <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date.now()</code> value, a timer that ended while the page was closed shows done immediately on reload.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you play a sound at the end?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Create the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Audio</code> (or an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AudioContext</code>) inside the Start click so the browser counts it as user-initiated, then play it in the same branch that sets done, so it fires once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The tab was hidden for ten minutes. What happens?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Timers may have been throttled to once a minute, so the alert can appear late, but the first wake-up after returning computes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endAt - now</code>, sees zero or less, and finishes. Listening to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">visibilitychange</code> and calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick()</code> on return makes it immediate.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setTimeout</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setInterval</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each sleep has a different length (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left % 1000</code>) so the wake-ups line up with the digit changes and the deadline. An interval has one fixed period and would need polling faster than once a second to finish on time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formatRemaining</code> (2300 gives 00:03, 0 gives 00:00) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clamp</code>. For the component, fake timers with a controllable clock: set 2 s, Start, advance 1999 ms and expect no alert, advance 1 ms and expect exactly one.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Finite state machine** | Exactly one named state at a time, with defined transitions |
| **Deadline-based countdown** | Store when it ends; time left is deadline minus now |
| **Rounding up the display** | <code>Math.ceil</code>, so 00:00 means really finished |
| **Wake-up scheduling** | Sleeping until the display will next change |
| **Single-fire completion** | Only one code path can finish the countdown |
| **Banking the remaining time** | Saving the milliseconds left on pause |
| **role="alert"** | Assertive live region read out as soon as it appears |

---

**Conclusion:** A countdown is a deadline plus a state machine. Validate the inputs, store when it ends, derive what is left, round up for display, wake only when the digits change, and finish in exactly one place with an alert screen readers will hear. Compare it with the [Stopwatch](/interview-question/build-a-stopwatch), which counts up from a timestamp, and the [Traffic Light](/interview-question/build-a-traffic-light), which chains several timed states.`,
        files: {
          "/App.js": `import CountdownTimer from "./src/CountdownTimer";

export default function App() {
  return (
    <main className="page">
      <CountdownTimer />
    </main>
  );
}
`,
          "/src/CountdownTimer.js": `import { useEffect, useState } from "react";
import { clamp, formatRemaining } from "./time";

export default function CountdownTimer() {
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(10);
  // idle | running | paused | done
  const [status, setStatus] = useState("idle");
  const [endAt, setEndAt] = useState(0); // Date.now() deadline while running
  const [pausedLeft, setPausedLeft] = useState(0); // ms left, banked on pause
  const [now, setNow] = useState(() => Date.now());

  const totalMs = (minutes * 60 + seconds) * 1000;
  const leftMs =
    status === "running"
      ? Math.max(0, endAt - now)
      : status === "paused"
        ? pausedLeft
        : status === "done"
          ? 0
          : totalMs;

  useEffect(() => {
    if (status !== "running") return;
    let id;
    const tick = () => {
      const left = endAt - Date.now();
      if (left <= 0) {
        setStatus("done"); // the only place "done" is set, so it happens once
        return;
      }
      setNow(Date.now());
      // Wake up exactly when the shown second changes (or at the deadline).
      id = setTimeout(tick, left % 1000 || 1000);
    };
    tick();
    return () => clearTimeout(id);
  }, [status, endAt]);

  const start = () => {
    const t = Date.now();
    setEndAt(t + (status === "paused" ? pausedLeft : totalMs));
    setNow(t);
    setStatus("running");
  };
  const pause = () => {
    setPausedLeft(Math.max(0, endAt - Date.now()));
    setStatus("paused");
  };
  const edit = (setter, max) => (e) => {
    setter(clamp(e.target.value, max));
    setStatus("idle");
  };

  const locked = status === "running" || status === "paused";
  const primary =
    status === "running" ? "Pause" : status === "paused" ? "Resume" : "Start";

  return (
    <section className="card" aria-labelledby="cd-title">
      <h1 id="cd-title" className="title">
        Countdown Timer
      </h1>
      <div className="inputs">
        <label>
          Minutes
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="99"
            value={minutes}
            disabled={locked}
            onChange={edit(setMinutes, 99)}
            data-testid="minutes"
          />
        </label>
        <label>
          Seconds
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="59"
            value={seconds}
            disabled={locked}
            onChange={edit(setSeconds, 59)}
            data-testid="seconds"
          />
        </label>
      </div>
      <div
        className={status === "done" ? "display done" : "display"}
        role="timer"
        aria-label="Time remaining"
        data-testid="display"
      >
        {formatRemaining(leftMs)}
      </div>
      <div className="controls">
        <button
          type="button"
          className="primary"
          disabled={!locked && totalMs === 0}
          onClick={status === "running" ? pause : start}
          data-testid="toggle"
        >
          {primary}
        </button>
        <button
          type="button"
          disabled={status === "idle"}
          onClick={() => setStatus("idle")}
          data-testid="reset"
        >
          Reset
        </button>
      </div>
      {status === "done" && (
        <p className="alert" role="alert" data-testid="alert">
          Time is up!
        </p>
      )}
    </section>
  );
}
`,
          "/src/time.js": `const pad = (n) => String(n).padStart(2, "0");

// Round UP: with 2.3 s left the display says 00:03, and 00:00 appears
// only when the time is really over.
export function formatRemaining(ms) {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  return pad(Math.floor(s / 60)) + ":" + pad(s % 60);
}

// Whole number between 0 and max; empty or junk input becomes 0.
export const clamp = (value, max) =>
  Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));
`,
          "/styles.css": `body {
  margin: 0;
  background: #0b1120;
  color: #e2e8f0;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.card {
  width: 100%;
  max-width: 400px;
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 24px 16px;
  box-sizing: border-box;
  text-align: center;
}
.title {
  margin: 0 0 16px;
  font-size: 1rem;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.inputs {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.inputs label {
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
  color: #cbd5e1;
  text-align: left;
}
.inputs input {
  width: 90px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #0f172a;
  color: #e2e8f0;
  font: inherit;
  font-size: 1.1rem;
}
.inputs input:disabled {
  opacity: 0.5;
}
.display {
  margin: 16px 0;
  font-size: clamp(2.8rem, 15vw, 4rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #fde68a;
}
.display.done {
  color: #f87171;
}
.controls {
  display: flex;
  gap: 8px;
  justify-content: center;
}
.controls button {
  flex: 1;
  max-width: 140px;
  padding: 10px 0;
  border-radius: 10px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #e2e8f0;
  font: inherit;
  cursor: pointer;
}
.controls .primary {
  background: #a16207;
  border-color: #facc15;
}
.controls button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible {
  outline: 3px solid #38bdf8;
  outline-offset: 2px;
}
.alert {
  margin: 16px 0 0;
  padding: 10px;
  border-radius: 10px;
  background: #450a0a;
  color: #fecaca;
  font-weight: 600;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Beginners preparing for a frontend machine coding round in Vue. You know refs and templates at a basic level; deadlines, watchers with cleanup and live regions are explained from zero.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The output under "Verified" was printed by running this exact solution on Vue 3.5.44 (compiled with <code>@vue/compiler-sfc</code>, mounted with <code>createApp(App).mount("#app")</code>) in jsdom.

## 1. A Story First

Counting to 720 to time a 12-minute pizza burns the pizza the first time you lose count. Looking at the clock once, deciding "out at 7:15" and comparing from then on cannot go wrong. The browser version of counting is decrementing <code>secondsLeft</code> on every tick; the clock version is storing a **deadline** and computing "deadline minus now". This build does the second. Its sibling, the [Stopwatch](/interview-question/build-a-stopwatch), counts up from a start time with laps; this one adds validated input, correct rounding and a single announced completion.

## 2. Requirements and Plan

Minutes (0-99) and seconds (0-59) inputs, clamped; Start disabled at zero; inputs locked while running or paused; Start / Pause / Resume and Reset; <code>mm:ss</code> that reaches 00:00 exactly at the end; one "Time is up!" alert; correct under load; no timers left.

| Piece | Vue tool | Meaning |
| :--- | :--- | :--- |
| <code>minutes</code>, <code>seconds</code> | <code>ref</code> | Clamped input values |
| <code>status</code> | <code>ref("idle")</code> | idle, running, paused or done |
| <code>endAt</code>, <code>pausedLeft</code>, <code>now</code> | <code>ref</code> | Deadline, banked ms, last look at the clock |
| <code>totalMs</code>, <code>leftMs</code>, <code>locked</code>, <code>primary</code> | <code>computed</code> | Derived |
| The timeout chain | <code>watch([status, endAt], ...)</code> with <code>onCleanup</code> | Runs only while running |

📌 **Interview term: Finite state machine** — the timer is always in exactly one named state, held in one <code>status</code> ref, instead of several booleans that could contradict each other.

## 3. Build It

### Formatting and clamping

~~~js
const pad = (n) => String(n).padStart(2, "0");

// Round UP: with 2.3 s left the display says 00:03, and 00:00 appears
// only when the time is really over.
export function formatRemaining(ms) {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  return pad(Math.floor(s / 60)) + ":" + pad(s % 60);
}

// Whole number between 0 and max; empty or junk input becomes 0.
export const clamp = (value, max) =>
  Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));
~~~

📌 **Interview term: Rounding up the display** — <code>Math.ceil</code> to whole seconds: 2.3 s left shows 00:03 and 00:00 appears only when time is really over.

### Derived time left

~~~js
// CountdownTimer.vue (excerpt)
const totalMs = computed(
  () => (minutes.value * 60 + seconds.value) * 1000,
);
const leftMs = computed(() => {
  if (status.value === "running")
    return Math.max(0, endAt.value - now.value);
  if (status.value === "paused") return pausedLeft.value;
  return status.value === "done" ? 0 : totalMs.value;
});
~~~

📌 **Interview term: Deadline-based countdown** — store <code>endAt</code> once and compute what is left; nothing is decremented, so skipped ticks cannot make it late.

### The watcher that owns the timer

~~~js
// CountdownTimer.vue (excerpt)
watch([status, endAt], ([s, end], _old, onCleanup) => {
  if (s !== "running") return;
  let id;
  const tick = () => {
    const left = end - Date.now();
    if (left <= 0) {
      // the only place "done" is set, so it happens once
      status.value = "done";
      return;
    }
    now.value = Date.now();
    // wake when the shown second changes
    id = setTimeout(tick, left % 1000 || 1000);
  };
  tick();
  onCleanup(() => clearTimeout(id));
});
~~~

📌 **Interview term: Watcher cleanup** — the third argument of a <code>watch</code> callback, <code>onCleanup</code>, registers a function Vue calls before the callback runs again and when the watcher stops. A watcher created in <code>&lt;script setup&gt;</code> stops automatically when the component unmounts, so this one clears its timeout on Pause, Reset, a new run and unmount. Vue 3.5 also exports <code>onWatcherCleanup()</code> for the same job. See [watch vs watchEffect](/interview-question/what-is-the-difference-between-watch-and-watcheffect).

📌 **Interview term: Wake-up scheduling** — <code>left % 1000 || 1000</code> is the time until the display next changes, so the timer renders once per second and its final wake-up lands on the deadline.

📌 **Interview term: Single-fire completion** — only this branch sets <code>"done"</code>, and that change re-runs the watcher, which cleans up and does not restart.

### Actions and inputs

~~~js
// CountdownTimer.vue (excerpt)
function toggle() {
  if (status.value === "running") {
    pausedLeft.value = Math.max(0, endAt.value - Date.now());
    status.value = "paused";
    return;
  }
  const t = Date.now();
  endAt.value =
    t + (status.value === "paused" ? pausedLeft.value : totalMs.value);
  now.value = t;
  status.value = "running";
}

// Templates unwrap refs, so the template
// passes a field name, not the ref itself.
const fields = { minutes: [minutes, 99], seconds: [seconds, 59] };
function edit(name, event) {
  const [target, max] = fields[name];
  target.value = clamp(event.target.value, max);
  // show the clamped number even if the ref did not change
  event.target.value = String(target.value);
  status.value = "idle";
}
~~~

Two Vue lessons came from real bugs while building this:

- The first version called <code>edit(seconds, 59, $event)</code> from the template. Templates auto-unwrap refs, so the function received the *number* 10 and crashed with "Cannot create property 'value' on number '10'". Passing a key and looking the ref up in the script fixes it.
- Typing 75 when the value is already 59 sets the ref to 59 again, which is not a change, so Vue does not patch the input and "75" would stay visible. Writing <code>event.target.value</code> back keeps the box honest. (Checked: with that line removed, typing 75 twice left "75" in the box.)

📌 **Interview term: Banking the remaining time** — Pause saves the milliseconds left; Resume builds a new deadline from them; the paused period never counts.

The template uses <code>:value</code> plus <code>@input</code> on the number inputs (with <code>:disabled="locked"</code>), <code>role="timer"</code> on the silent digits, and <code>&lt;p v-if="status === 'done'" role="alert"&gt;</code> for the announcement.

📌 **Interview term: role="alert"** — an assertive live region; a screen reader reads it as soon as it appears.

## 4. Verified

The driver typed into the inputs, ran a 2 s countdown, a 3 s countdown paused for 1 s after 1.2 s, and a 3 s countdown with a 1.5 s busy loop blocking the thread. A preloaded wrapper counted the solution's timeouts. Display changes are shown as <code>value@seconds-since-start</code>:

~~~text
RENDERED: Countdown Timer Minutes Seconds 00:10StartReset
initial   : 00:10 | start Start | reset disabled: true
type 75 s : input shows 59 | display 00:59
0 m 0 s   : start disabled: true
run 2 s   : inputs disabled: true | 00:02@0.0s -> 00:01@1.0s -> 00:00@2.0s | alert: Time is up! @2.0s
after done: 00:00 | alerts in DOM: 1 | button Start | created 2 timeout(s) + 0 interval(s), cleared 0, pending now 0
paused    : 00:02 -> 1 s later 00:02 | button Resume
resumed   : 00:02@2.3s -> 00:01@3.0s -> 00:00@4.0s | alert: Time is up! @4.0s (3 s of running + 1 s paused)
long task : 00:03@2.0s -> 00:01@2.0s -> 00:00@3.0s | alert: Time is up! @3.0s
reset     : 00:03 | alerts: 0 | inputs disabled: false | created 8 timeout(s) + 0 interval(s), cleared 1, pending now 0
timers after unmount: 8 timeout(s) + 0 interval(s) created, 1 cleared, 0 still pending
~~~

- 75 seconds clamped to 59, both in the ref and in the box; 0:00 disabled Start.
- The 2 s run changed exactly at 1.0 s and 2.0 s and announced at 2.0 s.
- Paused at 00:02 for a full second; the paused run ended at 4.0 s (3 s running + 1 s paused).
- After the long task the display jumped from 00:03 to 00:01 and still ended at 3.0 s.
- One alert, removed by Reset; 0 timers pending after unmount. Timeout counts can differ by one between runs (an occasional 1 ms early wake-up re-aims itself).

## 5. Edge Cases and Accessibility

| Case | Behaviour |
| :--- | :--- |
| Junk or out-of-range input | Clamped, and the box shows the clamped value |
| Zero total | Start disabled |
| Busy thread or hidden tab | Next wake-up computes from the deadline; the alert may be late in a throttled hidden tab, the time never wrong |
| Unmount mid-run | The watcher stops and its cleanup clears the timeout |
| Screen readers | Silent <code>role="timer"</code> digits, one <code>role="alert"</code> at the end, labelled inputs |

## 6. Common Pitfalls

- **Decrementing a ref each second**: late after every long task.
- **Passing a ref as a template argument**: it arrives unwrapped; pass a key or a setter function.
- **Two completion paths** (a tick and a <code>watch(leftMs)</code>): double alerts.
- **<code>v-model.number</code> without clamping**: allows 75 seconds and negative values.
- **<code>setInterval(fn, 100)</code> polling**: ten renders a second and still late at the end.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code> ref for the state machine plus a deadline <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endAt</code>; time left is a computed, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endAt - now</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Display:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.ceil</code> to seconds, so 00:00 only at the real end."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Watcher:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch([status, endAt])</code> runs a timeout chain while running; each wake-up sleeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left % 1000 || 1000</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> clears it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Actions:</strong> <span style="color:#f0e2c8;">"Pause banks the ms left; Resume creates a new deadline; Reset sets idle and everything else is derived."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Inputs and a11y:</strong> <span style="color:#f0e2c8;">"Clamp on input and write the value back, lock while running, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=timer</code> digits and a single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=alert</code> at the end."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watchEffect</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The callback writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">now</code> and reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date.now()</code>; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watchEffect</code> every reactive read in the first synchronous run becomes a dependency, which is easy to get wrong. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> with explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[status, endAt]</code> says exactly what restarts the loop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you extract a composable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useCountdown(totalMs)</code> returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMs</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pause</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reset</code>, with the watcher inside. Watchers created inside a composable called from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup</code> are stopped with the component.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would it survive a reload?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Persist <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endAt</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pausedLeft</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code> and restore them in the initial refs; a deadline that already passed shows done immediately.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vitest fake timers with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vi.setSystemTime</code>; set 2 s, click Start, advance 1999 ms and expect no alert, advance 1 ms, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await nextTick()</code>, and expect exactly one.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Finite state machine** | Exactly one named state at a time |
| **Rounding up the display** | <code>Math.ceil</code> so 00:00 means finished |
| **Deadline-based countdown** | Time left is deadline minus now |
| **Watcher cleanup** | <code>onCleanup</code> in a watch callback, run before re-runs and on stop |
| **Wake-up scheduling** | Sleeping until the display next changes |
| **Single-fire completion** | Only one code path finishes the countdown |
| **Banking the remaining time** | Saving the ms left on pause |
| **role="alert"** | Assertive live region read immediately |

---

**Conclusion:** In Vue the countdown is a status ref, a deadline, computeds for everything shown and one watcher whose cleanup owns the single timeout. Clamp inputs carefully (and remember templates unwrap refs), round up, and finish in one place. The [Traffic Light](/interview-question/build-a-traffic-light) extends the same pattern to a cycle of timed states.`,
        files: {
          "/src/App.vue": `<script setup>
import CountdownTimer from "./components/CountdownTimer.vue";
</script>

<template>
  <main class="page">
    <CountdownTimer />
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0b1120;
  color: #e2e8f0;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
</style>
`,
          "/src/components/CountdownTimer.vue": `<script setup>
import { computed, ref, watch } from "vue";
import { clamp, formatRemaining } from "../time";

const minutes = ref(0);
const seconds = ref(10);
const status = ref("idle"); // idle | running | paused | done
const endAt = ref(0); // Date.now() deadline while running
const pausedLeft = ref(0); // ms left, banked on pause
const now = ref(Date.now());

const totalMs = computed(() => (minutes.value * 60 + seconds.value) * 1000);
const leftMs = computed(() => {
  if (status.value === "running") return Math.max(0, endAt.value - now.value);
  if (status.value === "paused") return pausedLeft.value;
  return status.value === "done" ? 0 : totalMs.value;
});
const locked = computed(
  () => status.value === "running" || status.value === "paused",
);
const primary = computed(() =>
  status.value === "running"
    ? "Pause"
    : status.value === "paused"
      ? "Resume"
      : "Start",
);

// One timeout chain per run. onCleanup stops it when status or endAt change,
// and Vue also stops this watcher when the component unmounts.
watch([status, endAt], ([s, end], _old, onCleanup) => {
  if (s !== "running") return;
  let id;
  const tick = () => {
    const left = end - Date.now();
    if (left <= 0) {
      status.value = "done"; // the only place "done" is set, so it happens once
      return;
    }
    now.value = Date.now();
    // wake when the shown second changes
    id = setTimeout(tick, left % 1000 || 1000);
  };
  tick();
  onCleanup(() => clearTimeout(id));
});

function toggle() {
  if (status.value === "running") {
    pausedLeft.value = Math.max(0, endAt.value - Date.now());
    status.value = "paused";
    return;
  }
  const t = Date.now();
  endAt.value =
    t + (status.value === "paused" ? pausedLeft.value : totalMs.value);
  now.value = t;
  status.value = "running";
}

// Templates unwrap refs, so the template
// passes a field name, not the ref itself.
const fields = { minutes: [minutes, 99], seconds: [seconds, 59] };
function edit(name, event) {
  const [target, max] = fields[name];
  target.value = clamp(event.target.value, max);
  // show the clamped number even if the ref did not change
  event.target.value = String(target.value);
  status.value = "idle";
}
</script>

<template>
  <section class="card" aria-labelledby="cd-title">
    <h1 id="cd-title" class="title">Countdown Timer</h1>
    <div class="inputs">
      <label>
        Minutes
        <input
          type="number"
          inputmode="numeric"
          min="0"
          max="99"
          :value="minutes"
          :disabled="locked"
          data-testid="minutes"
          @input="edit('minutes', $event)"
        />
      </label>
      <label>
        Seconds
        <input
          type="number"
          inputmode="numeric"
          min="0"
          max="59"
          :value="seconds"
          :disabled="locked"
          data-testid="seconds"
          @input="edit('seconds', $event)"
        />
      </label>
    </div>
    <div
      :class="['display', { done: status === 'done' }]"
      role="timer"
      aria-label="Time remaining"
      data-testid="display"
    >{{ formatRemaining(leftMs) }}</div>
    <div class="controls">
      <button
        type="button"
        class="primary"
        :disabled="!locked && totalMs === 0"
        data-testid="toggle"
        @click="toggle"
      >{{ primary }}</button>
      <button
        type="button"
        :disabled="status === 'idle'"
        data-testid="reset"
        @click="status = 'idle'"
      >Reset</button>
    </div>
    <p
      v-if="status === 'done'"
      class="alert"
      role="alert"
      data-testid="alert"
    >Time is up!</p>
  </section>
</template>

<style scoped>
.card {
  width: 100%;
  max-width: 400px;
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 24px 16px;
  box-sizing: border-box;
  text-align: center;
}
.title {
  margin: 0 0 16px;
  font-size: 1rem;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.inputs {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.inputs label {
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
  color: #cbd5e1;
  text-align: left;
}
.inputs input {
  width: 90px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #0f172a;
  color: #e2e8f0;
  font: inherit;
  font-size: 1.1rem;
}
.inputs input:disabled {
  opacity: 0.5;
}
.display {
  margin: 16px 0;
  font-size: clamp(2.8rem, 15vw, 4rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #fde68a;
}
.display.done {
  color: #f87171;
}
.controls {
  display: flex;
  gap: 8px;
  justify-content: center;
}
.controls button {
  flex: 1;
  max-width: 140px;
  padding: 10px 0;
  border-radius: 10px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #e2e8f0;
  font: inherit;
  cursor: pointer;
}
.controls .primary {
  background: #a16207;
  border-color: #facc15;
}
.controls button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible {
  outline: 3px solid #38bdf8;
  outline-offset: 2px;
}
.alert {
  margin: 16px 0 0;
  padding: 10px;
  border-radius: 10px;
  background: #450a0a;
  color: #fecaca;
  font-weight: 600;
}
</style>
`,
          "/src/time.js": `const pad = (n) => String(n).padStart(2, "0");

// Round UP: with 2.3 s left the display says 00:03, and 00:00 appears
// only when the time is really over.
export function formatRemaining(ms) {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  return pad(Math.floor(s / 60)) + ":" + pad(s % 60);
}

// Whole number between 0 and max; empty or junk input becomes 0.
export const clamp = (value, max) =>
  Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Beginners preparing for a frontend machine coding round in Angular. You know components and the idea of signals; deadlines, effects with cleanup and live regions are explained from zero.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The output under "Verified" was printed by booting this exact solution on Angular 22.2.3 in jsdom, AOT-compiled with strict templates and JIT-compiled as in the playground.

## 1. A Story First

Counting seconds out loud to time a pizza fails the first time you lose count; noting "out at 7:15" and checking the clock never does. In the browser, decrementing a counter per tick is the counting version, and a **deadline** is the clock version. The sibling [Stopwatch](/interview-question/build-a-stopwatch) counts up with laps; this countdown adds validated input, round-up display and one announced completion.

## 2. Requirements and Plan

Clamped minutes and seconds inputs, Start disabled at zero, inputs locked while running or paused, Start / Pause / Resume and Reset, <code>mm:ss</code> reaching 00:00 exactly at the end, one "Time is up!" alert, nothing left running.

| Piece | Angular tool | Meaning |
| :--- | :--- | :--- |
| <code>minutes</code>, <code>seconds</code> | <code>signal</code> | Clamped inputs |
| <code>status</code> | <code>signal&lt;Status&gt;</code> | idle, running, paused or done |
| <code>endAt</code>, <code>pausedLeft</code>, <code>now</code> | <code>signal</code> | Deadline, banked ms, last look at the clock |
| <code>totalMs</code>, <code>leftMs</code>, <code>locked</code>, <code>primary</code> | <code>computed</code> | Derived |
| Timer | <code>effect((onCleanup) =&gt; ...)</code> | Runs only while running |

📌 **Interview term: Finite state machine** — one <code>status</code> signal typed as a union, <code>"idle" | "running" | "paused" | "done"</code>, so the compiler rejects impossible states and the template can switch on it.

## 3. Build It

### Formatting and clamping

~~~ts
const pad = (n: number) => String(n).padStart(2, "0");

// Round UP: with 2.3 s left the display says 00:03, and 00:00 appears
// only when the time is really over.
export function formatRemaining(ms: number): string {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  return pad(Math.floor(s / 60)) + ":" + pad(s % 60);
}

// Whole number between 0 and max; empty or junk input becomes 0.
export const clamp = (value: string | number, max: number): number =>
  Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));
~~~

📌 **Interview term: Rounding up the display** — <code>Math.ceil</code> to seconds, so 00:00 appears only when time is truly over.

### The component class

~~~ts
// countdown-timer.component.ts (class excerpt)
readonly totalMs = computed(
  () => (this.minutes() * 60 + this.seconds()) * 1000,
);
readonly leftMs = computed(() => {
  const s = this.status();
  if (s === "running") return Math.max(0, this.endAt() - this.now());
  if (s === "paused") return this.pausedLeft();
  return s === "done" ? 0 : this.totalMs();
});

constructor() {
  effect((onCleanup) => {
    if (this.status() !== "running") return;
    const end = this.endAt();
    let id: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      const left = end - Date.now();
      if (left <= 0) {
        // the only place "done" is set, so it happens once
        this.status.set("done");
        return;
      }
      this.now.set(Date.now());
      // wake when the shown second changes
      id = setTimeout(tick, left % 1000 || 1000);
    };
    tick();
    onCleanup(() => clearTimeout(id));
  });
}
~~~

📌 **Interview term: Deadline-based countdown** — <code>endAt</code> is set once per run; time left is derived as <code>endAt - now</code>, so missed ticks cannot make it late.

📌 **Interview term: effect with onCleanup** — the effect re-runs when <code>status()</code> or <code>endAt()</code> change; Angular calls the registered cleanup before each re-run and when the component is destroyed, so Pause, Reset, a new run and destroy all clear the pending timeout. This is the legitimate kind of effect: syncing an external resource to signals, as discussed in [when not to use effect](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it).

📌 **Interview term: Wake-up scheduling** — sleeping <code>left % 1000 || 1000</code> means one render per second and a last wake-up exactly at the deadline.

📌 **Interview term: Single-fire completion** — only this branch sets <code>"done"</code>; that write re-runs the effect, which cleans up and returns early.

The effect reads only <code>status()</code> and <code>endAt()</code>. The first <code>tick()</code> runs inside it and writes <code>now</code>, which is fine because the effect never reads <code>now</code>; Angular 22 allows writing signals inside effects and the run produced no errors.

### Actions and inputs

~~~ts
// countdown-timer.component.ts (excerpt)
toggle(): void {
  if (this.status() === "running") {
    this.pausedLeft.set(Math.max(0, this.endAt() - Date.now()));
    this.status.set("paused");
    return;
  }
  const t = Date.now();
  this.endAt.set(
    t +
      (this.status() === "paused" ? this.pausedLeft() : this.totalMs()),
  );
  this.now.set(t);
  this.status.set("running");
}

edit(which: "m" | "s", event: Event): void {
  const input = event.target as HTMLInputElement;
  const value = clamp(input.value, which === "m" ? 99 : 59);
  (which === "m" ? this.minutes : this.seconds).set(value);
  // show the clamped number even if the signal did not change
  input.value = String(value);
  this.status.set("idle");
}
~~~

📌 **Interview term: Banking the remaining time** — Pause stores the milliseconds left; Resume makes a new deadline from them.

Why write <code>input.value</code> back? If the signal is already 59 and the user types 75, <code>set(59)</code> is not a change, so <code>[value]="seconds()"</code> is not re-applied and "75" would stay on screen. (Checked: with the write-back removed, typing 75 twice left "75" in the box in both AOT and JIT builds.) The inputs are bound with <code>[value]</code> and <code>(input)</code>, so no <code>FormsModule</code> is needed.

The template uses <code>[disabled]="locked()"</code> on inputs, <code>[class.done]</code> on the digits, <code>role="timer"</code> for the silent display and <code>@if (status() === "done") { &lt;p role="alert"&gt;Time is up!&lt;/p&gt; }</code>.

📌 **Interview term: role="alert"** — an assertive live region; screen readers read it as soon as it is inserted.

## 4. Verified

The driver typed into the inputs, ran a 2 s countdown, a 3 s countdown paused for 1 s after 1.2 s, and a 3 s countdown with a 1.5 s busy loop. A preloaded wrapper counted the component's timeouts. Display changes are written <code>value@seconds-since-start</code>.

AOT with strict templates:

~~~text
RENDERED: Countdown Timer Minutes Seconds 00:10StartReset
initial   : 00:10 | start Start | reset disabled: true
type 75 s : input shows 59 | display 00:59
0 m 0 s   : start disabled: true
run 2 s   : inputs disabled: true | 00:02@0.0s -> 00:01@1.0s -> 00:00@2.0s | alert: Time is up! @2.0s
after done: 00:00 | alerts in DOM: 1 | button Start | created 2 timeout(s) + 0 interval(s), cleared 0, pending now 0
paused    : 00:02 -> 1 s later 00:02 | button Resume
resumed   : 00:02@2.3s -> 00:01@3.0s -> 00:00@4.0s | alert: Time is up! @4.0s (3 s of running + 1 s paused)
long task : 00:03@2.0s -> 00:01@2.0s -> 00:00@3.0s | alert: Time is up! @3.0s
reset     : 00:03 | alerts: 0 | inputs disabled: false | created 8 timeout(s) + 0 interval(s), cleared 1, pending now 0
timers after unmount: 8 timeout(s) + 0 interval(s) created, 1 cleared, 0 still pending
~~~

JIT, as in the playground:

~~~text
RENDERED: Countdown Timer Minutes Seconds 00:10StartReset
initial   : 00:10 | start Start | reset disabled: true
type 75 s : input shows 59 | display 00:59
0 m 0 s   : start disabled: true
run 2 s   : inputs disabled: true | 00:02@0.0s -> 00:01@1.0s -> 00:00@2.0s | alert: Time is up! @2.0s
after done: 00:00 | alerts in DOM: 1 | button Start | created 2 timeout(s) + 0 interval(s), cleared 0, pending now 0
paused    : 00:02 -> 1 s later 00:02 | button Resume
resumed   : 00:02@2.3s -> 00:01@3.0s -> 00:00@4.0s | alert: Time is up! @4.0s (3 s of running + 1 s paused)
long task : 00:03@2.0s -> 00:01@2.0s -> 00:00@3.0s | alert: Time is up! @3.0s
reset     : 00:03 | alerts: 0 | inputs disabled: false | created 8 timeout(s) + 0 interval(s), cleared 1, pending now 0
timers after unmount: 8 timeout(s) + 0 interval(s) created, 1 cleared, 0 still pending
~~~

- 75 clamped to 59 in the signal and the box; 0:00 disabled Start.
- The 2 s run ticked at 1.0 s and 2.0 s and announced at 2.0 s.
- Paused at 00:02 for a second; that run ended at 4.0 s.
- After the long task the display jumped 00:03 to 00:01 and still finished at 3.0 s.
- One alert; Reset cleared it; 0 timers pending after destroy. Timeout counts can differ by one between runs because of a rare 1 ms early wake-up.

## 5. Edge Cases and Accessibility

| Case | Behaviour |
| :--- | :--- |
| Junk or out-of-range input | Clamped; the box shows the clamped value |
| Zero total | Start disabled |
| Busy thread, hidden tab | Next wake-up computes from the deadline; time never wrong |
| Destroy mid-run | Effect cleanup clears the timeout |
| Zoneless rendering | Every visible change goes through a signal |
| Screen readers | Silent timer digits, one <code>role="alert"</code>, labelled inputs |

## 6. Common Pitfalls

- **Decrementing a signal per tick**: late after every long task.
- **Reading <code>now()</code> inside the effect**: the effect would restart on every tick.
- **Completion in two places**: double alerts.
- **Relying on <code>[value]</code> alone for clamping**: setting the same value is not a change, so the typed text remains.
- **Polling at 100 ms**: wasted renders and still late at zero.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"A typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code> signal for the state machine and a deadline <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endAt</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMs</code> is a computed, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endAt - now</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Display:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.ceil</code> to seconds, so 00:00 appears only at the real end."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Effect:</strong> <span style="color:#f0e2c8;">"An effect reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endAt()</code>, runs a timeout chain that sleeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left % 1000 || 1000</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> clears it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Actions:</strong> <span style="color:#f0e2c8;">"Pause banks the ms left; Resume makes a new deadline; Reset sets idle."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Inputs and a11y:</strong> <span style="color:#f0e2c8;">"Clamp in the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(input)</code> handler and write the value back; lock while running; silent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=timer</code> and a single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=alert</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would RxJS <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">timer</code> be a better fit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timer(delay)</code> chained with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code> changes works and cancels automatically, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal</code> exposes the result. The effect version keeps everything in signals without extra operators.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would it survive a reload?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Persist <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endAt</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pausedLeft</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code> in an effect and restore them as initial signal values; a passed deadline shows done right away.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about a sound at the end?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Create the audio in the Start click handler (a user gesture) and play it in the same branch that sets done, so it can only play once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formatRemaining</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clamp</code>. For the component, TestBed with fake timers and a mocked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date.now</code>: Start 2 s, advance 1999 ms, expect no alert, advance 1 ms, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code>, expect one.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Finite state machine** | Exactly one named state at a time |
| **Rounding up the display** | <code>Math.ceil</code> so 00:00 means finished |
| **Deadline-based countdown** | Time left is deadline minus now |
| **effect with onCleanup** | A signal-driven side effect with teardown |
| **Wake-up scheduling** | Sleeping until the display next changes |
| **Single-fire completion** | Only one code path finishes the countdown |
| **Banking the remaining time** | Saving the ms left on pause |
| **role="alert"** | Assertive live region read immediately |

---

**Conclusion:** The Angular countdown is a typed status signal, a deadline, computeds for the display and one effect whose cleanup owns the single timeout. Clamp inputs, round up, and finish in one place. The [Traffic Light](/interview-question/build-a-traffic-light) chains the same timed-state idea into a loop.`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation } from "@angular/core";
import { CountdownTimerComponent } from "./countdown-timer.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CountdownTimerComponent],
  template: \`<main class="page"><app-countdown-timer /></main>\`,
  // these two rules are global on purpose
  encapsulation: ViewEncapsulation.None,
  styles: [
    \`
      body {
        margin: 0;
        background: #0b1120;
        color: #e2e8f0;
        font-family: system-ui, sans-serif;
      }
      .page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 16px;
        box-sizing: border-box;
      }
    \`,
  ],
})
export class AppComponent {}
`,
          "/src/app/countdown-timer.component.ts": `import { Component, computed, effect, signal } from "@angular/core";
import { clamp, formatRemaining } from "./time";

type Status = "idle" | "running" | "paused" | "done";

@Component({
  selector: "app-countdown-timer",
  standalone: true,
  template: \`
    <section class="card" aria-labelledby="cd-title">
      <h1 id="cd-title" class="title">Countdown Timer</h1>
      <div class="inputs">
        <label>
          Minutes
          <input
            type="number"
            inputmode="numeric"
            min="0"
            max="99"
            [value]="minutes()"
            [disabled]="locked()"
            data-testid="minutes"
            (input)="edit('m', $event)"
          />
        </label>
        <label>
          Seconds
          <input
            type="number"
            inputmode="numeric"
            min="0"
            max="59"
            [value]="seconds()"
            [disabled]="locked()"
            data-testid="seconds"
            (input)="edit('s', $event)"
          />
        </label>
      </div>
      <div
        class="display"
        [class.done]="status() === 'done'"
        role="timer"
        aria-label="Time remaining"
        data-testid="display"
      >{{ fmt(leftMs()) }}</div>
      <div class="controls">
        <button
          type="button"
          class="primary"
          [disabled]="!locked() && totalMs() === 0"
          data-testid="toggle"
          (click)="toggle()"
        >{{ primary() }}</button>
        <button
          type="button"
          [disabled]="status() === 'idle'"
          data-testid="reset"
          (click)="status.set('idle')"
        >Reset</button>
      </div>
      @if (status() === "done") {
        <p class="alert" role="alert" data-testid="alert">Time is up!</p>
      }
    </section>
  \`,
  styles: [
    \`
    .card { width: 100%; max-width: 400px; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 24px 16px; box-sizing: border-box; text-align: center; }
    .title { margin: 0 0 16px; font-size: 1rem; font-weight: 600; color: #94a3b8; letter-spacing: 0.08em; text-transform: uppercase; }
    .inputs { display: flex; gap: 12px; justify-content: center; }
    .inputs label { display: grid; gap: 4px; font-size: 0.85rem; color: #cbd5e1; text-align: left; }
    .inputs input { width: 90px; padding: 8px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #e2e8f0; font: inherit; font-size: 1.1rem; }
    .inputs input:disabled { opacity: 0.5; }
    .display { margin: 16px 0; font-size: clamp(2.8rem, 15vw, 4rem); font-weight: 700; font-variant-numeric: tabular-nums; color: #fde68a; }
    .display.done { color: #f87171; }
    .controls { display: flex; gap: 8px; justify-content: center; }
    .controls button { flex: 1; max-width: 140px; padding: 10px 0; border-radius: 10px; border: 1px solid #334155; background: #1e293b; color: #e2e8f0; font: inherit; cursor: pointer; }
    .controls .primary { background: #a16207; border-color: #facc15; }
    .controls button:disabled { opacity: 0.45; cursor: not-allowed; }
    button:focus-visible, input:focus-visible { outline: 3px solid #38bdf8; outline-offset: 2px; }
    .alert { margin: 16px 0 0; padding: 10px; border-radius: 10px; background: #450a0a; color: #fecaca; font-weight: 600; }
  \`,
  ],
})
export class CountdownTimerComponent {
  readonly minutes = signal(0);
  readonly seconds = signal(10);
  readonly status = signal<Status>("idle");
  readonly endAt = signal(0); // Date.now() deadline while running
  readonly pausedLeft = signal(0); // ms left, banked on pause
  readonly now = signal(Date.now());

  readonly totalMs = computed(
    () => (this.minutes() * 60 + this.seconds()) * 1000,
  );
  readonly leftMs = computed(() => {
    const s = this.status();
    if (s === "running") return Math.max(0, this.endAt() - this.now());
    if (s === "paused") return this.pausedLeft();
    return s === "done" ? 0 : this.totalMs();
  });
  readonly locked = computed(
    () => this.status() === "running" || this.status() === "paused",
  );
  readonly primary = computed(() =>
    this.status() === "running"
      ? "Pause"
      : this.status() === "paused"
        ? "Resume"
        : "Start",
  );
  readonly fmt = formatRemaining;

  constructor() {
    // Re-runs when status or endAt change; onCleanup stops the previous chain
    // and also runs when the component is destroyed.
    effect((onCleanup) => {
      if (this.status() !== "running") return;
      const end = this.endAt();
      let id: ReturnType<typeof setTimeout> | undefined;
      const tick = () => {
        const left = end - Date.now();
        if (left <= 0) {
          // the only place "done" is set, so it happens once
          this.status.set("done");
          return;
        }
        this.now.set(Date.now());
        // wake when the shown second changes
        id = setTimeout(tick, left % 1000 || 1000);
      };
      tick();
      onCleanup(() => clearTimeout(id));
    });
  }

  toggle(): void {
    if (this.status() === "running") {
      this.pausedLeft.set(Math.max(0, this.endAt() - Date.now()));
      this.status.set("paused");
      return;
    }
    const t = Date.now();
    this.endAt.set(
      t + (this.status() === "paused" ? this.pausedLeft() : this.totalMs()),
    );
    this.now.set(t);
    this.status.set("running");
  }

  edit(which: "m" | "s", event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = clamp(input.value, which === "m" ? 99 : 59);
    (which === "m" ? this.minutes : this.seconds).set(value);
    // show the clamped number even if the signal did not change
    input.value = String(value);
    this.status.set("idle");
  }
}
`,
          "/src/app/time.ts": `const pad = (n: number) => String(n).padStart(2, "0");

// Round UP: with 2.3 s left the display says 00:03, and 00:00 appears
// only when the time is really over.
export function formatRemaining(ms: number): string {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  return pad(Math.floor(s / 60)) + ":" + pad(s % 60);
}

// Whole number between 0 and max; empty or junk input becomes 0.
export const clamp = (value: string | number, max: number): number =>
  Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Traffic Light",
    seoDescription:
      "Build a traffic light in React, Vue and Angular as a finite state machine with per-state durations, pause that keeps the remaining time, and manual Next.",
    description: `**Question presented to candidate:**
"Build a traffic light. It cycles red, green, yellow and back to red on its own, and each colour has its own duration. Add a Pause button that freezes it where it is, so Resume continues with the time that was left, and a Next button that skips to the next colour straight away."

**Requirements:**
- Three lamps, exactly one lit; red 3 s, then green 2.5 s, then yellow 1 s, then red again, forever.
- Durations and the order live in one configuration object.
- Pause freezes the current colour and remembers the time left; Resume continues from there.
- Next moves to the next colour immediately and gives it its full duration (works while paused too).
- A text status for screen readers ("Red: stop"); nothing left running after unmount.

**What a strong answer should cover:**
- Modelling the light as a **finite state machine**: a config map \`{ red: { ms, next }, ... }\` so adding a state is a data change, not new \`if\` branches.
- One \`setTimeout\` per state (not a \`setInterval\`), re-armed when the state changes and cleared before every re-arm.
- Pause that **banks the remaining time** (from a recorded \`endsAt\`) instead of restarting the colour.
- Why the timer must be cleaned up on every transition (otherwise Next plus the old timer skip a colour).
- Separating what is state (light, remaining, running) from what is not (the \`endsAt\` timestamp, which is never rendered).
- Accessibility: lamps are decorative, the status text is a \`role="status"\` live region.

**Clarifying questions expected:**
- "Should Next while paused stay paused?"
- "Do we need a pedestrian button or a flashing-yellow night mode?"
- "Should the durations be configurable by the user or only in code?"

**Code / implementation expected:** Yes. A working component driven by a state-machine config, with pause/resume that keeps the remaining time, Next and cleanup.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Beginners preparing for a frontend machine coding round. You know a little JavaScript and React; state machines, timeouts, refs and effect cleanup are explained from zero.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary interviewers expect. Every output under "Verified" was printed by running this exact solution on React 19.3.1 inside <code>&lt;StrictMode&gt;</code> in jsdom.

## 1. Why This Even Matters — A Story First

A real traffic light is not clever. Inside the box there is a tiny rule book: "red lasts 3 seconds, then green; green lasts 2.5 seconds, then yellow; yellow lasts 1 second, then red." The controller only ever knows which page of the rule book it is on and how long until it turns the page.

That rule book is a **state machine**, and it is the whole point of this question. A weak answer writes a tangle of <code>if (light === "red") ... else if ...</code> inside a timer. A strong answer writes the rule book as data and a tiny engine that reads it. The engine then gets two features that real controllers have: a pause (a police officer takes over the junction) that resumes with the time that was left, and a manual "next" button.

The timing ideas here build on the [Countdown Timer](/interview-question/build-a-countdown-timer): each colour is a small countdown, and pausing banks what is left.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What order and durations? | Goes straight into the config. We use red 3 s, green 2.5 s, yellow 1 s (short, so it is easy to watch). |
| On Resume, restart the colour or continue? | Continuing means remembering when the colour would have ended, which is the interesting part. |
| Does Next while paused stay paused? | We say yes: Next changes the colour and gives it its full time, and the pause state is untouched. |
| Show a countdown of the seconds left? | That would need a repaint timer; we keep one timer per colour and no countdown. |
| Pedestrian button, night mode with flashing yellow? | Both are new states in the machine; good follow-ups, not in scope. |
| Several lights in sync (a junction)? | Then one controller should drive several views; mention it, do not build it. |

## 3. Requirements and Plan

**Component tree.** <code>App</code> renders <code>TrafficLight</code>, which imports the machine from <code>lights.js</code>.

**State model.**

| Piece | Kind | Why |
| :--- | :--- | :--- |
| <code>light</code> | State | Which lamp is lit and which page of the rule book we are on. |
| <code>remaining</code> | State | Milliseconds the current colour still has to run. Full duration on entry, banked value after a pause. |
| <code>running</code> | State | Paused or not. |
| <code>endsAt</code> | <code>useRef</code> | When the current colour ends while running. Needed to compute the remaining time at the moment of a pause, but never drawn. |
| Status label, lamp classes | Derived | From <code>light</code> and <code>running</code>. |

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Traffic light state machine: red for 3000 ms goes to green, green for 2500 ms goes to yellow, yellow for 1000 ms goes back to red">
  <defs>
    <marker id="tl-r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="170" height="70" rx="12"/>
  <text class="d-text d-accent" x="105" y="70" text-anchor="middle">red</text>
  <text class="d-sub" x="105" y="92" text-anchor="middle">3000 ms</text>
  <rect class="d-box" x="255" y="40" width="170" height="70" rx="12"/>
  <text class="d-text" x="340" y="70" text-anchor="middle">green</text>
  <text class="d-sub" x="340" y="92" text-anchor="middle">2500 ms</text>
  <rect class="d-box" x="490" y="40" width="170" height="70" rx="12"/>
  <text class="d-text" x="575" y="70" text-anchor="middle">yellow</text>
  <text class="d-sub" x="575" y="92" text-anchor="middle">1000 ms</text>
  <path class="d-edge" d="M 190 75 L 249 75" marker-end="url(#tl-r-arrow)"/>
  <path class="d-edge" d="M 425 75 L 484 75" marker-end="url(#tl-r-arrow)"/>
  <path class="d-edge-accent" d="M 575 110 L 575 180 L 105 180 L 105 116" marker-end="url(#tl-r-arrow)"/>
  <text class="d-sub" x="340" y="204" text-anchor="middle">timeout or Next</text>
</svg>

Each arrow is taken either when the colour's timeout fires or when the user presses Next. Pause does not change the state at all; it only stops the clock for the current one.

## 4. Build It Step by Step

### Step 1: the machine as data

~~~js
// The whole traffic light as data: a finite state machine.
// Each state knows how long it lasts and which state comes next.
export const LIGHTS = {
  red: { ms: 3000, next: "green", label: "Red: stop" },
  green: { ms: 2500, next: "yellow", label: "Green: go" },
  yellow: { ms: 1000, next: "red", label: "Yellow: prepare to stop" },
};
// top to bottom on the housing
export const ORDER = ["red", "yellow", "green"];
~~~

📌 **Interview term: Finite state machine (FSM)** — a model with a fixed set of states, exactly one active at a time, and defined transitions between them. Here each state carries its own duration and the name of the next state, so the engine never needs to know which colour is which.

📌 **Interview term: Transition table** — the object that maps each state to its successor (and here, its data). Adding a "flashing yellow" mode is a matter of adding entries, not editing logic.

<code>ORDER</code> is separate on purpose: it is the *visual* order of the lamps on the housing (red on top), which is not the order of the cycle.

### Step 2: state and the one timer

~~~jsx
// TrafficLight.js (excerpt)
const [light, setLight] = useState("red");
const [running, setRunning] = useState(true);
// ms left in this light
const [remaining, setRemaining] = useState(LIGHTS.red.ms);
const endsAt = useRef(0); // when the current light ends, while running

// One timeout per light. It is re-armed
// whenever the light, the remaining
// time or the running flag change, and cleared before every re-arm.
useEffect(() => {
  if (!running) return;
  endsAt.current = performance.now() + remaining;
  const id = setTimeout(() => {
    const next = LIGHTS[light].next;
    setLight(next);
    setRemaining(LIGHTS[next].ms);
  }, remaining);
  return () => clearTimeout(id);
}, [light, remaining, running]);
~~~

📌 **Interview term: One timer per state** — instead of a <code>setInterval</code> ticking every second and checking "is it time yet?", each state arms exactly one <code>setTimeout</code> for its own duration. There is nothing to poll and nothing to drift: the delay is the duration.

Why does the effect depend on all three values?

- <code>light</code> changes on every transition, so a new timeout is armed for the new colour.
- <code>running</code> changes on Pause and Resume: Pause makes the effect return early (after the cleanup cleared the old timeout); Resume arms a fresh one.
- <code>remaining</code> changes when Pause banks the time left, so Resume arms a timeout for exactly that amount.

📌 **Interview term: useRef for non-rendered values** — <code>useRef</code> gives a mutable box that survives re-renders without causing one. <code>endsAt</code> is read only inside the Pause handler, so making it state would cause a pointless render on every transition. See [the useRef hook](/interview-question/describe-the-useref-hook-and-its-typical-use-cases).

The cleanup is the safety rail. A copy of this component with the <code>return () =&gt; clearTimeout(id)</code> line removed was run with the same verifier: Pause was pressed immediately, and 3 s later the light still turned green, with the status reading "Green: go (paused)". Every timeout that was ever armed fires, so Pause and Next cannot cancel anything. The Verified run shows that the solution never has more than one timer pending. StrictMode's mount-cleanup-mount in development arms, clears and re-arms the first red timeout, which is harmless for the same reason. More in [the cleanup function in useEffect](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect).

### Step 3: Pause, Resume and Next

~~~jsx
// TrafficLight.js (excerpt)
const togglePause = () => {
  if (running)
    setRemaining(Math.max(0, endsAt.current - performance.now()));
  setRunning(!running);
};
const next = () => {
  const n = LIGHTS[light].next;
  setLight(n);
  setRemaining(LIGHTS[n].ms);
};
~~~

📌 **Interview term: Banking the remaining time** — on Pause, compute how much of the current colour was left (<code>endsAt - now</code>) and store it. Resume does not need its own code: setting <code>running</code> back to true re-runs the effect, which arms a timeout for <code>remaining</code>.

<code>performance.now()</code> is used for <code>endsAt</code> because it is a monotonic clock: a system clock change during the 2.5 s of green cannot make the remaining time negative or huge.

Next always gives the new colour its full duration and does not touch <code>running</code>, so Next while paused shows the next colour and stays paused.

### Step 4: render

~~~jsx
// TrafficLight.js (excerpt)
<div className="housing" aria-hidden="true">
  {ORDER.map((name) => (
    <span
      key={name}
      className={"lamp " + name + (light === name ? " on" : "")}
      data-testid={"lamp-" + name}
    />
  ))}
</div>
<p className="status" role="status" data-testid="status">
  {LIGHTS[light].label}
  {running ? "" : " (paused)"}
</p>
~~~

📌 **Interview term: role="status"** — a polite live region: when its text changes, screen readers read the new text when they are idle, without interrupting. The coloured circles carry no text, so they are hidden from assistive technology with <code>aria-hidden="true"</code> and the status line says the same thing in words ("Green: go"). Colour alone never carries the meaning.

The CSS dims unlit lamps to 22% opacity and gives the lit one a glow; a <code>prefers-reduced-motion</code> rule removes the fade.

## 5. Verified

Run with <code>scripts/verify-mc-solution.mjs</code> as <code>&lt;StrictMode&gt;&lt;App /&gt;&lt;/StrictMode&gt;</code> in jsdom, with real time passing. A preloaded wrapper counted the timeouts the solution created. The driver pressed Next three times to restart at red with a full 3 s, watched one full cycle, then pressed Next, paused green after 1 s for 1 s and resumed. Transitions are shown as <code>lamp@seconds-since-start</code>:

~~~text
RENDERED: Traffic LightRed: stopPauseNext
initial : red | Red: stop | lamps: 3 | housing aria-hidden: true
after mount: created 2 timeout(s) + 0 interval(s), cleared 1, pending now 1
Next x3 : red | Red: stop
one cycle: green@3.0s -> yellow@5.5s -> red@6.5s
Next    : green | Green: go
paused  : Green: go (paused) | button Resume | pending timers: 0
1 s later: green
resumed : yellow@3.5s (2.5 s of green + 1 s paused)
most timers pending at once while running: 1 | created 11 timeout(s) + 0 interval(s), cleared 6, pending now 1
timers after unmount: 11 timeout(s) + 0 interval(s) created, 7 cleared, 0 still pending
~~~

- **StrictMode**: after mount, 2 timeouts created and 1 cleared: the effect ran, was cleaned up and re-ran, leaving one.
- **Durations**: green at 3.0 s, yellow at 5.5 s, red at 6.5 s, exactly 3 + 2.5 + 1.
- **Pause**: zero timers pending while paused; green held for the whole paused second; yellow arrived at 3.5 s, which is the 2.5 s of green plus the 1 s pause. Resume continued instead of restarting green.
- **One timer**: at no point were two timeouts pending, and 0 were pending after unmount.

## 6. Edge Cases and Accessibility

| Case | What the solution does |
| :--- | :--- |
| Next pressed quickly several times | Each press re-arms; the cleanup cancels the previous timeout, so no stale timer fires later. |
| Next while paused | Changes colour, full duration, stays paused. |
| Pause right at a transition | <code>Math.max(0, ...)</code> keeps <code>remaining</code> non-negative; Resume then advances immediately. |
| Background tab | Timeouts may be throttled, so a colour can last longer in a hidden tab; nothing breaks. Not observable in jsdom. |
| Screen readers | Lamps <code>aria-hidden</code>; <code>role="status"</code> text announces each change politely. |
| Colour blindness | The status text and fixed lamp positions (red on top) carry the meaning, not colour alone. |

## 7. Common Pitfalls

- **Encoding the cycle in <code>if</code>/<code>else</code>** inside the timer. Every new state means editing logic; a transition table makes it data.
- **A <code>setInterval(1000)</code> that counts seconds per colour.** Drifts, polls needlessly, and makes durations like 2.5 s awkward.
- **No cleanup on transition.** The stale timeout still fires: measured above, a paused light turned green anyway. After a Next, the old timer later forces the colour it computed from the old state.
- **Pause that restarts the colour.** Clearing the timer and re-arming the full duration on Resume is the easy bug; bank the remaining time.
- **Making <code>endsAt</code> state.** An extra render per transition for a value nobody sees.
- **Relying on colour alone.** Add a text status and keep the lamp order fixed.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Machine:</strong> <span style="color:#f0e2c8;">"I write the light as a transition table: each state has its duration and its next state. The component only knows the current state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Timer:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> per state for exactly its duration, in an effect keyed on light, remaining and running, with a cleanup that clears it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pause:</strong> <span style="color:#f0e2c8;">"I record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endsAt</code> in a ref when a colour starts; Pause banks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endsAt - now</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remaining</code>, and Resume just re-runs the effect with that amount."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Next:</strong> <span style="color:#f0e2c8;">"Next moves to the table's next state with its full duration and leaves the pause flag alone. The cleanup guarantees the old timeout cannot fire too."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"Lamps are decorative and hidden; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=status</code> line says Red: stop or Green: go, so colour is never the only signal."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a pedestrian button?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pedestrianRequested</code> flag; when green ends with the flag set, go to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">walk</code> state from the table instead of yellow, then clear the flag. The engine does not change; the table and one transition rule do.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a night mode with flashing yellow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two extra states, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yellowOn</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yellowOff</code>, each 500 ms, pointing at each other. A mode switch picks which entry state to jump to. That is the payoff of a data-driven machine.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useReducer</code> help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, once there are more events: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dispatch({ type: "TIMEOUT" })</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NEXT</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PAUSE</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">now</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RESUME</code>, and a pure reducer that is trivial to unit-test. The effect then only arms a timeout based on the reducer state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Several lights at a junction must stay in sync. How?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One controller (a hook or a context provider) owns the machine and the single timer; each light is a pure view of the controller state. Two independent timers would drift apart.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the timing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fake timers: render, advance 2999 ms and expect red, advance 1 ms and expect green. Pause after 1000 ms of green, advance 10 s, expect still green, Resume, advance 1500 ms, expect yellow.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Finite state machine (FSM)** | A fixed set of states, one active at a time, with defined transitions |
| **Transition table** | Data mapping each state to its next state (and its duration) |
| **One timer per state** | Each state arms a single timeout for its own duration |
| **useRef for non-rendered values** | A mutable box that survives renders without causing one |
| **Banking the remaining time** | Saving the time left on pause so Resume continues |
| **role="status"** | Polite live region announced without interrupting |

---

**Conclusion:** A traffic light is a transition table plus a tiny engine: one timeout per state, re-armed on every change and always cleaned up, with Pause banking the remaining time and Next jumping along the table. The same "timed states" engine powers the [Typewriter Effect](/interview-question/build-a-typewriter-effect), whose states are typing, holding and deleting.`,
        files: {
          "/App.js": `import TrafficLight from "./src/TrafficLight";

export default function App() {
  return (
    <main className="page">
      <TrafficLight />
    </main>
  );
}
`,
          "/src/TrafficLight.js": `import { useEffect, useRef, useState } from "react";
import { LIGHTS, ORDER } from "./lights";

export default function TrafficLight() {
  const [light, setLight] = useState("red");
  const [running, setRunning] = useState(true);
  // ms left in this light
  const [remaining, setRemaining] = useState(LIGHTS.red.ms);
  const endsAt = useRef(0); // when the current light ends, while running

  // One timeout per light. It is re-armed whenever the light, the remaining
  // time or the running flag change, and cleared before every re-arm.
  useEffect(() => {
    if (!running) return;
    endsAt.current = performance.now() + remaining;
    const id = setTimeout(() => {
      const next = LIGHTS[light].next;
      setLight(next);
      setRemaining(LIGHTS[next].ms);
    }, remaining);
    return () => clearTimeout(id);
  }, [light, remaining, running]);

  const togglePause = () => {
    if (running) setRemaining(Math.max(0, endsAt.current - performance.now()));
    setRunning(!running);
  };
  const next = () => {
    const n = LIGHTS[light].next;
    setLight(n);
    setRemaining(LIGHTS[n].ms);
  };

  return (
    <section className="card" aria-labelledby="tl-title">
      <h1 id="tl-title" className="title">
        Traffic Light
      </h1>
      <div className="housing" aria-hidden="true">
        {ORDER.map((name) => (
          <span
            key={name}
            className={"lamp " + name + (light === name ? " on" : "")}
            data-testid={"lamp-" + name}
          />
        ))}
      </div>
      <p className="status" role="status" data-testid="status">
        {LIGHTS[light].label}
        {running ? "" : " (paused)"}
      </p>
      <div className="controls">
        <button type="button" onClick={togglePause} data-testid="pause">
          {running ? "Pause" : "Resume"}
        </button>
        <button type="button" onClick={next} data-testid="next">
          Next
        </button>
      </div>
    </section>
  );
}
`,
          "/src/lights.js": `// The whole traffic light as data: a finite state machine.
// Each state knows how long it lasts and which state comes next.
export const LIGHTS = {
  red: { ms: 3000, next: "green", label: "Red: stop" },
  green: { ms: 2500, next: "yellow", label: "Green: go" },
  yellow: { ms: 1000, next: "red", label: "Yellow: prepare to stop" },
};
export const ORDER = ["red", "yellow", "green"]; // top to bottom on the housing
`,
          "/styles.css": `body {
  margin: 0;
  background: #0b1120;
  color: #e2e8f0;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.card {
  width: 100%;
  max-width: 320px;
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 24px 16px;
  box-sizing: border-box;
  text-align: center;
}
.title {
  margin: 0 0 16px;
  font-size: 1rem;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.housing {
  display: inline-flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  background: #020617;
  border: 2px solid #334155;
  border-radius: 24px;
}
.lamp {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  opacity: 0.22;
  transition:
    opacity 0.2s,
    box-shadow 0.2s;
}
.lamp.red {
  background: #ef4444;
}
.lamp.yellow {
  background: #facc15;
}
.lamp.green {
  background: #22c55e;
}
.lamp.on {
  opacity: 1;
  box-shadow: 0 0 28px currentColor;
}
.lamp.red.on {
  color: #ef4444;
}
.lamp.yellow.on {
  color: #facc15;
}
.lamp.green.on {
  color: #22c55e;
}
.status {
  min-height: 1.5em;
  margin: 16px 0;
  font-weight: 600;
}
.controls {
  display: flex;
  gap: 8px;
  justify-content: center;
}
.controls button {
  flex: 1;
  max-width: 120px;
  padding: 10px 0;
  border-radius: 10px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #e2e8f0;
  font: inherit;
  cursor: pointer;
}
.controls button:focus-visible {
  outline: 3px solid #38bdf8;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .lamp {
    transition: none;
  }
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Beginners preparing for a frontend machine coding round in Vue. You know refs and templates at a basic level; state machines and watcher cleanup are explained from zero.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The output under "Verified" was printed by running this exact solution on Vue 3.5.44 (compiled with <code>@vue/compiler-sfc</code>, mounted with <code>createApp(App).mount("#app")</code>) in jsdom.

## 1. A Story First

Inside a real traffic light is a rule book: "red 3 seconds then green; green 2.5 seconds then yellow; yellow 1 second then red". The controller only knows its current page and when to turn it. Write that rule book as data, add a small engine that reads it, and you have the answer interviewers want, plus Pause (resume with the time that was left) and Next. Each colour behaves like a small [Countdown Timer](/interview-question/build-a-countdown-timer).

## 2. Requirements and Plan

Three lamps with one lit; red 3 s, green 2.5 s, yellow 1 s, looping; Pause keeps the time left; Next jumps ahead with a full duration (and stays paused if paused); a text status; no timers after unmount.

| Piece | Vue tool | Why |
| :--- | :--- | :--- |
| <code>light</code>, <code>running</code>, <code>remaining</code> | <code>ref</code> | They decide what is shown and how long the current timeout is. |
| <code>endsAt</code> | Plain <code>let</code> | Read only by Pause; never rendered, so not reactive. |
| The timeout | <code>watch([light, remaining, running], ..., { immediate: true })</code> | Re-armed on any change; <code>onCleanup</code> clears the old one. |

## 3. Build It

### The machine as data

~~~js
// The whole traffic light as data: a finite state machine.
// Each state knows how long it lasts and which state comes next.
export const LIGHTS = {
  red: { ms: 3000, next: "green", label: "Red: stop" },
  green: { ms: 2500, next: "yellow", label: "Green: go" },
  yellow: { ms: 1000, next: "red", label: "Yellow: prepare to stop" },
};
// top to bottom on the housing
export const ORDER = ["red", "yellow", "green"];
~~~

📌 **Interview term: Finite state machine (FSM)** — a fixed set of states, one active at a time, with defined transitions. Each entry here holds its duration and its next state, so the engine never names a colour.

📌 **Interview term: Transition table** — the data structure that maps each state to its successor. A night mode or a pedestrian phase is new entries, not new branches.

### The engine

~~~js
// TrafficLight.vue, script setup (excerpt)
const light = ref("red");
const running = ref(true);
const remaining = ref(LIGHTS.red.ms); // ms left in this light
// when the current light ends, while
// running (not reactive: never rendered)
let endsAt = 0;

watch(
  [light, remaining, running],
  ([l, ms, isRunning], _old, onCleanup) => {
    if (!isRunning) return;
    endsAt = performance.now() + ms;
    const id = setTimeout(() => {
      light.value = LIGHTS[l].next;
      remaining.value = LIGHTS[light.value].ms;
    }, ms);
    onCleanup(() => clearTimeout(id));
  },
  { immediate: true },
);
~~~

📌 **Interview term: One timer per state** — a single <code>setTimeout</code> for exactly the state's duration; no polling interval, nothing to drift.

📌 **Interview term: Watcher cleanup** — <code>onCleanup</code> registers a function that Vue runs before the callback runs again and when the watcher is stopped (automatically on unmount for watchers made in <code>setup</code>). Every transition, Pause and Next therefore cancels the previous timeout before anything new is armed. See [watch vs watchEffect](/interview-question/what-is-the-difference-between-watch-and-watcheffect).

The timeout sets both <code>light</code> and <code>remaining</code> in the same synchronous callback. Vue batches watcher runs (the default <code>flush: "pre"</code> queues them), so the watcher runs once for the pair, not twice. The Verified counts agree: 10 timeouts were created, one per state entered or resumed (mount, 3 Next, 3 automatic transitions, 1 Next, 1 Resume, then yellow), not two per transition.

### Pause, Resume, Next

~~~js
// TrafficLight.vue, script setup (excerpt)
function togglePause() {
  if (running.value)
    remaining.value = Math.max(0, endsAt - performance.now());
  running.value = !running.value;
}
function next() {
  light.value = LIGHTS[light.value].next;
  remaining.value = LIGHTS[light.value].ms;
}
~~~

📌 **Interview term: Banking the remaining time** — Pause stores <code>endsAt - now</code> in <code>remaining</code>; Resume flips <code>running</code> and the watcher arms a timeout for exactly that amount.

<code>performance.now()</code> is monotonic, so a system clock change cannot corrupt the remaining time.

### The template

~~~vue
<div class="housing" aria-hidden="true">
  <span
    v-for="name in ORDER"
    :key="name"
    :class="['lamp', name, { on: light === name }]"
    :data-testid="'lamp-' + name"
  />
</div>
<p class="status" role="status" data-testid="status">
  {{ LIGHTS[light].label }}{{ running ? "" : " (paused)" }}
</p>
~~~

📌 **Interview term: role="status"** — a polite live region; the new text is read when the screen reader is idle. The lamps are decorative (<code>aria-hidden</code>), and the status says "Green: go" in words, so colour is never the only signal.

The array-plus-object <code>:class</code> syntax adds <code>on</code> only to the lit lamp. <code>ORDER</code> is the visual top-to-bottom order, separate from the cycle order.

## 4. Verified

The driver pressed Next three times to restart at red with a full duration, recorded one full cycle, then pressed Next, paused green after 1 s for 1 s and resumed. A preloaded wrapper counted the solution's timeouts. Transitions are <code>lamp@seconds</code>:

~~~text
RENDERED: Traffic LightRed: stopPauseNext
initial : red | Red: stop | lamps: 3 | housing aria-hidden: true
after mount: created 1 timeout(s) + 0 interval(s), cleared 0, pending now 1
Next x3 : red | Red: stop
one cycle: green@3.0s -> yellow@5.5s -> red@6.5s
Next    : green | Green: go
paused  : Green: go (paused) | button Resume | pending timers: 0
1 s later: green
resumed : yellow@3.5s (2.5 s of green + 1 s paused)
most timers pending at once while running: 1 | created 10 timeout(s) + 0 interval(s), cleared 5, pending now 1
timers after unmount: 10 timeout(s) + 0 interval(s) created, 6 cleared, 0 still pending
~~~

- One timeout after mount (no double mount in Vue).
- Green at 3.0 s, yellow at 5.5 s, red at 6.5 s: the durations from the table.
- While paused, zero timeouts pending; yellow came at 3.5 s, 2.5 s of green plus the 1 s pause.
- Never more than one timeout pending; 0 after unmount.

## 5. Edge Cases and Accessibility

| Case | Behaviour |
| :--- | :--- |
| Rapid Next presses | Each re-arm cleans up the previous timeout first |
| Next while paused | New colour, full time, still paused |
| Pause exactly at a transition | <code>Math.max(0, ...)</code> keeps remaining non-negative |
| Hidden tab | Throttled timeouts may stretch a colour; nothing breaks |
| Screen readers | Hidden lamps, polite status text |

## 6. Common Pitfalls

- **Cycle logic in <code>if</code>/<code>else</code> chains**: hard to extend; use a table.
- **<code>setInterval</code> counting seconds**: polls and drifts.
- **No <code>onCleanup</code>**: Pause cannot stop a pending timeout, so the light changes while paused.
- **Making <code>endsAt</code> a ref**: reactive work for a value nobody renders.
- **Pausing by setting a flag the timeout checks when it fires**: the timeout still fires, and the time already spent is lost. Clear it and bank the remainder instead.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Machine:</strong> <span style="color:#f0e2c8;">"A transition table: each state has a duration and a next state. The component holds only the current light."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Timer:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on light, remaining and running arms a single timeout for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remaining</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> clears it before every re-arm and on unmount."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pause:</strong> <span style="color:#f0e2c8;">"Pause banks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endsAt - performance.now()</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remaining</code>; Resume flips <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code> and the watcher re-arms for that amount."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Next:</strong> <span style="color:#f0e2c8;">"Next moves along the table with a full duration and leaves the pause flag alone."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"Lamps are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-hidden</code>; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=status</code> line says the state in words."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a flashing-yellow night mode?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two table entries, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yellowOn</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yellowOff</code>, 500 ms each, pointing at each other, plus a mode switch that jumps to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yellowOn</code>. The watcher does not change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watch</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watchEffect</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The callback reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIGHTS[light.value]</code> inside the timeout too; an explicit source list makes it obvious exactly which three values re-arm the timer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you drive several lights from one controller?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Move the refs and the watcher into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTrafficController()</code> composable, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provide</code> it from a parent, and let each light be a pure view. One timer, no drift between lights.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vitest fake timers: mount, advance 2999 ms and expect red, 1 ms more and expect green; pause, advance 10 s, expect green still, resume, advance the banked amount, expect yellow.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Finite state machine (FSM)** | Fixed states, one active, defined transitions |
| **Transition table** | Data mapping each state to its next state and duration |
| **One timer per state** | A single timeout for the state's own duration |
| **Watcher cleanup** | <code>onCleanup</code>, run before re-runs and when the watcher stops |
| **Banking the remaining time** | Saving the time left on pause |
| **role="status"** | Polite live region |

---

**Conclusion:** In Vue the traffic light is a transition table, three refs and one watcher whose <code>onCleanup</code> guarantees a single pending timeout; Pause banks the time left and Next walks the table. The [Typewriter Effect](/interview-question/build-a-typewriter-effect) uses the same watcher-plus-one-timeout engine for typing and deleting.`,
        files: {
          "/src/App.vue": `<script setup>
import TrafficLight from "./components/TrafficLight.vue";
</script>

<template>
  <main class="page">
    <TrafficLight />
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0b1120;
  color: #e2e8f0;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
</style>
`,
          "/src/components/TrafficLight.vue": `<script setup>
import { ref, watch } from "vue";
import { LIGHTS, ORDER } from "../lights";

const light = ref("red");
const running = ref(true);
const remaining = ref(LIGHTS.red.ms); // ms left in this light
// when the current light ends, while running (not reactive: never rendered)
let endsAt = 0;

// One timeout per light, re-armed when light, remaining or running change.
// onCleanup clears the old one first; Vue stops the watcher on unmount.
watch(
  [light, remaining, running],
  ([l, ms, isRunning], _old, onCleanup) => {
    if (!isRunning) return;
    endsAt = performance.now() + ms;
    const id = setTimeout(() => {
      light.value = LIGHTS[l].next;
      remaining.value = LIGHTS[light.value].ms;
    }, ms);
    onCleanup(() => clearTimeout(id));
  },
  { immediate: true },
);

function togglePause() {
  if (running.value) remaining.value = Math.max(0, endsAt - performance.now());
  running.value = !running.value;
}
function next() {
  light.value = LIGHTS[light.value].next;
  remaining.value = LIGHTS[light.value].ms;
}
</script>

<template>
  <section class="card" aria-labelledby="tl-title">
    <h1 id="tl-title" class="title">Traffic Light</h1>
    <div class="housing" aria-hidden="true">
      <span
        v-for="name in ORDER"
        :key="name"
        :class="['lamp', name, { on: light === name }]"
        :data-testid="'lamp-' + name"
      />
    </div>
    <p class="status" role="status" data-testid="status">
      {{ LIGHTS[light].label }}{{ running ? "" : " (paused)" }}
    </p>
    <div class="controls">
      <button type="button" data-testid="pause" @click="togglePause">
        {{ running ? "Pause" : "Resume" }}
      </button>
      <button type="button" data-testid="next" @click="next">Next</button>
    </div>
  </section>
</template>

<style scoped>
.card {
  width: 100%;
  max-width: 320px;
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 24px 16px;
  box-sizing: border-box;
  text-align: center;
}
.title {
  margin: 0 0 16px;
  font-size: 1rem;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.housing {
  display: inline-flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  background: #020617;
  border: 2px solid #334155;
  border-radius: 24px;
}
.lamp {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  opacity: 0.22;
  transition:
    opacity 0.2s,
    box-shadow 0.2s;
}
.lamp.red {
  background: #ef4444;
}
.lamp.yellow {
  background: #facc15;
}
.lamp.green {
  background: #22c55e;
}
.lamp.on {
  opacity: 1;
  box-shadow: 0 0 28px currentColor;
}
.lamp.red.on {
  color: #ef4444;
}
.lamp.yellow.on {
  color: #facc15;
}
.lamp.green.on {
  color: #22c55e;
}
.status {
  min-height: 1.5em;
  margin: 16px 0;
  font-weight: 600;
}
.controls {
  display: flex;
  gap: 8px;
  justify-content: center;
}
.controls button {
  flex: 1;
  max-width: 120px;
  padding: 10px 0;
  border-radius: 10px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #e2e8f0;
  font: inherit;
  cursor: pointer;
}
.controls button:focus-visible {
  outline: 3px solid #38bdf8;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .lamp {
    transition: none;
  }
}
</style>
`,
          "/src/lights.js": `// The whole traffic light as data: a finite state machine.
// Each state knows how long it lasts and which state comes next.
export const LIGHTS = {
  red: { ms: 3000, next: "green", label: "Red: stop" },
  green: { ms: 2500, next: "yellow", label: "Green: go" },
  yellow: { ms: 1000, next: "red", label: "Yellow: prepare to stop" },
};
export const ORDER = ["red", "yellow", "green"]; // top to bottom on the housing
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Beginners preparing for a frontend machine coding round in Angular. You know components and the idea of signals; state machines and effects with cleanup are explained from zero.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The output under "Verified" was printed by booting this exact solution on Angular 22.2.3 in jsdom, AOT-compiled with strict templates and JIT-compiled as in the playground.

## 1. A Story First

A traffic controller follows a rule book: red 3 seconds then green, green 2.5 seconds then yellow, yellow 1 second then red. Write the rule book as typed data and add a small engine, and you have the answer. Pause (continue with the time left) and Next complete it; each colour is a small [Countdown Timer](/interview-question/build-a-countdown-timer).

## 2. Requirements and Plan

Three lamps with one lit; red 3 s, green 2.5 s, yellow 1 s, looping; Pause keeps the time left; Next jumps ahead with a full duration and keeps the pause state; a text status; nothing running after destroy.

| Piece | Angular tool | Why |
| :--- | :--- | :--- |
| <code>light</code>, <code>running</code>, <code>remaining</code> | <code>signal</code> | Drive the view and the timer |
| <code>endsAt</code> | Private field | Read by Pause only; never rendered |
| The timeout | <code>effect((onCleanup) =&gt; ...)</code> | Re-armed when any of the three signals change |

## 3. Build It

### The machine as typed data

~~~ts
// The whole traffic light as data: a finite state machine.
// Each state knows how long it lasts and which state comes next.
export type Light = "red" | "yellow" | "green";

export const LIGHTS: Record<
  Light,
  { ms: number; next: Light; label: string }
> = {
  red: { ms: 3000, next: "green", label: "Red: stop" },
  green: { ms: 2500, next: "yellow", label: "Green: go" },
  yellow: { ms: 1000, next: "red", label: "Yellow: prepare to stop" },
};
// top to bottom on the housing
export const ORDER: Light[] = ["red", "yellow", "green"];
~~~

📌 **Interview term: Finite state machine (FSM)** — fixed states, one active at a time, defined transitions. The <code>Light</code> union plus <code>Record&lt;Light, ...&gt;</code> makes the compiler check that every state has a duration, a label and a valid next state.

📌 **Interview term: Transition table** — the map from each state to its successor. New modes are new entries, not new branches.

### The engine

~~~ts
// traffic-light.component.ts (class excerpt)
readonly light = signal<Light>("red");
readonly running = signal(true);
readonly remaining = signal(LIGHTS.red.ms); // ms left in this light
// when the current light ends, while running (never rendered)
private endsAt = 0;

constructor() {
  effect((onCleanup) => {
    const l = this.light();
    const ms = this.remaining();
    if (!this.running()) return;
    this.endsAt = performance.now() + ms;
    const id = setTimeout(
      () => untracked(() => this.go(LIGHTS[l].next)),
      ms,
    );
    onCleanup(() => clearTimeout(id));
  });
}

private go(next: Light): void {
  this.light.set(next);
  this.remaining.set(LIGHTS[next].ms);
}

togglePause(): void {
  if (this.running())
    this.remaining.set(Math.max(0, this.endsAt - performance.now()));
  this.running.update((r) => !r);
}

next(): void {
  this.go(LIGHTS[this.light()].next);
}
~~~

📌 **Interview term: One timer per state** — a single <code>setTimeout</code> for exactly the state's duration, re-armed on every change. No polling, no drift.

📌 **Interview term: effect with onCleanup** — the effect reads <code>light()</code>, <code>remaining()</code> and <code>running()</code>, so a change to any of them re-runs it; the registered cleanup clears the previous timeout first, and runs again when the component is destroyed. All three signals are read before the early return, which makes the dependencies obvious at a glance (Angular tracks whatever was read in the last run). See [when to use effect](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it).

📌 **Interview term: untracked** — runs a function without recording signal reads as dependencies. The timeout callback runs outside the effect anyway, so here it is a belt-and-braces marker that <code>go()</code> must never become a dependency of the effect.

📌 **Interview term: Banking the remaining time** — Pause stores <code>endsAt - now</code>; Resume flips <code>running</code> and the effect arms a timeout for exactly that amount. <code>performance.now()</code> is monotonic, so clock changes cannot corrupt it.

### The template

~~~html
<div class="housing" aria-hidden="true">
  @for (name of order; track name) {
    <span
      [class]="'lamp ' + name"
      [class.on]="light() === name"
      [attr.data-testid]="'lamp-' + name"
    ></span>
  }
</div>
<p
  class="status"
  role="status"
  data-testid="status"
>{{ lights[light()].label }}{{ running() ? "" : " (paused)" }}</p>
~~~

📌 **Interview term: role="status"** — a polite live region announcing the new text without interrupting; the lamps are decorative and hidden, so meaning never depends on colour alone.

<code>[class]</code> sets the base classes and <code>[class.on]</code> toggles one more; Angular merges both bindings.

## 4. Verified

The driver pressed Next three times to restart at red, recorded a full cycle, then pressed Next, paused green after 1 s for 1 s and resumed. A preloaded wrapper counted the component's timeouts (Angular's own scheduler timers excluded). Transitions are <code>lamp@seconds</code>.

AOT with strict templates:

~~~text
RENDERED: Traffic LightRed: stopPauseNext
initial : red | Red: stop | lamps: 3 | housing aria-hidden: true
after mount: created 1 timeout(s) + 0 interval(s), cleared 0, pending now 1
Next x3 : red | Red: stop
one cycle: green@3.0s -> yellow@5.5s -> red@6.5s
Next    : green | Green: go
paused  : Green: go (paused) | button Resume | pending timers: 0
1 s later: green
resumed : yellow@3.5s (2.5 s of green + 1 s paused)
most timers pending at once while running: 1 | created 10 timeout(s) + 0 interval(s), cleared 5, pending now 1
timers after unmount: 10 timeout(s) + 0 interval(s) created, 6 cleared, 0 still pending
~~~

JIT, as in the playground:

~~~text
RENDERED: Traffic LightRed: stopPauseNext
initial : red | Red: stop | lamps: 3 | housing aria-hidden: true
after mount: created 1 timeout(s) + 0 interval(s), cleared 0, pending now 1
Next x3 : red | Red: stop
one cycle: green@3.0s -> yellow@5.5s -> red@6.5s
Next    : green | Green: go
paused  : Green: go (paused) | button Resume | pending timers: 0
1 s later: green
resumed : yellow@3.5s (2.5 s of green + 1 s paused)
most timers pending at once while running: 1 | created 10 timeout(s) + 0 interval(s), cleared 5, pending now 1
timers after unmount: 10 timeout(s) + 0 interval(s) created, 6 cleared, 0 still pending
~~~

- Green at 3.0 s, yellow at 5.5 s, red at 6.5 s, matching the table.
- Zero timeouts pending while paused; yellow at 3.5 s, so green ran its full 2.5 s around the pause.
- Never more than one timeout pending; 0 after destroy.

## 5. Edge Cases and Accessibility

| Case | Behaviour |
| :--- | :--- |
| Rapid Next presses | Each change re-runs the effect, whose cleanup clears the old timeout |
| Next while paused | New colour, full time, still paused |
| Pause at a transition | <code>Math.max(0, ...)</code> keeps remaining non-negative |
| Zoneless rendering | Every change is a signal write |
| Screen readers | Hidden lamps, polite status text |

## 6. Common Pitfalls

- **An <code>if</code>/<code>else</code> cycle inside the timer**: use the table.
- **One <code>setInterval</code> for the whole cycle**: a single period cannot express 3 s, 2.5 s and 1 s; you end up counting ticks per colour, which polls and drifts.
- **No <code>onCleanup</code>**: Pause cannot stop a pending timeout, so the light changes while paused.
- **Plain fields for <code>light</code>**: nothing re-renders in a zoneless app.
- **Colour-only meaning**: add the status text.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Machine:</strong> <span style="color:#f0e2c8;">"A typed transition table: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;Light, { ms, next, label }&gt;</code>. The component holds only the current light."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Timer:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> reads light, remaining and running, arms one timeout for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remaining</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> clears it before every re-run and on destroy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pause:</strong> <span style="color:#f0e2c8;">"Pause banks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endsAt - performance.now()</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remaining</code>; Resume flips <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code> and the effect re-arms."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Next:</strong> <span style="color:#f0e2c8;">"Next follows the table with a full duration and leaves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code> alone."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"Lamps are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-hidden</code>, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=status</code> line says the state in words."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not an RxJS pipeline?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toObservable</code> of the three signals, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timer(remaining)</code>, and a subscription that advances the light also works and cancels automatically. The effect is shorter and needs no subscription management.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a pedestrian phase?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">walk</code> entry in the table and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pedestrianRequested</code> signal; when green ends with the flag set, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">go("walk")</code> instead of the table's next state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep two lights in sync?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put the signals and the effect in an injectable controller service and let each light component read it; one timer serves both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TestBed with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fakeAsync</code>: create, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(2999)</code> and expect red, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(1)</code> and expect green, then pause, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(10000)</code>, resume, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick</code> the banked amount for yellow.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Finite state machine (FSM)** | Fixed states, one active, defined transitions |
| **Transition table** | Data mapping each state to its next state |
| **One timer per state** | A single timeout for the state's own duration |
| **effect with onCleanup** | Signal-driven side effect with teardown |
| **untracked** | Run code without adding signal dependencies |
| **Banking the remaining time** | Saving the time left on pause |
| **role="status"** | Polite live region |

---

**Conclusion:** In Angular the traffic light is a typed transition table, three signals and one effect that arms a single timeout and cleans it up on every change. Pause banks the time left and Next walks the table. The [Typewriter Effect](/interview-question/build-a-typewriter-effect) uses the same one-timeout engine with typing and deleting states.`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation } from "@angular/core";
import { TrafficLightComponent } from "./traffic-light.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [TrafficLightComponent],
  template: \`<main class="page"><app-traffic-light /></main>\`,
  // these two rules are global on purpose
  encapsulation: ViewEncapsulation.None,
  styles: [
    \`
      body {
        margin: 0;
        background: #0b1120;
        color: #e2e8f0;
        font-family: system-ui, sans-serif;
      }
      .page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 16px;
        box-sizing: border-box;
      }
    \`,
  ],
})
export class AppComponent {}
`,
          "/src/app/lights.ts": `// The whole traffic light as data: a finite state machine.
// Each state knows how long it lasts and which state comes next.
export type Light = "red" | "yellow" | "green";

export const LIGHTS: Record<Light, { ms: number; next: Light; label: string }> =
  {
    red: { ms: 3000, next: "green", label: "Red: stop" },
    green: { ms: 2500, next: "yellow", label: "Green: go" },
    yellow: { ms: 1000, next: "red", label: "Yellow: prepare to stop" },
  };
// top to bottom on the housing
export const ORDER: Light[] = ["red", "yellow", "green"];
`,
          "/src/app/traffic-light.component.ts": `import { Component, effect, signal, untracked } from "@angular/core";
import { LIGHTS, ORDER, Light } from "./lights";

@Component({
  selector: "app-traffic-light",
  standalone: true,
  template: \`
    <section class="card" aria-labelledby="tl-title">
      <h1 id="tl-title" class="title">Traffic Light</h1>
      <div class="housing" aria-hidden="true">
        @for (name of order; track name) {
          <span
            [class]="'lamp ' + name"
            [class.on]="light() === name"
            [attr.data-testid]="'lamp-' + name"
          ></span>
        }
      </div>
      <p
        class="status"
        role="status"
        data-testid="status"
      >{{ lights[light()].label }}{{ running() ? "" : " (paused)" }}</p>
      <div class="controls">
        <button
          type="button"
          data-testid="pause"
          (click)="togglePause()"
        >{{ running() ? "Pause" : "Resume" }}</button>
        <button type="button" data-testid="next" (click)="next()">Next</button>
      </div>
    </section>
  \`,
  styles: [
    \`
    .card { width: 100%; max-width: 320px; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 24px 16px; box-sizing: border-box; text-align: center; }
    .title { margin: 0 0 16px; font-size: 1rem; font-weight: 600; color: #94a3b8; letter-spacing: 0.08em; text-transform: uppercase; }
    .housing { display: inline-flex; flex-direction: column; gap: 14px; padding: 16px; background: #020617; border: 2px solid #334155; border-radius: 24px; }
    .lamp { width: 72px; height: 72px; border-radius: 50%; opacity: 0.22; transition: opacity 0.2s, box-shadow 0.2s; }
    .lamp.red { background: #ef4444; }
    .lamp.yellow { background: #facc15; }
    .lamp.green { background: #22c55e; }
    .lamp.on { opacity: 1; box-shadow: 0 0 28px currentColor; }
    .lamp.red.on { color: #ef4444; }
    .lamp.yellow.on { color: #facc15; }
    .lamp.green.on { color: #22c55e; }
    .status { min-height: 1.5em; margin: 16px 0; font-weight: 600; }
    .controls { display: flex; gap: 8px; justify-content: center; }
    .controls button { flex: 1; max-width: 120px; padding: 10px 0; border-radius: 10px; border: 1px solid #334155; background: #1e293b; color: #e2e8f0; font: inherit; cursor: pointer; }
    .controls button:focus-visible { outline: 3px solid #38bdf8; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { .lamp { transition: none; } }
  \`,
  ],
})
export class TrafficLightComponent {
  readonly lights = LIGHTS;
  readonly order = ORDER;
  readonly light = signal<Light>("red");
  readonly running = signal(true);
  readonly remaining = signal(LIGHTS.red.ms); // ms left in this light
  // when the current light ends, while running (never rendered)
  private endsAt = 0;

  constructor() {
    // One timeout per light, re-armed when light, remaining or running change.
    // onCleanup clears the old one first and runs again on destroy.
    effect((onCleanup) => {
      const l = this.light();
      const ms = this.remaining();
      if (!this.running()) return;
      this.endsAt = performance.now() + ms;
      const id = setTimeout(() => untracked(() => this.go(LIGHTS[l].next)), ms);
      onCleanup(() => clearTimeout(id));
    });
  }

  private go(next: Light): void {
    this.light.set(next);
    this.remaining.set(LIGHTS[next].ms);
  }

  togglePause(): void {
    if (this.running())
      this.remaining.set(Math.max(0, this.endsAt - performance.now()));
    this.running.update((r) => !r);
  }

  next(): void {
    this.go(LIGHTS[this.light()].next);
  }
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Typewriter Effect",
    seoDescription:
      "Build a typewriter effect in React, Vue and Angular: a timeout-driven state machine that types, holds, deletes and loops with one timer, a caret and Pause.",
    description: `**Question presented to candidate:**
"Build the typewriter effect you see on landing pages: 'I build with React', where the last word types itself out letter by letter, pauses, deletes itself, then types the next word, looping forever. Make the speeds configurable, show a blinking caret, and make sure it is accessible."

**Requirements:**
- A fixed prefix followed by an animated word from a list (\`React\`, \`Vue\`, \`Angular\`), looping.
- Configurable timings: type speed per character, delete speed per character, hold time on the full word, gap before the next word.
- A blinking caret after the text.
- A Pause button (moving content that runs forever must be pausable).
- Screen readers get the full sentence once, not a stream of partial words.
- Exactly one timer at a time; nothing left running after unmount.

**What a strong answer should cover:**
- The effect as a **state machine**: \`{ index, count, deleting }\` with four phases (typing, holding, deleting, gap) and a pure \`plan(state)\` that returns the next state and the delay.
- A single \`setTimeout\` per step, scheduled from the current state and cleared before every re-run, instead of nested timers or a \`setInterval\` with phase flags.
- Why a missing cleanup breaks under React StrictMode (two loops, doubled speed) and how to prove it.
- Props or inputs for timings, and keeping the word list referentially stable.
- Accessibility: visually hidden full text, the animated part \`aria-hidden\`, a pause control (WCAG 2.2.2 Pause, Stop, Hide), caret animation off for reduced motion.

**Clarifying questions expected:**
- "Should it loop forever or stop after the last word?"
- "Should the cursor keep blinking while paused?"
- "Can the word list change at runtime?"

**Code / implementation expected:** Yes. A reusable component with configurable timings, a single-timer state machine, a caret, a pause control and cleanup.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Beginners preparing for a frontend machine coding round. You know a little JavaScript and React; state machines, timeouts, effect cleanup and screen-reader techniques are explained from zero.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary interviewers expect. Every output under "Verified" was printed by running this exact solution (and one deliberately broken copy) on React 19.3.1 inside <code>&lt;StrictMode&gt;</code> in jsdom.

## 1. Why This Even Matters — A Story First

Picture someone at an old typewriter showing off for a crowd. They type "React" one key at a time, admire it for a second, then backspace it out letter by letter, pause, and start typing "Vue". They never press two keys at once, and there is always exactly one next thing they are about to do.

That last sentence is the whole design. The typewriter effect looks like animation, but it is really a little machine that is always in one of four moods: *typing*, *holding* the finished word, *deleting*, or *waiting* before the next word. Each mood decides how long until the next keypress and what changes. Build it that way and it is short and bug-free. Build it as nested <code>setTimeout</code>s or an interval with flags, and you get the classic bug this doc reproduces: two typists at the same keyboard.

It is a close cousin of the [Traffic Light](/interview-question/build-a-traffic-light): timed states, one timer at a time.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Loop forever, or stop on the last word? | Changes the last transition; forever needs a pause control for accessibility. |
| Which timings are configurable? | We expose four: type, delete, hold and gap, as props with defaults. |
| Does the caret blink while paused? | We stop the blink when paused; a CSS class switch. |
| Can the word list change at runtime? | Then the state must be reset or clamped when the list changes; we treat it as fixed per mount. |
| Must screen readers hear it? | Reading every partial word aloud is awful; we expose the full sentence once instead. |
| Any reduced-motion requirement? | We disable the caret blink with <code>prefers-reduced-motion</code> and offer a Pause button. |

## 3. Requirements and Plan

**Component tree.** <code>App</code> renders <code>&lt;Typewriter prefix words typeMs deleteMs holdMs gapMs /&gt;</code>. The machine itself lives in a timer-free file, <code>typewriterMachine.js</code>.

**State model.**

| Piece | Kind | Why |
| :--- | :--- | :--- |
| <code>state = { index, count, deleting }</code> | State | Which word, how many letters are visible, and the direction. |
| <code>paused</code> | State | The Pause toggle. |
| Visible text | Derived | <code>words[index].slice(0, count)</code>. |
| Next delay and next state | Derived by <code>plan()</code> | A pure function of the state, words and timings. |
| The timeout id | Local to the effect | Only the cleanup needs it. |

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Typewriter state machine: typing until the word is full, holding, deleting until empty, then a gap before the next word">
  <defs>
    <marker id="tw-r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="30" width="250" height="70" rx="10"/>
  <text class="d-text d-accent" x="145" y="58" text-anchor="middle">Typing</text>
  <text class="d-sub" x="145" y="80" text-anchor="middle">count + 1 every typeMs</text>
  <rect class="d-box" x="410" y="30" width="250" height="70" rx="10"/>
  <text class="d-text" x="535" y="58" text-anchor="middle">Holding</text>
  <text class="d-sub" x="535" y="80" text-anchor="middle">wait holdMs once</text>
  <rect class="d-box" x="410" y="200" width="250" height="70" rx="10"/>
  <text class="d-text" x="535" y="228" text-anchor="middle">Deleting</text>
  <text class="d-sub" x="535" y="250" text-anchor="middle">count - 1 every deleteMs</text>
  <rect class="d-box-muted" x="20" y="200" width="250" height="70" rx="10"/>
  <text class="d-text" x="145" y="228" text-anchor="middle">Gap</text>
  <text class="d-sub" x="145" y="250" text-anchor="middle">wait gapMs, next word</text>
  <path class="d-edge" d="M 270 65 L 404 65" marker-end="url(#tw-r-arrow)"/>
  <text class="d-sub" x="337" y="50" text-anchor="middle">word full</text>
  <path class="d-edge" d="M 535 100 L 535 194" marker-end="url(#tw-r-arrow)"/>
  <path class="d-edge" d="M 410 235 L 276 235" marker-end="url(#tw-r-arrow)"/>
  <text class="d-sub" x="343" y="220" text-anchor="middle">empty</text>
  <path class="d-edge-accent" d="M 145 200 L 145 106" marker-end="url(#tw-r-arrow)"/>
</svg>

Every arrow is one <code>setTimeout</code>. The machine always knows exactly one next step and how long to wait for it, which is why one timer is enough.

## 4. Build It Step by Step

### Step 1: the machine, with no timers in it

~~~js
// The typewriter as a pure state machine.
// Given where we are, return how long
// to wait and what the next state is. No
// timers in here, so it is easy to test.
//   typing   -> one more character every typeMs
//   full     -> hold for holdMs, then start deleting
//   deleting -> one less character every deleteMs
//   empty    -> wait gapMs, then type the next word (looping)
export const START = { index: 0, count: 0, deleting: false };

export function plan(state, words, t) {
  const word = words[state.index];
  if (!state.deleting && state.count < word.length)
    return {
      delay: t.typeMs,
      next: { ...state, count: state.count + 1 },
    };
  if (!state.deleting)
    return { delay: t.holdMs, next: { ...state, deleting: true } };
  if (state.count > 0)
    return {
      delay: t.deleteMs,
      next: { ...state, count: state.count - 1 },
    };
  return {
    delay: t.gapMs,
    next: {
      index: (state.index + 1) % words.length,
      count: 0,
      deleting: false,
    },
  };
}

export const visibleText = (state, words) =>
  words[state.index].slice(0, state.count);
~~~

📌 **Interview term: Finite state machine (FSM)** — the component is always in one well-defined state, and a single function decides the next state. Here the "mood" is not even stored separately: it follows from <code>deleting</code> and how <code>count</code> compares with the word length.

📌 **Interview term: Pure function** — same input, same output, no side effects. <code>plan()</code> touches no timer and no DOM, so you can test every transition with plain assertions: <code>plan({ index: 0, count: 5, deleting: false }, words, t)</code> must return <code>{ delay: t.holdMs, next: { ..., deleting: true } }</code>.

Note the modulo in the last branch: <code>(state.index + 1) % words.length</code> wraps from the last word back to the first, which is the loop.

### Step 2: the component and its single timer

~~~jsx
import { useEffect, useState } from "react";
import { START, plan, visibleText } from "./typewriterMachine";

export default function Typewriter({
  prefix,
  words,
  typeMs = 100,
  deleteMs = 50,
  holdMs = 1000,
  gapMs = 300,
}) {
  const [state, setState] = useState(START);
  const [paused, setPaused] = useState(false);

  // Exactly one pending timeout at any
  // time: each step schedules the next
  // one, and the cleanup cancels it before a re-run or on unmount.
  useEffect(() => {
    if (paused) return;
    const { delay, next } = plan(state, words, {
      typeMs,
      deleteMs,
      holdMs,
      gapMs,
    });
    const id = setTimeout(() => setState(next), delay);
    return () => clearTimeout(id);
  }, [state, paused, words, typeMs, deleteMs, holdMs, gapMs]);

  return (
    <div className="tw">
      <p className="line">
        <span className="sr-only">
          {prefix + " " + words.join(", ")}
        </span>
        <span aria-hidden="true">
          {prefix}{" "}
          <span className="word" data-testid="word">
            {visibleText(state, words)}
          </span>
          <span className={paused ? "caret still" : "caret"} />
        </span>
      </p>
      <button
        type="button"
        aria-pressed={paused}
        onClick={() => setPaused(!paused)}
        data-testid="pause"
      >
        Pause animation
      </button>
    </div>
  );
}
~~~

The effect reads the current state, asks <code>plan()</code> for the delay and the next state, and arms one <code>setTimeout</code>. When it fires, <code>setState(next)</code> changes the state, React re-renders, the cleanup clears the (already fired) timeout, and the effect arms the next one. Pausing returns early, so no timer exists while paused.

📌 **Interview term: Effect cleanup** — the function returned from <code>useEffect</code>, which React runs before the effect re-runs and on unmount. Here it guarantees that at most one timeout is ever pending. See [the cleanup function in useEffect](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect).

📌 **Interview term: StrictMode double effect** — in development, React mounts, runs effects, runs their cleanups, then runs them again, precisely to expose effects that do not clean up. A typewriter without cleanup is the textbook victim, shown in the Verified section. See [why StrictMode double-invokes effects](/interview-question/why-does-react-18-strictmode-double-invoke-your-components-and-effects).

The dependency list includes every value the effect reads: <code>state</code>, <code>paused</code>, <code>words</code> and the four timings. That has a consequence for the parent:

~~~jsx
import Typewriter from "./src/Typewriter";

// Defined outside the component so the
// array keeps one identity across renders.
const WORDS = ["React", "Vue", "Angular"];

export default function App() {
  return (
    <main className="page">
      <section className="card">
        <h1 className="title">Typewriter Effect</h1>
        <Typewriter
          prefix="I build with"
          words={WORDS}
          typeMs={100}
          deleteMs={50}
          holdMs={1000}
          gapMs={300}
        />
      </section>
    </main>
  );
}
~~~

📌 **Interview term: Referential stability** — React compares dependencies with <code>Object.is</code>, so an array literal written inline in JSX (<code>words={["React", "Vue"]}</code>) is a *new* array on every parent render. Each parent render would then cancel and restart the current step. Defining <code>WORDS</code> at module scope (or with <code>useMemo</code>) keeps it the same object. More in [the deps array](/interview-question/what-is-the-purpose-of-the-deps-array-in-useeffect-and-usecallback).

### Step 3: what screen readers get

~~~jsx
<p className="line">
  <span className="sr-only">{prefix + " " + words.join(", ")}</span>
  <span aria-hidden="true">
    {prefix}{" "}
    <span className="word" data-testid="word">
      {visibleText(state, words)}
    </span>
    <span className={paused ? "caret still" : "caret"} />
  </span>
</p>
~~~

📌 **Interview term: Visually hidden text (sr-only)** — CSS that removes text from the visual layout (1 px clipped box) while keeping it in the accessibility tree. Screen readers read "I build with React, Vue, Angular" once; the animated copy is <code>aria-hidden="true"</code>, so a screen reader never spells out "R, Re, Rea".

📌 **Interview term: WCAG 2.2.2 Pause, Stop, Hide** — the accessibility rule that moving content which starts automatically and lasts more than five seconds needs a way to pause it ([W3C understanding doc](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)). The Pause button with <code>aria-pressed</code> covers it; the caret blink also stops under <code>prefers-reduced-motion: reduce</code> in the CSS.

The caret is a 3 px-wide inline block with a CSS <code>@keyframes blink</code> using <code>steps(1)</code>, so it snaps on and off like a real cursor instead of fading. CSS runs the blink, so it costs no JavaScript timers.

## 5. Verified

Run with <code>scripts/verify-mc-solution.mjs</code> as <code>&lt;StrictMode&gt;&lt;App /&gt;&lt;/StrictMode&gt;</code> in jsdom, with real time passing and the timings from <code>App.js</code> (100 / 50 / 1000 / 300 ms). A preloaded wrapper counted the solution's timeouts. The driver waited for the gap after "React", then recorded every change of the word, the time between changes (rounded to 50 ms), the most timeouts pending at once, and a pause:

~~~text
RENDERED: Typewriter EffectI build with React, Vue, AngularI build with Pause animation
screen-reader text: I build with React, Vue, Angular | animated part aria-hidden: true
after mount: created 2 timeout(s) + 0 interval(s), cleared 1, pending now 1
frames  : V > Vu > Vue > Vu > V > (empty) > A > An > Ang > Angu > Angul > Angula > Angular > Angula
ms between frames (rounded to 50): 100 100 1050 50 50 400 100 100 100 100 100 100 1050
most timers pending at once: 1
paused  : "Angula" -> 0.7 s later "Angula" | aria-pressed true | pending timers: 0
resumed : "" | created 38 timeout(s) + 0 interval(s), cleared 2, pending now 1
timers after unmount: 38 timeout(s) + 0 interval(s) created, 3 cleared, 0 still pending
~~~

- **StrictMode**: after mount, 2 timeouts created and 1 cleared; one loop survived.
- **Timings**: 100 ms per typed letter, 1050 ms from full word to the first deletion (the 1000 ms hold, then one 50 ms delete step), 50 ms per deleted letter, 400 ms from empty to the first letter of the next word (300 ms gap + 100 ms type).
- **One timer**: never more than one pending.
- **Pause**: the text froze for 0.7 s with zero pending timers; after Resume, the deletion continued.

Then a deliberately broken copy was run the same way: identical except that the effect calls <code>setTimeout(...)</code> without returning a cleanup (and uses the updater form so each stray timer still advances the machine):

~~~text
RENDERED: Typewriter EffectI build with React, Vue, AngularI build with Pause animation
buggy, first 700 ms:  > Re > Reac > React > Reac > Rea > Re > R >  | most timers pending at once: 2
timers after unmount: 13 timeout(s) + 0 interval(s) created, 0 cleared, 2 still pending: timeout(1000ms), timeout(300ms)
~~~

Two loops: StrictMode's first effect run was never cancelled, and every state change scheduled yet another timeout while the stale ones kept firing. "React" was typed and fully deleted within 700 ms, skipping the one-second hold, and two timers were still pending after the component unmounted. That is the bug interviewers are fishing for.

## 6. Edge Cases and Accessibility

| Case | What the solution does |
| :--- | :--- |
| Last word | <code>% words.length</code> loops back to the first. |
| Unmount mid-word | Cleanup clears the pending timeout (0 pending after unmount). |
| Parent re-render | Stable <code>WORDS</code> keeps the current step's timer alive. |
| Pause | No timer while paused; Resume restarts the current step with its full delay. |
| Screen readers | One hidden full sentence; animated text <code>aria-hidden</code>. |
| Motion sensitivity | Pause button (WCAG 2.2.2) and no caret blink under reduced motion. |
| Background tab | Timeouts are throttled, so typing slows; nothing breaks because each step only depends on state. |

## 7. Common Pitfalls

- **No cleanup.** Measured above: two loops, the hold skipped, timers leaking past unmount.
- **A <code>setInterval</code> with phase flags.** One fixed period cannot express typing, holding, deleting and the gap; you end up counting ticks.
- **Recursive <code>setTimeout</code> outside React state.** A hand-rolled loop that writes to the DOM fights React and is hard to cancel.
- **An inline words array.** A new array each parent render restarts the current step.
- **Letting screen readers hear every frame.** Use hidden full text plus <code>aria-hidden</code>, or a static <code>aria-label</code> on an element with a suitable role.
- **No way to pause.** Infinite motion fails WCAG 2.2.2.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Machine:</strong> <span style="color:#f0e2c8;">"State is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ index, count, deleting }</code>. A pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">plan()</code> returns the next state and the delay for each phase: typing, holding, deleting, gap."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. One timer:</strong> <span style="color:#f0e2c8;">"One effect reads the state, arms a single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout(plan.delay)</code>, and its cleanup clears it, so exactly one timer exists at any moment."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. StrictMode:</strong> <span style="color:#f0e2c8;">"Without cleanup, StrictMode's double run leaves two loops and the word types at the wrong speed; with cleanup it is harmless."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Config:</strong> <span style="color:#f0e2c8;">"Timings are props with defaults, all listed in the deps, and the words array is defined outside the component so it stays referentially stable."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"Hidden full sentence for screen readers, the animation <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-hidden</code>, a Pause button for WCAG 2.2.2, and the caret blink stops for reduced motion."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it a reusable hook?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Move the state, the effect and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">plan()</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTypewriter(words, timings)</code> returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ text, paused, setPaused }</code>. The component keeps only the markup.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Pause loses the progress of the current step. Does that matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a 50-100 ms step, no. For the one-second hold you could bank the remaining time like the traffic light does: record when the step ends in a ref and on Resume schedule only what is left.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support a word list that changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reset the state when the list changes, either with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code> on the component tied to the list or by resetting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">state</code> in the event that changes the list. Clamping <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code> also works.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not CSS <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">steps()</code> animation over a fixed width?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A pure-CSS typewriter (width animated in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ch</code> units with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">steps(n)</code>) works for one known string in a monospace font, but cannot loop through several words of different lengths and delete them without JavaScript.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">plan()</code> for each phase. For the component, fake timers: advance 100 ms five times and expect React, advance 999 ms and expect still React, then 51 ms and expect Reac.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Finite state machine (FSM)** | One well-defined state at a time and a function for the next |
| **Pure function** | Same input, same output, no side effects |
| **Effect cleanup** | Function React runs before an effect re-runs and on unmount |
| **StrictMode double effect** | Dev-only mount, cleanup, mount that exposes missing cleanups |
| **Referential stability** | Keeping the same object between renders so deps do not change |
| **Visually hidden text (sr-only)** | Text hidden on screen but read by screen readers |
| **WCAG 2.2.2 Pause, Stop, Hide** | Auto-moving content over 5 s must be pausable |

---

**Conclusion:** A typewriter is a four-phase state machine with one timer. Keep the transitions in a pure function, arm exactly one timeout per step in an effect that always cleans up, keep the inputs stable, and give screen readers and motion-sensitive users a calm version. Compare it with the [Traffic Light](/interview-question/build-a-traffic-light) and the [Countdown Timer](/interview-question/build-a-countdown-timer), which use the same one-timer discipline.`,
        files: {
          "/App.js": `import Typewriter from "./src/Typewriter";

// Defined outside the component so the array keeps one identity across renders.
const WORDS = ["React", "Vue", "Angular"];

export default function App() {
  return (
    <main className="page">
      <section className="card">
        <h1 className="title">Typewriter Effect</h1>
        <Typewriter
          prefix="I build with"
          words={WORDS}
          typeMs={100}
          deleteMs={50}
          holdMs={1000}
          gapMs={300}
        />
      </section>
    </main>
  );
}
`,
          "/src/Typewriter.js": `import { useEffect, useState } from "react";
import { START, plan, visibleText } from "./typewriterMachine";

export default function Typewriter({
  prefix,
  words,
  typeMs = 100,
  deleteMs = 50,
  holdMs = 1000,
  gapMs = 300,
}) {
  const [state, setState] = useState(START);
  const [paused, setPaused] = useState(false);

  // Exactly one pending timeout at any time: each step schedules the next
  // one, and the cleanup cancels it before a re-run or on unmount.
  useEffect(() => {
    if (paused) return;
    const { delay, next } = plan(state, words, {
      typeMs,
      deleteMs,
      holdMs,
      gapMs,
    });
    const id = setTimeout(() => setState(next), delay);
    return () => clearTimeout(id);
  }, [state, paused, words, typeMs, deleteMs, holdMs, gapMs]);

  return (
    <div className="tw">
      <p className="line">
        <span className="sr-only">{prefix + " " + words.join(", ")}</span>
        <span aria-hidden="true">
          {prefix}{" "}
          <span className="word" data-testid="word">
            {visibleText(state, words)}
          </span>
          <span className={paused ? "caret still" : "caret"} />
        </span>
      </p>
      <button
        type="button"
        aria-pressed={paused}
        onClick={() => setPaused(!paused)}
        data-testid="pause"
      >
        Pause animation
      </button>
    </div>
  );
}
`,
          "/src/typewriterMachine.js": `// The typewriter as a pure state machine. Given where we are, return how long
// to wait and what the next state is. No timers in here, so it is easy to test.
//   typing   -> one more character every typeMs
//   full     -> hold for holdMs, then start deleting
//   deleting -> one less character every deleteMs
//   empty    -> wait gapMs, then type the next word (looping)
export const START = { index: 0, count: 0, deleting: false };

export function plan(state, words, t) {
  const word = words[state.index];
  if (!state.deleting && state.count < word.length)
    return { delay: t.typeMs, next: { ...state, count: state.count + 1 } };
  if (!state.deleting)
    return { delay: t.holdMs, next: { ...state, deleting: true } };
  if (state.count > 0)
    return { delay: t.deleteMs, next: { ...state, count: state.count - 1 } };
  return {
    delay: t.gapMs,
    next: {
      index: (state.index + 1) % words.length,
      count: 0,
      deleting: false,
    },
  };
}

export const visibleText = (state, words) =>
  words[state.index].slice(0, state.count);
`,
          "/styles.css": `body {
  margin: 0;
  background: #0b1120;
  color: #e2e8f0;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.card {
  width: 100%;
  max-width: 480px;
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 24px 16px;
  box-sizing: border-box;
  text-align: center;
}
.title {
  margin: 0 0 16px;
  font-size: 1rem;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.line {
  min-height: 1.4em;
  margin: 0 0 20px;
  font-size: clamp(1.4rem, 7vw, 2rem);
  font-weight: 700;
}
.word {
  color: #c084fc;
}
.caret {
  display: inline-block;
  width: 3px;
  height: 1.1em;
  margin-left: 3px;
  vertical-align: -0.15em;
  background: #e9d5ff;
  animation: blink 1s steps(1) infinite;
}
.caret.still {
  animation: none;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .caret {
    animation: none;
  }
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
button {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #e2e8f0;
  font: inherit;
  cursor: pointer;
}
button[aria-pressed="true"] {
  background: #6b21a8;
  border-color: #c084fc;
}
button:focus-visible {
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Beginners preparing for a frontend machine coding round in Vue. You know refs, props and templates at a basic level; state machines, watcher cleanup and screen-reader techniques are explained from zero.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The output under "Verified" was printed by running this exact solution on Vue 3.5.44 (compiled with <code>@vue/compiler-sfc</code>, mounted with <code>createApp(App).mount("#app")</code>) in jsdom.

## 1. A Story First

A typist showing off types "React" one key at a time, admires it, backspaces it away, pauses, and types "Vue". They never press two keys at once and always know their one next move. That is the design: a small machine in one of four moods (typing, holding, deleting, waiting), with exactly one timer for the next keypress. The [Traffic Light](/interview-question/build-a-traffic-light) uses the same "timed states, one timer" engine.

## 2. Requirements and Plan

A prefix plus a looping animated word; configurable type, delete, hold and gap timings; a blinking caret; a Pause button; screen readers hear the full sentence once; exactly one timer; nothing after unmount.

| Piece | Vue tool | Why |
| :--- | :--- | :--- |
| Timings, words, prefix | <code>defineProps</code> with defaults | Configurable from the parent |
| <code>state = { index, count, deleting }</code> | <code>ref(START)</code> | The machine's current position |
| <code>paused</code> | <code>ref(false)</code> | The toggle |
| Visible text | <code>computed</code> | <code>words[index].slice(0, count)</code> |
| The timer | <code>watch</code> with <code>onCleanup</code> | One timeout per step |

## 3. Build It

### The machine (no timers, no Vue)

~~~js
// The typewriter as a pure state machine.
// Given where we are, return how long
// to wait and what the next state is. No
// timers in here, so it is easy to test.
//   typing   -> one more character every typeMs
//   full     -> hold for holdMs, then start deleting
//   deleting -> one less character every deleteMs
//   empty    -> wait gapMs, then type the next word (looping)
export const START = { index: 0, count: 0, deleting: false };

export function plan(state, words, t) {
  const word = words[state.index];
  if (!state.deleting && state.count < word.length)
    return {
      delay: t.typeMs,
      next: { ...state, count: state.count + 1 },
    };
  if (!state.deleting)
    return { delay: t.holdMs, next: { ...state, deleting: true } };
  if (state.count > 0)
    return {
      delay: t.deleteMs,
      next: { ...state, count: state.count - 1 },
    };
  return {
    delay: t.gapMs,
    next: {
      index: (state.index + 1) % words.length,
      count: 0,
      deleting: false,
    },
  };
}

export const visibleText = (state, words) =>
  words[state.index].slice(0, state.count);
~~~

📌 **Interview term: Finite state machine (FSM)** — one well-defined state at a time and one function that decides the next. <code>plan()</code> returns both the next state and how long to wait for it.

📌 **Interview term: Pure function** — no timers, no DOM, same answer for the same input, so every transition can be unit-tested directly.

### The component

~~~vue
<script setup>
import { computed, ref, watch } from "vue";
import { START, plan, visibleText } from "../typewriterMachine";

const props = defineProps({
  prefix: { type: String, required: true },
  words: { type: Array, required: true },
  typeMs: { type: Number, default: 100 },
  deleteMs: { type: Number, default: 50 },
  holdMs: { type: Number, default: 1000 },
  gapMs: { type: Number, default: 300 },
});

const state = ref(START);
const paused = ref(false);
const text = computed(() => visibleText(state.value, props.words));

// Exactly one pending timeout: each step
// schedules the next, and onCleanup
// cancels it before the watcher re-runs or when the component unmounts.
watch(
  [
    state,
    paused,
    () => props.words,
    () => props.typeMs,
    () => props.deleteMs,
    () => props.holdMs,
    () => props.gapMs,
  ],
  (
    [s, isPaused, words, typeMs, deleteMs, holdMs, gapMs],
    _old,
    onCleanup,
  ) => {
    if (isPaused) return;
    const { delay, next } = plan(s, words, {
      typeMs,
      deleteMs,
      holdMs,
      gapMs,
    });
    const id = setTimeout(() => (state.value = next), delay);
    onCleanup(() => clearTimeout(id));
  },
  { immediate: true },
);
</script>

<template>
  <div class="tw">
    <p class="line">
      <span class="sr-only">{{ prefix + " " + words.join(", ") }}</span>
      <span aria-hidden="true">{{ prefix }} <span class="word" data-testid="word">{{ text }}</span><span :class="['caret', { still: paused }]" /></span>
    </p>
    <button
      type="button"
      :aria-pressed="paused"
      data-testid="pause"
      @click="paused = !paused"
    >Pause animation</button>
  </div>
</template>

<style scoped>
.line {
  min-height: 1.4em;
  margin: 0 0 20px;
  font-size: clamp(1.4rem, 7vw, 2rem);
  font-weight: 700;
}
.word {
  color: #c084fc;
}
.caret {
  display: inline-block;
  width: 3px;
  height: 1.1em;
  margin-left: 3px;
  vertical-align: -0.15em;
  background: #e9d5ff;
  animation: blink 1s steps(1) infinite;
}
.caret.still {
  animation: none;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .caret {
    animation: none;
  }
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
button {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #e2e8f0;
  font: inherit;
  cursor: pointer;
}
button[aria-pressed="true"] {
  background: #6b21a8;
  border-color: #c084fc;
}
button:focus-visible {
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
}
</style>
~~~

📌 **Interview term: Watcher cleanup** — the <code>onCleanup</code> argument registers a function Vue runs before the watcher's next run and when it stops; watchers created in <code>&lt;script setup&gt;</code> stop on unmount. Each step therefore clears the previous timeout before arming the next, so at most one is ever pending. See [watch vs watchEffect](/interview-question/what-is-the-difference-between-watch-and-watcheffect).

Why a getter for each prop in the source array (<code>() =&gt; props.typeMs</code>)? A watch source must be a ref, a reactive object or a getter. <code>props.typeMs</code> by itself is just a number read once, so it would never trigger. The getters make a parent changing a timing restart the current step with the new value.

📌 **Interview term: watch with immediate** — <code>{ immediate: true }</code> runs the callback once at setup, which arms the first timeout without a separate <code>onMounted</code>.

📌 **Interview term: Visually hidden text (sr-only)** — the full sentence sits in a <code>.sr-only</code> span that is clipped to 1 px but stays in the accessibility tree, and the animated copy is <code>aria-hidden="true"</code>. Screen readers hear "I build with React, Vue, Angular" once, never "R, Re, Rea".

📌 **Interview term: WCAG 2.2.2 Pause, Stop, Hide** — auto-starting motion that lasts over five seconds needs a pause control ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)). The button toggles <code>paused</code> with <code>:aria-pressed</code>, and the caret's CSS blink also turns off under <code>prefers-reduced-motion</code>.

The parent passes kebab-case props (<code>:type-ms="100"</code>); Vue maps them to the camelCase <code>typeMs</code> declared in <code>defineProps</code>. See [props in Vue](/interview-question/what-are-props-in-vue-and-how-do-you-validate-them).

## 4. Verified

Timings from <code>App.vue</code>: 100 ms per typed letter, 50 ms per deleted letter, 1000 ms hold, 300 ms gap. A preloaded wrapper counted the solution's timeouts. The driver waited for the gap after "React", then recorded each change, the time between changes rounded to 50 ms, the most timeouts pending at once, and a pause:

~~~text
RENDERED: Typewriter EffectI build with React, Vue, AngularI build with Pause animation
screen-reader text: I build with React, Vue, Angular | animated part aria-hidden: true
after mount: created 1 timeout(s) + 0 interval(s), cleared 0, pending now 1
frames  : V > Vu > Vue > Vu > V > (empty) > A > An > Ang > Angu > Angul > Angula > Angular > Angula
ms between frames (rounded to 50): 100 100 1050 50 50 400 100 100 100 100 100 100 1050
most timers pending at once: 1
paused  : "Angula" -> 0.7 s later "Angula" | aria-pressed true | pending timers: 0
resumed : "" | created 37 timeout(s) + 0 interval(s), cleared 1, pending now 1
timers after unmount: 37 timeout(s) + 0 interval(s) created, 2 cleared, 0 still pending
~~~

- One timeout after mount (Vue mounts once).
- 100 ms per letter typed, 1050 ms from the full word to the first deletion (1000 ms hold + 50 ms), 50 ms per letter deleted, 400 ms from empty to the next word's first letter (300 + 100).
- Never more than one timeout pending; zero while paused; 0 after unmount.

## 5. Edge Cases and Accessibility

| Case | Behaviour |
| :--- | :--- |
| Last word | <code>% words.length</code> loops to the first |
| Parent changes a timing | The prop getter triggers the watcher, which restarts the current step |
| Pause | No timer while paused; Resume re-arms the current step |
| Unmount | Watcher stops, cleanup clears the timeout |
| Screen readers | Hidden full sentence; animated text <code>aria-hidden</code> |
| Motion | Pause button and no caret blink under reduced motion |

## 6. Common Pitfalls

- **Nested <code>setTimeout</code>s started in <code>onMounted</code> with no handle kept**: impossible to cancel on unmount or pause.
- **Watching <code>props.typeMs</code> directly** instead of <code>() =&gt; props.typeMs</code>: checked: Vue logs "Invalid watch source: 100 A watch source can only be a getter/effect function, a ref, a reactive object, or an array of these types." and that entry never triggers.
- **A <code>setInterval</code> with phase flags**: one period cannot express four different delays.
- **Animating text that screen readers read**: hide the animation, expose the full sentence.
- **No pause control**: fails WCAG 2.2.2 for infinite motion.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Machine:</strong> <span style="color:#f0e2c8;">"State is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ index, count, deleting }</code>; a pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">plan()</code> gives the next state and the delay for typing, holding, deleting and the gap."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. One timer:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on the state, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">paused</code> and prop getters arms one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> clears it before every re-run and on unmount."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Props:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineProps</code> with defaults for the four timings; getters in the watch source so a parent change takes effect."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Template:</strong> <span style="color:#f0e2c8;">"A computed visible text, a CSS caret with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">steps(1)</code> blinking, and a Pause button with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:aria-pressed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"A hidden full sentence, the animation <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-hidden</code>, Pause for WCAG 2.2.2, no blink under reduced motion."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you write it with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watchEffect</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">state.value</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">paused.value</code> and the props inside, and register cleanup with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> or Vue 3.5 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onWatcherCleanup()</code>. Dependencies are then implicit; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> lists them explicitly, which is easier to review.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you extract a composable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTypewriter(words, timings)</code> holding the refs and the watcher and returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ text, paused }</code>; pass refs or getters so it stays reactive.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Pause restarts the current step. Can you avoid that?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Record when the pending step should fire, bank the remaining time on Pause, and on Resume schedule only that remainder, as the traffic light does.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">plan()</code> per phase; mount with Vue Test Utils and Vitest fake timers, advance 500 ms and expect React, advance another 1050 ms and expect Reac.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Finite state machine (FSM)** | One state at a time and a function for the next |
| **Pure function** | Same input, same output, no side effects |
| **Watcher cleanup** | <code>onCleanup</code>, run before re-runs and when the watcher stops |
| **watch with immediate** | A watcher that also runs once at setup |
| **Visually hidden text (sr-only)** | Hidden on screen, read by screen readers |
| **WCAG 2.2.2 Pause, Stop, Hide** | Auto-moving content over 5 s must be pausable |

---

**Conclusion:** The Vue typewriter is a pure four-phase machine, a ref for its state and one watcher whose cleanup guarantees a single pending timeout. Props with getters keep it configurable, and a hidden sentence plus a Pause button keep it accessible. The [Countdown Timer](/interview-question/build-a-countdown-timer) uses the same watcher-owned timer for a deadline.`,
        files: {
          "/src/App.vue": `<script setup>
import Typewriter from "./components/Typewriter.vue";

const words = ["React", "Vue", "Angular"];
</script>

<template>
  <main class="page">
    <section class="card">
      <h1 class="title">Typewriter Effect</h1>
      <Typewriter
        prefix="I build with"
        :words="words"
        :type-ms="100"
        :delete-ms="50"
        :hold-ms="1000"
        :gap-ms="300"
      />
    </section>
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0b1120;
  color: #e2e8f0;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.card {
  width: 100%;
  max-width: 480px;
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 24px 16px;
  box-sizing: border-box;
  text-align: center;
}
.title {
  margin: 0 0 16px;
  font-size: 1rem;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
`,
          "/src/components/Typewriter.vue": `<script setup>
import { computed, ref, watch } from "vue";
import { START, plan, visibleText } from "../typewriterMachine";

const props = defineProps({
  prefix: { type: String, required: true },
  words: { type: Array, required: true },
  typeMs: { type: Number, default: 100 },
  deleteMs: { type: Number, default: 50 },
  holdMs: { type: Number, default: 1000 },
  gapMs: { type: Number, default: 300 },
});

const state = ref(START);
const paused = ref(false);
const text = computed(() => visibleText(state.value, props.words));

// Exactly one pending timeout: each step schedules the next, and onCleanup
// cancels it before the watcher re-runs or when the component unmounts.
watch(
  [
    state,
    paused,
    () => props.words,
    () => props.typeMs,
    () => props.deleteMs,
    () => props.holdMs,
    () => props.gapMs,
  ],
  ([s, isPaused, words, typeMs, deleteMs, holdMs, gapMs], _old, onCleanup) => {
    if (isPaused) return;
    const { delay, next } = plan(s, words, { typeMs, deleteMs, holdMs, gapMs });
    const id = setTimeout(() => (state.value = next), delay);
    onCleanup(() => clearTimeout(id));
  },
  { immediate: true },
);
</script>

<template>
  <div class="tw">
    <p class="line">
      <span class="sr-only">{{ prefix + " " + words.join(", ") }}</span>
      <span aria-hidden="true">{{ prefix }} <span class="word" data-testid="word">{{ text }}</span><span :class="['caret', { still: paused }]" /></span>
    </p>
    <button
      type="button"
      :aria-pressed="paused"
      data-testid="pause"
      @click="paused = !paused"
    >Pause animation</button>
  </div>
</template>

<style scoped>
.line {
  min-height: 1.4em;
  margin: 0 0 20px;
  font-size: clamp(1.4rem, 7vw, 2rem);
  font-weight: 700;
}
.word {
  color: #c084fc;
}
.caret {
  display: inline-block;
  width: 3px;
  height: 1.1em;
  margin-left: 3px;
  vertical-align: -0.15em;
  background: #e9d5ff;
  animation: blink 1s steps(1) infinite;
}
.caret.still {
  animation: none;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .caret {
    animation: none;
  }
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
button {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #e2e8f0;
  font: inherit;
  cursor: pointer;
}
button[aria-pressed="true"] {
  background: #6b21a8;
  border-color: #c084fc;
}
button:focus-visible {
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
}
</style>
`,
          "/src/typewriterMachine.js": `// The typewriter as a pure state machine. Given where we are, return how long
// to wait and what the next state is. No timers in here, so it is easy to test.
//   typing   -> one more character every typeMs
//   full     -> hold for holdMs, then start deleting
//   deleting -> one less character every deleteMs
//   empty    -> wait gapMs, then type the next word (looping)
export const START = { index: 0, count: 0, deleting: false };

export function plan(state, words, t) {
  const word = words[state.index];
  if (!state.deleting && state.count < word.length)
    return { delay: t.typeMs, next: { ...state, count: state.count + 1 } };
  if (!state.deleting)
    return { delay: t.holdMs, next: { ...state, deleting: true } };
  if (state.count > 0)
    return { delay: t.deleteMs, next: { ...state, count: state.count - 1 } };
  return {
    delay: t.gapMs,
    next: {
      index: (state.index + 1) % words.length,
      count: 0,
      deleting: false,
    },
  };
}

export const visibleText = (state, words) =>
  words[state.index].slice(0, state.count);
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Beginners preparing for a frontend machine coding round in Angular. You know components and the idea of signals; state machines, effects with cleanup, inputs and screen-reader techniques are explained from zero.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The output under "Verified" was printed by booting this exact solution on Angular 22.2.3 in jsdom, AOT-compiled with strict templates and JIT-compiled as in the playground.

## 1. A Story First

A typist shows off: types "React" one key at a time, admires it, backspaces it away, waits, types "Vue". Never two keys at once, always one next move. Build it that way: a machine with four moods (typing, holding, deleting, waiting) and one timer for the next keypress. The [Traffic Light](/interview-question/build-a-traffic-light) uses the same engine.

## 2. Requirements and Plan

A prefix plus a looping word; configurable type, delete, hold and gap timings; a blinking caret; a Pause button; screen readers hear the full sentence once; exactly one timer; nothing after destroy.

| Piece | Angular tool | Why |
| :--- | :--- | :--- |
| <code>prefix</code> | <code>@Input()</code> | Static text |
| Words, timings | <code>@Input()</code> setters writing signals | Inputs that the effect can react to |
| <code>state</code>, <code>paused</code> | <code>signal</code> | The machine and the toggle |
| Visible text | <code>computed</code> | Derived |
| The timer | <code>effect((onCleanup) =&gt; ...)</code> | One timeout per step |

📌 **Interview term: Input setter feeding a signal** — the playground compiles Angular at runtime, where signal-based <code>input()</code> does not register, so the solution uses decorator inputs. Making each <code>@Input()</code> a setter that writes a signal keeps the reactive model: the effect reads the signals, so a parent changing a timing restarts the current step. Background in [signal inputs vs @Input](/interview-question/signal-inputs-input-vs-input-what-changes-in-angular-17-1).

## 3. Build It

### The machine (no timers, no Angular)

~~~ts
// The typewriter as a pure state machine.
// Given where we are, return how long
// to wait and what the next state is. No
// timers in here, so it is easy to test.
//   typing   -> one more character every typeMs
//   full     -> hold for holdMs, then start deleting
//   deleting -> one less character every deleteMs
//   empty    -> wait gapMs, then type the next word (looping)
export interface TypeState {
  index: number;
  count: number;
  deleting: boolean;
}
export interface Timing {
  typeMs: number;
  deleteMs: number;
  holdMs: number;
  gapMs: number;
}

export const START: TypeState = { index: 0, count: 0, deleting: false };

export function plan(
  state: TypeState,
  words: string[],
  t: Timing,
): { delay: number; next: TypeState } {
  const word = words[state.index];
  if (!state.deleting && state.count < word.length)
    return {
      delay: t.typeMs,
      next: { ...state, count: state.count + 1 },
    };
  if (!state.deleting)
    return { delay: t.holdMs, next: { ...state, deleting: true } };
  if (state.count > 0)
    return {
      delay: t.deleteMs,
      next: { ...state, count: state.count - 1 },
    };
  return {
    delay: t.gapMs,
    next: {
      index: (state.index + 1) % words.length,
      count: 0,
      deleting: false,
    },
  };
}

export const visibleText = (state: TypeState, words: string[]) =>
  words[state.index].slice(0, state.count);
~~~

📌 **Interview term: Finite state machine (FSM)** — one state at a time and a pure <code>plan()</code> that returns the next state and the delay before it.

📌 **Interview term: Pure function** — no side effects, so every transition can be tested with plain assertions.

### The component

~~~ts
// typewriter.component.ts (class)
export class TypewriterComponent {
  @Input({ required: true }) prefix = "";
  // Inputs feed signals, so the effect
  // below re-runs if a parent changes them.
  @Input({ required: true }) set wordList(v: string[]) {
    this.words.set(v);
  }
  @Input() set typeMs(v: number) {
    this.timing.update((t) => ({ ...t, typeMs: v }));
  }
  @Input() set deleteMs(v: number) {
    this.timing.update((t) => ({ ...t, deleteMs: v }));
  }
  @Input() set holdMs(v: number) {
    this.timing.update((t) => ({ ...t, holdMs: v }));
  }
  @Input() set gapMs(v: number) {
    this.timing.update((t) => ({ ...t, gapMs: v }));
  }

  readonly words = signal<string[]>([""]);
  readonly timing = signal({
    typeMs: 100,
    deleteMs: 50,
    holdMs: 1000,
    gapMs: 300,
  });
  readonly state = signal(START);
  readonly paused = signal(false);
  readonly text = computed(() =>
    visibleText(this.state(), this.words()),
  );

  constructor() {
    // Exactly one pending timeout: each step
    // schedules the next, and onCleanup
    // cancels it before the effect re-runs
    // or when the component is destroyed.
    effect((onCleanup) => {
      if (this.paused()) return;
      const { delay, next } = plan(
        this.state(),
        this.words(),
        this.timing(),
      );
      const id = setTimeout(() => this.state.set(next), delay);
      onCleanup(() => clearTimeout(id));
    });
  }
}
~~~

📌 **Interview term: effect with onCleanup** — the effect reads <code>paused()</code>, <code>state()</code>, <code>words()</code> and <code>timing()</code>; when any changes, Angular runs the cleanup (clearing the pending timeout) and then the effect again. The cleanup also runs on destroy. Starting and stopping a timer from signals is the legitimate use of <code>effect</code>, as opposed to copying signals into other signals; see [when not to use effect](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it).

The input is named <code>wordList</code> so it does not collide with the <code>words</code> signal it writes. Effects created in the constructor first run during change detection, after the parent has set the inputs, so the first <code>plan()</code> already sees the real words (checked with a separate driver: the first pending timeout was the 100 ms typing step, and the word read "Re" about 280 ms after bootstrap).

### The template

~~~html
<p class="line">
  <span class="sr-only">{{ prefix + " " + words().join(", ") }}</span>
  <span aria-hidden="true">{{ prefix }} <span class="word" data-testid="word">{{ text() }}</span><span class="caret" [class.still]="paused()"></span></span>
</p>
<button
  type="button"
  [attr.aria-pressed]="paused()"
  data-testid="pause"
  (click)="paused.set(!paused())"
>Pause animation</button>
~~~

📌 **Interview term: Visually hidden text (sr-only)** — the full sentence is clipped to 1 px but stays readable to screen readers; the animated copy is <code>aria-hidden</code>, so nobody hears "R, Re, Rea".

📌 **Interview term: WCAG 2.2.2 Pause, Stop, Hide** — auto-starting motion longer than five seconds needs a pause control ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)). <code>[attr.aria-pressed]</code> exposes the toggle state; the caret blink stops when paused and under <code>prefers-reduced-motion</code>.

The parent binds <code>[wordList]="words"</code> to a readonly array field and literal numbers for the timings.

## 4. Verified

Timings 100 / 50 / 1000 / 300 ms from the parent. A preloaded wrapper counted only the component's timeouts. The driver waited for the gap after "React", then recorded each change, the time between changes rounded to 50 ms, the most timeouts pending at once, and a pause.

AOT with strict templates:

~~~text
RENDERED: Typewriter EffectI build with React, Vue, AngularI build with Pause animation
screen-reader text: I build with React, Vue, Angular | animated part aria-hidden: true
after mount: created 1 timeout(s) + 0 interval(s), cleared 0, pending now 1
frames  : V > Vu > Vue > Vu > V > (empty) > A > An > Ang > Angu > Angul > Angula > Angular > Angula
ms between frames (rounded to 50): 100 100 1050 50 50 400 100 100 100 100 100 100 1050
most timers pending at once: 1
paused  : "Angula" -> 0.7 s later "Angula" | aria-pressed true | pending timers: 0
resumed : "" | created 37 timeout(s) + 0 interval(s), cleared 1, pending now 1
timers after unmount: 37 timeout(s) + 0 interval(s) created, 2 cleared, 0 still pending
~~~

JIT, as in the playground:

~~~text
RENDERED: Typewriter EffectI build with React, Vue, AngularI build with Pause animation
screen-reader text: I build with React, Vue, Angular | animated part aria-hidden: true
after mount: created 1 timeout(s) + 0 interval(s), cleared 0, pending now 1
frames  : V > Vu > Vue > Vu > V > (empty) > A > An > Ang > Angu > Angul > Angula > Angular > Angula
ms between frames (rounded to 50): 100 100 1050 50 50 400 100 100 100 100 100 100 1050
most timers pending at once: 1
paused  : "Angula" -> 0.7 s later "Angula" | aria-pressed true | pending timers: 0
resumed : "" | created 37 timeout(s) + 0 interval(s), cleared 1, pending now 1
timers after unmount: 37 timeout(s) + 0 interval(s) created, 2 cleared, 0 still pending
~~~

- One timeout after bootstrap, and the cycle ran in the right order with the right gaps: 100 ms per letter, 1050 ms hold-plus-first-delete, 50 ms per deletion, 400 ms gap-plus-first-letter.
- Never more than one pending timeout; zero while paused; 0 after destroy.

## 5. Edge Cases and Accessibility

| Case | Behaviour |
| :--- | :--- |
| Last word | <code>% words.length</code> loops to the first |
| Parent changes an input | The setter writes a signal, the effect restarts the current step |
| Pause | No timer while paused; Resume re-arms the current step |
| Destroy | <code>onCleanup</code> clears the timeout |
| Zoneless rendering | Each step is a signal write, which schedules the render |
| Screen readers | Hidden full sentence, animated part hidden |

## 6. Common Pitfalls

- **Plain <code>@Input()</code> fields read inside the effect**: the effect does not track them, so later changes are ignored. Feed signals from setters.
- **Signal <code>input()</code> in the playground**: it does not register under the runtime JIT used there; decorator inputs do.
- **Several timers per step** (one to type, one to schedule deleting): they overlap on pause or destroy. One timeout per step, always cleaned up.
- **Animating text that screen readers read**: hide it and expose the full sentence once.
- **No pause control**: fails WCAG 2.2.2.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Machine:</strong> <span style="color:#f0e2c8;">"State is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ index, count, deleting }</code>; a pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">plan()</code> returns the next state and the delay for typing, holding, deleting and the gap."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. One timer:</strong> <span style="color:#f0e2c8;">"An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> reads the state, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">paused</code>, words and timings, arms one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> clears it before every re-run and on destroy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Inputs:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Input()</code> setters write signals so the effect reacts to parent changes; that also works under the playground JIT."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Template:</strong> <span style="color:#f0e2c8;">"A computed visible text, a CSS caret blinking with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">steps(1)</code>, and a Pause button with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[attr.aria-pressed]</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"A hidden full sentence, the animation <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-hidden</code>, Pause for WCAG 2.2.2, no blink under reduced motion."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In a normal Angular CLI app, would you use signal inputs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeMs = input(100)</code> gives a signal directly, so the setters disappear. They are avoided here only because the playground compiles at runtime, where signal inputs do not register.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could RxJS replace the effect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toObservable(this.state)</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timer(delay)</code> cancels the previous step automatically; you still need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">takeUntilDestroyed</code>. The effect does the same with fewer moving parts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you keep progress through Pause?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Record when the pending step fires, bank the remainder on Pause, and schedule only that remainder on Resume, like the traffic light.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">plan()</code> per phase. In TestBed with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fakeAsync</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(500)</code> and expect React, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(1050)</code> and expect Reac, calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code> between.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Input setter feeding a signal** | A decorator input that writes a signal on change |
| **Finite state machine (FSM)** | One state at a time and a function for the next |
| **Pure function** | Same input, same output, no side effects |
| **effect with onCleanup** | Signal-driven side effect with teardown |
| **Visually hidden text (sr-only)** | Hidden on screen, read by screen readers |
| **WCAG 2.2.2 Pause, Stop, Hide** | Auto-moving content over 5 s must be pausable |

---

**Conclusion:** The Angular typewriter is a pure four-phase machine, signals fed by input setters, and one effect whose cleanup guarantees a single pending timeout. A hidden sentence and a Pause button make it accessible. The [Countdown Timer](/interview-question/build-a-countdown-timer) uses the same effect-owned timer for a deadline.`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation } from "@angular/core";
import { TypewriterComponent } from "./typewriter.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [TypewriterComponent],
  template: \`
    <main class="page">
      <section class="card">
        <h1 class="title">Typewriter Effect</h1>
        <app-typewriter
          prefix="I build with"
          [wordList]="words"
          [typeMs]="100"
          [deleteMs]="50"
          [holdMs]="1000"
          [gapMs]="300"
        />
      </section>
    </main>
  \`,
  encapsulation: ViewEncapsulation.None, // page-level rules, global on purpose
  styles: [
    \`
      body {
        margin: 0;
        background: #0b1120;
        color: #e2e8f0;
        font-family: system-ui, sans-serif;
      }
      .page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 16px;
        box-sizing: border-box;
      }
      .card {
        width: 100%;
        max-width: 480px;
        background: #111827;
        border: 1px solid #1f2937;
        border-radius: 16px;
        padding: 24px 16px;
        box-sizing: border-box;
        text-align: center;
      }
      .title {
        margin: 0 0 16px;
        font-size: 1rem;
        font-weight: 600;
        color: #94a3b8;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
    \`,
  ],
})
export class AppComponent {
  readonly words = ["React", "Vue", "Angular"];
}
`,
          "/src/app/typewriter-machine.ts": `// The typewriter as a pure state machine. Given where we are, return how long
// to wait and what the next state is. No timers in here, so it is easy to test.
//   typing   -> one more character every typeMs
//   full     -> hold for holdMs, then start deleting
//   deleting -> one less character every deleteMs
//   empty    -> wait gapMs, then type the next word (looping)
export interface TypeState {
  index: number;
  count: number;
  deleting: boolean;
}
export interface Timing {
  typeMs: number;
  deleteMs: number;
  holdMs: number;
  gapMs: number;
}

export const START: TypeState = { index: 0, count: 0, deleting: false };

export function plan(
  state: TypeState,
  words: string[],
  t: Timing,
): { delay: number; next: TypeState } {
  const word = words[state.index];
  if (!state.deleting && state.count < word.length)
    return { delay: t.typeMs, next: { ...state, count: state.count + 1 } };
  if (!state.deleting)
    return { delay: t.holdMs, next: { ...state, deleting: true } };
  if (state.count > 0)
    return { delay: t.deleteMs, next: { ...state, count: state.count - 1 } };
  return {
    delay: t.gapMs,
    next: {
      index: (state.index + 1) % words.length,
      count: 0,
      deleting: false,
    },
  };
}

export const visibleText = (state: TypeState, words: string[]) =>
  words[state.index].slice(0, state.count);
`,
          "/src/app/typewriter.component.ts": `import { Component, Input, computed, effect, signal } from "@angular/core";
import { START, plan, visibleText } from "./typewriter-machine";

@Component({
  selector: "app-typewriter",
  standalone: true,
  template: \`
    <p class="line">
      <span class="sr-only">{{ prefix + " " + words().join(", ") }}</span>
      <span aria-hidden="true">{{ prefix }} <span class="word" data-testid="word">{{ text() }}</span><span class="caret" [class.still]="paused()"></span></span>
    </p>
    <button
      type="button"
      [attr.aria-pressed]="paused()"
      data-testid="pause"
      (click)="paused.set(!paused())"
    >Pause animation</button>
  \`,
  styles: [
    \`
    .line { min-height: 1.4em; margin: 0 0 20px; font-size: clamp(1.4rem, 7vw, 2rem); font-weight: 700; }
    .word { color: #c084fc; }
    .caret { display: inline-block; width: 3px; height: 1.1em; margin-left: 3px; vertical-align: -0.15em; background: #e9d5ff; animation: blink 1s steps(1) infinite; }
    .caret.still { animation: none; }
    @keyframes blink { 50% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .caret { animation: none; } }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    button { padding: 8px 16px; border-radius: 999px; border: 1px solid #334155; background: #1e293b; color: #e2e8f0; font: inherit; cursor: pointer; }
    button[aria-pressed="true"] { background: #6b21a8; border-color: #c084fc; }
    button:focus-visible { outline: 3px solid #fbbf24; outline-offset: 2px; }
  \`,
  ],
})
export class TypewriterComponent {
  @Input({ required: true }) prefix = "";
  // Inputs feed signals, so the effect below re-runs if a parent changes them.
  @Input({ required: true }) set wordList(v: string[]) {
    this.words.set(v);
  }
  @Input() set typeMs(v: number) {
    this.timing.update((t) => ({ ...t, typeMs: v }));
  }
  @Input() set deleteMs(v: number) {
    this.timing.update((t) => ({ ...t, deleteMs: v }));
  }
  @Input() set holdMs(v: number) {
    this.timing.update((t) => ({ ...t, holdMs: v }));
  }
  @Input() set gapMs(v: number) {
    this.timing.update((t) => ({ ...t, gapMs: v }));
  }

  readonly words = signal<string[]>([""]);
  readonly timing = signal({
    typeMs: 100,
    deleteMs: 50,
    holdMs: 1000,
    gapMs: 300,
  });
  readonly state = signal(START);
  readonly paused = signal(false);
  readonly text = computed(() => visibleText(this.state(), this.words()));

  constructor() {
    // Exactly one pending timeout: each step schedules the next, and onCleanup
    // cancels it before the effect re-runs or when the component is destroyed.
    effect((onCleanup) => {
      if (this.paused()) return;
      const { delay, next } = plan(this.state(), this.words(), this.timing());
      const id = setTimeout(() => this.state.set(next), delay);
      onCleanup(() => clearTimeout(id));
    });
  }
}
`,
        },
      },
    },
  },
];

export default augments;
