/**
 * Machine coding ULTRA — batch 16: grid games II (Memory flip-card game,
 * Snake, Sudoku with validation, Minesweeper, Wordle).
 *
 * Each question carries a §6 Question Body plus one bundle per framework
 * (React, Vue, Angular): a tutorial answer (story first, `📌 Interview term:`
 * callouts, `.iq-diagram` SVGs, step-by-step build, a Verified section quoting
 * real driver output, edge cases and accessibility, pitfalls, the §7 interview
 * card, a glossary and a conclusion) and a runnable multi-file solution.
 *
 * Every game keeps its rules in plain, framework-free functions (createGame,
 * flip/step/reveal/submit ...) with a seeded PRNG (mulberry32), so the UI layer
 * only decides when to call them and the drivers are deterministic.
 *
 * Every solution was booted with scripts/verify-mc-solution.mjs on React 19.3.1
 * (StrictMode), Vue 3.5.44 and Angular 22.2.3 (AOT with strictTemplates and the
 * playground's runtime JIT) in jsdom, and driven with clicks, typing and keys;
 * the Verified blocks are that output, pasted by the generator. The Snake
 * driver replaces setInterval with a manual clock (said in the answers). The
 * recursive flood-fill stack overflow quoted in Minesweeper was run on Node
 * 22.22.0 and in Chromium 141 via playwright-core, which was also used to load
 * each React build at a 360 px viewport (layout, real timers, right-click).
 *
 * Generated from the scratch sources by gen.mjs (solutions are read from the
 * verified files byte for byte). Conventions: SVG attributes double-quoted, no
 * apostrophes inside SVG diagrams, no leading H1, `description` is plain markdown.
 */
import type { MachineCodingAugment } from "./machine-coding-augments.types";

const augments: MachineCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Memory (flip-card) Game",
    seoDescription: "Build a Memory flip-card game in React, Vue and Angular: seeded Fisher-Yates shuffle, a two-card lock while mismatches flip back, timer cleanup, win check.",
    description: `**Question presented to candidate:**
"Build a memory card game. Show a 4 by 4 grid of face-down cards holding 8 pairs. The player flips two cards; if they match they stay face up, if not they flip back after a short delay. Count moves, detect the win and add a New game button. You have about 45 minutes."

**Requirements:**
- 16 cards (8 pairs), shuffled fairly, face down at the start.
- Clicking a card turns it face up. After the second card: a match stays up, a mismatch flips back after about 800 ms.
- While a mismatched pair is showing, further clicks are ignored (no third card).
- A move counter (one move per pair of flips), a pairs counter and a win message.
- New game reshuffles and resets everything, even in the middle of a flip-back delay.

**What a strong answer should cover:**
- Game rules as pure functions (\`createGame\`, \`flip\`, \`hideUnmatched\`) separate from the UI, with the shuffle's randomness injected (a seeded RNG) so it can be tested.
- A correct **Fisher-Yates** shuffle, and why \`sort(() => Math.random() - 0.5)\` is biased.
- The **lock**: deriving "two unmatched cards are open" from state instead of a separate boolean that can drift.
- The flip-back timer: started from state, cancelled on reset and unmount (effect cleanup), safe under React StrictMode.
- Accessibility: cards are real buttons, the label says face down or the symbol, a live region announces the result.

**Clarifying questions expected:**
- "How long should a mismatch stay visible, and can the player click during it?"
- "Should the grid size or number of pairs be configurable?"
- "Do you want a timer or a best score, or just moves?"

**Code / implementation expected:** Yes. A working game in the framework of your choice, with the rules in plain functions and a short explanation of the timer cleanup.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round. You know a little React (components, \`useState\`); nothing about games is assumed.
**Difficulty:** Hard

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The Verified section is real output from booting the solution on React 19.3.1 in StrictMode and clicking through it with a script.

## 1. Why This Even Matters — A Story First

Picture a deck of picture cards spread face down on a kitchen table. A child turns over two. Two apples: they stay up. An apple and a banana: everyone stares at them for a second, then they go back face down. While they are showing, nobody is allowed to grab a third card. That pause, and the "hands off" rule during it, is the whole difficulty of this question.

The game looks like a beginner exercise, but it quietly tests the things that break real apps: a timer that must be cancelled, a rule that must hold while the timer is running, randomness that has to be fair, and a reset that can arrive at any moment. Interviewers like it because a solution that "works when I click slowly" falls apart under fast clicks.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many cards, and should the size be configurable? | Decides whether the deck builder takes a \`pairs\` argument and whether the grid columns are fixed. |
| How long should a mismatch stay visible? | The flip-back delay is a constant you will name; 600 to 1000 ms is typical. |
| Can the player click during the delay? | The usual answer is no: that is the **two-card lock**. Some variants flip the old pair back immediately instead. |
| What counts as a move? | One move per pair of flips is standard; it changes the win message. |
| Do you need a timer, best score or animations? | Each is an extension; agree on the core first so you finish it. |
| Must the shuffle be testable? | If yes, inject the random source, which is what this solution does. |

## 3. Requirements and Plan

The plan has two layers. The bottom layer is **plain JavaScript** in <code>src/utils/memory.js</code>: it knows the rules and nothing about React. The top layer is two components that render the game and decide *when* to call the rules.

📌 **Interview term: Pure function** — a function whose result depends only on its arguments and which changes nothing outside itself. <code>flip(game, 3)</code> always returns the same new game for the same inputs and never edits the old one. Pure functions are trivial to unit test and safe to call twice, which matters under StrictMode (section 5).

The state model, decided before writing JSX:

| Piece | Kind | Why |
| :--- | :--- | :--- |
| <code>game.deck</code> | state (inside one object) | The shuffled symbols, fixed for one game |
| <code>game.open</code> | state | Indices that are face up but not matched: 0, 1 or 2 of them |
| <code>game.matched</code> | state | Indices that found their pair |
| <code>game.moves</code>, <code>game.seed</code> | state | Counter and the seed for the next New game |
| <code>locked</code> | **derived** | <code>open.length === 2</code>; never stored, so it can never disagree |
| <code>won</code> | **derived** | <code>matched.length === deck.length</code> |
| the flip-back timer | effect | Exists only while <code>locked</code> is true |

📌 **Interview term: Derived state** — a value you can compute from existing state. Storing it separately (a <code>isLocked</code> boolean next to <code>open</code>) creates two sources of truth that a fast click can split apart. Compute it during render instead.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 280" role="img" aria-label="State machine of the open cards: none open, one open, two open and locked, and back to none after the timer">
  <defs>
    <marker id="memr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="110" width="160" height="60" rx="10"/>
  <text class="d-text" x="110" y="136" text-anchor="middle">open = [ ]</text>
  <text class="d-sub" x="110" y="156" text-anchor="middle">waiting for a flip</text>
  <rect class="d-box" x="260" y="110" width="160" height="60" rx="10"/>
  <text class="d-text" x="340" y="136" text-anchor="middle">open = [ a ]</text>
  <text class="d-sub" x="340" y="156" text-anchor="middle">one card up</text>
  <rect class="d-box-accent" x="490" y="110" width="160" height="60" rx="10"/>
  <text class="d-text d-accent" x="570" y="136" text-anchor="middle">open = [ a, b ]</text>
  <text class="d-sub" x="570" y="156" text-anchor="middle">locked, clicks ignored</text>
  <path class="d-edge-accent" d="M 192 140 L 254 140" marker-end="url(#memr-arrow)"/>
  <text class="d-sub" x="223" y="100" text-anchor="middle">flip</text>
  <path class="d-edge-accent" d="M 422 140 L 484 140" marker-end="url(#memr-arrow)"/>
  <text class="d-sub" x="453" y="100" text-anchor="middle">no match</text>
  <path class="d-edge" d="M 340 106 C 340 40, 110 40, 110 102" marker-end="url(#memr-arrow)"/>
  <text class="d-sub" x="225" y="32" text-anchor="middle">match: both join matched</text>
  <path class="d-edge-dashed" d="M 570 174 C 570 245, 110 245, 110 178" marker-end="url(#memr-arrow)"/>
  <text class="d-sub" x="340" y="266" text-anchor="middle">after 800 ms: hideUnmatched</text>
</svg>

The board is only ever in one of three shapes. The lock is not a flag you set and forget to unset; it is simply "the right-hand box". The dashed arrow is the only transition driven by time rather than by a click, so it is the only one that needs cleanup.

The component tree is deliberately small: <code>App</code> owns the one <code>game</code> object, and <code>Card</code> is presentational (it receives props and reports clicks).

## 4. Build It Step by Step

### Step 1: a fair, injectable shuffle

~~~js
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(items, rng) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
~~~

📌 **Interview term: Seeded PRNG** — a pseudo-random number generator that produces the same sequence for the same starting number (the seed). <code>mulberry32</code> is a well-known 32-bit one in a few lines. In production you would pass <code>Math.random</code>; in tests and in this doc you pass a seed, so every run deals the same deck.

📌 **Interview term: Fisher-Yates shuffle** — walk the array from the end and swap each slot with a random slot at or before it. Every ordering is equally likely. The full derivation is in [Fisher-Yates shuffle](/interview-question/implement-fisher-yates-shuffle-in-place-unbiased).

The popular one-liner <code>arr.sort(() =&gt; Math.random() - 0.5)</code> is not fair. Measured on Node 22 (600,000 shuffles of 4 items, 24 possible orders, 25,000 expected each):

~~~text
sort(() => rng() - 0.5): {"perms":24,"min":9235,"max":112572,"expected":25000}
Fisher-Yates          : {"perms":24,"min":24577,"max":25299,"expected":25000}
~~~

One ordering came up 12 times more often than another with the sort trick. The exact numbers depend on the engine sort algorithm, which is exactly why you should not rely on it.

### Step 2: the rules as pure functions

~~~js
export const isLocked = (g) => g.open.length === 2;
export const isWon = (g) => g.matched.length === g.deck.length;

export function flip(g, i) {
  if (isLocked(g) || g.open.includes(i) || g.matched.includes(i))
    return g;
  const open = [...g.open, i];
  if (open.length === 1) return { ...g, open };
  const [a, b] = open;
  const moves = g.moves + 1;
  if (g.deck[a] === g.deck[b]) {
    return { ...g, open: [], matched: [...g.matched, a, b], moves };
  }
  return { ...g, open, moves };
}

export function hideUnmatched(g) {
  return isLocked(g) ? { ...g, open: [] } : g;
}
~~~

Read the guard line of <code>flip</code>: it is the whole lock. A click while two cards are open, a click on the card that is already open, and a click on a matched card all return the same object, so React sees no change and does not re-render. A match empties <code>open</code> immediately, so a lucky pair never locks the board.

<code>hideUnmatched</code> is also guarded: if the game is not locked any more, it does nothing. That makes a stray late timer harmless, a second line of defence behind the cleanup in step 3.

📌 **Interview term: Immutable update** — building a new object (<code>{ ...g, open }</code>) instead of editing the old one. React compares state by reference, so a mutated array would look unchanged. See [why state updates must be immutable](/interview-question/why-must-react-state-updates-be-immutable).

### Step 3: the timer lives in an effect keyed on the lock

~~~jsx
const [game, setGame] = useState(() => createGame(1));
const locked = isLocked(game);

useEffect(() => {
  if (!locked) return;
  const id = setTimeout(() => setGame(hideUnmatched), FLIP_BACK_MS);
  return () => clearTimeout(id);
}, [locked]);
~~~

The effect runs when <code>locked</code> flips. If it became true, start the 800 ms timer; the cleanup cancels it. React runs the cleanup when <code>locked</code> changes again (the New game button empties <code>open</code>) and when the component unmounts, so no timer outlives the board it was meant for. This is the standard [useEffect cleanup](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect) pattern.

📌 **Interview term: Functional update** — <code>setGame(hideUnmatched)</code> passes a function that receives the latest state. The timer callback was created 800 ms ago; if it read the <code>game</code> variable from its closure it could act on old data, the classic [stale closure](/interview-question/what-causes-stale-closures-in-react-hooks-and-how-do-you-fix-them-correctly).

📌 **Interview term: StrictMode double-invoke** — in development, React 19 mounts every component, runs its effects, cleans them up and runs them again, to flush out effects without cleanup ([why StrictMode does this](/interview-question/why-does-react-18-strictmode-double-invoke-your-components-and-effects)). Our effect survives: the first timer is cleared and the second one is the one that fires.

<div style="background:#0b1f2a;border-left:4px solid #39c5cf;border-radius:6px;padding:14px 18px;margin:18px 0;">
<span style="color:#9be3ff;font-weight:bold;">🔑 Key insight:</span> <span style="color:#d6eef5;">Start timers from <strong style="color:#9be3ff;">state</strong> (the effect runs because <code style="background:#0d2a3a;color:#9be3ff;padding:1px 5px;border-radius:3px;">locked</code> became true), not from the click handler. A timer started inside <code style="background:#0d2a3a;color:#9be3ff;padding:1px 5px;border-radius:3px;">onClick</code> has no natural owner to cancel it, so a New game click during the delay leaves it running against the next board.</span>
</div>

### Step 4: the card and the board

~~~jsx
export default function Card({
  index,
  symbol,
  faceUp,
  matched,
  onFlip,
}) {
  const label = faceUp
    ? "Card " + (index + 1) + ": " + symbol
    : "Card " + (index + 1) + ": face down";
  return (
    <button
      type="button"
      data-testid="card"
      className={
        "card" + (faceUp ? " up" : "") + (matched ? " done" : "")
      }
      aria-label={label}
      disabled={matched}
      onClick={() => onFlip(index)}
    >
      {faceUp ? symbol : ""}
    </button>
  );
}
~~~

A face-down card renders no symbol at all, so the answer cannot be read from the DOM or the accessibility tree. The board passes <code>onFlip={(idx) =&gt; setGame((g) =&gt; flip(g, idx))}</code>, and the key is <code>game.seed + "-" + i</code>, so New game gives every card a new key and React rebuilds them from scratch (the same idea as [resetting state with the key prop](/interview-question/how-can-the-key-prop-be-used-to-deliberately-reset-component-state)).

The status line is a <code>role="status"</code> live region: it announces "No match. Flipping back..." and the win message without stealing focus.

## 5. Verified

The solution was bundled with esbuild, rendered with <code>createRoot(...).render(&lt;StrictMode&gt;&lt;App /&gt;&lt;/StrictMode&gt;)</code> in jsdom, and driven by a script that clicks real buttons and lets real time pass. The driver imports the same <code>createGame(1)</code> to know where the pairs are. <code>?</code> is a face-down card:

~~~text
RENDERED: MemoryMoves: 0 · Pairs: 0/8New game
seed 1 deck: 🥝 🍋 🍌 🍑 🍋 🍇 🍎 🍍 🍌 🍑 🍒 🍒 🥝 🍍 🍎 🍇
after mismatch 1+2: 🥝 🍋 ? ? ? ? ? ? ? ? ? ? ? ? ? ? | Moves: 1 · Pairs: 0/8 | No match. Flipping back...
click card 3 while locked: 🥝 🍋 ? ? ? ? ? ? ? ? ? ? ? ? ? ?
after 900 ms: ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? | Moves: 1 · Pairs: 0/8 | 
solved: 🥝 🍋 🍌 🍑 🍋 🍇 🍎 🍍 🍌 🍑 🍒 🍒 🥝 🍍 🍎 🍇 | Moves: 9 · Pairs: 8/8 | You won in 9 moves!
disabled cards: 16
new game: ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? | Moves: 0 · Pairs: 0/8 | 
reset while locked, open card 1, wait 900 ms: 🍍 ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? | Moves: 0 · Pairs: 0/8 |
~~~

What this proves, line by line: the seeded deck is identical on every run; after a mismatch exactly two cards are up and the status announces it; a third click during the lock changes nothing; after 900 ms both cards are face down and the move still counts; solving the board takes 9 moves (the one wasted mismatch plus eight pairs) and disables all 16 cards; New game resets the counters; and pressing New game during a lock does not leak the old timer (the card opened on the new board is still up 900 ms later).

## 6. Edge Cases and Accessibility

| Case | What the solution does |
| :--- | :--- |
| Double click on one card | <code>open.includes(i)</code> guard: the second click is ignored, it cannot match with itself |
| Third click during the delay | <code>isLocked</code> guard returns the same state |
| New game during the delay | <code>locked</code> becomes false, effect cleanup clears the timer |
| Unmount during the delay | Effect cleanup clears the timer; no update on an unmounted tree |
| Keyboard | Cards are <code>&lt;button&gt;</code>s: Tab to move, Enter or Space to flip |
| Screen reader | Label "Card 3: face down" or "Card 3: 🍎"; live region announces mismatch and win; <code>aria-busy</code> on the grid while locked |
| Matched cards | <code>disabled</code>, so they leave the tab order and cannot be clicked |
| Small screens | 4-column CSS grid with <code>aspect-ratio: 1</code> cards inside a 360 px column |

jsdom has no layout or paint, so the driver checked DOM state and timing only. A separate check in Chromium 141 (playwright-core, 360 px wide viewport) loaded the React build, flipped a mismatched pair and read the live region, and found no horizontal scroll (360 px of document width). The CSS transition itself was only looked at, not measured.

## 7. Common Pitfalls

- **A separate <code>isLocked</code> boolean.** Set on the second click, cleared in the timeout, and one day a code path forgets to clear it. Derive it from <code>open.length</code>.
- **Starting the timeout inside the click handler without keeping its id.** New game during the delay then flips cards on the new board. Own the timer in an effect (or keep the id in a [ref](/interview-question/describe-the-useref-hook-and-its-typical-use-cases) and clear it on reset).
- **Reading <code>game</code> inside the timeout.** The closure holds the render it was created in. Use a functional update.
- **<code>sort(() =&gt; Math.random() - 0.5)</code>.** Measurably biased (section 4). Use Fisher-Yates and inject the random source.
- **Comparing card objects by identity or index.** Compare symbols (<code>deck[a] === deck[b]</code>), and store indices in <code>open</code> so two cards with the same symbol are still distinguishable.
- **Putting the symbol in the DOM of face-down cards** (hidden with CSS). Anyone can read it in devtools or with a screen reader.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Sixteen cards, eight pairs, mismatches flip back after about 800 ms and clicks are ignored meanwhile; moves count pairs of flips. I will keep the rules in plain functions."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Model the state:</strong> <span style="color:#f0e2c8;">"One game object: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deck</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">open</code> indices, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matched</code> indices, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moves</code>. Locked and won are derived from it, never stored."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Write the rules:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createGame(seed)</code> deals with a seeded Fisher-Yates, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flip</code> adds a card and resolves the pair, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hideUnmatched</code> clears a locked pair. All pure, so I can test them without React."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Wire the UI:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">App</code> holds the game in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code>, cards are buttons that call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setGame(g =&gt; flip(g, i))</code>, and an effect keyed on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">locked</code> starts the flip-back timer with a cleanup."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it:</strong> <span style="color:#f0e2c8;">"Fast clicks, a third click during the lock, New game mid-delay, and a full solve in nine moves; then labels and a live region for screen readers."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a game timer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startedAt</code> on the first flip and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finishedAt</code> on the win, both in state. Render elapsed time from a 1-second interval in an effect that only runs while the game is in progress, and clean it up. Never count seconds by incrementing a number in the interval, because intervals drift and pause in background tabs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you unit test the shuffle and the rules?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because they are pure, call them directly: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createGame(1)</code> must always give the same deck, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flip</code> on a locked game must return the same object, and a matching pair must empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">open</code>. For fairness, shuffle a small array many times with a seeded RNG and check every ordering appears close to equally often.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useEffect</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setTimeout</code> in the click handler?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The effect ties the timer to the state that needs it and gives a cleanup that runs on reset and unmount. A handler timer has no owner; you would have to keep its id in a ref and remember to clear it in every reset path.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you animate a 3D flip?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Render both faces inside the card, rotate the inner element with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transform: rotateY(180deg)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">backface-visibility: hidden</code>, and keep the flip-back delay longer than the transition. Respect <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefers-reduced-motion</code> by turning the transition off.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useReducer</code> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, and it fits well: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flip</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hide</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reset</code> become actions and the existing pure functions become the reducer cases. The behaviour is the same; it mainly helps when more actions arrive. See the useState vs useReducer comparison.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pure function** | Result depends only on the inputs, changes nothing outside |
| **Derived state** | A value computed from state during render instead of stored |
| **Seeded PRNG** | Repeatable random numbers from a starting seed |
| **Fisher-Yates shuffle** | Unbiased in-place shuffle that swaps each slot with a random earlier one |
| **Immutable update** | Make a new object or array instead of editing the old one |
| **Functional update** | <code>setState(prev =&gt; next)</code>, always sees the latest state |
| **StrictMode double-invoke** | Development-only extra mount, effect and cleanup run to catch missing cleanup |
| **Two-card lock** | Ignoring clicks while a mismatched pair is face up |

---

**Conclusion:** A memory game is three ideas done carefully. Keep the rules in pure functions with an injected random source, so the deck is fair and testable. Derive the lock from the open cards instead of storing a flag. And let the flip-back timer be owned by an effect that starts when the board locks and is cleaned up on reset and unmount. With those in place, fast clicks, mid-delay resets and StrictMode all behave, and the same rules file drives the [Wordle](/interview-question/build-wordle) and [Minesweeper](/interview-question/build-minesweeper) style of build too.`,
        files: {
          "/App.js": `import { useEffect, useState } from "react";
import Card from "./src/components/Card";
import { createGame, flip, hideUnmatched, isLocked, isWon } from "./src/utils/memory";

const FLIP_BACK_MS = 800;

export default function App() {
  const [game, setGame] = useState(() => createGame(1));
  const locked = isLocked(game);
  const won = isWon(game);

  // The flip-back timer is derived from state: it exists only while two
  // unmatched cards are face up, and the cleanup cancels it on reset/unmount.
  useEffect(() => {
    if (!locked) return;
    const id = setTimeout(() => setGame(hideUnmatched), FLIP_BACK_MS);
    return () => clearTimeout(id);
  }, [locked]);

  return (
    <main className="memory">
      <h1>Memory</h1>
      <div className="bar">
        <span data-testid="moves">
          Moves: {game.moves} · Pairs: {game.matched.length / 2}/
          {game.deck.length / 2}
        </span>
        <button
          type="button"
          onClick={() => setGame((g) => createGame(g.seed + 1))}
        >
          New game
        </button>
      </div>
      <div className="grid" role="group" aria-label="Cards" aria-busy={locked}>
        {game.deck.map((symbol, i) => (
          <Card
            key={game.seed + "-" + i}
            index={i}
            symbol={symbol}
            faceUp={game.open.includes(i) || game.matched.includes(i)}
            matched={game.matched.includes(i)}
            onFlip={(idx) => setGame((g) => flip(g, idx))}
          />
        ))}
      </div>
      <p className="status" role="status" data-testid="status">
        {won
          ? "You won in " + game.moves + " moves!"
          : locked
            ? "No match. Flipping back..."
            : ""}
      </p>
    </main>
  );
}
`,
          "/src/components/Card.js": `export default function Card({ index, symbol, faceUp, matched, onFlip }) {
  const label = faceUp
    ? "Card " + (index + 1) + ": " + symbol
    : "Card " + (index + 1) + ": face down";
  return (
    <button
      type="button"
      data-testid="card"
      className={"card" + (faceUp ? " up" : "") + (matched ? " done" : "")}
      aria-label={label}
      disabled={matched}
      onClick={() => onFlip(index)}
    >
      {faceUp ? symbol : ""}
    </button>
  );
}
`,
          "/src/utils/memory.js": `// Pure game logic: no React, no DOM, no timers. Every function takes a game
// object and returns a new one, so the UI layer only decides WHEN to call them.

// Small seeded PRNG (mulberry32). Same seed, same sequence, every run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates: walk from the end, swap each slot with a random earlier one.
export function shuffle(items, rng) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const SYMBOLS = ["🍎", "🍌", "🍇", "🍒", "🥝", "🍋", "🍑", "🍍"];

export function createGame(seed, pairs = 8) {
  const symbols = SYMBOLS.slice(0, pairs);
  const deck = shuffle([...symbols, ...symbols], mulberry32(seed));
  return { seed, deck, open: [], matched: [], moves: 0 };
}

// Two face-up cards that do not match: the
// board ignores clicks until they flip back.
export const isLocked = (g) => g.open.length === 2;
export const isWon = (g) => g.matched.length === g.deck.length;

export function flip(g, i) {
  if (isLocked(g) || g.open.includes(i) || g.matched.includes(i)) return g;
  const open = [...g.open, i];
  if (open.length === 1) return { ...g, open };
  const [a, b] = open;
  const moves = g.moves + 1;
  if (g.deck[a] === g.deck[b]) {
    return { ...g, open: [], matched: [...g.matched, a, b], moves };
  }
  return { ...g, open, moves };
}

export function hideUnmatched(g) {
  return isLocked(g) ? { ...g, open: [] } : g;
}
`,
          "/styles.css": `:root {
  color-scheme: dark;
}
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f1115;
  color: #e8e8ea;
}
.memory {
  max-width: 360px;
  margin: 24px auto;
  padding: 0 16px;
}
.memory h1 {
  font-size: 1.3rem;
  margin: 0 0 8px;
}
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.bar button {
  background: #2a2f3a;
  color: #e8e8ea;
  border: 1px solid #3b4252;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.card {
  aspect-ratio: 1;
  border-radius: 10px;
  border: 1px solid #3b4252;
  font-size: 1.8rem;
  cursor: pointer;
  background: #1f6feb;
  color: transparent;
  transition: background 0.2s;
}
.card.up {
  background: #1c2128;
  color: inherit;
}
.card.done {
  background: #12301f;
  border-color: #2ea043;
  cursor: default;
}
.card:focus-visible {
  outline: 3px solid #f9a825;
  outline-offset: 2px;
}
.status {
  min-height: 1.4em;
  margin-top: 12px;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round in Vue. You know <code>ref</code> and templates; nothing about games is assumed.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> tag with the exact vocabulary. The Verified section is real output from mounting the solution with Vue 3.5.44 in jsdom and clicking through it with a script.

## 1. Why This Even Matters — A Story First

Turn two picture cards over on a table. Two apples stay up. An apple and a banana stay up for a second, then go back face down, and while they are showing nobody may touch a third card. That short pause and its "hands off" rule are what this question is really about: a timer, a rule that holds while the timer runs, and a reset that may arrive in the middle of it.

## 2. Requirements and Plan

Sixteen cards (eight pairs) dealt by a fair shuffle; a mismatch flips back after 800 ms; clicks during that delay are ignored; moves, pairs and a win message; New game at any moment.

The rules live in a plain <code>src/utils/memory.js</code> with no Vue in it: <code>createGame(seed)</code>, <code>flip(game, i)</code>, <code>hideUnmatched(game)</code>, <code>isLocked</code> and <code>isWon</code>. Each returns a **new** game object.

📌 **Interview term: Pure function** — output depends only on the inputs and nothing outside is changed. Pure rules can be unit tested without mounting a component, and the component just decides when to call them.

How the state maps onto Vue:

| Piece | Vue primitive | Why |
| :--- | :--- | :--- |
| the game object | <code>ref(createGame(1))</code> | One source of truth, replaced on every move |
| <code>locked</code> | <code>computed(() =&gt; isLocked(game.value))</code> | Derived: two unmatched cards open |
| <code>won</code> | <code>computed</code> | Derived: every card matched |
| flip-back timer | <code>watch(locked)</code> + a plain variable | A side effect that follows the lock |
| each card | <code>MemoryCard.vue</code> with props and an emit | Presentational; reports clicks upward |

📌 **Interview term: computed** — a cached value Vue recalculates only when the reactive data it read changes. Using it for <code>locked</code> means there is no boolean to forget to reset. More in [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch).

## 3. Build It Step by Step

### Step 1: the shuffle and the rules

The deck is built with a seeded PRNG (<code>mulberry32</code>) and a [Fisher-Yates shuffle](/interview-question/implement-fisher-yates-shuffle-in-place-unbiased), so the same seed always deals the same deck:

~~~js
export function createGame(seed, pairs = 8) {
  const symbols = SYMBOLS.slice(0, pairs);
  const deck = shuffle([...symbols, ...symbols], mulberry32(seed));
  return { seed, deck, open: [], matched: [], moves: 0 };
}

export function flip(g, i) {
  if (isLocked(g) || g.open.includes(i) || g.matched.includes(i))
    return g;
  const open = [...g.open, i];
  if (open.length === 1) return { ...g, open };
  const [a, b] = open;
  const moves = g.moves + 1;
  if (g.deck[a] === g.deck[b])
    return { ...g, open: [], matched: [...g.matched, a, b], moves };
  return { ...g, open, moves };
}
~~~

📌 **Interview term: Two-card lock** — while two unmatched cards are face up, every click is ignored. Here it is the first line of <code>flip</code>: when locked, the same object comes back and nothing changes.

📌 **Interview term: Seeded PRNG** — a random generator that repeats its sequence for the same seed. Pass a seed in tests, <code>Math.random</code> in production.

### Step 2: the component and the timer

~~~js
const game = ref(createGame(1));
const locked = computed(() => isLocked(game.value));
let timer = null;

function cancelTimer() {
  clearTimeout(timer);
  timer = null;
}

watch(locked, (now) => {
  cancelTimer();
  if (now)
    timer = setTimeout(
      () => (game.value = hideUnmatched(game.value)),
      FLIP_BACK_MS,
    );
});
onUnmounted(cancelTimer);
~~~

📌 **Interview term: watch** — runs a callback when a reactive source changes, the right tool for side effects like timers. Here the source is the computed <code>locked</code>, so the timer starts exactly when the board locks. New game empties <code>open</code>, <code>locked</code> turns false, and the watcher cancels the pending timeout. <code>onUnmounted</code> covers the component disappearing mid-delay (see [Vue lifecycle hooks](/interview-question/what-are-vue-lifecycle-hooks)).

The timer id is a plain variable, not a ref: nothing renders it, so it does not need to be reactive.

Inside the timeout we read <code>game.value</code> at the moment it fires, not a copy captured earlier, and <code>hideUnmatched</code> is itself guarded (it only clears a locked pair), so even a late timer could not close a card on a new board.

### Step 3: the card

~~~vue
<script setup>
const props = defineProps({
  index: { type: Number, required: true },
  symbol: { type: String, required: true },
  faceUp: Boolean,
  matched: Boolean,
});
const emit = defineEmits(["flip"]);
</script>

<template>
  <button
    type="button"
    data-testid="card"
    class="card"
    :class="{ up: faceUp, done: matched }"
    :aria-label="
      'Card ' + (index + 1) + ': ' + (faceUp ? symbol : 'face down')
    "
    :disabled="matched"
    @click="emit('flip', props.index)"
  >
    {{ faceUp ? symbol : "" }}
  </button>
</template>
~~~

📌 **Interview term: Props down, events up** — the parent passes data in with props and the child reports intent with an emitted event; the child never edits the game. See [defineProps and defineEmits](/interview-question/how-do-defineprops-and-defineemits-work-in-script-setup).

In <code>App.vue</code> the list is <code>v-for="(symbol, i) in game.deck"</code> with <code>:key="game.seed + '-' + i"</code>. A new seed means new keys, so Vue recreates every card for a new game instead of patching the old ones ([why the key matters](/interview-question/why-is-the-key-attribute-important-in-v-for)). A face-down card renders no symbol, so the answer is not hiding in the DOM.

## 4. Verified

Compiled with <code>@vue/compiler-sfc</code>, mounted with <code>createApp(App).mount("#app")</code> in jsdom, and driven by a script that clicks real buttons and waits real time. <code>?</code> is a face-down card:

~~~text
RENDERED: MemoryMoves: 0 · Pairs: 0/8New game
seed 1 deck: 🥝 🍋 🍌 🍑 🍋 🍇 🍎 🍍 🍌 🍑 🍒 🍒 🥝 🍍 🍎 🍇
after mismatch 1+2: 🥝 🍋 ? ? ? ? ? ? ? ? ? ? ? ? ? ? | Moves: 1 · Pairs: 0/8 | No match. Flipping back...
click card 3 while locked: 🥝 🍋 ? ? ? ? ? ? ? ? ? ? ? ? ? ?
after 900 ms: ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? | Moves: 1 · Pairs: 0/8 | 
solved: 🥝 🍋 🍌 🍑 🍋 🍇 🍎 🍍 🍌 🍑 🍒 🍒 🥝 🍍 🍎 🍇 | Moves: 9 · Pairs: 8/8 | You won in 9 moves!
disabled cards: 16
new game: ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? | Moves: 0 · Pairs: 0/8 | 
reset while locked, open card 1, wait 900 ms: 🍍 ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? | Moves: 0 · Pairs: 0/8 |
~~~

The mismatch locks the board, the third click is ignored, both cards flip back after the delay and the move is counted; the solve takes 9 moves and disables all 16 cards; and New game during a lock leaves no timer behind (the card opened on the new board is still face up 900 ms later). The output is identical to the React and Angular builds. Layout and the CSS transition were not measured (jsdom has no layout).

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Same card clicked twice | Ignored by <code>open.includes(i)</code> |
| Click during the delay | Ignored by the lock |
| New game or unmount mid-delay | <code>watch</code> and <code>onUnmounted</code> clear the timeout |
| Keyboard | Real buttons: Tab, Enter, Space |
| Screen reader | Labels "face down" or the symbol; <code>role="status"</code> announces mismatch and win |
| Matched cards | <code>disabled</code>, out of the tab order |

## 6. Common Pitfalls

- **A mutable deck with <code>reactive()</code> and in-place edits.** It works, but the pure functions then stop being pure and are harder to test. Replace the whole game object instead.
- **<code>watchEffect</code> that reads <code>game.value</code>.** It re-runs on every flip and can restart the timer; watch only the derived <code>locked</code>.
- **Storing the timer id in a <code>ref</code>.** Harmless but pointless: nothing renders it.
- **Forgetting <code>onUnmounted</code>.** The timeout fires after the component is gone.
- **Index-only keys.** With <code>:key="i"</code> a new game patches the old card components in place, which can carry over transitions or focus.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Eight pairs, mismatches flip back after 800 ms, clicks are ignored meanwhile, a move is a pair of flips. Rules go in a plain JS file."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Model:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> holding the game: deck, open indices, matched indices, moves. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">locked</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">won</code> are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rules:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createGame(seed)</code> deals with a seeded Fisher-Yates; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flip</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hideUnmatched</code> return new game objects."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Timer:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">locked</code> starts the timeout and cancels any previous one; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUnmounted</code> clears it too."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it:</strong> <span style="color:#f0e2c8;">"Fast clicks, third click during the lock, New game mid-delay, a full solve; then labels and a live region."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watch</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watchEffect</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch(locked)</code> has one explicit source, so it fires only when the lock changes. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watchEffect</code> that touches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">game.value</code> would re-run on every flip and could restart the timer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shallowRef</code> help here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, slightly. The game object is always replaced, never mutated, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> avoids making the deck deeply reactive. With 16 cards the difference is negligible; on a big board it matters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit test the pure functions directly, then mount with Vue Test Utils, click cards and use fake timers to advance 800 ms, checking the board flips back.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make the grid size configurable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pairs</code> prop, pass it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createGame</code>, and derive the column count with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> (for example the closest square). Changing it should start a new game.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pure function** | Same inputs, same output, no side effects |
| **computed** | Cached derived value that updates with its sources |
| **watch** | Run a side effect when a specific reactive source changes |
| **Seeded PRNG** | Repeatable random numbers from a seed |
| **Two-card lock** | Ignore clicks while a mismatch is showing |
| **Props down, events up** | Parent owns data; child emits what the user did |

---

**Conclusion:** In Vue the memory game is one <code>ref</code> holding an immutable game object, two <code>computed</code> values for the lock and the win, and one <code>watch</code> that owns the flip-back timer and cancels it on reset and unmount. The rules stay in plain functions with an injected random source, which is what makes the behaviour both correct under fast clicks and easy to prove.`,
        files: {
          "/src/App.vue": `<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import MemoryCard from "./components/MemoryCard.vue";
import { createGame, flip, hideUnmatched, isLocked, isWon } from "./utils/memory.js";

const FLIP_BACK_MS = 800;
const game = ref(createGame(1));
const locked = computed(() => isLocked(game.value));
const won = computed(() => isWon(game.value));
let timer = null;

function cancelTimer() {
  clearTimeout(timer);
  timer = null;
}

// Start the flip-back timer only when the board becomes locked.
watch(locked, (now) => {
  cancelTimer();
  if (now)
    timer = setTimeout(
      () => (game.value = hideUnmatched(game.value)),
      FLIP_BACK_MS,
    );
});
onUnmounted(cancelTimer);

const onFlip = (i) => (game.value = flip(game.value, i));
const newGame = () => (game.value = createGame(game.value.seed + 1));
</script>

<template>
  <main class="memory">
    <h1>Memory</h1>
    <div class="bar">
      <span data-testid="moves"
        >Moves: {{ game.moves }} · Pairs: {{ game.matched.length / 2 }}/{{
          game.deck.length / 2
        }}</span
      >
      <button type="button" @click="newGame">New game</button>
    </div>
    <div class="grid" role="group" aria-label="Cards" :aria-busy="locked">
      <MemoryCard
        v-for="(symbol, i) in game.deck"
        :key="game.seed + '-' + i"
        :index="i"
        :symbol="symbol"
        :face-up="game.open.includes(i) || game.matched.includes(i)"
        :matched="game.matched.includes(i)"
        @flip="onFlip"
      />
    </div>
    <p class="status" role="status" data-testid="status">
      {{
        won
          ? "You won in " + game.moves + " moves!"
          : locked
            ? "No match. Flipping back..."
            : ""
      }}
    </p>
  </main>
</template>

<style>
:root {
  color-scheme: dark;
}
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f1115;
  color: #e8e8ea;
}
.memory {
  max-width: 360px;
  margin: 24px auto;
  padding: 0 16px;
}
.memory h1 {
  font-size: 1.3rem;
  margin: 0 0 8px;
}
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.bar button {
  background: #2a2f3a;
  color: #e8e8ea;
  border: 1px solid #3b4252;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.card {
  aspect-ratio: 1;
  border-radius: 10px;
  border: 1px solid #3b4252;
  font-size: 1.8rem;
  cursor: pointer;
  background: #1f6feb;
  color: transparent;
  transition: background 0.2s;
}
.card.up {
  background: #1c2128;
  color: inherit;
}
.card.done {
  background: #12301f;
  border-color: #2ea043;
  cursor: default;
}
.card:focus-visible {
  outline: 3px solid #f9a825;
  outline-offset: 2px;
}
.status {
  min-height: 1.4em;
  margin-top: 12px;
}
</style>
`,
          "/src/components/MemoryCard.vue": `<script setup>
const props = defineProps({
  index: { type: Number, required: true },
  symbol: { type: String, required: true },
  faceUp: Boolean,
  matched: Boolean,
});
const emit = defineEmits(["flip"]);
</script>

<template>
  <button
    type="button"
    data-testid="card"
    class="card"
    :class="{ up: faceUp, done: matched }"
    :aria-label="'Card ' + (index + 1) + ': ' + (faceUp ? symbol : 'face down')"
    :disabled="matched"
    @click="emit('flip', props.index)"
  >
    {{ faceUp ? symbol : "" }}
  </button>
</template>
`,
          "/src/utils/memory.js": `// Pure game logic: no React, no DOM, no timers. Every function takes a game
// object and returns a new one, so the UI layer only decides WHEN to call them.

// Small seeded PRNG (mulberry32). Same seed, same sequence, every run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates: walk from the end, swap each slot with a random earlier one.
export function shuffle(items, rng) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const SYMBOLS = ["🍎", "🍌", "🍇", "🍒", "🥝", "🍋", "🍑", "🍍"];

export function createGame(seed, pairs = 8) {
  const symbols = SYMBOLS.slice(0, pairs);
  const deck = shuffle([...symbols, ...symbols], mulberry32(seed));
  return { seed, deck, open: [], matched: [], moves: 0 };
}

// Two face-up cards that do not match: the
// board ignores clicks until they flip back.
export const isLocked = (g) => g.open.length === 2;
export const isWon = (g) => g.matched.length === g.deck.length;

export function flip(g, i) {
  if (isLocked(g) || g.open.includes(i) || g.matched.includes(i)) return g;
  const open = [...g.open, i];
  if (open.length === 1) return { ...g, open };
  const [a, b] = open;
  const moves = g.moves + 1;
  if (g.deck[a] === g.deck[b]) {
    return { ...g, open: [], matched: [...g.matched, a, b], moves };
  }
  return { ...g, open, moves };
}

export function hideUnmatched(g) {
  return isLocked(g) ? { ...g, open: [] } : g;
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round in Angular. You know components and templates; signals are explained as we go.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> tag with the exact vocabulary. The Verified section is real output from booting the solution on Angular 22.2.3 twice (AOT with strict templates, and the runtime JIT the playground uses) and clicking through it with a script.

## 1. Why This Even Matters — A Story First

Turn two cards over. A pair stays up; a mismatch stays visible for a moment and then goes back face down, and during that moment nobody may touch a third card. The question is really about that moment: a timer, a rule that must hold while it runs, and a New game button that can be pressed in the middle of it.

## 2. Requirements and Plan

Sixteen cards (eight pairs), a fair shuffle, 800 ms flip-back, clicks ignored during it, moves, pairs, a win message and New game.

The rules are framework-free TypeScript in <code>memory.ts</code>: a <code>Game</code> interface plus <code>createGame(seed)</code>, <code>flip</code>, <code>hideUnmatched</code>, <code>isLocked</code> and <code>isWon</code>, each returning a new <code>Game</code>.

📌 **Interview term: Pure function** — the result depends only on the arguments and nothing else is changed. The component never contains game rules; it calls these.

How the state maps onto Angular:

| Piece | Angular primitive | Why |
| :--- | :--- | :--- |
| the game | <code>signal(createGame(1))</code> | One source of truth, replaced with <code>update()</code> |
| <code>locked</code>, <code>won</code> | <code>computed()</code> | Derived, so they cannot drift from the game |
| flip-back timer | <code>effect()</code> with <code>onCleanup</code> | Starts when <code>locked()</code> becomes true, cancelled otherwise |
| each card | <code>MemoryCardComponent</code> with <code>@Input</code> / <code>@Output</code> | Presentational |

📌 **Interview term: Signal** — a value holder that tracks who reads it. When <code>game</code> changes, anything that read it (a <code>computed</code>, an <code>effect</code>, the template) is updated. Background in [What are Angular Signals](/interview-question/what-are-angular-signals).

## 3. Build It Step by Step

### Step 1: typed, pure rules

~~~ts
export interface Game {
  seed: number;
  deck: string[];
  open: number[]; // face-up cards that are not matched yet (0, 1 or 2)
  matched: number[];
  moves: number;
}

export const isLocked = (g: Game) => g.open.length === 2;

export function flip(g: Game, i: number): Game {
  if (isLocked(g) || g.open.includes(i) || g.matched.includes(i))
    return g;
  const open = [...g.open, i];
  if (open.length === 1) return { ...g, open };
  const [a, b] = open;
  const moves = g.moves + 1;
  if (g.deck[a] === g.deck[b])
    return { ...g, open: [], matched: [...g.matched, a, b], moves };
  return { ...g, open, moves };
}
~~~

The deck comes from <code>shuffle([...symbols, ...symbols], mulberry32(seed))</code>, a [Fisher-Yates shuffle](/interview-question/implement-fisher-yates-shuffle-in-place-unbiased) driven by a seeded PRNG, so a seed always deals the same deck.

📌 **Interview term: Two-card lock** — while two unmatched cards are up, clicks are ignored. It is the guard on the first line of <code>flip</code>: a locked game comes back unchanged, and a signal set to the same object does not notify anyone.

### Step 2: signals, computed and the timer effect

~~~ts
export class AppComponent {
  readonly game = signal(createGame(1));
  readonly locked = computed(() => isLocked(this.game()));
  readonly won = computed(() => isWon(this.game()));

  constructor() {
    effect((onCleanup) => {
      if (!this.locked()) return;
      const id = setTimeout(
        () => this.game.update(hideUnmatched),
        FLIP_BACK_MS,
      );
      onCleanup(() => clearTimeout(id));
    });
  }

  onFlip(i: number) {
    this.game.update((g) => flip(g, i));
  }
  newGame() {
    this.game.update((g) => createGame(g.seed + 1));
  }
}
~~~

📌 **Interview term: effect() with onCleanup** — an effect re-runs when a signal it read changes. Before re-running, and when the component is destroyed, Angular calls the function registered with <code>onCleanup</code>. The effect reads only <code>locked()</code>, so it re-runs only when the lock flips; the cleanup clears the pending timeout when New game unlocks the board or the component goes away. See [when to use effect, and when not to](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it).

Note that <code>this.game.update(hideUnmatched)</code> passes the current value when the timer fires, never a stale copy, and <code>hideUnmatched</code> only clears a locked pair, so a late timer would be harmless anyway.

📌 **Interview term: Zoneless change detection** — Angular 21 and later bootstrap without zone-based change detection by default (the <code>@angular/core</code> 22.2.3 typings say "Zoneless is enabled by default in Angular v21+"), and the playground adds no zone provider. The view refreshes because a signal changed, not because a timer fired. A plain class field changed inside <code>setTimeout</code> would not re-render here; a signal does. More in [zoneless Angular](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18).

### Step 3: the card component and the grid

~~~ts
@Component({
  selector: "app-memory-card",
  standalone: true,
  template: \`
    <button type="button" data-testid="card" class="card"
      [class.up]="faceUp" [class.done]="matched"
      [attr.aria-label]="'Card ' + (index + 1) + ': ' + (faceUp ? symbol : 'face down')"
      [disabled]="matched" (click)="flip.emit(index)">{{ faceUp ? symbol : "" }}</button>
  \`,
})
export class MemoryCardComponent {
  @Input({ required: true }) index = 0;
  @Input({ required: true }) symbol = "";
  @Input() faceUp = false;
  @Input() matched = false;
  @Output() flip = new EventEmitter<number>();
}
~~~

The playground compiles at runtime (JIT), where signal <code>input()</code> and <code>output()</code> do not register, so the card uses the decorator forms. The grid uses built-in control flow: <code>@for (symbol of game().deck; track game().seed + "-" + i; let i = $index)</code>. Tracking by seed plus index means a new game creates fresh card components instead of reusing the old ones ([why @for needs track](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux)).

## 4. Verified

Booted with <code>bootstrapApplication(AppComponent)</code> and no providers, once compiled AOT by <code>ngc</code> with <code>strictTemplates</code> and once through the runtime JIT, then driven by clicking real buttons and waiting real time. Both modes printed the same lines; this is the JIT run. <code>?</code> is a face-down card:

~~~text
RENDERED: MemoryMoves: 0 · Pairs: 0/8New game
seed 1 deck: 🥝 🍋 🍌 🍑 🍋 🍇 🍎 🍍 🍌 🍑 🍒 🍒 🥝 🍍 🍎 🍇
after mismatch 1+2: 🥝 🍋 ? ? ? ? ? ? ? ? ? ? ? ? ? ? | Moves: 1 · Pairs: 0/8 | No match. Flipping back...
click card 3 while locked: 🥝 🍋 ? ? ? ? ? ? ? ? ? ? ? ? ? ?
after 900 ms: ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? | Moves: 1 · Pairs: 0/8 | 
solved: 🥝 🍋 🍌 🍑 🍋 🍇 🍎 🍍 🍌 🍑 🍒 🍒 🥝 🍍 🍎 🍇 | Moves: 9 · Pairs: 8/8 | You won in 9 moves!
disabled cards: 16
new game: ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? | Moves: 0 · Pairs: 0/8 | 
reset while locked, open card 1, wait 900 ms: 🍍 ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? | Moves: 0 · Pairs: 0/8 |
~~~

The lock holds, the cards flip back after the delay, the solve takes 9 moves and disables all 16 cards, and New game during a lock leaves no timer behind. The output matches the React and Vue builds line for line. Visual layout and the CSS transition were not measured (jsdom has no layout).

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Same card twice, or a third card while locked | Guard in <code>flip</code> returns the same game |
| New game or destroy mid-delay | Effect cleanup clears the timeout |
| Keyboard | Real buttons: Tab, Enter, Space |
| Screen reader | Labels "face down" or the symbol; <code>role="status"</code> live region; <code>aria-busy</code> while locked |
| Matched cards | <code>[disabled]</code>, out of the tab order |

## 6. Common Pitfalls

- **Plain fields instead of signals.** <code>this.open = []</code> inside a <code>setTimeout</code> does not refresh a zoneless view. Keep state in signals.
- **An effect that reads <code>game()</code>.** It re-runs on every flip and restarts the timer. Read only the derived <code>locked()</code>.
- **Starting the timer in <code>onFlip</code> without keeping the id.** New game cannot cancel it. Let the effect own it.
- **Using <code>input()</code> / <code>output()</code> in the playground.** They do not register under its runtime JIT; use <code>@Input</code> and <code>@Output</code> there.
- **<code>track $index</code> alone.** A new game then reuses every card component.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Eight pairs, mismatches flip back after 800 ms, clicks ignored meanwhile, a move is a pair of flips. Rules in a plain TypeScript file."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Model:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Game</code> interface; one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">signal</code> holds it; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">locked</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">won</code> are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rules:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createGame(seed)</code> deals with a seeded Fisher-Yates; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flip</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hideUnmatched</code> return a new <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Game</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Timer:</strong> <span style="color:#f0e2c8;">"An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> that reads only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">locked()</code> starts the timeout and registers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> to clear it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it:</strong> <span style="color:#f0e2c8;">"Fast clicks, third click during the lock, New game mid-delay, a full solve; labels and a live region."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">effect</code> rather than RxJS <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">timer</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both work. The state is already in signals, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> gives start and cancel in four lines. With RxJS you would map the lock to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timer(800)</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> and convert back with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memory.ts</code> directly. For the component, use TestBed, click cards through the fixture, advance time with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fakeAsync</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(800)</code> (or await a real timeout in a zoneless test) and check the cards are face down again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">OnPush</code> change anything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not here: signal reads in the template already mark the component for check. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OnPush</code> matters for components fed by plain inputs and objects.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prevent a double click from counting as two flips?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The rules do it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flip</code> ignores an index that is already open, so a double click cannot pair a card with itself.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pure function** | Same inputs, same output, no side effects |
| **Signal** | A reactive value holder that notifies its readers |
| **computed()** | A cached signal derived from other signals |
| **effect() with onCleanup** | A side effect that re-runs on signal changes and cleans up before each re-run and on destroy |
| **Zoneless change detection** | The view refreshes from signal changes, not from patched browser APIs |
| **Two-card lock** | Ignore clicks while a mismatch is showing |

---

**Conclusion:** In Angular the memory game is one signal holding an immutable <code>Game</code>, two computed signals for the lock and the win, and one effect that owns the flip-back timer through <code>onCleanup</code>. With the rules in pure TypeScript and the deck dealt by a seeded shuffle, the same driver produces the same output in AOT, JIT, React and Vue.`,
        files: {
          "/src/app/app.component.ts": `import { Component, computed, effect, signal } from "@angular/core";
import { MemoryCardComponent } from "./components/memory-card.component";
import { createGame, flip, hideUnmatched, isLocked, isWon } from "./utils/memory";

const FLIP_BACK_MS = 800;

@Component({
  selector: "app-root",
  standalone: true,
  imports: [MemoryCardComponent],
  template: \`
    <main class="memory">
      <h1>Memory</h1>
      <div class="bar">
        <span data-testid="moves"
          >Moves: {{ game().moves }} · Pairs: {{ game().matched.length / 2 }}/{{
            game().deck.length / 2
          }}</span
        >
        <button type="button" (click)="newGame()">New game</button>
      </div>
      <div
        class="grid"
        role="group"
        aria-label="Cards"
        [attr.aria-busy]="locked()"
      >
        @for (
          symbol of game().deck;
          track game().seed + "-" + i;
          let i = $index
        ) {
          <app-memory-card
            [index]="i"
            [symbol]="symbol"
            [faceUp]="game().open.includes(i) || game().matched.includes(i)"
            [matched]="game().matched.includes(i)"
            (flip)="onFlip($event)"
          />
        }
      </div>
      <p class="status" role="status" data-testid="status">
        {{
          won()
            ? "You won in " + game().moves + " moves!"
            : locked()
              ? "No match. Flipping back..."
              : ""
        }}
      </p>
    </main>
  \`,
  styles: [
    \`
      :host {
        display: block;
        font-family: system-ui, sans-serif;
        color: #e8e8ea;
      }
      .memory {
        max-width: 360px;
        margin: 24px auto;
        padding: 0 16px;
      }
      .memory h1 {
        font-size: 1.3rem;
        margin: 0 0 8px;
      }
      .bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }
      .bar button {
        background: #2a2f3a;
        color: #e8e8ea;
        border: 1px solid #3b4252;
        border-radius: 6px;
        padding: 6px 12px;
        cursor: pointer;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
      }
      .status {
        min-height: 1.4em;
        margin-top: 12px;
      }
    \`,
  ],
})
export class AppComponent {
  readonly game = signal(createGame(1));
  readonly locked = computed(() => isLocked(this.game()));
  readonly won = computed(() => isWon(this.game()));

  constructor() {
    // Runs whenever locked() changes; onCleanup cancels the previous timer
    // (new game while locked, or the component being destroyed).
    effect((onCleanup) => {
      if (!this.locked()) return;
      const id = setTimeout(
        () => this.game.update(hideUnmatched),
        FLIP_BACK_MS,
      );
      onCleanup(() => clearTimeout(id));
    });
  }

  onFlip(i: number) {
    this.game.update((g) => flip(g, i));
  }

  newGame() {
    this.game.update((g) => createGame(g.seed + 1));
  }
}
`,
          "/src/app/components/memory-card.component.ts": `import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: "app-memory-card",
  standalone: true,
  template: \`
    <button
      type="button"
      data-testid="card"
      class="card"
      [class.up]="faceUp"
      [class.done]="matched"
      [attr.aria-label]="'Card ' + (index + 1) + ': ' + (faceUp ? symbol : 'face down')"
      [disabled]="matched"
      (click)="flip.emit(index)"
    >{{ faceUp ? symbol : "" }}</button>
  \`,
  styles: [
    \`
    :host { display: block; }
    .card { width: 100%; aspect-ratio: 1; border-radius: 10px; border: 1px solid #3b4252; font-size: 1.8rem;
      cursor: pointer; background: #1f6feb; color: transparent; transition: background 0.2s; }
    .card.up { background: #1c2128; color: #e8e8ea; }
    .card.done { background: #12301f; border-color: #2ea043; cursor: default; }
    .card:focus-visible { outline: 3px solid #f9a825; outline-offset: 2px; }
  \`,
  ],
})
export class MemoryCardComponent {
  @Input({ required: true }) index = 0;
  @Input({ required: true }) symbol = "";
  @Input() faceUp = false;
  @Input() matched = false;
  @Output() flip = new EventEmitter<number>();
}
`,
          "/src/app/utils/memory.ts": `// Pure game logic: no Angular, no DOM, no timers. Every function takes a game
// object and returns a new one, so the
// component only decides WHEN to call them.

export interface Game {
  seed: number;
  deck: string[];
  open: number[]; // face-up cards that are not matched yet (0, 1 or 2)
  matched: number[];
  moves: number;
}

// Small seeded PRNG (mulberry32). Same seed, same sequence, every run.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates: walk from the end, swap each slot with a random earlier one.
export function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const SYMBOLS = ["🍎", "🍌", "🍇", "🍒", "🥝", "🍋", "🍑", "🍍"];

export function createGame(seed: number, pairs = 8): Game {
  const symbols = SYMBOLS.slice(0, pairs);
  const deck = shuffle([...symbols, ...symbols], mulberry32(seed));
  return { seed, deck, open: [], matched: [], moves: 0 };
}

// Two face-up cards that do not match: the
// board ignores clicks until they flip back.
export const isLocked = (g: Game) => g.open.length === 2;
export const isWon = (g: Game) => g.matched.length === g.deck.length;

export function flip(g: Game, i: number): Game {
  if (isLocked(g) || g.open.includes(i) || g.matched.includes(i)) return g;
  const open = [...g.open, i];
  if (open.length === 1) return { ...g, open };
  const [a, b] = open;
  const moves = g.moves + 1;
  if (g.deck[a] === g.deck[b]) {
    return { ...g, open: [], matched: [...g.matched, a, b], moves };
  }
  return { ...g, open, moves };
}

export function hideUnmatched(g: Game): Game {
  return isLocked(g) ? { ...g, open: [] } : g;
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build the Snake Game",
    seoDescription: "Build Snake in React, Vue and Angular: a fixed-tick game loop, a direction queue that blocks 180-degree turns, wall and self collision, seeded food.",
    description: `**Question presented to candidate:**
"Build the classic Snake game in the browser. The snake moves one cell per tick on a grid, arrow keys steer it, eating food makes it longer and scores a point, and hitting a wall or itself ends the game. Add start, pause and restart."

**Requirements:**
- A 12 by 12 grid, a snake of length 3 moving right, one piece of food on a free cell.
- A fixed tick (about 150 ms): the snake moves exactly one cell per tick, independent of how often the UI re-renders.
- Arrow keys (and WASD) steer; pressing the direct opposite direction is ignored, and two quick presses within one tick must never reverse the snake into itself.
- Eating grows the snake by one and places new food on a free cell; walls and the body end the game.
- Space or a button pauses and resumes; Restart starts a new game; on-screen buttons for touch.

**What a strong answer should cover:**
- Rules as a pure \`step(game)\` function, separate from rendering and from the timer, with the food RNG injected (seeded) so the game is reproducible.
- A game loop with **one** interval that exists only while running, cleaned up on pause, game over and unmount.
- A **direction queue** validated against the last queued direction, consumed one per tick, which is what blocks the fast double-press 180-degree bug.
- Collision rules, including that the tail cell is free on a non-eating tick.
- Keyboard handling on \`window\` with \`preventDefault\` for arrows, and a note on \`setInterval\` versus a \`requestAnimationFrame\` accumulator.

**Clarifying questions expected:**
- "Do walls kill the snake, or does it wrap around to the other side?"
- "Should the speed increase as the score grows?"
- "Do you need touch controls or just the keyboard?"

**Code / implementation expected:** Yes. A playable game with the rules in a plain module and the loop and input wired in the framework of your choice.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round. You know React components and <code>useState</code>; game loops are explained from zero.
**Difficulty:** Hard

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The Verified section is real output from booting the solution on React 19.3.1 in StrictMode and driving it with key presses and a manual clock.

## 1. Why This Even Matters — A Story First

Think of a toy train on a track made of square tiles. A metronome clicks every 150 milliseconds and on every click the train moves exactly one tile. You steer by shouting "up" or "left" to the driver. The driver writes your instructions on a notepad and, on each click, reads one instruction from the top. If you shout "left" while the train is heading right, the driver crosses it out: a train cannot turn back into its own carriages.

That is Snake. The metronome is the **game loop**, the notepad is the **direction queue**, and the driver reading one note per click is what stops the most common bug in this question: pressing Up and then Left very quickly while moving right, which in a naive solution turns the snake straight back into itself before it has moved.

Interviewers use Snake because it mixes a timer, keyboard input that arrives at any moment, and rules that must be applied in a strict order. It is also a good test of whether you keep game rules out of your components.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do walls kill the snake, or does it wrap around? | Changes one branch of <code>step()</code>; wrapping uses modulo arithmetic. |
| How big is the board and how fast is a tick? | Fixed constants (<code>SIZE</code>, <code>TICK_MS</code>), and whether a 144-cell grid of divs is fine (it is). |
| Should the speed increase with the score? | Then the interval delay must be part of state and the loop restarted when it changes. |
| Does the game start on the first arrow key or on a button? | Decides whether <code>turn()</code> also starts the game. |
| Touch support? | On-screen direction buttons that call the same <code>turn()</code>. |
| What happens when the board is full? | A rare win state; food placement must handle "no free cell". |

## 3. Requirements and Plan

The design has three parts that never mix:

1. **Rules** in <code>src/utils/snake.js</code>: <code>createGame(seed)</code>, <code>turn(game, dir)</code>, <code>step(game)</code>, <code>togglePause(game)</code>. Plain functions, no React, no timers.
2. **The loop**: one <code>setInterval</code> that calls <code>step</code> every 150 ms while the status is <code>"running"</code>.
3. **Input**: one <code>keydown</code> listener on <code>window</code> that calls <code>turn</code> or <code>togglePause</code>.

📌 **Interview term: Game loop** — the repeating cycle "advance the world by one step, then draw it". Snake uses a **fixed tick**: the world advances at a constant rate regardless of how fast the screen redraws.

The state model:

| Piece | Kind | Notes |
| :--- | :--- | :--- |
| <code>snake</code> | state | Array of cell numbers, head first (<code>row * 12 + col</code>) |
| <code>dir</code>, <code>queue</code> | state | Current heading, plus up to two pending turns |
| <code>food</code>, <code>rng</code> | state | Food cell and the RNG state that produced it |
| <code>score</code>, <code>status</code> | state | <code>ready</code>, <code>running</code>, <code>paused</code>, <code>over</code>, <code>won</code> |
| <code>running</code> | derived | <code>status === "running"</code>; the loop effect depends on it |
| cell kinds | derived | Computed in <code>Board</code> from <code>snake</code> and <code>food</code> each render |

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Key presses go through turn into the direction queue, and each tick of the interval runs step, which takes one direction from the queue">
  <defs>
    <marker id="snr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="190" height="64" rx="10"/>
  <text class="d-text" x="115" y="57" text-anchor="middle">keydown</text>
  <text class="d-sub" x="115" y="78" text-anchor="middle">any time, any rate</text>
  <rect class="d-box" x="255" y="30" width="190" height="64" rx="10"/>
  <text class="d-text" x="350" y="57" text-anchor="middle">turn(game, dir)</text>
  <text class="d-sub" x="350" y="78" text-anchor="middle">check vs last queued</text>
  <rect class="d-box-accent" x="490" y="30" width="190" height="64" rx="10"/>
  <text class="d-text d-accent" x="585" y="57" text-anchor="middle">queue: up, left</text>
  <text class="d-sub" x="585" y="78" text-anchor="middle">at most two</text>
  <rect class="d-box-muted" x="20" y="206" width="190" height="64" rx="10"/>
  <text class="d-text" x="115" y="233" text-anchor="middle">setInterval</text>
  <text class="d-sub" x="115" y="254" text-anchor="middle">every 150 ms</text>
  <rect class="d-box" x="255" y="206" width="190" height="64" rx="10"/>
  <text class="d-text" x="350" y="233" text-anchor="middle">step(game)</text>
  <text class="d-sub" x="350" y="254" text-anchor="middle">move, collide, eat</text>
  <rect class="d-box" x="490" y="206" width="190" height="64" rx="10"/>
  <text class="d-text" x="585" y="233" text-anchor="middle">new game object</text>
  <text class="d-sub" x="585" y="254" text-anchor="middle">React re-renders</text>
  <path class="d-edge-accent" d="M 212 62 L 249 62" marker-end="url(#snr-arrow)"/>
  <path class="d-edge-accent" d="M 447 62 L 484 62" marker-end="url(#snr-arrow)"/>
  <path class="d-edge" d="M 212 238 L 249 238" marker-end="url(#snr-arrow)"/>
  <path class="d-edge" d="M 447 238 L 484 238" marker-end="url(#snr-arrow)"/>
  <path class="d-edge-dashed" d="M 585 98 L 585 150 L 350 150 L 350 200" marker-end="url(#snr-arrow)"/>
  <text class="d-sub" x="470" y="140" text-anchor="middle">one per tick</text>
</svg>

The two rows run at different speeds. Key presses can arrive five times inside one tick; the queue absorbs them, and <code>step</code> consumes exactly one per tick. That separation is the whole fix for the reverse-into-yourself bug.

## 4. Build It Step by Step

### Step 1: the board as numbers

A cell is one number, <code>row * SIZE + col</code>. The snake is an array of those numbers, head first. Numbers compare with <code>===</code> and work in a <code>Set</code>, which arrays of <code>[row, col]</code> pairs do not.

~~~js
export function createGame(seed) {
  const mid = Math.floor(SIZE / 2) * SIZE;
  const snake = [mid + 4, mid + 3, mid + 2];
  const [food, rng] = placeFood(snake, seed);
  return {
    seed,
    snake,
    dir: "right",
    queue: [],
    food,
    rng,
    score: 0,
    status: "ready",
  };
}
~~~

### Step 2: a pure RNG for the food

~~~js
export function nextRandom(state) {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}
~~~

📌 **Interview term: Seeded PRNG** — a generator that gives the same sequence for the same seed. This is mulberry32 written as a pure step: it takes the RNG state and returns the number **and** the next state, which the game stores in <code>game.rng</code>.

Why not a closure like <code>const rng = mulberry32(seed)</code> that remembers its own state? Because React may call your state updater twice. In development, StrictMode double-invokes updater functions to catch impure ones ([why StrictMode does this](/interview-question/why-does-react-18-strictmode-double-invoke-your-components-and-effects)). A probe with an updater that bumps a module-level counter, clicked twice, printed:

~~~text
[react] RENDERED: food -1 calls 0
[react] food 4 calls 4
~~~

Two clicks ran the updater four times, and the values 1 and 3 were thrown away. With a closure RNG inside <code>step</code>, every eaten food would skip a random number in development and the game would differ from production. With the RNG state in the game object, <code>step</code> is pure and the double call is harmless (the Verified section checks it).

### Step 3: the direction queue

~~~js
export function turn(g, dir) {
  if (
    g.status === "over" ||
    g.status === "won" ||
    g.status === "paused"
  )
    return g;
  const last = g.queue.length ? g.queue[g.queue.length - 1] : g.dir;
  if (dir === last || dir === OPPOSITE[last] || g.queue.length >= 2) {
    return g.status === "ready" ? { ...g, status: "running" } : g;
  }
  return { ...g, queue: [...g.queue, dir], status: "running" };
}
~~~

📌 **Interview term: Direction queue** — a short list of pending turns, applied one per tick. The new direction is compared with the **last queued** direction, not only the current one.

Walk through the classic bug. Moving right, the player presses Up then Left within one tick. A naive solution stores a single <code>dir</code>: Up is fine (not opposite of right), then Left is fine (not opposite of up), so <code>dir</code> is left before the snake has moved, and the next tick drives the head into its own neck. With the queue, Up is queued, Left is checked against Up and queued too, and the ticks apply them in order: one tick up, one tick left. The cap of two stops a key-mashing player from building a long backlog.

### Step 4: one tick of the world

~~~js
export function step(g) {
  if (g.status !== "running") return g;
  const dir = g.queue.length ? g.queue[0] : g.dir;
  const queue = g.queue.slice(1);
  const head = g.snake[0];
  const row = Math.floor(head / SIZE) + DELTA[dir][0];
  const col = (head % SIZE) + DELTA[dir][1];
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) {
    return { ...g, dir, queue, status: "over" };
  }
  const next = row * SIZE + col;
  const eating = next === g.food;
  const body = eating ? g.snake : g.snake.slice(0, -1);
  if (body.includes(next)) return { ...g, dir, queue, status: "over" };
  const snake = [next, ...body];
  if (!eating) return { ...g, dir, queue, snake };
  const [food, rng] = placeFood(snake, g.rng);
  return {
    ...g,
    dir,
    queue,
    snake,
    food,
    rng,
    score: g.score + 1,
    status: food === -1 ? "won" : "running",
  };
}
~~~

The order matters: take a direction, compute the new head, check the wall **before** turning row and column into a cell number (otherwise column 12 silently becomes column 0 of the next row), then check the body.

📌 **Interview term: Collision detection** — deciding whether the new head overlaps something. The subtle rule: on a tick where the snake does not eat, the tail moves away at the same moment the head moves, so the tail cell is free. That is why the body is <code>snake.slice(0, -1)</code> when not eating. Forgetting it makes a snake chasing its own tail die unfairly.

<code>placeFood</code> lists the free cells and picks one with the RNG, so food never lands on the snake; when no cell is free it returns <code>-1</code> and the game is won.

### Step 5: the loop and the keyboard in React

~~~jsx
const [game, setGame] = useState(() => createGame(1));
const running = game.status === "running";

useEffect(() => {
  if (!running) return;
  const id = setInterval(() => setGame(step), TICK_MS);
  return () => clearInterval(id);
}, [running]);

useEffect(() => {
  const onKey = (e) => {
    const dir = KEY_TO_DIR[e.key];
    if (dir) {
      e.preventDefault();
      setGame((g) => turn(g, dir));
    } else if (e.key === " ") {
      e.preventDefault();
      setGame(togglePause);
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);
~~~

The loop effect depends on <code>running</code> only, so it creates one interval when the game starts and the cleanup removes it on pause, game over and unmount ([effect cleanup](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect)). It does **not** depend on <code>game</code>: an effect that re-created the interval on every move would reset the timer on every key press and the speed would wobble.

📌 **Interview term: Functional update** — <code>setGame(step)</code> hands React a function of the latest state. The interval callback was created once; if it read <code>game</code> from its closure it would keep stepping the very first game forever, the [stale closure](/interview-question/what-causes-stale-closures-in-react-hooks-and-how-do-you-fix-them-correctly) bug.

<code>preventDefault</code> stops arrow keys and Space from scrolling the page. The listener is on <code>window</code> so the player does not have to focus the board first.

<div style="background:#0b1f2a;border-left:4px solid #39c5cf;border-radius:6px;padding:14px 18px;margin:18px 0;">
<span style="color:#9be3ff;font-weight:bold;">🔑 Key insight:</span> <span style="color:#d6eef5;">Keep three clocks apart: <strong style="color:#9be3ff;">input</strong> arrives whenever the player presses, the <strong style="color:#9be3ff;">tick</strong> advances the world at a fixed rate, and <strong style="color:#9be3ff;">rendering</strong> happens whenever React likes. Bugs appear when one of them is allowed to drive another directly, for example a key press that moves the snake immediately.</span>
</div>

### Step 6: rendering

<code>Board</code> builds a <code>Set</code> of snake cells and renders 144 <code>div</code>s with a class of <code>head</code>, <code>body</code>, <code>food</code> or <code>empty</code>. At 144 cells and about 7 renders a second this is cheap; a much larger board would be drawn on a canvas instead.

## 5. Verified

The driver booted the app in jsdom, then replaced <code>setInterval</code> with a manual clock so that every tick is deterministic: each <code>tick</code> fires the live interval callbacks once. "intervals" is how many intervals were alive at that moment. Keys were dispatched as real <code>keydown</code> events, and the driver steered greedily towards the food it read from the DOM:

~~~text
RENDERED: SnakeScore: 0 · Length: 3StartPress an arrow key or Start▲◀▼▶
start: head (6,4) food (7,7) | Score: 0 · Length: 3 | Press an arrow key or Start | intervals 0
after Start: Score: 0 · Length: 3 | Running | intervals 1 | tick ms 150
2 ticks: head (6,6)
ArrowLeft (180 from right) ignored, 1 tick: head (6,7)
Up+Left queued in one tick: tick1 (5,7) tick2 (5,6)
Down then Up (Up is 180 from queued Down, dropped): tick1 (6,6) tick2 (7,6)
ate food 1 after 1 ticks: Score: 1 · Length: 4 | Running | next food (0,0)
ate food 2 after 14 ticks: Score: 2 · Length: 5 | Running | next food (6,6)
ate food 3 after 12 ticks: Score: 3 · Length: 6 | Running | next food (11,9)
Space: Score: 3 · Length: 6 | Paused | intervals 0 | head stayed (6,6) -> (6,6)
Space again: Score: 3 · Length: 6 | Running | intervals 1
hit the wall after 7 ticks: Score: 3 · Length: 6 | Game over · Final score 3 | intervals 0
Restart: head (6,4) food (8,10) | Score: 0 · Length: 3 | Press an arrow key or Start
logic: head turns down into its own body -> over
logic: head moves into the cell the tail is leaving -> running
logic: step() twice on the same game, same food: true
~~~

What it shows: no interval exists before Start, exactly one while running, and zero after pause and game over. (A separate probe counted the <code>setInterval</code> calls: one. StrictMode replays effects only when a component first mounts; when <code>running</code> later flips to true the effect runs once, so there is no duplicate interval to clean up.) ArrowLeft while moving right is ignored. Up then Left inside one tick produces one move up and then one move left, never a reversal. Down then Up drops the Up because it is opposite to the queued Down. Eating grows the snake and moves the score; the wall ends the game. The last three lines are pure-logic checks: moving into the body ends the game, moving into the cell the tail is leaving does not, and calling <code>step</code> twice on the same game picks the same food, so StrictMode cannot change the game.

A separate check in Chromium 141 (playwright-core, 360 px wide viewport) loaded the React build, pressed ArrowUp with the real 150 ms interval running, and after 500 ms the snake had moved up three rows, and found no horizontal scroll (360 px of document width). Frame-level smoothness was not measured.

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Two keys inside one tick | Both queued and applied on consecutive ticks |
| Opposite key | Dropped against the last queued direction |
| Key mashing | Queue capped at two |
| Tail chasing | The leaving tail cell is not an obstacle |
| Board full | <code>placeFood</code> returns -1, status <code>won</code> |
| Page scroll on arrows | <code>preventDefault</code> in the listener |
| Touch | On-screen buttons call <code>turn</code> |
| Screen reader | Board is <code>role="img"</code> with a label including the length; <code>role="status"</code> announces Running, Paused and the final score |
| Tab hidden | Browsers throttle timers in background tabs; a production game would also pause on <code>visibilitychange</code> |

A real-time game is hard to make fully accessible; the honest answer in an interview is to provide pause, a slower speed option and announcements, not to claim it is fully usable with a screen reader.

## 7. Common Pitfalls

- **A single <code>dir</code> variable updated on every key press.** Two quick presses reverse the snake. Use a queue checked against the last queued direction.
- **An interval effect that depends on <code>game</code>.** It is torn down and rebuilt on every move. Depend on <code>running</code> (or the speed) only.
- **Reading <code>game</code> inside the interval.** Stale closure; use <code>setGame(step)</code>.
- **Killing the snake when the head enters the tail cell.** On a non-eating tick the tail has just left.
- **Converting to a cell number before the wall check.** Column 12 wraps to column 0 of the next row.
- **A random generator with hidden state inside the updater.** StrictMode calls updaters twice; keep the RNG state in the game.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Walls kill, 12 by 12 grid, 150 ms tick, arrows and WASD, Space pauses, the first arrow starts the game."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Rules first:</strong> <span style="color:#f0e2c8;">"A pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step(game)</code> moves the head, checks wall, body and food in that order, and returns a new game. The food RNG state lives in the game so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code> stays pure."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Input:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">turn(game, dir)</code> pushes onto a queue of at most two, checked against the last queued direction, which blocks the quick double-press reversal."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Loop:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInterval</code> in an effect that depends only on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code>, with a cleanup; the callback uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setGame(step)</code> so it never sees stale state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it:</strong> <span style="color:#f0e2c8;">"I would test the reversal case, tail chasing, wall and self collision with the pure functions, then play it with pause and restart."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setInterval</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">requestAnimationFrame</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A fixed 150 ms step is exactly what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInterval</code> gives. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">requestAnimationFrame</code> you would accumulate elapsed time and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code> each time it passes 150 ms, which keeps the speed constant on any frame rate and pauses automatically in hidden tabs. Both are valid; the accumulator is better for smooth animation between cells.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you speed up as the score grows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make the delay a function of the score, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max(60, 150 - score * 5)</code>, and put it in the effect dependencies so the interval is recreated only when the speed changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add wrap-around walls?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replace the wall check with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row = (row + SIZE) % SIZE</code> and the same for the column. Everything else, including the body check, stays the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test a timer-driven game?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the rules pure and test them directly. For the component, use fake timers (or a manual clock like the driver here) and advance one tick at a time, asserting on the head and score.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you change for a 100 by 100 board?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Draw on a canvas instead of 10,000 DOM nodes, and keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of body cells alongside the array so the collision check is constant time instead of a linear <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">includes</code>.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Game loop** | Repeatedly advance the world one step, then draw it |
| **Fixed tick** | The world advances at a constant rate, independent of rendering |
| **Direction queue** | Pending turns, validated against the last one and applied one per tick |
| **Collision detection** | Checking whether the new head hits a wall or the body |
| **Seeded PRNG** | Repeatable random numbers; here a pure step that returns the next state |
| **Functional update** | <code>setState(prev =&gt; next)</code>, immune to stale closures |
| **StrictMode double-invoke** | Development-only extra calls that expose impure code |

---

**Conclusion:** Snake is a lesson in keeping clocks apart. Input feeds a small, validated direction queue; one interval, owned by an effect that depends only on whether the game is running, advances the world by calling a pure <code>step</code>; and React simply draws whatever game object comes out. Put the RNG state inside that object and the game is reproducible, testable and immune to StrictMode. The same "rules in plain functions" approach drives the [Memory game](/interview-question/build-a-memory-flip-card-game) and [Minesweeper](/interview-question/build-minesweeper).`,
        files: {
          "/App.js": `import { useEffect, useState } from "react";
import Board from "./src/components/Board";
import {
  KEY_TO_DIR,
  TICK_MS,
  createGame,
  step,
  togglePause,
  turn,
} from "./src/utils/snake";

const LABEL = {
  ready: "Press an arrow key or Start",
  running: "Running",
  paused: "Paused",
  over: "Game over",
  won: "You filled the board!",
};

export default function App() {
  const [game, setGame] = useState(() => createGame(1));
  const running = game.status === "running";

  // The game loop: one fixed-rate interval, alive only while running.
  // A functional update means the interval never reads a stale game.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setGame(step), TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  // One window listener for the whole lifetime of the component.
  useEffect(() => {
    const onKey = (e) => {
      const dir = KEY_TO_DIR[e.key];
      if (dir) {
        e.preventDefault(); // stop arrow keys from scrolling the page
        setGame((g) => turn(g, dir));
      } else if (e.key === " ") {
        e.preventDefault();
        setGame(togglePause);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const over = game.status === "over" || game.status === "won";
  return (
    <main className="snake">
      <h1>Snake</h1>
      <div className="bar">
        <span data-testid="score">
          Score: {game.score} · Length: {game.snake.length}
        </span>
        {over ? (
          <button
            type="button"
            onClick={() => setGame((g) => createGame(g.seed + 1))}
          >
            Restart
          </button>
        ) : (
          <button type="button" onClick={() => setGame(togglePause)}>
            {running ? "Pause" : "Start"}
          </button>
        )}
      </div>
      <Board snake={game.snake} food={game.food} />
      <p className="status" role="status" data-testid="status">
        {LABEL[game.status]}
        {over ? " · Final score " + game.score : ""}
      </p>
      <div className="pad">
        {["up", "left", "down", "right"].map((d) => (
          <button
            key={d}
            type="button"
            className={d}
            aria-label={d}
            onClick={() => setGame((g) => turn(g, d))}
          >
            {{ up: "▲", left: "◀", down: "▼", right: "▶" }[d]}
          </button>
        ))}
      </div>
    </main>
  );
}
`,
          "/src/components/Board.js": `import { SIZE } from "../utils/snake";

// Purely presentational: it renders whatever snake and food it is given.
export default function Board({ snake, food }) {
  const body = new Set(snake);
  const cells = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    const kind =
      i === snake[0]
        ? "head"
        : body.has(i)
          ? "body"
          : i === food
            ? "food"
            : "empty";
    cells.push(
      <div
        key={i}
        className={"cell " + kind}
        data-testid="cell"
        data-kind={kind}
      />,
    );
  }
  return (
    <div
      className="board"
      role="img"
      aria-label={
        "Snake board, " +
        SIZE +
        " by " +
        SIZE +
        ", snake length " +
        snake.length
      }
    >
      {cells}
    </div>
  );
}
`,
          "/src/utils/snake.js": `// Pure Snake logic. A game is a plain object; every function returns a new one.
// Cells are numbered row * SIZE + col. The snake array is head first.

export const SIZE = 12;
export const TICK_MS = 150;
const DELTA = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

// mulberry32 written as a pure step: (state) -> [value, nextState].
// Keeping the RNG state inside the game object makes step() a pure function,
// so calling it twice with the same game gives the same food both times.
export function nextRandom(state) {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

function placeFood(snake, rngState) {
  const taken = new Set(snake);
  const free = [];
  for (let i = 0; i < SIZE * SIZE; i++) if (!taken.has(i)) free.push(i);
  if (free.length === 0) return [-1, rngState];
  const [r, next] = nextRandom(rngState);
  return [free[Math.floor(r * free.length)], next];
}

export function createGame(seed) {
  const mid = Math.floor(SIZE / 2) * SIZE;
  const snake = [mid + 4, mid + 3, mid + 2];
  const [food, rng] = placeFood(snake, seed);
  return {
    seed,
    snake,
    dir: "right",
    queue: [],
    food,
    rng,
    score: 0,
    status: "ready",
  };
}

// Queue a turn. It is checked against the LAST queued direction, not only the
// current one, so two quick presses can never add up to a 180-degree turn.
export function turn(g, dir) {
  if (g.status === "over" || g.status === "won" || g.status === "paused")
    return g;
  const last = g.queue.length ? g.queue[g.queue.length - 1] : g.dir;
  if (dir === last || dir === OPPOSITE[last] || g.queue.length >= 2) {
    return g.status === "ready" ? { ...g, status: "running" } : g;
  }
  return { ...g, queue: [...g.queue, dir], status: "running" };
}

export function togglePause(g) {
  if (g.status === "running") return { ...g, status: "paused" };
  if (g.status === "paused" || g.status === "ready")
    return { ...g, status: "running" };
  return g;
}

// One tick of the game loop.
export function step(g) {
  if (g.status !== "running") return g;
  const dir = g.queue.length ? g.queue[0] : g.dir;
  const queue = g.queue.slice(1);
  const head = g.snake[0];
  const row = Math.floor(head / SIZE) + DELTA[dir][0];
  const col = (head % SIZE) + DELTA[dir][1];
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) {
    return { ...g, dir, queue, status: "over" };
  }
  const next = row * SIZE + col;
  const eating = next === g.food;
  // The tail moves away this tick unless we grow, so it is not an obstacle.
  const body = eating ? g.snake : g.snake.slice(0, -1);
  if (body.includes(next)) return { ...g, dir, queue, status: "over" };
  const snake = [next, ...body];
  if (!eating) return { ...g, dir, queue, snake };
  const [food, rng] = placeFood(snake, g.rng);
  return {
    ...g,
    dir,
    queue,
    snake,
    food,
    rng,
    score: g.score + 1,
    status: food === -1 ? "won" : "running",
  };
}

export const KEY_TO_DIR = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};
`,
          "/styles.css": `:root {
  color-scheme: dark;
}
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f1115;
  color: #e8e8ea;
}
.snake {
  max-width: 360px;
  margin: 24px auto;
  padding: 0 16px;
}
.snake h1 {
  font-size: 1.3rem;
  margin: 0 0 8px;
}
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
button {
  background: #2a2f3a;
  color: #e8e8ea;
  border: 1px solid #3b4252;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
button:focus-visible {
  outline: 3px solid #f9a825;
  outline-offset: 2px;
}
.board {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2px;
  background: #161b22;
  padding: 4px;
  border-radius: 8px;
}
.cell {
  aspect-ratio: 1;
  border-radius: 3px;
  background: #1c2128;
}
.cell.body {
  background: #2ea043;
}
.cell.head {
  background: #7ee787;
}
.cell.food {
  background: #f85149;
  border-radius: 50%;
}
.status {
  min-height: 1.4em;
  margin: 10px 0;
}
.pad {
  display: grid;
  grid-template-columns: repeat(3, 56px);
  gap: 6px;
  justify-content: center;
}
.pad button {
  height: 44px;
}
.pad .up {
  grid-column: 2;
}
.pad .left {
  grid-column: 1;
  grid-row: 2;
}
.pad .down {
  grid-column: 2;
  grid-row: 2;
}
.pad .right {
  grid-column: 3;
  grid-row: 2;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round in Vue. You know <code>ref</code>, <code>computed</code> and templates; game loops are explained from zero.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> tag with the exact vocabulary. The Verified section is real output from mounting the solution with Vue 3.5.44 in jsdom and driving it with key presses and a manual clock.

## 1. Why This Even Matters — A Story First

A toy train moves one tile every time a metronome clicks. You shout directions; the driver writes them on a notepad and reads one per click, crossing out any instruction that would turn the train back into its own carriages. Snake is that train: a fixed **tick**, a **queue** of directions, and strict rules applied in order. The interesting part is not drawing squares but keeping key presses, ticks and rendering from stepping on each other.

## 2. Requirements and Plan

A 12 by 12 grid, a 150 ms tick, arrows and WASD to steer, food that grows the snake, walls and body that end the game, Space to pause, Restart, and touch buttons.

The rules live in a plain <code>src/utils/snake.js</code> with no Vue in it: <code>createGame(seed)</code>, <code>turn(game, dir)</code>, <code>step(game)</code>, <code>togglePause(game)</code>. Each returns a new game object.

📌 **Interview term: Game loop** — the repeating "advance the world one step, then draw" cycle. Here the step is the pure <code>step()</code> and Vue does the drawing.

| Piece | Vue primitive | Why |
| :--- | :--- | :--- |
| the game | <code>ref(createGame(1))</code> | Replaced by the pure functions on every tick and key |
| <code>running</code>, <code>over</code> | <code>computed</code> | Derived from <code>game.status</code> |
| the interval | <code>watch(running)</code> + a plain variable | Starts and stops with the status |
| key listener | <code>onMounted</code> / <code>onUnmounted</code> on <code>window</code> | Lives exactly as long as the component |
| cell kinds | <code>computed</code> in <code>SnakeBoard.vue</code> | 144 kinds derived from <code>snake</code> and <code>food</code> props |

## 3. Build It Step by Step

### Step 1: rules that never touch Vue

~~~js
export function turn(g, dir) {
  if (
    g.status === "over" ||
    g.status === "won" ||
    g.status === "paused"
  )
    return g;
  const last = g.queue.length ? g.queue[g.queue.length - 1] : g.dir;
  if (dir === last || dir === OPPOSITE[last] || g.queue.length >= 2) {
    return g.status === "ready" ? { ...g, status: "running" } : g;
  }
  return { ...g, queue: [...g.queue, dir], status: "running" };
}
~~~

📌 **Interview term: Direction queue** — pending turns, at most two, each checked against the **last queued** direction and consumed one per tick. Moving right, a fast Up then Left becomes "one tick up, one tick left" instead of an instant reversal into the neck, which is what a single <code>dir</code> variable would do.

<code>step(g)</code> takes one direction from the queue, computes the new row and column, checks the wall before converting to a cell number, treats the tail cell as free on a non-eating tick, and on eating places new food on a free cell:

~~~js
const eating = next === g.food;
// the tail leaves this tick
const body = eating ? g.snake : g.snake.slice(0, -1);
if (body.includes(next)) return { ...g, dir, queue, status: "over" };
~~~

📌 **Interview term: Seeded PRNG** — repeatable random numbers. The food RNG is mulberry32 written as a pure step, <code>nextRandom(state) -&gt; [value, nextState]</code>, and the state is stored in <code>game.rng</code>. That keeps <code>step</code> pure: the same game in, the same food out.

### Step 2: the loop with watch

~~~js
const game = ref(createGame(1));
const running = computed(() => game.value.status === "running");
const apply = (fn) => (game.value = fn(game.value));

let loop = null;
const stopLoop = () => {
  clearInterval(loop);
  loop = null;
};
watch(running, (on) => {
  stopLoop();
  if (on) loop = setInterval(() => apply(step), TICK_MS);
});
~~~

📌 **Interview term: watch** — run a side effect when a specific reactive source changes. Watching the computed <code>running</code> (not the whole game) means the interval is created once when the game starts, cleared on pause and game over, and never rebuilt on ordinary moves, so the tick stays steady. See [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch).

The callback calls <code>apply(step)</code>, which reads <code>game.value</code> at the moment it fires, so it always steps the current game.

### Step 3: keyboard on window

~~~js
function onKey(e) {
  const dir = KEY_TO_DIR[e.key];
  if (dir) {
    e.preventDefault();
    apply((g) => turn(g, dir));
  } else if (e.key === " ") {
    e.preventDefault();
    apply(togglePause);
  }
}
onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => {
  window.removeEventListener("keydown", onKey);
  stopLoop();
});
~~~

A listener on <code>window</code> works without focusing the board, <code>preventDefault</code> stops arrows and Space from scrolling, and <code>onUnmounted</code> removes both the listener and the interval ([Vue lifecycle hooks](/interview-question/what-are-vue-lifecycle-hooks)).

### Step 4: the board component

~~~js
const kinds = computed(() => {
  const body = new Set(props.snake);
  return Array.from({ length: SIZE * SIZE }, (_, i) =>
    i === props.snake[0]
      ? "head"
      : body.has(i)
        ? "body"
        : i === props.food
          ? "food"
          : "empty",
  );
});
~~~

<code>SnakeBoard.vue</code> receives <code>snake</code> and <code>food</code> as props and renders 144 <code>div</code>s with <code>v-for</code> over <code>kinds</code>. Keys are the cell index, which is stable here because the cells themselves never move, only their class does ([keys in v-for](/interview-question/why-is-the-key-attribute-important-in-v-for)).

## 4. Verified

Mounted with <code>createApp(App).mount("#app")</code> in jsdom. The driver then replaced <code>setInterval</code> with a manual clock so each <code>tick</code> fires the live interval callback once; "intervals" counts how many are alive. Keys were real <code>keydown</code> events and the driver steered towards the food it read from the DOM:

~~~text
RENDERED: SnakeScore: 0 · Length: 3StartPress an arrow key or Start▲◀▼▶
start: head (6,4) food (7,7) | Score: 0 · Length: 3 | Press an arrow key or Start | intervals 0
after Start: Score: 0 · Length: 3 | Running | intervals 1 | tick ms 150
2 ticks: head (6,6)
ArrowLeft (180 from right) ignored, 1 tick: head (6,7)
Up+Left queued in one tick: tick1 (5,7) tick2 (5,6)
Down then Up (Up is 180 from queued Down, dropped): tick1 (6,6) tick2 (7,6)
ate food 1 after 1 ticks: Score: 1 · Length: 4 | Running | next food (0,0)
ate food 2 after 14 ticks: Score: 2 · Length: 5 | Running | next food (6,6)
ate food 3 after 12 ticks: Score: 3 · Length: 6 | Running | next food (11,9)
Space: Score: 3 · Length: 6 | Paused | intervals 0 | head stayed (6,6) -> (6,6)
Space again: Score: 3 · Length: 6 | Running | intervals 1
hit the wall after 7 ticks: Score: 3 · Length: 6 | Game over · Final score 3 | intervals 0
Restart: head (6,4) food (8,10) | Score: 0 · Length: 3 | Press an arrow key or Start
logic: head turns down into its own body -> over
logic: head moves into the cell the tail is leaving -> running
logic: step() twice on the same game, same food: true
~~~

One interval while running and none before Start, after pause or after game over. The opposite key is ignored, Up then Left in one tick turns cleanly, and Down then Up drops the Up. Food grows the snake and the wall ends the game. The last three lines are pure-logic checks: self collision ends the game, the cell the tail is leaving is safe, and <code>step</code> picks the same food when called twice on the same game. The output is identical to the React and Angular builds. Real-time smoothness in a browser was not checked (fake clock, no paint in jsdom).

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Two keys inside one tick | Queued, applied on consecutive ticks |
| Opposite key, key mashing | Dropped; queue capped at two |
| Tail chasing | Tail cell is free on a non-eating tick |
| Unmount while running | <code>onUnmounted</code> clears the interval and the listener |
| Touch | On-screen buttons call <code>turn</code> |
| Screen reader | <code>role="img"</code> board label with the length; <code>role="status"</code> for Running, Paused and the final score |

## 6. Common Pitfalls

- **<code>watchEffect</code> that reads <code>game.value</code>.** It re-runs every tick and recreates the interval. Watch <code>running</code>.
- **One <code>dir</code> ref updated on every key.** Two fast presses reverse the snake.
- **<code>reactive()</code> state mutated in place by <code>step</code>.** It works, but the rules are no longer pure and testable; replace the object.
- **Forgetting to remove the window listener.** A remount adds a second listener and every key turns twice.
- **Treating the tail as an obstacle.** The snake dies when it should follow its own tail.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Walls kill, 12 by 12, 150 ms tick, arrows and WASD, Space pauses, first arrow starts."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Rules first:</strong> <span style="color:#f0e2c8;">"Pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">turn</code> in a plain module; the food RNG state lives in the game so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code> is pure."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Queue:</strong> <span style="color:#f0e2c8;">"Turns are queued, checked against the last queued direction, at most two, one consumed per tick."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Loop:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on the computed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code> creates and clears one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInterval</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUnmounted</code> cleans up."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it:</strong> <span style="color:#f0e2c8;">"Reversal, tail chasing, wall and self collision with the pure functions; then pause, restart and touch."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">requestAnimationFrame</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can: accumulate elapsed time each frame and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code> every 150 ms. It pauses in hidden tabs and allows smooth interpolation between cells. A fixed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInterval</code> is simpler and enough for a grid game.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should the game be <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shallowRef</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It could be: the game object is always replaced, never mutated, so deep reactivity buys nothing. With a few hundred cells either works; on a big board <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> avoids proxying every array.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you increase speed with the score?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make the delay a computed from the score and watch it together with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code>, recreating the interval only when either changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">turn</code>. For the component, use fake timers in Vitest, trigger keydown on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code>, advance 150 ms at a time and assert on the head position and score.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Game loop** | Advance one step, then draw, repeatedly |
| **Fixed tick** | Constant step rate, independent of rendering |
| **Direction queue** | Pending turns, validated, one per tick |
| **Seeded PRNG** | Repeatable random numbers from a seed |
| **watch** | Side effect when a specific source changes |
| **computed** | Cached value derived from reactive state |

---

**Conclusion:** In Vue, Snake is one <code>ref</code> holding an immutable game, a <code>watch</code> on the computed <code>running</code> that owns a single interval, and a window key listener tied to the component lifecycle. The rules, including the direction queue and the tail-aware collision check, are plain functions that the same driver proves behave identically in all three frameworks.`,
        files: {
          "/src/App.vue": `<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import SnakeBoard from "./components/SnakeBoard.vue";
import {
  KEY_TO_DIR,
  TICK_MS,
  createGame,
  step,
  togglePause,
  turn,
} from "./utils/snake.js";

const LABEL = {
  ready: "Press an arrow key or Start",
  running: "Running",
  paused: "Paused",
  over: "Game over",
  won: "You filled the board!",
};
const PAD = [
  ["up", "▲"],
  ["left", "◀"],
  ["down", "▼"],
  ["right", "▶"],
];

const game = ref(createGame(1));
const running = computed(() => game.value.status === "running");
const over = computed(
  () => game.value.status === "over" || game.value.status === "won",
);
const apply = (fn) => (game.value = fn(game.value));

// The game loop: one fixed-rate interval, alive only while running.
let loop = null;
const stopLoop = () => {
  clearInterval(loop);
  loop = null;
};
watch(running, (on) => {
  stopLoop();
  if (on) loop = setInterval(() => apply(step), TICK_MS);
});

function onKey(e) {
  const dir = KEY_TO_DIR[e.key];
  if (dir) {
    e.preventDefault(); // stop arrow keys from scrolling the page
    apply((g) => turn(g, dir));
  } else if (e.key === " ") {
    e.preventDefault();
    apply(togglePause);
  }
}
onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => {
  window.removeEventListener("keydown", onKey);
  stopLoop();
});
</script>

<template>
  <main class="snake">
    <h1>Snake</h1>
    <div class="bar">
      <span data-testid="score">Score: {{ game.score }} · Length: {{ game.snake.length }}</span>
      <button
        v-if="over"
        type="button"
        @click="apply((g) => createGame(g.seed + 1))"
      >Restart</button>
      <button
        v-else
        type="button"
        @click="apply(togglePause)"
      >{{ running ? "Pause" : "Start" }}</button>
    </div>
    <SnakeBoard :snake="game.snake" :food="game.food" />
    <p
      class="status"
      role="status"
      data-testid="status"
    >{{ LABEL[game.status] }}{{ over ? " · Final score " + game.score : "" }}</p>
    <div class="pad">
      <button
        v-for="[d, icon] in PAD"
        :key="d"
        type="button"
        :class="d"
        :aria-label="d"
        @click="apply((g) => turn(g, d))"
      >{{ icon }}</button>
    </div>
  </main>
</template>

<style>
:root {
  color-scheme: dark;
}
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f1115;
  color: #e8e8ea;
}
.snake {
  max-width: 360px;
  margin: 24px auto;
  padding: 0 16px;
}
.snake h1 {
  font-size: 1.3rem;
  margin: 0 0 8px;
}
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
button {
  background: #2a2f3a;
  color: #e8e8ea;
  border: 1px solid #3b4252;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
button:focus-visible {
  outline: 3px solid #f9a825;
  outline-offset: 2px;
}
.board {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2px;
  background: #161b22;
  padding: 4px;
  border-radius: 8px;
}
.cell {
  aspect-ratio: 1;
  border-radius: 3px;
  background: #1c2128;
}
.cell.body {
  background: #2ea043;
}
.cell.head {
  background: #7ee787;
}
.cell.food {
  background: #f85149;
  border-radius: 50%;
}
.status {
  min-height: 1.4em;
  margin: 10px 0;
}
.pad {
  display: grid;
  grid-template-columns: repeat(3, 56px);
  gap: 6px;
  justify-content: center;
}
.pad button {
  height: 44px;
}
.pad .up {
  grid-column: 2;
}
.pad .left {
  grid-column: 1;
  grid-row: 2;
}
.pad .down {
  grid-column: 2;
  grid-row: 2;
}
.pad .right {
  grid-column: 3;
  grid-row: 2;
}
</style>
`,
          "/src/components/SnakeBoard.vue": `<script setup>
import { computed } from "vue";
import { SIZE } from "../utils/snake.js";

const props = defineProps({
  snake: { type: Array, required: true },
  food: { type: Number, required: true },
});

// Derived, cached per snake/food change: the kind of every cell.
const kinds = computed(() => {
  const body = new Set(props.snake);
  return Array.from({ length: SIZE * SIZE }, (_, i) =>
    i === props.snake[0]
      ? "head"
      : body.has(i)
        ? "body"
        : i === props.food
          ? "food"
          : "empty",
  );
});
</script>

<template>
  <div
    class="board"
    role="img"
    :aria-label="
      'Snake board, ' + SIZE + ' by ' + SIZE + ', snake length ' + snake.length
    "
  >
    <div
      v-for="(kind, i) in kinds"
      :key="i"
      :class="['cell', kind]"
      data-testid="cell"
      :data-kind="kind"
    ></div>
  </div>
</template>
`,
          "/src/utils/snake.js": `// Pure Snake logic. A game is a plain object; every function returns a new one.
// Cells are numbered row * SIZE + col. The snake array is head first.

export const SIZE = 12;
export const TICK_MS = 150;
const DELTA = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

// mulberry32 written as a pure step: (state) -> [value, nextState].
// Keeping the RNG state inside the game object makes step() a pure function,
// so calling it twice with the same game gives the same food both times.
export function nextRandom(state) {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

function placeFood(snake, rngState) {
  const taken = new Set(snake);
  const free = [];
  for (let i = 0; i < SIZE * SIZE; i++) if (!taken.has(i)) free.push(i);
  if (free.length === 0) return [-1, rngState];
  const [r, next] = nextRandom(rngState);
  return [free[Math.floor(r * free.length)], next];
}

export function createGame(seed) {
  const mid = Math.floor(SIZE / 2) * SIZE;
  const snake = [mid + 4, mid + 3, mid + 2];
  const [food, rng] = placeFood(snake, seed);
  return {
    seed,
    snake,
    dir: "right",
    queue: [],
    food,
    rng,
    score: 0,
    status: "ready",
  };
}

// Queue a turn. It is checked against the LAST queued direction, not only the
// current one, so two quick presses can never add up to a 180-degree turn.
export function turn(g, dir) {
  if (g.status === "over" || g.status === "won" || g.status === "paused")
    return g;
  const last = g.queue.length ? g.queue[g.queue.length - 1] : g.dir;
  if (dir === last || dir === OPPOSITE[last] || g.queue.length >= 2) {
    return g.status === "ready" ? { ...g, status: "running" } : g;
  }
  return { ...g, queue: [...g.queue, dir], status: "running" };
}

export function togglePause(g) {
  if (g.status === "running") return { ...g, status: "paused" };
  if (g.status === "paused" || g.status === "ready")
    return { ...g, status: "running" };
  return g;
}

// One tick of the game loop.
export function step(g) {
  if (g.status !== "running") return g;
  const dir = g.queue.length ? g.queue[0] : g.dir;
  const queue = g.queue.slice(1);
  const head = g.snake[0];
  const row = Math.floor(head / SIZE) + DELTA[dir][0];
  const col = (head % SIZE) + DELTA[dir][1];
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) {
    return { ...g, dir, queue, status: "over" };
  }
  const next = row * SIZE + col;
  const eating = next === g.food;
  // The tail moves away this tick unless we grow, so it is not an obstacle.
  const body = eating ? g.snake : g.snake.slice(0, -1);
  if (body.includes(next)) return { ...g, dir, queue, status: "over" };
  const snake = [next, ...body];
  if (!eating) return { ...g, dir, queue, snake };
  const [food, rng] = placeFood(snake, g.rng);
  return {
    ...g,
    dir,
    queue,
    snake,
    food,
    rng,
    score: g.score + 1,
    status: food === -1 ? "won" : "running",
  };
}

export const KEY_TO_DIR = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round in Angular. You know components and templates; signals and game loops are explained as we go.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> tag with the exact vocabulary. The Verified section is real output from booting the solution on Angular 22.2.3 twice (AOT with strict templates, and the runtime JIT the playground uses) and driving it with key presses and a manual clock.

## 1. Why This Even Matters — A Story First

A toy train moves one tile per metronome click. You shout directions, the driver writes them down and reads exactly one per click, and refuses any instruction that would turn the train back into itself. That is Snake: a fixed **tick**, a **queue** of directions and collision rules applied in a strict order. The engineering question is how to keep key presses, ticks and change detection apart.

## 2. Requirements and Plan

A 12 by 12 grid, a 150 ms tick, arrows and WASD, food that grows the snake, walls and body that end the game, Space to pause, Restart and touch buttons.

The rules are framework-free TypeScript in <code>snake.ts</code>: types for <code>Dir</code>, <code>Status</code> and <code>Game</code>, and pure <code>createGame</code>, <code>turn</code>, <code>step</code> and <code>togglePause</code>.

| Piece | Angular primitive | Why |
| :--- | :--- | :--- |
| the game | <code>signal&lt;Game&gt;</code> | Replaced with <code>update()</code> on each tick and key |
| <code>running</code>, <code>over</code> | <code>computed()</code> | Derived from the status |
| the interval | <code>effect()</code> with <code>onCleanup</code> | Exists only while <code>running()</code> is true |
| keyboard | <code>@HostListener("window:keydown")</code> | Removed automatically when the component is destroyed |
| board | <code>SnakeBoardComponent</code>, <code>OnPush</code>, input setters | Rebuilds the 144 cell kinds only when the snake or food changes |

📌 **Interview term: Game loop** — the repeating "advance one step, then draw" cycle. The step is the pure <code>step()</code>; Angular draws.

## 3. Build It Step by Step

### Step 1: typed rules and the direction queue

~~~ts
export function turn(g: Game, dir: Dir): Game {
  if (
    g.status === "over" ||
    g.status === "won" ||
    g.status === "paused"
  )
    return g;
  const last = g.queue.length ? g.queue[g.queue.length - 1] : g.dir;
  if (dir === last || dir === OPPOSITE[last] || g.queue.length >= 2) {
    return g.status === "ready" ? { ...g, status: "running" } : g;
  }
  return { ...g, queue: [...g.queue, dir], status: "running" };
}
~~~

📌 **Interview term: Direction queue** — up to two pending turns, each validated against the last queued direction and consumed one per tick. It is what turns a fast Up-then-Left (while moving right) into two clean turns instead of an instant reversal.

<code>step(g)</code> takes one queued direction, checks the wall on row and column before building the cell number, treats the tail as free when not eating (<code>eating ? g.snake : g.snake.slice(0, -1)</code>) and places food on a free cell with a pure seeded RNG whose state is stored in <code>game.rng</code>.

📌 **Interview term: Collision detection** — checking the new head against the walls and the body. The tail rule is the subtle part: the tail leaves its cell on the same tick the head arrives.

### Step 2: the loop as an effect

~~~ts
readonly game = signal<Game>(createGame(1));
readonly running = computed(() => this.game().status === "running");

constructor() {
  effect((onCleanup) => {
    if (!this.running()) return;
    const id = setInterval(() => this.game.update(step), TICK_MS);
    onCleanup(() => clearInterval(id));
  });
}
~~~

📌 **Interview term: effect() with onCleanup** — an effect re-runs when a signal it read changes, and calls its registered cleanup first (and on destroy). This one reads only <code>running()</code>, so it creates one interval when the game starts and clears it on pause, game over or destroy; ordinary moves do not touch it. Background: [when to use effect](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it).

<code>this.game.update(step)</code> always steps the current value. Because the app is zoneless (Angular 21 and later default to it, as the <code>@angular/core</code> 22.2.3 typings state), the view refreshes because the signal changed, not because a timer fired; a plain field updated inside the interval would never reach the screen.

### Step 3: keyboard with HostListener

~~~ts
@HostListener("window:keydown", ["$event"])
onKey(e: KeyboardEvent) {
  const dir = KEY_TO_DIR[e.key];
  if (dir) {
    e.preventDefault();
    this.move(dir);
  } else if (e.key === " ") {
    e.preventDefault();
    this.apply(togglePause);
  }
}
~~~

📌 **Interview term: @HostListener** — a decorator that subscribes a method to an event on the host element or on a global target such as <code>window</code>, and unsubscribes when the component is destroyed. See [@HostListener and @HostBinding](/interview-question/what-do-hostlistener-and-hostbinding-do).

### Step 4: an OnPush board

<code>SnakeBoardComponent</code> takes <code>@Input</code> setters for <code>snake</code> and <code>food</code>; each setter rebuilds a <code>kinds</code> array, and the template renders it with <code>@for (kind of kinds; track $index)</code>. Index tracking is correct here because cells never move, only their class does. The playground compiles at runtime (JIT), where signal <code>input()</code> does not register, hence the decorator inputs.

## 4. Verified

Booted with <code>bootstrapApplication(AppComponent)</code> and no providers, compiled AOT with <code>strictTemplates</code> and also through the runtime JIT; both printed the same lines (this is the JIT run). The driver replaced <code>setInterval</code> with a manual clock, so each <code>tick</code> fires the live interval callback once; "intervals" counts how many are alive:

~~~text
RENDERED: SnakeScore: 0 · Length: 3StartPress an arrow key or Start▲◀▼▶
start: head (6,4) food (7,7) | Score: 0 · Length: 3 | Press an arrow key or Start | intervals 0
after Start: Score: 0 · Length: 3 | Running | intervals 1 | tick ms 150
2 ticks: head (6,6)
ArrowLeft (180 from right) ignored, 1 tick: head (6,7)
Up+Left queued in one tick: tick1 (5,7) tick2 (5,6)
Down then Up (Up is 180 from queued Down, dropped): tick1 (6,6) tick2 (7,6)
ate food 1 after 1 ticks: Score: 1 · Length: 4 | Running | next food (0,0)
ate food 2 after 14 ticks: Score: 2 · Length: 5 | Running | next food (6,6)
ate food 3 after 12 ticks: Score: 3 · Length: 6 | Running | next food (11,9)
Space: Score: 3 · Length: 6 | Paused | intervals 0 | head stayed (6,6) -> (6,6)
Space again: Score: 3 · Length: 6 | Running | intervals 1
hit the wall after 7 ticks: Score: 3 · Length: 6 | Game over · Final score 3 | intervals 0
Restart: head (6,4) food (8,10) | Score: 0 · Length: 3 | Press an arrow key or Start
logic: head turns down into its own body -> over
logic: head moves into the cell the tail is leaving -> running
logic: step() twice on the same game, same food: true
~~~

The loop exists only while running, opposite keys and the queued-180 case are dropped, Up then Left turns cleanly over two ticks, eating grows the snake, the wall ends the game, and the pure-logic checks pass. One thing showed up while writing the driver: in one JIT run with only a 5 ms settle after each tick, the driver read the DOM before the scheduled render had happened and counted one extra tick; with 20 ms both modes agree on every run. Change detection here is scheduled, not synchronous, so tests should await stability rather than read the DOM straight after a signal write. Real-time smoothness in a browser was not checked.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Two keys inside one tick | Queued and applied on consecutive ticks |
| Opposite key, key mashing | Dropped; queue capped at two |
| Tail chasing | Tail cell is free on a non-eating tick |
| Destroy while running | Effect cleanup clears the interval; HostListener unsubscribes |
| Touch | On-screen buttons call <code>move()</code> |
| Screen reader | <code>role="img"</code> board label with the length; <code>role="status"</code> for state and the final score |

## 6. Common Pitfalls

- **An effect that reads <code>game()</code>.** It re-runs every tick and recreates the interval.
- **Plain fields in a zoneless app.** Updates inside <code>setInterval</code> do not render; use signals.
- **A manual <code>window.addEventListener</code> without removal.** Use <code>@HostListener</code> or remove it in <code>DestroyRef.onDestroy</code>.
- **One <code>dir</code> field updated per key.** Two quick presses reverse the snake.
- **Wall check after computing the cell number.** Column 12 wraps into the next row.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Walls kill, 12 by 12, 150 ms tick, arrows and WASD, Space pauses, first arrow starts."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Rules first:</strong> <span style="color:#f0e2c8;">"Typed pure functions: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code> moves and collides, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">turn</code> queues, and the food RNG state is part of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Game</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Queue:</strong> <span style="color:#f0e2c8;">"At most two pending turns, validated against the last queued one, consumed one per tick."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Loop:</strong> <span style="color:#f0e2c8;">"An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> that reads only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running()</code> starts one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInterval</code> and clears it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it:</strong> <span style="color:#f0e2c8;">"Reversal, tail chasing and collisions with the pure functions; pause, restart and touch in the UI."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not RxJS <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">interval</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That works too: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toObservable(running)</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">interval(150)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EMPTY</code>, subscribed with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">takeUntilDestroyed</code>. The effect version is shorter when the state is already in signals.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">OnPush</code> needed for the board?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for correctness; signals already schedule the refresh. It documents that the board depends only on its inputs and skips it when they did not change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the game loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">turn</code> directly. For the component, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fakeAsync</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(150)</code> (zone-based tests) or a manual clock, dispatch keydown on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code>, then await <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.whenStable()</code> before reading the DOM.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add speed levels?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make the delay a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> from the score and read it inside the effect, so the interval is recreated only when the speed or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">running</code> changes.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Game loop** | Advance one step, then draw, repeatedly |
| **Direction queue** | Pending turns, validated, applied one per tick |
| **Collision detection** | Checking the new head against walls and body |
| **effect() with onCleanup** | Side effect tied to signals, cleaned before re-run and on destroy |
| **@HostListener** | Decorator that binds a method to a host or global event |
| **Zoneless** | Change detection driven by signals rather than zone.js |

---

**Conclusion:** In Angular, Snake is one signal holding an immutable <code>Game</code>, an effect that owns a single interval and cleans it up through <code>onCleanup</code>, and a <code>@HostListener</code> on <code>window</code> that feeds a validated direction queue. The rules are plain TypeScript, so the same driver produces the same output in AOT, JIT, React and Vue.`,
        files: {
          "/src/app/app.component.ts": `import {
  Component,
  HostListener,
  computed,
  effect,
  signal,
} from "@angular/core";
import { SnakeBoardComponent } from "./components/snake-board.component";
import {
  Dir,
  Game,
  KEY_TO_DIR,
  TICK_MS,
  createGame,
  step,
  togglePause,
  turn,
} from "./utils/snake";

const LABEL: Record<string, string> = {
  ready: "Press an arrow key or Start",
  running: "Running",
  paused: "Paused",
  over: "Game over",
  won: "You filled the board!",
};

@Component({
  selector: "app-root",
  standalone: true,
  imports: [SnakeBoardComponent],
  template: \`
    <main class="snake">
      <h1>Snake</h1>
      <div class="bar">
        <span data-testid="score">Score: {{ game().score }} · Length: {{ game().snake.length }}</span>
        @if (over()) {
          <button type="button" (click)="restart()">Restart</button>
        } @else {
          <button
            type="button"
            (click)="apply(togglePause)"
          >{{ running() ? "Pause" : "Start" }}</button>
        }
      </div>
      <app-snake-board [snake]="game().snake" [food]="game().food" />
      <p
        class="status"
        role="status"
        data-testid="status"
      >{{ label[game().status] }}{{ over() ? " · Final score " + game().score : "" }}</p>
      <div class="pad">
        @for (p of pad; track p.dir) {
          <button
            type="button"
            [class]="p.dir"
            [attr.aria-label]="p.dir"
            (click)="move(p.dir)"
          >{{ p.icon }}</button>
        }
      </div>
    </main>
  \`,
  styles: [
    \`
    :host { display: block; font-family: system-ui, sans-serif; color: #e8e8ea; }
    .snake { max-width: 360px; margin: 24px auto; padding: 0 16px; }
    .snake h1 { font-size: 1.3rem; margin: 0 0 8px; }
    .bar { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px; }
    button { background: #2a2f3a; color: #e8e8ea; border: 1px solid #3b4252; border-radius: 6px; padding: 6px 12px; cursor: pointer; }
    button:focus-visible { outline: 3px solid #f9a825; outline-offset: 2px; }
    .status { min-height: 1.4em; margin: 10px 0; }
    .pad { display: grid; grid-template-columns: repeat(3, 56px); gap: 6px; justify-content: center; }
    .pad button { height: 44px; }
    .pad .up { grid-column: 2; }
    .pad .left { grid-column: 1; grid-row: 2; }
    .pad .down { grid-column: 2; grid-row: 2; }
    .pad .right { grid-column: 3; grid-row: 2; }
  \`,
  ],
})
export class AppComponent {
  readonly label = LABEL;
  readonly togglePause = togglePause;
  readonly pad: { dir: Dir; icon: string }[] = [
    { dir: "up", icon: "▲" },
    { dir: "left", icon: "◀" },
    { dir: "down", icon: "▼" },
    { dir: "right", icon: "▶" },
  ];
  readonly game = signal<Game>(createGame(1));
  readonly running = computed(() => this.game().status === "running");
  readonly over = computed(
    () => this.game().status === "over" || this.game().status === "won",
  );

  constructor() {
    // The game loop: re-runs only when running() flips; onCleanup clears the
    // interval on pause, game over and component destroy.
    effect((onCleanup) => {
      if (!this.running()) return;
      const id = setInterval(() => this.game.update(step), TICK_MS);
      onCleanup(() => clearInterval(id));
    });
  }

  apply(fn: (g: Game) => Game) {
    this.game.update(fn);
  }

  move(dir: Dir) {
    this.game.update((g) => turn(g, dir));
  }

  restart() {
    this.game.update((g) => createGame(g.seed + 1));
  }

  @HostListener("window:keydown", ["$event"])
  onKey(e: KeyboardEvent) {
    const dir = KEY_TO_DIR[e.key];
    if (dir) {
      e.preventDefault(); // stop arrow keys from scrolling the page
      this.move(dir);
    } else if (e.key === " ") {
      e.preventDefault();
      this.apply(togglePause);
    }
  }
}
`,
          "/src/app/components/snake-board.component.ts": `import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { SIZE } from "../utils/snake";

@Component({
  selector: "app-snake-board",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <div
      class="board"
      role="img"
      [attr.aria-label]="
        'Snake board, ' +
        size +
        ' by ' +
        size +
        ', snake length ' +
        snake.length
      "
    >
      @for (kind of kinds; track $index) {
        <div
          class="cell"
          [class]="'cell ' + kind"
          data-testid="cell"
          [attr.data-kind]="kind"
        ></div>
      }
    </div>
  \`,
  styles: [
    \`
      .board {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        gap: 2px;
        background: #161b22;
        padding: 4px;
        border-radius: 8px;
      }
      .cell {
        aspect-ratio: 1;
        border-radius: 3px;
        background: #1c2128;
      }
      .cell.body {
        background: #2ea043;
      }
      .cell.head {
        background: #7ee787;
      }
      .cell.food {
        background: #f85149;
        border-radius: 50%;
      }
    \`,
  ],
})
export class SnakeBoardComponent {
  readonly size = SIZE;
  kinds: string[] = [];
  private _snake: number[] = [];
  private _food = -1;

  @Input({ required: true }) set snake(v: number[]) {
    this._snake = v;
    this.rebuild();
  }
  get snake() {
    return this._snake;
  }
  @Input({ required: true }) set food(v: number) {
    this._food = v;
    this.rebuild();
  }

  private rebuild() {
    const body = new Set(this._snake);
    this.kinds = Array.from({ length: SIZE * SIZE }, (_, i) =>
      i === this._snake[0]
        ? "head"
        : body.has(i)
          ? "body"
          : i === this._food
            ? "food"
            : "empty",
    );
  }
}
`,
          "/src/app/utils/snake.ts": `// Pure Snake logic. A game is a plain object; every function returns a new one.
// Cells are numbered row * SIZE + col. The snake array is head first.

export type Dir = "up" | "down" | "left" | "right";
export type Status = "ready" | "running" | "paused" | "over" | "won";
export interface Game {
  seed: number;
  snake: number[];
  dir: Dir;
  queue: Dir[];
  food: number;
  rng: number;
  score: number;
  status: Status;
}

export const SIZE = 12;
export const TICK_MS = 150;
const DELTA: Record<Dir, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};
const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

// mulberry32 written as a pure step: (state) -> [value, nextState].
// Keeping the RNG state inside the game object makes step() a pure function,
// so calling it twice with the same game gives the same food both times.
export function nextRandom(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

function placeFood(snake: number[], rngState: number): [number, number] {
  const taken = new Set(snake);
  const free: number[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) if (!taken.has(i)) free.push(i);
  if (free.length === 0) return [-1, rngState];
  const [r, next] = nextRandom(rngState);
  return [free[Math.floor(r * free.length)], next];
}

export function createGame(seed: number): Game {
  const mid = Math.floor(SIZE / 2) * SIZE;
  const snake = [mid + 4, mid + 3, mid + 2];
  const [food, rng] = placeFood(snake, seed);
  return {
    seed,
    snake,
    dir: "right",
    queue: [],
    food,
    rng,
    score: 0,
    status: "ready",
  };
}

// Queue a turn. It is checked against the LAST queued direction, not only the
// current one, so two quick presses can never add up to a 180-degree turn.
export function turn(g: Game, dir: Dir): Game {
  if (g.status === "over" || g.status === "won" || g.status === "paused")
    return g;
  const last = g.queue.length ? g.queue[g.queue.length - 1] : g.dir;
  if (dir === last || dir === OPPOSITE[last] || g.queue.length >= 2) {
    return g.status === "ready" ? { ...g, status: "running" } : g;
  }
  return { ...g, queue: [...g.queue, dir], status: "running" };
}

export function togglePause(g: Game): Game {
  if (g.status === "running") return { ...g, status: "paused" };
  if (g.status === "paused" || g.status === "ready")
    return { ...g, status: "running" };
  return g;
}

// One tick of the game loop.
export function step(g: Game): Game {
  if (g.status !== "running") return g;
  const dir = g.queue.length ? g.queue[0] : g.dir;
  const queue = g.queue.slice(1);
  const head = g.snake[0];
  const row = Math.floor(head / SIZE) + DELTA[dir][0];
  const col = (head % SIZE) + DELTA[dir][1];
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) {
    return { ...g, dir, queue, status: "over" };
  }
  const next = row * SIZE + col;
  const eating = next === g.food;
  // The tail moves away this tick unless we grow, so it is not an obstacle.
  const body = eating ? g.snake : g.snake.slice(0, -1);
  if (body.includes(next)) return { ...g, dir, queue, status: "over" };
  const snake = [next, ...body];
  if (!eating) return { ...g, dir, queue, snake };
  const [food, rng] = placeFood(snake, g.rng);
  return {
    ...g,
    dir,
    queue,
    snake,
    food,
    rng,
    score: g.score + 1,
    status: food === -1 ? "won" : "running",
  };
}

export const KEY_TO_DIR: Record<string, Dir | undefined> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Sudoku board with validation",
    seoDescription: "Build a Sudoku board in React, Vue and Angular: locked givens, digit-only input, row, column and box conflict highlighting, arrow keys, solved check.",
    description: `**Question presented to candidate:**
"Build a playable Sudoku board. Show a 9 by 9 grid with a puzzle prefilled; the given numbers cannot be edited. As the player types, highlight every cell that breaks the rules, meaning the same digit twice in a row, a column or a 3 by 3 box, and tell them when the puzzle is solved."

**Requirements:**
- 81 cells; givens are visually distinct and read-only.
- Only the digits 1 to 9 are accepted; typing over a cell replaces its digit; Backspace or Delete clears it.
- Live validation: every cell involved in a duplicate in its row, column or box is highlighted, givens included.
- A filled counter, a conflict counter and a "Solved" message when all 81 cells are filled with no conflicts.
- Arrow keys move between cells; the row, column and box of the focused cell are softly highlighted.
- A Clear button restores the original puzzle.

**What a strong answer should cover:**
- One piece of state (81 numbers) with conflicts, counts and "solved" all **derived** from it, recomputed with memoisation.
- An efficient conflict algorithm: walk the 27 units (9 rows, 9 columns, 9 boxes) and flag values that appear more than once, and the box index formula \`floor(row / 3) * 3 + floor(col / 3)\`.
- Input sanitising (letters, 0, paste) and keeping the DOM in sync when an edit is rejected.
- Roving tabindex so the grid is one tab stop, with arrow-key navigation and labelled cells (\`aria-invalid\` on conflicts).
- Validation versus solving: rule-checking does not need the solution; a solver (backtracking) is a separate concern.

**Clarifying questions expected:**
- "Should we validate against the rules only, or against the known solution?"
- "Do you want pencil marks (candidate notes) or just one digit per cell?"
- "Where do puzzles come from: hard-coded, generated, or fetched?"

**Code / implementation expected:** Yes. A working grid with live conflict highlighting in the framework of your choice; the validation function should be plain and testable.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round. You know React components and <code>useState</code>; Sudoku rules and the algorithm are explained from zero.
**Difficulty:** Hard

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The Verified section is real output from booting the solution on React 19.3.1 in StrictMode and typing into it with a script.

## 1. Why This Even Matters — A Story First

A Sudoku is a 9 by 9 grid split into nine 3 by 3 boxes. Some numbers are printed in advance (the **givens**). You fill the rest so that every row, every column and every box contains each digit 1 to 9 exactly once. On paper, when you write a 5 next to another 5, nothing happens: you discover the mistake twenty minutes later. A good digital board is a patient friend looking over your shoulder who quietly circles both 5s the moment you write the second one, and rubs the circles out the moment you fix it.

That friend is the whole question. It tests whether you can keep one source of truth, derive everything else from it, write a small but correct algorithm, and handle the messy input that real keyboards produce.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Validate against the rules, or against the known solution? | Rules-only needs no solution and gives instant, fair feedback; solution-checking reveals answers. This build checks rules. |
| Should a conflict highlight both cells, or only the newest? | Highlighting every cell in the duplicate (givens too) shows the player what clashes with what. |
| Pencil marks (small candidate digits)? | Changes the cell model from a number to a number plus a set of notes. |
| Where do puzzles come from? | Hard-coded, generated (needs a solver and a uniqueness check) or fetched (needs loading state). |
| Keyboard navigation required? | Decides roving tabindex versus 81 tab stops. |
| Mobile? | <code>inputMode="numeric"</code> or an on-screen number pad. |

## 3. Requirements and Plan

📌 **Interview term: Unit** — one row, one column or one 3 by 3 box. A Sudoku has 27 units and every cell belongs to exactly three of them. Two cells that share a unit are **peers**; each cell has 20 peers.

The whole board is **one array of 81 numbers**, <code>0</code> meaning empty, read left to right and top to bottom, so cell <code>i</code> sits at row <code>Math.floor(i / 9)</code> and column <code>i % 9</code>.

| Piece | Kind | Notes |
| :--- | :--- | :--- |
| <code>cells</code> | state | 81 numbers, the only thing the player changes |
| <code>active</code> | state | Index of the focused cell, for roving tabindex and peer highlight |
| <code>GIVENS</code> | constant | Which cells came with the puzzle; never changes during a game |
| <code>conflicts</code> | derived, memoised | Set of indices involved in any duplicate |
| <code>filled</code>, <code>solved</code> | derived | Counts from <code>cells</code> and <code>conflicts</code> |
| cell DOM nodes | ref | An array of input elements, only to move focus |

📌 **Interview term: Derived state** — a value computed from state during render rather than stored. Conflicts are never "updated"; they are recalculated from <code>cells</code>, so they can never disagree with what is on the board.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 340" role="img" aria-label="The nine boxes of a Sudoku numbered zero to eight, and the formula that maps a row and column to a box">
  <rect class="d-box-muted" x="20" y="20" width="100" height="96" rx="6"/>
  <text class="d-text" x="70" y="62" text-anchor="middle">box 0</text>
  <text class="d-sub" x="70" y="86" text-anchor="middle">rows 0-2</text>
  <rect class="d-box-muted" x="125" y="20" width="100" height="96" rx="6"/>
  <text class="d-text" x="175" y="62" text-anchor="middle">box 1</text>
  <text class="d-sub" x="175" y="86" text-anchor="middle">cols 3-5</text>
  <rect class="d-box-muted" x="230" y="20" width="100" height="96" rx="6"/>
  <text class="d-text" x="280" y="62" text-anchor="middle">box 2</text>
  <text class="d-sub" x="280" y="86" text-anchor="middle">cols 6-8</text>
  <rect class="d-box-muted" x="20" y="121" width="100" height="96" rx="6"/>
  <text class="d-text" x="70" y="163" text-anchor="middle">box 3</text>
  <text class="d-sub" x="70" y="187" text-anchor="middle">rows 3-5</text>
  <rect class="d-box-muted" x="125" y="121" width="100" height="96" rx="6"/>
  <text class="d-text" x="175" y="163" text-anchor="middle">box 4</text>
  <rect class="d-box-accent" x="230" y="121" width="100" height="96" rx="6"/>
  <text class="d-text d-accent" x="280" y="163" text-anchor="middle">box 5</text>
  <text class="d-sub" x="280" y="187" text-anchor="middle">row 4, col 7</text>
  <rect class="d-box-muted" x="20" y="222" width="100" height="96" rx="6"/>
  <text class="d-text" x="70" y="264" text-anchor="middle">box 6</text>
  <text class="d-sub" x="70" y="288" text-anchor="middle">rows 6-8</text>
  <rect class="d-box-muted" x="125" y="222" width="100" height="96" rx="6"/>
  <text class="d-text" x="175" y="264" text-anchor="middle">box 7</text>
  <rect class="d-box-muted" x="230" y="222" width="100" height="96" rx="6"/>
  <text class="d-text" x="280" y="264" text-anchor="middle">box 8</text>
  <rect class="d-box" x="390" y="110" width="270" height="118" rx="10"/>
  <text class="d-text" x="525" y="142" text-anchor="middle">boxOf(row, col) =</text>
  <text class="d-text d-accent" x="525" y="172" text-anchor="middle">floor(row / 3) * 3 + floor(col / 3)</text>
  <text class="d-sub" x="525" y="204" text-anchor="middle">row 4, col 7: 1 * 3 + 2 = 5</text>
  <path class="d-edge-dashed" d="M 334 169 L 384 169"/>
</svg>

Rows and columns are zero-based in code (the UI says "Row 5, column 8" for the same cell). <code>floor(row / 3)</code> picks the band of boxes, <code>floor(col / 3)</code> picks the stack within it.

## 4. Build It Step by Step

### Step 1: the 27 units, built once

~~~js
export const rowOf = (i) => Math.floor(i / 9);
export const colOf = (i) => i % 9;
export const boxOf = (i) =>
  Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

const UNITS = [];
for (let k = 0; k < 9; k++) {
  UNITS.push([...Array(9)].map((_, j) => k * 9 + j)); // row k
  UNITS.push([...Array(9)].map((_, j) => j * 9 + k)); // column k
  // box k
  UNITS.push([...Array(81).keys()].filter((i) => boxOf(i) === k));
}
~~~

Building the unit lists at module load means the validator never repeats index arithmetic.

### Step 2: find every conflicting cell

~~~js
export function findConflicts(cells) {
  const bad = new Set();
  for (const unit of UNITS) {
    const seen = new Map(); // value -> indices holding it in this unit
    for (const i of unit) {
      const v = cells[i];
      if (!v) continue;
      if (!seen.has(v)) seen.set(v, []);
      seen.get(v).push(i);
    }
    for (const list of seen.values())
      if (list.length > 1) list.forEach((i) => bad.add(i));
  }
  return bad;
}
~~~

📌 **Interview term: Conflict detection** — finding every cell whose value is repeated within one of its units. This version visits 27 units of 9 cells, 243 visits, however full the board is. The naive alternative, comparing every cell with its 20 peers, is 81 times 20, 1,620 comparisons; both are instant at this size, but the unit walk is easier to get right and naturally marks **both** cells of a duplicate.

A <code>Set</code> is the right return type: a cell in a row conflict and a box conflict at the same time is still one highlighted cell.

📌 **Interview term: Validation versus solving** — validation checks the rules on what is on the board; it needs no answer key. Solving fills the blanks (usually with backtracking). The driver in section 5 uses a small backtracking solver only to know what to type; the app never needs it.

### Step 3: sanitise what the keyboard sends

~~~js
export const digitFrom = (raw) =>
  Number(raw.replace(/[^1-9]/g, "").slice(-1) || 0);

export function setCell(cells, givens, i, value) {
  if (givens[i] || cells[i] === value) return cells;
  const next = cells.slice();
  next[i] = value;
  return next;
}
~~~

An input fires <code>change</code> with the whole new text, which may be <code>"5"</code>, <code>"54"</code> (typing over a filled cell), <code>"5a"</code>, <code>"0"</code> or a pasted <code>"12"</code>. Keeping only the **last** digit from 1 to 9 makes "type over" work, and anything else empties the cell. No <code>maxLength</code>: it would block typing over a filled cell.

<code>setCell</code> refuses to edit a given even if something bypasses <code>readOnly</code> (a script, a browser extension), and returns the same array when nothing changes so React skips the render.

### Step 4: the cell and the board

~~~jsx
<input
  ref={inputRef}
  className={cls}
  data-testid="cell"
  inputMode="numeric"
  autoComplete="off"
  aria-label={
    "Row " +
    (r + 1) +
    ", column " +
    (c + 1) +
    (given ? ", given" : "") +
    (conflict ? ", conflict" : "")
  }
  aria-invalid={conflict || undefined}
  readOnly={given}
  tabIndex={active ? 0 : -1}
  value={value || ""}
  onChange={(e) => onValue(index, e.target.value)}
  onKeyDown={(e) => onKeyDown(index, e)}
  onFocus={() => onFocus(index)}
/>
~~~

📌 **Interview term: Controlled input** — the input shows exactly what state says (<code>value={value || ""}</code>). When the player types a letter, <code>setCell</code> returns the same array, state does not change, and React puts the old value back in the DOM automatically. Vue and Angular need one extra line for this (their tabs explain it).

In <code>App</code>:

~~~jsx
const conflicts = useMemo(() => findConflicts(cells), [cells]);
const filled = cells.filter((v) => v > 0).length;
const solved = isSolved(cells, conflicts);
~~~

<code>useMemo</code> recomputes conflicts only when <code>cells</code> changes, not when only the focus moves ([useMemo vs useCallback](/interview-question/what-is-the-difference-between-usememo-and-usecallback)). Because <code>setCell</code> returns a new array on every real edit, the dependency check is a cheap reference comparison ([why immutable updates](/interview-question/why-must-react-state-updates-be-immutable)).

### Step 5: roving tabindex and arrow keys

📌 **Interview term: Roving tabindex** — in a composite widget only one item has <code>tabIndex=0</code>; the rest have <code>-1</code>. Tab enters and leaves the grid in one step, and arrow keys move focus inside it. Without it a keyboard user presses Tab up to 81 times to get past the board.

~~~js
function onKeyDown(i, e) {
  const j = moveFrom(i, e.key); // -1 for non-arrow keys, i at the edges
  if (j === -1) return;
  e.preventDefault();
  setActive(j);
  refs.current[j].focus();
}
~~~

The element array lives in a [ref](/interview-question/describe-the-useref-hook-and-its-typical-use-cases) filled by callback refs, because focus is an imperative DOM call, not state. <code>active</code> is state because it changes what renders: which cell is tabbable and which 20 peers get the soft highlight.

<div style="background:#0b1f2a;border-left:4px solid #39c5cf;border-radius:6px;padding:14px 18px;margin:18px 0;">
<span style="color:#9be3ff;font-weight:bold;">🔑 Key insight:</span> <span style="color:#d6eef5;">Store <strong style="color:#9be3ff;">only what the player changed</strong> (the 81 numbers). Conflicts, the filled count, the solved flag and even the peer highlight are all functions of that array plus the focused index. Every "highlight did not clear" bug comes from storing one of them separately.</span>
</div>

## 5. Verified

The solution was rendered in StrictMode in jsdom. The driver typed into real inputs with the native value setter (so React sees a genuine change), pressed arrow keys, then typed the full solution computed by a small backtracking solver. Conflicts are read from <code>aria-invalid</code>:

~~~text
RENDERED: SudokuFilled: 30/81ClearNo conflicts
start: Filled: 30/81 | No conflicts | tabbable cells: 1
type 5 at r1c3: Filled: 31/81 | 2 cells in conflict | conflicts: r1c1 r1c3
type 4 at r1c4 too: Filled: 32/81 | 4 cells in conflict | conflicts: r1c1 r1c3 r1c4 r8c4
clear both: Filled: 30/81 | No conflicts | conflicts: none
type a at r1c3, 0 at r1c6: "" "" | Filled: 30/81 | No conflicts
type 9 into the given r1c1: "5" | readOnly: true
type 1 then 4 at r1c3 (last digit wins): "4"
ArrowRight, ArrowDown x2 from r1c1: Row 3, column 2, given | tabbable: 1 | peers highlighted: 20
ArrowLeft twice (second one hits the edge): Row 3, column 1
fill the solution: Filled: 81/81 | Solved!
Clear: Filled: 30/81 | No conflicts
~~~

Line by line: one tabbable cell at the start; a 5 next to the given 5 flags both; a 4 in row 1 also clashes with the 4 in column 4 down in row 8, so four cells light up; clearing both removes every highlight; a letter and a zero leave the cells empty; typing into a given changes nothing; typing over a digit keeps the last one; arrows move focus with only one tabbable cell and 20 highlighted peers; the left edge stops focus; the full solution reports Solved; Clear restores the 30 givens.

A separate check in Chromium 141 (playwright-core, 360 px wide viewport) loaded the React build, typed a conflicting 5 and showed both cells highlighted with the thick box borders in place, and found no horizontal scroll (360 px of document width). The mobile numeric keyboard from <code>inputMode</code> was not checked; only a real phone shows it.

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Letter, 0, symbols | Stripped by <code>digitFrom</code>; controlled input reverts |
| Type over a digit | Last digit wins |
| Paste "123" | Becomes 3 |
| Edit a given | <code>readOnly</code> plus the <code>setCell</code> guard |
| Duplicate in two units at once | One entry in the <code>Set</code> |
| Keyboard | One tab stop; arrows move; Backspace and Delete clear natively |
| Screen reader | "Row 1, column 3, conflict" labels, <code>aria-invalid</code>, <code>role="status"</code> for conflicts and Solved |
| Colour blindness | Conflicts also change the text colour and label, not only the background |

## 7. Common Pitfalls

- **Storing a <code>conflicts</code> array in state and patching it on each edit.** Clearing a cell must also un-flag its partner in three units; deriving avoids the bookkeeping.
- **Only flagging the cell just typed.** The player needs to see what it clashes with; flag every member of the duplicate, givens included.
- **The box formula as <code>row / 3 + col / 3</code>.** Without <code>floor</code> and the <code>* 3</code> it is wrong; test it on the corners.
- **<code>maxLength={1}</code>.** Once a cell holds a digit, typing another one is blocked unless the player selects the text first.
- **81 tab stops.** Use roving tabindex.
- **Validating against the solution and calling it validation.** It leaks answers and needs a solution you may not have for generated or user-entered puzzles.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Rules-only validation, highlight every cell in a duplicate, givens locked, digits 1 to 9, arrow keys, and a solved message."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Model:</strong> <span style="color:#f0e2c8;">"One array of 81 numbers in state. Conflicts, counts and solved are derived and memoised."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;">"Precompute the 27 units; for each, map value to indices and flag any value with more than one index. The box index is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">floor(row / 3) * 3 + floor(col / 3)</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Input:</strong> <span style="color:#f0e2c8;">"Controlled inputs, keep only the last digit 1 to 9, ignore edits to givens, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-invalid</code> on conflicts."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keyboard:</strong> <span style="color:#f0e2c8;">"Roving tabindex so the grid is one tab stop, arrows move focus through an array of refs, and the focused cell row, column and box are highlighted."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add pencil marks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store per cell a value and a small set of candidates (a 9-bit number works well). A notes mode toggles digits in the set instead of setting the value, and setting a value can clear that digit from the notes of its peers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you generate puzzles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fill a full valid grid with a randomised backtracking solver, then remove clues one at a time, keeping a removal only if a solver still finds exactly one solution. It is CPU heavy, so run it in a Web Worker or on the server.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is 243 visits per keystroke a performance problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Measured on Node 22, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">findConflicts</code> on the starting puzzle averaged about 13 microseconds over 100,000 runs. Memoising on the cells array is still worthwhile so focus changes do not recompute, and if it ever mattered you could recheck only the three units of the edited cell.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add undo?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a history stack of previous <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cells</code> arrays; because every edit creates a new array, undo is just popping the stack. Cap its length to bound memory.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the validator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pure function tests: an empty board, a full valid solution (no conflicts), and one duplicate in each kind of unit, including a cell that is in a row and a box conflict at once.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Unit** | A row, column or 3 by 3 box; 27 in total |
| **Peers** | The 20 cells that share a unit with a given cell |
| **Givens** | Prefilled, read-only clues |
| **Conflict detection** | Finding every cell whose value repeats within one of its units |
| **Derived state** | Computed from state during render, never stored separately |
| **Controlled input** | An input whose displayed value always comes from state |
| **Roving tabindex** | One focusable item in a widget; arrows move focus inside it |
| **Validation vs solving** | Checking the rules versus filling the grid |

---

**Conclusion:** A Sudoku board is one array of 81 numbers and a handful of pure functions. Precompute the 27 units, flag repeated values in each, and derive the highlights, the counts and the solved state from the array on every change. Add strict input sanitising, a guard on givens and roving tabindex, and the board is correct, fast and usable from the keyboard. The same "derive, do not store" idea powers the neighbour counts in [Minesweeper](/interview-question/build-minesweeper).`,
        files: {
          "/App.js": `import { useMemo, useRef, useState } from "react";
import Cell from "./src/components/Cell";
import {
  PUZZLE,
  digitFrom,
  findConflicts,
  isPeer,
  isSolved,
  moveFrom,
  parse,
  setCell,
} from "./src/utils/sudoku";

const START = parse(PUZZLE);
const GIVENS = START.map((v) => v > 0);

export default function App() {
  const [cells, setCells] = useState(START);
  const [active, setActive] = useState(0);
  const refs = useRef([]);

  // Derived on every render from the one piece of state that matters.
  const conflicts = useMemo(() => findConflicts(cells), [cells]);
  const filled = cells.filter((v) => v > 0).length;
  const solved = isSolved(cells, conflicts);

  function onKeyDown(i, e) {
    const j = moveFrom(i, e.key);
    if (j === -1) return;
    e.preventDefault();
    setActive(j);
    refs.current[j].focus();
  }

  return (
    <main className="sudoku">
      <h1>Sudoku</h1>
      <div className="bar">
        <span data-testid="filled">Filled: {filled}/81</span>
        <button type="button" onClick={() => setCells(START)}>
          Clear
        </button>
      </div>
      <div className="board" role="group" aria-label="Sudoku board, 9 by 9">
        {cells.map((v, i) => (
          <Cell
            key={i}
            index={i}
            value={v}
            given={GIVENS[i]}
            conflict={conflicts.has(i)}
            peer={isPeer(active, i)}
            active={active === i}
            inputRef={(el) => (refs.current[i] = el)}
            onValue={(idx, raw) =>
              setCells((c) => setCell(c, GIVENS, idx, digitFrom(raw)))
            }
            onKeyDown={onKeyDown}
            onFocus={setActive}
          />
        ))}
      </div>
      <p className="status" role="status" data-testid="status">
        {solved
          ? "Solved!"
          : conflicts.size
            ? conflicts.size + " cells in conflict"
            : "No conflicts"}
      </p>
    </main>
  );
}
`,
          "/src/components/Cell.js": `import { colOf, rowOf } from "../utils/sudoku";

export default function Cell({
  index,
  value,
  given,
  conflict,
  peer,
  active,
  onValue,
  onKeyDown,
  onFocus,
  inputRef,
}) {
  const r = rowOf(index),
    c = colOf(index);
  const cls = [
    "cell",
    "r" + r,
    "c" + c,
    given && "given",
    conflict && "conflict",
    peer && "peer",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <input
      ref={inputRef}
      className={cls}
      data-testid="cell"
      inputMode="numeric"
      autoComplete="off"
      aria-label={
        "Row " +
        (r + 1) +
        ", column " +
        (c + 1) +
        (given ? ", given" : "") +
        (conflict ? ", conflict" : "")
      }
      aria-invalid={conflict || undefined}
      readOnly={given}
      tabIndex={active ? 0 : -1}
      value={value || ""}
      onChange={(e) => onValue(index, e.target.value)}
      onKeyDown={(e) => onKeyDown(index, e)}
      onFocus={() => onFocus(index)}
    />
  );
}
`,
          "/src/utils/sudoku.js": `// Pure Sudoku logic. The board is an array of 81 numbers, 0 = empty,
// read left to right, top to bottom (index = row * 9 + col).

// A classic puzzle with a unique solution (0 = blank).
export const PUZZLE =
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079";

export const parse = (s) => [...s].map(Number);
export const rowOf = (i) => Math.floor(i / 9);
export const colOf = (i) => i % 9;
export const boxOf = (i) =>
  Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

// The 27 units: 9 rows, 9 columns, 9 boxes. Built once.
const UNITS = [];
for (let k = 0; k < 9; k++) {
  UNITS.push([...Array(9)].map((_, j) => k * 9 + j)); // row k
  UNITS.push([...Array(9)].map((_, j) => j * 9 + k)); // column k
  UNITS.push([...Array(81).keys()].filter((i) => boxOf(i) === k)); // box k
}

// Every cell whose value appears more than once in one of its units.
// 27 units x 9 cells = 243 visits, no matter how full the board is.
export function findConflicts(cells) {
  const bad = new Set();
  for (const unit of UNITS) {
    const seen = new Map(); // value -> indices holding it in this unit
    for (const i of unit) {
      const v = cells[i];
      if (!v) continue;
      if (!seen.has(v)) seen.set(v, []);
      seen.get(v).push(i);
    }
    for (const list of seen.values())
      if (list.length > 1) list.forEach((i) => bad.add(i));
  }
  return bad;
}

// Same row, column or box as i (the cells a value in i competes with).
export const isPeer = (i, j) =>
  i !== j &&
  (rowOf(i) === rowOf(j) || colOf(i) === colOf(j) || boxOf(i) === boxOf(j));

export function setCell(cells, givens, i, value) {
  if (givens[i] || cells[i] === value) return cells;
  const next = cells.slice();
  next[i] = value;
  return next;
}

// Keep only the last digit 1-9 the user typed; anything else empties the cell.
export const digitFrom = (raw) =>
  Number(raw.replace(/[^1-9]/g, "").slice(-1) || 0);

export const isSolved = (cells, conflicts) =>
  cells.every((v) => v > 0) && conflicts.size === 0;

const MOVES = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
// Arrow-key target for roving focus; stays put at the edges.
export function moveFrom(i, key) {
  const d = MOVES[key];
  if (d === undefined) return -1;
  if ((d === -1 && colOf(i) === 0) || (d === 1 && colOf(i) === 8)) return i;
  const j = i + d;
  return j < 0 || j > 80 ? i : j;
}
`,
          "/styles.css": `:root {
  color-scheme: dark;
}
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f1115;
  color: #e8e8ea;
}
.sudoku {
  max-width: 380px;
  margin: 24px auto;
  padding: 0 12px;
}
.sudoku h1 {
  font-size: 1.3rem;
  margin: 0 0 8px;
}
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
button {
  background: #2a2f3a;
  color: #e8e8ea;
  border: 1px solid #3b4252;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
.board {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  border: 2px solid #8b949e;
}
.cell {
  width: 100%;
  aspect-ratio: 1;
  box-sizing: border-box;
  border: 1px solid #30363d;
  background: #161b22;
  color: #79c0ff;
  font-size: 1.15rem;
  text-align: center;
  padding: 0;
  caret-color: transparent;
}
.cell.given {
  color: #e8e8ea;
  font-weight: 700;
}
.cell.peer {
  background: #1f2937;
}
.cell.conflict {
  background: #4a1418;
  color: #ffa198;
}
.cell:focus {
  outline: 2px solid #f9a825;
  outline-offset: -2px;
  background: #2d2a12;
}
.cell.c2,
.cell.c5 {
  border-right: 2px solid #8b949e;
}
.cell.r2,
.cell.r5 {
  border-bottom: 2px solid #8b949e;
}
.status {
  min-height: 1.4em;
  margin-top: 10px;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round in Vue. You know <code>ref</code>, <code>computed</code> and components; Sudoku rules are explained from zero.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> tag with the exact vocabulary. The Verified section is real output from mounting the solution with Vue 3.5.44 in jsdom and typing into it with a script.

## 1. Why This Even Matters — A Story First

A Sudoku is a 9 by 9 grid of nine 3 by 3 boxes. Some digits are printed (the **givens**); you fill the rest so each row, column and box holds 1 to 9 exactly once. On paper a mistake hides for twenty minutes. A good board circles both clashing digits the moment you write the second one and rubs the circles out when you fix it. Building that friend well means one source of truth, a small correct algorithm and careful input handling.

## 2. Requirements and Plan

81 cells, read-only givens, digits 1 to 9 only, live highlighting of every cell in a duplicate, filled and conflict counts, a Solved message, arrow-key navigation with the focused cell row, column and box softly highlighted, and Clear.

📌 **Interview term: Unit** — a row, a column or a box: 27 in total, three per cell. Cells sharing a unit are **peers** (20 per cell).

The rules live in a plain <code>src/utils/sudoku.js</code>: <code>findConflicts</code>, <code>setCell</code>, <code>digitFrom</code>, <code>isPeer</code>, <code>moveFrom</code>.

| Piece | Vue primitive | Why |
| :--- | :--- | :--- |
| <code>cells</code> (81 numbers) | <code>ref</code> | The only thing the player edits |
| <code>active</code> | <code>ref</code> | Roving tabindex and peer highlight |
| <code>conflicts</code>, <code>filled</code>, <code>solved</code> | <code>computed</code> | Derived and cached |
| the board element | <code>useTemplateRef("board")</code> | To move focus with arrow keys |
| each cell | <code>SudokuCell.vue</code> with props and emits | Presentational input |

📌 **Interview term: computed** — a cached derived value that re-evaluates only when what it read changes. <code>conflicts</code> recomputes when <code>cells</code> is replaced, not when focus moves. See [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch).

## 3. Build It Step by Step

### Step 1: conflicts by walking the 27 units

~~~js
export function findConflicts(cells) {
  const bad = new Set();
  for (const unit of UNITS) {
    const seen = new Map(); // value -> indices holding it in this unit
    for (const i of unit) {
      const v = cells[i];
      if (!v) continue;
      if (!seen.has(v)) seen.set(v, []);
      seen.get(v).push(i);
    }
    for (const list of seen.values())
      if (list.length > 1) list.forEach((i) => bad.add(i));
  }
  return bad;
}
~~~

<code>UNITS</code> is built once from <code>rowOf</code>, <code>colOf</code> and <code>boxOf(i) = floor(row / 3) * 3 + floor(col / 3)</code>. 27 units of 9 cells is 243 visits per call, and every member of a duplicate is flagged, givens included.

📌 **Interview term: Validation versus solving** — validation checks the rules on the current board and needs no answer key; solving fills the grid. The app only validates.

### Step 2: the cell, and the line Vue needs that React does not

~~~vue
<script setup>
const props = defineProps({
  index: Number,
  value: Number,
  given: Boolean,
  conflict: Boolean,
  peer: Boolean,
  active: Boolean,
});
const emit = defineEmits(["value", "move", "focused"]);

function onInput(e) {
  emit("value", props.index, e.target.value);
  e.target.value = props.value || "";
}
</script>

<template>
  <input
    :class="['cell', 'r' + r, 'c' + c, { given, conflict, peer }]"
    inputmode="numeric"
    autocomplete="off"
    :aria-label="
      'Row ' +
      (r + 1) +
      ', column ' +
      (c + 1) +
      (given ? ', given' : '') +
      (conflict ? ', conflict' : '')
    "
    :aria-invalid="conflict || undefined"
    :readonly="given"
    :tabindex="active ? 0 : -1"
    :value="value || ''"
    @input="onInput"
    @keydown="emit('move', index, $event)"
    @focus="emit('focused', index)"
  />
</template>
~~~

(Excerpt: the real file declares each prop with its type and <code>required</code>, and computes <code>r</code> and <code>c</code>.)

📌 **Interview term: One-way <code>:value</code> binding** — Vue writes the bound value into the DOM only when that value **changes**. If the player types "a" into an empty cell, the parent rejects it, <code>cells</code> stays the same, nothing re-renders, and the "a" would stay visible. So after emitting, the cell writes the current accepted value back into the element. When the edit is accepted, the re-render that follows patches in the new digit.

<code>v-model</code> would not help here: the value must be sanitised (last digit 1 to 9) and givens refused, which is the parent's job through <code>setCell(cells, GIVENS, i, digitFrom(raw))</code>. Props down, events up ([defineProps and defineEmits](/interview-question/how-do-defineprops-and-defineemits-work-in-script-setup)).

### Step 3: roving tabindex with a template ref

~~~js
const board = useTemplateRef("board");

async function onMove(i, e) {
  const j = moveFrom(i, e.key);
  if (j === -1) return;
  e.preventDefault();
  active.value = j;
  await nextTick();
  board.value.querySelectorAll("input")[j].focus();
}
~~~

📌 **Interview term: Roving tabindex** — only the active cell has <code>tabindex="0"</code>, so the grid is one Tab stop and arrows move inside it. <code>useTemplateRef</code> (Vue 3.5) gives the board element; see [useTemplateRef](/interview-question/what-is-usetemplateref-vue-3-5-and-how-does-it-improve-on-ref). <code>nextTick</code> waits for the tabindex update before focusing.

## 4. Verified

Compiled with <code>@vue/compiler-sfc</code> and mounted with <code>createApp(App).mount("#app")</code> in jsdom. The driver typed with the native value setter and real <code>input</code> events, pressed arrow keys, then typed the full solution found by a small backtracking solver. Conflicts are read from <code>aria-invalid</code>:

~~~text
RENDERED: SudokuFilled: 30/81ClearNo conflicts
start: Filled: 30/81 | No conflicts | tabbable cells: 1
type 5 at r1c3: Filled: 31/81 | 2 cells in conflict | conflicts: r1c1 r1c3
type 4 at r1c4 too: Filled: 32/81 | 4 cells in conflict | conflicts: r1c1 r1c3 r1c4 r8c4
clear both: Filled: 30/81 | No conflicts | conflicts: none
type a at r1c3, 0 at r1c6: "" "" | Filled: 30/81 | No conflicts
type 9 into the given r1c1: "5" | readOnly: true
type 1 then 4 at r1c3 (last digit wins): "4"
ArrowRight, ArrowDown x2 from r1c1: Row 3, column 2, given | tabbable: 1 | peers highlighted: 20
ArrowLeft twice (second one hits the edge): Row 3, column 1
fill the solution: Filled: 81/81 | Solved!
Clear: Filled: 30/81 | No conflicts
~~~

Both cells of each duplicate are flagged (row 1 and the 4 in column 4, row 8); clearing removes the highlights; a letter and a zero leave the cell empty, proving the write-back in <code>onInput</code>; the given stays 5; the last digit wins; there is one tab stop with 20 peers highlighted; Solved and Clear work. Identical to the React and Angular output. Styling was not checked (no layout in jsdom).

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Letter, 0, paste | <code>digitFrom</code> keeps the last 1 to 9; write-back fixes the DOM |
| Given cell | <code>readonly</code> plus the <code>setCell</code> guard |
| Keyboard | One tab stop, arrows, Backspace and Delete clear |
| Screen reader | Labels with "given" and "conflict", <code>aria-invalid</code>, <code>role="status"</code> summary |

## 6. Common Pitfalls

- **Expecting <code>:value</code> to revert a rejected edit.** It does not; nothing changed, so nothing renders. Write the accepted value back.
- **<code>v-model</code> straight onto <code>cells[i]</code>.** Skips sanitising and the given guard, and mutates the array in place.
- **A <code>watch</code> that maintains a conflicts array.** Use <code>computed</code>; there is nothing to keep in sync.
- **Focusing before the DOM updates.** Await <code>nextTick</code> (or focus first and let the tabindex follow).
- **<code>:key="v"</code> on the cells.** Keys must be the stable index; values repeat.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Rules-only validation, every member of a duplicate highlighted, givens locked, digits 1 to 9, arrow keys."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Model:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> of 81 numbers; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">conflicts</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filled</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">solved</code> are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;">"Walk 27 precomputed units, map value to indices, flag any value seen twice. Box index is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">floor(row / 3) * 3 + floor(col / 3)</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Input:</strong> <span style="color:#f0e2c8;">"The cell emits raw text; the parent keeps the last digit and ignores givens; the cell writes the accepted value back."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keyboard:</strong> <span style="color:#f0e2c8;">"Roving tabindex via an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">active</code> ref, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTemplateRef</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code> to move focus."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-model</code> on each cell?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the value needs sanitising and the givens a guard, both owned by the parent. A custom <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel</code> is possible, but the parent would still need to transform the value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add pencil marks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep, per cell, a value and a candidate set; a notes toggle switches what a digit key does. Placing a value can remove that digit from the notes of its 20 peers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shallowRef</code> help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The array is replaced on every edit, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> works and skips deep proxying of 81 numbers; with numbers only, the gain is small.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">findConflicts</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">digitFrom</code>; with Vue Test Utils, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code> on cells and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-invalid</code> and the status text.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Unit** | Row, column or box; 27 in all |
| **Peers** | The 20 cells sharing a unit with a cell |
| **computed** | Cached derived value |
| **One-way :value binding** | Vue writes the value to the DOM only when it changes |
| **Roving tabindex** | One tab stop, arrows move inside |
| **useTemplateRef** | Vue 3.5 helper that returns a ref to a template element |

---

**Conclusion:** In Vue the Sudoku board is a <code>ref</code> of 81 numbers with conflicts, counts and the solved flag as <code>computed</code> values, a presentational cell that emits raw text and writes back the accepted value, and roving tabindex driven by an <code>active</code> ref and a template ref. The validator is a plain function over 27 units, so the same driver proves the same behaviour in every framework.`,
        files: {
          "/src/App.vue": `<script setup>
import { computed, nextTick, ref, useTemplateRef } from "vue";
import SudokuCell from "./components/SudokuCell.vue";
import {
  PUZZLE,
  digitFrom,
  findConflicts,
  isPeer,
  isSolved,
  moveFrom,
  parse,
  setCell,
} from "./utils/sudoku.js";

const START = parse(PUZZLE);
const GIVENS = START.map((v) => v > 0);

const cells = ref(START);
const active = ref(0);
const board = useTemplateRef("board");

// computed() caches: findConflicts re-runs only when cells changes.
const conflicts = computed(() => findConflicts(cells.value));
const filled = computed(() => cells.value.filter((v) => v > 0).length);
const solved = computed(() => isSolved(cells.value, conflicts.value));

function onValue(i, raw) {
  cells.value = setCell(cells.value, GIVENS, i, digitFrom(raw));
}

async function onMove(i, e) {
  const j = moveFrom(i, e.key);
  if (j === -1) return;
  e.preventDefault();
  active.value = j;
  await nextTick(); // let tabindex update before moving focus
  board.value.querySelectorAll("input")[j].focus();
}
</script>

<template>
  <main class="sudoku">
    <h1>Sudoku</h1>
    <div class="bar">
      <span data-testid="filled">Filled: {{ filled }}/81</span>
      <button type="button" @click="cells = START">Clear</button>
    </div>
    <div
      ref="board"
      class="board"
      role="group"
      aria-label="Sudoku board, 9 by 9"
    >
      <SudokuCell
        v-for="(v, i) in cells"
        :key="i"
        :index="i"
        :value="v"
        :given="GIVENS[i]"
        :conflict="conflicts.has(i)"
        :peer="isPeer(active, i)"
        :active="active === i"
        @value="onValue"
        @move="onMove"
        @focused="active = $event"
      />
    </div>
    <p class="status" role="status" data-testid="status">
      {{
        solved
          ? "Solved!"
          : conflicts.size
            ? conflicts.size + " cells in conflict"
            : "No conflicts"
      }}
    </p>
  </main>
</template>

<style>
:root {
  color-scheme: dark;
}
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f1115;
  color: #e8e8ea;
}
.sudoku {
  max-width: 380px;
  margin: 24px auto;
  padding: 0 12px;
}
.sudoku h1 {
  font-size: 1.3rem;
  margin: 0 0 8px;
}
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
button {
  background: #2a2f3a;
  color: #e8e8ea;
  border: 1px solid #3b4252;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
.board {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  border: 2px solid #8b949e;
}
.cell {
  width: 100%;
  aspect-ratio: 1;
  box-sizing: border-box;
  border: 1px solid #30363d;
  background: #161b22;
  color: #79c0ff;
  font-size: 1.15rem;
  text-align: center;
  padding: 0;
  caret-color: transparent;
}
.cell.given {
  color: #e8e8ea;
  font-weight: 700;
}
.cell.peer {
  background: #1f2937;
}
.cell.conflict {
  background: #4a1418;
  color: #ffa198;
}
.cell:focus {
  outline: 2px solid #f9a825;
  outline-offset: -2px;
  background: #2d2a12;
}
.cell.c2,
.cell.c5 {
  border-right: 2px solid #8b949e;
}
.cell.r2,
.cell.r5 {
  border-bottom: 2px solid #8b949e;
}
.status {
  min-height: 1.4em;
  margin-top: 10px;
}
</style>
`,
          "/src/components/SudokuCell.vue": `<script setup>
import { computed } from "vue";
import { colOf, rowOf } from "../utils/sudoku.js";

const props = defineProps({
  index: { type: Number, required: true },
  value: { type: Number, required: true },
  given: Boolean,
  conflict: Boolean,
  peer: Boolean,
  active: Boolean,
});
const emit = defineEmits(["value", "move", "focused"]);

const r = computed(() => rowOf(props.index));
const c = computed(() => colOf(props.index));

function onInput(e) {
  emit("value", props.index, e.target.value);
  // The parent may reject the text (a letter, or a given cell). The state
  // then does not change, so nothing re-renders: put the DOM back ourselves.
  e.target.value = props.value || "";
}
</script>

<template>
  <input
    :class="['cell', 'r' + r, 'c' + c, { given, conflict, peer }]"
    data-testid="cell"
    inputmode="numeric"
    autocomplete="off"
    :aria-label="
      'Row ' +
      (r + 1) +
      ', column ' +
      (c + 1) +
      (given ? ', given' : '') +
      (conflict ? ', conflict' : '')
    "
    :aria-invalid="conflict || undefined"
    :readonly="given"
    :tabindex="active ? 0 : -1"
    :value="value || ''"
    @input="onInput"
    @keydown="emit('move', index, $event)"
    @focus="emit('focused', index)"
  />
</template>
`,
          "/src/utils/sudoku.js": `// Pure Sudoku logic. The board is an array of 81 numbers, 0 = empty,
// read left to right, top to bottom (index = row * 9 + col).

// A classic puzzle with a unique solution (0 = blank).
export const PUZZLE =
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079";

export const parse = (s) => [...s].map(Number);
export const rowOf = (i) => Math.floor(i / 9);
export const colOf = (i) => i % 9;
export const boxOf = (i) =>
  Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

// The 27 units: 9 rows, 9 columns, 9 boxes. Built once.
const UNITS = [];
for (let k = 0; k < 9; k++) {
  UNITS.push([...Array(9)].map((_, j) => k * 9 + j)); // row k
  UNITS.push([...Array(9)].map((_, j) => j * 9 + k)); // column k
  UNITS.push([...Array(81).keys()].filter((i) => boxOf(i) === k)); // box k
}

// Every cell whose value appears more than once in one of its units.
// 27 units x 9 cells = 243 visits, no matter how full the board is.
export function findConflicts(cells) {
  const bad = new Set();
  for (const unit of UNITS) {
    const seen = new Map(); // value -> indices holding it in this unit
    for (const i of unit) {
      const v = cells[i];
      if (!v) continue;
      if (!seen.has(v)) seen.set(v, []);
      seen.get(v).push(i);
    }
    for (const list of seen.values())
      if (list.length > 1) list.forEach((i) => bad.add(i));
  }
  return bad;
}

// Same row, column or box as i (the cells a value in i competes with).
export const isPeer = (i, j) =>
  i !== j &&
  (rowOf(i) === rowOf(j) || colOf(i) === colOf(j) || boxOf(i) === boxOf(j));

export function setCell(cells, givens, i, value) {
  if (givens[i] || cells[i] === value) return cells;
  const next = cells.slice();
  next[i] = value;
  return next;
}

// Keep only the last digit 1-9 the user typed; anything else empties the cell.
export const digitFrom = (raw) =>
  Number(raw.replace(/[^1-9]/g, "").slice(-1) || 0);

export const isSolved = (cells, conflicts) =>
  cells.every((v) => v > 0) && conflicts.size === 0;

const MOVES = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
// Arrow-key target for roving focus; stays put at the edges.
export function moveFrom(i, key) {
  const d = MOVES[key];
  if (d === undefined) return -1;
  if ((d === -1 && colOf(i) === 0) || (d === 1 && colOf(i) === 8)) return i;
  const j = i + d;
  return j < 0 || j > 80 ? i : j;
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round in Angular. You know components and templates; signals and Sudoku rules are explained as we go.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> tag with the exact vocabulary. The Verified section is real output from booting the solution on Angular 22.2.3 twice (AOT with strict templates, and the runtime JIT the playground uses) and typing into it with a script.

## 1. Why This Even Matters — A Story First

A Sudoku is a 9 by 9 grid of nine 3 by 3 boxes, some digits printed in advance, the rest yours to fill so every row, column and box holds 1 to 9 exactly once. The digital version earns its keep by circling both clashing digits the instant the second is typed, and un-circling them the instant it is fixed. That needs one source of truth, a small correct algorithm and disciplined input handling.

## 2. Requirements and Plan

81 cells, read-only givens, digits 1 to 9 only, every member of a duplicate highlighted, filled and conflict counts, Solved, arrow-key navigation with peer highlight, and Clear.

📌 **Interview term: Unit** — a row, column or box; 27 in all, three per cell. Cells sharing a unit are **peers** (20 per cell).

| Piece | Angular primitive | Why |
| :--- | :--- | :--- |
| <code>cells</code> | <code>signal(START)</code> | The only thing the player edits |
| <code>active</code> | <code>signal(0)</code> | Roving tabindex and peer highlight |
| <code>conflicts</code>, <code>filled</code>, <code>solved</code> | <code>computed()</code> | Derived and memoised |
| cell components | <code>@ViewChildren(SudokuCellComponent)</code> | To move focus with arrows |
| each cell | <code>SudokuCellComponent</code>, <code>@Input</code> / <code>@Output</code> | Presentational input |

📌 **Interview term: computed()** — a read-only signal derived from others, recomputed only when a dependency changes. <code>conflicts()</code> re-runs <code>findConflicts</code> once per edit, however many bindings read it. See [computed signals vs method calls](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls).

## 3. Build It Step by Step

### Step 1: typed, pure rules

~~~ts
export const boxOf = (i: number) =>
  Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

export function findConflicts(cells: number[]): Set<number> {
  const bad = new Set<number>();
  for (const unit of UNITS) {
    const seen = new Map<number, number[]>();
    for (const i of unit) {
      const v = cells[i];
      if (!v) continue;
      if (!seen.has(v)) seen.set(v, []);
      seen.get(v)!.push(i);
    }
    for (const list of seen.values())
      if (list.length > 1) list.forEach((i) => bad.add(i));
  }
  return bad;
}
~~~

📌 **Interview term: Conflict detection** — flag every cell whose value repeats inside one of its units: 27 precomputed units, 243 visits per call, and both members of a duplicate are flagged. Validation needs no answer key; solving is a different problem.

<code>digitFrom(raw)</code> keeps the last digit 1 to 9 the player typed and <code>setCell(cells, givens, i, value)</code> refuses givens and returns the same array when nothing changed.

### Step 2: the cell, and why it writes the value back

~~~ts
@Component({
  selector: "app-sudoku-cell",
  standalone: true,
  template: \`
    <input
      [class]="'cell r' + r + ' c' + c"
      [class.given]="given"
      [class.conflict]="conflict"
      [class.peer]="peer"
      data-testid="cell"
      inputmode="numeric"
      autocomplete="off"
      [attr.aria-label]="
        'Row ' +
        (r + 1) +
        ', column ' +
        (c + 1) +
        (given ? ', given' : '') +
        (conflict ? ', conflict' : '')
      "
      [attr.aria-invalid]="conflict || null"
      [readOnly]="given"
      [tabIndex]="active ? 0 : -1"
      [value]="value || ''"
      (input)="onInput($event)"
      (keydown)="move.emit({ index, event: $event })"
      (focus)="focused.emit(index)"
    />
  \`,
})
export class SudokuCellComponent {
  @Input({ required: true }) index = 0;
  @Input({ required: true }) value = 0;
  @Output() valueChange = new EventEmitter<{
    index: number;
    raw: string;
  }>();

  onInput(e: Event) {
    const el = e.target as HTMLInputElement;
    this.valueChange.emit({ index: this.index, raw: el.value });
    el.value = this.value ? String(this.value) : "";
  }
}
~~~

(Excerpt: the real component also has the <code>given</code>, <code>conflict</code>, <code>peer</code> and <code>active</code> inputs, the <code>move</code> and <code>focused</code> outputs, and styles.)

📌 **Interview term: Property binding** — <code>[value]</code> writes to the DOM only when the bound expression changes since the last check. A rejected keystroke (a letter, or an edit to a given) leaves <code>cells()</code> unchanged, so Angular never touches the input and the stray text would stay. Writing the accepted value back right after emitting fixes it; when the edit is accepted, the next render patches in the new digit.

The playground compiles at runtime (JIT), where signal <code>input()</code> and <code>output()</code> do not register, so the cell uses <code>@Input</code> and <code>@Output</code>. The parent renders <code>@for (v of cells(); track i; let i = $index)</code>: tracking by index is right because cells never move.

### Step 3: roving tabindex with ViewChildren

~~~ts
@ViewChildren(SudokuCellComponent)
cellViews!: QueryList<SudokuCellComponent>;

onMove(i: number, e: KeyboardEvent) {
  const j = moveFrom(i, e.key);
  if (j === -1) return;
  e.preventDefault();
  this.active.set(j);
  this.cellViews.get(j)!.focus();
}
~~~

📌 **Interview term: Roving tabindex** — only the active cell is tabbable, so the grid is one Tab stop and arrows move focus within it. <code>@ViewChildren</code> gives the 81 cell components in order, and each exposes a <code>focus()</code> method that focuses its own input through an injected <code>ElementRef</code> ([ViewChild vs ViewChildren](/interview-question/what-is-the-difference-between-viewchildren-and-viewchild)).

## 4. Verified

Booted with <code>bootstrapApplication(AppComponent)</code> and no providers, AOT with <code>strictTemplates</code> and through the runtime JIT; both modes printed the same lines (this is the JIT run). The driver typed with the native value setter and real <code>input</code> events, pressed arrow keys, then typed the full solution from a small backtracking solver:

~~~text
RENDERED: SudokuFilled: 30/81Clear No conflicts
start: Filled: 30/81 | No conflicts | tabbable cells: 1
type 5 at r1c3: Filled: 31/81 | 2 cells in conflict | conflicts: r1c1 r1c3
type 4 at r1c4 too: Filled: 32/81 | 4 cells in conflict | conflicts: r1c1 r1c3 r1c4 r8c4
clear both: Filled: 30/81 | No conflicts | conflicts: none
type a at r1c3, 0 at r1c6: "" "" | Filled: 30/81 | No conflicts
type 9 into the given r1c1: "5" | readOnly: true
type 1 then 4 at r1c3 (last digit wins): "4"
ArrowRight, ArrowDown x2 from r1c1: Row 3, column 2, given | tabbable: 1 | peers highlighted: 20
ArrowLeft twice (second one hits the edge): Row 3, column 1
fill the solution: Filled: 81/81 | Solved!
Clear: Filled: 30/81 | No conflicts
~~~

Every member of each duplicate is flagged and un-flagged correctly, rejected text is removed from the DOM (the write-back), givens stay fixed, the grid is one tab stop with 20 highlighted peers, and Solved and Clear work. The only difference from React and Vue is a space in the first RENDERED line, which is template whitespace between elements, not behaviour. Styling was not checked (no layout in jsdom).

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Letter, 0, paste | <code>digitFrom</code> plus the write-back |
| Given cell | <code>[readOnly]</code> plus the <code>setCell</code> guard |
| Keyboard | One tab stop, arrows, Backspace and Delete |
| Screen reader | Labels with "given" and "conflict", <code>aria-invalid</code>, <code>role="status"</code> summary |

## 6. Common Pitfalls

- **Expecting <code>[value]</code> to undo a rejected keystroke.** The binding did not change, so the DOM keeps the text.
- **<code>[(ngModel)]</code> on each cell bound to <code>cells()[i]</code>.** Signals are not two-way bindable that way, and it skips sanitising.
- **A method call like <code>conflictsFor(i)</code> in the template.** It recomputes on every check; use one <code>computed()</code> Set.
- **Signal <code>input()</code> in the playground.** It does not register under the runtime JIT; use <code>@Input</code>.
- **<code>[attr.aria-invalid]="conflict"</code> with false.** Renders <code>aria-invalid="false"</code> on every cell; bind <code>conflict || null</code> to remove it.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Rules-only validation, flag every member of a duplicate, givens locked, digits 1 to 9, arrow keys."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Model:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">signal</code> of 81 numbers; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">conflicts</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filled</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">solved</code> are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;">"27 precomputed units, map value to indices, flag repeats; box is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">floor(row / 3) * 3 + floor(col / 3)</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Input:</strong> <span style="color:#f0e2c8;">"The cell emits raw text through an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Output</code>, the parent sanitises and guards givens, the cell writes back the accepted value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keyboard:</strong> <span style="color:#f0e2c8;">"Roving tabindex from an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">active</code> signal, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChildren</code> to focus the next cell."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not Reactive Forms with 81 controls?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You could build a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormArray</code> with a custom validator, but the validation is across the whole board, not per control, so a plain signal and one computed are simpler and faster.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add pencil marks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store a value and a candidate set per cell; a notes mode toggles candidates; placing a digit removes it from the notes of the 20 peers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">findConflicts</code>. With TestBed, set the input value, dispatch an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input</code> event, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code> and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-invalid</code> and the status text.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">OnPush</code> matter here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The signals already limit work. Making the cell <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OnPush</code> documents that it depends only on its inputs and lets Angular skip unchanged cells.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Unit** | Row, column or box; 27 in all |
| **Peers** | The 20 cells sharing a unit with a cell |
| **computed()** | Memoised derived signal |
| **Property binding** | <code>[value]</code> updates the DOM only when the expression changes |
| **Roving tabindex** | One tab stop, arrows move inside |
| **@ViewChildren** | Query for all matching child components, in order |

---

**Conclusion:** In Angular the board is one signal of 81 numbers with conflicts, counts and the solved flag as computed signals, a decorator-input cell that emits raw text and writes back the accepted value, and roving tabindex through an <code>active</code> signal and <code>@ViewChildren</code>. The validator is plain TypeScript over 27 units, and the same driver proves identical behaviour in AOT, JIT, React and Vue.`,
        files: {
          "/src/app/app.component.ts": `import {
  Component,
  QueryList,
  ViewChildren,
  computed,
  signal,
} from "@angular/core";
import { SudokuCellComponent } from "./components/sudoku-cell.component";
import {
  PUZZLE,
  digitFrom,
  findConflicts,
  isPeer,
  isSolved,
  moveFrom,
  parse,
  setCell,
} from "./utils/sudoku";

const START = parse(PUZZLE);
const GIVENS = START.map((v) => v > 0);

@Component({
  selector: "app-root",
  standalone: true,
  imports: [SudokuCellComponent],
  template: \`
    <main class="sudoku">
      <h1>Sudoku</h1>
      <div class="bar">
        <span data-testid="filled">Filled: {{ filled() }}/81</span>
        <button type="button" (click)="cells.set(start)">Clear</button>
      </div>
      <div class="board" role="group" aria-label="Sudoku board, 9 by 9">
        @for (v of cells(); track i; let i = $index) {
          <app-sudoku-cell
            [index]="i"
            [value]="v"
            [given]="givens[i]"
            [conflict]="conflicts().has(i)"
            [peer]="isPeer(active(), i)"
            [active]="active() === i"
            (valueChange)="onValue($event.index, $event.raw)"
            (move)="onMove($event.index, $event.event)"
            (focused)="active.set($event)"
          />
        }
      </div>
      <p class="status" role="status" data-testid="status">
        {{
          solved()
            ? "Solved!"
            : conflicts().size
              ? conflicts().size + " cells in conflict"
              : "No conflicts"
        }}
      </p>
    </main>
  \`,
  styles: [
    \`
      :host {
        display: block;
        font-family: system-ui, sans-serif;
        color: #e8e8ea;
      }
      .sudoku {
        max-width: 380px;
        margin: 24px auto;
        padding: 0 12px;
      }
      .sudoku h1 {
        font-size: 1.3rem;
        margin: 0 0 8px;
      }
      .bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
      }
      button {
        background: #2a2f3a;
        color: #e8e8ea;
        border: 1px solid #3b4252;
        border-radius: 6px;
        padding: 6px 12px;
        cursor: pointer;
      }
      .board {
        display: grid;
        grid-template-columns: repeat(9, 1fr);
        border: 2px solid #8b949e;
      }
      .status {
        min-height: 1.4em;
        margin-top: 10px;
      }
    \`,
  ],
})
export class AppComponent {
  readonly start = START;
  readonly givens = GIVENS;
  readonly isPeer = isPeer;
  readonly cells = signal(START);
  readonly active = signal(0);
  // computed() is memoised: findConflicts runs once per change to cells().
  readonly conflicts = computed(() => findConflicts(this.cells()));
  readonly filled = computed(() => this.cells().filter((v) => v > 0).length);
  readonly solved = computed(() => isSolved(this.cells(), this.conflicts()));
  @ViewChildren(SudokuCellComponent) cellViews!: QueryList<SudokuCellComponent>;

  onValue(i: number, raw: string) {
    this.cells.update((c) => setCell(c, GIVENS, i, digitFrom(raw)));
  }

  onMove(i: number, e: KeyboardEvent) {
    const j = moveFrom(i, e.key);
    if (j === -1) return;
    e.preventDefault();
    this.active.set(j);
    this.cellViews.get(j)!.focus();
  }
}
`,
          "/src/app/components/sudoku-cell.component.ts": `import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  inject,
} from "@angular/core";
import { colOf, rowOf } from "../utils/sudoku";

@Component({
  selector: "app-sudoku-cell",
  standalone: true,
  template: \`
    <input
      [class]="'cell r' + r + ' c' + c"
      [class.given]="given"
      [class.conflict]="conflict"
      [class.peer]="peer"
      data-testid="cell"
      inputmode="numeric"
      autocomplete="off"
      [attr.aria-label]="
        'Row ' +
        (r + 1) +
        ', column ' +
        (c + 1) +
        (given ? ', given' : '') +
        (conflict ? ', conflict' : '')
      "
      [attr.aria-invalid]="conflict || null"
      [readOnly]="given"
      [tabIndex]="active ? 0 : -1"
      [value]="value || ''"
      (input)="onInput($event)"
      (keydown)="move.emit({ index, event: $event })"
      (focus)="focused.emit(index)"
    />
  \`,
  styles: [
    \`
      :host {
        display: block;
      }
      .cell {
        display: block;
        width: 100%;
        aspect-ratio: 1;
        box-sizing: border-box;
        border: 1px solid #30363d;
        background: #161b22;
        color: #79c0ff;
        font-size: 1.15rem;
        text-align: center;
        padding: 0;
        caret-color: transparent;
      }
      .cell.given {
        color: #e8e8ea;
        font-weight: 700;
      }
      .cell.peer {
        background: #1f2937;
      }
      .cell.conflict {
        background: #4a1418;
        color: #ffa198;
      }
      .cell:focus {
        outline: 2px solid #f9a825;
        outline-offset: -2px;
        background: #2d2a12;
      }
      .cell.c2,
      .cell.c5 {
        border-right: 2px solid #8b949e;
      }
      .cell.r2,
      .cell.r5 {
        border-bottom: 2px solid #8b949e;
      }
    \`,
  ],
})
export class SudokuCellComponent {
  @Input({ required: true }) index = 0;
  @Input({ required: true }) value = 0;
  @Input() given = false;
  @Input() conflict = false;
  @Input() peer = false;
  @Input() active = false;
  @Output() valueChange = new EventEmitter<{ index: number; raw: string }>();
  @Output() move = new EventEmitter<{ index: number; event: KeyboardEvent }>();
  @Output() focused = new EventEmitter<number>();
  private host = inject(ElementRef<HTMLElement>);

  get r() {
    return rowOf(this.index);
  }
  get c() {
    return colOf(this.index);
  }

  onInput(e: Event) {
    const el = e.target as HTMLInputElement;
    this.valueChange.emit({ index: this.index, raw: el.value });
    // If the parent rejected the text the [value] binding does not change,
    // so Angular will not touch the DOM: put the accepted value back now.
    el.value = this.value ? String(this.value) : "";
  }

  focus() {
    (this.host.nativeElement as HTMLElement).querySelector("input")!.focus();
  }
}
`,
          "/src/app/utils/sudoku.ts": `// Pure Sudoku logic. The board is an array of 81 numbers, 0 = empty,
// read left to right, top to bottom (index = row * 9 + col).

// A classic puzzle with a unique solution (0 = blank).
export const PUZZLE =
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079";

export const parse = (s: string): number[] => [...s].map(Number);
export const rowOf = (i: number) => Math.floor(i / 9);
export const colOf = (i: number) => i % 9;
export const boxOf = (i: number) =>
  Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

// The 27 units: 9 rows, 9 columns, 9 boxes. Built once.
const UNITS: number[][] = [];
for (let k = 0; k < 9; k++) {
  UNITS.push([...Array(9)].map((_, j) => k * 9 + j)); // row k
  UNITS.push([...Array(9)].map((_, j) => j * 9 + k)); // column k
  UNITS.push([...Array(81).keys()].filter((i) => boxOf(i) === k)); // box k
}

// Every cell whose value appears more than once in one of its units.
// 27 units x 9 cells = 243 visits, no matter how full the board is.
export function findConflicts(cells: number[]): Set<number> {
  const bad = new Set<number>();
  for (const unit of UNITS) {
    // value -> indices holding it in this unit
    const seen = new Map<number, number[]>();
    for (const i of unit) {
      const v = cells[i];
      if (!v) continue;
      if (!seen.has(v)) seen.set(v, []);
      seen.get(v)!.push(i);
    }
    for (const list of seen.values())
      if (list.length > 1) list.forEach((i) => bad.add(i));
  }
  return bad;
}

// Same row, column or box as i (the cells a value in i competes with).
export const isPeer = (i: number, j: number) =>
  i !== j &&
  (rowOf(i) === rowOf(j) || colOf(i) === colOf(j) || boxOf(i) === boxOf(j));

export function setCell(
  cells: number[],
  givens: boolean[],
  i: number,
  value: number,
): number[] {
  if (givens[i] || cells[i] === value) return cells;
  const next = cells.slice();
  next[i] = value;
  return next;
}

// Keep only the last digit 1-9 the user typed; anything else empties the cell.
export const digitFrom = (raw: string) =>
  Number(raw.replace(/[^1-9]/g, "").slice(-1) || 0);

export const isSolved = (cells: number[], conflicts: Set<number>) =>
  cells.every((v) => v > 0) && conflicts.size === 0;

const MOVES: Record<string, number | undefined> = {
  ArrowUp: -9,
  ArrowDown: 9,
  ArrowLeft: -1,
  ArrowRight: 1,
};
// Arrow-key target for roving focus; stays put at the edges.
export function moveFrom(i: number, key: string): number {
  const d = MOVES[key];
  if (d === undefined) return -1;
  if ((d === -1 && colOf(i) === 0) || (d === 1 && colOf(i) === 8)) return i;
  const j = i + d;
  return j < 0 || j > 80 ? i : j;
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build Minesweeper",
    seoDescription: "Build Minesweeper in React, Vue and Angular: first-click-safe seeded mines, an iterative flood fill that cannot overflow the stack, flags, win check.",
    description: `**Question presented to candidate:**
"Build Minesweeper. A 9 by 9 board hides 10 mines. Clicking a cell reveals it: a mine ends the game, a number shows how many of its eight neighbours are mines, and an empty cell opens up all the connected empty area around it. Right-click places a flag. The first click must never be a mine."

**Requirements:**
- 9 by 9 board, 10 mines, a mines-left counter (mines minus flags) and a New game button.
- First click is always safe and opens an area: mines are placed after it, avoiding that cell and its neighbours.
- Revealing an empty (zero) cell opens the connected empty region and its numbered border.
- Right-click, the F key, or a Flag mode toggle (for touch) flags and unflags; flagged cells cannot be revealed.
- Hitting a mine shows all mines and stops the game; opening every safe cell wins.
- Arrow keys move between cells; cells are labelled for screen readers.

**What a strong answer should cover:**
- A cell model (\`mine\`, \`adj\`, \`open\`, \`flag\`) and rules as pure functions (\`reveal\`, \`toggleFlag\`) with a seeded RNG for mine placement.
- Deferred, first-click-safe placement with a (partial) Fisher-Yates over the allowed cells, then neighbour counts.
- An **iterative** flood fill with an explicit stack or queue, marking cells when they are pushed, and why recursion overflows the call stack on large boards.
- Win detection by counting opened safe cells, not by rescanning the board each time.
- Immutable updates that copy only the cells that changed, plus keyboard and touch alternatives to right-click.

**Clarifying questions expected:**
- "Should the first click be safe on its own, or should it always open an area (its neighbours safe too)?"
- "Do you want chording (clicking a number whose flags are all placed opens its other neighbours) and a timer?"
- "Do we need custom board sizes?"

**Code / implementation expected:** Yes. A playable board in the framework of your choice, with reveal and flood fill in plain functions.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round. You know React components and <code>useState</code>; the game and the flood-fill algorithm are explained from zero.
**Difficulty:** Hard

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The Verified section is real output from booting the solution on React 19.3.1 in StrictMode and clicking through a seeded game with a script.

## 1. Why This Even Matters — A Story First

Imagine a field of tiles with ten hidden traps. Lift a tile: if there is a trap, game over. If not, the tile tells you how many of its eight neighbours hide a trap. A tile that says zero is good news: none of its neighbours are dangerous, so you may as well lift them all, and any of those that also say zero let you lift their neighbours too. One lucky click can open half the field.

That chain reaction is the **flood fill**, and it is the heart of this question. The other two traps are about fairness and robustness: the first click must never lose (nobody enjoys dying on move one), and the chain reaction must not crash the page on a big board. Interviewers like Minesweeper because the algorithm, the data model and the UI details (right-click, flags, keyboard) all matter.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the first click safe on its own, or does it always open an area? | Decides whether you protect just that cell or its eight neighbours too. This build protects both. |
| Board sizes and mine counts? | Beginner is 9 by 9 with 10 mines; a configurable board means the RNG and flood fill must scale. |
| Chording? | Clicking an open number whose flags are complete opens its other neighbours; an extension worth naming. |
| Timer and best times? | Extra state and an interval, best left until the core works. |
| Touch devices? | There is no right-click; you need a flag mode or long-press. |
| Should a lost game reveal wrong flags? | A nice touch in classic versions; mention it, build it later. |

## 3. Requirements and Plan

📌 **Interview term: Adjacent count** — for each safe cell, the number of mines among its up to eight neighbours. It is computed once, right after the mines are placed, and stored as <code>adj</code>.

Each cell is a small object: <code>{ mine, adj, open, flag }</code>. The game object holds the cells plus <code>rows</code>, <code>cols</code>, <code>mines</code>, <code>seed</code>, <code>placed</code>, <code>status</code> (<code>ready</code>, <code>playing</code>, <code>won</code>, <code>lost</code>), <code>opened</code> (how many safe cells are open) and <code>exploded</code>.

| Piece | Kind | Notes |
| :--- | :--- | :--- |
| <code>game</code> | state | Replaced by the pure <code>reveal</code> and <code>toggleFlag</code> |
| <code>flagMode</code> | state | Touch alternative to right-click |
| <code>active</code> | state | Roving tabindex for arrow keys |
| mines left | derived | <code>mines - flagsUsed(game)</code> |
| what a cell shows | derived | <code>view(cell)</code>: hidden, flag, mine, open-0 to open-8 |
| cell buttons | ref | Array of elements, only to move focus |

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="Iterative flood fill: push the clicked cell, pop a cell, count it, and push its hidden neighbours only when its count is zero">
  <defs>
    <marker id="msr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="200" height="64" rx="10"/>
  <text class="d-text" x="120" y="57" text-anchor="middle">click a safe cell</text>
  <text class="d-sub" x="120" y="78" text-anchor="middle">mark open, push it</text>
  <rect class="d-box" x="260" y="30" width="200" height="64" rx="10"/>
  <text class="d-text" x="360" y="57" text-anchor="middle">pop from the stack</text>
  <text class="d-sub" x="360" y="78" text-anchor="middle">opened + 1</text>
  <rect class="d-box-accent" x="500" y="30" width="180" height="64" rx="10"/>
  <text class="d-text d-accent" x="590" y="57" text-anchor="middle">adj is 0 ?</text>
  <text class="d-sub" x="590" y="78" text-anchor="middle">numbers stop the wave</text>
  <rect class="d-box" x="400" y="220" width="280" height="64" rx="10"/>
  <text class="d-text" x="540" y="247" text-anchor="middle">each hidden neighbour</text>
  <text class="d-sub" x="540" y="268" text-anchor="middle">not flag, not mine: open, push</text>
  <rect class="d-box-muted" x="20" y="220" width="240" height="64" rx="10"/>
  <text class="d-text" x="140" y="247" text-anchor="middle">stack empty: done</text>
  <text class="d-sub" x="140" y="268" text-anchor="middle">won if opened = safe cells</text>
  <path class="d-edge-accent" d="M 222 62 L 254 62" marker-end="url(#msr-arrow)"/>
  <path class="d-edge-accent" d="M 462 62 L 494 62" marker-end="url(#msr-arrow)"/>
  <path class="d-edge-accent" d="M 590 98 L 590 214" marker-end="url(#msr-arrow)"/>
  <text class="d-sub" x="616" y="160">yes</text>
  <path class="d-edge" d="M 400 252 C 340 252, 340 150, 380 100" marker-end="url(#msr-arrow)"/>
  <text class="d-sub" x="300" y="170" text-anchor="middle">loop</text>
  <path class="d-edge-dashed" d="M 300 98 L 200 214" marker-end="url(#msr-arrow)"/>
  <text class="d-sub" x="215" y="150" text-anchor="middle">empty</text>
</svg>

The wave spreads through zeros and stops at numbers, which are opened but never expanded. Every cell is pushed at most once, because it is marked open at the moment it is pushed.

## 4. Build It Step by Step

### Step 1: neighbours

~~~js
export function neighbors(i, rows, cols) {
  const r = Math.floor(i / cols),
    c = i % cols,
    out = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr,
        nc = c + dc;
      if ((dr || dc) && nr >= 0 && nr < rows && nc >= 0 && nc < cols)
        out.push(nr * cols + nc);
    }
  return out;
}
~~~

Corner cells have three neighbours, edge cells five, inner cells eight. Checking row and column separately (not just the flat index) stops column 8 from "wrapping" into column 0 of the next row.

### Step 2: first-click-safe mine placement

~~~js
function placeMines(g, safe) {
  const { rows, cols, mines } = g;
  const keepClear = new Set([safe, ...neighbors(safe, rows, cols)]);
  // (tiny crowded boards fall back to protecting only the clicked cell)
  const pool = [];
  for (let i = 0; i < rows * cols; i++)
    if (!keepClear.has(i)) pool.push(i);
  const rng = mulberry32(g.seed);
  for (let k = 0; k < mines; k++) {
    // partial Fisher-Yates
    const j = k + Math.floor(rng() * (pool.length - k));
    [pool[k], pool[j]] = [pool[j], pool[k]];
  }
  const cells = g.cells.map((c) => ({ ...c }));
  for (const i of pool.slice(0, mines)) cells[i].mine = true;
  cells.forEach(
    (c, i) =>
      (c.adj = neighbors(i, rows, cols).filter(
        (n) => cells[n].mine,
      ).length),
  );
  return { ...g, cells, placed: true, status: "playing" };
}
~~~

📌 **Interview term: Deferred placement** — mines are not placed when the board is created but on the first reveal, excluding the clicked cell and its neighbours. The clicked cell then has <code>adj = 0</code>, so the first click always opens an area.

📌 **Interview term: Partial Fisher-Yates** — shuffle only the first <code>mines</code> slots of the candidate list: each step swaps slot <code>k</code> with a random slot from <code>k</code> to the end. It picks 10 distinct cells uniformly in 10 steps, with no retry loop. The full algorithm is explained in [Fisher-Yates shuffle](/interview-question/implement-fisher-yates-shuffle-in-place-unbiased).

📌 **Interview term: Seeded PRNG** — <code>mulberry32(seed)</code> returns repeatable random numbers. The UI uses seeds 1, 2, 3 for successive games, so a bug report can say "seed 7, first click r5c5" and you can replay it exactly. Because a fresh generator is made inside <code>placeMines</code>, calling it twice with the same game gives the same mines, which keeps the React state updater pure under StrictMode.

### Step 3: reveal with an iterative flood fill

~~~js
export function reveal(game, i) {
  let g = game;
  if (g.status === "won" || g.status === "lost") return g;
  if (g.cells[i].open || g.cells[i].flag) return g;
  if (!g.placed) g = placeMines(g, i);
  const cells = g.cells.slice();
  // copy only the cells we change
  const touch = (j) => (cells[j] = { ...cells[j] });

  if (cells[i].mine) {
    cells.forEach((c, j) => {
      if (c.mine && !c.flag) touch(j).open = true;
    });
    return { ...g, cells, status: "lost", exploded: i };
  }

  let opened = g.opened;
  const stack = [i];
  touch(i).open = true;
  while (stack.length) {
    const j = stack.pop();
    opened++;
    if (cells[j].adj !== 0) continue;
    for (const n of neighbors(j, g.rows, g.cols)) {
      if (cells[n].open || cells[n].flag || cells[n].mine) continue;
      touch(n).open = true; // mark on push, so no cell is pushed twice
      stack.push(n);
    }
  }
  const won = opened === g.rows * g.cols - g.mines;
  if (won)
    cells.forEach((c, j) => {
      if (c.mine && !c.flag) touch(j).flag = true;
    });
  return { ...g, cells, opened, status: won ? "won" : g.status };
}
~~~

📌 **Interview term: Flood fill** — starting from one cell, visit every connected cell that satisfies a rule (here: open zeros and expand them, open numbers and stop). The same algorithm paints a region in a drawing app. A stack gives depth-first order, a queue gives breadth-first ([BFS traversal](/interview-question/graph-bfs-traversal)); for Minesweeper either opens the same set.

**Why not recursion?** The textbook version is <code>visit(i)</code> calling <code>visit(n)</code> for each neighbour. Every pending call is a frame on the JavaScript **call stack**, and on a board with a large empty region the chain can be as deep as the region is big. Measured with a recursive fill on an empty board (no mines):

~~~text
recursive 50x50: opened 2500
iterative 50x50: opened 2500 status won in 5 ms
recursive 100x100: RangeError: Maximum call stack size exceeded
iterative 100x100: opened 10000 status won in 15 ms
recursive 200x200: RangeError: Maximum call stack size exceeded
iterative 200x200: opened 40000 status won in 44 ms
recursive 1000x1000: RangeError: Maximum call stack size exceeded
iterative 1000x1000: opened 1000000 status won in 734 ms
~~~

That was Node 22.22.0. The same recursive function run in Chromium 141 (through playwright-core) also opened 2,500 cells on 50 by 50 and threw <code>RangeError: Maximum call stack size exceeded</code> at 100 by 100, 200 by 200 and 1000 by 1000. A 9 by 9 board is far from the limit, but "custom board size" is a common follow-up, and the explicit stack lives on the heap, which is limited by memory rather than by stack depth. Timings vary from run to run.

📌 **Interview term: Mark on push** — set <code>open = true</code> when a cell is pushed, not when it is popped. Otherwise a cell with several zero neighbours is pushed several times, which wastes work and double-counts <code>opened</code>.

📌 **Interview term: Structural sharing** — <code>cells.slice()</code> copies the array of 81 references, and <code>touch(j)</code> copies only the cells that actually change. Unchanged cells keep their identity, which is what makes immutable updates cheap ([why immutable state](/interview-question/why-must-react-state-updates-be-immutable)).

Win detection uses the running <code>opened</code> count: the game is won when it equals the number of safe cells, with no rescan of the board.

### Step 4: flags, right-click and keyboard

~~~jsx
<button
  ref={buttonRef}
  type="button"
  data-testid="cell"
  data-view={v}
  className={
    "cell" +
    (cell.open ? " open" : "") +
    (n > 0 ? " n" + n : "") +
    (exploded ? " boom" : "")
  }
  aria-label={where + what}
  tabIndex={active ? 0 : -1}
  onClick={() => onReveal(index)}
  onContextMenu={(e) => {
    e.preventDefault();
    onFlag(index);
  }}
  onKeyDown={(e) => onKeyDown(index, e)}
  onFocus={() => onFocus(index)}
>
  {n > 0 ? n : SHOW[v] || ""}
</button>
~~~

Each cell is a real <code>&lt;button&gt;</code>, so Enter and Space reveal it for free. <code>onContextMenu</code> with <code>preventDefault</code> turns right-click into a flag instead of opening the browser menu, the F key flags from the keyboard, and the Flag mode toggle (<code>aria-pressed</code>) makes a tap flag on touch screens. Arrow keys use roving tabindex: only the active cell has <code>tabIndex=0</code>, and the handler moves focus through an array of [refs](/interview-question/describe-the-useref-hook-and-its-typical-use-cases).

<div style="background:#0b1f2a;border-left:4px solid #39c5cf;border-radius:6px;padding:14px 18px;margin:18px 0;">
<span style="color:#9be3ff;font-weight:bold;">🔑 Key insight:</span> <span style="color:#d6eef5;">Separate <strong style="color:#9be3ff;">what is true</strong> (mine, adjacent count) from <strong style="color:#9be3ff;">what the player knows</strong> (open, flag). Rendering only ever reads the second through <code style="background:#0d2a3a;color:#9be3ff;padding:1px 5px;border-radius:3px;">view(cell)</code>, so a hidden cell never leaks whether it is a mine, and the rules can be tested without any UI at all.</span>
</div>

## 5. Verified

The app was rendered in StrictMode in jsdom and driven with real clicks and key presses. To know where the mines are, the driver replays <code>reveal(createGame(1), 40)</code> with the same seed and first click. In the boards, <code>#</code> is hidden, <code>.</code> an open zero, a digit an open number, <code>F</code> a flag and <code>*</code> a revealed mine:

~~~text
RENDERED: MinesweeperMines left: 10🚩 Flag modeNew gameClick any cell to start
start: Mines left: 10 | Click any cell to start | mines placed before first click: 0
first click r5c5: Mines left: 10 | Playing | opened 36
  # # # # # # # # #
  # # # # # # # # #
  # # # # # # # # #
  # # # 1 1 1 1 1 #
  # # # 1 . . . 1 #
  # # 2 1 . . . 2 #
  # # 1 . . . . 1 #
  2 2 1 . . 1 2 4 #
  . . . . . 1 # # #
press f on a hidden cell: Mines left: 9 | Playing | Row 1, column 2: flagged
click the flagged cell (ignored): flag
flag mode on, tap a cell: Mines left: 8 | Playing | aria-pressed true
open every safe cell: Mines left: 0 | You win! 🎉
  1 F 1 . . . . . .
  1 1 1 . 1 1 1 . .
  . . . . 1 F 1 . .
  . 1 1 1 1 1 1 1 1
  . 1 F 1 . . . 1 F
  2 3 2 1 . . . 2 2
  F F 1 . . . . 1 F
  2 2 1 . . 1 2 4 3
  . . . . . 1 F F F
new game, click r1c1 then a mine: Mines left: 10 | Boom! You hit a mine. | exploded: true
  . . . . . . . . .
  . 1 1 1 . . . . .
  1 3 * 2 . . . . .
  * # * 2 . . . . .
  * # 2 1 . . . . .
  * * 1 . . 1 1 1 .
  * # 2 1 . 1 * 2 1
  # # * 1 . 1 1 2 *
  # # # 1 . . . 1 #
click a hidden cell after losing (ignored): hidden
arrow keys: Row 2, column 2: 1 nearby | tabbable: 1
logic: first click at r5c5 opened an area on 1000 of 1000 seeds
~~~

No mines exist before the first click; the first click at the centre opened 36 cells; F and Flag mode both flag and update the counter; a flagged cell ignores clicks; opening every safe cell wins and auto-flags the rest; on a second seed, clicking a mine reveals every mine and freezes the board; arrow keys move focus with one tab stop; and across 1,000 seeds the first click at r5c5 always opened an area.

The jsdom verifier dispatches clicks and keys, not right-clicks. A separate check in Chromium 141 (playwright-core, 360 px wide viewport) loaded the React build, opened the board with a left click and flagged a corner with a real right-click (the mines-left counter went to 9), and found no horizontal scroll (360 px of document width).

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| First click | Always <code>adj = 0</code>; opens an area |
| Flagged cell clicked | Ignored |
| Click after win or loss | Ignored by the status guard |
| Big empty region | Iterative fill; no stack overflow |
| Tiny crowded board | Falls back to protecting only the clicked cell |
| Touch | Flag mode toggle with <code>aria-pressed</code> |
| Keyboard | One tab stop, arrows move, Enter or Space reveal, F flags |
| Screen reader | "Row 4, column 6: 1 nearby", "hidden", "flagged", "mine"; <code>role="status"</code> for Playing, win and loss |

## 7. Common Pitfalls

- **Placing mines at creation time.** The first click can lose. Defer placement.
- **Recursive flood fill.** Overflows the call stack on large empty regions (measured above).
- **Marking visited on pop instead of push.** Duplicates in the stack and a wrong opened count.
- **Expanding numbered cells.** Only zeros spread; numbers open and stop.
- **Rescanning all cells for the win.** Keep an opened counter.
- **Rendering the mine flag of hidden cells into the DOM** (for example as a class). It gives the answer away in devtools.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"9 by 9, 10 mines, first click opens an area, right-click and F flag, touch flag mode, arrow keys."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Model:</strong> <span style="color:#f0e2c8;">"Cells hold <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mine</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">adj</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">open</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flag</code>; the game holds the cells, status and an opened counter. Pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reveal</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggleFlag</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Placement:</strong> <span style="color:#f0e2c8;">"On the first reveal, exclude the cell and its neighbours, pick mines with a seeded partial Fisher-Yates, then compute adjacent counts."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Flood fill:</strong> <span style="color:#f0e2c8;">"An explicit stack, mark cells open when pushed, expand only zeros, count opened cells for the win. Recursion would overflow on big boards."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. UI:</strong> <span style="color:#f0e2c8;">"Buttons per cell, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onContextMenu</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code>, roving tabindex, labels that say hidden, flagged or the count."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement chording?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When an open number is clicked and the flags around it equal its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">adj</code>, reveal every hidden, unflagged neighbour with the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reveal</code> logic. If one of them is a mine, the player loses, exactly as in the classic game.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">BFS or DFS for the flood fill?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either opens the same cells. A queue (BFS) opens in rings, which looks nicer if you animate the reveal; a stack (DFS) is simpler with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code>. A queue built on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code> is linear per call, so use an index pointer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make a 1000 by 1000 board render fast?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Draw on a canvas or virtualise the grid, keep cells in typed arrays (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Uint8Array</code> for flags and counts) instead of objects, and redraw only the cells that changed in the last reveal.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With a fixed seed and first click, assert the mine positions, then test reveal on a zero, a number and a mine, the win count and that flags block reveal. All pure, no DOM needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why derive what a cell shows instead of storing it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">view(cell)</code> is a function of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">open</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flag</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mine</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">adj</code>. Storing a separate display string invites it to disagree with the real state after a flag toggle or a loss.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Adjacent count** | Mines among a cell's up to eight neighbours |
| **Deferred placement** | Place mines on the first reveal so it is always safe |
| **Partial Fisher-Yates** | Shuffle just the first k slots to pick k distinct items |
| **Seeded PRNG** | Repeatable random numbers from a seed |
| **Flood fill** | Visit every connected cell that satisfies a rule |
| **Call stack** | Memory for pending function calls; limited in depth |
| **Mark on push** | Mark visited when queued so each cell is handled once |
| **Structural sharing** | Copy only what changed; reuse the rest |

---

**Conclusion:** Minesweeper is a small data model and one algorithm done carefully. Defer mine placement to the first click and pick mines with a seeded partial Fisher-Yates; open regions with an explicit stack, marking on push and expanding only zeros; count opened cells for the win; and keep the truth (mines, counts) apart from what the player knows (open, flags). The measured stack overflow is the concrete reason to avoid recursion. The same seeded, pure-rules approach is used in the [Memory game](/interview-question/build-a-memory-flip-card-game) and [Snake](/interview-question/build-the-snake-game).`,
        files: {
          "/App.js": `import { useRef, useState } from "react";
import Cell from "./src/components/Cell";
import { createGame, flagsUsed, reveal, toggleFlag } from "./src/utils/minesweeper";

const MESSAGE = {
  ready: "Click any cell to start",
  playing: "Playing",
  won: "You win! 🎉",
  lost: "Boom! You hit a mine.",
};

export default function App() {
  const [game, setGame] = useState(() => createGame(1));
  const [flagMode, setFlagMode] = useState(false);
  const [active, setActive] = useState(0);
  const refs = useRef([]);
  const { rows, cols } = game;

  const onReveal = (i) =>
    setGame((g) => (flagMode ? toggleFlag(g, i) : reveal(g, i)));
  const onFlag = (i) => setGame((g) => toggleFlag(g, i));

  function onKeyDown(i, e) {
    if (e.key === "f" || e.key === "F") return onFlag(i);
    const r = Math.floor(i / cols),
      c = i % cols;
    const to = {
      ArrowUp: [r - 1, c],
      ArrowDown: [r + 1, c],
      ArrowLeft: [r, c - 1],
      ArrowRight: [r, c + 1],
    }[e.key];
    if (!to) return;
    e.preventDefault();
    const [nr, nc] = [
      Math.min(rows - 1, Math.max(0, to[0])),
      Math.min(cols - 1, Math.max(0, to[1])),
    ];
    setActive(nr * cols + nc);
    refs.current[nr * cols + nc].focus();
  }

  return (
    <main className="mines">
      <h1>Minesweeper</h1>
      <div className="bar">
        <span data-testid="counter">
          Mines left: {game.mines - flagsUsed(game)}
        </span>
        <button
          type="button"
          aria-pressed={flagMode}
          onClick={() => setFlagMode((m) => !m)}
        >
          🚩 Flag mode
        </button>
        <button
          type="button"
          onClick={() => setGame((g) => createGame(g.seed + 1))}
        >
          New game
        </button>
      </div>
      <div
        className="board"
        role="group"
        aria-label={
          "Minefield, " + rows + " by " + cols + ", " + game.mines + " mines"
        }
      >
        {game.cells.map((cell, i) => (
          <Cell
            key={i}
            index={i}
            cols={cols}
            cell={cell}
            exploded={i === game.exploded}
            active={i === active}
            buttonRef={(el) => (refs.current[i] = el)}
            onReveal={onReveal}
            onFlag={onFlag}
            onKeyDown={onKeyDown}
            onFocus={setActive}
          />
        ))}
      </div>
      <p className="status" role="status" data-testid="status">
        {MESSAGE[game.status]}
      </p>
    </main>
  );
}
`,
          "/src/components/Cell.js": `import { view } from "../utils/minesweeper";

const SHOW = { hidden: "", flag: "🚩", mine: "💣" };

export default function Cell({
  index,
  cols,
  cell,
  exploded,
  active,
  onReveal,
  onFlag,
  onKeyDown,
  onFocus,
  buttonRef,
}) {
  const v = view(cell);
  const n = v.startsWith("open-") ? Number(v.slice(5)) : -1;
  const where =
    "Row " +
    (Math.floor(index / cols) + 1) +
    ", column " +
    ((index % cols) + 1) +
    ": ";
  const what =
    v === "hidden"
      ? "hidden"
      : v === "flag"
        ? "flagged"
        : v === "mine"
          ? "mine"
          : n === 0
            ? "empty"
            : n + " nearby";
  return (
    <button
      ref={buttonRef}
      type="button"
      data-testid="cell"
      data-view={v}
      className={
        "cell" +
        (cell.open ? " open" : "") +
        (n > 0 ? " n" + n : "") +
        (exploded ? " boom" : "")
      }
      aria-label={where + what}
      tabIndex={active ? 0 : -1}
      onClick={() => onReveal(index)}
      onContextMenu={(e) => {
        e.preventDefault();
        onFlag(index);
      }}
      onKeyDown={(e) => onKeyDown(index, e)}
      onFocus={() => onFocus(index)}
    >
      {n > 0 ? n : SHOW[v] || ""}
    </button>
  );
}
`,
          "/src/utils/minesweeper.js": `// Pure Minesweeper logic: no framework, no
// DOM. Every function returns a new game.
// Cells are numbered row * cols + col.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function neighbors(i, rows, cols) {
  const r = Math.floor(i / cols),
    c = i % cols,
    out = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr,
        nc = c + dc;
      if ((dr || dc) && nr >= 0 && nr < rows && nc >= 0 && nc < cols)
        out.push(nr * cols + nc);
    }
  return out;
}

export function createGame(seed, rows = 9, cols = 9, mines = 10) {
  const cells = Array.from({ length: rows * cols }, () => ({
    mine: false,
    adj: 0,
    open: false,
    flag: false,
  }));
  return {
    seed,
    rows,
    cols,
    mines,
    cells,
    placed: false,
    status: "ready",
    opened: 0,
    exploded: -1,
  };
}

// Mines are placed on the FIRST reveal, never on that cell or its neighbours,
// so the first click always opens an area. The seeded RNG keeps it repeatable.
function placeMines(g, safe) {
  const { rows, cols, mines } = g;
  const keepClear = new Set([safe, ...neighbors(safe, rows, cols)]);
  if (rows * cols - keepClear.size < mines) {
    // tiny, crowded board: only the clicked cell is protected
    keepClear.clear();
    keepClear.add(safe);
  }
  const pool = [];
  for (let i = 0; i < rows * cols; i++) if (!keepClear.has(i)) pool.push(i);
  const rng = mulberry32(g.seed);
  for (let k = 0; k < mines; k++) {
    const j = k + Math.floor(rng() * (pool.length - k)); // partial Fisher-Yates
    [pool[k], pool[j]] = [pool[j], pool[k]];
  }
  const cells = g.cells.map((c) => ({ ...c }));
  for (const i of pool.slice(0, mines)) cells[i].mine = true;
  cells.forEach(
    (c, i) =>
      (c.adj = neighbors(i, rows, cols).filter((n) => cells[n].mine).length),
  );
  return { ...g, cells, placed: true, status: "playing" };
}

export function reveal(game, i) {
  let g = game;
  if (g.status === "won" || g.status === "lost") return g;
  if (g.cells[i].open || g.cells[i].flag) return g;
  if (!g.placed) g = placeMines(g, i);
  const cells = g.cells.slice();
  // copy only the cells we change
  const touch = (j) => (cells[j] = { ...cells[j] });

  if (cells[i].mine) {
    cells.forEach((c, j) => {
      if (c.mine && !c.flag) touch(j).open = true;
    });
    return { ...g, cells, status: "lost", exploded: i };
  }

  // Iterative flood fill with an explicit stack: memory on the heap, not the
  // call stack, so a huge empty board cannot overflow it.
  let opened = g.opened;
  const stack = [i];
  touch(i).open = true;
  while (stack.length) {
    const j = stack.pop();
    opened++;
    if (cells[j].adj !== 0) continue;
    for (const n of neighbors(j, g.rows, g.cols)) {
      if (cells[n].open || cells[n].flag || cells[n].mine) continue;
      touch(n).open = true; // mark on push, so no cell is pushed twice
      stack.push(n);
    }
  }
  const won = opened === g.rows * g.cols - g.mines;
  if (won)
    cells.forEach((c, j) => {
      if (c.mine && !c.flag) touch(j).flag = true;
    });
  return { ...g, cells, opened, status: won ? "won" : g.status };
}

export function toggleFlag(g, i) {
  if (g.status === "won" || g.status === "lost" || g.cells[i].open) return g;
  const cells = g.cells.slice();
  cells[i] = { ...cells[i], flag: !cells[i].flag };
  return { ...g, cells };
}

export const flagsUsed = (g) => g.cells.filter((c) => c.flag).length;

// What one cell should show: hidden, flag, mine, or open-0 ... open-8.
export function view(c) {
  if (c.open) return c.mine ? "mine" : "open-" + c.adj;
  return c.flag ? "flag" : "hidden";
}
`,
          "/styles.css": `:root {
  color-scheme: dark;
}
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f1115;
  color: #e8e8ea;
}
.mines {
  max-width: 360px;
  margin: 24px auto;
  padding: 0 16px;
}
.mines h1 {
  font-size: 1.3rem;
  margin: 0 0 8px;
}
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
button {
  background: #2a2f3a;
  color: #e8e8ea;
  border: 1px solid #3b4252;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}
button[aria-pressed="true"] {
  background: #5a3d0a;
  border-color: #f9a825;
}
.board {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 2px;
}
.cell {
  aspect-ratio: 1;
  padding: 0;
  border-radius: 4px;
  font-weight: 700;
  font-size: 1rem;
  background: #30363d;
  border: 1px solid #484f58;
}
.cell.open {
  background: #161b22;
  border-color: #21262d;
  cursor: default;
}
.cell.boom {
  background: #8e1519;
}
.cell:focus-visible {
  outline: 3px solid #f9a825;
  outline-offset: 1px;
}
.n1 {
  color: #58a6ff;
}
.n2 {
  color: #3fb950;
}
.n3 {
  color: #f85149;
}
.n4 {
  color: #bc8cff;
}
.n5 {
  color: #ff7b72;
}
.n6 {
  color: #39c5cf;
}
.n7 {
  color: #e8e8ea;
}
.n8 {
  color: #8b949e;
}
.status {
  min-height: 1.4em;
  margin-top: 10px;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round in Vue. You know <code>ref</code>, <code>computed</code> and components; the game and the flood fill are explained from zero.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> tag with the exact vocabulary. The Verified section is real output from mounting the solution with Vue 3.5.44 in jsdom and clicking through a seeded game with a script.

## 1. Why This Even Matters — A Story First

A field of tiles hides ten traps. Lift a tile: a trap ends the game; otherwise the tile shows how many of its eight neighbours hide one. A zero means every neighbour is safe, so they all lift automatically, and their zeros lift their neighbours: one click can open half the field. That chain reaction (the **flood fill**), a first click that can never lose, and a board that does not crash when it grows are what this question tests.

## 2. Requirements and Plan

9 by 9, 10 mines, a mines-left counter, New game, a safe first click that opens an area, flood fill on zeros, right-click, F key and a touch Flag mode for flags, loss reveals every mine, opening all safe cells wins, arrow-key navigation.

The rules live in a plain <code>src/utils/minesweeper.js</code>: <code>createGame(seed)</code>, <code>reveal(game, i)</code>, <code>toggleFlag(game, i)</code>, <code>flagsUsed</code> and <code>view(cell)</code>. A cell is <code>{ mine, adj, open, flag }</code>.

| Piece | Vue primitive | Why |
| :--- | :--- | :--- |
| the game | <code>shallowRef(createGame(1))</code> | Always replaced, never mutated |
| <code>flagMode</code>, <code>active</code> | <code>ref</code> | Touch flagging and roving tabindex |
| mines left | <code>computed</code> | <code>mines - flagsUsed(game)</code> |
| label, face, view | <code>computed</code> in <code>MineCell.vue</code> | Derived per cell from its props |
| board element | <code>useTemplateRef("board")</code> | To move focus |

📌 **Interview term: shallowRef** — a ref whose <code>.value</code> is reactive but whose contents are not made deeply reactive. Because <code>reveal</code> returns a brand new game object, Vue only needs to notice the replacement; skipping deep proxies over 81 cell objects is free performance. See [shallowRef and shallowReactive](/interview-question/what-are-shallowref-and-shallowreactive).

## 3. Build It Step by Step

### Step 1: place mines on the first reveal

~~~js
const keepClear = new Set([safe, ...neighbors(safe, rows, cols)]);
const pool = [];
for (let i = 0; i < rows * cols; i++)
  if (!keepClear.has(i)) pool.push(i);
const rng = mulberry32(g.seed);
for (let k = 0; k < mines; k++) {
  // partial Fisher-Yates
  const j = k + Math.floor(rng() * (pool.length - k));
  [pool[k], pool[j]] = [pool[j], pool[k]];
}
~~~

📌 **Interview term: Deferred placement** — mines are placed on the first reveal, avoiding the clicked cell and its neighbours, so that cell is a zero and always opens an area. The first <code>mines</code> slots of a partial [Fisher-Yates shuffle](/interview-question/implement-fisher-yates-shuffle-in-place-unbiased) give distinct, uniformly chosen cells, and the seeded <code>mulberry32</code> makes every game replayable. Adjacent counts are computed right after.

### Step 2: the iterative flood fill

~~~js
let opened = g.opened;
const stack = [i];
touch(i).open = true;
while (stack.length) {
  const j = stack.pop();
  opened++;
  if (cells[j].adj !== 0) continue;
  for (const n of neighbors(j, g.rows, g.cols)) {
    if (cells[n].open || cells[n].flag || cells[n].mine) continue;
    touch(n).open = true; // mark on push, so no cell is pushed twice
    stack.push(n);
  }
}
const won = opened === g.rows * g.cols - g.mines;
~~~

📌 **Interview term: Flood fill** — visit every connected cell that matches a rule: zeros open and expand, numbers open and stop. An explicit stack keeps the pending cells on the heap. A recursive version keeps them on the call stack instead, and measured on an empty board it threw <code>RangeError: Maximum call stack size exceeded</code> at 100 by 100 cells in both Node 22.22.0 and Chromium 141, while the iterative one opened 1,000,000 cells on 1000 by 1000. A 9 by 9 board is safe either way; a custom-size board is not.

📌 **Interview term: Mark on push** — setting <code>open</code> as a cell is pushed means it can never be pushed twice, so <code>opened</code> stays exact and the win check is a simple comparison.

<code>touch(j)</code> copies only the cells that change, so unchanged cell objects keep their identity.

### Step 3: the cell component

~~~vue
<button type="button" data-testid="cell" :data-view="v"
  :class="['cell', { open: cell.open, boom: exploded }, n > 0 ? 'n' + n : '']"
  :aria-label="label" :tabindex="active ? 0 : -1"
  @click="emit('reveal', index)"
  @contextmenu.prevent="emit('flag', index)"
  @keydown="emit('nav', index, $event)"
  @focus="emit('focused', index)">{{ face }}</button>
~~~

📌 **Interview term: Event modifier** — <code>@contextmenu.prevent</code> calls <code>preventDefault()</code> for you, so right-click flags the cell instead of opening the browser menu.

<code>v</code>, <code>n</code>, <code>label</code> and <code>face</code> are <code>computed</code> from the <code>cell</code> prop through <code>view(cell)</code>, so a hidden cell never renders whether it is a mine. The parent handles <code>nav</code>: F flags, arrows set <code>active</code>, then after <code>nextTick</code> focus moves to the new button through the board template ref. Props down, events up throughout ([defineProps and defineEmits](/interview-question/how-do-defineprops-and-defineemits-work-in-script-setup)).

## 4. Verified

Mounted with <code>createApp(App).mount("#app")</code> in jsdom and driven with real clicks and keys; the driver replays <code>reveal(createGame(1), 40)</code> to know the mines. <code>#</code> hidden, <code>.</code> open zero, digits open numbers, <code>F</code> flag, <code>*</code> revealed mine:

~~~text
RENDERED: MinesweeperMines left: 10🚩 Flag modeNew gameClick any cell to start
start: Mines left: 10 | Click any cell to start | mines placed before first click: 0
first click r5c5: Mines left: 10 | Playing | opened 36
  # # # # # # # # #
  # # # # # # # # #
  # # # # # # # # #
  # # # 1 1 1 1 1 #
  # # # 1 . . . 1 #
  # # 2 1 . . . 2 #
  # # 1 . . . . 1 #
  2 2 1 . . 1 2 4 #
  . . . . . 1 # # #
press f on a hidden cell: Mines left: 9 | Playing | Row 1, column 2: flagged
click the flagged cell (ignored): flag
flag mode on, tap a cell: Mines left: 8 | Playing | aria-pressed true
open every safe cell: Mines left: 0 | You win! 🎉
  1 F 1 . . . . . .
  1 1 1 . 1 1 1 . .
  . . . . 1 F 1 . .
  . 1 1 1 1 1 1 1 1
  . 1 F 1 . . . 1 F
  2 3 2 1 . . . 2 2
  F F 1 . . . . 1 F
  2 2 1 . . 1 2 4 3
  . . . . . 1 F F F
new game, click r1c1 then a mine: Mines left: 10 | Boom! You hit a mine. | exploded: true
  . . . . . . . . .
  . 1 1 1 . . . . .
  1 3 * 2 . . . . .
  * # * 2 . . . . .
  * # 2 1 . . . . .
  * * 1 . . 1 1 1 .
  * # 2 1 . 1 * 2 1
  # # * 1 . 1 1 2 *
  # # # 1 . . . 1 #
click a hidden cell after losing (ignored): hidden
arrow keys: Row 2, column 2: 1 nearby | tabbable: 1
logic: first click at r5c5 opened an area on 1000 of 1000 seeds
~~~

The first click opened 36 cells with no mine placed before it, flags block reveals, the win auto-flags remaining mines, a loss reveals all mines and freezes the board, arrows keep one tab stop, and the first click opened an area on all 1,000 seeds tried. Identical to the React and Angular output. Right-click was not dispatched (the handler calls the same <code>toggleFlag</code> the F key exercised); layout was not checked.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| First click | Always a zero |
| Flagged cell clicked | Ignored |
| After win or loss | Every action ignored |
| Huge empty region | Iterative fill |
| Touch | Flag mode, <code>aria-pressed</code> |
| Keyboard | One tab stop, arrows, Enter or Space, F |
| Screen reader | Labels like "Row 4, column 6: 1 nearby"; <code>role="status"</code> |

## 6. Common Pitfalls

- **<code>reactive()</code> board mutated in place.** Works, but the rules stop being pure and every cell becomes a proxy. Use <code>shallowRef</code> with replacement.
- **Forgetting <code>.prevent</code> on <code>contextmenu</code>.** The browser menu opens over the board.
- **Recursive flood fill.** Measured stack overflow at 100 by 100.
- **Placing mines in <code>createGame</code>.** The first click can lose.
- **A class like <code>mine</code> on hidden cells.** Leaks the answer.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"9 by 9, 10 mines, safe first click that opens an area, right-click, F and a touch flag mode."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Model:</strong> <span style="color:#f0e2c8;">"Cells with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mine</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">adj</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">open</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flag</code>, the game in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code>, pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reveal</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggleFlag</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Placement:</strong> <span style="color:#f0e2c8;">"On first reveal, exclude the 3 by 3 around the click, seeded partial Fisher-Yates, then adjacent counts."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Flood fill:</strong> <span style="color:#f0e2c8;">"Explicit stack, mark on push, expand zeros only, count opened cells for the win."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. UI:</strong> <span style="color:#f0e2c8;">"Buttons, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@contextmenu.prevent</code>, roving tabindex with a template ref and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code>, descriptive labels."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shallowRef</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ref</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> would deep-proxy all cell objects although they are never mutated. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> tracks only the replacement, which is exactly how the pure functions update the game.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add chording?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On clicking an open number whose neighbouring flags equal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">adj</code>, reveal each hidden unflagged neighbour; a wrong flag means a mine is revealed and the game is lost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a timer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store the start time on the first reveal and the end time on win or loss; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on the status starts and clears a one-second interval that only triggers a re-render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pure tests with a fixed seed and first click; then Vue Test Utils to click cells and trigger <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keydown</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f</code>, asserting labels and the status.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Deferred placement** | Mines placed on the first reveal |
| **Partial Fisher-Yates** | Shuffle only k slots to pick k distinct items |
| **Flood fill** | Visit all connected cells that match a rule |
| **Mark on push** | Mark visited when queued |
| **shallowRef** | Ref that tracks replacement, not deep changes |
| **Event modifier** | Template shorthand like <code>.prevent</code> |

---

**Conclusion:** In Vue, Minesweeper is a <code>shallowRef</code> holding an immutable game, a presentational cell that emits reveal, flag and navigation events, and pure rules that defer mine placement to the first click and open regions with an explicit stack. The measured stack overflow of the recursive version is the reason the fill is iterative, and the seeded RNG is why the same driver gives the same boards in every framework.`,
        files: {
          "/src/App.vue": `<script setup>
import { computed, nextTick, ref, shallowRef, useTemplateRef } from "vue";
import MineCell from "./components/MineCell.vue";
import { createGame, flagsUsed, reveal, toggleFlag } from "./utils/minesweeper.js";

const MESSAGE = {
  ready: "Click any cell to start",
  playing: "Playing",
  won: "You win! 🎉",
  lost: "Boom! You hit a mine.",
};

// shallowRef: the game is replaced as a whole by the pure functions,
// so Vue does not need to make 81 cell objects deeply reactive.
const game = shallowRef(createGame(1));
const flagMode = ref(false);
const active = ref(0);
const board = useTemplateRef("board");
const minesLeft = computed(() => game.value.mines - flagsUsed(game.value));

const onReveal = (i) =>
  (game.value = flagMode.value
    ? toggleFlag(game.value, i)
    : reveal(game.value, i));
const onFlag = (i) => (game.value = toggleFlag(game.value, i));

async function onNav(i, e) {
  if (e.key === "f" || e.key === "F") return onFlag(i);
  const { rows, cols } = game.value;
  const r = Math.floor(i / cols),
    c = i % cols;
  const to = {
    ArrowUp: [r - 1, c],
    ArrowDown: [r + 1, c],
    ArrowLeft: [r, c - 1],
    ArrowRight: [r, c + 1],
  }[e.key];
  if (!to) return;
  e.preventDefault();
  const j =
    Math.min(rows - 1, Math.max(0, to[0])) * cols +
    Math.min(cols - 1, Math.max(0, to[1]));
  active.value = j;
  await nextTick();
  board.value.querySelectorAll("button")[j].focus();
}
</script>

<template>
  <main class="mines">
    <h1>Minesweeper</h1>
    <div class="bar">
      <span data-testid="counter">Mines left: {{ minesLeft }}</span>
      <button
        type="button"
        :aria-pressed="flagMode"
        @click="flagMode = !flagMode"
      >🚩 Flag mode</button>
      <button
        type="button"
        @click="game = createGame(game.seed + 1)"
      >New game</button>
    </div>
    <div
      ref="board"
      class="board"
      role="group"
      :aria-label="'Minefield, ' + game.rows + ' by ' + game.cols + ', ' + game.mines + ' mines'"
    >
      <MineCell
        v-for="(cell, i) in game.cells"
        :key="i"
        :index="i"
        :cols="game.cols"
        :cell="cell"
        :exploded="i === game.exploded"
        :active="i === active"
        @reveal="onReveal"
        @flag="onFlag"
        @nav="onNav"
        @focused="active = $event"
      />
    </div>
    <p
      class="status"
      role="status"
      data-testid="status"
    >{{ MESSAGE[game.status] }}</p>
  </main>
</template>

<style>
:root {
  color-scheme: dark;
}
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f1115;
  color: #e8e8ea;
}
.mines {
  max-width: 360px;
  margin: 24px auto;
  padding: 0 16px;
}
.mines h1 {
  font-size: 1.3rem;
  margin: 0 0 8px;
}
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
button {
  background: #2a2f3a;
  color: #e8e8ea;
  border: 1px solid #3b4252;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}
button[aria-pressed="true"] {
  background: #5a3d0a;
  border-color: #f9a825;
}
.board {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 2px;
}
.cell {
  aspect-ratio: 1;
  padding: 0;
  border-radius: 4px;
  font-weight: 700;
  font-size: 1rem;
  background: #30363d;
  border: 1px solid #484f58;
}
.cell.open {
  background: #161b22;
  border-color: #21262d;
  cursor: default;
}
.cell.boom {
  background: #8e1519;
}
.cell:focus-visible {
  outline: 3px solid #f9a825;
  outline-offset: 1px;
}
.n1 {
  color: #58a6ff;
}
.n2 {
  color: #3fb950;
}
.n3 {
  color: #f85149;
}
.n4 {
  color: #bc8cff;
}
.n5 {
  color: #ff7b72;
}
.n6 {
  color: #39c5cf;
}
.n7 {
  color: #e8e8ea;
}
.n8 {
  color: #8b949e;
}
.status {
  min-height: 1.4em;
  margin-top: 10px;
}
</style>
`,
          "/src/components/MineCell.vue": `<script setup>
import { computed } from "vue";
import { view } from "../utils/minesweeper.js";

const props = defineProps({
  index: { type: Number, required: true },
  cols: { type: Number, required: true },
  cell: { type: Object, required: true },
  exploded: Boolean,
  active: Boolean,
});
const emit = defineEmits(["reveal", "flag", "nav", "focused"]);

const v = computed(() => view(props.cell));
const n = computed(() =>
  v.value.startsWith("open-") ? Number(v.value.slice(5)) : -1,
);
const label = computed(() => {
  const where =
    "Row " +
    (Math.floor(props.index / props.cols) + 1) +
    ", column " +
    ((props.index % props.cols) + 1) +
    ": ";
  const what =
    { hidden: "hidden", flag: "flagged", mine: "mine" }[v.value] ||
    (n.value === 0 ? "empty" : n.value + " nearby");
  return where + what;
});
const face = computed(() =>
  n.value > 0 ? n.value : { flag: "🚩", mine: "💣" }[v.value] || "",
);
</script>

<template>
  <button
    type="button"
    data-testid="cell"
    :data-view="v"
    :class="['cell', { open: cell.open, boom: exploded }, n > 0 ? 'n' + n : '']"
    :aria-label="label"
    :tabindex="active ? 0 : -1"
    @click="emit('reveal', index)"
    @contextmenu.prevent="emit('flag', index)"
    @keydown="emit('nav', index, $event)"
    @focus="emit('focused', index)"
  >
    {{ face }}
  </button>
</template>
`,
          "/src/utils/minesweeper.js": `// Pure Minesweeper logic: no framework, no
// DOM. Every function returns a new game.
// Cells are numbered row * cols + col.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function neighbors(i, rows, cols) {
  const r = Math.floor(i / cols),
    c = i % cols,
    out = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr,
        nc = c + dc;
      if ((dr || dc) && nr >= 0 && nr < rows && nc >= 0 && nc < cols)
        out.push(nr * cols + nc);
    }
  return out;
}

export function createGame(seed, rows = 9, cols = 9, mines = 10) {
  const cells = Array.from({ length: rows * cols }, () => ({
    mine: false,
    adj: 0,
    open: false,
    flag: false,
  }));
  return {
    seed,
    rows,
    cols,
    mines,
    cells,
    placed: false,
    status: "ready",
    opened: 0,
    exploded: -1,
  };
}

// Mines are placed on the FIRST reveal, never on that cell or its neighbours,
// so the first click always opens an area. The seeded RNG keeps it repeatable.
function placeMines(g, safe) {
  const { rows, cols, mines } = g;
  const keepClear = new Set([safe, ...neighbors(safe, rows, cols)]);
  if (rows * cols - keepClear.size < mines) {
    // tiny, crowded board: only the clicked cell is protected
    keepClear.clear();
    keepClear.add(safe);
  }
  const pool = [];
  for (let i = 0; i < rows * cols; i++) if (!keepClear.has(i)) pool.push(i);
  const rng = mulberry32(g.seed);
  for (let k = 0; k < mines; k++) {
    const j = k + Math.floor(rng() * (pool.length - k)); // partial Fisher-Yates
    [pool[k], pool[j]] = [pool[j], pool[k]];
  }
  const cells = g.cells.map((c) => ({ ...c }));
  for (const i of pool.slice(0, mines)) cells[i].mine = true;
  cells.forEach(
    (c, i) =>
      (c.adj = neighbors(i, rows, cols).filter((n) => cells[n].mine).length),
  );
  return { ...g, cells, placed: true, status: "playing" };
}

export function reveal(game, i) {
  let g = game;
  if (g.status === "won" || g.status === "lost") return g;
  if (g.cells[i].open || g.cells[i].flag) return g;
  if (!g.placed) g = placeMines(g, i);
  const cells = g.cells.slice();
  // copy only the cells we change
  const touch = (j) => (cells[j] = { ...cells[j] });

  if (cells[i].mine) {
    cells.forEach((c, j) => {
      if (c.mine && !c.flag) touch(j).open = true;
    });
    return { ...g, cells, status: "lost", exploded: i };
  }

  // Iterative flood fill with an explicit stack: memory on the heap, not the
  // call stack, so a huge empty board cannot overflow it.
  let opened = g.opened;
  const stack = [i];
  touch(i).open = true;
  while (stack.length) {
    const j = stack.pop();
    opened++;
    if (cells[j].adj !== 0) continue;
    for (const n of neighbors(j, g.rows, g.cols)) {
      if (cells[n].open || cells[n].flag || cells[n].mine) continue;
      touch(n).open = true; // mark on push, so no cell is pushed twice
      stack.push(n);
    }
  }
  const won = opened === g.rows * g.cols - g.mines;
  if (won)
    cells.forEach((c, j) => {
      if (c.mine && !c.flag) touch(j).flag = true;
    });
  return { ...g, cells, opened, status: won ? "won" : g.status };
}

export function toggleFlag(g, i) {
  if (g.status === "won" || g.status === "lost" || g.cells[i].open) return g;
  const cells = g.cells.slice();
  cells[i] = { ...cells[i], flag: !cells[i].flag };
  return { ...g, cells };
}

export const flagsUsed = (g) => g.cells.filter((c) => c.flag).length;

// What one cell should show: hidden, flag, mine, or open-0 ... open-8.
export function view(c) {
  if (c.open) return c.mine ? "mine" : "open-" + c.adj;
  return c.flag ? "flag" : "hidden";
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round in Angular. You know components and templates; signals, the game and the flood fill are explained as we go.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> tag with the exact vocabulary. The Verified section is real output from booting the solution on Angular 22.2.3 twice (AOT with strict templates, and the runtime JIT the playground uses) and clicking through a seeded game with a script.

## 1. Why This Even Matters — A Story First

Ten traps hide under a field of tiles. Lift one: a trap ends the game, otherwise it shows how many neighbours hide a trap. A zero means all neighbours are safe, so they lift too, and their zeros spread the wave further. That chain reaction (the **flood fill**), a first click that cannot lose, and a fill that survives a huge board are the core of this question.

## 2. Requirements and Plan

9 by 9, 10 mines, mines-left counter, New game, safe first click that opens an area, flood fill, flags by right-click, F key or touch Flag mode, loss reveals all mines, win when every safe cell is open, arrow keys.

The rules are typed, framework-free TypeScript in <code>minesweeper.ts</code>: <code>Cell</code>, <code>Status</code> and <code>Game</code> types, plus pure <code>createGame</code>, <code>reveal</code>, <code>toggleFlag</code>, <code>flagsUsed</code> and <code>view</code>.

| Piece | Angular primitive | Why |
| :--- | :--- | :--- |
| the game | <code>signal(createGame(1))</code> | Replaced through <code>update()</code> |
| <code>flagMode</code>, <code>active</code> | <code>signal</code> | Touch flagging, roving tabindex |
| mines left | <code>computed()</code> | <code>mines - flagsUsed(game())</code> |
| cell display | getters on <code>MineCellComponent</code> | Derived from the <code>cell</code> input |
| cell components | <code>@ViewChildren(MineCellComponent)</code> | To move focus |

## 3. Build It Step by Step

### Step 1: deferred, seeded mine placement

~~~ts
function placeMines(g: Game, safe: number): Game {
  const { rows, cols, mines } = g;
  const keepClear = new Set([safe, ...neighbors(safe, rows, cols)]);
  const pool: number[] = [];
  for (let i = 0; i < rows * cols; i++)
    if (!keepClear.has(i)) pool.push(i);
  const rng = mulberry32(g.seed);
  for (let k = 0; k < mines; k++) {
    // partial Fisher-Yates
    const j = k + Math.floor(rng() * (pool.length - k));
    [pool[k], pool[j]] = [pool[j], pool[k]];
  }
  // ... set mine on pool[0..mines), then compute adj for every cell
}
~~~

(Excerpt: the real function also falls back to protecting only the clicked cell on tiny crowded boards.)

📌 **Interview term: Deferred placement** — mines go down on the first reveal, avoiding the clicked cell and its neighbours, so that cell is a zero and always opens an area. A partial [Fisher-Yates shuffle](/interview-question/implement-fisher-yates-shuffle-in-place-unbiased) picks distinct cells uniformly; the seeded <code>mulberry32</code> makes a game replayable from its seed.

### Step 2: the iterative flood fill

~~~ts
let opened = g.opened;
const stack: number[] = [i];
touch(i).open = true;
while (stack.length) {
  const j = stack.pop()!;
  opened++;
  if (cells[j].adj !== 0) continue;
  for (const n of neighbors(j, g.rows, g.cols)) {
    if (cells[n].open || cells[n].flag || cells[n].mine) continue;
    touch(n).open = true;
    stack.push(n);
  }
}
~~~

📌 **Interview term: Flood fill** — visit every connected cell matching a rule: zeros open and spread, numbers open and stop. A recursive version stores pending cells on the call stack; measured on an empty board it threw <code>RangeError: Maximum call stack size exceeded</code> at 100 by 100 in Node 22.22.0 and Chromium 141, while this loop opened 1,000,000 cells on 1000 by 1000. Marking cells as open when they are **pushed** guarantees each is handled once and keeps <code>opened</code> exact, so the win check is <code>opened === rows * cols - mines</code>.

<code>touch(j)</code> copies only the cells that change, so the new array shares every untouched cell with the old one.

### Step 3: the cell component

~~~ts
@Component({
  selector: "app-mine-cell",
  standalone: true,
  template: \`
    <button type="button" data-testid="cell" [attr.data-view]="v"
      [class]="'cell' + (cell.open ? ' open' : '') + (n > 0 ? ' n' + n : '') + (exploded ? ' boom' : '')"
      [attr.aria-label]="label" [tabIndex]="active ? 0 : -1"
      (click)="reveal.emit(index)"
      (contextmenu)="$event.preventDefault(); flag.emit(index)"
      (keydown)="nav.emit({ index, event: $event })"
      (focus)="focused.emit(index)">{{ face }}</button>
  \`,
})
export class MineCellComponent {
  @Input({ required: true }) cell!: Cell;
  // index, cols, exploded, active inputs;
  // reveal, flag, nav, focused outputs
  get v() {
    return view(this.cell);
  }
}
~~~

(Excerpt: the real component also declares the remaining inputs, outputs, getters for <code>n</code>, <code>face</code> and <code>label</code>, a <code>focus()</code> method and styles.)

📌 **Interview term: Template statement** — the right side of an event binding can run several statements: <code>$event.preventDefault(); flag.emit(index)</code> suppresses the browser menu and flags in one place.

The getters are cheap because <code>reveal</code> replaces only the changed <code>Cell</code> objects; the parent tracks cells by index in <code>@for</code>. The playground compiles at runtime (JIT), where signal <code>input()</code> and <code>output()</code> do not register, hence <code>@Input</code> and <code>@Output</code>. Arrow keys set <code>active</code> and call <code>focus()</code> on the target cell found through <code>@ViewChildren</code> ([ViewChild vs ViewChildren](/interview-question/what-is-the-difference-between-viewchildren-and-viewchild)).

📌 **Interview term: Signal** — a reactive value; reading <code>game()</code> in the template registers the dependency, and <code>game.update(...)</code> schedules the refresh. See [What are Angular Signals](/interview-question/what-are-angular-signals).

## 4. Verified

Booted with <code>bootstrapApplication(AppComponent)</code> and no providers, AOT with <code>strictTemplates</code> and through the runtime JIT; both modes printed the same lines (this is the JIT run). The driver replays <code>reveal(createGame(1), 40)</code> to know the mines. <code>#</code> hidden, <code>.</code> open zero, digits open numbers, <code>F</code> flag, <code>*</code> revealed mine:

~~~text
RENDERED: MinesweeperMines left: 10🚩 Flag modeNew gameClick any cell to start
start: Mines left: 10 | Click any cell to start | mines placed before first click: 0
first click r5c5: Mines left: 10 | Playing | opened 36
  # # # # # # # # #
  # # # # # # # # #
  # # # # # # # # #
  # # # 1 1 1 1 1 #
  # # # 1 . . . 1 #
  # # 2 1 . . . 2 #
  # # 1 . . . . 1 #
  2 2 1 . . 1 2 4 #
  . . . . . 1 # # #
press f on a hidden cell: Mines left: 9 | Playing | Row 1, column 2: flagged
click the flagged cell (ignored): flag
flag mode on, tap a cell: Mines left: 8 | Playing | aria-pressed true
open every safe cell: Mines left: 0 | You win! 🎉
  1 F 1 . . . . . .
  1 1 1 . 1 1 1 . .
  . . . . 1 F 1 . .
  . 1 1 1 1 1 1 1 1
  . 1 F 1 . . . 1 F
  2 3 2 1 . . . 2 2
  F F 1 . . . . 1 F
  2 2 1 . . 1 2 4 3
  . . . . . 1 F F F
new game, click r1c1 then a mine: Mines left: 10 | Boom! You hit a mine. | exploded: true
  . . . . . . . . .
  . 1 1 1 . . . . .
  1 3 * 2 . . . . .
  * # * 2 . . . . .
  * # 2 1 . . . . .
  * * 1 . . 1 1 1 .
  * # 2 1 . 1 * 2 1
  # # * 1 . 1 1 2 *
  # # # 1 . . . 1 #
click a hidden cell after losing (ignored): hidden
arrow keys: Row 2, column 2: 1 nearby | tabbable: 1
logic: first click at r5c5 opened an area on 1000 of 1000 seeds
~~~

Same boards as React and Vue: 36 cells from the first click, flags block reveals, win auto-flags, loss reveals all mines and freezes the board, one tab stop, and 1,000 of 1,000 seeds opened an area on the first click. Right-click was not dispatched (it calls the same <code>toggleFlag</code> as the F key, which was); layout was not checked.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| First click | Always a zero |
| Flagged cell clicked | Ignored |
| After win or loss | Ignored |
| Huge empty region | Iterative fill |
| Touch | Flag mode with <code>[attr.aria-pressed]</code> |
| Keyboard | One tab stop, arrows, Enter or Space, F |
| Screen reader | Descriptive labels and a <code>role="status"</code> line |

## 6. Common Pitfalls

- **Mutating <code>game().cells[i].open = true</code>.** The signal does not change identity, so nothing refreshes; return a new game.
- **Recursive flood fill.** Measured overflow at 100 by 100.
- **<code>(contextmenu)</code> without <code>preventDefault</code>.** The browser menu opens.
- **A method call per cell in the template that scans the board.** 81 scans per check; keep derivations per cell or in a <code>computed()</code>.
- **<code>[attr.aria-pressed]="flagMode"</code>** with the signal itself instead of <code>flagMode()</code>. It stringifies the function; call the signal.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"9 by 9, 10 mines, a first click that opens an area, right-click, F and a touch flag mode."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Model:</strong> <span style="color:#f0e2c8;">"Typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Cell</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Game</code>; the game in one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">signal</code>, pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reveal</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggleFlag</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Placement:</strong> <span style="color:#f0e2c8;">"First reveal excludes the 3 by 3 around the click; seeded partial Fisher-Yates; then adjacent counts."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Flood fill:</strong> <span style="color:#f0e2c8;">"Explicit stack, mark on push, zeros spread, numbers stop, opened counter for the win."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. UI:</strong> <span style="color:#f0e2c8;">"A cell component with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Input</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Output</code>, contextmenu with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code>, roving tabindex through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChildren</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not recursion for the fill?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each pending cell becomes a call frame; on an empty 100 by 100 board that already exceeded the stack in Node and Chromium. A heap-allocated stack is limited only by memory.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a timer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startedAt</code> signal set on the first reveal and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> that runs a one-second interval while the status is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">playing</code>, cleaned up with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pure tests with a fixed seed; TestBed clicks on the cell buttons, keydown <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code> and assert labels and the status.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you scale to 100 by 100 cells?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Render with a canvas or virtual scrolling, keep cell data in typed arrays, and track which cells a reveal changed so only those redraw.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Deferred placement** | Mines placed on the first reveal |
| **Partial Fisher-Yates** | Shuffle only k slots to pick k distinct items |
| **Flood fill** | Visit all connected cells that match a rule |
| **Mark on push** | Mark visited when queued |
| **Template statement** | Code on the right of an event binding |
| **Signal** | Reactive value that schedules view updates |

---

**Conclusion:** In Angular, Minesweeper is one signal holding an immutable game, a decorator-input cell component that emits reveal, flag and navigation events, and typed pure rules that defer mine placement to the first click and open regions with an explicit stack. The seeded RNG makes the same driver produce the same boards in AOT, JIT, React and Vue.`,
        files: {
          "/src/app/app.component.ts": `import {
  Component,
  QueryList,
  ViewChildren,
  computed,
  signal,
} from "@angular/core";
import { MineCellComponent } from "./components/mine-cell.component";
import { createGame, flagsUsed, reveal, toggleFlag } from "./utils/minesweeper";

const MESSAGE: Record<string, string> = {
  ready: "Click any cell to start",
  playing: "Playing",
  won: "You win! 🎉",
  lost: "Boom! You hit a mine.",
};

@Component({
  selector: "app-root",
  standalone: true,
  imports: [MineCellComponent],
  template: \`
    <main class="mines">
      <h1>Minesweeper</h1>
      <div class="bar">
        <span data-testid="counter">Mines left: {{ minesLeft() }}</span>
        <button
          type="button"
          [attr.aria-pressed]="flagMode()"
          (click)="flagMode.set(!flagMode())"
        >🚩 Flag mode</button>
        <button type="button" (click)="newGame()">New game</button>
      </div>
      <div
        class="board"
        role="group"
        [attr.aria-label]="'Minefield, ' + game().rows + ' by ' + game().cols + ', ' + game().mines + ' mines'"
      >
        @for (cell of game().cells; track i; let i = $index) {
          <app-mine-cell
            [index]="i"
            [cols]="game().cols"
            [cell]="cell"
            [exploded]="i === game().exploded"
            [active]="i === active()"
            (reveal)="onReveal($event)"
            (flag)="onFlag($event)"
            (nav)="onNav($event.index, $event.event)"
            (focused)="active.set($event)"
          />
        }
      </div>
      <p
        class="status"
        role="status"
        data-testid="status"
      >{{ message[game().status] }}</p>
    </main>
  \`,
  styles: [
    \`
    :host { display: block; font-family: system-ui, sans-serif; color: #e8e8ea; }
    .mines { max-width: 360px; margin: 24px auto; padding: 0 16px; }
    .mines h1 { font-size: 1.3rem; margin: 0 0 8px; }
    .bar { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
    button { background: #2a2f3a; color: #e8e8ea; border: 1px solid #3b4252; border-radius: 6px; padding: 6px 10px; cursor: pointer; }
    button[aria-pressed="true"] { background: #5a3d0a; border-color: #f9a825; }
    .board { display: grid; grid-template-columns: repeat(9, 1fr); gap: 2px; }
    .status { min-height: 1.4em; margin-top: 10px; }
  \`,
  ],
})
export class AppComponent {
  readonly message = MESSAGE;
  readonly game = signal(createGame(1));
  readonly flagMode = signal(false);
  readonly active = signal(0);
  readonly minesLeft = computed(
    () => this.game().mines - flagsUsed(this.game()),
  );
  @ViewChildren(MineCellComponent) cellViews!: QueryList<MineCellComponent>;

  onReveal(i: number) {
    this.game.update((g) =>
      this.flagMode() ? toggleFlag(g, i) : reveal(g, i),
    );
  }

  onFlag(i: number) {
    this.game.update((g) => toggleFlag(g, i));
  }

  newGame() {
    this.game.update((g) => createGame(g.seed + 1));
  }

  onNav(i: number, e: KeyboardEvent) {
    if (e.key === "f" || e.key === "F") return this.onFlag(i);
    const { rows, cols } = this.game();
    const r = Math.floor(i / cols),
      c = i % cols;
    const moves: Record<string, [number, number]> = {
      ArrowUp: [r - 1, c],
      ArrowDown: [r + 1, c],
      ArrowLeft: [r, c - 1],
      ArrowRight: [r, c + 1],
    };
    const to = moves[e.key];
    if (!to) return;
    e.preventDefault();
    const j =
      Math.min(rows - 1, Math.max(0, to[0])) * cols +
      Math.min(cols - 1, Math.max(0, to[1]));
    this.active.set(j);
    this.cellViews.get(j)!.focus();
  }
}
`,
          "/src/app/components/mine-cell.component.ts": `import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  inject,
} from "@angular/core";
import { Cell, view } from "../utils/minesweeper";

@Component({
  selector: "app-mine-cell",
  standalone: true,
  template: \`
    <button
      type="button"
      data-testid="cell"
      [attr.data-view]="v"
      [class]="'cell' + (cell.open ? ' open' : '') + (n > 0 ? ' n' + n : '') + (exploded ? ' boom' : '')"
      [attr.aria-label]="label"
      [tabIndex]="active ? 0 : -1"
      (click)="reveal.emit(index)"
      (contextmenu)="$event.preventDefault(); flag.emit(index)"
      (keydown)="nav.emit({ index, event: $event })"
      (focus)="focused.emit(index)"
    >{{ face }}</button>
  \`,
  styles: [
    \`
    :host { display: block; }
    .cell { display: block; width: 100%; aspect-ratio: 1; padding: 0; border-radius: 4px; font-weight: 700; font-size: 1rem;
      color: #e8e8ea; background: #30363d; border: 1px solid #484f58; cursor: pointer; }
    .cell.open { background: #161b22; border-color: #21262d; cursor: default; }
    .cell.boom { background: #8e1519; }
    .cell:focus-visible { outline: 3px solid #f9a825; outline-offset: 1px; }
    .n1 { color: #58a6ff; } .n2 { color: #3fb950; } .n3 { color: #f85149; } .n4 { color: #bc8cff; }
    .n5 { color: #ff7b72; } .n6 { color: #39c5cf; } .n7 { color: #e8e8ea; } .n8 { color: #8b949e; }
  \`,
  ],
})
export class MineCellComponent {
  @Input({ required: true }) index = 0;
  @Input({ required: true }) cols = 9;
  @Input({ required: true }) cell!: Cell;
  @Input() exploded = false;
  @Input() active = false;
  @Output() reveal = new EventEmitter<number>();
  @Output() flag = new EventEmitter<number>();
  @Output() nav = new EventEmitter<{ index: number; event: KeyboardEvent }>();
  @Output() focused = new EventEmitter<number>();
  private host = inject(ElementRef<HTMLElement>);

  get v() {
    return view(this.cell);
  }
  get n() {
    return this.v.startsWith("open-") ? Number(this.v.slice(5)) : -1;
  }
  get face() {
    return this.n > 0
      ? String(this.n)
      : this.v === "flag"
        ? "🚩"
        : this.v === "mine"
          ? "💣"
          : "";
  }
  get label() {
    const where =
      "Row " +
      (Math.floor(this.index / this.cols) + 1) +
      ", column " +
      ((this.index % this.cols) + 1) +
      ": ";
    const what =
      this.v === "hidden"
        ? "hidden"
        : this.v === "flag"
          ? "flagged"
          : this.v === "mine"
            ? "mine"
            : this.n === 0
              ? "empty"
              : this.n + " nearby";
    return where + what;
  }

  focus() {
    (this.host.nativeElement as HTMLElement).querySelector("button")!.focus();
  }
}
`,
          "/src/app/utils/minesweeper.ts": `// Pure Minesweeper logic: no framework, no
// DOM. Every function returns a new game.
// Cells are numbered row * cols + col.

export interface Cell {
  mine: boolean;
  adj: number;
  open: boolean;
  flag: boolean;
}
export type Status = "ready" | "playing" | "won" | "lost";
export interface Game {
  seed: number;
  rows: number;
  cols: number;
  mines: number;
  cells: Cell[];
  placed: boolean;
  status: Status;
  opened: number;
  exploded: number;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function neighbors(i: number, rows: number, cols: number): number[] {
  const r = Math.floor(i / cols),
    c = i % cols,
    out: number[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr,
        nc = c + dc;
      if ((dr || dc) && nr >= 0 && nr < rows && nc >= 0 && nc < cols)
        out.push(nr * cols + nc);
    }
  return out;
}

export function createGame(seed: number, rows = 9, cols = 9, mines = 10): Game {
  const cells: Cell[] = Array.from({ length: rows * cols }, () => ({
    mine: false,
    adj: 0,
    open: false,
    flag: false,
  }));
  return {
    seed,
    rows,
    cols,
    mines,
    cells,
    placed: false,
    status: "ready",
    opened: 0,
    exploded: -1,
  };
}

// Mines are placed on the FIRST reveal, never on that cell or its neighbours,
// so the first click always opens an area. The seeded RNG keeps it repeatable.
function placeMines(g: Game, safe: number): Game {
  const { rows, cols, mines } = g;
  const keepClear = new Set([safe, ...neighbors(safe, rows, cols)]);
  if (rows * cols - keepClear.size < mines) {
    // tiny, crowded board: only the clicked cell is protected
    keepClear.clear();
    keepClear.add(safe);
  }
  const pool: number[] = [];
  for (let i = 0; i < rows * cols; i++) if (!keepClear.has(i)) pool.push(i);
  const rng = mulberry32(g.seed);
  for (let k = 0; k < mines; k++) {
    const j = k + Math.floor(rng() * (pool.length - k)); // partial Fisher-Yates
    [pool[k], pool[j]] = [pool[j], pool[k]];
  }
  const cells = g.cells.map((c) => ({ ...c }));
  for (const i of pool.slice(0, mines)) cells[i].mine = true;
  cells.forEach(
    (c, i) =>
      (c.adj = neighbors(i, rows, cols).filter((n) => cells[n].mine).length),
  );
  return { ...g, cells, placed: true, status: "playing" };
}

export function reveal(game: Game, i: number): Game {
  let g = game;
  if (g.status === "won" || g.status === "lost") return g;
  if (g.cells[i].open || g.cells[i].flag) return g;
  if (!g.placed) g = placeMines(g, i);
  const cells = g.cells.slice();
  // copy only the cells we change
  const touch = (j: number) => (cells[j] = { ...cells[j] });

  if (cells[i].mine) {
    cells.forEach((c, j) => {
      if (c.mine && !c.flag) touch(j).open = true;
    });
    return { ...g, cells, status: "lost", exploded: i };
  }

  // Iterative flood fill with an explicit stack: memory on the heap, not the
  // call stack, so a huge empty board cannot overflow it.
  let opened = g.opened;
  const stack: number[] = [i];
  touch(i).open = true;
  while (stack.length) {
    const j = stack.pop()!;
    opened++;
    if (cells[j].adj !== 0) continue;
    for (const n of neighbors(j, g.rows, g.cols)) {
      if (cells[n].open || cells[n].flag || cells[n].mine) continue;
      touch(n).open = true; // mark on push, so no cell is pushed twice
      stack.push(n);
    }
  }
  const won = opened === g.rows * g.cols - g.mines;
  if (won)
    cells.forEach((c, j) => {
      if (c.mine && !c.flag) touch(j).flag = true;
    });
  return { ...g, cells, opened, status: won ? "won" : g.status };
}

export function toggleFlag(g: Game, i: number): Game {
  if (g.status === "won" || g.status === "lost" || g.cells[i].open) return g;
  const cells = g.cells.slice();
  cells[i] = { ...cells[i], flag: !cells[i].flag };
  return { ...g, cells };
}

export const flagsUsed = (g: Game) => g.cells.filter((c) => c.flag).length;

// What one cell should show: hidden, flag, mine, or open-0 ... open-8.
export function view(c: Cell): string {
  if (c.open) return c.mine ? "mine" : "open-" + c.adj;
  return c.flag ? "flag" : "hidden";
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build Wordle",
    seoDescription: "Build Wordle in React, Vue and Angular: two-pass duplicate-letter scoring verified on tricky cases, physical and on-screen keyboards, word list checks.",
    description: `**Question presented to candidate:**
"Build a Wordle clone. The player has six tries to guess a five-letter word. After each guess, colour every letter: green if it is in the right spot, yellow if it is in the word but somewhere else, grey if it is not in the word. Support the physical keyboard and an on-screen keyboard that shows the best colour found for each letter."

**Requirements:**
- A 6 by 5 grid; letters fill the current row as the player types; Backspace deletes; Enter submits.
- Reject guesses that are too short ("Not enough letters") or not in the word list ("Not in word list") without using up a try.
- Score each guess with correct duplicate-letter rules (for example guess "speed" against the answer "abide" gives one yellow E, not two).
- An on-screen keyboard that types too and shows each letter's best state (green beats yellow beats grey).
- Win and loss messages; the answer is revealed on a loss; New game picks another word.

**What a strong answer should cover:**
- A pure \`score(guess, answer)\` with the **two-pass** algorithm: mark exact matches first, count the remaining answer letters, then hand out yellows left to right while copies remain.
- Tricky test cases: "speed" vs "abide", "geese" vs "those", "lolly" vs "hello".
- One \`applyKey\` entry point shared by the physical and the on-screen keyboard; a \`window\` keydown listener that ignores Ctrl, Meta and Alt combinations.
- Game state as one object (guesses, current text, status, message), with the board rows and keyboard colours derived.
- Injected randomness for picking the answer (a seeded RNG), and accessible output (row labels, a live region for messages).

**Clarifying questions expected:**
- "Where do the answers and the list of allowed guesses come from, and how big are they?"
- "Do you want hard mode, where revealed hints must be reused?"
- "Should the game persist across reloads, or be one word per day?"

**Code / implementation expected:** Yes. A playable game in the framework of your choice, with the scoring function separate and tested on duplicate-letter cases.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round. You know React components and <code>useState</code>; the game rules and the scoring algorithm are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The Verified section is real output from booting the solution on React 19.3.1 in StrictMode and typing guesses into it with a script.

## 1. Why This Even Matters — A Story First

A friend thinks of a five-letter word. You guess "speed". For each letter they hold up a coloured card: green means right letter, right place; yellow means the letter is in the word but elsewhere; grey means it is not there. Six guesses to get it.

Now the friend's word is "abide", which has **one** E. Your "speed" has **two**. Should both Es be yellow? A careful friend says no: there is only one E to find, so one E card is yellow and the other is grey. That small piece of honesty is the part of Wordle most people get wrong, and it is exactly what interviewers check. The rest (a grid, a keyboard, a message line) is straightforward if the rules are kept out of the components.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Where do the answers and allowed guesses come from? | A real game has a few thousand answers and many more allowed guesses; this build uses a small in-file list and checks guesses against it. |
| Exact duplicate-letter rules? | Confirms the two-pass behaviour (one yellow per spare copy). |
| Physical keyboard, on-screen keyboard, or both? | Both should go through one function so they cannot disagree. |
| Hard mode? | Extra validation: revealed greens must stay, yellows must be reused. |
| Persistence or a daily word? | Adds <code>localStorage</code> and a date-based seed. |
| Animations (flip, shake)? | Pure presentation; agree they come after correctness. |

## 3. Requirements and Plan

The plan has a pure core in <code>src/utils/wordle.js</code> and three thin components:

| Piece | Kind | Notes |
| :--- | :--- | :--- |
| <code>game.answer</code>, <code>seed</code> | state | Answer picked from the list with a seeded RNG |
| <code>game.guesses</code> | state | Submitted words with their marks |
| <code>game.current</code> | state | The row being typed |
| <code>game.status</code>, <code>message</code> | state | <code>playing</code>, <code>won</code>, <code>lost</code>; the latest feedback text |
| board rows | derived | <code>boardRows(game)</code>: guesses, the typing row, empty rows |
| keyboard colours | derived | <code>letterStates(guesses)</code>: best state per letter |

📌 **Interview term: Two-pass scoring** — first mark every exact match green and count the answer letters that are **not** matched; then, left to right, mark a letter yellow only while a spare copy of it remains, and grey otherwise.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Scoring speed against abide in two passes: no greens, spare letters a b i d e, then one yellow E and one yellow D">
  <rect class="d-box-muted" x="20" y="24" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="52" text-anchor="middle">guess: s p e e d</text>
  <text class="d-sub" x="120" y="76" text-anchor="middle">answer: a b i d e</text>
  <rect class="d-box" x="260" y="24" width="190" height="70" rx="10"/>
  <text class="d-text" x="355" y="52" text-anchor="middle">pass 1: greens</text>
  <text class="d-sub" x="355" y="76" text-anchor="middle">none at the same index</text>
  <rect class="d-box" x="490" y="24" width="190" height="70" rx="10"/>
  <text class="d-text" x="585" y="52" text-anchor="middle">spare letters</text>
  <text class="d-sub" x="585" y="76" text-anchor="middle">a1 b1 i1 d1 e1</text>
  <rect class="d-box" x="260" y="190" width="420" height="80" rx="10"/>
  <text class="d-text" x="470" y="220" text-anchor="middle">pass 2, left to right</text>
  <text class="d-sub" x="470" y="248" text-anchor="middle">s grey, p grey, e yellow (e1 to e0), e grey, d yellow</text>
  <rect class="d-box-accent" x="20" y="190" width="200" height="80" rx="10"/>
  <text class="d-text d-accent" x="120" y="220" text-anchor="middle">result</text>
  <text class="d-sub" x="120" y="248" text-anchor="middle">grey grey yellow grey yellow</text>
  <path class="d-edge-accent" d="M 222 59 L 254 59"/>
  <path class="d-edge-accent" d="M 452 59 L 484 59"/>
  <path class="d-edge-accent" d="M 585 98 L 585 186"/>
  <path class="d-edge-accent" d="M 258 230 L 224 230"/>
</svg>

The second E finds no spare E left, so it is grey. The whole bug lives in that one count.

## 4. Build It Step by Step

### Step 1: the scoring function

~~~js
export function score(guess, answer) {
  const marks = Array(WORD_LENGTH).fill("absent");
  const spare = {};
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) marks[i] = "correct";
    else spare[answer[i]] = (spare[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (marks[i] === "correct") continue;
    if (spare[guess[i]] > 0) {
      marks[i] = "present";
      spare[guess[i]]--;
    }
  }
  return marks;
}
~~~

📌 **Interview term: Frequency map** — an object counting how many times each letter occurs (<code>spare</code>). Only unmatched answer letters are counted, so a green never "uses up" a yellow somewhere else.

Why two passes and not one? Greens must be decided before yellows, otherwise an early yellow can steal the only copy a later green needs. The naive one-pass version (<code>answer.includes(ch)</code> for anything that is not green) gets all three classic cases wrong. Run side by side:

~~~text
speed vs abide  naive --YYY  two-pass --Y-Y
geese vs those  naive -YYGG  two-pass ---GG
lolly vs hello  naive YYGG-  two-pass -YGG-
~~~

(<code>G</code> green, <code>Y</code> yellow, <code>-</code> grey.) In "geese" against "those", the final E is green, so it consumes the only E and the two earlier Es are grey; naive scoring paints them yellow. In "lolly" against "hello", the two middle Ls are green, so the first L has no spare copy left.

### Step 2: game state as pure transitions

~~~js
export function submit(g) {
  if (g.status !== "playing") return g;
  if (g.current.length < WORD_LENGTH)
    return { ...g, message: "Not enough letters" };
  if (!WORDS.includes(g.current))
    return { ...g, message: "Not in word list" };
  const guesses = [
    ...g.guesses,
    { word: g.current, marks: score(g.current, g.answer) },
  ];
  if (g.current === g.answer) {
    return {
      ...g,
      guesses,
      current: "",
      status: "won",
      message: "Solved in " + guesses.length + "/" + MAX_GUESSES,
    };
  }
  if (guesses.length === MAX_GUESSES) {
    return {
      ...g,
      guesses,
      current: "",
      status: "lost",
      message: "The word was " + g.answer.toUpperCase(),
    };
  }
  return { ...g, guesses, current: "", message: "" };
}
~~~

📌 **Interview term: State transition** — a pure function from the old game to the new game for one user action. <code>typeLetter</code>, <code>backspace</code> and <code>submit</code> are the only three, and an invalid guess returns a game with a message but the same <code>guesses</code>, so it does not cost a try.

📌 **Interview term: Seeded PRNG** — <code>createGame(seed)</code> picks the answer with <code>mulberry32(seed)</code>, so a seed always means the same word. The app starts at seed 7 and New game adds one. A daily game would derive the seed from the date. (This build ships a 49-word list used both as answers and as allowed guesses; a production game would use a curated answer list and a much larger list of allowed guesses.)

### Step 3: one entry point for both keyboards

~~~js
export const isGameKey = (key) =>
  key === "Enter" || key === "Backspace" || /^[a-zA-Z]$/.test(key);
export function applyKey(g, key) {
  if (key === "Enter") return submit(g);
  if (key === "Backspace") return backspace(g);
  if (/^[a-zA-Z]$/.test(key)) return typeLetter(g, key);
  return g;
}
~~~

The on-screen keyboard calls <code>onKey(name)</code> and the window listener calls the same <code>applyKey</code>, so they can never behave differently.

~~~jsx
useEffect(() => {
  const handler = (e) => {
    // leave browser shortcuts alone
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof HTMLButtonElement && e.key === "Enter")
      return; // the button click handles it
    if (isGameKey(e.key)) {
      e.preventDefault();
      setGame((g) => applyKey(g, e.key));
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, []);
~~~

Three details matter. Ctrl+C or Cmd+R must not type letters. When an on-screen key has focus, pressing Enter both fires keydown and "clicks" that button (checked in Chromium 141 with playwright-core: the log read <code>keydown Enter on BUTTON | click</code>), so the listener skips Enter on buttons to avoid typing the letter **and** submitting. And the functional update <code>setGame((g) =&gt; ...)</code> means the listener, registered once with an empty dependency list, never reads a stale game ([stale closures](/interview-question/what-causes-stale-closures-in-react-hooks-and-how-do-you-fix-them-correctly), [effect cleanup](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect)).

### Step 4: derived board and keyboard colours

~~~js
const RANK = { absent: 1, present: 2, correct: 3 };
export function letterStates(guesses) {
  const best = {};
  for (const { word, marks } of guesses)
    [...word].forEach((ch, i) => {
      if (!best[ch] || RANK[marks[i]] > RANK[best[ch]])
        best[ch] = marks[i];
    });
  return best;
}
~~~

📌 **Interview term: Derived state** — the keyboard colours and the 6 by 5 board are computed from <code>guesses</code> and <code>current</code> on every render. After "speed" the E key is yellow; after "abide" it upgrades to green and can never be downgraded, because the rank only goes up.

Each submitted row renders as <code>role="img"</code> with a label such as "Guess 1: speed, s absent, p absent, e present, e absent, d present", and its tiles are <code>aria-hidden</code>, so a screen reader hears one sentence instead of ten fragments. The message line is a <code>role="status"</code> live region.

<div style="background:#0b1f2a;border-left:4px solid #39c5cf;border-radius:6px;padding:14px 18px;margin:18px 0;">
<span style="color:#9be3ff;font-weight:bold;">🔑 Key insight:</span> <span style="color:#d6eef5;">Write and test <code style="background:#0d2a3a;color:#9be3ff;padding:1px 5px;border-radius:3px;">score()</code> <strong style="color:#9be3ff;">before</strong> any UI. It is ten lines, it is the only part with real logic, and the three duplicate-letter cases above are the exact tests an interviewer will throw at it.</span>
</div>

## 5. Verified

Rendered in StrictMode in jsdom. The driver typed with real <code>keydown</code> events on the page and, for the winning guess, clicked the on-screen keys. Rows are shown as letters plus marks (<code>G</code> green, <code>Y</code> yellow, <code>-</code> grey, <code>t</code> typed, <code>.</code> empty):

~~~text
RENDERED: Game #7WORDLENewqwertyuiopasdfghjklEnterzxcvbnm⌫
start: Game #7 | answer for seed 7 is abide
abc + Enter: "Not enough letters" | row 1: abc__ ttt..
type de, then x on a full row: abcde ttttt
qwert + Enter: "Not in word list" | guesses used: 0
speed vs abide: speed --Y-Y | Guess 1: speed, s absent, p absent, e present, e absent, d present
geese vs abide: geese ----G
Ctrl+c is ignored: _____ .....
on-screen keys a b i d e Enter: abide GGGGG | "Solved in 3/6"
key colours: e correct | s absent | d correct | a correct
typing after the win: _____ .....
New: Game #8 | answer dream | rows: _____ .....
six wrong guesses: "The word was DREAM" | last row: cloud ----Y
score(speed, abide): --Y-Y absent absent present absent present
score(geese, those): ---GG absent absent absent correct correct
score(lolly, hello): -YGG- absent present correct correct absent
score(eerie, where): Y-Y-G present absent present absent correct
score(allee, eagle): YY-YG present present absent present correct
score(crane, crane): GGGGG correct correct correct correct correct
~~~

What it shows: a short guess and an unknown word are rejected without using a try; a sixth letter is ignored; "speed" against "abide" gives exactly one yellow E, and the row label reads out each mark; "geese" gives only the final green E; Ctrl+C does not type; the on-screen keys win the game; key colours keep their best state; typing after the win does nothing; a loss reveals the word. The last six lines run <code>score</code> directly on duplicate-letter cases, including "eerie" against "where" and "allee" against "eagle".

A separate check in Chromium 141 (playwright-core, 360 px wide viewport) loaded the React build, typed speed and Enter with the real keyboard and showed one yellow E, one grey E and a yellow D, with matching key colours, and found no horizontal scroll (360 px of document width). Tile flip animations are not part of this build.

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Repeated letters | Two-pass scoring with a spare-letter count |
| Too short, unknown word | Message, no try used |
| Sixth letter | Ignored by <code>typeLetter</code> |
| Ctrl, Meta, Alt combos | Ignored |
| Enter on a focused on-screen key | Handled once, by the click |
| After win or loss | Every action ignored |
| Uppercase input | Lower-cased in <code>typeLetter</code> |
| Screen reader | Row labels with each mark, key labels like "e, present", live message |
| Colour blindness | Marks are also in labels; a high-contrast palette is a common extension |

## 7. Common Pitfalls

- **One-pass scoring with <code>answer.includes</code>.** Wrong on every duplicate case above.
- **Counting all answer letters before marking greens.** A yellow can then steal the copy a green needed.
- **Two keyboard code paths.** Physical and on-screen behaviour drift apart; route both through one function.
- **Not ignoring modifier keys.** Ctrl+R types an R.
- **Letting an invalid guess consume a row.** Validate before appending.
- **Downgrading a key colour.** A later grey must not overwrite an earlier green.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Six tries, five letters, answers and allowed guesses from a list, both keyboards, duplicate letters scored like the real game."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Score first:</strong> <span style="color:#f0e2c8;">"A pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">score(guess, answer)</code>: pass one marks greens and counts unmatched answer letters, pass two hands out yellows while copies remain. I test speed against abide and geese against those."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Model:</strong> <span style="color:#f0e2c8;">"One game object: answer, guesses with marks, current text, status and message. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeLetter</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">backspace</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">submit</code> are pure transitions."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Input:</strong> <span style="color:#f0e2c8;">"A single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">applyKey</code> used by the on-screen buttons and a window keydown listener that ignores modifiers and uses a functional update."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Render:</strong> <span style="color:#f0e2c8;">"Board rows and key colours are derived; submitted rows get a spoken label and the message is a live region."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add hard mode?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">submit</code>, before scoring, check the new guess against previous marks: every green letter must stay in its position and every yellow letter must appear somewhere. Return a message such as "2nd letter must be P" when it fails.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you persist the game?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Save the game object to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code> after each submit and restore it on load, keyed by the puzzle date. Wrap reads in try/catch because storage can be blocked.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The real word lists are large; how do you check a guess quickly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put allowed guesses in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> for constant-time lookup, and load the list lazily (a separate chunk or fetch) so it does not block the first render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you animate the flip?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Give tiles a CSS flip keyframe with a delay per column, and reveal the colour halfway through. Keep the state change instant and let CSS do the animation, honouring <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefers-reduced-motion</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Table-driven tests for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">score</code> with duplicate cases, transition tests for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">submit</code> (too short, unknown word, win, loss), then a component test that types with keydown events and asserts row labels.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Two-pass scoring** | Greens first, then yellows while spare copies remain |
| **Frequency map** | Counts of each unmatched answer letter |
| **State transition** | Pure function from old game to new game for one action |
| **Seeded PRNG** | Repeatable random numbers; same seed, same answer |
| **Derived state** | Board rows and key colours computed from guesses |
| **Live region** | An element whose changes screen readers announce |

---

**Conclusion:** Wordle is a medium question with one hard core: duplicate letters. Score in two passes with a count of unmatched answer letters, prove it on "speed" against "abide", "geese" against "those" and "lolly" against "hello", and keep the rest as pure transitions on one game object. Route both keyboards through a single <code>applyKey</code>, derive the board and the key colours, and the UI is just a view of the state. The same structure, rules first and components second, carries over to [Minesweeper](/interview-question/build-minesweeper) and the [Memory game](/interview-question/build-a-memory-flip-card-game).`,
        files: {
          "/App.js": `import { useEffect, useState } from "react";
import Board from "./src/components/Board";
import Keyboard from "./src/components/Keyboard";
import {
  FIRST_SEED,
  applyKey,
  boardRows,
  createGame,
  isGameKey,
  letterStates,
} from "./src/utils/wordle";

export default function App() {
  const [game, setGame] = useState(() => createGame(FIRST_SEED));
  const onKey = (key) => setGame((g) => applyKey(g, key));

  useEffect(() => {
    const handler = (e) => {
      // leave browser shortcuts alone
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // the button click handles it
      if (e.target instanceof HTMLButtonElement && e.key === "Enter") return;
      if (isGameKey(e.key)) {
        e.preventDefault();
        setGame((g) => applyKey(g, e.key));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <main className="wordle">
      <div className="top">
        <span data-testid="game">Game #{game.seed}</span>
        <h1>WORDLE</h1>
        <button
          type="button"
          onClick={() => setGame((g) => createGame(g.seed + 1))}
        >
          New
        </button>
      </div>
      <Board rows={boardRows(game)} guesses={game.guesses} />
      <p className="message" role="status" data-testid="message">
        {game.message}
      </p>
      <Keyboard states={letterStates(game.guesses)} onKey={onKey} />
    </main>
  );
}
`,
          "/src/components/Board.js": `export default function Board({ rows, guesses }) {
  return (
    <div className="board" data-testid="board">
      {rows.map((row, r) => {
        const done = r < guesses.length;
        const label = done
          ? "Guess " +
            (r + 1) +
            ": " +
            guesses[r].word +
            ", " +
            row.map((t) => t.ch + " " + t.state).join(", ")
          : undefined;
        return (
          <div
            key={r}
            className="row"
            data-testid="row"
            role={done ? "img" : undefined}
            aria-label={label}
          >
            {row.map((t, i) => (
              <div
                key={i}
                className={"tile " + t.state}
                data-state={t.state}
                aria-hidden={done || undefined}
              >
                {t.ch}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
`,
          "/src/components/Keyboard.js": `import { KEY_ROWS } from "../utils/wordle";

export default function Keyboard({ states, onKey }) {
  return (
    <div className="keys" aria-label="Keyboard">
      {KEY_ROWS.map((row) => (
        <div key={row} className="keyrow">
          {[...row].map((k) => {
            const name = k === "+" ? "Enter" : k === "-" ? "Backspace" : k;
            return (
              <button
                key={k}
                type="button"
                className={
                  "key " + (k === "+" || k === "-" ? "wide" : states[k] || "")
                }
                data-key={name}
                aria-label={
                  k === "+" || k === "-"
                    ? name
                    : k + (states[k] ? ", " + states[k] : "")
                }
                onClick={() => onKey(name)}
              >
                {k === "+" ? "Enter" : k === "-" ? "⌫" : k}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
`,
          "/src/utils/wordle.js": `// Pure Wordle logic: no framework, no DOM.

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;
export const FIRST_SEED = 7;

// A small built-in list; a real game ships
// thousands of answers and allowed guesses.
export const WORDS = (
  "abide apple bread brick chair cloud crane dream eagle eerie field flame geese ghost globe grape heart " +
  "hello house juice knife lemon light lolly lucky magic mouse night ocean piano plant queen river robot " +
  "sheep shine slate speed stone sugar table those tiger union voice water where youth zebra"
).split(" ");

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Two passes, so repeated letters are scored like the real game:
// 1) exact matches are "correct" and do NOT count as spare letters;
// 2) left to right, a letter is "present" only while the answer still has a
//    spare copy of it; every other letter is "absent".
export function score(guess, answer) {
  const marks = Array(WORD_LENGTH).fill("absent");
  const spare = {};
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) marks[i] = "correct";
    else spare[answer[i]] = (spare[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (marks[i] === "correct") continue;
    if (spare[guess[i]] > 0) {
      marks[i] = "present";
      spare[guess[i]]--;
    }
  }
  return marks;
}

export function createGame(seed) {
  const answer = WORDS[Math.floor(mulberry32(seed)() * WORDS.length)];
  return {
    seed,
    answer,
    guesses: [],
    current: "",
    status: "playing",
    message: "",
  };
}

export function typeLetter(g, ch) {
  if (g.status !== "playing" || g.current.length >= WORD_LENGTH) return g;
  return { ...g, current: g.current + ch.toLowerCase(), message: "" };
}

export function backspace(g) {
  if (g.status !== "playing" || !g.current) return g;
  return { ...g, current: g.current.slice(0, -1), message: "" };
}

export function submit(g) {
  if (g.status !== "playing") return g;
  if (g.current.length < WORD_LENGTH)
    return { ...g, message: "Not enough letters" };
  if (!WORDS.includes(g.current)) return { ...g, message: "Not in word list" };
  const guesses = [
    ...g.guesses,
    { word: g.current, marks: score(g.current, g.answer) },
  ];
  if (g.current === g.answer) {
    return {
      ...g,
      guesses,
      current: "",
      status: "won",
      message: "Solved in " + guesses.length + "/" + MAX_GUESSES,
    };
  }
  if (guesses.length === MAX_GUESSES) {
    return {
      ...g,
      guesses,
      current: "",
      status: "lost",
      message: "The word was " + g.answer.toUpperCase(),
    };
  }
  return { ...g, guesses, current: "", message: "" };
}

// Best state seen for each letter, for colouring the on-screen keyboard.
const RANK = { absent: 1, present: 2, correct: 3 };
export function letterStates(guesses) {
  const best = {};
  for (const { word, marks } of guesses)
    [...word].forEach((ch, i) => {
      if (!best[ch] || RANK[marks[i]] > RANK[best[ch]]) best[ch] = marks[i];
    });
  return best;
}

// Rows for rendering: submitted guesses, the row being typed, then empty rows.
export function boardRows(g) {
  const rows = g.guesses.map(({ word, marks }) =>
    [...word].map((ch, i) => ({ ch, state: marks[i] })),
  );
  if (rows.length < MAX_GUESSES && g.status === "playing")
    rows.push(
      [...g.current.padEnd(WORD_LENGTH, " ")].map((ch) => ({
        ch: ch.trim(),
        state: ch.trim() ? "typed" : "empty",
      })),
    );
  while (rows.length < MAX_GUESSES)
    rows.push(
      Array.from({ length: WORD_LENGTH }, () => ({ ch: "", state: "empty" })),
    );
  return rows;
}

// One entry point for both the physical and the on-screen keyboard.
export const isGameKey = (key) =>
  key === "Enter" || key === "Backspace" || /^[a-zA-Z]$/.test(key);
export function applyKey(g, key) {
  if (key === "Enter") return submit(g);
  if (key === "Backspace") return backspace(g);
  if (/^[a-zA-Z]$/.test(key)) return typeLetter(g, key);
  return g;
}

// + is Enter, - is Backspace
export const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "+zxcvbnm-"];
`,
          "/styles.css": `:root {
  color-scheme: dark;
}
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f1115;
  color: #e8e8ea;
}
.wordle {
  max-width: 360px;
  margin: 20px auto;
  padding: 0 8px;
  text-align: center;
}
.wordle h1 {
  font-size: 1.3rem;
  margin: 0 0 4px;
  letter-spacing: 2px;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
button {
  font: inherit;
  color: #e8e8ea;
  cursor: pointer;
}
.top button {
  background: #2a2f3a;
  border: 1px solid #3b4252;
  border-radius: 6px;
  padding: 4px 10px;
}
.board {
  display: grid;
  gap: 5px;
  justify-content: center;
  margin-bottom: 10px;
}
.row {
  display: grid;
  grid-template-columns: repeat(5, 52px);
  gap: 5px;
}
.tile {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  font-weight: 700;
  text-transform: uppercase;
  border: 2px solid #3a3a3c;
  box-sizing: border-box;
}
.tile.typed {
  border-color: #6e7681;
}
.tile.correct {
  background: #538d4e;
  border-color: #538d4e;
}
.tile.present {
  background: #b59f3b;
  border-color: #b59f3b;
}
.tile.absent {
  background: #3a3a3c;
  border-color: #3a3a3c;
}
.message {
  min-height: 1.4em;
  margin: 6px 0;
  font-weight: 600;
}
.keys {
  display: grid;
  gap: 6px;
}
.keyrow {
  display: flex;
  gap: 4px;
  justify-content: center;
}
.key {
  flex: 1;
  max-width: 34px;
  height: 48px;
  border: 0;
  border-radius: 4px;
  background: #818384;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0;
}
.key.wide {
  max-width: 56px;
  font-size: 0.7rem;
}
.key.correct {
  background: #538d4e;
}
.key.present {
  background: #b59f3b;
}
.key.absent {
  background: #3a3a3c;
}
.key:focus-visible {
  outline: 3px solid #f9a825;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round in Vue. You know <code>ref</code>, <code>computed</code> and components; the scoring algorithm is explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> tag with the exact vocabulary. The Verified section is real output from mounting the solution with Vue 3.5.44 in jsdom and typing guesses into it with a script.

## 1. Why This Even Matters — A Story First

A friend picks a five-letter word and colours each letter of your guess: green for right letter and place, yellow for in the word elsewhere, grey for absent. Their word is "abide", with one E; you guess "speed", with two. An honest friend gives you one yellow E, not two, because there is only one E to find. Getting that rule right, and keeping it in a function you can test, is what this question is really about.

## 2. Requirements and Plan

A 6 by 5 grid, typing, Backspace, Enter, "Not enough letters" and "Not in word list" without using a try, correct duplicate-letter scoring, an on-screen keyboard showing each letter's best state, win and loss messages, New game.

The rules live in a plain <code>src/utils/wordle.js</code>: <code>score</code>, <code>createGame(seed)</code>, <code>typeLetter</code>, <code>backspace</code>, <code>submit</code>, <code>applyKey</code>, <code>boardRows</code> and <code>letterStates</code>.

| Piece | Vue primitive | Why |
| :--- | :--- | :--- |
| the game | <code>shallowRef</code> | Replaced by pure transitions, never mutated |
| board rows | <code>computed(() =&gt; boardRows(game.value))</code> | Derived |
| key colours | <code>computed(() =&gt; letterStates(game.value.guesses))</code> | Derived, best state per letter |
| keyboard input | <code>window</code> listener in <code>onMounted</code> / <code>onUnmounted</code> | Works without focusing anything |
| components | <code>WordleBoard.vue</code>, <code>WordleKeyboard.vue</code> | Props down, a <code>key</code> event up |

## 3. Build It Step by Step

### Step 1: two-pass scoring

~~~js
export function score(guess, answer) {
  const marks = Array(WORD_LENGTH).fill("absent");
  const spare = {};
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) marks[i] = "correct";
    else spare[answer[i]] = (spare[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (marks[i] === "correct") continue;
    if (spare[guess[i]] > 0) {
      marks[i] = "present";
      spare[guess[i]]--;
    }
  }
  return marks;
}
~~~

📌 **Interview term: Two-pass scoring** — pass one marks exact matches and counts only the **unmatched** answer letters; pass two gives a yellow while a spare copy remains. For "speed" against "abide": no greens, spare letters a, b, i, d, e; the first E takes the only spare E, the second E is grey, D is yellow.

📌 **Interview term: Frequency map** — the <code>spare</code> object of letter counts. The naive version that checks <code>answer.includes(ch)</code> paints both Es yellow, and for "geese" against "those" paints two Es yellow even though the only E is already green at the end.

### Step 2: transitions and one key entry point

<code>submit</code> returns a game with a message (and unchanged guesses) for a short or unknown word, appends a scored guess otherwise, and sets <code>won</code> or <code>lost</code>. <code>applyKey(game, key)</code> maps Enter, Backspace and letters to the three transitions, and both keyboards use it.

📌 **Interview term: Seeded PRNG** — <code>createGame(seed)</code> picks the answer with <code>mulberry32(seed)</code>. The app starts at seed 7 (the word is "abide") and New game adds one, so runs are repeatable.

~~~js
const game = shallowRef(createGame(FIRST_SEED));
const rows = computed(() => boardRows(game.value));
const states = computed(() => letterStates(game.value.guesses));
const onKey = (key) => (game.value = applyKey(game.value, key));

function handler(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target instanceof HTMLButtonElement && e.key === "Enter")
    return;
  if (isGameKey(e.key)) {
    e.preventDefault();
    onKey(e.key);
  }
}
onMounted(() => window.addEventListener("keydown", handler));
onUnmounted(() => window.removeEventListener("keydown", handler));
~~~

📌 **Interview term: shallowRef** — reactive only on <code>.value</code> replacement. Every transition returns a new game, so that is exactly the change to track; see [shallowRef](/interview-question/what-are-shallowref-and-shallowreactive).

The modifier check keeps Ctrl+C and Cmd+R working. The button check avoids a double action: in Chromium, Enter on a focused button fires keydown and then a click, and the click already sends the key. The listener is removed in <code>onUnmounted</code> ([lifecycle hooks](/interview-question/what-are-vue-lifecycle-hooks)).

### Step 3: the board and keyboard components

<code>WordleBoard.vue</code> renders <code>rows</code> with nested <code>v-for</code>; a submitted row gets <code>role="img"</code> and a label such as "Guess 1: speed, s absent, p absent, e present, e absent, d present", with its tiles <code>aria-hidden</code>. <code>WordleKeyboard.vue</code> receives <code>states</code> and emits <code>key</code>:

~~~vue
<button
  v-for="k in row"
  :key="k"
  type="button"
  :class="['key', wide(k) ? 'wide' : states[k] || '']"
  :data-key="nameOf(k)"
  :aria-label="
    wide(k) ? nameOf(k) : k + (states[k] ? ', ' + states[k] : '')
  "
  @click="emit('key', nameOf(k))"
>
  {{ k === "+" ? "Enter" : k === "-" ? "⌫" : k }}
</button>
~~~

📌 **Interview term: Emits** — the child announces what happened (<code>emit('key', 'Enter')</code>) and the parent decides what it means. Declaring them is covered in [why declare emits](/interview-question/why-declare-emits-and-can-you-validate-them).

## 4. Verified

Mounted with <code>createApp(App).mount("#app")</code> in jsdom; guesses typed with real <code>keydown</code> events, the winning guess clicked on the on-screen keys. Rows show letters plus marks (<code>G</code> green, <code>Y</code> yellow, <code>-</code> grey, <code>t</code> typed, <code>.</code> empty):

~~~text
RENDERED: Game #7WORDLENewqwertyuiopasdfghjklEnterzxcvbnm⌫
start: Game #7 | answer for seed 7 is abide
abc + Enter: "Not enough letters" | row 1: abc__ ttt..
type de, then x on a full row: abcde ttttt
qwert + Enter: "Not in word list" | guesses used: 0
speed vs abide: speed --Y-Y | Guess 1: speed, s absent, p absent, e present, e absent, d present
geese vs abide: geese ----G
Ctrl+c is ignored: _____ .....
on-screen keys a b i d e Enter: abide GGGGG | "Solved in 3/6"
key colours: e correct | s absent | d correct | a correct
typing after the win: _____ .....
New: Game #8 | answer dream | rows: _____ .....
six wrong guesses: "The word was DREAM" | last row: cloud ----Y
score(speed, abide): --Y-Y absent absent present absent present
score(geese, those): ---GG absent absent absent correct correct
score(lolly, hello): -YGG- absent present correct correct absent
score(eerie, where): Y-Y-G present absent present absent correct
score(allee, eagle): YY-YG present present absent present correct
score(crane, crane): GGGGG correct correct correct correct correct
~~~

Invalid guesses cost no try, a sixth letter is ignored, "speed" gives one yellow E, "geese" only the final green E, Ctrl+C does not type, the on-screen keys win, key colours keep their best state, and a loss reveals the word. The final lines call <code>score</code> directly on duplicate cases. Identical to the React and Angular output; animations and colours were not checked (no paint in jsdom).

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Repeated letters | Two-pass scoring |
| Invalid guess | Message only, no try used |
| Modifier combos | Ignored |
| Enter on a focused key | Only the click acts |
| After win or loss | Ignored |
| Screen reader | Row labels with marks, key labels with state, <code>role="status"</code> message |

## 6. Common Pitfalls

- **<code>answer.includes(ch)</code> scoring.** Wrong on repeated letters.
- **A deep <code>reactive</code> game edited in place.** The transitions stop being pure; replace the object.
- **Listening on a focused element.** Players expect to type straight away; listen on <code>window</code> and clean up.
- **Separate logic in the keyboard component.** Both keyboards must call the same <code>applyKey</code>.
- **Downgrading key colours.** Rank the states so green is never replaced.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Six tries, five letters, list-based validation, both keyboards, duplicate letters scored like the real game."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Score first:</strong> <span style="color:#f0e2c8;">"Pure two-pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">score</code>, tested on speed against abide and geese against those."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Model:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> game object; rows and key colours are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Input:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">applyKey</code>; a window keydown listener that ignores modifiers and Enter on buttons."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Render:</strong> <span style="color:#f0e2c8;">"Board and keyboard components, row labels for screen readers, a live message."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add hard mode?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Before scoring, require every known green in place and every known yellow somewhere in the new guess; otherwise return a message and keep the row.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you persist progress?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on the game that writes it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code> (inside try/catch) and a restore in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup</code>, keyed by the day.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-model</code> on a hidden input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It would fight the custom rules (five letters, A to Z only) and mobile keyboards would show autocorrect; explicit key handling is simpler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Table tests for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">score</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">submit</code>; Vue Test Utils to dispatch keydown on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code> and assert row labels.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Two-pass scoring** | Greens first, then yellows while copies remain |
| **Frequency map** | Counts of unmatched answer letters |
| **Seeded PRNG** | Repeatable random numbers |
| **shallowRef** | Ref that tracks replacement only |
| **computed** | Cached derived value |
| **Emits** | Events a child component declares and sends up |

---

**Conclusion:** In Vue, Wordle is a <code>shallowRef</code> holding an immutable game, two <code>computed</code> views (board rows and key colours), and one <code>applyKey</code> shared by a window listener and an on-screen keyboard component. The interesting logic is the two-pass <code>score</code>, and the Verified output proves it on the duplicate-letter cases interviewers use.`,
        files: {
          "/src/App.vue": `<script setup>
import { computed, onMounted, onUnmounted, shallowRef } from "vue";
import WordleBoard from "./components/WordleBoard.vue";
import WordleKeyboard from "./components/WordleKeyboard.vue";
import {
  FIRST_SEED,
  applyKey,
  boardRows,
  createGame,
  isGameKey,
  letterStates,
} from "./utils/wordle.js";

// The pure functions return a new game every time, so a shallowRef is enough.
const game = shallowRef(createGame(FIRST_SEED));
const rows = computed(() => boardRows(game.value));
const states = computed(() => letterStates(game.value.guesses));
const onKey = (key) => (game.value = applyKey(game.value, key));

function handler(e) {
  // leave browser shortcuts alone
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  // the button click handles it
  if (e.target instanceof HTMLButtonElement && e.key === "Enter") return;
  if (isGameKey(e.key)) {
    e.preventDefault();
    onKey(e.key);
  }
}
onMounted(() => window.addEventListener("keydown", handler));
onUnmounted(() => window.removeEventListener("keydown", handler));
</script>

<template>
  <main class="wordle">
    <div class="top">
      <span data-testid="game">Game #{{ game.seed }}</span>
      <h1>WORDLE</h1>
      <button
        type="button"
        @click="game = createGame(game.seed + 1)"
      >New</button>
    </div>
    <WordleBoard :rows="rows" :guesses="game.guesses" />
    <p
      class="message"
      role="status"
      data-testid="message"
    >{{ game.message }}</p>
    <WordleKeyboard :states="states" @key="onKey" />
  </main>
</template>

<style>
:root {
  color-scheme: dark;
}
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f1115;
  color: #e8e8ea;
}
.wordle {
  max-width: 360px;
  margin: 20px auto;
  padding: 0 8px;
  text-align: center;
}
.wordle h1 {
  font-size: 1.3rem;
  margin: 0 0 4px;
  letter-spacing: 2px;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
button {
  font: inherit;
  color: #e8e8ea;
  cursor: pointer;
}
.top button {
  background: #2a2f3a;
  border: 1px solid #3b4252;
  border-radius: 6px;
  padding: 4px 10px;
}
.board {
  display: grid;
  gap: 5px;
  justify-content: center;
  margin-bottom: 10px;
}
.row {
  display: grid;
  grid-template-columns: repeat(5, 52px);
  gap: 5px;
}
.tile {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  font-weight: 700;
  text-transform: uppercase;
  border: 2px solid #3a3a3c;
  box-sizing: border-box;
}
.tile.typed {
  border-color: #6e7681;
}
.tile.correct {
  background: #538d4e;
  border-color: #538d4e;
}
.tile.present {
  background: #b59f3b;
  border-color: #b59f3b;
}
.tile.absent {
  background: #3a3a3c;
  border-color: #3a3a3c;
}
.message {
  min-height: 1.4em;
  margin: 6px 0;
  font-weight: 600;
}
.keys {
  display: grid;
  gap: 6px;
}
.keyrow {
  display: flex;
  gap: 4px;
  justify-content: center;
}
.key {
  flex: 1;
  max-width: 34px;
  height: 48px;
  border: 0;
  border-radius: 4px;
  background: #818384;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0;
}
.key.wide {
  max-width: 56px;
  font-size: 0.7rem;
}
.key.correct {
  background: #538d4e;
}
.key.present {
  background: #b59f3b;
}
.key.absent {
  background: #3a3a3c;
}
.key:focus-visible {
  outline: 3px solid #f9a825;
}
</style>
`,
          "/src/components/WordleBoard.vue": `<script setup>
defineProps({
  rows: { type: Array, required: true },
  guesses: { type: Array, required: true },
});
const label = (row, r, guesses) =>
  "Guess " +
  (r + 1) +
  ": " +
  guesses[r].word +
  ", " +
  row.map((t) => t.ch + " " + t.state).join(", ");
</script>

<template>
  <div class="board" data-testid="board">
    <div
      v-for="(row, r) in rows"
      :key="r"
      class="row"
      data-testid="row"
      :role="r < guesses.length ? 'img' : undefined"
      :aria-label="r < guesses.length ? label(row, r, guesses) : undefined"
    >
      <div
        v-for="(t, i) in row"
        :key="i"
        :class="['tile', t.state]"
        :data-state="t.state"
        :aria-hidden="r < guesses.length || undefined"
      >
        {{ t.ch }}
      </div>
    </div>
  </div>
</template>
`,
          "/src/components/WordleKeyboard.vue": `<script setup>
import { KEY_ROWS } from "../utils/wordle.js";

defineProps({ states: { type: Object, required: true } });
const emit = defineEmits(["key"]);
const nameOf = (k) => (k === "+" ? "Enter" : k === "-" ? "Backspace" : k);
const wide = (k) => k === "+" || k === "-";
</script>

<template>
  <div class="keys" aria-label="Keyboard">
    <div v-for="row in KEY_ROWS" :key="row" class="keyrow">
      <button
        v-for="k in row"
        :key="k"
        type="button"
        :class="['key', wide(k) ? 'wide' : states[k] || '']"
        :data-key="nameOf(k)"
        :aria-label="
          wide(k) ? nameOf(k) : k + (states[k] ? ', ' + states[k] : '')
        "
        @click="emit('key', nameOf(k))"
      >
        {{ k === "+" ? "Enter" : k === "-" ? "⌫" : k }}
      </button>
    </div>
  </div>
</template>
`,
          "/src/utils/wordle.js": `// Pure Wordle logic: no framework, no DOM.

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;
export const FIRST_SEED = 7;

// A small built-in list; a real game ships
// thousands of answers and allowed guesses.
export const WORDS = (
  "abide apple bread brick chair cloud crane dream eagle eerie field flame geese ghost globe grape heart " +
  "hello house juice knife lemon light lolly lucky magic mouse night ocean piano plant queen river robot " +
  "sheep shine slate speed stone sugar table those tiger union voice water where youth zebra"
).split(" ");

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Two passes, so repeated letters are scored like the real game:
// 1) exact matches are "correct" and do NOT count as spare letters;
// 2) left to right, a letter is "present" only while the answer still has a
//    spare copy of it; every other letter is "absent".
export function score(guess, answer) {
  const marks = Array(WORD_LENGTH).fill("absent");
  const spare = {};
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) marks[i] = "correct";
    else spare[answer[i]] = (spare[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (marks[i] === "correct") continue;
    if (spare[guess[i]] > 0) {
      marks[i] = "present";
      spare[guess[i]]--;
    }
  }
  return marks;
}

export function createGame(seed) {
  const answer = WORDS[Math.floor(mulberry32(seed)() * WORDS.length)];
  return {
    seed,
    answer,
    guesses: [],
    current: "",
    status: "playing",
    message: "",
  };
}

export function typeLetter(g, ch) {
  if (g.status !== "playing" || g.current.length >= WORD_LENGTH) return g;
  return { ...g, current: g.current + ch.toLowerCase(), message: "" };
}

export function backspace(g) {
  if (g.status !== "playing" || !g.current) return g;
  return { ...g, current: g.current.slice(0, -1), message: "" };
}

export function submit(g) {
  if (g.status !== "playing") return g;
  if (g.current.length < WORD_LENGTH)
    return { ...g, message: "Not enough letters" };
  if (!WORDS.includes(g.current)) return { ...g, message: "Not in word list" };
  const guesses = [
    ...g.guesses,
    { word: g.current, marks: score(g.current, g.answer) },
  ];
  if (g.current === g.answer) {
    return {
      ...g,
      guesses,
      current: "",
      status: "won",
      message: "Solved in " + guesses.length + "/" + MAX_GUESSES,
    };
  }
  if (guesses.length === MAX_GUESSES) {
    return {
      ...g,
      guesses,
      current: "",
      status: "lost",
      message: "The word was " + g.answer.toUpperCase(),
    };
  }
  return { ...g, guesses, current: "", message: "" };
}

// Best state seen for each letter, for colouring the on-screen keyboard.
const RANK = { absent: 1, present: 2, correct: 3 };
export function letterStates(guesses) {
  const best = {};
  for (const { word, marks } of guesses)
    [...word].forEach((ch, i) => {
      if (!best[ch] || RANK[marks[i]] > RANK[best[ch]]) best[ch] = marks[i];
    });
  return best;
}

// Rows for rendering: submitted guesses, the row being typed, then empty rows.
export function boardRows(g) {
  const rows = g.guesses.map(({ word, marks }) =>
    [...word].map((ch, i) => ({ ch, state: marks[i] })),
  );
  if (rows.length < MAX_GUESSES && g.status === "playing")
    rows.push(
      [...g.current.padEnd(WORD_LENGTH, " ")].map((ch) => ({
        ch: ch.trim(),
        state: ch.trim() ? "typed" : "empty",
      })),
    );
  while (rows.length < MAX_GUESSES)
    rows.push(
      Array.from({ length: WORD_LENGTH }, () => ({ ch: "", state: "empty" })),
    );
  return rows;
}

// One entry point for both the physical and the on-screen keyboard.
export const isGameKey = (key) =>
  key === "Enter" || key === "Backspace" || /^[a-zA-Z]$/.test(key);
export function applyKey(g, key) {
  if (key === "Enter") return submit(g);
  if (key === "Backspace") return backspace(g);
  if (/^[a-zA-Z]$/.test(key)) return typeLetter(g, key);
  return g;
}

// + is Enter, - is Backspace
export const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "+zxcvbnm-"];
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend developers preparing for a machine coding round in Angular. You know components and templates; signals and the scoring algorithm are explained as we go.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> tag with the exact vocabulary. The Verified section is real output from booting the solution on Angular 22.2.3 twice (AOT with strict templates, and the runtime JIT the playground uses) and typing guesses into it with a script.

## 1. Why This Even Matters — A Story First

Guess a five-letter word; each letter comes back green (right place), yellow (elsewhere in the word) or grey (absent). The secret is "abide" with one E and you guessed "speed" with two: only one E may be yellow, because there is only one E to find. The whole question turns on scoring repeated letters honestly and keeping that logic in a function you can test.

## 2. Requirements and Plan

A 6 by 5 grid, typing, Backspace, Enter, rejected guesses that cost no try, duplicate-letter scoring, an on-screen keyboard with best states, win and loss messages, New game.

The rules are typed, framework-free TypeScript in <code>wordle.ts</code>: <code>Mark</code>, <code>Guess</code>, <code>Game</code> and <code>Tile</code> types plus pure <code>score</code>, <code>createGame</code>, <code>submit</code>, <code>applyKey</code>, <code>boardRows</code> and <code>letterStates</code>.

| Piece | Angular primitive | Why |
| :--- | :--- | :--- |
| the game | <code>signal(createGame(FIRST_SEED))</code> | Replaced through <code>update()</code> |
| board rows | <code>computed()</code> | Derived from the game |
| key colours | <code>computed()</code> | Best state per letter |
| physical keyboard | <code>@HostListener("window:keydown")</code> | No focus needed, removed on destroy |
| components | <code>WordleBoardComponent</code>, <code>WordleKeyboardComponent</code> | <code>@Input</code> data down, <code>@Output</code> key up |

## 3. Build It Step by Step

### Step 1: typed two-pass scoring

~~~ts
export function score(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array(WORD_LENGTH).fill("absent");
  const spare: Record<string, number> = {};
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) marks[i] = "correct";
    else spare[answer[i]] = (spare[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (marks[i] === "correct") continue;
    if (spare[guess[i]] > 0) {
      marks[i] = "present";
      spare[guess[i]]--;
    }
  }
  return marks;
}
~~~

📌 **Interview term: Two-pass scoring** — pass one marks greens and counts only unmatched answer letters; pass two hands out yellows while spare copies remain. "speed" against "abide" gives grey, grey, yellow, grey, yellow; "geese" against "those" gives three greys and two greens, because the final E is green and uses up the only E.

📌 **Interview term: Union type** — <code>type Mark = "correct" | "present" | "absent"</code>. With <code>strictTemplates</code>, a typo like <code>"presnt"</code> is a compile error instead of a silent grey tile.

### Step 2: signals and one key entry point

~~~ts
export class AppComponent {
  readonly game = signal(createGame(FIRST_SEED));
  readonly rows = computed(() => boardRows(this.game()));
  readonly states = computed(() => letterStates(this.game().guesses));

  onKey(key: string) {
    this.game.update((g) => applyKey(g, key));
  }

  @HostListener("window:keydown", ["$event"])
  onWindowKey(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof HTMLButtonElement && e.key === "Enter")
      return;
    if (isGameKey(e.key)) {
      e.preventDefault();
      this.onKey(e.key);
    }
  }
}
~~~

📌 **Interview term: computed()** — a memoised signal derived from others; <code>rows()</code> and <code>states()</code> recompute only when the game changes. See [computed signals vs method calls](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls).

📌 **Interview term: @HostListener** — binds a method to a host or global event and unbinds it on destroy ([@HostListener and @HostBinding](/interview-question/what-do-hostlistener-and-hostbinding-do)). The modifier check keeps browser shortcuts working; the button check stops Enter on a focused on-screen key from acting twice (in Chromium the keydown arrives, then the click, which already sends the key).

📌 **Interview term: Seeded PRNG** — <code>createGame(seed)</code> picks the answer with <code>mulberry32(seed)</code>; seed 7 is "abide" and New game adds one.

### Step 3: board and keyboard components

The board renders nested <code>@for</code> blocks over <code>rows</code>; each submitted row binds <code>[attr.role]</code> to <code>'img'</code> and an <code>[attr.aria-label]</code> such as "Guess 1: speed, s absent, p absent, e present, e absent, d present", with <code>null</code> on unsubmitted rows so the attributes are removed. The keyboard receives <code>states</code> through <code>@Input</code> and emits through <code>@Output() key = new EventEmitter&lt;string&gt;()</code>; the playground compiles at runtime (JIT), where signal <code>input()</code> and <code>output()</code> do not register. Control flow is covered in [@for and track](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux).

## 4. Verified

Booted with <code>bootstrapApplication(AppComponent)</code> and no providers, AOT with <code>strictTemplates</code> and through the runtime JIT; both modes printed the same lines (this is the JIT run). Guesses typed with real <code>keydown</code> events, the winning guess clicked on the on-screen keys. Rows show letters plus marks (<code>G</code> green, <code>Y</code> yellow, <code>-</code> grey, <code>t</code> typed, <code>.</code> empty):

~~~text
RENDERED: Game #7WORDLENewqwertyuiopasdfghjklEnterzxcvbnm⌫
start: Game #7 | answer for seed 7 is abide
abc + Enter: "Not enough letters" | row 1: abc__ ttt..
type de, then x on a full row: abcde ttttt
qwert + Enter: "Not in word list" | guesses used: 0
speed vs abide: speed --Y-Y | Guess 1: speed, s absent, p absent, e present, e absent, d present
geese vs abide: geese ----G
Ctrl+c is ignored: _____ .....
on-screen keys a b i d e Enter: abide GGGGG | "Solved in 3/6"
key colours: e correct | s absent | d correct | a correct
typing after the win: _____ .....
New: Game #8 | answer dream | rows: _____ .....
six wrong guesses: "The word was DREAM" | last row: cloud ----Y
score(speed, abide): --Y-Y absent absent present absent present
score(geese, those): ---GG absent absent absent correct correct
score(lolly, hello): -YGG- absent present correct correct absent
score(eerie, where): Y-Y-G present absent present absent correct
score(allee, eagle): YY-YG present present absent present correct
score(crane, crane): GGGGG correct correct correct correct correct
~~~

Invalid guesses cost no try, the sixth letter is ignored, the duplicate cases score correctly, Ctrl+C does not type, the on-screen keys win, key colours keep their best state and a loss reveals the word. Identical to the React and Vue output; animations and colours were not checked.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Repeated letters | Two-pass scoring |
| Invalid guess | Message only, no try used |
| Modifier combos | Ignored |
| Enter on a focused key | Only the click acts |
| After win or loss | Ignored |
| Screen reader | Row labels, key labels with state, <code>role="status"</code> message |

## 6. Common Pitfalls

- **<code>answer.includes(ch)</code> scoring.** Wrong on repeated letters.
- **Calling <code>score()</code> from the template for every tile.** Recomputes on each check; store marks with the guess at submit time, as here.
- **Mutating <code>game().guesses.push(...)</code>.** Same reference, no update; return a new game.
- **A manual window listener without removal.** Prefer <code>@HostListener</code>.
- **Binding <code>[attr.aria-label]</code> to an empty string for unsubmitted rows.** Bind <code>null</code> to remove the attribute.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Six tries, five letters, list-based validation, both keyboards, duplicate letters scored like the real game."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Score first:</strong> <span style="color:#f0e2c8;">"Typed two-pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">score</code> with a spare-letter count, tested on speed against abide and geese against those."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Model:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">signal</code> holding the game; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rows</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">states</code> are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Input:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">applyKey</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@HostListener</code> on window ignores modifiers and Enter on buttons."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Render:</strong> <span style="color:#f0e2c8;">"Board and keyboard components with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Input</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Output</code>, row labels and a live message."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add hard mode?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Validate the guess in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">submit</code> against earlier greens (same position) and yellows (must appear), returning a message instead of a new row when it fails.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you load a big word list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fetch it once into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> for constant-time checks, ideally lazily with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@defer</code> or a separate chunk, and disable Enter until it has loaded.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">score</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">submit</code> with tables of cases. With TestBed, dispatch keydown on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code>, and assert row labels and the message.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">OnPush</code> help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Signals already limit change detection; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OnPush</code> on the board and keyboard documents that they depend only on their inputs.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Two-pass scoring** | Greens first, then yellows while copies remain |
| **Union type** | A type limited to a fixed set of values |
| **computed()** | Memoised derived signal |
| **@HostListener** | Decorator that binds a method to a host or global event |
| **Seeded PRNG** | Repeatable random numbers |

---

**Conclusion:** In Angular, Wordle is one signal holding an immutable game, two computed signals for the board and the key colours, a <code>@HostListener</code> on <code>window</code> and an on-screen keyboard that both call the same <code>applyKey</code>. The typed two-pass <code>score</code> is the real logic, and the Verified output proves it on the duplicate-letter cases in AOT and JIT alike.`,
        files: {
          "/src/app/app.component.ts": `import { Component, HostListener, computed, signal } from "@angular/core";
import { WordleBoardComponent } from "./components/wordle-board.component";
import { WordleKeyboardComponent } from "./components/wordle-keyboard.component";
import {
  FIRST_SEED,
  applyKey,
  boardRows,
  createGame,
  isGameKey,
  letterStates,
} from "./utils/wordle";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [WordleBoardComponent, WordleKeyboardComponent],
  template: \`
    <main class="wordle">
      <div class="top">
        <span data-testid="game">Game #{{ game().seed }}</span>
        <h1>WORDLE</h1>
        <button type="button" (click)="newGame()">New</button>
      </div>
      <app-wordle-board [rows]="rows()" [guesses]="game().guesses" />
      <p
        class="message"
        role="status"
        data-testid="message"
      >{{ game().message }}</p>
      <app-wordle-keyboard [states]="states()" (key)="onKey($event)" />
    </main>
  \`,
  styles: [
    \`
    :host { display: block; font-family: system-ui, sans-serif; color: #e8e8ea; }
    .wordle { max-width: 360px; margin: 20px auto; padding: 0 8px; text-align: center; }
    .wordle h1 { font-size: 1.3rem; margin: 0 0 4px; letter-spacing: 2px; }
    .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .top button { font: inherit; color: #e8e8ea; background: #2a2f3a; border: 1px solid #3b4252; border-radius: 6px; padding: 4px 10px; cursor: pointer; }
    .message { min-height: 1.4em; margin: 6px 0; font-weight: 600; }
  \`,
  ],
})
export class AppComponent {
  readonly game = signal(createGame(FIRST_SEED));
  readonly rows = computed(() => boardRows(this.game()));
  readonly states = computed(() => letterStates(this.game().guesses));

  onKey(key: string) {
    this.game.update((g) => applyKey(g, key));
  }

  newGame() {
    this.game.update((g) => createGame(g.seed + 1));
  }

  @HostListener("window:keydown", ["$event"])
  onWindowKey(e: KeyboardEvent) {
    // leave browser shortcuts alone
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // the button click handles it
    if (e.target instanceof HTMLButtonElement && e.key === "Enter") return;
    if (isGameKey(e.key)) {
      e.preventDefault();
      this.onKey(e.key);
    }
  }
}
`,
          "/src/app/components/wordle-board.component.ts": `import { Component, Input } from "@angular/core";
import { Guess, Tile } from "../utils/wordle";

@Component({
  selector: "app-wordle-board",
  standalone: true,
  template: \`
    <div class="board" data-testid="board">
      @for (row of rows; track r; let r = $index) {
        <div class="row" data-testid="row"
             [attr.role]="r < guesses.length ? 'img' : null"
             [attr.aria-label]="r < guesses.length ? label(row, r) : null">
          @for (t of row; track i; let i = $index) {
            <div
              [class]="'tile ' + t.state"
              [attr.data-state]="t.state"
              [attr.aria-hidden]="r < guesses.length || null"
            >{{ t.ch }}</div>
          }
        </div>
      }
    </div>
  \`,
  styles: [
    \`
    .board { display: grid; gap: 5px; justify-content: center; margin-bottom: 10px; }
    .row { display: grid; grid-template-columns: repeat(5, 52px); gap: 5px; }
    .tile { height: 52px; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; font-weight: 700;
      text-transform: uppercase; border: 2px solid #3a3a3c; box-sizing: border-box; }
    .tile.typed { border-color: #6e7681; }
    .tile.correct { background: #538d4e; border-color: #538d4e; }
    .tile.present { background: #b59f3b; border-color: #b59f3b; }
    .tile.absent { background: #3a3a3c; border-color: #3a3a3c; }
  \`,
  ],
})
export class WordleBoardComponent {
  @Input({ required: true }) rows: Tile[][] = [];
  @Input({ required: true }) guesses: Guess[] = [];

  label(row: Tile[], r: number) {
    return (
      "Guess " +
      (r + 1) +
      ": " +
      this.guesses[r].word +
      ", " +
      row.map((t) => t.ch + " " + t.state).join(", ")
    );
  }
}
`,
          "/src/app/components/wordle-keyboard.component.ts": `import { Component, EventEmitter, Input, Output } from "@angular/core";
import { KEY_ROWS } from "../utils/wordle";

@Component({
  selector: "app-wordle-keyboard",
  standalone: true,
  template: \`
    <div class="keys" aria-label="Keyboard">
      @for (row of keyRows; track row) {
        <div class="keyrow">
          @for (k of row; track k) {
            <button type="button"
              [class]="'key ' + (wide(k) ? 'wide' : states[k] || '')"
              [attr.data-key]="nameOf(k)"
              [attr.aria-label]="wide(k) ? nameOf(k) : k + (states[k] ? ', ' + states[k] : '')"
              (click)="key.emit(nameOf(k))">{{ k === "+" ? "Enter" : k === "-" ? "⌫" : k }}</button>
          }
        </div>
      }
    </div>
  \`,
  styles: [
    \`
    .keys { display: grid; gap: 6px; }
    .keyrow { display: flex; gap: 4px; justify-content: center; }
    .key { flex: 1; max-width: 34px; height: 48px; border: 0; border-radius: 4px; background: #818384; font: inherit; font-weight: 700;
      color: #e8e8ea; text-transform: uppercase; padding: 0; cursor: pointer; }
    .key.wide { max-width: 56px; font-size: 0.7rem; }
    .key.correct { background: #538d4e; } .key.present { background: #b59f3b; } .key.absent { background: #3a3a3c; }
    .key:focus-visible { outline: 3px solid #f9a825; }
  \`,
  ],
})
export class WordleKeyboardComponent {
  @Input({ required: true }) states: Record<string, string> = {};
  @Output() key = new EventEmitter<string>();
  readonly keyRows = KEY_ROWS.map((r) => [...r]);
  nameOf = (k: string) => (k === "+" ? "Enter" : k === "-" ? "Backspace" : k);
  wide = (k: string) => k === "+" || k === "-";
}
`,
          "/src/app/utils/wordle.ts": `// Pure Wordle logic: no framework, no DOM.

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;
export const FIRST_SEED = 7;

export type Mark = "correct" | "present" | "absent";
export interface Guess {
  word: string;
  marks: Mark[];
}
export interface Game {
  seed: number;
  answer: string;
  guesses: Guess[];
  current: string;
  status: "playing" | "won" | "lost";
  message: string;
}
export interface Tile {
  ch: string;
  state: string;
}

// A small built-in list; a real game ships
// thousands of answers and allowed guesses.
export const WORDS: string[] = (
  "abide apple bread brick chair cloud crane dream eagle eerie field flame geese ghost globe grape heart " +
  "hello house juice knife lemon light lolly lucky magic mouse night ocean piano plant queen river robot " +
  "sheep shine slate speed stone sugar table those tiger union voice water where youth zebra"
).split(" ");

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Two passes, so repeated letters are scored like the real game:
// 1) exact matches are "correct" and do NOT count as spare letters;
// 2) left to right, a letter is "present" only while the answer still has a
//    spare copy of it; every other letter is "absent".
export function score(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array(WORD_LENGTH).fill("absent");
  const spare: Record<string, number> = {};
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) marks[i] = "correct";
    else spare[answer[i]] = (spare[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (marks[i] === "correct") continue;
    if (spare[guess[i]] > 0) {
      marks[i] = "present";
      spare[guess[i]]--;
    }
  }
  return marks;
}

export function createGame(seed: number): Game {
  const answer = WORDS[Math.floor(mulberry32(seed)() * WORDS.length)];
  return {
    seed,
    answer,
    guesses: [],
    current: "",
    status: "playing",
    message: "",
  };
}

export function typeLetter(g: Game, ch: string): Game {
  if (g.status !== "playing" || g.current.length >= WORD_LENGTH) return g;
  return { ...g, current: g.current + ch.toLowerCase(), message: "" };
}

export function backspace(g: Game): Game {
  if (g.status !== "playing" || !g.current) return g;
  return { ...g, current: g.current.slice(0, -1), message: "" };
}

export function submit(g: Game): Game {
  if (g.status !== "playing") return g;
  if (g.current.length < WORD_LENGTH)
    return { ...g, message: "Not enough letters" };
  if (!WORDS.includes(g.current)) return { ...g, message: "Not in word list" };
  const guesses: Guess[] = [
    ...g.guesses,
    { word: g.current, marks: score(g.current, g.answer) },
  ];
  if (g.current === g.answer) {
    return {
      ...g,
      guesses,
      current: "",
      status: "won",
      message: "Solved in " + guesses.length + "/" + MAX_GUESSES,
    };
  }
  if (guesses.length === MAX_GUESSES) {
    return {
      ...g,
      guesses,
      current: "",
      status: "lost",
      message: "The word was " + g.answer.toUpperCase(),
    };
  }
  return { ...g, guesses, current: "", message: "" };
}

// Best state seen for each letter, for colouring the on-screen keyboard.
const RANK: Record<Mark, number> = { absent: 1, present: 2, correct: 3 };
export function letterStates(guesses: Guess[]): Record<string, Mark> {
  const best: Record<string, Mark> = {};
  for (const { word, marks } of guesses)
    [...word].forEach((ch, i) => {
      if (!best[ch] || RANK[marks[i]] > RANK[best[ch]]) best[ch] = marks[i];
    });
  return best;
}

// Rows for rendering: submitted guesses, the row being typed, then empty rows.
export function boardRows(g: Game): Tile[][] {
  const rows: Tile[][] = g.guesses.map(({ word, marks }) =>
    [...word].map((ch, i) => ({ ch, state: marks[i] })),
  );
  if (rows.length < MAX_GUESSES && g.status === "playing")
    rows.push(
      [...g.current.padEnd(WORD_LENGTH, " ")].map((ch) => ({
        ch: ch.trim(),
        state: ch.trim() ? "typed" : "empty",
      })),
    );
  while (rows.length < MAX_GUESSES)
    rows.push(
      Array.from({ length: WORD_LENGTH }, () => ({ ch: "", state: "empty" })),
    );
  return rows;
}

// One entry point for both the physical and the on-screen keyboard.
export const isGameKey = (key: string) =>
  key === "Enter" || key === "Backspace" || /^[a-zA-Z]$/.test(key);
export function applyKey(g: Game, key: string): Game {
  if (key === "Enter") return submit(g);
  if (key === "Backspace") return backspace(g);
  if (/^[a-zA-Z]$/.test(key)) return typeLetter(g, key);
  return g;
}

// + is Enter, - is Backspace
export const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "+zxcvbnm-"];
`,
        },
      },
    },
  },
];

export default augments;
