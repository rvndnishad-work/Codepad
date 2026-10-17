/**
 * Machine coding ULTRA — batch 15: grid games I (Tic-Tac-Toe, Tic-Tac-Toe II
 * with an N x N board and M in a row, Connect Four, Grid Lights, Whack-a-Mole,
 * and an Undoable Counter with undo/redo history).
 *
 * Every question carries a plain-markdown Question Body (CLAUDE.md §6) shared
 * by all three frameworks, and one bundle per framework (React, Vue, Angular):
 * a tutorial answer written for that framework (story, plan and state model,
 * step-by-step build, a Verified section, edge cases and accessibility,
 * pitfalls, the §7 interview card, a glossary and a conclusion) plus a
 * runnable multi-file solution for the site playground.
 *
 * The game rules live in plain functions (game.js / connect4.js / lights.js /
 * mole.js / history.js, or the .ts twins for Angular) with no framework code.
 * Those functions were exercised directly with node using deterministic game
 * sequences (and a seeded random source for Whack-a-Mole), and every solution
 * was booted with scripts/verify-mc-solution.mjs on React 19.3.1, Vue 3.5.44
 * and Angular 22.2.3 (AOT with strict templates and runtime JIT) in jsdom, then
 * driven with real click and key events. The Verified sections quote that
 * output. Timing claims (Grid Lights, Whack-a-Mole) were measured with real
 * timers and are quoted rounded, as the answers say.
 *
 * This file is generated: the solution files, drivers, logic tests and answer
 * sources live in the batch scratch directory (mc/b15) and gen.mjs there
 * writes this file from the exact files that were run.
 */
import type { MachineCodingAugment } from "./machine-coding-augments.types";

const augments: MachineCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build Tic-Tac-Toe",
    seoDescription: "Build Tic-Tac-Toe in React, Vue and Angular: a 3x3 board, alternating turns, win and draw detection with a highlighted line, restart, all verified.",
    description: `**Question presented to candidate:**
"Build a playable Tic-Tac-Toe game for two people sharing one screen. Show a 3 by 3 board, let X and O take turns, announce the winner or a draw, highlight the winning line, and give me a way to start again. Keep the game rules testable on their own."

**Requirements:**
- A 3 x 3 board of clickable cells; X always moves first, then the players alternate.
- A filled cell cannot be played again, and no moves are accepted once the game is over.
- Detect a win (three in a row, column or diagonal) and highlight the winning cells; detect a draw when the board is full.
- A status line: whose turn it is, who won, or that it is a draw.
- A Restart button that clears the board.

**What a strong answer should cover:**
- A minimal state model: the nine cells are the only state; whose turn it is, the winner and the draw are derived from them.
- The win check as a list of the 8 winning lines, written as a pure function outside the component.
- Immutable updates: a move returns a new board array instead of changing the old one.
- Guarding illegal moves in the logic, not only by disabling buttons.
- Accessibility: real buttons, a label per cell that includes its contents, and a status region that screen readers announce.
- How it would extend: move history and time travel, bigger boards, a computer opponent.

**Clarifying questions expected:**
- "Is it two humans on one device, or should one side be a computer player?"
- "Do you want move history or undo, or just restart?"
- "Should the board size be fixed at 3 x 3?"

**Code / implementation expected:** Yes. A working component in the chosen framework, with the win check as a separate pure function, in about 30-40 minutes.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. Assumes basic HTML, CSS and JavaScript and a first look at React components; no game-programming background needed.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. All code excerpts are copied from the runnable solution on this page, and the Verified section quotes what that solution printed when a test driver clicked through real games on React 19.3.1.

## 1. Why This Even Matters — A Story First

Picture two kids playing Tic-Tac-Toe on a napkin. Nobody writes down "it is O's turn now" or "nobody has won yet". They just look at the napkin. If there are as many Xs as Os, X goes next. If three marks line up, the game is over. Everything you need to know is already *on the paper*.

That is the whole lesson of this question. A weak solution keeps a pile of separate variables (the board, whose turn it is, the winner, a "game over" flag) and then spends its energy keeping them in sync. A strong solution keeps one thing, the nine cells, and *reads* everything else off it, exactly like the kids reading the napkin.

Interviewers love this question because it is small enough to finish in 30 minutes but shows how you model state, where you put logic, whether you update data immutably, and whether you think about the person using a keyboard or a screen reader.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Two humans on one screen, or a computer opponent? | A computer player needs a move-picking function (random, or minimax); it changes the scope a lot. |
| Is the board always 3 x 3? | A configurable N x N board needs a different win check. That version is its own question: [Tic-Tac-Toe II](/interview-question/build-tic-tac-toe-ii-n-x-n-board-m-in-a-row). |
| Do you want move history or undo? | History changes the state model from "one board" to "a list of moves". Ask before you build. |
| Should the winning line be highlighted? | You then need the win check to return *which* cells won, not just a yes or no. |
| Any accessibility or keyboard expectations? | Tells you whether to spend time on labels, live regions and focus styles. |
| Can I write the rules as plain functions and test them? | Signals that you separate logic from UI, which interviewers want to see. |

For this build we assume: two humans, a fixed 3 x 3 board, a highlighted winning line, a restart button, no history.

## 3. Requirements and the Plan

**Requirements:** a 3 x 3 grid, X first then alternating, filled cells and finished games refuse moves, win and draw detection, the winning cells highlighted, a status line, and Restart.

**Component tree:** <code>App</code> owns the state and the status line; <code>Board</code> draws nine buttons and reports clicks. The rules live in <code>src/game.js</code>, a file with no React in it at all.

📌 **Interview term: Derived state** — a value you can compute from other state, so you do not store it. Here the current player, the winner, the draw and "game over" are all derived from the board. Storing them separately invites bugs where they disagree.

📌 **Interview term: Single source of truth** — one place holds a piece of data and everything else reads from it. The board array is ours.

| Value | Kind | Where it lives |
| :--- | :--- | :--- |
| <code>board</code> (9 cells: <code>"X"</code>, <code>"O"</code> or <code>null</code>) | State | <code>useState</code> in <code>App</code> |
| Next player | Derived | <code>nextPlayer(board)</code>: X if the count of filled cells is even |
| Winner and winning line | Derived | <code>getWinner(board)</code> |
| Draw / game over | Derived | <code>isDraw(board)</code>, <code>Boolean(win) \\|\\| isDraw(board)</code> |

<svg class="iq-diagram" width="100%" viewBox="0 0 680 280" role="img" aria-label="Data flow: the board state feeds derived values and the Board view, a click calls playMove, which returns a new board">
  <defs>
    <marker id="t1r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="40" width="210" height="64" rx="10"/>
  <text class="d-text d-accent" x="145" y="66" text-anchor="middle">board: 9 cells</text>
  <text class="d-sub" x="145" y="88" text-anchor="middle">the only useState</text>
  <rect class="d-box" x="430" y="40" width="210" height="64" rx="10"/>
  <text class="d-text" x="535" y="66" text-anchor="middle">Derived on render</text>
  <text class="d-sub" x="535" y="88" text-anchor="middle">winner, status, gameOver</text>
  <rect class="d-box" x="430" y="190" width="210" height="64" rx="10"/>
  <text class="d-text" x="535" y="216" text-anchor="middle">Board component</text>
  <text class="d-sub" x="535" y="238" text-anchor="middle">nine buttons</text>
  <rect class="d-box-muted" x="40" y="190" width="210" height="64" rx="10"/>
  <text class="d-text" x="145" y="216" text-anchor="middle">playMove(board, i)</text>
  <text class="d-sub" x="145" y="238" text-anchor="middle">returns a new array</text>
  <path class="d-edge" d="M 250 72 L 424 72" marker-end="url(#t1r-arrow)"/>
  <path class="d-edge" d="M 535 104 L 535 184" marker-end="url(#t1r-arrow)"/>
  <path class="d-edge-accent" d="M 430 222 L 256 222" marker-end="url(#t1r-arrow)"/>
  <text class="d-sub" x="343" y="206" text-anchor="middle">onPlay(i)</text>
  <path class="d-edge-accent" d="M 145 190 L 145 110" marker-end="url(#t1r-arrow)"/>
  <text class="d-sub" x="160" y="154">setBoard</text>
</svg>

The loop is short on purpose: state goes in, the screen comes out, a click produces a *new* state, and React draws again. Nothing else is stored anywhere.

## 4. Build It Step by Step

### Step 1: the rules as plain functions

Start with the logic, not the JSX. A board is a flat array of 9 cells, indexed 0 to 8 left to right, top to bottom. There are only 8 ways to win, so list them:

\`\`\`js
export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // columns
  [0, 4, 8],
  [2, 4, 6], // diagonals
];

export const emptyBoard = () => Array(9).fill(null);

export function getWinner(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a], line };
    }
  }
  return null;
\`\`\`

📌 **Interview term: Pure function** — a function whose result depends only on its arguments and that changes nothing outside itself. <code>getWinner</code> is pure, so you can test it with plain arrays and no browser. Returning the <code>line</code> (not just the player) is what makes the highlight possible later.

Whose turn is it? You do not need a variable. X always starts, so when an even number of cells is filled it is X's turn:

\`\`\`js
// X always starts, so whose turn it is can be derived from the board.
export function nextPlayer(board) {
  const filled = board.filter(Boolean).length;
  return filled % 2 === 0 ? "X" : "O";
\`\`\`

And a move:

\`\`\`js
export function playMove(board, index) {
  if (board[index] || getWinner(board)) return board;
  const next = board.slice();
  next[index] = nextPlayer(board);
  return next;
}
\`\`\`

📌 **Interview term: Immutable update** — instead of changing the existing array, build a new one with the change applied. React compares the old and new state by reference (<code>Object.is</code>); if you mutated the same array, React would see "same object" and could skip the re-render. See [why React state updates must be immutable](/interview-question/why-must-react-state-updates-be-immutable). On modern engines, <code>board.with(index, player)</code> does the copy and change in one call; see [Array.prototype.with()](/interview-question/how-does-array-prototype-with-let-you-replace-one-array-element-immutably-and-wh).

Notice that <code>playMove</code> refuses illegal moves itself (a filled cell, or a finished game). The buttons will also be disabled, but the rules should never depend on the UI being correct.

### Step 2: one piece of state in App

\`\`\`jsx
export default function App() {
  // The only state: nine cells. Everything
  // else is derived on each render.
  const [board, setBoard] = useState(emptyBoard);

  const win = getWinner(board);
  const status = getStatus(board);
  const gameOver = Boolean(win) || isDraw(board);
\`\`\`

Three things to say out loud in the interview:

- <code>useState(emptyBoard)</code> passes the function, not <code>emptyBoard()</code>. 📌 **Interview term: Lazy initial state** — React calls the function only on the first render instead of building a throwaway array on every render. It is a small habit that shows you know the API.
- <code>win</code>, <code>status</code> and <code>gameOver</code> are plain constants computed during render. Nine cells and eight lines cost nothing, so there is no need for <code>useMemo</code>.
- There is no <code>xIsNext</code> state. That variable is the classic bug source: forget to flip it once and the turns break.

The click handler uses the updater form so it always works on the latest board:

\`\`\`jsx
        onPlay={(i) => setBoard((b) => playMove(b, i))}
\`\`\`

📌 **Interview term: Updater function** — passing a function to a state setter (<code>setBoard(b => ...)</code>) instead of a value. React hands it the latest state, which keeps fast repeated events correct. More on choosing between hooks in [useState vs useReducer](/interview-question/what-is-the-difference-between-usestate-and-usereducer).

### Step 3: the Board component

\`\`\`jsx
export default function Board({ board, winLine, gameOver, onPlay }) {
  return (
    <div className="board" role="group" aria-label="Tic-tac-toe board">
      {board.map((value, i) => {
        const row = Math.floor(i / 3) + 1;
        const col = (i % 3) + 1;
        const isWin = winLine.includes(i);
        return (
          <button
            key={i}
            type="button"
            data-testid={"cell-" + i}
            className={
              "cell" +
              (isWin ? " win" : "") +
              (value ? " " + value.toLowerCase() : "")
            }
            aria-label={
              "Row " +
              row +
              ", column " +
              col +
              ", " +
              (value || "empty")
            }
            disabled={Boolean(value) || gameOver}
            onClick={() => onPlay(i)}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
\`\`\`

- Each cell is a real <code>&lt;button&gt;</code>, so it is focusable, works with Enter and Space, and is announced as a button. A <code>div</code> with an <code>onClick</code> gets none of that.
- The <code>aria-label</code> says where the cell is *and* what is in it ("Row 1, column 1, X"), because a screen reader user cannot see the grid.
- <code>disabled</code> blocks filled cells and every cell once the game ends.
- Using the index as <code>key</code> is fine here: the nine cells never reorder, get inserted or get deleted. See [the key prop](/interview-question/what-is-the-purpose-of-the-key-prop-when-rendering-lists-in-react).

📌 **Interview term: Lifting state up** — the board lives in <code>App</code>, the common parent, and <code>Board</code> only receives it as props and reports clicks through <code>onPlay</code>. <code>Board</code> has no state of its own. See [lifting state up](/interview-question/explain-the-concept-of-lifting-state-up-in-react).

### Step 4: status, restart and styling

The status paragraph has <code>aria-live="polite"</code>, so screen readers read "Winner: X" or "Next player: O" after each move without the user moving focus.

📌 **Interview term: Live region** — an element marked with <code>aria-live</code> whose text changes are announced by screen readers. <code>polite</code> waits until the reader is idle.

Restart is just <code>setBoard(emptyBoard())</code>. The stylesheet uses a CSS grid with <code>repeat(3, 1fr)</code> and <code>aspect-ratio: 1</code> on the cells, so the board stays square at 360 px wide.

## 5. Verified

**The rules on their own.** A node script fed fixed move sequences to <code>playMove</code> and printed the board (rows separated by <code>/</code>, <code>.</code> is empty):

\`\`\`text
X top row      | XXX/OO./... | Winner: X line 0,1,2
draw           | XOX/XOO/OXX | Draw 
O anti-diag    | XXO/.O./O.X | Winner: O line 2,4,6
move after win | XXX/OO./... | Winner: X line 0,1,2
repeat a cell  | .../.X./... | Next player: O 
immutable     | old board untouched: true | new board is a new array: true
\`\`\`

The last two lines matter: replaying a cell (<code>[4, 4, 4]</code>) leaves only one X and the turn stays with O, and a move after a win (cell 8) changes nothing.

**The real component.** The solution was bundled with esbuild, rendered with <code>createRoot</code> inside <code>&lt;StrictMode&gt;</code> in jsdom, and a driver dispatched real click events on the cells:

\`\`\`text
RENDERED: Tic-Tac-ToeNext player: XRestart
start      : Next player: X | .../.../...
re-click 0 : Next player: O | X../.../... | cell 0 disabled = true
game 1     : Winner: X | XXX/OO./... | win cells = 0,1,2
after win  : XXX/OO./... | cell 8 disabled = true
aria-label : Row 1, column 1, X / Row 3, column 3, empty
restart    : Next player: X | .../.../...
game 2     : Draw | XOX/XOO/OXX | win cells = none
game 3     : Winner: O | XXO/.O./O.X | win cells = 2,4,6
\`\`\`

Game 1 is X across the top row with the winning cells highlighted; game 2 is the full-board draw; game 3 is O on the anti-diagonal. The re-click and after-win lines show that filled cells and finished games refuse input. jsdom has no layout, so the visual look (square cells, colours) was not checked here.

## 6. Edge Cases and Accessibility

| Case | What the solution does |
| :--- | :--- |
| Clicking a filled cell | Button is <code>disabled</code>, and <code>playMove</code> returns the same board anyway |
| Clicking after a win | Every cell is disabled; <code>playMove</code> also refuses |
| Win on the last possible move | <code>getWinner</code> is checked before the draw, so a 9th-move win is a win, not a draw |
| Keyboard | Tab moves between the nine buttons in reading order; Enter or Space plays |
| Screen reader | Each cell label includes its position and contents; the status line is a polite live region |
| Focus visibility | <code>:focus-visible</code> draws a clear outline on dark backgrounds |
| Small screens | Grid with <code>1fr</code> columns and square cells fits 360 px |

One honest trade-off: disabling a cell after it is played removes it from the tab order, so Tab skips filled cells. For a 3 x 3 board that is fine. On bigger boards, arrow-key navigation with <code>aria-disabled</code> is better, which is exactly what [Tic-Tac-Toe II](/interview-question/build-tic-tac-toe-ii-n-x-n-board-m-in-a-row) does.

## 7. Common Pitfalls

- **Storing <code>xIsNext</code> or <code>winner</code> as extra state.** They drift out of sync with the board. Derive them.
- **Mutating the board** (<code>board[i] = "X"; setBoard(board)</code>). React sees the same array reference and may not re-render; it also breaks any future history feature.
- **Checking for a draw before a win.** A move that fills the 9th cell can also complete a line. Check the winner first.
- **Only guarding in the UI.** If the "cell already filled" check lives only in <code>disabled</code>, a double-click or a test calling the handler directly can overwrite a cell. Guard inside the rule function.
- **Writing the win check as 8 hard-coded <code>if</code> statements inside JSX.** It is unreadable and untestable. A <code>LINES</code> table plus one loop is shorter and obviously complete.
- **Using <code>div</code>s for cells.** You lose focus, keyboard activation and the button role, and then have to rebuild them by hand.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Two players on one screen, 3 by 3, highlight the win, restart, no history. I will keep the rules in plain functions so I can test them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State model:</strong> <span style="color:#f0e2c8;">"The only state is an array of nine cells. Whose turn it is comes from counting filled cells, and the winner comes from checking eight lines, so I never store them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rules first:</strong> <span style="color:#f0e2c8;">"I write a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LINES</code> table and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getWinner</code> that returns the player and the line, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">playMove</code> that returns a new array and refuses filled cells or finished games."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. UI:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">App</code> holds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useState(emptyBoard)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Board</code> renders nine real buttons with labels like Row 1, column 1, X, and the status line is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-live</code> region."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verify and extend:</strong> <span style="color:#f0e2c8;">"I play a top-row win, a draw and a diagonal win, check that re-clicks are ignored, then mention history, bigger boards or a computer player as next steps."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add move history and time travel?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep an array of past boards (or of moves) plus a current step index. A move appends after the current step and drops anything later. Jumping to a step just changes the index. Because every move already returns a new array, the old boards are safe to keep.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support an N x N board where M in a row wins?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LINES</code> table no longer scales. Check only the lines through the last move: walk the 4 directions both ways and count matching cells, which is O(M) per move. That is the core of the Tic-Tac-Toe II variant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you build a computer opponent?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bestMove(board)</code> function. For 3 x 3, minimax over the full game tree is small enough; it scores wins, losses and draws recursively and picks the best. Call it after the human move, possibly in a short <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> so the human sees their move first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test the pure functions with move sequences (win in each direction, draw, illegal moves). Then a few component tests with Testing Library: click cells, assert the status text and the highlighted cells, and assert that a filled cell cannot be replayed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you need useMemo for the winner?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Eight line checks on nine cells is trivial work, and memoizing would add code and dependencies for no measurable gain. I would only reach for it on a big board with an expensive scan, and even then a last-move check is the better fix.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Derived state** | A value computed from other state on each render instead of being stored |
| **Single source of truth** | One place owns the data; everything else reads from it |
| **Pure function** | Output depends only on inputs, with no side effects; easy to test |
| **Immutable update** | Build a new array or object with the change instead of editing the old one |
| **Lazy initial state** | Passing a function to <code>useState</code> so the initial value is built once |
| **Updater function** | <code>setState(prev => next)</code>, which always sees the latest state |
| **Lifting state up** | Keeping shared state in the nearest common parent and passing it down as props |
| **Live region** | An <code>aria-live</code> element whose changes screen readers announce |

---

**Conclusion:** Tic-Tac-Toe is a state-modelling exercise wearing a game costume. Keep one array of nine cells as the single source of truth, derive the turn, the winner and the draw from it with small pure functions, update it immutably, and render real buttons with meaningful labels. Do that and the code stays short, the rules are testable without a browser, and every extension the interviewer asks for next (history, bigger boards, an AI) slots in without a rewrite.`,
        files: {
          "/App.js": `import { useState } from "react";
import Board from "./src/Board";
import { emptyBoard, getWinner, getStatus, isDraw, playMove } from "./src/game";

export default function App() {
  // The only state: nine cells. Everything else is derived on each render.
  const [board, setBoard] = useState(emptyBoard);

  const win = getWinner(board);
  const status = getStatus(board);
  const gameOver = Boolean(win) || isDraw(board);

  return (
    <main className="ttt">
      <h1>Tic-Tac-Toe</h1>
      <p className="status" data-testid="status" aria-live="polite">
        {status}
      </p>
      <Board
        board={board}
        winLine={win ? win.line : []}
        gameOver={gameOver}
        onPlay={(i) => setBoard((b) => playMove(b, i))}
      />
      <button
        type="button"
        className="restart"
        data-testid="restart"
        onClick={() => setBoard(emptyBoard())}
      >
        Restart
      </button>
    </main>
  );
}
`,
          "/src/Board.js": `export default function Board({ board, winLine, gameOver, onPlay }) {
  return (
    <div className="board" role="group" aria-label="Tic-tac-toe board">
      {board.map((value, i) => {
        const row = Math.floor(i / 3) + 1;
        const col = (i % 3) + 1;
        const isWin = winLine.includes(i);
        return (
          <button
            key={i}
            type="button"
            data-testid={"cell-" + i}
            className={
              "cell" +
              (isWin ? " win" : "") +
              (value ? " " + value.toLowerCase() : "")
            }
            aria-label={
              "Row " + row + ", column " + col + ", " + (value || "empty")
            }
            disabled={Boolean(value) || gameOver}
            onClick={() => onPlay(i)}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
`,
          "/src/game.js": `// Pure game logic: no React here, so it can be tested on its own.
export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // columns
  [0, 4, 8],
  [2, 4, 6], // diagonals
];

export const emptyBoard = () => Array(9).fill(null);

export function getWinner(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a], line };
    }
  }
  return null;
}

// X always starts, so whose turn it is can be derived from the board.
export function nextPlayer(board) {
  const filled = board.filter(Boolean).length;
  return filled % 2 === 0 ? "X" : "O";
}

export function isDraw(board) {
  return !getWinner(board) && board.every(Boolean);
}

export function getStatus(board) {
  const win = getWinner(board);
  if (win) return "Winner: " + win.player;
  if (isDraw(board)) return "Draw";
  return "Next player: " + nextPlayer(board);
}

// Returns a NEW board; an illegal move returns the same board unchanged.
export function playMove(board, index) {
  if (board[index] || getWinner(board)) return board;
  const next = board.slice();
  next[index] = nextPlayer(board);
  return next;
}
`,
          "/styles.css": `body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}
.ttt {
  max-width: 360px;
  margin: 0 auto;
  padding: 24px 16px;
  text-align: center;
}
.ttt h1 {
  font-size: 1.4rem;
  margin: 0 0 8px;
}
.status {
  min-height: 1.5em;
  font-weight: 600;
  color: #fbbf24;
}
.board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 16px 0;
}
.cell {
  aspect-ratio: 1;
  font-size: 2.4rem;
  font-weight: 700;
  border: 2px solid #334155;
  border-radius: 10px;
  background: #1e293b;
  color: #e2e8f0;
  cursor: pointer;
}
.cell:disabled {
  cursor: default;
}
.cell:not(:disabled):hover {
  background: #273449;
}
.cell:focus-visible {
  outline: 3px solid #38bdf8;
  outline-offset: 2px;
}
.cell.x {
  color: #38bdf8;
}
.cell.o {
  color: #f472b6;
}
.cell.win {
  background: #14532d;
  border-color: #22c55e;
}
.restart {
  padding: 10px 20px;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid #475569;
  background: #334155;
  color: #f8fafc;
  cursor: pointer;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Vue. Assumes basic HTML, CSS and JavaScript and a first look at Vue Single File Components; no game-programming background needed.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. All code excerpts are copied from the runnable solution on this page, and the Verified section quotes what that solution printed when a test driver clicked through real games on Vue 3.5.44.

## 1. A Story First

Two people playing Tic-Tac-Toe on paper never write "it is O's turn" in the margin. They look at the paper: equal numbers of X and O means X moves; three in a line means the game is over. The paper is the only record, and every fact about the game is *read* from it.

Build the Vue version the same way. Keep one reactive array of nine cells, and let Vue's <code>computed</code> values read the turn, the winner and the draw off it. Vue's reactivity then does the bookkeeping that a hand-written game would get wrong.

## 2. The Plan: State, Computed, Components

The rules live in <code>src/game.js</code>, a plain JavaScript module with no Vue in it: a table of the 8 winning <code>LINES</code>, <code>getWinner(board)</code> returning <code>{ player, line }</code>, <code>nextPlayer(board)</code> (X when an even number of cells is filled), <code>isDraw</code>, <code>getStatus</code>, and <code>playMove(board, i)</code>, which returns a new array or the same one for an illegal move.

| Value | Vue tool | Why |
| :--- | :--- | :--- |
| <code>board</code> | <code>ref(emptyBoard())</code> | The single source of truth |
| <code>win</code>, <code>status</code>, <code>gameOver</code> | <code>computed</code> | Derived from <code>board</code>, cached until it changes |
| Cell clicks | <code>emit("play", i)</code> from the child | The child reports; the parent decides |

📌 **Interview term: Computed property** — a value built from reactive state with <code>computed(() => ...)</code>. Vue tracks what it reads, caches the result and recomputes only when one of those dependencies changes. Use it for derived values instead of a <code>watch</code> that copies data into another ref; see [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch).

📌 **Interview term: Derived state** — anything you can calculate from existing state. Storing it separately (an <code>xIsNext</code> flag, a <code>winner</code> ref) creates two truths that can disagree.

## 3. Build It Step by Step

### Step 1: the App owns one ref

\`\`\`vue
<script setup>
import { ref, computed } from "vue";
import GameBoard from "./components/GameBoard.vue";
import {
  emptyBoard,
  getWinner,
  getStatus,
  isDraw,
  playMove,
} from "./game.js";

// The only state: nine cells. Everything else is a computed.
const board = ref(emptyBoard());

const win = computed(() => getWinner(board.value));
const status = computed(() => getStatus(board.value));
const gameOver = computed(
  () => Boolean(win.value) || isDraw(board.value),
);

function play(i) {
  // replace, never mutate in place
  board.value = playMove(board.value, i);
}
function restart() {
  board.value = emptyBoard();
}
</script>
\`\`\`

The key line is <code>board.value = playMove(board.value, i)</code>. 📌 **Interview term: Immutable update** — <code>playMove</code> copies the array and changes the copy. Vue's deep reactivity would also notice <code>board.value[i] = "X"</code>, so why bother? Because the old board stays untouched: the day the interviewer asks for undo or move history, every past board is still valid. It also keeps <code>playMove</code> a pure function you can test in node.

<code>getWinner</code> is checked before the draw, so a winning ninth move counts as a win.

### Step 2: the board component with props and emits

\`\`\`vue
<script setup>
defineProps({
  board: { type: Array, required: true },
  winLine: { type: Array, default: () => [] },
  gameOver: { type: Boolean, default: false },
});
const emit = defineEmits(["play"]);

const label = (value, i) =>
  "Row " +
  (Math.floor(i / 3) + 1) +
  ", column " +
  ((i % 3) + 1) +
  ", " +
  (value || "empty");
</script>

<template>
  <div class="board" role="group" aria-label="Tic-tac-toe board">
    <button
      v-for="(value, i) in board"
      :key="i"
      type="button"
      :data-testid="'cell-' + i"
      :class="['cell', { win: winLine.includes(i), x: value === 'X', o: value === 'O' }]"
      :aria-label="label(value, i)"
      :disabled="Boolean(value) || gameOver"
      @click="emit('play', i)"
    >
      {{ value }}
    </button>
  </div>
</template>
\`\`\`

- 📌 **Interview term: Props down, events up** — <code>GameBoard</code> receives <code>board</code>, <code>winLine</code> and <code>gameOver</code> as read-only [props](/interview-question/what-are-props-in-vue-and-how-do-you-validate-them) and sends clicks up with <code>emit("play", i)</code>. It never changes the board itself. Declaring emits with <code>defineEmits</code> documents the component contract; see [defineProps and defineEmits](/interview-question/how-do-defineprops-and-defineemits-work-in-script-setup).
- <code>v-for="(value, i) in board"</code> with <code>:key="i"</code>: index keys are safe because the nine cells never move. See [why :key matters in v-for](/interview-question/why-is-the-key-attribute-important-in-v-for).
- <code>:class</code> with an array plus an object adds <code>win</code>, <code>x</code> or <code>o</code> without string concatenation.
- The parent template passes <code>:win-line</code>: kebab-case in the template maps to the camelCase prop <code>winLine</code>.

### Step 3: status and restart

\`\`\`vue
<template>
  <main class="ttt">
    <h1>Tic-Tac-Toe</h1>
    <p
      class="status"
      data-testid="status"
      aria-live="polite"
    >{{ status }}</p>
    <GameBoard
      :board="board"
      :win-line="win ? win.line : []"
      :game-over="gameOver"
      @play="play"
    />
    <button
      type="button"
      class="restart"
      data-testid="restart"
      @click="restart"
    >Restart</button>
  </main>
</template>
\`\`\`

The status is an <code>aria-live="polite"</code> paragraph. 📌 **Interview term: Live region** — screen readers announce text changes inside it, so "Winner: X" is spoken without moving focus. Restart just assigns a fresh board; every computed follows.

## 4. Verified

The rules were first run on their own with node, feeding fixed move sequences to <code>playMove</code> (rows separated by <code>/</code>, <code>.</code> is empty):

\`\`\`text
X top row      | XXX/OO./... | Winner: X line 0,1,2
draw           | XOX/XOO/OXX | Draw 
O anti-diag    | XXO/.O./O.X | Winner: O line 2,4,6
move after win | XXX/OO./... | Winner: X line 0,1,2
repeat a cell  | .../.X./... | Next player: O 
immutable     | old board untouched: true | new board is a new array: true
\`\`\`

Then the SFCs were compiled with <code>@vue/compiler-sfc</code>, mounted with <code>createApp(App).mount("#app")</code> in jsdom, and a driver clicked real cells:

\`\`\`text
RENDERED: Tic-Tac-ToeNext player: XRestart
start      : Next player: X | .../.../...
re-click 0 : Next player: O | X../.../... | cell 0 disabled = true
game 1     : Winner: X | XXX/OO./... | win cells = 0,1,2
after win  : XXX/OO./... | cell 8 disabled = true
aria-label : Row 1, column 1, X / Row 3, column 3, empty
restart    : Next player: X | .../.../...
game 2     : Draw | XOX/XOO/OXX | win cells = none
game 3     : Winner: O | XXO/.O./O.X | win cells = 2,4,6
\`\`\`

The output matches the React and Angular builds of this question line for line: a top-row win for X with cells 0,1,2 highlighted, a full-board draw, and an anti-diagonal win for O. Visual layout was not checked (jsdom has no layout engine).

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Filled cell clicked | <code>:disabled</code> on the button, and <code>playMove</code> returns the same board |
| Move after a win | All cells disabled; the rule function refuses as well |
| Ninth move that wins | Winner is checked before the draw |
| Keyboard | Real buttons: Tab to move, Enter or Space to play |
| Screen readers | Labels like "Row 1, column 1, X"; the status is a live region |

## 6. Common Pitfalls

- **Destructuring the ref or the props.** <code>const { board } = props</code> in older patterns, or copying <code>board.value</code> into a plain variable, freezes a snapshot. Read <code>board.value</code> (or the prop) where you need it, or use a computed.
- **Using a <code>watch</code> to keep <code>winner</code> in sync.** That is a computed in disguise, with an extra render and a chance to forget a case.
- **Mutating a prop in the child.** <code>props.board[i] = "X"</code> inside <code>GameBoard</code> breaks one-way data flow and Vue warns in development. Emit instead.
- **Draw before win.** Check the winner first or a ninth-move win is reported as a draw.
- **Only guarding in the template.** <code>:disabled</code> is UX; the rule belongs in <code>playMove</code>.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Two players, a 3 by 3 board, highlight the win, restart. I will put the rules in a plain module so they are testable."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> holds nine cells. Turn, winner and game over are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>, so they can never disagree with the board."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rules:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LINES</code> table, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getWinner</code> returning the player and the line, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">playMove</code> returning a new array that refuses filled cells or finished games."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Components:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">App</code> owns the ref; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GameBoard</code> takes props and emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">play</code> with the index; cells are real buttons with position and content in the label."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verify:</strong> <span style="color:#f0e2c8;">"I click a row win, a draw and a diagonal, check re-clicks are ignored, and then offer history, larger boards or an AI as extensions."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ref</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reactive</code> for the board?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The whole array is replaced on every move, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> makes replacement natural: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">board.value = next</code>. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive</code> array cannot be reassigned without losing reactivity, so you would end up splicing it in place.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add time travel?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">history</code> ref of boards (or moves) and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code> ref. The current board becomes a computed of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">history.value[step.value]</code>; a new move slices history after the current step and appends. Immutable boards make this almost free.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use Pinia for this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The state is local to one widget and two components. A store adds indirection with no benefit; I would only move it to a store if other parts of the app needed the game state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">game.js</code> with move sequences, then mount <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">App</code> with Vue Test Utils, trigger clicks on the cells and assert the status text and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">win</code> classes.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Computed property** | A cached value derived from reactive state |
| **Derived state** | Data calculated from other data instead of stored |
| **Immutable update** | Replace with a changed copy instead of editing in place |
| **Props down, events up** | Parents pass data down; children emit events up |
| **Live region** | An <code>aria-live</code> element whose changes screen readers announce |

---

**Conclusion:** In Vue, Tic-Tac-Toe is one <code>ref</code> of nine cells, three <code>computed</code> values read from it, a pure rule module, and a child component that takes props and emits clicks. Keep the board as the single source of truth, update it with a new array, and the game stays correct, testable without a browser, and ready for history or bigger boards.`,
        files: {
          "/src/App.vue": `<script setup>
import { ref, computed } from "vue";
import GameBoard from "./components/GameBoard.vue";
import { emptyBoard, getWinner, getStatus, isDraw, playMove } from "./game.js";

// The only state: nine cells. Everything else is a computed.
const board = ref(emptyBoard());

const win = computed(() => getWinner(board.value));
const status = computed(() => getStatus(board.value));
const gameOver = computed(() => Boolean(win.value) || isDraw(board.value));

function play(i) {
  board.value = playMove(board.value, i); // replace, never mutate in place
}
function restart() {
  board.value = emptyBoard();
}
</script>

<template>
  <main class="ttt">
    <h1>Tic-Tac-Toe</h1>
    <p class="status" data-testid="status" aria-live="polite">{{ status }}</p>
    <GameBoard
      :board="board"
      :win-line="win ? win.line : []"
      :game-over="gameOver"
      @play="play"
    />
    <button
      type="button"
      class="restart"
      data-testid="restart"
      @click="restart"
    >Restart</button>
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}
.ttt {
  max-width: 360px;
  margin: 0 auto;
  padding: 24px 16px;
  text-align: center;
}
.ttt h1 {
  font-size: 1.4rem;
  margin: 0 0 8px;
}
.status {
  min-height: 1.5em;
  font-weight: 600;
  color: #fbbf24;
}
.restart {
  padding: 10px 20px;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid #475569;
  background: #334155;
  color: #f8fafc;
  cursor: pointer;
}
</style>
`,
          "/src/components/GameBoard.vue": `<script setup>
defineProps({
  board: { type: Array, required: true },
  winLine: { type: Array, default: () => [] },
  gameOver: { type: Boolean, default: false },
});
const emit = defineEmits(["play"]);

const label = (value, i) =>
  "Row " +
  (Math.floor(i / 3) + 1) +
  ", column " +
  ((i % 3) + 1) +
  ", " +
  (value || "empty");
</script>

<template>
  <div class="board" role="group" aria-label="Tic-tac-toe board">
    <button
      v-for="(value, i) in board"
      :key="i"
      type="button"
      :data-testid="'cell-' + i"
      :class="['cell', { win: winLine.includes(i), x: value === 'X', o: value === 'O' }]"
      :aria-label="label(value, i)"
      :disabled="Boolean(value) || gameOver"
      @click="emit('play', i)"
    >
      {{ value }}
    </button>
  </div>
</template>

<style scoped>
.board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 16px 0;
}
.cell {
  aspect-ratio: 1;
  font-size: 2.4rem;
  font-weight: 700;
  border: 2px solid #334155;
  border-radius: 10px;
  background: #1e293b;
  color: #e2e8f0;
  cursor: pointer;
}
.cell:disabled {
  cursor: default;
}
.cell:not(:disabled):hover {
  background: #273449;
}
.cell:focus-visible {
  outline: 3px solid #38bdf8;
  outline-offset: 2px;
}
.cell.x {
  color: #38bdf8;
}
.cell.o {
  color: #f472b6;
}
.cell.win {
  background: #14532d;
  border-color: #22c55e;
}
</style>
`,
          "/src/game.js": `// Pure game logic: no React here, so it can be tested on its own.
export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // columns
  [0, 4, 8],
  [2, 4, 6], // diagonals
];

export const emptyBoard = () => Array(9).fill(null);

export function getWinner(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a], line };
    }
  }
  return null;
}

// X always starts, so whose turn it is can be derived from the board.
export function nextPlayer(board) {
  const filled = board.filter(Boolean).length;
  return filled % 2 === 0 ? "X" : "O";
}

export function isDraw(board) {
  return !getWinner(board) && board.every(Boolean);
}

export function getStatus(board) {
  const win = getWinner(board);
  if (win) return "Winner: " + win.player;
  if (isDraw(board)) return "Draw";
  return "Next player: " + nextPlayer(board);
}

// Returns a NEW board; an illegal move returns the same board unchanged.
export function playMove(board, index) {
  if (board[index] || getWinner(board)) return board;
  const next = board.slice();
  next[index] = nextPlayer(board);
  return next;
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Angular. Assumes basic HTML, CSS and TypeScript and a first look at standalone components; no game-programming background needed.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. All code excerpts are copied from the runnable solution on this page, and the Verified section quotes what that solution printed on Angular 22.2.3, both compiled ahead of time with strict templates and compiled at runtime the way the playground runs it.

## 1. A Story First

On a paper Tic-Tac-Toe board, nobody keeps a separate note saying whose turn it is or whether someone has won. The marks on the paper already say it. Count them: equal numbers means X moves. Scan the lines: three the same means the game is over.

The Angular build follows the paper. One <code>signal</code> holds the nine cells; <code>computed</code> signals read the winner, the status and "game over" from it. Change the signal and Angular updates exactly the parts of the template that read it.

## 2. The Plan: Signals, Computed, Components

The rules live in <code>game.ts</code>, plain TypeScript with no Angular imports: types <code>Player</code> and <code>Cell</code>, the 8 winning <code>LINES</code>, <code>getWinner</code> returning <code>{ player, line }</code>, <code>nextPlayer</code>, <code>isDraw</code>, <code>getStatus</code>, and <code>playMove(board, i)</code> returning a new array (or the same one for an illegal move).

| Value | Angular tool | Why |
| :--- | :--- | :--- |
| <code>board</code> | <code>signal(emptyBoard())</code> | Single source of truth |
| <code>win</code>, <code>status</code>, <code>gameOver</code> | <code>computed()</code> | Derived and cached |
| Cell clicks | <code>@Output() play = new EventEmitter&lt;number&gt;()</code> | Child reports, parent decides |

📌 **Interview term: Signal** — a reactive value container. You read it by calling it (<code>board()</code>), write it with <code>set</code> or <code>update</code>, and anything that read it (a template, a <code>computed</code>) is notified. See [Angular signals](/interview-question/what-are-angular-signals).

📌 **Interview term: Computed signal** — <code>computed(() => ...)</code> derives a value from other signals, memoized until they change. See [computed() vs method calls in templates](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls).

## 3. Build It Step by Step

### Step 1: the AppComponent state

\`\`\`ts
export class AppComponent {
  // The only state: nine cells in a
  // signal. Everything else is computed.
  readonly board = signal(emptyBoard());
  readonly win = computed(() => getWinner(this.board()));
  readonly status = computed(() => getStatus(this.board()));
  readonly gameOver = computed(
    () => !!this.win() || isDraw(this.board()),
  );

  play(i: number): void {
    this.board.update((b) => playMove(b, i));
  }
  restart(): void {
    this.board.set(emptyBoard());
  }
}
\`\`\`

<code>this.board.update((b) => playMove(b, i))</code> passes the current array to <code>playMove</code> and stores whatever comes back. 📌 **Interview term: Immutable update** — <code>playMove</code> copies the array. That matters for signals: a signal only notifies when the new value is not <code>Object.is</code>-equal to the old one, so mutating the same array in place and calling <code>set</code> with it would notify nobody. An illegal move returns the *same* array, so nothing re-renders, which is exactly right.

The playground boots the app without Zone.js, so keep state in signals: a plain class field changed from a timer or promise callback would not re-render the view. See [zoneless Angular](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18).

### Step 2: the template and the child component

\`\`\`ts
  template: \`
    <main class="ttt">
      <h1>Tic-Tac-Toe</h1>
      <p class="status" data-testid="status" aria-live="polite">{{ status() }}</p>
      <app-board
        [board]="board()"
        [winLine]="win()?.line ?? []"
        [gameOver]="gameOver()"
        (play)="play($event)"
      />
      <button type="button" class="restart" data-testid="restart" (click)="restart()">Restart</button>
    </main>
\`\`\`

\`\`\`ts
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Cell } from "./game";

@Component({
  selector: "app-board",
  standalone: true,
  template: \`
    <div class="board" role="group" aria-label="Tic-tac-toe board">
      @for (value of board; track $index) {
        <button
          type="button"
          [attr.data-testid]="'cell-' + $index"
          class="cell"
          [class.win]="winLine.includes($index)"
          [class.x]="value === 'X'"
          [class.o]="value === 'O'"
          [attr.aria-label]="label(value, $index)"
          [disabled]="!!value || gameOver"
          (click)="play.emit($index)"
        >{{ value }}</button>
      }
    </div>
  \`,
\`\`\`

\`\`\`ts
export class BoardComponent {
  @Input() board: Cell[] = [];
  @Input() winLine: number[] = [];
  @Input() gameOver = false;
  @Output() play = new EventEmitter<number>();

  label(value: Cell, i: number): string {
    return (
      "Row " +
      (Math.floor(i / 3) + 1) +
      ", column " +
      ((i % 3) + 1) +
      ", " +
      (value || "empty")
    );
  }
}
\`\`\`

- 📌 **Interview term: Built-in control flow** — <code>@for (value of board; track $index)</code> is the template syntax for loops, with no <code>NgFor</code> import needed. <code>track $index</code> is fine because the nine cells never move. See [@for and track](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux).
- <code>@Input()</code> and <code>@Output()</code> are the decorator APIs. The site playground compiles components at runtime, where the signal-based <code>input()</code> and <code>output()</code> functions do not register, so this solution uses decorators. Child-to-parent events are covered in [how child components emit events](/interview-question/how-do-child-components-emit-events-to-parents).
- <code>[attr.aria-label]</code> and <code>[attr.data-testid]</code> use attribute binding because those are HTML attributes, not DOM properties.
- <code>[class.win]</code>, <code>[class.x]</code>, <code>[class.o]</code> toggle single classes.
- <code>[winLine]="win()?.line ?? []"</code> passes an empty list until someone wins.

## 4. Verified

The rule functions were run with node against fixed move sequences (the logic file is the same algorithm in TypeScript; rows separated by <code>/</code>, <code>.</code> is empty):

\`\`\`text
X top row      | XXX/OO./... | Winner: X line 0,1,2
draw           | XOX/XOO/OXX | Draw 
O anti-diag    | XXO/.O./O.X | Winner: O line 2,4,6
move after win | XXX/OO./... | Winner: X line 0,1,2
repeat a cell  | .../.X./... | Next player: O 
immutable     | old board untouched: true | new board is a new array: true
\`\`\`

The components were then booted with <code>bootstrapApplication(AppComponent)</code> twice: AOT-compiled with <code>ngc</code> and <code>strictTemplates</code>, and JIT-compiled at runtime like the playground. A driver clicked real cells. AOT output:

\`\`\`text
RENDERED: Tic-Tac-ToeNext player: XRestart
start      : Next player: X | .../.../...
re-click 0 : Next player: O | X../.../... | cell 0 disabled = true
game 1     : Winner: X | XXX/OO./... | win cells = 0,1,2
after win  : XXX/OO./... | cell 8 disabled = true
aria-label : Row 1, column 1, X / Row 3, column 3, empty
restart    : Next player: X | .../.../...
game 2     : Draw | XOX/XOO/OXX | win cells = none
game 3     : Winner: O | XXO/.O./O.X | win cells = 2,4,6
\`\`\`

The JIT run printed the same lines with the <code>[angular:playground]</code> prefix. Both match the React and Vue builds. Layout and colours were not checked in jsdom.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Filled cell clicked | <code>[disabled]</code> on the button; <code>playMove</code> returns the same array, so the signal does not notify |
| Move after a win | Every cell disabled; the rule function refuses too |
| Ninth move wins | Winner checked before draw |
| Keyboard | Native buttons: Tab, Enter, Space |
| Screen readers | Position-and-content labels; <code>aria-live="polite"</code> status |

## 6. Common Pitfalls

- **Forgetting the parentheses.** <code>{{ status }}</code> prints the signal function, not its value. Templates must call <code>status()</code>.
- **Mutating then setting the same array.** <code>this.board().push(...)</code> or <code>b[i] = "X"; this.board.set(b)</code> passes an identical reference, so nothing updates.
- **Using signal <code>input()</code> in a runtime-compiled playground.** It does not register there; use <code>@Input()</code>.
- **Wrapping a decorator <code>@Input()</code> in <code>computed()</code>.** A computed only tracks signals. <code>computed(() => this.board.length)</code> on a plain <code>@Input</code> field caches the first value and never recomputes; call a method or use <code>ngOnChanges</code> instead.
- **Checking draw before win.** A winning ninth move would be reported as a draw.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"Two players, 3 by 3, highlight the winning line, restart. Rules go in a framework-free <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">game.ts</code> so I can unit-test them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">signal</code> with nine cells. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">win</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gameOver</code> are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>, so there is nothing to keep in sync."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rules:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LINES</code> table, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getWinner</code> returning the player and the line, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">playMove</code> that returns a new array or the same one for an illegal move."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Components:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AppComponent</code> owns the signal; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BoardComponent</code> takes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Input</code>s, emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">play</code>, and renders buttons with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> and attribute bindings for ARIA."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verify:</strong> <span style="color:#f0e2c8;">"I play a row win, a draw and a diagonal, confirm re-clicks are ignored, then suggest history or bigger boards."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does an illegal move not re-render anything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">playMove</code> returns the same array reference, and a signal compares with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is</code>. Same reference means no notification, so the template is not touched.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use a service for the game state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for one widget. A service with signals becomes useful when other components, such as a scoreboard, need the same state; then I would move the signals into an injectable and inject it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">game.ts</code> with plain arrays. For the component, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed</code>, click buttons through the fixture, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code> or await stability, and assert the status text and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">win</code> classes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">OnPush</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With signals and inputs that are replaced, not mutated, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OnPush</code> is a safe default and cuts unnecessary checks. This board already follows the rules it needs: new arrays and signals read in the template.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Signal** | A reactive value you read by calling it and write with <code>set</code> or <code>update</code> |
| **Computed signal** | A memoized value derived from other signals |
| **Immutable update** | Store a changed copy so reference checks see the change |
| **Built-in control flow** | <code>@for</code>, <code>@if</code> template blocks that need no imports |
| **Attribute binding** | <code>[attr.x]</code>, which sets an HTML attribute rather than a DOM property |

---

**Conclusion:** The Angular Tic-Tac-Toe is one signal of nine cells, a handful of computed signals, a framework-free rule file and a child component wired with <code>@Input</code> and <code>@Output</code>. Replace the board instead of mutating it, derive everything else, and the game is correct in both AOT and runtime-compiled builds, easy to test and ready for the next feature.`,
        files: {
          "/src/app/app.component.ts": `import { Component, computed, signal } from "@angular/core";
import { BoardComponent } from "./board.component";
import { emptyBoard, getStatus, getWinner, isDraw, playMove } from "./game";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [BoardComponent],
  template: \`
    <main class="ttt">
      <h1>Tic-Tac-Toe</h1>
      <p
        class="status"
        data-testid="status"
        aria-live="polite"
      >{{ status() }}</p>
      <app-board
        [board]="board()"
        [winLine]="win()?.line ?? []"
        [gameOver]="gameOver()"
        (play)="play($event)"
      />
      <button
        type="button"
        class="restart"
        data-testid="restart"
        (click)="restart()"
      >Restart</button>
    </main>
  \`,
  styles: [
    \`
    :host { display: block; font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    .ttt { max-width: 360px; margin: 0 auto; padding: 24px 16px; text-align: center; }
    .ttt h1 { font-size: 1.4rem; margin: 0 0 8px; }
    .status { min-height: 1.5em; font-weight: 600; color: #fbbf24; }
    .restart { padding: 10px 20px; font-size: 1rem; border-radius: 8px; border: 1px solid #475569;
      background: #334155; color: #f8fafc; cursor: pointer; }
  \`,
  ],
})
export class AppComponent {
  // The only state: nine cells in a signal. Everything else is computed.
  readonly board = signal(emptyBoard());
  readonly win = computed(() => getWinner(this.board()));
  readonly status = computed(() => getStatus(this.board()));
  readonly gameOver = computed(() => !!this.win() || isDraw(this.board()));

  play(i: number): void {
    this.board.update((b) => playMove(b, i));
  }
  restart(): void {
    this.board.set(emptyBoard());
  }
}
`,
          "/src/app/board.component.ts": `import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Cell } from "./game";

@Component({
  selector: "app-board",
  standalone: true,
  template: \`
    <div class="board" role="group" aria-label="Tic-tac-toe board">
      @for (value of board; track $index) {
        <button
          type="button"
          [attr.data-testid]="'cell-' + $index"
          class="cell"
          [class.win]="winLine.includes($index)"
          [class.x]="value === 'X'"
          [class.o]="value === 'O'"
          [attr.aria-label]="label(value, $index)"
          [disabled]="!!value || gameOver"
          (click)="play.emit($index)"
        >{{ value }}</button>
      }
    </div>
  \`,
  styles: [
    \`
    .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 16px 0; }
    .cell { aspect-ratio: 1; font-size: 2.4rem; font-weight: 700; border: 2px solid #334155; border-radius: 10px;
      background: #1e293b; color: #e2e8f0; cursor: pointer; }
    .cell:disabled { cursor: default; }
    .cell:not(:disabled):hover { background: #273449; }
    .cell:focus-visible { outline: 3px solid #38bdf8; outline-offset: 2px; }
    .cell.x { color: #38bdf8; }
    .cell.o { color: #f472b6; }
    .cell.win { background: #14532d; border-color: #22c55e; }
  \`,
  ],
})
export class BoardComponent {
  @Input() board: Cell[] = [];
  @Input() winLine: number[] = [];
  @Input() gameOver = false;
  @Output() play = new EventEmitter<number>();

  label(value: Cell, i: number): string {
    return (
      "Row " +
      (Math.floor(i / 3) + 1) +
      ", column " +
      ((i % 3) + 1) +
      ", " +
      (value || "empty")
    );
  }
}
`,
          "/src/app/game.ts": `// Pure game logic: no Angular here, so it can be tested on its own.
export type Player = "X" | "O";
export type Cell = Player | null;
export interface Win {
  player: Player;
  line: number[];
}

export const LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // columns
  [0, 4, 8],
  [2, 4, 6], // diagonals
];

export const emptyBoard = (): Cell[] => Array<Cell>(9).fill(null);

export function getWinner(board: Cell[]): Win | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    const v = board[a];
    if (v && v === board[b] && v === board[c]) return { player: v, line };
  }
  return null;
}

// X always starts, so whose turn it is can be derived from the board.
export function nextPlayer(board: Cell[]): Player {
  const filled = board.filter(Boolean).length;
  return filled % 2 === 0 ? "X" : "O";
}

export function isDraw(board: Cell[]): boolean {
  return !getWinner(board) && board.every(Boolean);
}

export function getStatus(board: Cell[]): string {
  const win = getWinner(board);
  if (win) return "Winner: " + win.player;
  if (isDraw(board)) return "Draw";
  return "Next player: " + nextPlayer(board);
}

// Returns a NEW board; an illegal move returns the same board unchanged.
export function playMove(board: Cell[], index: number): Cell[] {
  if (board[index] || getWinner(board)) return board;
  const next = board.slice();
  next[index] = nextPlayer(board);
  return next;
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build Tic-Tac-Toe II (N x N board, M in a row)",
    seoDescription: "Build an N x N tic-tac-toe where M in a row wins: an O(M) win check from the last move, move history with time travel, keyboard grid navigation.",
    description: `**Question presented to candidate:**
"You have built the classic 3 by 3 Tic-Tac-Toe before. Now make it general: the board is N by N and you need M in a row to win, both chosen by the player. The win check has to stay fast on a big board, and I want a move history where I can jump back to any earlier position and play on from there."

**Requirements:**
- Controls for the board size N (3 to 8 here) and the win length M (3 to N); changing either starts a new game.
- X and O alternate; filled cells and finished games refuse moves.
- After each move, detect a win of M in a row in any of the 4 directions using only the lines through that move, and highlight the winning cells; detect a draw when the board is full.
- A move list with "jump to move k"; making a new move after jumping back discards the later moves.
- Arrow-key navigation between cells.

**What a strong answer should cover:**
- Why the 3 x 3 \`LINES\` table does not scale, and the last-move check: 4 directions, walk both ways, stop after M - 1 cells, O(M) per move.
- Flat-array indexing (\`row * n + col\`) and bounds checks so a scan never wraps to the next row.
- History as a list of moves plus a \`step\` pointer, with the board derived by replaying; truncating the future on a new move.
- Clamping M when N shrinks, and resetting the game on any config change.
- A roving tabindex grid: one cell in the tab order, arrows move focus, \`aria-disabled\` instead of \`disabled\` so filled cells stay reachable.

**Clarifying questions expected:**
- "Should a line longer than M also count as a win, as in Gomoku freestyle?"
- "Does changing N or M mid-game reset the game, or should it be blocked while a game is running?"
- "Do you want undo of single moves, or full jump-to-any-move time travel?"

**Code / implementation expected:** Yes. A working component plus the win-check function written and explained; the interviewer will often ask for its complexity.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Candidates who can already build the basic 3 x 3 game and want the harder follow-up an interviewer asks next. Comfortable with React state and props; no algorithms background assumed.
**Difficulty:** Hard

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. This doc assumes the basics from [Build Tic-Tac-Toe](/interview-question/build-tic-tac-toe) (derived state, pure rule functions, immutable updates) and focuses on what changes when the board grows. All excerpts come from the runnable solution, and the Verified section quotes real output from React 19.3.1.

## 1. Why This Even Matters — A Story First

Imagine a referee at a Gomoku tournament: a 15 by 15 board where five in a row wins. After every stone, the referee does not stare at all 225 points looking for a line. They look at the stone that was *just placed* and glance along its row, its column and its two diagonals. If there is no five through that stone, there is no new five anywhere, because every other line was already checked when its own last stone landed.

That glance is the heart of this question. The basic game gets away with listing all 8 winning lines. On an N x N board with M in a row, the number of possible lines grows quickly and the table becomes silly. The referee's trick turns the check into a few dozen cell reads, whatever the board size.

The second idea is history. A tournament scorer does not photograph the board after every move. They write the moves down: "X at row 3, column 4". Any position can be rebuilt by replaying the list. That is exactly how this solution stores time travel.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does a line longer than M count (six in a row when M is 5)? | Freestyle rules say yes; some Gomoku variants say "exactly five". It changes the comparison from <code>&gt;= m</code> to <code>=== m</code> and needs the full run length. |
| What range of N and M? | Very large boards change rendering (thousands of buttons) and keyboard design. Here N is 3 to 8. |
| What happens when N or M changes mid-game? | Reset, or block? Resetting is simplest and easiest to explain. |
| Single-step undo or jump to any move? | Jump-to-move needs a move list and a pointer; undo alone could use a stack. |
| Keyboard support expected? | On a 64-cell board, tabbing through every cell is painful; arrow keys need a roving tabindex. |

Assumptions here: freestyle (M or more wins), N from 3 to 8, any config change resets, full jump-to-move history, arrow-key navigation.

## 3. Requirements and the Plan

**Component tree:** <code>App</code> owns the state and the size controls; <code>Board</code> renders the N x N buttons and owns only which cell holds keyboard focus; <code>History</code> renders the move list. All rules are in <code>src/game.js</code>, which has no React import.

| Value | Kind | Where |
| :--- | :--- | :--- |
| <code>n</code>, <code>m</code> | State | <code>useState</code> in <code>App</code> |
| <code>moves</code> (cell index of every move) | State | <code>useState</code> in <code>App</code> |
| <code>step</code> (how many moves are applied) | State | <code>useState</code> in <code>App</code> |
| Board, winner, draw, next player | Derived | <code>replay(n, m, moves, step)</code> on every render |
| Focused cell | UI state | <code>useState</code> in <code>Board</code> |

📌 **Interview term: Event sourcing (in miniature)** — storing the list of things that happened (moves) rather than the resulting state (boards), and rebuilding the state by replaying them. It makes history and time travel cheap: jumping back is just a smaller <code>step</code>.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 310" role="img" aria-label="A five by five grid with the last move in the center and four scan lines through it: row, column and both diagonals">
  <rect class="d-box-muted" x="40" y="30" width="50" height="50"/>
  <rect class="d-box-muted" x="90" y="30" width="50" height="50"/>
  <rect class="d-box-muted" x="140" y="30" width="50" height="50"/>
  <rect class="d-box-muted" x="190" y="30" width="50" height="50"/>
  <rect class="d-box-muted" x="240" y="30" width="50" height="50"/>
  <rect class="d-box-muted" x="40" y="80" width="50" height="50"/>
  <rect class="d-box-muted" x="90" y="80" width="50" height="50"/>
  <rect class="d-box-muted" x="140" y="80" width="50" height="50"/>
  <rect class="d-box-muted" x="190" y="80" width="50" height="50"/>
  <rect class="d-box-muted" x="240" y="80" width="50" height="50"/>
  <rect class="d-box-muted" x="40" y="130" width="50" height="50"/>
  <rect class="d-box-muted" x="90" y="130" width="50" height="50"/>
  <rect class="d-box-accent" x="140" y="130" width="50" height="50"/>
  <rect class="d-box-muted" x="190" y="130" width="50" height="50"/>
  <rect class="d-box-muted" x="240" y="130" width="50" height="50"/>
  <rect class="d-box-muted" x="40" y="180" width="50" height="50"/>
  <rect class="d-box-muted" x="90" y="180" width="50" height="50"/>
  <rect class="d-box-muted" x="140" y="180" width="50" height="50"/>
  <rect class="d-box-muted" x="190" y="180" width="50" height="50"/>
  <rect class="d-box-muted" x="240" y="180" width="50" height="50"/>
  <rect class="d-box-muted" x="40" y="230" width="50" height="50"/>
  <rect class="d-box-muted" x="90" y="230" width="50" height="50"/>
  <rect class="d-box-muted" x="140" y="230" width="50" height="50"/>
  <rect class="d-box-muted" x="190" y="230" width="50" height="50"/>
  <rect class="d-box-muted" x="240" y="230" width="50" height="50"/>
  <path class="d-edge-accent" d="M 50 155 L 280 155"/>
  <path class="d-edge-accent" d="M 165 40 L 165 270"/>
  <path class="d-edge-accent" d="M 50 40 L 280 270"/>
  <path class="d-edge-accent" d="M 280 40 L 50 270"/>
  <text class="d-text d-accent" x="165" y="160" text-anchor="middle">last</text>
  <rect class="d-box" x="360" y="40" width="290" height="70" rx="10"/>
  <text class="d-text" x="505" y="68" text-anchor="middle">4 directions</text>
  <text class="d-sub" x="505" y="92" text-anchor="middle">row, column, two diagonals</text>
  <rect class="d-box" x="360" y="140" width="290" height="70" rx="10"/>
  <text class="d-text" x="505" y="168" text-anchor="middle">walk both ways</text>
  <text class="d-sub" x="505" y="192" text-anchor="middle">stop at an edge or another mark</text>
  <rect class="d-box-accent" x="360" y="240" width="290" height="50" rx="10"/>
  <text class="d-text d-accent" x="505" y="270" text-anchor="middle">at most 8 x (M - 1) reads</text>
</svg>

Any new line of M must pass through the cell just played, so the four accent lines are the only places worth looking. Each direction stops as soon as it has collected M cells, so the work does not depend on N.

## 4. Build It Step by Step

### Step 1: a flat board and the last-move win check

The board is one flat array of <code>n * n</code> cells; cell (row, col) lives at <code>row * n + col</code>. 📌 **Interview term: Row-major indexing** — storing a 2D grid in one array row after row. It keeps copies cheap and keys simple, but you must check row and column bounds yourself: index 4 plus one on a 5-wide board is index 5, which is the *next row*, not a neighbour.

\`\`\`js
// Right, down, down-right, down-left. Each
// is walked both ways from the last move.
export const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export const playerAt = (moveNumber) =>
  moveNumber % 2 === 0 ? "X" : "O";

// Only lines through the LAST move can
// be new wins, so check just those:
// at most 4 directions x 2 sides x (m - 1) cells = O(m), whatever n is.
export function checkWinFrom(board, n, m, index) {
  const player = board[index];
  if (!player) return null;
  const row = Math.floor(index / n);
  const col = index % n;
  for (const [dr, dc] of DIRECTIONS) {
    const line = [index];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        line.length < m &&
        r >= 0 &&
        r < n &&
        c >= 0 &&
        c < n &&
        board[r * n + c] === player
      ) {
        line.push(r * n + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= m)
      return { player, line: line.sort((a, b) => a - b) };
  }
  return null;
}
\`\`\`

How it works, in words: take the player at the last cell. For each of the four direction vectors, start a <code>line</code> containing just that cell, walk forward collecting cells of the same player, then walk backward from the start. The <code>while</code> condition stops at the board edge (the <code>r</code> and <code>c</code> bounds, never the flat index), at a different mark, or once <code>line</code> has M cells. If any direction reaches M, return the cells sorted for highlighting.

📌 **Interview term: Time complexity O(M)** — the number of reads grows with M, not with the board. At most 4 directions times 2 sides times (M - 1) cells, plus the starting cell. A full-board scan is O(N² · M). The Verified section counts the reads.

Walking *both* ways is not optional. In the 3 x 3 test below, X plays cells 0 and 2 first and cell 1 last. The last move sits in the middle of the line, so walking only one way from it finds two cells and misses the win.

### Step 2: history as moves plus a pointer

\`\`\`js
// Rebuild the position after the first \`step\`
// moves. History stores moves, not boards.
export function replay(n, m, moves, step) {
  const board = Array(n * n).fill(null);
  let winner = null;
  for (let i = 0; i < step && !winner; i++) {
    board[moves[i]] = playerAt(i);
    winner = checkWinFrom(board, n, m, moves[i]);
  }
  const draw = !winner && step === n * n;
  return { board, winner, draw, next: playerAt(step) };
}
\`\`\`

<code>replay</code> rebuilds the board from the first <code>step</code> moves and runs the O(M) check after each placement, stopping at the first win. Rebuilding costs O(step · M) plus allocating <code>n * n</code> cells, which for N up to 8 is nothing. If boards were huge, you would cache snapshots every k moves; mention that, do not build it.

\`\`\`jsx
export default function App() {
  const [n, setN] = useState(5);
  const [m, setM] = useState(4);
  // cell index of every move, in order
  const [moves, setMoves] = useState([]);
  // how many of those moves are on the board
  const [step, setStep] = useState(0);

  const game = replay(n, m, moves, step);  // derived, never stored
  const gameOver = Boolean(game.winner) || game.draw;

  function play(i) {
    if (gameOver || game.board[i]) return;
    // a new move drops the redo future
    const next = moves.slice(0, step).concat(i);
    setMoves(next);
    setStep(next.length);
  }

  function resize(size) {
    setN(size);
    setM((need) => Math.min(need, size));
    setMoves([]);
    setStep(0);
  }

  function changeNeed(need) {
    setM(need);
    setMoves([]);
    setStep(0);
  }
\`\`\`

- 📌 **Interview term: Truncating the redo future** — <code>moves.slice(0, step).concat(i)</code> throws away every move after the current step before adding the new one. Without it, jumping back to move 3 and playing would leave moves 4 to 7 hanging after the new move, and replay would produce nonsense. The same rule drives the [Undoable Counter](/interview-question/build-an-undoable-counter-undo-redo-history).
- <code>resize</code> clamps M with <code>Math.min(need, size)</code>, so a 3 x 3 board can never ask for 4 in a row.
- <code>step</code> is separate from <code>moves.length</code> so a jump does not lose the later moves until you actually play over them.

### Step 3: a keyboard-friendly grid

Tabbing through 64 cells is miserable. The board uses a roving tabindex instead:

\`\`\`jsx
import { useState } from "react";
import { coords, moveFocus } from "./game";

export default function Board({
  n,
  m,
  board,
  winLine,
  gameOver,
  onPlay,
}) {
  // Roving tabindex: one cell is in the tab order, arrows move it.
  const [focusIdx, setFocusIdx] = useState(0);
  const active = Math.min(focusIdx, n * n - 1);

  function handleKeyDown(e) {
    const next = moveFocus(active, e.key, n);
    if (next === active) return;
    e.preventDefault();
    setFocusIdx(next);
    e.currentTarget
      .querySelector('[data-index="' + next + '"]')
      .focus();
  }

  return (
    <div
      className="board"
      role="group"
      aria-label={
        "Board " + n + " by " + n + ", " + m + " in a row wins"
      }
      style={{ gridTemplateColumns: "repeat(" + n + ", 1fr)" }}
      onKeyDown={handleKeyDown}
    >
      {board.map((value, i) => (
        <button
          key={i}
          type="button"
          data-index={i}
          data-testid={"cell-" + i}
          tabIndex={i === active ? 0 : -1}
          className={
            "cell" +
            (winLine.includes(i) ? " win" : "") +
            (value ? " " + value.toLowerCase() : "")
          }
          aria-label={coords(i, n) + ", " + (value || "empty")}
          aria-disabled={Boolean(value) || gameOver}
          onFocus={() => setFocusIdx(i)}
          onClick={() => {
            setFocusIdx(i);
            onPlay(i);
          }}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
\`\`\`

📌 **Interview term: Roving tabindex** — in a composite widget, exactly one item has <code>tabIndex={0}</code> (Tab lands there) and the rest have <code>-1</code>. Arrow keys move focus and the 0 moves with it. One keydown listener on the container handles every cell, and <code>moveFocus</code> is a pure function in <code>game.js</code> that clamps at the edges.

Two details that separate a good answer:

- **<code>aria-disabled</code>, not <code>disabled</code>.** A disabled button cannot receive focus, so arrows would skip filled cells or lose focus completely when the cell under it is played. <code>aria-disabled="true"</code> tells assistive tech the cell is unavailable while keeping it focusable; <code>play()</code> in <code>App</code> ignores it anyway.
- **<code>onFocus</code> syncs the tab stop.** If the user clicks or tabs into a cell, that cell becomes the active one, so the next arrow press starts from where focus really is.

When N or M changes, <code>App</code> renders <code>&lt;Board key={n + "x" + m} ... /&gt;</code>. A new key makes React throw away the old Board and mount a fresh one, so the focus index resets to 0 for free. See [using key to reset state](/interview-question/how-can-the-key-prop-be-used-to-deliberately-reset-component-state).

### Step 4: the move list

<code>History</code> renders "Game start" plus one button per move ("Move 3: X at row 2, column 2"), and marks the current one with <code>aria-current="step"</code> so screen readers say which position is shown. Clicking calls <code>setStep</code>.

## 5. Verified

**Reads per win check.** A node script wrapped the board in a <code>Proxy</code> that counts cell reads, placed a winning run in the middle of a scattered position, and compared <code>checkWinFrom</code> with a naive full-board scan:

\`\`\`text
n=3 m=3      | last-move check: X reads 3 | full scan: X reads 11
n=15 m=5     | last-move check: X reads 6 | full scan: X reads 148
n=100 m=5    | last-move check: X reads 6 | full scan: X reads 6813
winning move ends replay | moves applied = 7 | Winner: X 0,6,12,18
3x3 full board           | Draw
time travel to step 4    | Next player: X | XOX.O....
\`\`\`

On a 100 x 100 board the last-move check read 6 cells; the full scan read 6,813 before finding the same line. The last three lines show replay stopping at the first win (the 8th move in the list is never applied), a full 3 x 3 draw, and a jump to step 4.

**The component.** Rendered in <code>&lt;StrictMode&gt;</code> in jsdom; the driver clicked cells, changed the <code>&lt;select&gt;</code>s and pressed arrow keys on the focused element:

\`\`\`text
RENDERED: Tic-Tac-Toe IIBoard size3 x 34 x 45 x 56 x 67 x 78 x 8In a row to win345Next player: XGame start
start       : Next player: X | cells = 25 | need = 4 | Board 5 by 5, 4 in a row wins
diagonal    : Winner: X | win cells = 0,6,12,18
history     : 8 entries, last = Move 7: X at row 4, column 4
after win   : cell 24 = "" | aria-disabled = true
jump to 3   : Next player: O | marks = 3 | current = Move 3: X at row 2, column 2 | entries = 8
new move    : Next player: X | marks = 4 | entries = 5 | last = Move 4: O at row 5, column 5
filled cell : Next player: X | marks = 4
tab stop    : 0 (the last clicked cell)
focus 24    : tab stop = 24 | focused = 24
ArrowLeft   : focused = 23 | tab stop = 23
ArrowUp     : focused = 18
Home        : focused = 15
ArrowLeft x : focused = 15 (clamped at the edge)
size 3      : Next player: X | cells = 9 | need = 3 | need options = 3 | entries = 1
3x3 middle  : Winner: X | win cells = 0,1,2
6x6 need 5  : Winner: X | win cells = 0,7,14,21,28 | last = Move 9: X at row 5, column 5
\`\`\`

Read it top to bottom: a 5 x 5 diagonal win on cells 0, 6, 12, 18; jumping to move 3 keeps all 8 history entries until a new move at cell 24 cuts them to 5; arrows move real DOM focus and the single tab stop with it, clamping at the left edge; size 3 clamps M to 3; a win completed from the middle of a row (move order 0, 2, 1) is found; and a 6 x 6 board with M = 5 finds the five-cell diagonal. The driver had to call <code>.focus()</code> on cell 24 directly to simulate tabbing in, because jsdom does not implement Tab navigation.

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Scan near an edge | Bounds checked on row and column, never on the flat index, so lines cannot wrap |
| Winning move in the middle of a run | Both directions walked from the last move |
| Line longer than M | Counts as a win (freestyle); the walk stops collecting at M |
| N shrinks below M | M clamped to N; the game resets |
| Jump back and play | Later moves truncated; history and board stay consistent |
| Keyboard | Roving tabindex, arrows and Home/End, clamped at edges |
| Filled cells | <code>aria-disabled</code> keeps them focusable for navigation |
| Screen readers | Cell labels "row 2, column 3, X"; board label states N and M; status is <code>aria-live</code>; current history entry has <code>aria-current</code> |

## 7. Common Pitfalls

- **Bounds-checking the flat index.** <code>index + 1 &lt; n * n</code> happily walks from the end of one row to the start of the next. Check <code>c &lt; n</code> and <code>r &lt; n</code>.
- **Scanning in one direction only.** Misses every win where the last move is not at an end of the line.
- **Re-scanning the whole board after each move.** Correct, but O(N² · M) and a red flag when the interviewer asked for efficiency.
- **Storing a board snapshot per move without truncating.** Forgetting <code>slice(0, step)</code> leaves a corrupt future after time travel.
- **Using <code>disabled</code> on cells in an arrow-key grid.** Focus falls to the page body when the focused cell is played.
- **Letting M exceed N.** The game becomes unwinnable; clamp it when N changes.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reframe:</strong> <span style="color:#f0e2c8;">"The 3 by 3 version lists 8 lines. With N by N and M in a row that table does not scale, but any new win must pass through the last move, so I only check those four lines."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">"For each direction I walk forward and backward from the last cell, counting the same player, bounded by the row and column edges, and stop once I have M. That is O(M) per move, independent of N."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State:</strong> <span style="color:#f0e2c8;">"State is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m</code>, a list of moves and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code> pointer. The board, winner and draw come from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">replay</code>, so time travel is just changing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edge rules:</strong> <span style="color:#f0e2c8;">"A new move does <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moves.slice(0, step).concat(i)</code> to drop the future, M is clamped when N shrinks, and any config change resets the game."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility and verify:</strong> <span style="color:#f0e2c8;">"Cells use a roving tabindex with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-disabled</code> so arrows work. I test a diagonal, a win from the middle of a row and a wrap-around near the edge."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the complexity of your win check, and of the naive one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mine reads at most 8 times (M - 1) cells plus one, so O(M), and it does not depend on N. Scanning every cell as a possible line start in four directions is O(N squared times M). On a 100 by 100 board I measured 6 reads against about 6,800.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support exactly-M rules, where an overline does not win?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do not stop collecting at M. Walk the full run in both directions, then compare the run length with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=== m</code>. The cost becomes the run length, still bounded by N in one line, and usually tiny.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why store moves instead of boards in history?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Moves are tiny and make the position reproducible; boards cost N squared each. Replaying is cheap for small boards. For very long games I would add a snapshot every k moves and replay from the nearest one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a computer player on a big board?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Full minimax is impossible beyond 3 by 3. A practical answer is a heuristic: score each empty cell by the longest runs it would create or block for each player, using the same directional walk, and pick the best. Run it in a Web Worker if it gets slow.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you render a 50 by 50 board efficiently?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">2,500 buttons is fine for React if each cell is cheap. If profiling showed slow renders, memoize the cell component so only changed cells re-render, or draw on a canvas with a single focusable element and a live region describing the selected cell.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Last-move win check** | Only examine the lines that pass through the cell just played |
| **Row-major indexing** | A 2D grid stored row after row in one array: <code>row * n + col</code> |
| **Time complexity O(M)** | Work grows with the win length, not with the board size |
| **Event sourcing** | Store the list of moves and rebuild the position by replaying them |
| **Truncating the redo future** | Dropping later moves when a new move is made after a jump back |
| **Roving tabindex** | One cell in the tab order; arrow keys move focus and the tab stop |
| **aria-disabled** | Marks a control unavailable without removing it from focus |

---

**Conclusion:** Tic-Tac-Toe II is about not doing work you do not need. A new win can only run through the last move, so a four-direction, two-sided walk capped at M cells replaces the line table and stays O(M) on any board. Store moves plus a step pointer, derive the board by replaying, truncate the future on a new move, and give the grid a roving tabindex so it is usable from the keyboard. Those three ideas, not the drawing of Xs and Os, are what the interviewer is grading.`,
        files: {
          "/App.js": `import { useState } from "react";
import Board from "./src/Board";
import History from "./src/History";
import { replay, statusText } from "./src/game";

const SIZES = [3, 4, 5, 6, 7, 8];

export default function App() {
  const [n, setN] = useState(5);
  const [m, setM] = useState(4);
  const [moves, setMoves] = useState([]); // cell index of every move, in order
  // how many of those moves are on the board
  const [step, setStep] = useState(0);

  const game = replay(n, m, moves, step); // derived, never stored
  const gameOver = Boolean(game.winner) || game.draw;

  function play(i) {
    if (gameOver || game.board[i]) return;
    // a new move drops the redo future
    const next = moves.slice(0, step).concat(i);
    setMoves(next);
    setStep(next.length);
  }

  function resize(size) {
    setN(size);
    setM((need) => Math.min(need, size));
    setMoves([]);
    setStep(0);
  }

  function changeNeed(need) {
    setM(need);
    setMoves([]);
    setStep(0);
  }

  return (
    <main className="ttt">
      <h1>Tic-Tac-Toe II</h1>
      <div className="config">
        <label>
          Board size
          <select
            data-testid="size"
            value={n}
            onChange={(e) => resize(Number(e.target.value))}
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s + " x " + s}
              </option>
            ))}
          </select>
        </label>
        <label>
          In a row to win
          <select
            data-testid="need"
            value={m}
            onChange={(e) => changeNeed(Number(e.target.value))}
          >
            {SIZES.filter((s) => s <= n).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="status" data-testid="status" aria-live="polite">
        {statusText(game)}
      </p>
      <Board
        key={n + "x" + m}
        n={n}
        m={m}
        board={game.board}
        winLine={game.winner ? game.winner.line : []}
        gameOver={gameOver}
        onPlay={play}
      />
      <History moves={moves} step={step} n={n} onJump={setStep} />
    </main>
  );
}
`,
          "/src/Board.js": `import { useState } from "react";
import { coords, moveFocus } from "./game";

export default function Board({ n, m, board, winLine, gameOver, onPlay }) {
  // Roving tabindex: one cell is in the tab order, arrows move it.
  const [focusIdx, setFocusIdx] = useState(0);
  const active = Math.min(focusIdx, n * n - 1);

  function handleKeyDown(e) {
    const next = moveFocus(active, e.key, n);
    if (next === active) return;
    e.preventDefault();
    setFocusIdx(next);
    e.currentTarget.querySelector('[data-index="' + next + '"]').focus();
  }

  return (
    <div
      className="board"
      role="group"
      aria-label={"Board " + n + " by " + n + ", " + m + " in a row wins"}
      style={{ gridTemplateColumns: "repeat(" + n + ", 1fr)" }}
      onKeyDown={handleKeyDown}
    >
      {board.map((value, i) => (
        <button
          key={i}
          type="button"
          data-index={i}
          data-testid={"cell-" + i}
          tabIndex={i === active ? 0 : -1}
          className={
            "cell" +
            (winLine.includes(i) ? " win" : "") +
            (value ? " " + value.toLowerCase() : "")
          }
          aria-label={coords(i, n) + ", " + (value || "empty")}
          aria-disabled={Boolean(value) || gameOver}
          onFocus={() => setFocusIdx(i)}
          onClick={() => {
            setFocusIdx(i);
            onPlay(i);
          }}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
`,
          "/src/History.js": `import { coords, playerAt } from "./game";

export default function History({ moves, step, n, onJump }) {
  return (
    <ol className="history" aria-label="Move history">
      <li>
        <button
          type="button"
          data-testid="jump-0"
          aria-current={step === 0 ? "step" : undefined}
          onClick={() => onJump(0)}
        >
          Game start
        </button>
      </li>
      {moves.map((cell, i) => (
        <li key={i}>
          <button
            type="button"
            data-testid={"jump-" + (i + 1)}
            aria-current={step === i + 1 ? "step" : undefined}
            onClick={() => onJump(i + 1)}
          >
            {"Move " + (i + 1) + ": " + playerAt(i) + " at " + coords(cell, n)}
          </button>
        </li>
      ))}
    </ol>
  );
}
`,
          "/src/game.js": `// Pure game logic for an N x N board where M in a row wins. No framework code.
// The board is a flat array: cell (row, col) lives at index row * n + col.

// Right, down, down-right, down-left. Each
// is walked both ways from the last move.
export const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export const playerAt = (moveNumber) => (moveNumber % 2 === 0 ? "X" : "O");

// Only lines through the LAST move can be new wins, so check just those:
// at most 4 directions x 2 sides x (m - 1) cells = O(m), whatever n is.
export function checkWinFrom(board, n, m, index) {
  const player = board[index];
  if (!player) return null;
  const row = Math.floor(index / n);
  const col = index % n;
  for (const [dr, dc] of DIRECTIONS) {
    const line = [index];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        line.length < m &&
        r >= 0 &&
        r < n &&
        c >= 0 &&
        c < n &&
        board[r * n + c] === player
      ) {
        line.push(r * n + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= m) return { player, line: line.sort((a, b) => a - b) };
  }
  return null;
}

// Rebuild the position after the first \`step\`
// moves. History stores moves, not boards.
export function replay(n, m, moves, step) {
  const board = Array(n * n).fill(null);
  let winner = null;
  for (let i = 0; i < step && !winner; i++) {
    board[moves[i]] = playerAt(i);
    winner = checkWinFrom(board, n, m, moves[i]);
  }
  const draw = !winner && step === n * n;
  return { board, winner, draw, next: playerAt(step) };
}

export function statusText(game) {
  if (game.winner) return "Winner: " + game.winner.player;
  if (game.draw) return "Draw";
  return "Next player: " + game.next;
}

// Arrow-key movement inside the grid, clamped at the edges.
export function moveFocus(index, key, n) {
  const row = Math.floor(index / n);
  const col = index % n;
  if (key === "ArrowRight") return row * n + Math.min(n - 1, col + 1);
  if (key === "ArrowLeft") return row * n + Math.max(0, col - 1);
  if (key === "ArrowDown") return Math.min(n - 1, row + 1) * n + col;
  if (key === "ArrowUp") return Math.max(0, row - 1) * n + col;
  if (key === "Home") return row * n;
  if (key === "End") return row * n + n - 1;
  return index;
}

export const coords = (index, n) =>
  "row " + (Math.floor(index / n) + 1) + ", column " + ((index % n) + 1);
`,
          "/styles.css": `body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}
.ttt {
  max-width: 420px;
  margin: 0 auto;
  padding: 24px 16px;
}
.ttt h1 {
  font-size: 1.4rem;
  margin: 0 0 12px;
  text-align: center;
}
.config {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.config label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: #94a3b8;
}
.config select {
  padding: 6px 8px;
  border-radius: 6px;
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid #475569;
}
.status {
  text-align: center;
  min-height: 1.5em;
  font-weight: 600;
  color: #fbbf24;
}
.board {
  display: grid;
  gap: 6px;
  margin: 12px 0;
}
.cell {
  aspect-ratio: 1;
  min-width: 0;
  font-size: clamp(1rem, 6vw, 1.8rem);
  font-weight: 700;
  border: 2px solid #334155;
  border-radius: 8px;
  background: #1e293b;
  color: #e2e8f0;
  cursor: pointer;
  padding: 0;
}
.cell[aria-disabled="true"] {
  cursor: default;
}
.cell:focus-visible {
  outline: 3px solid #38bdf8;
  outline-offset: 2px;
}
.cell.x {
  color: #38bdf8;
}
.cell.o {
  color: #f472b6;
}
.cell.win {
  background: #14532d;
  border-color: #22c55e;
}
.history {
  padding-left: 1.5em;
  font-size: 0.9rem;
}
.history button {
  background: none;
  border: none;
  color: #93c5fd;
  cursor: pointer;
  padding: 2px 0;
  text-align: left;
}
.history button[aria-current="step"] {
  color: #fbbf24;
  font-weight: 700;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers who can build the basic 3 x 3 game and want the harder follow-up. Comfortable with <code>ref</code>, <code>computed</code>, props and emits.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> for the vocabulary. This doc builds on [Build Tic-Tac-Toe](/interview-question/build-tic-tac-toe) and focuses on the N x N board, the O(M) win check, history and keyboard navigation. Excerpts come from the runnable solution; the Verified section is real output from Vue 3.5.44.

## 1. A Story First

A Gomoku referee does not rescan a 15 by 15 board after every stone. They look along the row, column and two diagonals of the stone just placed. Any new five must pass through it, because every older line was already checked when its own last stone landed. And the scorer does not photograph each position; they write down the moves, and any position can be rebuilt by replaying the list.

Those two habits are the whole design: a last-move win check, and history stored as moves plus a pointer.

## 2. The Plan

The rules live in <code>src/game.js</code> (no Vue): <code>checkWinFrom(board, n, m, index)</code>, <code>replay(n, m, moves, step)</code>, <code>statusText</code>, <code>moveFocus</code> for arrow keys, and <code>coords</code> for labels.

| Value | Vue tool |
| :--- | :--- |
| <code>n</code>, <code>m</code>, <code>moves</code>, <code>step</code> | <code>ref</code> in <code>App.vue</code> |
| Board, winner, draw, next player | <code>computed(() => replay(...))</code> |
| Allowed M values | <code>computed</code> filtered by N |
| Reset on config change | <code>watch([n, m], ...)</code> |
| Focused cell | <code>ref</code> inside <code>GameBoard.vue</code> |

📌 **Interview term: Last-move win check** — only the four lines through the cell just played can contain a new win, so check those and nothing else.

📌 **Interview term: Event sourcing (in miniature)** — keep the list of moves and rebuild the state by replaying it. Time travel becomes "change <code>step</code>".

## 3. Build It Step by Step

### Step 1: the win check

\`\`\`js
// Right, down, down-right, down-left. Each
// is walked both ways from the last move.
export const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export const playerAt = (moveNumber) =>
  moveNumber % 2 === 0 ? "X" : "O";

// Only lines through the LAST move can
// be new wins, so check just those:
// at most 4 directions x 2 sides x (m - 1) cells = O(m), whatever n is.
export function checkWinFrom(board, n, m, index) {
  const player = board[index];
  if (!player) return null;
  const row = Math.floor(index / n);
  const col = index % n;
  for (const [dr, dc] of DIRECTIONS) {
    const line = [index];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        line.length < m &&
        r >= 0 &&
        r < n &&
        c >= 0 &&
        c < n &&
        board[r * n + c] === player
      ) {
        line.push(r * n + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= m)
      return { player, line: line.sort((a, b) => a - b) };
  }
  return null;
}
\`\`\`

The board is a flat array where cell (row, col) is <code>row * n + col</code>. For each direction vector, walk forward then backward from the last cell, collecting the same player, and stop at an edge, a different mark, or once M cells are collected. 📌 **Interview term: O(M) complexity** — at most 8 times (M - 1) reads, whatever N is. The bounds are checked on <code>r</code> and <code>c</code>, never on the flat index, otherwise a row scan would wrap onto the next row.

### Step 2: state, computed and a watch

\`\`\`vue
<script setup>
import { ref, computed, watch } from "vue";
import GameBoard from "./components/GameBoard.vue";
import MoveHistory from "./components/MoveHistory.vue";
import { replay, statusText } from "./game.js";

const SIZES = [3, 4, 5, 6, 7, 8];

const n = ref(5);
const m = ref(4);
const moves = ref([]); // cell index of every move, in order
const step = ref(0); // how many of those moves are on the board

const game = computed(() =>
  replay(n.value, m.value, moves.value, step.value),
);
const gameOver = computed(
  () => Boolean(game.value.winner) || game.value.draw,
);
const needOptions = computed(() => SIZES.filter((s) => s <= n.value));

// A new board size or win length starts
// a new game; M can never exceed N.
watch([n, m], () => {
  if (m.value > n.value) m.value = n.value;
  moves.value = [];
  step.value = 0;
});

function play(i) {
  if (gameOver.value || game.value.board[i]) return;
  // a new move drops the redo future
  moves.value = moves.value.slice(0, step.value).concat(i);
  step.value = moves.value.length;
}
</script>
\`\`\`

- <code>game</code> is a single [computed](/interview-question/what-is-the-difference-between-computed-and-watch) that replays the moves. Everything the template needs (board, winner, draw) hangs off it.
- The <code>watch</code> is a real side effect, not derived data: when N or M changes it resets the moves and clamps M to N. Clamping M re-triggers the watch once, which resets again harmlessly.
- <code>moves.value.slice(0, step.value).concat(i)</code> drops the redo future before adding the new move. 📌 **Interview term: Truncating the future** — without it, playing after a jump back would leave old moves after the new one.

### Step 3: the template

\`\`\`vue
<template>
  <main class="ttt">
    <h1>Tic-Tac-Toe II</h1>
    <div class="config">
      <label>
        Board size
        <select v-model.number="n" data-testid="size">
          <option v-for="s in SIZES" :key="s" :value="s">
            {{ s + " x " + s }}
          </option>
        </select>
      </label>
      <label>
        In a row to win
        <select v-model.number="m" data-testid="need">
          <option v-for="s in needOptions" :key="s" :value="s">
            {{ s }}
          </option>
        </select>
      </label>
    </div>
    <p class="status" data-testid="status" aria-live="polite">
      {{ statusText(game) }}
    </p>
    <GameBoard
      :key="n + 'x' + m"
      :n="n"
      :m="m"
      :board="game.board"
      :win-line="game.winner ? game.winner.line : []"
      :game-over="gameOver"
      @play="play"
    />
    <MoveHistory
      :moves="moves"
      :step="step"
      :n="n"
      @jump="(s) => (step = s)"
    />
  </main>
</template>
\`\`\`

- <code>v-model.number</code> on each <code>&lt;select&gt;</code> keeps N and M as numbers. See [v-model on form inputs](/interview-question/how-does-v-model-work-on-form-inputs).
- <code>:key="n + 'x' + m"</code> on <code>GameBoard</code> remounts it when the config changes, so its focus state starts fresh. See [why :key matters](/interview-question/why-is-the-key-attribute-important-in-v-for).

### Step 4: a roving tabindex grid

\`\`\`vue
// Roving tabindex: one cell is in the tab order, arrows move it. const
focusIdx = ref(0); const active = computed(() =>
Math.min(focusIdx.value, props.n * props.n - 1)); function onKeydown(e)
{ const next = moveFocus(active.value, e.key, props.n); if (next ===
active.value) return; e.preventDefault(); focusIdx.value = next;
e.currentTarget.querySelector('[data-index="' + next + '"]').focus(); }
function onClick(i) { focusIdx.value = i; emit("play", i); }
</script>

<template>
  <div
    class="board"
    role="group"
    :aria-label="'Board ' + n + ' by ' + n + ', ' + m + ' in a row wins'"
    :style="{ gridTemplateColumns: 'repeat(' + n + ', 1fr)' }"
    @keydown="onKeydown"
  >
    <button
      v-for="(value, i) in board"
      :key="i"
      type="button"
      :data-index="i"
      :data-testid="'cell-' + i"
      :tabindex="i === active ? 0 : -1"
      :class="['cell', { win: winLine.includes(i), x: value === 'X', o: value === 'O' }]"
      :aria-label="coords(i, n) + ', ' + (value || 'empty')"
      :aria-disabled="Boolean(value) || gameOver"
      @focus="focusIdx = i"
      @click="onClick(i)"
    >
      {{ value }}
    </button>
  </div>
</template>
\`\`\`

📌 **Interview term: Roving tabindex** — only the active cell has <code>tabindex="0"</code>; arrow keys move focus and the tab stop together. One <code>@keydown</code> on the container handles all cells. <code>@focus="focusIdx = i"</code> keeps the tab stop in sync when the user clicks or tabs in.

Cells use <code>:aria-disabled</code> instead of <code>:disabled</code>: a disabled button cannot be focused, so arrow navigation would break the moment the focused cell was played. <code>App.play</code> ignores filled cells anyway.

<code>MoveHistory.vue</code> renders one button per move and marks the current one with <code>aria-current="step"</code>; clicking emits <code>jump</code> and the parent sets <code>step</code>.

## 4. Verified

The rules were checked with node; a <code>Proxy</code> counted cell reads for the last-move check against a full-board scan:

\`\`\`text
n=3 m=3      | last-move check: X reads 3 | full scan: X reads 11
n=15 m=5     | last-move check: X reads 6 | full scan: X reads 148
n=100 m=5    | last-move check: X reads 6 | full scan: X reads 6813
winning move ends replay | moves applied = 7 | Winner: X 0,6,12,18
3x3 full board           | Draw
time travel to step 4    | Next player: X | XOX.O....
\`\`\`

The SFCs were then compiled with <code>@vue/compiler-sfc</code>, mounted in jsdom, and driven with clicks, <code>&lt;select&gt;</code> changes and arrow keys:

\`\`\`text
RENDERED: Tic-Tac-Toe II Board size 3 x 34 x 45 x 56 x 67 x 78 x 8 In a row to win 345Next player: X Game start
start       : Next player: X | cells = 25 | need = 4 | Board 5 by 5, 4 in a row wins
diagonal    : Winner: X | win cells = 0,6,12,18
history     : 8 entries, last = Move 7: X at row 4, column 4
after win   : cell 24 = "" | aria-disabled = true
jump to 3   : Next player: O | marks = 3 | current = Move 3: X at row 2, column 2 | entries = 8
new move    : Next player: X | marks = 4 | entries = 5 | last = Move 4: O at row 5, column 5
filled cell : Next player: X | marks = 4
tab stop    : 0 (the last clicked cell)
focus 24    : tab stop = 24 | focused = 24
ArrowLeft   : focused = 23 | tab stop = 23
ArrowUp     : focused = 18
Home        : focused = 15
ArrowLeft x : focused = 15 (clamped at the edge)
size 3      : Next player: X | cells = 9 | need = 3 | need options = 3 | entries = 1
3x3 middle  : Winner: X | win cells = 0,1,2
6x6 need 5  : Winner: X | win cells = 0,7,14,21,28 | last = Move 9: X at row 5, column 5
\`\`\`

These lines match the React and Angular builds exactly. jsdom does not implement Tab navigation, so the driver called <code>.focus()</code> on cell 24 to simulate tabbing in.

## 5. Common Pitfalls

- **Watching to compute the winner.** Use a computed; a watch that copies the winner into a ref can lag one update behind.
- **Mutating <code>moves.value</code> with <code>push</code> after a jump.** It skips the truncation; build a new array from <code>slice(0, step)</code>.
- **Bounds-checking the flat index.** Index arithmetic wraps rows; check row and column separately.
- **<code>:disabled</code> on grid cells.** Breaks arrow-key focus; use <code>:aria-disabled</code>.
- **Forgetting to clamp M.** A 3 x 3 board with M = 4 can never be won.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reframe:</strong> <span style="color:#f0e2c8;">"The 8-line table only works for 3 by 3. A new win must pass through the last move, so I check four directions from it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">"Walk both ways along each direction with row and column bounds, stop after M cells. That is O(M) per move regardless of N."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moves</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code> are refs; one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> replays the moves to get the board and the winner."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Rules around it:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on N and M resets the game and clamps M; a new move slices off the future before appending."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keyboard and verify:</strong> <span style="color:#f0e2c8;">"The grid uses a roving tabindex with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-disabled</code>. I test a diagonal, a win from the middle of a row, and an edge where a naive scan would wrap."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watch</code> for the reset and not a computed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Resetting changes other state (moves, step, m), which is a side effect. Computed values must be pure; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> is the tool for reacting to a change by writing state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shallowRef</code> help here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, a little. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moves</code> is always replaced, never mutated, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> avoids making a deep proxy of the array. For 64 numbers it does not matter, but it states the intent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support exactly-M rules?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Walk the full run in both directions without stopping at M, then compare the length with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=== m</code>. The cost is the run length, still small.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you extract the logic for reuse?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wrap the refs, the computed and the actions in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTicTacToe(n, m)</code> composable that returns the state and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">play</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jump</code>. The pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">game.js</code> stays underneath it for unit tests.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Last-move win check** | Examine only the lines through the cell just played |
| **O(M) complexity** | Work grows with the win length, not the board size |
| **Event sourcing** | Store moves; rebuild positions by replaying |
| **Truncating the future** | Dropping later moves when playing after a jump back |
| **Roving tabindex** | One focusable cell; arrows move focus and the tab stop |

---

**Conclusion:** In Vue, Tic-Tac-Toe II is four refs, one computed that replays the move list, a watch that resets on config changes, and a pure O(M) win check underneath. Add a roving tabindex grid with <code>aria-disabled</code> cells and the game scales to any board the interviewer names while staying fast, testable and keyboard friendly.`,
        files: {
          "/src/App.vue": `<script setup>
import { ref, computed, watch } from "vue";
import GameBoard from "./components/GameBoard.vue";
import MoveHistory from "./components/MoveHistory.vue";
import { replay, statusText } from "./game.js";

const SIZES = [3, 4, 5, 6, 7, 8];

const n = ref(5);
const m = ref(4);
const moves = ref([]); // cell index of every move, in order
const step = ref(0); // how many of those moves are on the board

const game = computed(() => replay(n.value, m.value, moves.value, step.value));
const gameOver = computed(() => Boolean(game.value.winner) || game.value.draw);
const needOptions = computed(() => SIZES.filter((s) => s <= n.value));

// A new board size or win length starts a new game; M can never exceed N.
watch([n, m], () => {
  if (m.value > n.value) m.value = n.value;
  moves.value = [];
  step.value = 0;
});

function play(i) {
  if (gameOver.value || game.value.board[i]) return;
  // a new move drops the redo future
  moves.value = moves.value.slice(0, step.value).concat(i);
  step.value = moves.value.length;
}
</script>

<template>
  <main class="ttt">
    <h1>Tic-Tac-Toe II</h1>
    <div class="config">
      <label>
        Board size
        <select v-model.number="n" data-testid="size">
          <option v-for="s in SIZES" :key="s" :value="s">
            {{ s + " x " + s }}
          </option>
        </select>
      </label>
      <label>
        In a row to win
        <select v-model.number="m" data-testid="need">
          <option v-for="s in needOptions" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
    </div>
    <p class="status" data-testid="status" aria-live="polite">
      {{ statusText(game) }}
    </p>
    <GameBoard
      :key="n + 'x' + m"
      :n="n"
      :m="m"
      :board="game.board"
      :win-line="game.winner ? game.winner.line : []"
      :game-over="gameOver"
      @play="play"
    />
    <MoveHistory :moves="moves" :step="step" :n="n" @jump="(s) => (step = s)" />
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}
.ttt {
  max-width: 420px;
  margin: 0 auto;
  padding: 24px 16px;
}
.ttt h1 {
  font-size: 1.4rem;
  margin: 0 0 12px;
  text-align: center;
}
.config {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.config label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: #94a3b8;
}
.config select {
  padding: 6px 8px;
  border-radius: 6px;
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid #475569;
}
.status {
  text-align: center;
  min-height: 1.5em;
  font-weight: 600;
  color: #fbbf24;
}
</style>
`,
          "/src/components/GameBoard.vue": `<script setup>
import { ref, computed } from "vue";
import { coords, moveFocus } from "../game.js";

const props = defineProps({
  n: { type: Number, required: true },
  m: { type: Number, required: true },
  board: { type: Array, required: true },
  winLine: { type: Array, default: () => [] },
  gameOver: { type: Boolean, default: false },
});
const emit = defineEmits(["play"]);

// Roving tabindex: one cell is in the tab order, arrows move it.
const focusIdx = ref(0);
const active = computed(() => Math.min(focusIdx.value, props.n * props.n - 1));

function onKeydown(e) {
  const next = moveFocus(active.value, e.key, props.n);
  if (next === active.value) return;
  e.preventDefault();
  focusIdx.value = next;
  e.currentTarget.querySelector('[data-index="' + next + '"]').focus();
}

function onClick(i) {
  focusIdx.value = i;
  emit("play", i);
}
</script>

<template>
  <div
    class="board"
    role="group"
    :aria-label="'Board ' + n + ' by ' + n + ', ' + m + ' in a row wins'"
    :style="{ gridTemplateColumns: 'repeat(' + n + ', 1fr)' }"
    @keydown="onKeydown"
  >
    <button
      v-for="(value, i) in board"
      :key="i"
      type="button"
      :data-index="i"
      :data-testid="'cell-' + i"
      :tabindex="i === active ? 0 : -1"
      :class="['cell', { win: winLine.includes(i), x: value === 'X', o: value === 'O' }]"
      :aria-label="coords(i, n) + ', ' + (value || 'empty')"
      :aria-disabled="Boolean(value) || gameOver"
      @focus="focusIdx = i"
      @click="onClick(i)"
    >
      {{ value }}
    </button>
  </div>
</template>

<style scoped>
.board {
  display: grid;
  gap: 6px;
  margin: 12px 0;
}
.cell {
  aspect-ratio: 1;
  min-width: 0;
  font-size: clamp(1rem, 6vw, 1.8rem);
  font-weight: 700;
  border: 2px solid #334155;
  border-radius: 8px;
  background: #1e293b;
  color: #e2e8f0;
  cursor: pointer;
  padding: 0;
}
.cell[aria-disabled="true"] {
  cursor: default;
}
.cell:focus-visible {
  outline: 3px solid #38bdf8;
  outline-offset: 2px;
}
.cell.x {
  color: #38bdf8;
}
.cell.o {
  color: #f472b6;
}
.cell.win {
  background: #14532d;
  border-color: #22c55e;
}
</style>
`,
          "/src/components/MoveHistory.vue": `<script setup>
import { coords, playerAt } from "../game.js";

defineProps({
  moves: { type: Array, required: true },
  step: { type: Number, required: true },
  n: { type: Number, required: true },
});
const emit = defineEmits(["jump"]);
</script>

<template>
  <ol class="history" aria-label="Move history">
    <li>
      <button
        type="button"
        data-testid="jump-0"
        :aria-current="step === 0 ? 'step' : undefined"
        @click="emit('jump', 0)"
      >
        Game start
      </button>
    </li>
    <li v-for="(cell, i) in moves" :key="i">
      <button
        type="button"
        :data-testid="'jump-' + (i + 1)"
        :aria-current="step === i + 1 ? 'step' : undefined"
        @click="emit('jump', i + 1)"
      >
        {{ "Move " + (i + 1) + ": " + playerAt(i) + " at " + coords(cell, n) }}
      </button>
    </li>
  </ol>
</template>

<style scoped>
.history {
  padding-left: 1.5em;
  font-size: 0.9rem;
}
.history button {
  background: none;
  border: none;
  color: #93c5fd;
  cursor: pointer;
  padding: 2px 0;
  text-align: left;
}
.history button[aria-current="step"] {
  color: #fbbf24;
  font-weight: 700;
}
</style>
`,
          "/src/game.js": `// Pure game logic for an N x N board where M in a row wins. No framework code.
// The board is a flat array: cell (row, col) lives at index row * n + col.

// Right, down, down-right, down-left. Each
// is walked both ways from the last move.
export const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export const playerAt = (moveNumber) => (moveNumber % 2 === 0 ? "X" : "O");

// Only lines through the LAST move can be new wins, so check just those:
// at most 4 directions x 2 sides x (m - 1) cells = O(m), whatever n is.
export function checkWinFrom(board, n, m, index) {
  const player = board[index];
  if (!player) return null;
  const row = Math.floor(index / n);
  const col = index % n;
  for (const [dr, dc] of DIRECTIONS) {
    const line = [index];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        line.length < m &&
        r >= 0 &&
        r < n &&
        c >= 0 &&
        c < n &&
        board[r * n + c] === player
      ) {
        line.push(r * n + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= m) return { player, line: line.sort((a, b) => a - b) };
  }
  return null;
}

// Rebuild the position after the first \`step\`
// moves. History stores moves, not boards.
export function replay(n, m, moves, step) {
  const board = Array(n * n).fill(null);
  let winner = null;
  for (let i = 0; i < step && !winner; i++) {
    board[moves[i]] = playerAt(i);
    winner = checkWinFrom(board, n, m, moves[i]);
  }
  const draw = !winner && step === n * n;
  return { board, winner, draw, next: playerAt(step) };
}

export function statusText(game) {
  if (game.winner) return "Winner: " + game.winner.player;
  if (game.draw) return "Draw";
  return "Next player: " + game.next;
}

// Arrow-key movement inside the grid, clamped at the edges.
export function moveFocus(index, key, n) {
  const row = Math.floor(index / n);
  const col = index % n;
  if (key === "ArrowRight") return row * n + Math.min(n - 1, col + 1);
  if (key === "ArrowLeft") return row * n + Math.max(0, col - 1);
  if (key === "ArrowDown") return Math.min(n - 1, row + 1) * n + col;
  if (key === "ArrowUp") return Math.max(0, row - 1) * n + col;
  if (key === "Home") return row * n;
  if (key === "End") return row * n + n - 1;
  return index;
}

export const coords = (index, n) =>
  "row " + (Math.floor(index / n) + 1) + ", column " + ((index % n) + 1);
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers who can build the basic 3 x 3 game and want the harder follow-up. Comfortable with signals, <code>@Input</code>/<code>@Output</code> and the built-in control flow.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> for the vocabulary. This builds on [Build Tic-Tac-Toe](/interview-question/build-tic-tac-toe) and covers the N x N board, the O(M) win check, history and keyboard navigation. Excerpts come from the runnable solution; Verified output is from Angular 22.2.3, AOT with strict templates and runtime JIT.

## 1. A Story First

A Gomoku referee checks only the row, column and diagonals of the stone just placed, because any new five must pass through it. The scorer writes down moves rather than photographing boards, so any position can be replayed. Our Angular component does both: an O(M) check from the last move, and history as a move list plus a <code>step</code> pointer.

## 2. The Plan

<code>game.ts</code> holds the rules with types (<code>Player</code>, <code>Cell</code>, <code>Win</code>, <code>Game</code>) and no Angular imports: <code>checkWinFrom</code>, <code>replay</code>, <code>statusText</code>, <code>moveFocus</code>, <code>coords</code>.

| Value | Angular tool |
| :--- | :--- |
| <code>n</code>, <code>m</code>, <code>moves</code>, <code>step</code> | <code>signal</code> in <code>AppComponent</code> |
| Board, winner, draw, next player | <code>computed(() => replay(...))</code> |
| Focused cell | <code>signal</code> in <code>BoardComponent</code>, reset in <code>ngOnChanges</code> |

📌 **Interview term: Last-move win check** — only the four lines through the newest mark can hold a new win. Walk each both ways from that cell, capped at M cells: O(M), independent of N.

## 3. Build It Step by Step

### Step 1: the win check

\`\`\`ts
// Only lines through the LAST move can
// be new wins, so check just those:
// at most 4 directions x 2 sides x (m - 1) cells = O(m), whatever n is.
export function checkWinFrom(
  board: Cell[],
  n: number,
  m: number,
  index: number,
): Win | null {
  const player = board[index];
  if (!player) return null;
  const row = Math.floor(index / n);
  const col = index % n;
  for (const [dr, dc] of DIRECTIONS) {
    const line = [index];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        line.length < m &&
        r >= 0 &&
        r < n &&
        c >= 0 &&
        c < n &&
        board[r * n + c] === player
      ) {
        line.push(r * n + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= m)
      return { player, line: line.sort((a, b) => a - b) };
  }
  return null;
}
\`\`\`

Bounds are checked on row and column, never on the flat index (<code>row * n + col</code>), so a horizontal walk cannot wrap onto the next row. Walking both ways finds wins where the last move is in the middle.

### Step 2: signals and actions

\`\`\`ts
export class AppComponent {
  readonly sizes = SIZES;
  readonly n = signal(5);
  readonly m = signal(4);
  // cell index of every move, in order
  readonly moves = signal<number[]>([]);
  readonly step = signal(0); // how many of those moves are on the board

  readonly game = computed(() =>
    replay(this.n(), this.m(), this.moves(), this.step()),
  );
  readonly gameOver = computed(
    () => !!this.game().winner || this.game().draw,
  );
  readonly status = computed(() => statusText(this.game()));
  readonly needOptions = computed(() =>
    SIZES.filter((s) => s <= this.n()),
  );

  play(i: number): void {
    if (this.gameOver() || this.game().board[i]) return;
    // a new move drops the redo future
    const next = this.moves().slice(0, this.step()).concat(i);
    this.moves.set(next);
    this.step.set(next.length);
  }

  resize(size: number): void {
    this.n.set(size);
    this.m.update((need) => Math.min(need, size));
    this.reset();
  }

  changeNeed(need: number): void {
    this.m.set(need);
    this.reset();
  }

  private reset(): void {
    this.moves.set([]);
    this.step.set(0);
  }
}
\`\`\`

📌 **Interview term: Truncating the future** — <code>slice(0, step).concat(i)</code> drops moves that were undone by a jump before appending the new one. <code>resize</code> clamps M to N in an <code>update</code>, and both config changes reset the game.

The selects are wired by hand rather than with <code>ngModel</code>, which keeps <code>FormsModule</code> out and makes the reset explicit:

\`\`\`ts
<label>
  Board size
  <select
    data-testid="size"
    (change)="resize(+$any($event.target).value)"
  >
    @for (s of sizes; track s) {
      <option [value]="s" [selected]="s === n()">
        {{ s + " x " + s }}
      </option>
    }
  </select>
</label>
<label>
  In a row to win
  <select
    data-testid="need"
    (change)="changeNeed(+$any($event.target).value)"
  >
    @for (s of needOptions(); track s) {
      <option [value]="s" [selected]="s === m()">{{ s }}</option>
    }
  </select></label
>
\`\`\`

<code>$any($event.target).value</code> is a strict-template escape hatch: <code>$event.target</code> is typed as <code>EventTarget | null</code>, which has no <code>value</code>.

### Step 3: the roving tabindex board

\`\`\`ts
template: \`
    <div
      class="board"
      role="group"
      [attr.aria-label]="'Board ' + n + ' by ' + n + ', ' + m + ' in a row wins'"
      [style.grid-template-columns]="'repeat(' + n + ', 1fr)'"
      (keydown)="onKeydown($event)"
    >
      @for (value of board; track $index) {
        <button
          type="button"
          [attr.data-index]="$index"
          [attr.data-testid]="'cell-' + $index"
          [tabIndex]="$index === active() ? 0 : -1"
          class="cell"
          [class.win]="winLine.includes($index)"
          [class.x]="value === 'X'"
          [class.o]="value === 'O'"
          [attr.aria-label]="label($index, value)"
          [attr.aria-disabled]="!!value || gameOver"
          (focus)="active.set($index)"
          (click)="onClick($index)"
        >{{ value }}</button>
      }
    </div>
  \`,
\`\`\`

\`\`\`ts
export class BoardComponent implements OnChanges {
  @Input() n = 3;
  @Input() m = 3;
  @Input() board: Cell[] = [];
  @Input() winLine: number[] = [];
  @Input() gameOver = false;
  @Output() play = new EventEmitter<number>();

  // Roving tabindex: one cell is in the tab order, arrows move it.
  readonly active = signal(0);

  // A new board size or win length is a new
  // game: put the tab stop back on cell 0.
  ngOnChanges(changes: SimpleChanges): void {
    if (changes["n"] || changes["m"]) this.active.set(0);
  }

  label(i: number, value: Cell): string {
    return coords(i, this.n) + ", " + (value || "empty");
  }

  onKeydown(e: KeyboardEvent): void {
    const current = this.active();
    const next = moveFocus(current, e.key, this.n);
    if (next === current) return;
    e.preventDefault();
    this.active.set(next);
    const host = e.currentTarget as HTMLElement;
    host
      .querySelector<HTMLElement>('[data-index="' + next + '"]')
      ?.focus();
  }

  onClick(i: number): void {
    this.active.set(i);
    this.play.emit(i);
  }
}
\`\`\`

📌 **Interview term: Roving tabindex** — exactly one cell has <code>tabIndex</code> 0; arrow keys move real focus and the tab stop. <code>(focus)</code> keeps the signal in sync when the user clicks or tabs in, and <code>aria-disabled</code> (not <code>disabled</code>) keeps filled cells focusable.

📌 **Interview term: ngOnChanges** — a lifecycle hook called with the changed <code>@Input</code>s. React would remount the board with a new <code>key</code>; Angular has no key on components, so the board resets its own focus when <code>n</code> or <code>m</code> changes. An early draft used <code>computed()</code> over <code>this.board.length</code> here; that was a bug, because a decorator <code>@Input</code> is a plain field and <code>computed</code> only tracks signals. See [signal inputs vs @Input](/interview-question/signal-inputs-input-vs-input-what-changes-in-angular-17-1), which the runtime-compiled playground cannot use.

<code>HistoryComponent</code> renders the move buttons with <code>@for</code>, sets <code>[attr.aria-current]</code> to <code>'step'</code> or <code>null</code> (null removes the attribute), and emits <code>jump</code>.

## 4. Verified

The rules were checked with node, counting cell reads with a <code>Proxy</code>:

\`\`\`text
n=3 m=3      | last-move check: X reads 3 | full scan: X reads 11
n=15 m=5     | last-move check: X reads 6 | full scan: X reads 148
n=100 m=5    | last-move check: X reads 6 | full scan: X reads 6813
winning move ends replay | moves applied = 7 | Winner: X 0,6,12,18
3x3 full board           | Draw
time travel to step 4    | Next player: X | XOX.O....
\`\`\`

The components were booted with <code>bootstrapApplication(AppComponent)</code> AOT (ngc, <code>strictTemplates</code>) and JIT, and driven with clicks, select changes and arrow keys. AOT output:

\`\`\`text
RENDERED: Tic-Tac-Toe II Board size 3 x 34 x 45 x 56 x 67 x 78 x 8 In a row to win 345Next player: X Game start
start       : Next player: X | cells = 25 | need = 4 | Board 5 by 5, 4 in a row wins
diagonal    : Winner: X | win cells = 0,6,12,18
history     : 8 entries, last = Move 7: X at row 4, column 4
after win   : cell 24 = "" | aria-disabled = true
jump to 3   : Next player: O | marks = 3 | current = Move 3: X at row 2, column 2 | entries = 8
new move    : Next player: X | marks = 4 | entries = 5 | last = Move 4: O at row 5, column 5
filled cell : Next player: X | marks = 4
tab stop    : 0 (the last clicked cell)
focus 24    : tab stop = 24 | focused = 24
ArrowLeft   : focused = 23 | tab stop = 23
ArrowUp     : focused = 18
Home        : focused = 15
ArrowLeft x : focused = 15 (clamped at the edge)
size 3      : Next player: X | cells = 9 | need = 3 | need options = 3 | entries = 1
3x3 middle  : Winner: X | win cells = 0,1,2
6x6 need 5  : Winner: X | win cells = 0,7,14,21,28 | last = Move 9: X at row 5, column 5
\`\`\`

The JIT run printed identical lines, and both match the React and Vue builds. The driver called <code>.focus()</code> on cell 24 to simulate tabbing in, since jsdom has no Tab navigation.

## 5. Common Pitfalls

- **<code>computed()</code> over decorator inputs.** It never recomputes; read inputs in methods or <code>ngOnChanges</code>.
- **Signal <code>input()</code> in the playground.** It does not register under runtime JIT; use <code>@Input()</code>.
- **Pushing into <code>moves()</code>.** Mutating the array keeps the same reference, so the signal does not notify, and it skips the truncation.
- **Bounds-checking the flat index.** Rows wrap; check row and column.
- **<code>[disabled]</code> on grid cells.** Focus falls to the body when the focused cell is played.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reframe:</strong> <span style="color:#f0e2c8;">"Any new win passes through the last move, so instead of a table of lines I check four directions from it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">"Walk both ways with row and column bounds, cap at M cells: O(M) per move, independent of N."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moves</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code> are signals. One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> replays moves into board, winner and draw."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Rules:</strong> <span style="color:#f0e2c8;">"A new move slices the future off, resizing clamps M to N, and any config change resets."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keyboard and verify:</strong> <span style="color:#f0e2c8;">"The board uses a roving tabindex with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-disabled</code>, reset in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnChanges</code>. I test a diagonal, a middle-of-row win and an edge case."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ngModel</code> for the selects?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works, but needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormsModule</code> and two-way binding, and I want the reset to happen in the same handler that changes N. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(change)</code> handler that calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resize</code> makes the side effect explicit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you move this into a service?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put the signals, the computed game and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">play</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jump</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resize</code> in an injectable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GameStore</code>, inject it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> in both the board and history components, and keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">game.ts</code> pure underneath.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the win check?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plain Jasmine or Vitest tests on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">checkWinFrom</code> with hand-built boards: each direction, a win from the middle, a run touching the edge, and an almost-line that would wrap if bounds were wrong.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is replaying on every change too slow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replay is O(step times M) plus an N squared allocation. For N up to 8 that is microseconds. For long games on big boards, cache a snapshot every k moves.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Last-move win check** | Examine only the lines through the newest mark |
| **Truncating the future** | Dropping later moves when playing after a jump back |
| **Roving tabindex** | One focusable cell; arrows move focus and the tab stop |
| **ngOnChanges** | Lifecycle hook receiving the changed <code>@Input</code>s |

---

**Conclusion:** Angular Tic-Tac-Toe II is four signals, one computed replay, a pure O(M) check from the last move, and a board component that manages its own roving tabindex and resets it in <code>ngOnChanges</code>. Replace arrays instead of mutating them, remember that <code>computed</code> only sees signals, and the game stays correct in both AOT and runtime builds.`,
        files: {
          "/src/app/app.component.ts": `import { Component, computed, signal } from "@angular/core";
import { BoardComponent } from "./board.component";
import { HistoryComponent } from "./history.component";
import { replay, statusText } from "./game";

const SIZES = [3, 4, 5, 6, 7, 8];

@Component({
  selector: "app-root",
  standalone: true,
  imports: [BoardComponent, HistoryComponent],
  template: \`
    <main class="ttt">
      <h1>Tic-Tac-Toe II</h1>
      <div class="config">
        <label>
          Board size
          <select
            data-testid="size"
            (change)="resize(+$any($event.target).value)"
          >
            @for (s of sizes; track s) {
              <option
                [value]="s"
                [selected]="s === n()"
              >{{ s + " x " + s }}</option>
            }
          </select>
        </label>
        <label>
          In a row to win
          <select
            data-testid="need"
            (change)="changeNeed(+$any($event.target).value)"
          >
            @for (s of needOptions(); track s) {
              <option [value]="s" [selected]="s === m()">{{ s }}</option>
            }
          </select>
        </label>
      </div>
      <p
        class="status"
        data-testid="status"
        aria-live="polite"
      >{{ status() }}</p>
      <app-board
        [n]="n()"
        [m]="m()"
        [board]="game().board"
        [winLine]="game().winner?.line ?? []"
        [gameOver]="gameOver()"
        (play)="play($event)"
      />
      <app-history
        [moves]="moves()"
        [step]="step()"
        [n]="n()"
        (jump)="step.set($event)"
      />
    </main>
  \`,
  styles: [
    \`
    :host { display: block; font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    .ttt { max-width: 420px; margin: 0 auto; padding: 24px 16px; }
    .ttt h1 { font-size: 1.4rem; margin: 0 0 12px; text-align: center; }
    .config { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .config label { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; color: #94a3b8; }
    .config select { padding: 6px 8px; border-radius: 6px; background: #1e293b; color: #e2e8f0; border: 1px solid #475569; }
    .status { text-align: center; min-height: 1.5em; font-weight: 600; color: #fbbf24; }
  \`,
  ],
})
export class AppComponent {
  readonly sizes = SIZES;
  readonly n = signal(5);
  readonly m = signal(4);
  readonly moves = signal<number[]>([]); // cell index of every move, in order
  readonly step = signal(0); // how many of those moves are on the board

  readonly game = computed(() =>
    replay(this.n(), this.m(), this.moves(), this.step()),
  );
  readonly gameOver = computed(() => !!this.game().winner || this.game().draw);
  readonly status = computed(() => statusText(this.game()));
  readonly needOptions = computed(() => SIZES.filter((s) => s <= this.n()));

  play(i: number): void {
    if (this.gameOver() || this.game().board[i]) return;
    // a new move drops the redo future
    const next = this.moves().slice(0, this.step()).concat(i);
    this.moves.set(next);
    this.step.set(next.length);
  }

  resize(size: number): void {
    this.n.set(size);
    this.m.update((need) => Math.min(need, size));
    this.reset();
  }

  changeNeed(need: number): void {
    this.m.set(need);
    this.reset();
  }

  private reset(): void {
    this.moves.set([]);
    this.step.set(0);
  }
}
`,
          "/src/app/board.component.ts": `import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  signal,
} from "@angular/core";
import { Cell, coords, moveFocus } from "./game";

@Component({
  selector: "app-board",
  standalone: true,
  template: \`
    <div
      class="board"
      role="group"
      [attr.aria-label]="'Board ' + n + ' by ' + n + ', ' + m + ' in a row wins'"
      [style.grid-template-columns]="'repeat(' + n + ', 1fr)'"
      (keydown)="onKeydown($event)"
    >
      @for (value of board; track $index) {
        <button
          type="button"
          [attr.data-index]="$index"
          [attr.data-testid]="'cell-' + $index"
          [tabIndex]="$index === active() ? 0 : -1"
          class="cell"
          [class.win]="winLine.includes($index)"
          [class.x]="value === 'X'"
          [class.o]="value === 'O'"
          [attr.aria-label]="label($index, value)"
          [attr.aria-disabled]="!!value || gameOver"
          (focus)="active.set($index)"
          (click)="onClick($index)"
        >{{ value }}</button>
      }
    </div>
  \`,
  styles: [
    \`
    .board { display: grid; gap: 6px; margin: 12px 0; }
    .cell { aspect-ratio: 1; min-width: 0; font-size: clamp(1rem, 6vw, 1.8rem); font-weight: 700; border: 2px solid #334155;
      border-radius: 8px; background: #1e293b; color: #e2e8f0; cursor: pointer; padding: 0; }
    .cell[aria-disabled="true"] { cursor: default; }
    .cell:focus-visible { outline: 3px solid #38bdf8; outline-offset: 2px; }
    .cell.x { color: #38bdf8; }
    .cell.o { color: #f472b6; }
    .cell.win { background: #14532d; border-color: #22c55e; }
  \`,
  ],
})
export class BoardComponent implements OnChanges {
  @Input() n = 3;
  @Input() m = 3;
  @Input() board: Cell[] = [];
  @Input() winLine: number[] = [];
  @Input() gameOver = false;
  @Output() play = new EventEmitter<number>();

  // Roving tabindex: one cell is in the tab order, arrows move it.
  readonly active = signal(0);

  // A new board size or win length is a new
  // game: put the tab stop back on cell 0.
  ngOnChanges(changes: SimpleChanges): void {
    if (changes["n"] || changes["m"]) this.active.set(0);
  }

  label(i: number, value: Cell): string {
    return coords(i, this.n) + ", " + (value || "empty");
  }

  onKeydown(e: KeyboardEvent): void {
    const current = this.active();
    const next = moveFocus(current, e.key, this.n);
    if (next === current) return;
    e.preventDefault();
    this.active.set(next);
    const host = e.currentTarget as HTMLElement;
    host.querySelector<HTMLElement>('[data-index="' + next + '"]')?.focus();
  }

  onClick(i: number): void {
    this.active.set(i);
    this.play.emit(i);
  }
}
`,
          "/src/app/game.ts": `// Pure game logic for an N x N board where M in a row wins. No framework code.
// The board is a flat array: cell (row, col) lives at index row * n + col.
export type Player = "X" | "O";
export type Cell = Player | null;
export interface Win {
  player: Player;
  line: number[];
}
export interface Game {
  board: Cell[];
  winner: Win | null;
  draw: boolean;
  next: Player;
}

// Right, down, down-right, down-left. Each
// is walked both ways from the last move.
export const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export const playerAt = (moveNumber: number): Player =>
  moveNumber % 2 === 0 ? "X" : "O";

// Only lines through the LAST move can be new wins, so check just those:
// at most 4 directions x 2 sides x (m - 1) cells = O(m), whatever n is.
export function checkWinFrom(
  board: Cell[],
  n: number,
  m: number,
  index: number,
): Win | null {
  const player = board[index];
  if (!player) return null;
  const row = Math.floor(index / n);
  const col = index % n;
  for (const [dr, dc] of DIRECTIONS) {
    const line = [index];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        line.length < m &&
        r >= 0 &&
        r < n &&
        c >= 0 &&
        c < n &&
        board[r * n + c] === player
      ) {
        line.push(r * n + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= m) return { player, line: line.sort((a, b) => a - b) };
  }
  return null;
}

// Rebuild the position after the first \`step\`
// moves. History stores moves, not boards.
export function replay(
  n: number,
  m: number,
  moves: number[],
  step: number,
): Game {
  const board = Array<Cell>(n * n).fill(null);
  let winner: Win | null = null;
  for (let i = 0; i < step && !winner; i++) {
    board[moves[i]] = playerAt(i);
    winner = checkWinFrom(board, n, m, moves[i]);
  }
  const draw = !winner && step === n * n;
  return { board, winner, draw, next: playerAt(step) };
}

export function statusText(game: Game): string {
  if (game.winner) return "Winner: " + game.winner.player;
  if (game.draw) return "Draw";
  return "Next player: " + game.next;
}

// Arrow-key movement inside the grid, clamped at the edges.
export function moveFocus(index: number, key: string, n: number): number {
  const row = Math.floor(index / n);
  const col = index % n;
  if (key === "ArrowRight") return row * n + Math.min(n - 1, col + 1);
  if (key === "ArrowLeft") return row * n + Math.max(0, col - 1);
  if (key === "ArrowDown") return Math.min(n - 1, row + 1) * n + col;
  if (key === "ArrowUp") return Math.max(0, row - 1) * n + col;
  if (key === "Home") return row * n;
  if (key === "End") return row * n + n - 1;
  return index;
}

export const coords = (index: number, n: number): string =>
  "row " + (Math.floor(index / n) + 1) + ", column " + ((index % n) + 1);
`,
          "/src/app/history.component.ts": `import { Component, EventEmitter, Input, Output } from "@angular/core";
import { coords, playerAt } from "./game";

@Component({
  selector: "app-history",
  standalone: true,
  template: \`
    <ol class="history" aria-label="Move history">
      <li>
        <button
          type="button"
          data-testid="jump-0"
          [attr.aria-current]="step === 0 ? 'step' : null"
          (click)="jump.emit(0)"
        >
          Game start
        </button>
      </li>
      @for (cell of moves; track $index) {
        <li>
          <button
            type="button"
            [attr.data-testid]="'jump-' + ($index + 1)"
            [attr.aria-current]="step === $index + 1 ? 'step' : null"
            (click)="jump.emit($index + 1)"
          >{{ label(cell, $index) }}</button>
        </li>
      }
    </ol>
  \`,
  styles: [
    \`
    .history { padding-left: 1.5em; font-size: 0.9rem; }
    .history button { background: none; border: none; color: #93c5fd; cursor: pointer; padding: 2px 0; text-align: left; }
    .history button[aria-current="step"] { color: #fbbf24; font-weight: 700; }
  \`,
  ],
})
export class HistoryComponent {
  @Input() moves: number[] = [];
  @Input() step = 0;
  @Input() n = 3;
  @Output() jump = new EventEmitter<number>();

  label(cell: number, i: number): string {
    return (
      "Move " + (i + 1) + ": " + playerAt(i) + " at " + coords(cell, this.n)
    );
  }
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build Connect Four",
    seoDescription: "Build Connect Four in React, Vue and Angular: gravity drops, a 4-direction win check from the last disc, draw detection and accessible columns.",
    description: `**Question presented to candidate:**
"Build Connect Four for two players on one screen. It is a 7 column by 6 row board standing upright: you pick a column, the disc falls to the lowest free spot, and the first player to line up four discs in any direction wins. Show whose turn it is, highlight the winning four, and handle full columns and a full board."

**Requirements:**
- A 7 x 6 board; Red moves first, then Red and Yellow alternate.
- Choosing a column drops the disc into the lowest empty slot of that column; a full column refuses the move.
- Detect four in a row horizontally, vertically or on either diagonal, and highlight those four discs.
- Detect a draw when all 42 slots are filled with no winner.
- A status line, a screen-reader announcement of each move, and a New game button.

**What a strong answer should cover:**
- Board representation (a flat array or rows of columns) and the "lowest empty row" gravity function.
- A win check that only looks at lines through the disc just dropped: 4 directions, both ways, O(1) for a fixed board.
- Immutable updates: each drop returns a new game object; illegal drops return the same one.
- Draw detection by move count, and turn switching that stops on a win.
- Accessible input: one button per column with a label like "Column 3, 4 empty", and focus that survives a column filling up.

**Clarifying questions expected:**
- "Should the board size and the number to connect be configurable?"
- "Do you want a drop animation, or is an instant drop fine for now?"
- "Is undo or a move history needed?"

**Code / implementation expected:** Yes. A working board with gravity and win detection; the interviewer usually asks you to explain the win check and its cost.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. Comfortable with React components, props and <code>useState</code>; no game-programming background needed.
**Difficulty:** Hard

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Excerpts come from the runnable solution on this page, and the Verified section quotes what it printed on React 19.3.1 when a driver played real games.

## 1. Why This Even Matters — A Story First

Connect Four is Tic-Tac-Toe that obeys gravity. You never choose a *cell*; you choose a *column* and let the disc fall. That one change is what makes the question interesting: the player's input (a column) is not the same as the thing that changes (a slot at the bottom of the stack), and your code has to translate between them.

Think of a vending machine coil. You press "column 3", the machine works out which slot the item lands in, and only then does anything move. If column 3 is already full, pressing it should do nothing, and the machine should not jam.

The win check is the second half. A board has 69 possible lines of four, and a beginner loops over all of them after every move. The disc you just dropped is the only thing that changed, so it is the only place a new four can be. Interviewers want to hear you say that.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Fixed 7 x 6 and four to win, or configurable? | Configurable sizes push you to constants or props everywhere; this build keeps <code>ROWS</code>, <code>COLS</code> and <code>NEED</code> as named constants so the change is easy. |
| Two humans, or a computer opponent? | An AI needs a move-search function; it changes the scope completely. |
| Do you need a drop animation? | CSS transforms per disc versus instant placement. Agree to do it last. |
| Undo or history? | Changes the state model to a list of moves. See the [Tic-Tac-Toe II](/interview-question/build-tic-tac-toe-ii-n-x-n-board-m-in-a-row) approach. |
| Keyboard and screen-reader support? | Decides whether a column is a button with a label, and how full columns behave. |

Assumptions here: fixed 7 x 6, four to win, two humans, no animation, accessible column buttons.

## 3. Requirements and the Plan

**Component tree:** <code>App</code> owns one <code>game</code> object and renders seven <code>Column</code> components. Each <code>Column</code> is a single button containing six slot circles. The rules live in <code>src/connect4.js</code>, which has no React in it.

| Value | Kind | Where |
| :--- | :--- | :--- |
| <code>game.board</code> (42 slots) | State | One <code>useState</code> object in <code>App</code> |
| <code>game.current</code>, <code>game.winner</code>, <code>game.moves</code>, <code>game.lastMove</code> | State, updated together by <code>drop</code> | Same object |
| Draw, game over | Derived | <code>isDraw(game)</code>, <code>isOver(game)</code> |
| Column full, column label, status, announcement | Derived | <code>landingRow</code>, <code>columnLabel</code>, <code>statusText</code>, <code>announce</code> |

Why keep <code>current</code> and <code>winner</code> in state here, when the [basic Tic-Tac-Toe](/interview-question/build-tic-tac-toe) derives them? Because they are computed once, inside the same pure <code>drop</code> function that places the disc, and stored in the same object. They can never drift apart, and <code>winFrom</code> needs the last move anyway. That is a reasonable trade, and saying why is the point.

📌 **Interview term: State transition function** — a pure function <code>(oldState, input) => newState</code>. <code>drop(game, col)</code> is one: all the rules happen in one place, and the component only calls it. It is the same idea as a reducer in [useState vs useReducer](/interview-question/what-is-the-difference-between-usestate-and-usereducer).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 380" role="img" aria-label="Flow of one drop: click a column, find the landing row, place the disc in a copied board, check for four through it, then declare a winner or switch turns">
  <defs>
    <marker id="c4r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="170" height="64" rx="10"/>
  <text class="d-text" x="115" y="68" text-anchor="middle">click column c</text>
  <text class="d-sub" x="115" y="90" text-anchor="middle">one button each</text>
  <rect class="d-box" x="260" y="40" width="180" height="64" rx="10"/>
  <text class="d-text" x="350" y="68" text-anchor="middle">landingRow</text>
  <text class="d-sub" x="350" y="90" text-anchor="middle">lowest empty slot</text>
  <rect class="d-box" x="500" y="40" width="170" height="64" rx="10"/>
  <text class="d-text" x="585" y="68" text-anchor="middle">place disc</text>
  <text class="d-sub" x="585" y="90" text-anchor="middle">in a copied board</text>
  <rect class="d-box-muted" x="260" y="170" width="180" height="64" rx="10"/>
  <text class="d-text" x="350" y="198" text-anchor="middle">column full</text>
  <text class="d-sub" x="350" y="220" text-anchor="middle">same game returned</text>
  <rect class="d-box-accent" x="500" y="170" width="170" height="64" rx="10"/>
  <text class="d-text d-accent" x="585" y="198" text-anchor="middle">winFrom</text>
  <text class="d-sub" x="585" y="220" text-anchor="middle">4 lines through it</text>
  <rect class="d-box-accent" x="500" y="296" width="170" height="64" rx="10"/>
  <text class="d-text d-accent" x="585" y="324" text-anchor="middle">winner set</text>
  <text class="d-sub" x="585" y="346" text-anchor="middle">board locks</text>
  <rect class="d-box" x="200" y="296" width="240" height="64" rx="10"/>
  <text class="d-text" x="320" y="324" text-anchor="middle">switch player</text>
  <text class="d-sub" x="320" y="346" text-anchor="middle">draw after 42 moves</text>
  <path class="d-edge" d="M 200 72 L 254 72" marker-end="url(#c4r-arrow)"/>
  <path class="d-edge" d="M 440 72 L 494 72" marker-end="url(#c4r-arrow)"/>
  <path class="d-edge-dashed" d="M 350 104 L 350 164" marker-end="url(#c4r-arrow)"/>
  <text class="d-sub" x="362" y="140">row is -1</text>
  <path class="d-edge" d="M 585 104 L 585 164" marker-end="url(#c4r-arrow)"/>
  <path class="d-edge-accent" d="M 585 234 L 585 290" marker-end="url(#c4r-arrow)"/>
  <text class="d-sub" x="597" y="266">four found</text>
  <path class="d-edge" d="M 530 234 L 440 296" marker-end="url(#c4r-arrow)"/>
  <text class="d-sub" x="430" y="262" text-anchor="end">no four</text>
</svg>

Every arrow in this flow lives inside one pure function, <code>drop</code>. The component never decides anything; it renders the result.

## 4. Build It Step by Step

### Step 1: board layout and gravity

\`\`\`js
// Pure Connect Four logic. No framework
// code, so it can be tested on its own.
// Flat board: cell (row, col) is at row
// * COLS + col, row 0 is the TOP row.
export const ROWS = 6;
export const COLS = 7;
export const NEED = 4;
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export const newGame = () => ({
  board: Array(ROWS * COLS).fill(null),
  current: "Red",
  winner: null, // { player, line } once someone connects four
  lastMove: null, // { row, col } of the latest disc
  moves: 0,
});

// Gravity: the disc lands in the lowest
// empty row of the column, or -1 if full.
export function landingRow(board, col) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (!board[row * COLS + col]) return row;
  }
  return -1;
}
\`\`\`

📌 **Interview term: Row-major flat array** — the 6 x 7 grid is one array of 42 slots, row after row, with row 0 at the *top* so it renders in reading order. Slot (row, col) is <code>row * COLS + col</code>. Some people store an array of columns instead (each column a stack you push onto); that makes gravity a <code>push</code> but makes rows and diagonals awkward. Either is fine if you can explain it.

📌 **Interview term: Gravity** — <code>landingRow</code> scans a column from the bottom row up and returns the first empty row, or -1 when the column is full. At most six reads.

### Step 2: the win check from the new disc

\`\`\`js
// Only lines through the new disc can be
// new wins: 4 directions, 3 cells each way.
export function winFrom(board, row, col) {
  const player = board[row * COLS + col];
  for (const [dr, dc] of DIRECTIONS) {
    const line = [row * COLS + col];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        line.length < NEED &&
        r >= 0 &&
        r < ROWS &&
        c >= 0 &&
        c < COLS &&
        board[r * COLS + c] === player
      ) {
        line.push(r * COLS + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= NEED)
      return { player, line: line.sort((a, b) => a - b) };
  }
  return null;
}
\`\`\`

Four direction vectors cover every line: right <code>[0, 1]</code>, down <code>[1, 0]</code>, down-right <code>[1, 1]</code> and down-left <code>[1, -1]</code>. For each, start the line with the new disc, walk forward while the slots match, then walk backward. The walk checks <code>r</code> and <code>c</code> against the board edges separately, so it can never slide off the end of one row into the start of the next.

📌 **Interview term: Last-move check** — any new four must contain the disc just played, so checking the 4 lines through it is enough. That is at most 4 directions times 2 sides times 3 slots, 24 reads, instead of scanning all 69 lines of the board. The [Tic-Tac-Toe II](/interview-question/build-tic-tac-toe-ii-n-x-n-board-m-in-a-row) doc generalises this to M in a row on any board.

Walking both ways matters most in Connect Four, because a disc often lands in the *middle* of a horizontal or diagonal four: you drop into column 4 between your discs in columns 3 and 5.

### Step 3: one drop, one new game object

\`\`\`js
export const isDraw = (game) =>
  !game.winner && game.moves === ROWS * COLS;
export const isOver = (game) => Boolean(game.winner) || isDraw(game);

// Returns a NEW game object; an illegal drop returns the same object.
export function drop(game, col) {
  if (isOver(game)) return game;
  const row = landingRow(game.board, col);
  if (row === -1) return game;
  const board = game.board.slice();
  board[row * COLS + col] = game.current;
  const winner = winFrom(board, row, col);
  return {
    board,
    winner,
    lastMove: { row, col },
    moves: game.moves + 1,
    current: winner
      ? game.current
      : game.current === "Red"
        ? "Yellow"
        : "Red",
  };
}
\`\`\`

- 📌 **Interview term: Immutable update** — <code>drop</code> copies the board with <code>slice()</code> and returns a brand-new game object. React compares state by reference, so a new object guarantees a re-render, and the old object is still a valid snapshot if you later add undo. See [why state updates must be immutable](/interview-question/why-must-react-state-updates-be-immutable).
- An illegal drop (full column, finished game) returns the *same* object. React bails out of the re-render when the state is <code>Object.is</code>-equal.
- The turn only switches when there is no winner, so the status can say "Red wins!" with Red as <code>current</code>.
- 📌 **Interview term: Draw detection by count** — a draw is simply 42 moves without a winner. Counting moves is cheaper and clearer than scanning for an empty slot.

### Step 4: the App and the columns

\`\`\`jsx
export default function App() {
  const [game, setGame] = useState(newGame);
  const over = isOver(game);
  const winLine = game.winner ? game.winner.line : [];

  return (
    <main className="c4">
      <h1>Connect Four</h1>
      <p
        className={"status " + game.current.toLowerCase()}
        data-testid="status"
      >
        {statusText(game)}
      </p>
      <div
        className="grid"
        role="group"
        aria-label="Connect Four board, 7 columns by 6 rows"
      >
        {Array.from({ length: COLS }, (_, col) => (
          <Column
            key={col}
            col={col}
            board={game.board}
            winLine={winLine}
            label={columnLabel(game, col)}
            disabled={over || landingRow(game.board, col) === -1}
            onDrop={(c) => setGame((g) => drop(g, c))}
          />
        ))}
      </div>
      <p className="sr-only" data-testid="announce" aria-live="polite">
        {announce(game)}
      </p>
      <button
        type="button"
        className="restart"
        data-testid="restart"
        onClick={() => setGame(newGame())}
      >
        New game
      </button>
    </main>
  );
}
\`\`\`

\`\`\`jsx
import { ROWS, COLS } from "./connect4";

export default function Column({
  col,
  board,
  winLine,
  label,
  disabled,
  onDrop,
}) {
  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    const i = row * COLS + col;
    const disc = board[i];
    cells.push(
      <span
        key={row}
        data-testid={"slot-" + row + "-" + col}
        className={
          "slot" +
          (disc ? " " + disc.toLowerCase() : "") +
          (winLine.includes(i) ? " win" : "")
        }
      />,
    );
  }
  return (
    <button
      type="button"
      className="column"
      data-testid={"col-" + col}
      aria-label={label}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onDrop(col);
      }}
    >
      {cells}
    </button>
  );
}
\`\`\`

Making the whole column one <code>&lt;button&gt;</code> matches how the game is played: you choose a column, not a slot. Seven buttons are easy to Tab through, and each label says exactly what a sighted player sees: "Column 4, 4 empty" or "Column 7, full".

📌 **Interview term: aria-disabled** — marks a control as unavailable to assistive technology without the side effects of the <code>disabled</code> attribute. Here that matters: if the focused column fills up and becomes <code>disabled</code>, the browser drops focus and keyboard users are thrown back to the top of the page. With <code>aria-disabled</code> the focus stays put, and the click handler ignores the press.

The hidden <code>sr-only</code> paragraph is a polite live region that announces every move ("Red dropped in column 4, row 1 from the bottom. Turn: Yellow"), because a screen reader user cannot see where a disc landed.

## 5. Verified

**The rules alone.** A node script played fixed sequences through <code>drop</code>:

\`\`\`text
gravity          | first disc in col 4 lands in row 5 (bottom = 5)
full column      | landingRow = -1 | 7th drop returns the same object: true
vertical         | Red wins! | cells 14,21,28,35 | moves 7
horizontal       | Red wins! | cells 35,36,37,38 | moves 7
diagonal /       | Red wins! | cells 17,23,29,35 | moves 11
diagonal \\       | Red wins! | cells 17,25,33,41 | moves 11
42-move draw     | Draw: the board is full  | moves 42
\`\`\`

The 42-move draw sequence was found by a seeded random search over legal games, then replayed by hand. Each win type (vertical, horizontal, both diagonals) is detected, and a seventh drop into a full column returns the same object.

**The component.** Rendered inside <code>&lt;StrictMode&gt;</code> in jsdom; the driver clicked column buttons and printed rows of the board (<code>R</code>, <code>Y</code>, <code>.</code>; top row first) and the highlighted slots (<code>row-col</code>):

\`\`\`text
RENDERED: Connect FourTurn: RedNew game
start      : Turn: Red | Column 1, 6 empty
first drop : ...R... | Red dropped in column 4, row 1 from the bottom. Turn: Yellow
stacks     : ...Y.../...R... | Column 4, 4 empty
vertical   : Red wins! | win slots = 2-0 3-0 4-0 5-0
after win  : col 6 aria-disabled = true | bottom row = RY.....
diagonal   : Red wins! | win slots = 5-0 4-1 3-2 2-3
board      : ...R.../..RR.../.RRY.../RYYY..Y
full col   : Column 7, full | aria-disabled = true | Turn: Red
7th drop   : Turn: Red | col 7 discs = 6
42 moves   : Draw: the board is full | win slots = none | disabled cols = 7
\`\`\`

The first line shows a disc landing on the bottom row and the live-region text. The diagonal board shows the classic staircase. After the full 42-move game the status reports the draw and all seven columns are <code>aria-disabled</code>. Visual layout (round discs, the blue board) was not checked in jsdom.

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Full column | <code>landingRow</code> returns -1; <code>drop</code> returns the same game; button is <code>aria-disabled</code> and labelled "full" |
| Disc completes a line from the middle | Walk in both directions from the new disc |
| Win on the 42nd move | Winner is set inside <code>drop</code>; <code>isDraw</code> requires no winner |
| Clicks after the game ends | <code>drop</code> refuses; every column is <code>aria-disabled</code> |
| Keyboard | Seven buttons in Tab order; Enter or Space drops; focus survives a column filling |
| Screen readers | Column labels with free space; a polite live region narrates each move |
| Small screens | <code>repeat(7, 1fr)</code> grid with square slots fits 360 px |

## 7. Common Pitfalls

- **Treating a click on a slot as the move.** The move is the column; the slot is computed. Clicking a top slot must still land at the bottom.
- **Scanning the whole board for wins after each move.** Works, but shows you missed the last-move insight.
- **Flat-index bounds checks.** <code>index + 1</code> from the last column jumps to the next row; check <code>c &lt; COLS</code>.
- **Switching turns after a winning move.** The status then says the wrong player won.
- **Disabling the focused column.** Native <code>disabled</code> drops keyboard focus; use <code>aria-disabled</code> and guard in the handler.
- **Mutating <code>game.board</code>.** React may skip the update, and undo becomes impossible later.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify and model:</strong> <span style="color:#f0e2c8;">"7 by 6, four to win, two players. I store a flat array of 42 slots plus whose turn it is, the winner, the last move and a move count in one object."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Gravity:</strong> <span style="color:#f0e2c8;">"The input is a column. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">landingRow</code> scans that column from the bottom and returns the first empty row, or -1 if it is full."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Win check:</strong> <span style="color:#f0e2c8;">"Only lines through the new disc can be new wins, so I walk four directions both ways from it, with row and column bounds, and stop at four. At most 24 reads."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Transition:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">drop(game, col)</code> is pure: it copies the board, places the disc, checks the win, and returns a new object, or the same one when the move is illegal. Draw is 42 moves with no winner."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. UI and a11y:</strong> <span style="color:#f0e2c8;">"Each column is one button labelled with its free space, using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-disabled</code> so focus survives, plus a live region announcing every drop. Then I test each win direction, a full column and a draw."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you animate the disc falling?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Render the new disc with a CSS transform that starts above the board, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">translateY(-600%)</code>, and transition to its slot. Key the animation on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lastMove</code> so only the newest disc animates. Block input until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transitionend</code> if overlapping drops look wrong.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make the board size and the connect count configurable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The rules already use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROWS</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COLS</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NEED</code>. Turn them into parameters of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">newGame</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">drop</code> (or fields of the game object) and render the grid with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repeat(cols, 1fr)</code>. The win check is unchanged.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a computer opponent?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bestMove(game)</code> using minimax with alpha-beta pruning to a fixed depth, scoring windows of four by how many of each colour they contain. Run it in a Web Worker for deeper searches so the UI stays responsive, then call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">drop</code> with its column.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support online play?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Send only the column index for each move. Both clients run the same pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">drop</code>, so they reach the same state. The server validates moves with the same function and broadcasts them, which also prevents cheating.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you test?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit tests for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">drop</code>: each win direction, a win from the middle, a full column returning the same object, turn order, and a full-board draw. Component tests that click column buttons and assert the status, the highlighted discs and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-disabled</code>.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State transition function** | A pure <code>(state, input) => newState</code> function holding all the rules |
| **Row-major flat array** | A grid stored row after row in one array |
| **Gravity** | Finding the lowest empty row of the chosen column |
| **Last-move check** | Checking only the lines through the disc just dropped |
| **Immutable update** | Returning a new object instead of editing the old one |
| **Draw detection by count** | A draw is 42 moves with no winner |
| **aria-disabled** | Unavailable to assistive tech, but still focusable |

---

**Conclusion:** Connect Four rewards a clean separation between what the player chooses (a column) and what changes (one slot at the bottom of it). Put gravity, placement, the four-direction last-move win check and turn switching into one pure <code>drop</code> function that returns a new game object, and the React side shrinks to rendering seven labelled column buttons. That separation is what makes animation, AI, online play and undo straightforward follow-ups instead of rewrites.`,
        files: {
          "/App.js": `import { useState } from "react";
import Column from "./src/Column";
import {
  COLS,
  announce,
  columnLabel,
  drop,
  isOver,
  landingRow,
  newGame,
  statusText,
} from "./src/connect4";

export default function App() {
  const [game, setGame] = useState(newGame);
  const over = isOver(game);
  const winLine = game.winner ? game.winner.line : [];

  return (
    <main className="c4">
      <h1>Connect Four</h1>
      <p
        className={"status " + game.current.toLowerCase()}
        data-testid="status"
      >
        {statusText(game)}
      </p>
      <div
        className="grid"
        role="group"
        aria-label="Connect Four board, 7 columns by 6 rows"
      >
        {Array.from({ length: COLS }, (_, col) => (
          <Column
            key={col}
            col={col}
            board={game.board}
            winLine={winLine}
            label={columnLabel(game, col)}
            disabled={over || landingRow(game.board, col) === -1}
            onDrop={(c) => setGame((g) => drop(g, c))}
          />
        ))}
      </div>
      <p className="sr-only" data-testid="announce" aria-live="polite">
        {announce(game)}
      </p>
      <button
        type="button"
        className="restart"
        data-testid="restart"
        onClick={() => setGame(newGame())}
      >
        New game
      </button>
    </main>
  );
}
`,
          "/src/Column.js": `import { ROWS, COLS } from "./connect4";

export default function Column({
  col,
  board,
  winLine,
  label,
  disabled,
  onDrop,
}) {
  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    const i = row * COLS + col;
    const disc = board[i];
    cells.push(
      <span
        key={row}
        data-testid={"slot-" + row + "-" + col}
        className={
          "slot" +
          (disc ? " " + disc.toLowerCase() : "") +
          (winLine.includes(i) ? " win" : "")
        }
      />,
    );
  }
  return (
    <button
      type="button"
      className="column"
      data-testid={"col-" + col}
      aria-label={label}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onDrop(col);
      }}
    >
      {cells}
    </button>
  );
}
`,
          "/src/connect4.js": `// Pure Connect Four logic. No framework code, so it can be tested on its own.
// Flat board: cell (row, col) is at row * COLS + col, row 0 is the TOP row.
export const ROWS = 6;
export const COLS = 7;
export const NEED = 4;
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export const newGame = () => ({
  board: Array(ROWS * COLS).fill(null),
  current: "Red",
  winner: null, // { player, line } once someone connects four
  lastMove: null, // { row, col } of the latest disc
  moves: 0,
});

// Gravity: the disc lands in the lowest empty row of the column, or -1 if full.
export function landingRow(board, col) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (!board[row * COLS + col]) return row;
  }
  return -1;
}

// Only lines through the new disc can be
// new wins: 4 directions, 3 cells each way.
export function winFrom(board, row, col) {
  const player = board[row * COLS + col];
  for (const [dr, dc] of DIRECTIONS) {
    const line = [row * COLS + col];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        line.length < NEED &&
        r >= 0 &&
        r < ROWS &&
        c >= 0 &&
        c < COLS &&
        board[r * COLS + c] === player
      ) {
        line.push(r * COLS + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= NEED)
      return { player, line: line.sort((a, b) => a - b) };
  }
  return null;
}

export const isDraw = (game) => !game.winner && game.moves === ROWS * COLS;
export const isOver = (game) => Boolean(game.winner) || isDraw(game);

// Returns a NEW game object; an illegal drop returns the same object.
export function drop(game, col) {
  if (isOver(game)) return game;
  const row = landingRow(game.board, col);
  if (row === -1) return game;
  const board = game.board.slice();
  board[row * COLS + col] = game.current;
  const winner = winFrom(board, row, col);
  return {
    board,
    winner,
    lastMove: { row, col },
    moves: game.moves + 1,
    current: winner ? game.current : game.current === "Red" ? "Yellow" : "Red",
  };
}

export function statusText(game) {
  if (game.winner) return game.winner.player + " wins!";
  if (isDraw(game)) return "Draw: the board is full";
  return "Turn: " + game.current;
}

// What a screen reader hears after each move.
export function announce(game) {
  if (!game.lastMove) return "";
  const { row, col } = game.lastMove;
  const who = game.board[row * COLS + col];
  return (
    who +
    " dropped in column " +
    (col + 1) +
    ", row " +
    (ROWS - row) +
    " from the bottom. " +
    statusText(game)
  );
}

export function columnLabel(game, col) {
  const free = landingRow(game.board, col) + 1;
  return "Column " + (col + 1) + ", " + (free === 0 ? "full" : free + " empty");
}
`,
          "/styles.css": `body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}
.c4 {
  max-width: 460px;
  margin: 0 auto;
  padding: 24px 12px;
  text-align: center;
}
.c4 h1 {
  font-size: 1.4rem;
  margin: 0 0 8px;
}
.status {
  font-weight: 700;
  min-height: 1.5em;
}
.status.red {
  color: #f87171;
}
.status.yellow {
  color: #facc15;
}
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  padding: 8px;
  background: #1d4ed8;
  border-radius: 12px;
  margin: 12px 0;
}
.column {
  display: grid;
  grid-template-rows: repeat(6, 1fr);
  gap: 4px;
  padding: 2px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}
.column:hover:not([aria-disabled="true"]) {
  background: #2563eb;
}
.column[aria-disabled="true"] {
  cursor: not-allowed;
}
.column:focus-visible {
  outline: 3px solid #fbbf24;
  outline-offset: 1px;
}
.slot {
  display: block;
  aspect-ratio: 1;
  border-radius: 50%;
  background: #0f172a;
}
.slot.red {
  background: #ef4444;
}
.slot.yellow {
  background: #facc15;
}
.slot.win {
  box-shadow: 0 0 0 3px #f8fafc inset;
}
.restart {
  padding: 10px 20px;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid #475569;
  background: #334155;
  color: #f8fafc;
  cursor: pointer;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers preparing for a machine coding round. Comfortable with <code>ref</code>, <code>computed</code>, props and emits; no game-programming background needed.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> for the vocabulary. Excerpts come from the runnable solution, and the Verified section is real output from Vue 3.5.44.

## 1. A Story First

Connect Four is Tic-Tac-Toe with gravity. Like pressing a button on a vending machine, the player picks a *column*, and the machine works out where the item lands. If the column is full, the button does nothing. And because only the newly dropped disc changed, it is the only place a new four in a row can appear, so the win check looks there and nowhere else.

## 2. The Plan

All rules live in <code>src/connect4.js</code>, which has no Vue in it: <code>newGame()</code>, <code>landingRow(board, col)</code> (gravity), <code>winFrom(board, row, col)</code> (four directions from the new disc), <code>drop(game, col)</code> (the whole move), plus <code>isDraw</code>, <code>isOver</code>, <code>statusText</code>, <code>announce</code> and <code>columnLabel</code>.

| Value | Vue tool |
| :--- | :--- |
| The whole game (42 slots, current player, winner, last move, move count) | One <code>ref(newGame())</code> |
| Game over, winning slots | <code>computed</code> |
| Column labels, full columns, status text | Plain function calls in the template |
| A column click | <code>emit("drop", col)</code> from <code>BoardColumn</code> |

📌 **Interview term: State transition function** — <code>drop(game, col)</code> takes the old game and a column and returns the next game: find the landing row, copy the board, place the disc, check for a win, switch turns or stop. All the rules sit in one pure function; the component just assigns its result.

## 3. Build It Step by Step

### Step 1: gravity and the win check

\`\`\`js
// Gravity: the disc lands in the lowest
// empty row of the column, or -1 if full.
export function landingRow(board, col) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (!board[row * COLS + col]) return row;
  }
  return -1;
}

// Only lines through the new disc can be
// new wins: 4 directions, 3 cells each way.
export function winFrom(board, row, col) {
  const player = board[row * COLS + col];
  for (const [dr, dc] of DIRECTIONS) {
    const line = [row * COLS + col];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        line.length < NEED &&
        r >= 0 &&
        r < ROWS &&
        c >= 0 &&
        c < COLS &&
        board[r * COLS + c] === player
      ) {
        line.push(r * COLS + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= NEED)
      return { player, line: line.sort((a, b) => a - b) };
  }
  return null;
}
\`\`\`

📌 **Interview term: Gravity** — scan the chosen column from the bottom row (row 5) upwards and return the first empty row, or -1 when full.

📌 **Interview term: Last-move check** — walk right, down, down-right and down-left from the new disc, both ways, checking row and column bounds separately, and stop at four. That is at most 24 reads, compared with 69 possible lines on the whole board. Walking both ways catches the common case where the disc lands in the middle of a line.

### Step 2: one ref, one transition

\`\`\`vue
<script setup>
import { ref, computed } from "vue";
import BoardColumn from "./components/BoardColumn.vue";
import {
  COLS,
  announce,
  columnLabel,
  drop,
  isOver,
  landingRow,
  newGame,
  statusText,
} from "./connect4.js";

// One ref holds the whole game; drop() always returns a new object.
const game = ref(newGame());
const over = computed(() => isOver(game.value));
const winLine = computed(() =>
  game.value.winner ? game.value.winner.line : [],
);
const columns = Array.from({ length: COLS }, (_, c) => c);

function onDrop(col) {
  game.value = drop(game.value, col);
}
</script>

<template>
  <main class="c4">
    <h1>Connect Four</h1>
    <p
      :class="['status', game.current.toLowerCase()]"
      data-testid="status"
    >
      {{ statusText(game) }}
    </p>
    <div
      class="grid"
      role="group"
      aria-label="Connect Four board, 7 columns by 6 rows"
    >
      <BoardColumn
        v-for="col in columns"
        :key="col"
        :col="col"
        :board="game.board"
        :win-line="winLine"
        :label="columnLabel(game, col)"
        :disabled="over || landingRow(game.board, col) === -1"
        @drop="onDrop"
      />
    </div>
    <p class="sr-only" data-testid="announce" aria-live="polite">
      {{ announce(game) }}
    </p>
    <button
      type="button"
      class="restart"
      data-testid="restart"
      @click="game = newGame()"
    >
      New game
    </button>
  </main>
</template>
\`\`\`

<code>game.value = drop(game.value, col)</code> replaces the whole object. 📌 **Interview term: Immutable update** — <code>drop</code> copies the board and returns a new object, or the same object for an illegal drop. Vue's deep reactivity would also track an in-place change, but returning new objects keeps <code>drop</code> pure and testable, and keeps old positions intact for undo later.

The turn only switches when the move did not win, and a draw is 42 moves with no winner.

### Step 3: a column component

\`\`\`vue
<script setup>
import { ROWS, COLS } from "../connect4.js";

const props = defineProps({
  col: { type: Number, required: true },
  board: { type: Array, required: true },
  winLine: { type: Array, default: () => [] },
  label: { type: String, required: true },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["drop"]);

const rows = Array.from({ length: ROWS }, (_, r) => r);
const disc = (row) => props.board[row * COLS + props.col];

function onClick() {
  if (!props.disabled) emit("drop", props.col);
}
</script>

<template>
  <button
    type="button"
    class="column"
    :data-testid="'col-' + col"
    :aria-label="label"
    :aria-disabled="disabled"
    @click="onClick"
  >
    <span
      v-for="row in rows"
      :key="row"
      :data-testid="'slot-' + row + '-' + col"
      :class="['slot', disc(row) && disc(row).toLowerCase(), { win: winLine.includes(row * COLS + col) }]"
    />
  </button>
</template>
\`\`\`

- The whole column is one button, because the player chooses a column. Its label says "Column 4, 4 empty" or "Column 7, full".
- 📌 **Interview term: aria-disabled** — the column is marked unavailable with <code>:aria-disabled</code> rather than <code>:disabled</code>, so if the focused column fills up, keyboard focus stays on it instead of falling back to the page. The click handler checks <code>props.disabled</code> before emitting.
- The event is called <code>drop</code>, which is also the name of a native drag-and-drop DOM event. Declaring it in <code>defineEmits</code> is what makes <code>@drop</code> on <code>&lt;BoardColumn&gt;</code> a component event; undeclared listeners fall through to the root element as native listeners. See [why declare emits](/interview-question/why-declare-emits-and-can-you-validate-them).
- The slots are <code>v-for</code> spans with an array <code>:class</code>; <code>disc(row) &amp;&amp; disc(row).toLowerCase()</code> adds <code>red</code> or <code>yellow</code>.

A hidden live region (<code>aria-live="polite"</code>) reads out each move, such as "Red dropped in column 4, row 1 from the bottom. Turn: Yellow".

## 4. Verified

The rules alone, run with node:

\`\`\`text
gravity          | first disc in col 4 lands in row 5 (bottom = 5)
full column      | landingRow = -1 | 7th drop returns the same object: true
vertical         | Red wins! | cells 14,21,28,35 | moves 7
horizontal       | Red wins! | cells 35,36,37,38 | moves 7
diagonal /       | Red wins! | cells 17,23,29,35 | moves 11
diagonal \\       | Red wins! | cells 17,25,33,41 | moves 11
42-move draw     | Draw: the board is full  | moves 42
\`\`\`

The app compiled with <code>@vue/compiler-sfc</code>, mounted in jsdom and driven by clicks on the column buttons. Rows are printed top first (<code>R</code>, <code>Y</code>, <code>.</code>) and winning slots as <code>row-col</code>:

\`\`\`text
RENDERED: Connect FourTurn: RedNew game
start      : Turn: Red | Column 1, 6 empty
first drop : ...R... | Red dropped in column 4, row 1 from the bottom. Turn: Yellow
stacks     : ...Y.../...R... | Column 4, 4 empty
vertical   : Red wins! | win slots = 2-0 3-0 4-0 5-0
after win  : col 6 aria-disabled = true | bottom row = RY.....
diagonal   : Red wins! | win slots = 5-0 4-1 3-2 2-3
board      : ...R.../..RR.../.RRY.../RYYY..Y
full col   : Column 7, full | aria-disabled = true | Turn: Red
7th drop   : Turn: Red | col 7 discs = 6
42 moves   : Draw: the board is full | win slots = none | disabled cols = 7
\`\`\`

These lines match the React and Angular builds exactly, including the 42-move draw (found by a seeded random search over legal games). Visual layout was not checked in jsdom.

## 5. Common Pitfalls

- **Clicking slots instead of columns.** The move is the column; the landing row is computed.
- **Turning the board into a deep reactive structure you mutate.** It works until you need undo; return new objects instead.
- **Flat-index bounds.** <code>index + 1</code> from column 7 lands in the next row's column 1; check row and column.
- **Switching the turn after a win.** The status would name the wrong winner.
- **Using <code>:disabled</code> on the focused column.** Keyboard focus is lost when it fills up.
- **Forgetting <code>defineEmits</code> for an event named like a DOM event.** The listener also lands on the native element.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"One ref holds the game: 42 slots in a flat array, the current player, the winner, the last move and a move count."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Gravity:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">landingRow</code> scans the chosen column from the bottom and returns the first empty row or -1."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Win check:</strong> <span style="color:#f0e2c8;">"Only lines through the new disc can win, so I walk four directions both ways with row and column bounds, stopping at four."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Transition:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">drop</code> is pure and returns a new game; the component does <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">game.value = drop(game.value, col)</code>. Draw is 42 moves without a winner."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. UI:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BoardColumn</code> is one button per column with a free-space label and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-disabled</code>, emitting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">drop</code>. A live region narrates moves. Then I test every win direction, a full column and a draw."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why one ref for the whole game instead of several refs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">drop</code> updates board, turn, winner and move count together. One object means one assignment, so the pieces can never be out of step, and the pure function is easy to test.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you animate the falling disc?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wrap the newest disc in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Transition</code> or give it a CSS class keyed on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lastMove</code> that starts with a negative <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">translateY</code> and transitions to zero. Only the newest disc animates.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you extract this for reuse?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useConnectFour()</code> composable that owns the ref and returns the game, computed helpers and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">play(col)</code> action, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">connect4.js</code> underneath for unit tests.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add an AI opponent?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A pure minimax with alpha-beta pruning to a fixed depth, called after the human move, possibly in a Web Worker. It returns a column, and the component calls the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">drop</code>.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State transition function** | A pure function from (game, column) to the next game |
| **Gravity** | Finding the lowest empty row of a column |
| **Last-move check** | Checking only the lines through the new disc |
| **Immutable update** | Returning a new object instead of editing the old one |
| **aria-disabled** | Unavailable to assistive tech while staying focusable |

---

**Conclusion:** The Vue Connect Four is one ref, a pure <code>drop</code> function that handles gravity, placement, the last-move win check and turns, and a column component that is a labelled button emitting <code>drop</code>. Keep the rules out of the components and every follow-up (animation, AI, undo, online play) becomes an addition rather than a rewrite.`,
        files: {
          "/src/App.vue": `<script setup>
import { ref, computed } from "vue";
import BoardColumn from "./components/BoardColumn.vue";
import {
  COLS,
  announce,
  columnLabel,
  drop,
  isOver,
  landingRow,
  newGame,
  statusText,
} from "./connect4.js";

// One ref holds the whole game; drop() always returns a new object.
const game = ref(newGame());
const over = computed(() => isOver(game.value));
const winLine = computed(() =>
  game.value.winner ? game.value.winner.line : [],
);
const columns = Array.from({ length: COLS }, (_, c) => c);

function onDrop(col) {
  game.value = drop(game.value, col);
}
</script>

<template>
  <main class="c4">
    <h1>Connect Four</h1>
    <p
      :class="['status', game.current.toLowerCase()]"
      data-testid="status"
    >{{ statusText(game) }}</p>
    <div
      class="grid"
      role="group"
      aria-label="Connect Four board, 7 columns by 6 rows"
    >
      <BoardColumn
        v-for="col in columns"
        :key="col"
        :col="col"
        :board="game.board"
        :win-line="winLine"
        :label="columnLabel(game, col)"
        :disabled="over || landingRow(game.board, col) === -1"
        @drop="onDrop"
      />
    </div>
    <p
      class="sr-only"
      data-testid="announce"
      aria-live="polite"
    >{{ announce(game) }}</p>
    <button
      type="button"
      class="restart"
      data-testid="restart"
      @click="game = newGame()"
    >New game</button>
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}
.c4 {
  max-width: 460px;
  margin: 0 auto;
  padding: 24px 12px;
  text-align: center;
}
.c4 h1 {
  font-size: 1.4rem;
  margin: 0 0 8px;
}
.status {
  font-weight: 700;
  min-height: 1.5em;
}
.status.red {
  color: #f87171;
}
.status.yellow {
  color: #facc15;
}
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  padding: 8px;
  background: #1d4ed8;
  border-radius: 12px;
  margin: 12px 0;
}
.restart {
  padding: 10px 20px;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid #475569;
  background: #334155;
  color: #f8fafc;
  cursor: pointer;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
`,
          "/src/components/BoardColumn.vue": `<script setup>
import { ROWS, COLS } from "../connect4.js";

const props = defineProps({
  col: { type: Number, required: true },
  board: { type: Array, required: true },
  winLine: { type: Array, default: () => [] },
  label: { type: String, required: true },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["drop"]);

const rows = Array.from({ length: ROWS }, (_, r) => r);
const disc = (row) => props.board[row * COLS + props.col];

function onClick() {
  if (!props.disabled) emit("drop", props.col);
}
</script>

<template>
  <button
    type="button"
    class="column"
    :data-testid="'col-' + col"
    :aria-label="label"
    :aria-disabled="disabled"
    @click="onClick"
  >
    <span
      v-for="row in rows"
      :key="row"
      :data-testid="'slot-' + row + '-' + col"
      :class="['slot', disc(row) && disc(row).toLowerCase(), { win: winLine.includes(row * COLS + col) }]"
    />
  </button>
</template>

<style scoped>
.column {
  display: grid;
  grid-template-rows: repeat(6, 1fr);
  gap: 4px;
  padding: 2px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}
.column:hover:not([aria-disabled="true"]) {
  background: #2563eb;
}
.column[aria-disabled="true"] {
  cursor: not-allowed;
}
.column:focus-visible {
  outline: 3px solid #fbbf24;
  outline-offset: 1px;
}
.slot {
  display: block;
  aspect-ratio: 1;
  border-radius: 50%;
  background: #0f172a;
}
.slot.red {
  background: #ef4444;
}
.slot.yellow {
  background: #facc15;
}
.slot.win {
  box-shadow: 0 0 0 3px #f8fafc inset;
}
</style>
`,
          "/src/connect4.js": `// Pure Connect Four logic. No framework code, so it can be tested on its own.
// Flat board: cell (row, col) is at row * COLS + col, row 0 is the TOP row.
export const ROWS = 6;
export const COLS = 7;
export const NEED = 4;
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export const newGame = () => ({
  board: Array(ROWS * COLS).fill(null),
  current: "Red",
  winner: null, // { player, line } once someone connects four
  lastMove: null, // { row, col } of the latest disc
  moves: 0,
});

// Gravity: the disc lands in the lowest empty row of the column, or -1 if full.
export function landingRow(board, col) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (!board[row * COLS + col]) return row;
  }
  return -1;
}

// Only lines through the new disc can be
// new wins: 4 directions, 3 cells each way.
export function winFrom(board, row, col) {
  const player = board[row * COLS + col];
  for (const [dr, dc] of DIRECTIONS) {
    const line = [row * COLS + col];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        line.length < NEED &&
        r >= 0 &&
        r < ROWS &&
        c >= 0 &&
        c < COLS &&
        board[r * COLS + c] === player
      ) {
        line.push(r * COLS + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= NEED)
      return { player, line: line.sort((a, b) => a - b) };
  }
  return null;
}

export const isDraw = (game) => !game.winner && game.moves === ROWS * COLS;
export const isOver = (game) => Boolean(game.winner) || isDraw(game);

// Returns a NEW game object; an illegal drop returns the same object.
export function drop(game, col) {
  if (isOver(game)) return game;
  const row = landingRow(game.board, col);
  if (row === -1) return game;
  const board = game.board.slice();
  board[row * COLS + col] = game.current;
  const winner = winFrom(board, row, col);
  return {
    board,
    winner,
    lastMove: { row, col },
    moves: game.moves + 1,
    current: winner ? game.current : game.current === "Red" ? "Yellow" : "Red",
  };
}

export function statusText(game) {
  if (game.winner) return game.winner.player + " wins!";
  if (isDraw(game)) return "Draw: the board is full";
  return "Turn: " + game.current;
}

// What a screen reader hears after each move.
export function announce(game) {
  if (!game.lastMove) return "";
  const { row, col } = game.lastMove;
  const who = game.board[row * COLS + col];
  return (
    who +
    " dropped in column " +
    (col + 1) +
    ", row " +
    (ROWS - row) +
    " from the bottom. " +
    statusText(game)
  );
}

export function columnLabel(game, col) {
  const free = landingRow(game.board, col) + 1;
  return "Column " + (col + 1) + ", " + (free === 0 ? "full" : free + " empty");
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers preparing for a machine coding round. Comfortable with signals, <code>@Input</code>/<code>@Output</code> and the built-in control flow.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> for the vocabulary. Excerpts come from the runnable solution; Verified output is from Angular 22.2.3, compiled AOT with strict templates and at runtime (JIT) like the playground.

## 1. A Story First

In Connect Four you never pick a slot. You pick a column and gravity picks the slot, the way a vending machine works out where your snack lands after you press a column button. The only thing that changes on a move is that one new disc, so it is the only place a new four in a row can be. Those two facts shape the whole solution.

## 2. The Plan

<code>connect4.ts</code> holds the typed rules (<code>Player</code>, <code>Disc</code>, <code>Win</code>, <code>Game</code>) with no Angular imports: <code>newGame</code>, <code>landingRow</code>, <code>winFrom</code>, <code>drop</code>, <code>isDraw</code>, <code>isOver</code>, <code>statusText</code>, <code>announce</code>, <code>columnLabel</code>.

| Value | Angular tool |
| :--- | :--- |
| The game object | <code>signal(newGame())</code> |
| Over, status, announcement, winning slots | <code>computed()</code> |
| Column label and full check | Methods called from the template |
| Column click | <code>@Output() dropDisc</code> on <code>ColumnComponent</code> |

📌 **Interview term: State transition function** — <code>drop(game, col)</code> is pure: it finds the landing row, copies the board, places the disc, checks for a win and returns the next game, or the same object when the drop is illegal.

## 3. Build It Step by Step

### Step 1: the rules

\`\`\`ts
// Gravity: the disc lands in the lowest
// empty row of the column, or -1 if full.
export function landingRow(board: Disc[], col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (!board[row * COLS + col]) return row;
  }
  return -1;
}

// Only lines through the new disc can be
// new wins: 4 directions, 3 cells each way.
export function winFrom(
  board: Disc[],
  row: number,
  col: number,
): Win | null {
  const player = board[row * COLS + col];
  if (!player) return null;
  for (const [dr, dc] of DIRECTIONS) {
    const line = [row * COLS + col];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        line.length < NEED &&
        r >= 0 &&
        r < ROWS &&
        c >= 0 &&
        c < COLS &&
        board[r * COLS + c] === player
      ) {
        line.push(r * COLS + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= NEED)
      return { player, line: line.sort((a, b) => a - b) };
  }
  return null;
}

export const isDraw = (game: Game): boolean =>
  !game.winner && game.moves === ROWS * COLS;
export const isOver = (game: Game): boolean =>
  !!game.winner || isDraw(game);

// Returns a NEW game object; an illegal drop returns the same object.
export function drop(game: Game, col: number): Game {
  if (isOver(game)) return game;
  const row = landingRow(game.board, col);
  if (row === -1) return game;
  const board = game.board.slice();
  board[row * COLS + col] = game.current;
  const winner = winFrom(board, row, col);
  return {
    board,
    winner,
    lastMove: { row, col },
    moves: game.moves + 1,
    current: winner
      ? game.current
      : game.current === "Red"
        ? "Yellow"
        : "Red",
  };
}
\`\`\`

📌 **Interview term: Gravity** — <code>landingRow</code> scans from the bottom row up and returns the first empty row or -1.

📌 **Interview term: Last-move check** — <code>winFrom</code> walks four directions both ways from the new disc, bounded by row and column separately, stopping at four: at most 24 reads, rather than scanning all 69 lines.

<code>drop</code> only switches <code>current</code> when there is no winner. The draw is 42 moves without a winner.

### Step 2: the AppComponent

\`\`\`ts
export class AppComponent {
  readonly newGame = newGame;
  readonly columns = Array.from({ length: COLS }, (_, c) => c);

  // One signal holds the whole game;
  // drop() always returns a new object.
  readonly game = signal(newGame());
  readonly over = computed(() => isOver(this.game()));
  readonly status = computed(() => statusText(this.game()));
  readonly announcement = computed(() => announce(this.game()));
  readonly winLine = computed(() => this.game().winner?.line ?? []);

  label(col: number): string {
    return columnLabel(this.game(), col);
  }
  isFull(col: number): boolean {
    return landingRow(this.game().board, col) === -1;
  }
  onDrop(col: number): void {
    this.game.update((g) => drop(g, col));
  }
}
\`\`\`

\`\`\`ts
template: \`
    <main class="c4">
      <h1>Connect Four</h1>
      <p class="status" [class.red]="game().current === 'Red'" [class.yellow]="game().current === 'Yellow'"
         data-testid="status">{{ status() }}</p>
      <div class="grid" role="group" aria-label="Connect Four board, 7 columns by 6 rows">
        @for (col of columns; track col) {
          <app-column
            [col]="col"
            [board]="game().board"
            [winLine]="winLine()"
            [label]="label(col)"
            [disabled]="over() || isFull(col)"
            (dropDisc)="onDrop($event)"
          />
        }
      </div>
      <p class="sr-only" data-testid="announce" aria-live="polite">{{ announcement() }}</p>
      <button type="button" class="restart" data-testid="restart" (click)="game.set(newGame())">New game</button>
    </main>
  \`,
\`\`\`

📌 **Interview term: Signal update with a pure function** — <code>this.game.update((g) => drop(g, col))</code>. When <code>drop</code> refuses a move it returns the same reference, and the signal's <code>Object.is</code> check means nothing is re-rendered. Mutating <code>this.game().board</code> instead would change data without notifying anyone. See [Angular signals](/interview-question/what-are-angular-signals).

<code>label(col)</code> and <code>isFull(col)</code> are methods that read the signal. They run on every check of the view, which is fine for seven columns; for heavier work a <code>computed</code> array would cache them. See [computed() vs method calls](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls).

### Step 3: the ColumnComponent

\`\`\`ts
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { COLS, Disc, ROWS } from "./connect4";

@Component({
  selector: "app-column",
  standalone: true,
  template: \`
    <button
      type="button"
      class="column"
      [attr.data-testid]="'col-' + col"
      [attr.aria-label]="label"
      [attr.aria-disabled]="disabled"
      (click)="onClick()"
    >
      @for (row of rows; track row) {
        <span
          [attr.data-testid]="'slot-' + row + '-' + col"
          class="slot"
          [class.red]="disc(row) === 'Red'"
          [class.yellow]="disc(row) === 'Yellow'"
          [class.win]="winLine.includes(row * cols + col)"
        ></span>
      }
    </button>
  \`,
\`\`\`

\`\`\`ts
@Input() board: Disc[] = [];
@Input() winLine: number[] = [];
@Input() label = "";
@Input() disabled = false;
@Output() dropDisc = new EventEmitter<number>();

readonly rows = Array.from({ length: ROWS }, (_, r) => r);
readonly cols = COLS;

disc(row: number): Disc {
  return this.board[row * COLS + this.col];
}

onClick(): void {
  if (!this.disabled) this.dropDisc.emit(this.col);
}
\`\`\`

- The column is one button labelled with its free space; slots are spans rendered with <code>@for</code>.
- 📌 **Interview term: aria-disabled** — <code>[attr.aria-disabled]</code> marks a full column unavailable without removing focus, and <code>onClick</code> checks <code>disabled</code> before emitting. A native <code>[disabled]</code> would drop keyboard focus as soon as the focused column filled up.
- The output is named <code>dropDisc</code> rather than <code>drop</code> so it cannot be confused with the native drag-and-drop <code>drop</code> DOM event in the parent template. See [how child components emit events](/interview-question/how-do-child-components-emit-events-to-parents).
- <code>readonly cols = COLS</code> exposes the constant to the template, which cannot see module-level names.

## 4. Verified

Rules run with node:

\`\`\`text
gravity          | first disc in col 4 lands in row 5 (bottom = 5)
full column      | landingRow = -1 | 7th drop returns the same object: true
vertical         | Red wins! | cells 14,21,28,35 | moves 7
horizontal       | Red wins! | cells 35,36,37,38 | moves 7
diagonal /       | Red wins! | cells 17,23,29,35 | moves 11
diagonal \\       | Red wins! | cells 17,25,33,41 | moves 11
42-move draw     | Draw: the board is full  | moves 42
\`\`\`

Booted with <code>bootstrapApplication(AppComponent)</code> under AOT and JIT and driven by clicks on the column buttons (rows printed top first; winning slots as <code>row-col</code>). AOT output:

\`\`\`text
RENDERED: Connect FourTurn: RedNew game
start      : Turn: Red | Column 1, 6 empty
first drop : ...R... | Red dropped in column 4, row 1 from the bottom. Turn: Yellow
stacks     : ...Y.../...R... | Column 4, 4 empty
vertical   : Red wins! | win slots = 2-0 3-0 4-0 5-0
after win  : col 6 aria-disabled = true | bottom row = RY.....
diagonal   : Red wins! | win slots = 5-0 4-1 3-2 2-3
board      : ...R.../..RR.../.RRY.../RYYY..Y
full col   : Column 7, full | aria-disabled = true | Turn: Red
7th drop   : Turn: Red | col 7 discs = 6
42 moves   : Draw: the board is full | win slots = none | disabled cols = 7
\`\`\`

The JIT run printed the same lines, and both match the React and Vue builds. Layout and colours were not checked in jsdom.

## 5. Common Pitfalls

- **Template referencing module constants.** <code>COLS</code> in a template is undefined; expose it as a field.
- **Mutating the game inside the signal.** No notification; always return a new object from <code>drop</code>.
- **Flat-index bounds.** Check row and column, not <code>index &lt; 42</code>.
- **Switching turns after a win.** The status names the wrong player.
- **<code>[disabled]</code> on the focused column.** Focus is lost when it fills.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"A signal holds one game object: a flat array of 42 slots, the current player, the winner, the last move and the move count."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Gravity:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">landingRow</code> scans the chosen column bottom-up and returns the first empty row or -1."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Win check:</strong> <span style="color:#f0e2c8;">"Only the new disc can create a four, so I walk four directions both ways from it and stop at four: at most 24 reads."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Transition:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">drop</code> is pure; the component calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">game.update(g =&gt; drop(g, col))</code>. Illegal drops return the same reference, so nothing re-renders."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. UI:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ColumnComponent</code> is one labelled button per column with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-disabled</code>, emitting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dropDisc</code>; a live region narrates moves. Then I test each direction, a full column and a draw."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you move the state into a service?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if another component, such as a scoreboard or move list, needs it. Then an injectable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GameStore</code> with the signal and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">play(col)</code> method, injected with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you use OnPush here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a safe default: the columns receive new board arrays on each move and the parent reads signals, so OnPush checks exactly when inputs change or signals notify.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you animate the drop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A CSS transition on the newest disc, keyed on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lastMove</code>, from a negative <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">translateY</code> to zero; or Angular animations with an enter transition on that slot.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plain unit tests for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">drop</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">winFrom</code>, then a TestBed component test that clicks column buttons and asserts status, winning classes and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-disabled</code>.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State transition function** | Pure function from (game, column) to the next game |
| **Gravity** | Finding the lowest empty row |
| **Last-move check** | Only checking lines through the new disc |
| **Signal update** | <code>update(fn)</code> stores <code>fn(current)</code> and notifies if the reference changed |
| **aria-disabled** | Unavailable to assistive tech while still focusable |

---

**Conclusion:** Angular Connect Four is one signal, a pure typed <code>drop</code> function and a column component wired with <code>@Input</code>/<code>@Output</code>. Return new objects, check only the lines through the new disc, keep full columns focusable with <code>aria-disabled</code>, and the game behaves identically in AOT and runtime-compiled builds.`,
        files: {
          "/src/app/app.component.ts": `import { Component, computed, signal } from "@angular/core";
import { ColumnComponent } from "./column.component";
import {
  COLS,
  announce,
  columnLabel,
  drop,
  isOver,
  landingRow,
  newGame,
  statusText,
} from "./connect4";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [ColumnComponent],
  template: \`
    <main class="c4">
      <h1>Connect Four</h1>
      <p class="status" [class.red]="game().current === 'Red'" [class.yellow]="game().current === 'Yellow'"
         data-testid="status">{{ status() }}</p>
      <div
        class="grid"
        role="group"
        aria-label="Connect Four board, 7 columns by 6 rows"
      >
        @for (col of columns; track col) {
          <app-column
            [col]="col"
            [board]="game().board"
            [winLine]="winLine()"
            [label]="label(col)"
            [disabled]="over() || isFull(col)"
            (dropDisc)="onDrop($event)"
          />
        }
      </div>
      <p
        class="sr-only"
        data-testid="announce"
        aria-live="polite"
      >{{ announcement() }}</p>
      <button
        type="button"
        class="restart"
        data-testid="restart"
        (click)="game.set(newGame())"
      >New game</button>
    </main>
  \`,
  styles: [
    \`
    :host { display: block; font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    .c4 { max-width: 460px; margin: 0 auto; padding: 24px 12px; text-align: center; }
    .c4 h1 { font-size: 1.4rem; margin: 0 0 8px; }
    .status { font-weight: 700; min-height: 1.5em; }
    .status.red { color: #f87171; }
    .status.yellow { color: #facc15; }
    .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 8px; background: #1d4ed8;
      border-radius: 12px; margin: 12px 0; }
    .restart { padding: 10px 20px; font-size: 1rem; border-radius: 8px; border: 1px solid #475569; background: #334155;
      color: #f8fafc; cursor: pointer; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  \`,
  ],
})
export class AppComponent {
  readonly newGame = newGame;
  readonly columns = Array.from({ length: COLS }, (_, c) => c);

  // One signal holds the whole game; drop() always returns a new object.
  readonly game = signal(newGame());
  readonly over = computed(() => isOver(this.game()));
  readonly status = computed(() => statusText(this.game()));
  readonly announcement = computed(() => announce(this.game()));
  readonly winLine = computed(() => this.game().winner?.line ?? []);

  label(col: number): string {
    return columnLabel(this.game(), col);
  }
  isFull(col: number): boolean {
    return landingRow(this.game().board, col) === -1;
  }
  onDrop(col: number): void {
    this.game.update((g) => drop(g, col));
  }
}
`,
          "/src/app/column.component.ts": `import { Component, EventEmitter, Input, Output } from "@angular/core";
import { COLS, Disc, ROWS } from "./connect4";

@Component({
  selector: "app-column",
  standalone: true,
  template: \`
    <button
      type="button"
      class="column"
      [attr.data-testid]="'col-' + col"
      [attr.aria-label]="label"
      [attr.aria-disabled]="disabled"
      (click)="onClick()"
    >
      @for (row of rows; track row) {
        <span
          [attr.data-testid]="'slot-' + row + '-' + col"
          class="slot"
          [class.red]="disc(row) === 'Red'"
          [class.yellow]="disc(row) === 'Yellow'"
          [class.win]="winLine.includes(row * cols + col)"
        ></span>
      }
    </button>
  \`,
  styles: [
    \`
      :host {
        display: block;
      }
      .column {
        display: grid;
        grid-template-rows: repeat(6, 1fr);
        gap: 4px;
        padding: 2px;
        border: none;
        border-radius: 8px;
        background: transparent;
        cursor: pointer;
        width: 100%;
      }
      .column:hover:not([aria-disabled="true"]) {
        background: #2563eb;
      }
      .column[aria-disabled="true"] {
        cursor: not-allowed;
      }
      .column:focus-visible {
        outline: 3px solid #fbbf24;
        outline-offset: 1px;
      }
      .slot {
        display: block;
        aspect-ratio: 1;
        border-radius: 50%;
        background: #0f172a;
      }
      .slot.red {
        background: #ef4444;
      }
      .slot.yellow {
        background: #facc15;
      }
      .slot.win {
        box-shadow: 0 0 0 3px #f8fafc inset;
      }
    \`,
  ],
})
export class ColumnComponent {
  @Input() col = 0;
  @Input() board: Disc[] = [];
  @Input() winLine: number[] = [];
  @Input() label = "";
  @Input() disabled = false;
  @Output() dropDisc = new EventEmitter<number>();

  readonly rows = Array.from({ length: ROWS }, (_, r) => r);
  readonly cols = COLS;

  disc(row: number): Disc {
    return this.board[row * COLS + this.col];
  }

  onClick(): void {
    if (!this.disabled) this.dropDisc.emit(this.col);
  }
}
`,
          "/src/app/connect4.ts": `// Pure Connect Four logic. No framework code, so it can be tested on its own.
// Flat board: cell (row, col) is at row * COLS + col, row 0 is the TOP row.
export type Player = "Red" | "Yellow";
export type Disc = Player | null;
export interface Win {
  player: Player;
  line: number[];
}
export interface Game {
  board: Disc[];
  current: Player;
  winner: Win | null; // set once someone connects four
  lastMove: { row: number; col: number } | null;
  moves: number;
}

export const ROWS = 6;
export const COLS = 7;
export const NEED = 4;
const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export const newGame = (): Game => ({
  board: Array<Disc>(ROWS * COLS).fill(null),
  current: "Red",
  winner: null,
  lastMove: null,
  moves: 0,
});

// Gravity: the disc lands in the lowest empty row of the column, or -1 if full.
export function landingRow(board: Disc[], col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (!board[row * COLS + col]) return row;
  }
  return -1;
}

// Only lines through the new disc can be
// new wins: 4 directions, 3 cells each way.
export function winFrom(board: Disc[], row: number, col: number): Win | null {
  const player = board[row * COLS + col];
  if (!player) return null;
  for (const [dr, dc] of DIRECTIONS) {
    const line = [row * COLS + col];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        line.length < NEED &&
        r >= 0 &&
        r < ROWS &&
        c >= 0 &&
        c < COLS &&
        board[r * COLS + c] === player
      ) {
        line.push(r * COLS + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= NEED)
      return { player, line: line.sort((a, b) => a - b) };
  }
  return null;
}

export const isDraw = (game: Game): boolean =>
  !game.winner && game.moves === ROWS * COLS;
export const isOver = (game: Game): boolean => !!game.winner || isDraw(game);

// Returns a NEW game object; an illegal drop returns the same object.
export function drop(game: Game, col: number): Game {
  if (isOver(game)) return game;
  const row = landingRow(game.board, col);
  if (row === -1) return game;
  const board = game.board.slice();
  board[row * COLS + col] = game.current;
  const winner = winFrom(board, row, col);
  return {
    board,
    winner,
    lastMove: { row, col },
    moves: game.moves + 1,
    current: winner ? game.current : game.current === "Red" ? "Yellow" : "Red",
  };
}

export function statusText(game: Game): string {
  if (game.winner) return game.winner.player + " wins!";
  if (isDraw(game)) return "Draw: the board is full";
  return "Turn: " + game.current;
}

// What a screen reader hears after each move.
export function announce(game: Game): string {
  if (!game.lastMove) return "";
  const { row, col } = game.lastMove;
  const who = game.board[row * COLS + col];
  return (
    who +
    " dropped in column " +
    (col + 1) +
    ", row " +
    (ROWS - row) +
    " from the bottom. " +
    statusText(game)
  );
}

export function columnLabel(game: Game, col: number): string {
  const free = landingRow(game.board, col) + 1;
  return "Column " + (col + 1) + ", " + (free === 0 ? "full" : free + " empty");
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build Grid Lights",
    seoDescription: "Build Grid Lights: click cells to light them, and once all are on they switch off in reverse order every 300 ms. React, Vue and Angular, timing verified.",
    description: `**Question presented to candidate:**
"Build a small grid of lights, 3 by 3 with the middle cell empty. Clicking a cell turns it on. When every light is on, they should turn off one by one in the reverse of the order they were clicked, one every 300 milliseconds. While they are turning off, clicks should be ignored."

**Requirements:**
- Render the grid from a config array (1 = light, 0 = empty slot); the default is a 3 x 3 ring with a hole in the centre.
- Clicking an off light turns it on; clicking a light that is already on does nothing.
- When all lights are on, deactivate them in reverse activation order at a fixed 300 ms interval.
- Ignore clicks during deactivation; after the last light turns off, the grid accepts clicks again.
- Clean up timers if the component unmounts.

**What a strong answer should cover:**
- Storing the activation ORDER as the state (an array of indices) so "is it on" and "which goes off next" are both derived from it.
- The deactivation as a stack: last in, first out, one pop per tick.
- Timer choice and cleanup: a chained \`setTimeout\` per step or one \`setInterval\`, cleared on completion and on unmount.
- A \`deactivating\` flag (or derived phase) that locks input, and why it is needed.
- Accessibility: buttons with \`aria-pressed\` for on/off, a label per cell, and \`aria-disabled\` while locked.

**Clarifying questions expected:**
- "Is the interval fixed at 300 ms, and should the first light go off immediately or after one interval?"
- "Can the grid shape change, for example a 4 x 4 config?"
- "Should a click during deactivation be ignored, or should it cancel the sequence?"

**Code / implementation expected:** Yes. A working grid with the timed reverse deactivation; expect questions about timer cleanup.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. Comfortable with React state and props; this question is mostly about timers and effects, explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Excerpts come from the runnable solution on this page, and the Verified section quotes timings measured with real timers on React 19.3.1.

## 1. Why This Even Matters — A Story First

Think of a stack of plates. You put plates on one at a time; when you clear the stack, you take the *last* one you put down first. Grid Lights is that stack wearing a disguise. Each click puts a light on the stack. When the stack is full, the lights come off top-first, one every 300 milliseconds, like someone lifting a plate on every beat of a metronome.

The question looks easy because the rendering is trivial. What the interviewer is really checking is whether you can run a timed sequence in React without leaking timers, double-firing in development, or letting a stray click break the sequence halfway.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does the first light go off immediately, or 300 ms after the last click? | Decides whether the first step is scheduled or run synchronously. Here: after 300 ms. |
| Fixed 3 x 3, or any config? | Rendering from a config array costs nothing and shows foresight. |
| What happens to a click during deactivation? | Ignore it, or cancel the sequence? Here: ignore. |
| Can a lit cell be turned off by clicking it? | Usually no; it is a "turn on only" toy. |
| Any accessibility expectations? | Tells you to use toggle-button semantics and announce the phase. |

## 3. Requirements and the Plan

**Component tree:** <code>App</code> owns the state and the timer; <code>Light</code> renders one cell (a button, or an empty slot for 0 in the config). The rules are tiny pure functions in <code>src/lights.js</code>.

| Value | Kind | Notes |
| :--- | :--- | :--- |
| <code>order</code> | State | Indices of lit cells, in click order |
| <code>deactivating</code> | State | True while the reverse sequence runs |
| Is cell i on? | Derived | <code>order.includes(i)</code> |
| Next to turn off | Derived | The last element of <code>order</code> |
| Slots and total lights | Constants | Computed once from <code>CONFIG</code> at module level |

📌 **Interview term: Derived state** — a value computed from other state rather than stored. A separate <code>isOn[]</code> array next to <code>order</code> would be a second truth that can disagree with the first.

📌 **Interview term: LIFO (last in, first out)** — the order a stack is emptied in. <code>order</code> grows with <code>[...order, i]</code> and shrinks with <code>order.slice(0, -1)</code>.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Two phases: collecting clicks until all lights are on, then deactivating one light every 300 milliseconds until none are on">
  <defs>
    <marker id="glr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="90" width="230" height="90" rx="12"/>
  <text class="d-text" x="155" y="124" text-anchor="middle">Collecting</text>
  <text class="d-sub" x="155" y="150" text-anchor="middle">click appends to order</text>
  <rect class="d-box-accent" x="410" y="90" width="230" height="90" rx="12"/>
  <text class="d-text d-accent" x="525" y="124" text-anchor="middle">Deactivating</text>
  <text class="d-sub" x="525" y="150" text-anchor="middle">clicks ignored</text>
  <path class="d-edge-accent" d="M 270 115 L 404 115" marker-end="url(#glr-arrow)"/>
  <text class="d-sub" x="337" y="100" text-anchor="middle">all on</text>
  <path class="d-edge" d="M 404 160 L 276 160" marker-end="url(#glr-arrow)"/>
  <text class="d-sub" x="340" y="186" text-anchor="middle">order empty</text>
  <path class="d-edge-dashed" d="M 560 180 C 600 260, 470 260, 500 186" marker-end="url(#glr-arrow)"/>
  <text class="d-sub" x="530" y="276" text-anchor="middle">every 300 ms: pop last</text>
  <path class="d-edge-dashed" d="M 110 90 C 70 20, 220 20, 190 84" marker-end="url(#glr-arrow)"/>
  <text class="d-sub" x="215" y="50">click an off light</text>
</svg>

There are only two phases. Input is accepted in the first and ignored in the second, and the timer exists only while the second is active.

## 4. Build It Step by Step

### Step 1: config-driven slots and tiny rules

\`\`\`js
// Pure Grid Lights logic. No framework
// code, so it can be tested on its own.
// 1 = a light, 0 = an empty slot. The default
// is a 3 x 3 ring with a hole in the middle.
export const CONFIG = [
  [1, 1, 1],
  [1, 0, 1],
  [1, 1, 1],
];
export const OFF_DELAY_MS = 300;

// Flatten the config into renderable slots, each with a stable index.
export function slotsFrom(config) {
  return config.flatMap((row, r) =>
    row.map((on, c) => ({
      index: r * row.length + c,
      row: r,
      col: c,
      isLight: on === 1,
    })),
  );
}

export const countLights = (config) =>
  config.flat().filter((v) => v === 1).length;

// The activation ORDER is the state: a
// light is "on" when its index is in it.
export function activate(order, index) {
  return order.includes(index) ? order : [...order, index];
}

// Deactivation removes the most recently activated light first.
export const deactivateLast = (order) => order.slice(0, -1);
\`\`\`

Rendering from <code>CONFIG</code> means a 4 x 4 or an L-shaped grid is a data change, not a code change. <code>slotsFrom</code> and <code>countLights</code> run once at module level in <code>App.js</code> because the config never changes at runtime.

### Step 2: clicking

\`\`\`jsx
function handleActivate(index) {
  if (deactivating || order.includes(index)) return;
  const next = activate(order, index);
  setOrder(next);
  if (next.length === TOTAL) setDeactivating(true);
}
\`\`\`

Two guards: ignore clicks while deactivating, and ignore clicks on lights that are already on. When the click that lights the last cell arrives, flip <code>deactivating</code> on. React batches both state updates from one event into a single render. See [how React batching works](/interview-question/how-does-react-s-batching-work).

### Step 3: the timed sequence as an effect

\`\`\`jsx
export default function App() {
  // indices, in the order they were turned on
  const [order, setOrder] = useState([]);
  const [deactivating, setDeactivating] = useState(false);

  // One timeout per step: each run turns off ONE
  // light, then the new \`order\` schedules the next.
  // The cleanup clears a pending timeout, so
  // StrictMode and unmounts cannot leave one behind.
  useEffect(() => {
    if (!deactivating) return;
    if (order.length === 0) {
      setDeactivating(false);
      return;
    }
    const id = setTimeout(() => setOrder(deactivateLast), OFF_DELAY_MS);
    return () => clearTimeout(id);
  }, [deactivating, order]);
\`\`\`

This is the heart of the answer, so walk through it slowly:

1. The effect runs whenever <code>deactivating</code> or <code>order</code> changes.
2. If we are not deactivating, do nothing.
3. If we are deactivating and <code>order</code> is empty, the sequence is finished: switch back to collecting.
4. Otherwise schedule **one** timeout that removes the last light. That changes <code>order</code>, the effect runs again, and the next timeout is scheduled. The chain advances one light per run.

📌 **Interview term: Effect cleanup** — the function returned from <code>useEffect</code> runs before the effect runs again and when the component unmounts. Here it clears the pending timeout, so there is never more than one timer alive, and nothing fires after unmount. See [the cleanup function in useEffect](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect).

📌 **Interview term: StrictMode double-invocation** — in development, <code>&lt;StrictMode&gt;</code> runs each effect's setup, then its cleanup, then setup again when a component mounts, to flush out effects that do not clean up. A probe on React 19.3.1 printed <code>setup | cleanup | setup | timeout fired</code> for a mount effect with a timeout: one timeout fired, not two, because the cleanup cleared the first. Our effect is safe for the same reason. See [why StrictMode double-invokes effects](/interview-question/why-does-react-18-strictmode-double-invoke-your-components-and-effects).

Why a chain of timeouts rather than one <code>setInterval</code>? Both work. The chain keeps every step in one place, needs no ref to hold an interval id, and cannot keep ticking after <code>order</code> is empty. An interval version needs a ref and a manual stop; the Vue and Angular tabs of this question show that style. One honest difference: each timeout in the chain is scheduled only after the previous step has rendered, so the steps can drift later by a few milliseconds each, while an interval keeps a steadier beat. In the Verified run the last light still went off inside the same 2.3 to 2.7 second window as the interval versions. Passing <code>deactivateLast</code> to <code>setOrder</code> (the updater form) means the timeout never reads a stale <code>order</code>.

### Step 4: the light

\`\`\`jsx
export default function Light({ slot, on, locked, onActivate }) {
  if (!slot.isLight)
    return <span className="hole" aria-hidden="true" />;
  return (
    <button
      type="button"
      data-testid={"light-" + slot.index}
      className={"light" + (on ? " on" : "")}
      aria-label={
        "Row " + (slot.row + 1) + ", column " + (slot.col + 1)
      }
      aria-pressed={on}
      aria-disabled={locked}
      onClick={() => onActivate(slot.index)}
    />
  );
}
\`\`\`

- 📌 **Interview term: Toggle button** — a button with <code>aria-pressed</code> tells screen readers it is on or off ("Row 1, column 1, toggle button, pressed").
- <code>aria-disabled</code> during deactivation, not <code>disabled</code>: a disabled button loses focus, and the last-clicked cell always has focus at that moment.
- The empty slot is an <code>aria-hidden</code> span, so it is skipped by screen readers and the Tab order.

The status line ("3 of 8 on" / "Turning off in reverse order...") is a polite live region.

## 5. Verified

**The rules.** Run with node:

\`\`\`text
lights: 8 | slots: 9 | hole at index 4
activation order: 0,1,2,5,8,7,6,3 (the repeated 0 was ignored)
deactivation order: 3,6,7,8,5,2,1,0
\`\`\`

**The component, with real timers.** Rendered in <code>&lt;StrictMode&gt;</code> in jsdom. The driver clicked seven lights clockwise, re-clicked a lit one, clicked the eighth, then polled the DOM every 20 ms for 3 seconds, recording when each light went off. Halfway through it clicked an already-off light to check that input is locked:

\`\`\`text
RENDERED: Grid Lights0 of 8 on
start       : 8 lights, center hole = true | 0 of 8 on
7 clicked   : 0,1,2,5,6,7,8 | 7 of 8 on | light-0 aria-pressed = true
8th click   : Turning off in reverse order... | aria-disabled = true
click mid   : light-3 on again? false | 6 on
off order   : 3 then 6 then 7 then 8 then 5 then 2 then 1 then 0
first off   : after ~300 ms (rounded to 100 ms)
last off    : between 2300 and 2700 ms after the 8th click: true
gaps        : 7 gaps, every one between 250 and 350 ms: true
end         : 0 of 8 on | aria-disabled = false
new round   : 5 | 1 of 8 on
\`\`\`

The off order is the exact reverse of the click order, and each light went off about 300 ms after the previous one (times are measured from just after the eighth click, the first is rounded to the nearest 100 ms, and the gaps and the end of the sequence are checked against windows, because real timers jitter). The mid-sequence click was ignored, and after the sequence the grid accepted a new click. Visual glow and colours were not checked in jsdom.

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Click a lit light | Ignored by <code>activate</code> and by the guard |
| Click during deactivation | Ignored; cells are <code>aria-disabled</code> |
| Unmount mid-sequence | Effect cleanup clears the pending timeout |
| StrictMode in development | Setup, cleanup, setup on mount leaves one timer at most |
| Other grid shapes | Change <code>CONFIG</code>; columns come from its first row |
| Keyboard | Real buttons; the empty slot is not focusable |
| Screen readers | <code>aria-pressed</code> state, position labels, a live status line |

## 7. Common Pitfalls

- **Storing <code>isOn</code> per cell plus a separate order array.** Two truths; derive "on" from the order.
- **Scheduling all eight timeouts at once with <code>i * 300</code>.** It works until something interrupts it; then you must track and clear eight ids.
- **An interval that reads <code>order</code> from its closure.** It sees the value from when it was created and pops the same light forever. Use the updater form or a ref. See [stale closures in hooks](/interview-question/what-causes-stale-closures-in-react-hooks-and-how-do-you-fix-them-correctly).
- **No cleanup.** Timers fire after unmount, and in StrictMode development you may start two sequences.
- **Forgetting to lock input.** A click during deactivation re-adds a light and the sequence never ends cleanly.
- **Using <code>disabled</code>.** Focus jumps to the page body when the sequence starts.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"I render from a config array. The only state is the activation <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order</code>, a list of indices, plus a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deactivating</code> flag. Whether a cell is on is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order.includes(i)</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Clicking:</strong> <span style="color:#f0e2c8;">"A click appends to the order unless the cell is on or we are deactivating. The click that completes the set turns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deactivating</code> on."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Sequence:</strong> <span style="color:#f0e2c8;">"An effect on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deactivating</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order</code> schedules one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> that pops the last index. The new order re-runs the effect, so it chains one light per 300 ms and stops when the order is empty."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cleanup:</strong> <span style="color:#f0e2c8;">"The effect returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clearTimeout</code>, so there is at most one timer, nothing fires after unmount, and StrictMode setup, cleanup, setup is harmless."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. A11y and verify:</strong> <span style="color:#f0e2c8;">"Cells are toggle buttons with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-pressed</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-disabled</code> while locked. I check the reverse order and the 300 ms spacing with real timers."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not schedule all the timeouts at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index * 300</code> delays, but then cancelling or changing the sequence means tracking every id. A one-step chain has a single pending timer, so cleanup is one line and the sequence can be stopped at any point.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you let a click cancel the sequence instead of ignoring it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On click during deactivation, set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deactivating</code> to false. The effect cleanup clears the pending timeout, and the lights that are still on stay on.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the timing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With fake timers in Jest or Vitest: click all lights, then advance the clock by 300 ms at a time and assert which light went off after each step. Real-time tests are slower and flakier.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the interval had to speed up with each step?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compute the delay from the step number, for example from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TOTAL - order.length</code>, inside the effect. The chained-timeout design handles a changing delay naturally; a single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInterval</code> cannot.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use useReducer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a fine fit: actions <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">activate</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finish</code> on a state of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order</code> plus phase. For two fields and three transitions, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code> with pure helpers is equally clear.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Derived state** | Computed from other state instead of stored |
| **LIFO** | Last in, first out: the order a stack empties |
| **Effect cleanup** | The function an effect returns; runs before the next run and on unmount |
| **StrictMode double-invocation** | Development-only setup, cleanup, setup on mount to expose missing cleanup |
| **Toggle button** | A button with <code>aria-pressed</code> announcing on or off |
| **aria-disabled** | Unavailable to assistive tech without losing focus |

---

**Conclusion:** Grid Lights is a stack and a metronome. Store the activation order, derive which lights are on, lock input during the reverse sequence, and drive that sequence with one timeout per step inside an effect that cleans up after itself. The result turns lights off in exactly the reverse order at a steady 300 ms, survives StrictMode and unmounts, and is easy to change when the interviewer asks for cancel-on-click or a speeding-up sequence.`,
        files: {
          "/App.js": `import { useEffect, useState } from "react";
import Light from "./src/Light";
import {
  CONFIG,
  OFF_DELAY_MS,
  activate,
  countLights,
  deactivateLast,
  slotsFrom,
} from "./src/lights";

const SLOTS = slotsFrom(CONFIG);
const TOTAL = countLights(CONFIG);

export default function App() {
  // indices, in the order they were turned on
  const [order, setOrder] = useState([]);
  const [deactivating, setDeactivating] = useState(false);

  // One timeout per step: each run turns off ONE
  // light, then the new \`order\` schedules the next.
  // The cleanup clears a pending timeout, so
  // StrictMode and unmounts cannot leave one behind.
  useEffect(() => {
    if (!deactivating) return;
    if (order.length === 0) {
      setDeactivating(false);
      return;
    }
    const id = setTimeout(() => setOrder(deactivateLast), OFF_DELAY_MS);
    return () => clearTimeout(id);
  }, [deactivating, order]);

  function handleActivate(index) {
    if (deactivating || order.includes(index)) return;
    const next = activate(order, index);
    setOrder(next);
    if (next.length === TOTAL) setDeactivating(true);
  }

  return (
    <main className="lights-app">
      <h1>Grid Lights</h1>
      <p className="hint" data-testid="status" aria-live="polite">
        {deactivating
          ? "Turning off in reverse order..."
          : order.length + " of " + TOTAL + " on"}
      </p>
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(" + CONFIG[0].length + ", 1fr)" }}
      >
        {SLOTS.map((slot) => (
          <Light
            key={slot.index}
            slot={slot}
            on={order.includes(slot.index)}
            locked={deactivating}
            onActivate={handleActivate}
          />
        ))}
      </div>
    </main>
  );
}
`,
          "/src/Light.js": `export default function Light({ slot, on, locked, onActivate }) {
  if (!slot.isLight) return <span className="hole" aria-hidden="true" />;
  return (
    <button
      type="button"
      data-testid={"light-" + slot.index}
      className={"light" + (on ? " on" : "")}
      aria-label={"Row " + (slot.row + 1) + ", column " + (slot.col + 1)}
      aria-pressed={on}
      aria-disabled={locked}
      onClick={() => onActivate(slot.index)}
    />
  );
}
`,
          "/src/lights.js": `// Pure Grid Lights logic. No framework code, so it can be tested on its own.
// 1 = a light, 0 = an empty slot. The default
// is a 3 x 3 ring with a hole in the middle.
export const CONFIG = [
  [1, 1, 1],
  [1, 0, 1],
  [1, 1, 1],
];
export const OFF_DELAY_MS = 300;

// Flatten the config into renderable slots, each with a stable index.
export function slotsFrom(config) {
  return config.flatMap((row, r) =>
    row.map((on, c) => ({
      index: r * row.length + c,
      row: r,
      col: c,
      isLight: on === 1,
    })),
  );
}

export const countLights = (config) =>
  config.flat().filter((v) => v === 1).length;

// The activation ORDER is the state: a light is "on" when its index is in it.
export function activate(order, index) {
  return order.includes(index) ? order : [...order, index];
}

// Deactivation removes the most recently activated light first.
export const deactivateLast = (order) => order.slice(0, -1);
`,
          "/styles.css": `body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}
.lights-app {
  max-width: 340px;
  margin: 0 auto;
  padding: 24px 16px;
  text-align: center;
}
.lights-app h1 {
  font-size: 1.4rem;
  margin: 0 0 8px;
}
.hint {
  color: #94a3b8;
  min-height: 1.5em;
}
.grid {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}
.light {
  aspect-ratio: 1;
  border-radius: 12px;
  border: 2px solid #334155;
  background: #1e293b;
  cursor: pointer;
}
.light.on {
  background: #22c55e;
  border-color: #4ade80;
  box-shadow: 0 0 18px #16a34a;
}
.light[aria-disabled="true"] {
  cursor: wait;
}
.light:focus-visible {
  outline: 3px solid #38bdf8;
  outline-offset: 2px;
}
.hole {
  aspect-ratio: 1;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers preparing for a machine coding round. Comfortable with <code>ref</code> and components; timers and cleanup are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> for the vocabulary. Excerpts come from the runnable solution; the Verified section quotes timings measured with real timers on Vue 3.5.44.

## 1. A Story First

Grid Lights is a stack of plates with a metronome. Each click puts a plate (a light) on the stack. When every light is on, the metronome starts, and on each beat, every 300 milliseconds, the top plate comes off: the last light you turned on goes off first. While the plates are coming off, nobody is allowed to add one.

## 2. The Plan

<code>src/lights.js</code> holds the config (<code>1</code> = light, <code>0</code> = empty slot) and four tiny pure helpers: <code>slotsFrom</code>, <code>countLights</code>, <code>activate(order, i)</code> and <code>deactivateLast(order)</code>.

| Value | Vue tool | Notes |
| :--- | :--- | :--- |
| <code>order</code> | <code>ref([])</code> | Indices in click order: the single source of truth |
| <code>deactivating</code> | <code>ref(false)</code> | Locks input while the sequence runs |
| Is a light on? | Template expression <code>order.includes(i)</code> | Derived |
| Interval id | Plain <code>let timer</code> | Not reactive: nothing renders it |

📌 **Interview term: LIFO (last in, first out)** — the stack order. Push with <code>[...order, i]</code>, pop with <code>order.slice(0, -1)</code>.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="The order array holds eight indices in click order, and deactivation removes them from the right end one every 300 milliseconds">
  <defs>
    <marker id="glv-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="60" width="60" height="56" rx="8"/>
  <text class="d-text" x="70" y="94" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="110" y="60" width="60" height="56" rx="8"/>
  <text class="d-text" x="140" y="94" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="180" y="60" width="60" height="56" rx="8"/>
  <text class="d-text" x="210" y="94" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="250" y="60" width="60" height="56" rx="8"/>
  <text class="d-text" x="280" y="94" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="320" y="60" width="60" height="56" rx="8"/>
  <text class="d-text" x="350" y="94" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="390" y="60" width="60" height="56" rx="8"/>
  <text class="d-text" x="420" y="94" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="460" y="60" width="60" height="56" rx="8"/>
  <text class="d-text" x="490" y="94" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="530" y="60" width="60" height="56" rx="8"/>
  <text class="d-text d-accent" x="560" y="94" text-anchor="middle">3</text>
  <text class="d-sub" x="40" y="40">first click</text>
  <text class="d-sub" x="590" y="40" text-anchor="end">last click</text>
  <path class="d-edge-accent" d="M 560 124 L 560 170 L 470 170" marker-end="url(#glv-arrow)"/>
  <text class="d-sub" x="440" y="200" text-anchor="middle">off first, then every 300 ms</text>
</svg>

The activation order is the whole state. Lights that are on are exactly the indices in the array, and the next one to switch off is always the last element.

## 3. Build It Step by Step

### Step 1: state and the interval

\`\`\`vue
<script setup>
import { ref, onBeforeUnmount } from "vue";
import GridLight from "./components/GridLight.vue";
import {
  CONFIG,
  OFF_DELAY_MS,
  activate,
  countLights,
  deactivateLast,
  slotsFrom,
} from "./lights.js";

const slots = slotsFrom(CONFIG);
const total = countLights(CONFIG);
const columns = CONFIG[0].length;

const order = ref([]); // indices, in the order they were turned on
const deactivating = ref(false);
let timer = null; // not reactive: the template never reads it

function startDeactivation() {
  deactivating.value = true;
  timer = setInterval(() => {
    order.value = deactivateLast(order.value);
    if (order.value.length === 0) stop();
  }, OFF_DELAY_MS);
}

function stop() {
  clearInterval(timer);
  timer = null;
  deactivating.value = false;
}

function onActivate(index) {
  if (deactivating.value || order.value.includes(index)) return;
  order.value = activate(order.value, index);
  if (order.value.length === total) startDeactivation();
}

onBeforeUnmount(() => clearInterval(timer));
</script>
\`\`\`

- <code>onActivate</code> ignores clicks while deactivating and on lights already on. The click that completes the set starts the sequence.
- 📌 **Interview term: setInterval** — runs a callback repeatedly every N milliseconds until <code>clearInterval</code>. Each tick replaces <code>order.value</code> with a shorter copy, and the tick that empties it calls <code>stop()</code>.
- The interval callback reads <code>order.value</code> at tick time, so it always sees the latest array. A ref is a live box, not a snapshot, which is why Vue does not have React's stale-closure problem here.
- 📌 **Interview term: Lifecycle cleanup** — <code>onBeforeUnmount(() => clearInterval(timer))</code> stops the timer if the component disappears mid-sequence. Without it, the interval keeps writing to a ref nobody renders. See [Vue lifecycle hooks](/interview-question/what-are-vue-lifecycle-hooks).
- <code>timer</code> is a plain variable because the template never reads it; making it a ref would only add tracking overhead.

### Step 2: the template

\`\`\`vue
<template>
  <main class="lights-app">
    <h1>Grid Lights</h1>
    <p class="hint" data-testid="status" aria-live="polite">
      {{
        deactivating
          ? "Turning off in reverse order..."
          : order.length + " of " + total + " on"
      }}
    </p>
    <div
      class="grid"
      :style="{ gridTemplateColumns: 'repeat(' + columns + ', 1fr)' }"
    >
      <GridLight
        v-for="slot in slots"
        :key="slot.index"
        :slot="slot"
        :on="order.includes(slot.index)"
        :locked="deactivating"
        @activate="onActivate"
      />
    </div>
  </main>
</template>
\`\`\`

<code>v-for</code> over the precomputed <code>slots</code> with <code>:key="slot.index"</code>; the grid's column count comes from the config, so a 4 x 4 config renders correctly without code changes.

### Step 3: the light component

\`\`\`vue
<script setup>
defineProps({
  slot: { type: Object, required: true },
  on: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
});
const emit = defineEmits(["activate"]);
</script>

<template>
  <button
    v-if="slot.isLight"
    type="button"
    :data-testid="'light-' + slot.index"
    :class="['light', { on }]"
    :aria-label="'Row ' + (slot.row + 1) + ', column ' + (slot.col + 1)"
    :aria-pressed="on"
    :aria-disabled="locked"
    @click="emit('activate', slot.index)"
  />
  <span v-else class="hole" aria-hidden="true" />
</template>
\`\`\`

📌 **Interview term: Toggle button** — <code>:aria-pressed="on"</code> makes each light announce as pressed or not pressed. <code>:aria-disabled</code> (not <code>:disabled</code>) keeps the focused light focusable when input locks. The empty slot is an <code>aria-hidden</code> span rendered by <code>v-else</code>.

## 4. Verified

The rules alone, with node:

\`\`\`text
lights: 8 | slots: 9 | hole at index 4
activation order: 0,1,2,5,8,7,6,3 (the repeated 0 was ignored)
deactivation order: 3,6,7,8,5,2,1,0
\`\`\`

The app compiled with <code>@vue/compiler-sfc</code> and mounted in jsdom. The driver clicked seven lights clockwise, re-clicked a lit one, clicked the eighth, then polled every 20 ms with real timers and clicked an already-off light mid-sequence:

\`\`\`text
RENDERED: Grid Lights0 of 8 on
start       : 8 lights, center hole = true | 0 of 8 on
7 clicked   : 0,1,2,5,6,7,8 | 7 of 8 on | light-0 aria-pressed = true
8th click   : Turning off in reverse order... | aria-disabled = true
click mid   : light-3 on again? false | 6 on
off order   : 3 then 6 then 7 then 8 then 5 then 2 then 1 then 0
first off   : after ~300 ms (rounded to 100 ms)
last off    : between 2300 and 2700 ms after the 8th click: true
gaps        : 7 gaps, every one between 250 and 350 ms: true
end         : 0 of 8 on | aria-disabled = false
new round   : 5 | 1 of 8 on
\`\`\`

Off order is the exact reverse of the clicks, spaced 300 ms apart (the first time rounded to 100 ms, the gaps and the end checked against windows, since real timers jitter). These lines match the React and Angular builds. The glow styling was not checked in jsdom.

## 5. Common Pitfalls

- **Keeping an <code>isOn</code> array next to <code>order</code>.** Two truths that can disagree.
- **No <code>onBeforeUnmount</code> cleanup.** The interval outlives the component.
- **Forgetting to stop the interval when the order is empty.** It ticks forever, slicing an empty array.
- **Not locking input.** A click mid-sequence re-adds a light, and the sequence never finishes cleanly.
- **Using <code>:disabled</code>.** Focus falls to the page body when the sequence starts.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"I render from a config array. The state is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order</code>, the indices in click order, plus a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deactivating</code> flag. A light is on if its index is in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Click:</strong> <span style="color:#f0e2c8;">"A click appends unless the light is on or we are deactivating; the click that completes the set starts the sequence."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Sequence:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInterval</code> of 300 ms pops the last index each tick and stops itself when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order</code> is empty."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cleanup:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBeforeUnmount</code> clears the interval, and the id lives in a plain variable because nothing renders it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. A11y and verify:</strong> <span style="color:#f0e2c8;">"Lights are toggle buttons with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-pressed</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-disabled</code> while locked. I verify the reverse order and the 300 ms spacing."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watch</code> on <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">order</code> to drive the sequence?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You could: watch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order</code> while deactivating and schedule one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> per change, cleaning up with the watcher <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code>. It is the React-style chain. The interval is simpler here because the step size never changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you extract this as a composable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useReverseSequence(total, delay)</code> composable that owns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deactivating</code>, the timer and its cleanup, and returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deactivating</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">activate</code>. The component only renders.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the timing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use fake timers: click all lights, advance 300 ms at a time, and assert which light went off after each step.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if clicking during deactivation should cancel it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stop()</code> in the click handler when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deactivating</code> is true; the lights still on stay on.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **LIFO** | Last in, first out: the order a stack empties |
| **setInterval** | Repeats a callback every N ms until cleared |
| **Lifecycle cleanup** | Releasing timers and listeners in <code>onBeforeUnmount</code> |
| **Toggle button** | A button with <code>aria-pressed</code> announcing on or off |

---

**Conclusion:** In Vue, Grid Lights is one ref holding the activation order, a flag that locks input, and a 300 ms interval that pops the last index until the order is empty and is cleared on unmount. Derive everything else from the order and the reverse sequence falls out of the data structure itself.`,
        files: {
          "/src/App.vue": `<script setup>
import { ref, onBeforeUnmount } from "vue";
import GridLight from "./components/GridLight.vue";
import {
  CONFIG,
  OFF_DELAY_MS,
  activate,
  countLights,
  deactivateLast,
  slotsFrom,
} from "./lights.js";

const slots = slotsFrom(CONFIG);
const total = countLights(CONFIG);
const columns = CONFIG[0].length;

const order = ref([]); // indices, in the order they were turned on
const deactivating = ref(false);
let timer = null; // not reactive: the template never reads it

function startDeactivation() {
  deactivating.value = true;
  timer = setInterval(() => {
    order.value = deactivateLast(order.value);
    if (order.value.length === 0) stop();
  }, OFF_DELAY_MS);
}

function stop() {
  clearInterval(timer);
  timer = null;
  deactivating.value = false;
}

function onActivate(index) {
  if (deactivating.value || order.value.includes(index)) return;
  order.value = activate(order.value, index);
  if (order.value.length === total) startDeactivation();
}

onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <main class="lights-app">
    <h1>Grid Lights</h1>
    <p class="hint" data-testid="status" aria-live="polite">
      {{
        deactivating
          ? "Turning off in reverse order..."
          : order.length + " of " + total + " on"
      }}
    </p>
    <div
      class="grid"
      :style="{ gridTemplateColumns: 'repeat(' + columns + ', 1fr)' }"
    >
      <GridLight
        v-for="slot in slots"
        :key="slot.index"
        :slot="slot"
        :on="order.includes(slot.index)"
        :locked="deactivating"
        @activate="onActivate"
      />
    </div>
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}
.lights-app {
  max-width: 340px;
  margin: 0 auto;
  padding: 24px 16px;
  text-align: center;
}
.lights-app h1 {
  font-size: 1.4rem;
  margin: 0 0 8px;
}
.hint {
  color: #94a3b8;
  min-height: 1.5em;
}
.grid {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}
</style>
`,
          "/src/components/GridLight.vue": `<script setup>
defineProps({
  slot: { type: Object, required: true },
  on: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
});
const emit = defineEmits(["activate"]);
</script>

<template>
  <button
    v-if="slot.isLight"
    type="button"
    :data-testid="'light-' + slot.index"
    :class="['light', { on }]"
    :aria-label="'Row ' + (slot.row + 1) + ', column ' + (slot.col + 1)"
    :aria-pressed="on"
    :aria-disabled="locked"
    @click="emit('activate', slot.index)"
  />
  <span v-else class="hole" aria-hidden="true" />
</template>

<style scoped>
.light {
  aspect-ratio: 1;
  border-radius: 12px;
  border: 2px solid #334155;
  background: #1e293b;
  cursor: pointer;
}
.light.on {
  background: #22c55e;
  border-color: #4ade80;
  box-shadow: 0 0 18px #16a34a;
}
.light[aria-disabled="true"] {
  cursor: wait;
}
.light:focus-visible {
  outline: 3px solid #38bdf8;
  outline-offset: 2px;
}
.hole {
  aspect-ratio: 1;
}
</style>
`,
          "/src/lights.js": `// Pure Grid Lights logic. No framework code, so it can be tested on its own.
// 1 = a light, 0 = an empty slot. The default
// is a 3 x 3 ring with a hole in the middle.
export const CONFIG = [
  [1, 1, 1],
  [1, 0, 1],
  [1, 1, 1],
];
export const OFF_DELAY_MS = 300;

// Flatten the config into renderable slots, each with a stable index.
export function slotsFrom(config) {
  return config.flatMap((row, r) =>
    row.map((on, c) => ({
      index: r * row.length + c,
      row: r,
      col: c,
      isLight: on === 1,
    })),
  );
}

export const countLights = (config) =>
  config.flat().filter((v) => v === 1).length;

// The activation ORDER is the state: a light is "on" when its index is in it.
export function activate(order, index) {
  return order.includes(index) ? order : [...order, index];
}

// Deactivation removes the most recently activated light first.
export const deactivateLast = (order) => order.slice(0, -1);
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers preparing for a machine coding round. Comfortable with signals and components; timers and cleanup are explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> for the vocabulary. Excerpts come from the runnable solution; Verified timings were measured with real timers on Angular 22.2.3, AOT and runtime JIT.

## 1. A Story First

Grid Lights is a stack with a metronome. Clicks push lights onto the stack; when every light is on, the metronome ticks every 300 milliseconds and the most recently lit one goes off on each tick. During the countdown, clicks are ignored.

## 2. The Plan

<code>lights.ts</code> holds the config and pure helpers: <code>slotsFrom</code>, <code>countLights</code>, <code>activate</code>, <code>deactivateLast</code>, plus the <code>Slot</code> type.

| Value | Angular tool |
| :--- | :--- |
| <code>order</code> (indices in click order) | <code>signal&lt;number[]&gt;([])</code> |
| <code>deactivating</code> | <code>signal(false)</code> |
| Is a light on? | <code>order().includes(i)</code> in the template |
| Interval id | A private field (not rendered) |
| Cleanup | <code>inject(DestroyRef).onDestroy(...)</code> |

📌 **Interview term: Zoneless change detection** — the playground boots Angular without Zone.js, so a <code>setInterval</code> callback does not trigger a re-render by itself. Writing to a signal does: the signal marks the view for update. That is why <code>order</code> and <code>deactivating</code> must be signals. See [zoneless Angular](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18).

## 3. Build It Step by Step

### Step 1: state, click handling and the interval

\`\`\`ts
readonly columns = CONFIG[0].length;

// indices, in the order they were turned on
readonly order = signal<number[]>([]);
readonly deactivating = signal(false);
private timer: ReturnType<typeof setInterval> | undefined;

constructor() {
  inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
}

onActivate(index: number): void {
  if (this.deactivating() || this.order().includes(index)) return;
  this.order.update((o) => activate(o, index));
  if (this.order().length === this.total) this.startDeactivation();
}

private startDeactivation(): void {
  this.deactivating.set(true);
  this.timer = setInterval(() => {
    this.order.update(deactivateLast);
    if (this.order().length === 0) {
      clearInterval(this.timer);
      this.deactivating.set(false);
    }
  }, OFF_DELAY_MS);
}
\`\`\`

- <code>onActivate</code> ignores clicks while deactivating or on lit lights; the click that completes the set calls <code>startDeactivation</code>.
- 📌 **Interview term: setInterval** — repeats a callback until <code>clearInterval</code>. Each tick pops the last index with <code>this.order.update(deactivateLast)</code>; the tick that empties the order clears the interval and unlocks input.
- 📌 **Interview term: DestroyRef** — an injectable handle to the component's lifetime. <code>onDestroy</code> registers cleanup that runs when the component is destroyed, so an interval cannot outlive it. <code>inject()</code> is used instead of a constructor parameter because the runtime-compiled playground has no decorator metadata for constructor types.
- <code>ReturnType&lt;typeof setInterval&gt;</code> types the id without caring whether the environment returns a number or an object.

### Step 2: the template

\`\`\`ts
template: \`
    <main class="lights-app">
      <h1>Grid Lights</h1>
      <p class="hint" data-testid="status" aria-live="polite">
        {{ deactivating() ? "Turning off in reverse order..." : order().length + " of " + total + " on" }}
      </p>
      <div class="grid" [style.grid-template-columns]="'repeat(' + columns + ', 1fr)'">
        @for (slot of slots; track slot.index) {
          <app-light
            [slot]="slot"
            [on]="order().includes(slot.index)"
            [locked]="deactivating()"
            (activate)="onActivate($event)"
          />
        }
      </div>
    </main>
  \`,
\`\`\`

<code>@for (slot of slots; track slot.index)</code> renders from the config; the column count comes from <code>CONFIG[0].length</code> through a style binding.

### Step 3: the light component

\`\`\`ts
standalone: true,
template: \`
    @if (slot.isLight) {
      <button
        type="button"
        [attr.data-testid]="'light-' + slot.index"
        class="light"
        [class.on]="on"
        [attr.aria-label]="'Row ' + (slot.row + 1) + ', column ' + (slot.col + 1)"
        [attr.aria-pressed]="on"
        [attr.aria-disabled]="locked"
        (click)="activate.emit(slot.index)"
      ></button>
    } @else {
      <span class="hole" aria-hidden="true"></span>
    }
  \`,
\`\`\`

\`\`\`ts
export class LightComponent {
  @Input({ required: true }) slot!: Slot;
  @Input() on = false;
  @Input() locked = false;
  @Output() activate = new EventEmitter<number>();
}
\`\`\`

📌 **Interview term: Toggle button** — <code>[attr.aria-pressed]</code> announces on or off. <code>[attr.aria-disabled]</code> keeps the focused light focusable while locked. <code>@if</code>/<code>@else</code> renders the empty slot as an <code>aria-hidden</code> span. <code>@Input({ required: true })</code> makes the compiler insist that the parent passes <code>slot</code>.

## 4. Verified

The rules alone, with node:

\`\`\`text
lights: 8 | slots: 9 | hole at index 4
activation order: 0,1,2,5,8,7,6,3 (the repeated 0 was ignored)
deactivation order: 3,6,7,8,5,2,1,0
\`\`\`

Booted AOT (ngc, <code>strictTemplates</code>) and JIT, then driven with real timers: seven clockwise clicks, a re-click, the eighth click, polling every 20 ms, and a click on an already-off light mid-sequence. AOT output:

\`\`\`text
RENDERED: Grid Lights 0 of 8 on
start       : 8 lights, center hole = true | 0 of 8 on
7 clicked   : 0,1,2,5,6,7,8 | 7 of 8 on | light-0 aria-pressed = true
8th click   : Turning off in reverse order... | aria-disabled = true
click mid   : light-3 on again? false | 6 on
off order   : 3 then 6 then 7 then 8 then 5 then 2 then 1 then 0
first off   : after ~300 ms (rounded to 100 ms)
last off    : between 2300 and 2700 ms after the 8th click: true
gaps        : 7 gaps, every one between 250 and 350 ms: true
end         : 0 of 8 on | aria-disabled = false
new round   : 5 | 1 of 8 on
\`\`\`

The JIT run printed identical lines; both match the React and Vue builds. The first time is rounded to 100 ms and the gaps and the end are checked against windows, because real timers jitter. Styling was not checked in jsdom.

## 5. Common Pitfalls

- **Plain fields for state in a zoneless app.** A timer that changes a plain field updates nothing on screen.
- **No destroy cleanup.** The interval keeps running after the component is gone.
- **Not stopping at empty.** The interval ticks forever.
- **Constructor-parameter DI in the playground.** Without decorator metadata the injector cannot resolve it; use <code>inject()</code>.
- **<code>[disabled]</code> on the cells.** Focus is lost when input locks.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"I render from a config. The state is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order</code> signal of indices in click order and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deactivating</code> signal; a light is on if its index is in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Click:</strong> <span style="color:#f0e2c8;">"Ignore clicks on lit lights or while deactivating; the last click starts the sequence."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Sequence:</strong> <span style="color:#f0e2c8;">"A 300 ms <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInterval</code> pops the last index with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order.update</code>, and clears itself when the order is empty."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cleanup:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject(DestroyRef).onDestroy</code> clears the interval. Because the app is zoneless, the timer writes to signals, which is what schedules the re-render."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. A11y and verify:</strong> <span style="color:#f0e2c8;">"Lights are toggle buttons with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-pressed</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-disabled</code> while locked. I check the reverse order and 300 ms spacing."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use RxJS for the sequence?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timer(300, 300).pipe(take(total))</code> with each emission popping a light, unsubscribed with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">takeUntilDestroyed()</code>. It is tidy, but a plain interval with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DestroyRef</code> is fewer concepts for this size.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">effect()</code> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An effect on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deactivating</code> that starts the interval and clears it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> works and ties the timer to the state. It is the closest match to the React version.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fakeAsync</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(300)</code> steps in TestBed, or fake timers in Vitest; click every light and assert which one turned off after each step.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support a click that cancels the sequence?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onActivate</code>, if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deactivating()</code> is true, clear the interval and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deactivating</code> to false instead of returning.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Zoneless change detection** | Angular re-renders when signals change, not after every async callback |
| **setInterval** | Repeats a callback until cleared |
| **DestroyRef** | Injectable lifetime handle for registering cleanup |
| **Toggle button** | A button with <code>aria-pressed</code> |

---

**Conclusion:** Angular Grid Lights is two signals, a pure helper file, and a 300 ms interval that pops the last activated index until none remain, cleaned up through <code>DestroyRef</code>. Keep state in signals so the zoneless app re-renders on each tick, lock input during the sequence, and the lights go off in exact reverse order.`,
        files: {
          "/src/app/app.component.ts": `import { Component, DestroyRef, inject, signal } from "@angular/core";
import { LightComponent } from "./light.component";
import {
  CONFIG,
  OFF_DELAY_MS,
  activate,
  countLights,
  deactivateLast,
  slotsFrom,
} from "./lights";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [LightComponent],
  template: \`
    <main class="lights-app">
      <h1>Grid Lights</h1>
      <p class="hint" data-testid="status" aria-live="polite">
        {{
          deactivating()
            ? "Turning off in reverse order..."
            : order().length + " of " + total + " on"
        }}
      </p>
      <div
        class="grid"
        [style.grid-template-columns]="'repeat(' + columns + ', 1fr)'"
      >
        @for (slot of slots; track slot.index) {
          <app-light
            [slot]="slot"
            [on]="order().includes(slot.index)"
            [locked]="deactivating()"
            (activate)="onActivate($event)"
          />
        }
      </div>
    </main>
  \`,
  styles: [
    \`
      :host {
        display: block;
        font-family: system-ui, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
        min-height: 100vh;
      }
      .lights-app {
        max-width: 340px;
        margin: 0 auto;
        padding: 24px 16px;
        text-align: center;
      }
      .lights-app h1 {
        font-size: 1.4rem;
        margin: 0 0 8px;
      }
      .hint {
        color: #94a3b8;
        min-height: 1.5em;
      }
      .grid {
        display: grid;
        gap: 12px;
        margin-top: 16px;
      }
    \`,
  ],
})
export class AppComponent {
  readonly slots = slotsFrom(CONFIG);
  readonly total = countLights(CONFIG);
  readonly columns = CONFIG[0].length;

  // indices, in the order they were turned on
  readonly order = signal<number[]>([]);
  readonly deactivating = signal(false);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
  }

  onActivate(index: number): void {
    if (this.deactivating() || this.order().includes(index)) return;
    this.order.update((o) => activate(o, index));
    if (this.order().length === this.total) this.startDeactivation();
  }

  private startDeactivation(): void {
    this.deactivating.set(true);
    this.timer = setInterval(() => {
      this.order.update(deactivateLast);
      if (this.order().length === 0) {
        clearInterval(this.timer);
        this.deactivating.set(false);
      }
    }, OFF_DELAY_MS);
  }
}
`,
          "/src/app/light.component.ts": `import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Slot } from "./lights";

@Component({
  selector: "app-light",
  standalone: true,
  template: \`
    @if (slot.isLight) {
      <button
        type="button"
        [attr.data-testid]="'light-' + slot.index"
        class="light"
        [class.on]="on"
        [attr.aria-label]="
          'Row ' + (slot.row + 1) + ', column ' + (slot.col + 1)
        "
        [attr.aria-pressed]="on"
        [attr.aria-disabled]="locked"
        (click)="activate.emit(slot.index)"
      ></button>
    } @else {
      <span class="hole" aria-hidden="true"></span>
    }
  \`,
  styles: [
    \`
      :host {
        display: block;
      }
      .light {
        display: block;
        width: 100%;
        aspect-ratio: 1;
        border-radius: 12px;
        border: 2px solid #334155;
        background: #1e293b;
        cursor: pointer;
      }
      .light.on {
        background: #22c55e;
        border-color: #4ade80;
        box-shadow: 0 0 18px #16a34a;
      }
      .light[aria-disabled="true"] {
        cursor: wait;
      }
      .light:focus-visible {
        outline: 3px solid #38bdf8;
        outline-offset: 2px;
      }
      .hole {
        display: block;
        aspect-ratio: 1;
      }
    \`,
  ],
})
export class LightComponent {
  @Input({ required: true }) slot!: Slot;
  @Input() on = false;
  @Input() locked = false;
  @Output() activate = new EventEmitter<number>();
}
`,
          "/src/app/lights.ts": `// Pure Grid Lights logic. No framework code, so it can be tested on its own.
// 1 = a light, 0 = an empty slot. The default
// is a 3 x 3 ring with a hole in the middle.
export const CONFIG: number[][] = [
  [1, 1, 1],
  [1, 0, 1],
  [1, 1, 1],
];
export const OFF_DELAY_MS = 300;

export interface Slot {
  index: number;
  row: number;
  col: number;
  isLight: boolean;
}

// Flatten the config into renderable slots, each with a stable index.
export function slotsFrom(config: number[][]): Slot[] {
  return config.flatMap((row, r) =>
    row.map((on, c) => ({
      index: r * row.length + c,
      row: r,
      col: c,
      isLight: on === 1,
    })),
  );
}

export const countLights = (config: number[][]): number =>
  config.flat().filter((v) => v === 1).length;

// The activation ORDER is the state: a light is "on" when its index is in it.
export function activate(order: number[], index: number): number[] {
  return order.includes(index) ? order : [...order, index];
}

// Deactivation removes the most recently activated light first.
export const deactivateLast = (order: number[]): number[] => order.slice(0, -1);
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build Whack-a-Mole",
    seoDescription: "Build Whack-a-Mole: a tick-driven game state machine, an injected random source, rising difficulty, a countdown and leak-free timer cleanup.",
    description: `**Question presented to candidate:**
"Build Whack-a-Mole. There is a 3 by 3 field of holes. After the player presses Start, moles pop up in random holes for a short time; clicking a mole scores a point. The game lasts 15 seconds, it should get harder as time runs out, and when time is up the board stops and shows the score. I also want to be able to test it without waiting for real randomness."

**Requirements:**
- A 3 x 3 field of holes, a score, a countdown and a Start / Play again button.
- One mole at a time appears in a random hole (never the same hole twice in a row), stays up for a limited time, then hides.
- Clicking the hole with the mole scores once and hides it; clicking an empty hole or the same mole twice does not add points.
- The time a mole stays up shrinks as the game goes on.
- At 0 seconds the game ends, no mole is shown, clicks do nothing, and every timer is stopped.
- The random source is injectable so a test can replay a game deterministically.

**What a strong answer should cover:**
- A state machine: idle, playing, over; and within playing, a gap between moles and a mole being up.
- Game rules as pure functions (\`tick(state, dt, random)\`, \`whack(state, hole)\`) with no timers or \`Math.random\` inside, so tests can drive them with a seeded generator.
- A single game clock (one interval) instead of a pile of independent timeouts, and cleaning it up on game over and unmount.
- Avoiding stale state in timer callbacks, and why impure updates are dangerous where a framework may run update functions more than once.
- Preventing double scoring, and a difficulty curve expressed as data.

**Clarifying questions expected:**
- "One mole at a time, or several at once?"
- "Should missing a mole or clicking an empty hole cost points?"
- "Does the game need to pause when the tab is hidden?"

**Code / implementation expected:** Yes. A working game; expect to be asked how you tested it and how timers are cleaned up.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. Comfortable with React state and effects; game loops, timers and testable randomness are explained from zero.
**Difficulty:** Hard

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Excerpts come from the runnable solution, and the Verified section quotes a deterministic test run (seeded randomness) on React 19.3.1 with real timers.

## 1. Why This Even Matters — A Story First

Picture a fairground Whack-a-Mole machine. Inside it there is no magic, just a clock and a list of rules: "every so often, pop a mole in a random hole; if the mole has been up too long, pull it down; if the mallet hits the mole, add a point and pull it down; when the clock hits zero, stop everything". The machine does not care whether the moles are motors or pixels.

That is how to build it in code. Write the rules as a machine that is advanced by a clock and fed a random number when it needs one. Then the React part only has to do two things: tick the clock, and show the machine's current state.

Why do interviewers rate this "hard"? Because the naive version (a <code>setTimeout</code> per mole, a <code>setInterval</code> for the countdown, <code>Math.random</code> sprinkled around) produces timers that outlive the game, scores that change after "Game over", stale state inside callbacks, and a game nobody can test. The question is really about controlling time.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| One mole at a time, or several? | Several moles turn <code>mole</code> into a list with per-mole timers. Start with one. |
| How long is a game, and how should difficulty grow? | Turns "harder" into numbers: here 15 s, up-time from 1200 ms down to 500 ms. |
| Do misses or wrong clicks cost points? | Changes <code>whack</code> and the scoring rules. Here they do not. |
| Should the game pause when the tab is hidden? | Browsers throttle timers in background tabs; a pause needs the Page Visibility API. |
| How will this be tested? | Opens the door to the injected random source and pure tick function. |

## 3. Requirements and the Plan

**Component tree:** <code>App</code> owns the game state and the clock; <code>Hole</code> renders one hole as a button. All rules are in <code>src/mole.js</code>, which contains no timers and never calls <code>Math.random</code>.

📌 **Interview term: Finite state machine** — a model where the system is always in exactly one named state and only specific events move it to another. Here: <code>idle</code>, <code>playing</code>, <code>over</code>. Inside <code>playing</code> there are two sub-states, waiting in the gap between moles and a mole being up.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 270" role="img" aria-label="State machine: idle goes to playing on Start; inside playing a gap leads to a mole being up, which returns to the gap when whacked or when it escapes; playing goes to over when time runs out">
  <defs>
    <marker id="wmr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="130" height="60" rx="10"/>
  <text class="d-text" x="95" y="76" text-anchor="middle">idle</text>
  <rect class="d-box" x="220" y="20" width="300" height="230" rx="14"/>
  <text class="d-text" x="370" y="48" text-anchor="middle">playing</text>
  <rect class="d-box-muted" x="250" y="80" width="240" height="56" rx="10"/>
  <text class="d-text" x="370" y="104" text-anchor="middle">gap</text>
  <text class="d-sub" x="370" y="124" text-anchor="middle">400 ms, no mole</text>
  <rect class="d-box-accent" x="250" y="174" width="240" height="56" rx="10"/>
  <text class="d-text d-accent" x="370" y="198" text-anchor="middle">mole up</text>
  <text class="d-sub" x="370" y="218" text-anchor="middle">1200 ms shrinking to 500</text>
  <rect class="d-box-muted" x="570" y="40" width="110" height="60" rx="10"/>
  <text class="d-text" x="625" y="76" text-anchor="middle">over</text>
  <path class="d-edge" d="M 160 70 L 214 70" marker-end="url(#wmr-arrow)"/>
  <text class="d-sub" x="187" y="120" text-anchor="middle">Start</text>
  <path class="d-edge" d="M 520 70 L 564 70" marker-end="url(#wmr-arrow)"/>
  <text class="d-sub" x="625" y="130" text-anchor="middle">time is 0</text>
  <path class="d-edge-accent" d="M 320 136 L 320 168" marker-end="url(#wmr-arrow)"/>
  <path class="d-edge" d="M 420 174 L 420 142" marker-end="url(#wmr-arrow)"/>
  <text class="d-sub" x="308" y="158" text-anchor="end">spawn</text>
  <text class="d-sub" x="432" y="158">hit or escape</text>
</svg>

Every arrow is taken by one of two pure functions: <code>tick</code> for the passage of time and <code>whack</code> for a click. The component never decides anything on its own.

| Value | Kind | Where |
| :--- | :--- | :--- |
| <code>status</code>, <code>timeLeft</code>, <code>score</code>, <code>misses</code>, <code>mole</code>, <code>lastHole</code>, <code>gapLeft</code>, <code>spawned</code> | One state object | <code>useState</code> in <code>App</code>, mirrored in a ref |
| Seconds shown, status text, which hole is up | Derived | Render |
| The interval | Effect | Exists only while <code>status === "playing"</code> |

## 4. Build It Step by Step

### Step 1: the rules as a tick-driven machine

\`\`\`js
// Pure Whack-a-Mole logic: a state machine advanced by fixed ticks.
// No timers and no Math.random in here: the caller
// passes the elapsed time and a random source,
// so a test can replay a whole game deterministically.
export const HOLES = 9;
export const GAME_MS = 15000;
export const TICK_MS = 100;
// pause between one mole leaving and the next appearing
export const GAP_MS = 400;
// how long a mole stays up at the start...
export const UP_START_MS = 1200;
// ...shrinking linearly to this by the end
export const UP_END_MS = 500;

export const initialState = () => ({
  status: "idle", // "idle" | "playing" | "over"
  timeLeft: GAME_MS,
  score: 0,
  misses: 0,
  mole: null, // { hole, left } while a mole is up
  lastHole: -1,
  gapLeft: 0,
  spawned: 0,
});

export function upTime(timeLeft) {
  // 0 at the start, 1 at the end
  const progress = (GAME_MS - timeLeft) / GAME_MS;
  return Math.round(UP_START_MS - (UP_START_MS - UP_END_MS) * progress);
}

// One random draw per mole; never the same hole twice in a row.
export function pickHole(random, holes, last) {
  const choices = last === -1 ? holes : holes - 1;
  let i = Math.floor(random() * choices);
  if (last !== -1 && i >= last) i++;
  return i;
}

export const start = () => ({
  ...initialState(),
  status: "playing",
  gapLeft: GAP_MS,
});
\`\`\`

📌 **Interview term: Dependency injection (of randomness)** — instead of calling <code>Math.random()</code> inside the rules, the caller passes a <code>random</code> function in. Production passes the real one; a test passes a seeded generator and gets the same "random" holes every run. <code>pickHole</code> makes one draw per mole and skips the previous hole by shifting indices, so a repeat is impossible without retry loops.

📌 **Interview term: Difficulty curve as data** — <code>upTime(timeLeft)</code> interpolates linearly from 1200 ms to 500 ms over the game. Tuning difficulty is changing two constants.

\`\`\`js
export function tick(state, dt, random) {
  if (state.status !== "playing") return state;
  const timeLeft = Math.max(0, state.timeLeft - dt);
  if (timeLeft === 0)
    return { ...state, timeLeft, status: "over", mole: null };

  if (state.mole) {
    const left = state.mole.left - dt;
    if (left > 0)
      return { ...state, timeLeft, mole: { ...state.mole, left } };
    return {
      ...state,
      timeLeft,
      mole: null,
      misses: state.misses + 1,
      gapLeft: GAP_MS,
    }; // it got away
  }

  const gapLeft = state.gapLeft - dt;
  if (gapLeft > 0) return { ...state, timeLeft, gapLeft };
  const hole = pickHole(random, HOLES, state.lastHole);
  return {
    ...state,
    timeLeft,
    gapLeft: 0,
    mole: { hole, left: upTime(timeLeft) },
    lastHole: hole,
    spawned: state.spawned + 1,
  };
}

// Only a hit on the hole that has a mole counts,
// and only once: the mole goes down at once.
export function whack(state, hole) {
  if (
    state.status !== "playing" ||
    !state.mole ||
    state.mole.hole !== hole
  )
    return state;
  return {
    ...state,
    score: state.score + 1,
    mole: null,
    gapLeft: GAP_MS,
  };
}
\`\`\`

📌 **Interview term: Fixed-timestep game loop** — the game advances in equal steps of <code>dt</code> = 100 ms. Each <code>tick</code> counts down the clock, ages the visible mole (and lets it escape when its time is up), or counts down the gap and spawns the next mole. Because time is an argument, a test can play a full 15-second game in a millisecond.

<code>whack</code> only scores when the clicked hole holds the mole, and it removes the mole at once, so a double click scores once. After <code>status</code> becomes <code>over</code>, both functions return the state unchanged.

### Step 2: one clock, and why there is a ref

\`\`\`jsx
// The random source the game uses. Read at call
// time, so a test can replace Math.random.
const random = () => Math.random();

export default function App() {
  const [game, setGame] = useState(initialState);
  // The interval callback is created once per
  // game, so it must not read \`game\` from its
  // closure (that copy would be stale). It reads
  // the latest state from this ref instead.
  const gameRef = useRef(game);
  const commit = (next) => {
    gameRef.current = next;
    setGame(next);
  };

  useEffect(() => {
    if (game.status !== "playing") return;
    const id = setInterval(() => commit(tick(gameRef.current, TICK_MS, random)), TICK_MS);
    // runs on game over, on unmount, and in StrictMode re-runs
    return () => clearInterval(id);
  }, [game.status]);
\`\`\`

There is exactly one timer: an interval that exists only while the game is playing. When <code>tick</code> flips <code>status</code> to <code>over</code>, the effect's dependency changes, React runs the cleanup, and the interval is gone. The same cleanup runs on unmount.

Why the <code>gameRef</code>? The interval callback is created once per game. 📌 **Interview term: Stale closure** — a function that captured a variable's value at creation time and keeps seeing that old value. If the callback read <code>game</code> directly it would tick the very first state forever. See [stale closures in hooks](/interview-question/what-causes-stale-closures-in-react-hooks-and-how-do-you-fix-them-correctly).

The usual fix is the updater form, <code>setGame(g => tick(g, ...))</code>. It is deliberately *not* used here, and this is the subtle part of the question:

📌 **Interview term: Impure updater** — <code>tick</code> calls <code>random()</code> when it spawns a mole, so it is not pure in the strict sense. In development, StrictMode calls state updater functions twice to catch impurity. A probe on React 19.3.1 counted 2 updater calls for 1 click. With an updater, every spawn would draw two random numbers, and the seeded test would see a different hole sequence in React than in Vue or Angular. Computing the next state *outside* React (from the ref) and passing a plain value to <code>setGame</code> runs <code>tick</code> exactly once per interval tick. See [why StrictMode double-invokes](/interview-question/why-does-react-18-strictmode-double-invoke-your-components-and-effects).

<code>commit</code> writes the ref and the state together, so clicks (<code>commit(whack(gameRef.current, h))</code>) and ticks always build on the newest state, even between renders. See [useRef use cases](/interview-question/describe-the-useref-hook-and-its-typical-use-cases).

<code>random</code> is <code>() => Math.random()</code>, which looks up <code>Math.random</code> at call time. That is the seam the test uses: the driver replaces <code>Math.random</code> with a seeded generator before pressing Start.

### Step 3: rendering

\`\`\`jsx
const playing = game.status === "playing";

return (
  <main className="wam">
    <h1>Whack-a-Mole</h1>
    <div className="hud">
      <span>
        Score: <strong data-testid="score">{game.score}</strong>
      </span>
      <span>
        Time:{" "}
        <strong data-testid="time">
          {Math.ceil(game.timeLeft / 1000) + "s"}
        </strong>
      </span>
    </div>
    <p className="status" data-testid="status" aria-live="polite">
      {statusText(game)}
    </p>
    <div className="field" role="group" aria-label="Mole holes">
      {Array.from({ length: HOLES }, (_, i) => (
        <Hole
          key={i}
          index={i}
          up={Boolean(game.mole) && game.mole.hole === i}
          disabled={!playing}
          onWhack={(h) => commit(whack(gameRef.current, h))}
        />
      ))}
    </div>
    <button
      type="button"
      className="start"
      data-testid="start"
      disabled={playing}
      onClick={() => commit(start())}
    >
      {game.status === "over" ? "Play again" : "Start"}
    </button>
  </main>
);
\`\`\`

\`\`\`jsx
export default function Hole({ index, up, disabled, onWhack }) {
  return (
    <button
      type="button"
      data-testid={"hole-" + index}
      className={"hole" + (up ? " up" : "")}
      aria-label={"Hole " + (index + 1) + (up ? ", mole!" : ", empty")}
      aria-disabled={disabled}
      onClick={() => onWhack(index)}
    >
      <span className="mole" aria-hidden="true" />
    </button>
  );
}
\`\`\`

- Each hole is a button whose label changes to "Hole 6, mole!" when a mole is up, so a screen reader user can play.
- <code>aria-disabled</code> while not playing keeps focus stable; <code>whack</code> ignores clicks anyway.
- The status is a polite live region: "Go!", then "Game over! You scored 5".
- The pop-up is a CSS transition on the mole's <code>bottom</code> offset; <code>touch-action: manipulation</code> removes the double-tap zoom delay on mobile.

## 5. Verified

**The rules, with a seeded generator.** A node script played whole 15-second games through <code>tick</code> and <code>whack</code> with <code>mulberry32(42)</code> as the random source and three simulated players:

\`\`\`text
up time at 15s / 7.5s / 0s left: 1200 850 500 ms
fast player (200 ms) | moles 25 | score 24 | missed 0 | first holes 5,3,7,5,1,5,2,5
slow player (900 ms) | moles 12 | score 5 | missed 7 | first holes 5,3,7,5,1,5,2,5
never hits           | moles 12 | score 0 | missed 11 | first holes 5,3,7,5,1,5,2,5
same seed twice gives the same game: true
10,000 picks, same hole twice in a row: 0
\`\`\`

Same seed, same game; the hole sequence does not depend on how well you play (one draw per mole); and 10,000 picks never repeated a hole. The fast player scored 24 of 25: the 25th mole was still up when time ran out.

**The component, with real timers.** Rendered in <code>&lt;StrictMode&gt;</code> in jsdom. The driver replaced <code>Math.random</code> with the same <code>mulberry32(42)</code>, pressed Start, polled every 20 ms, clicked a wrong hole and then the mole twice, whacked moles 2, 3, 5 and 6, let mole 4 escape, and stopped hitting after mole 6:

\`\`\`text
RENDERED: Whack-a-MoleScore: 0Time: 15sPress Start, then hit the molesStart
idle        : Press Start, then hit the moles | score 0 | time 15s | hole-0 aria-disabled = true
idle click  : score 0
started     : Go! | time 15s | start disabled = true
wrong hole  : mole in 5 | clicked 6 | score 0
double hit  : score 1 | mole still up? false
mole 4      : hole 5 aria-label = Hole 6, mole! | left alone
first mole  : after ~400 ms
holes       : 5, 3, 7, 5, 1, 5, 2, 5
mole 4      : got away by itself after roughly a second: true
score now   : 5
game over   : Game over! You scored 5 | time 0s | took 15 to 16.5 s: true | mole up? false
after 600ms : anything changed? false
late click  : score 5 | button = Play again
play again  : Go! | score 0 | time 15s
\`\`\`

The holes 5, 3, 7, 5, 1, 5, 2, 5 match the node run exactly, which is the point of injecting the random source. The double hit scored once; the escaped mole and the ignored moles did not score; after "Game over" nothing on the board changed for 600 ms (no leaked timer), and a late click did nothing. Timings are real, so the first-mole delay is rounded and the escape is checked as a range. The pop-up animation was not checked (jsdom has no layout).

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Double click on one mole | First <code>whack</code> removes the mole; the second finds no mole |
| Click on an empty hole | <code>whack</code> returns the same state |
| Click before Start or after Game over | <code>status</code> is not <code>playing</code>; nothing changes |
| Game over while a mole is up | <code>tick</code> clears <code>mole</code> when time hits 0 |
| Unmount mid-game | Effect cleanup clears the interval |
| Same hole twice in a row | Impossible: <code>pickHole</code> skips the last hole |
| Keyboard | Holes are buttons; Tab and Enter work, though the game is hard to play that way |
| Screen readers | Hole labels say "mole!"; status is a live region |

## 7. Common Pitfalls

- **One <code>setTimeout</code> per mole plus a countdown interval.** Several unrelated timers race each other, and some survive "Game over".
- **Reading <code>game</code> inside the interval.** A stale closure: the game never advances past its first state.
- **Calling <code>Math.random</code> inside a state updater.** StrictMode runs updaters twice in development, so randomness is consumed twice.
- **No cleanup on game over.** The interval keeps ticking a finished game, or keeps a reference after unmount.
- **Scoring by "a mole was visible when clicked" without hiding it.** A fast double click scores twice.
- **Hard-coded randomness.** Without an injected source, nobody can write a deterministic test.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"I treat it as a state machine: idle, playing, over, and inside playing either a gap or one mole up. All of it is one state object."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pure rules:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(state, dt, random)</code> advances time: countdown, mole ageing, spawning with one random draw. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">whack(state, hole)</code> scores and hides the mole. No timers, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.random</code> inside."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. One clock:</strong> <span style="color:#f0e2c8;">"A single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInterval</code> of 100 ms runs only while status is playing. The effect cleanup clears it on game over and unmount."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. React details:</strong> <span style="color:#f0e2c8;">"The interval reads the latest state from a ref to avoid a stale closure, and I compute the next state outside the updater because StrictMode calls updaters twice and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick</code> draws random numbers."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Testing:</strong> <span style="color:#f0e2c8;">"Because randomness is injected, a seeded generator replays an exact game. I run full games in node in milliseconds, and the UI test sees the same hole sequence."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support several moles at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mole</code> a list of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ hole, left }</code>, age each one in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick</code>, spawn while the list is below a cap and the gap has elapsed, and pick holes from those not occupied. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">whack</code> removes the matching entry. The single clock still drives everything.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a fixed 100 ms tick instead of timeouts for each mole?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One clock means one thing to clean up and one place where time passes, so the rules are a pure function of elapsed time. Timeouts per mole spread game logic across callbacks and make cancellation and testing much harder.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens in a background tab?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Browsers throttle timers in hidden tabs, so ticks slow down and the game runs long. I would listen to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">visibilitychange</code> and pause the interval when the page is hidden, or tick by measured elapsed time instead of assuming 100 ms.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not requestAnimationFrame?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">rAF is ideal for smooth per-frame animation, but this game only changes state every 100 ms and the movement is CSS. rAF would re-render 60 times a second for nothing. For a canvas version, rAF with measured delta time is the right tool.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test this with Jest or Vitest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">whack</code> directly with a seeded generator and simulated time. For the component, use fake timers, mock <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.random</code>, click Start, advance 400 ms, assert the mole hole, click it and assert the score.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Finite state machine** | Always in one named state; events move it between states |
| **Dependency injection of randomness** | Passing the random source in, so tests can control it |
| **Difficulty curve as data** | Expressing "harder over time" as a function of elapsed time |
| **Fixed-timestep game loop** | Advancing the game in equal time steps from one clock |
| **Stale closure** | A callback that still sees values from when it was created |
| **Impure updater** | A state updater with side effects such as random draws; unsafe when run twice |

---

**Conclusion:** Whack-a-Mole is a lesson in owning time. Model the game as a small state machine, write <code>tick</code> and <code>whack</code> as functions of state, elapsed time and an injected random source, and drive them from one interval that exists only while the game is playing. In React, read the latest state from a ref and keep random draws out of updaters. The payoff is a game with no leaked timers, no double scores, and a test that replays the exact same moles every time.`,
        files: {
          "/App.js": `import { useEffect, useRef, useState } from "react";
import Hole from "./src/Hole";
import {
  HOLES,
  TICK_MS,
  initialState,
  start,
  statusText,
  tick,
  whack,
} from "./src/mole";

// The random source the game uses. Read at call
// time, so a test can replace Math.random.
const random = () => Math.random();

export default function App() {
  const [game, setGame] = useState(initialState);
  // The interval callback is created once per
  // game, so it must not read \`game\` from its
  // closure (that copy would be stale). It reads
  // the latest state from this ref instead.
  const gameRef = useRef(game);
  const commit = (next) => {
    gameRef.current = next;
    setGame(next);
  };

  useEffect(() => {
    if (game.status !== "playing") return;
    const id = setInterval(
      () => commit(tick(gameRef.current, TICK_MS, random)),
      TICK_MS,
    );
    // runs on game over, on unmount, and in StrictMode re-runs
    return () => clearInterval(id);
  }, [game.status]);

  const playing = game.status === "playing";

  return (
    <main className="wam">
      <h1>Whack-a-Mole</h1>
      <div className="hud">
        <span>
          Score: <strong data-testid="score">{game.score}</strong>
        </span>
        <span>
          Time:{" "}
          <strong data-testid="time">
            {Math.ceil(game.timeLeft / 1000) + "s"}
          </strong>
        </span>
      </div>
      <p className="status" data-testid="status" aria-live="polite">
        {statusText(game)}
      </p>
      <div className="field" role="group" aria-label="Mole holes">
        {Array.from({ length: HOLES }, (_, i) => (
          <Hole
            key={i}
            index={i}
            up={Boolean(game.mole) && game.mole.hole === i}
            disabled={!playing}
            onWhack={(h) => commit(whack(gameRef.current, h))}
          />
        ))}
      </div>
      <button
        type="button"
        className="start"
        data-testid="start"
        disabled={playing}
        onClick={() => commit(start())}
      >
        {game.status === "over" ? "Play again" : "Start"}
      </button>
    </main>
  );
}
`,
          "/src/Hole.js": `export default function Hole({ index, up, disabled, onWhack }) {
  return (
    <button
      type="button"
      data-testid={"hole-" + index}
      className={"hole" + (up ? " up" : "")}
      aria-label={"Hole " + (index + 1) + (up ? ", mole!" : ", empty")}
      aria-disabled={disabled}
      onClick={() => onWhack(index)}
    >
      <span className="mole" aria-hidden="true" />
    </button>
  );
}
`,
          "/src/mole.js": `// Pure Whack-a-Mole logic: a state machine advanced by fixed ticks.
// No timers and no Math.random in here: the caller
// passes the elapsed time and a random source,
// so a test can replay a whole game deterministically.
export const HOLES = 9;
export const GAME_MS = 15000;
export const TICK_MS = 100;
// pause between one mole leaving and the next appearing
export const GAP_MS = 400;
export const UP_START_MS = 1200; // how long a mole stays up at the start...
export const UP_END_MS = 500; // ...shrinking linearly to this by the end

export const initialState = () => ({
  status: "idle", // "idle" | "playing" | "over"
  timeLeft: GAME_MS,
  score: 0,
  misses: 0,
  mole: null, // { hole, left } while a mole is up
  lastHole: -1,
  gapLeft: 0,
  spawned: 0,
});

export function upTime(timeLeft) {
  // 0 at the start, 1 at the end
  const progress = (GAME_MS - timeLeft) / GAME_MS;
  return Math.round(UP_START_MS - (UP_START_MS - UP_END_MS) * progress);
}

// One random draw per mole; never the same hole twice in a row.
export function pickHole(random, holes, last) {
  const choices = last === -1 ? holes : holes - 1;
  let i = Math.floor(random() * choices);
  if (last !== -1 && i >= last) i++;
  return i;
}

export const start = () => ({
  ...initialState(),
  status: "playing",
  gapLeft: GAP_MS,
});

export function tick(state, dt, random) {
  if (state.status !== "playing") return state;
  const timeLeft = Math.max(0, state.timeLeft - dt);
  if (timeLeft === 0) return { ...state, timeLeft, status: "over", mole: null };

  if (state.mole) {
    const left = state.mole.left - dt;
    if (left > 0) return { ...state, timeLeft, mole: { ...state.mole, left } };
    return {
      ...state,
      timeLeft,
      mole: null,
      misses: state.misses + 1,
      gapLeft: GAP_MS,
    }; // it got away
  }

  const gapLeft = state.gapLeft - dt;
  if (gapLeft > 0) return { ...state, timeLeft, gapLeft };
  const hole = pickHole(random, HOLES, state.lastHole);
  return {
    ...state,
    timeLeft,
    gapLeft: 0,
    mole: { hole, left: upTime(timeLeft) },
    lastHole: hole,
    spawned: state.spawned + 1,
  };
}

// Only a hit on the hole that has a mole counts,
// and only once: the mole goes down at once.
export function whack(state, hole) {
  if (state.status !== "playing" || !state.mole || state.mole.hole !== hole)
    return state;
  return { ...state, score: state.score + 1, mole: null, gapLeft: GAP_MS };
}

export function statusText(state) {
  if (state.status === "idle") return "Press Start, then hit the moles";
  if (state.status === "over") return "Game over! You scored " + state.score;
  return "Go!";
}
`,
          "/styles.css": `body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}
.wam {
  max-width: 380px;
  margin: 0 auto;
  padding: 24px 16px;
  text-align: center;
}
.wam h1 {
  font-size: 1.4rem;
  margin: 0 0 8px;
}
.hud {
  display: flex;
  justify-content: space-between;
  font-size: 1.05rem;
}
.hud strong {
  color: #fbbf24;
}
.status {
  min-height: 1.5em;
  color: #94a3b8;
}
.field {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 16px 0;
}
.hole {
  position: relative;
  aspect-ratio: 1;
  border-radius: 50%;
  border: none;
  overflow: hidden;
  cursor: pointer;
  background: radial-gradient(circle at 50% 70%, #3f2a14 0 45%, #14532d 46%);
  touch-action: manipulation;
}
.hole[aria-disabled="true"] {
  cursor: default;
}
.hole:focus-visible {
  outline: 3px solid #38bdf8;
  outline-offset: 2px;
}
.mole {
  position: absolute;
  left: 22%;
  width: 56%;
  height: 56%;
  bottom: -60%;
  border-radius: 50% 50% 40% 40%;
  background: #a16207;
  transition: bottom 120ms ease-out;
}
.hole.up .mole {
  bottom: 18%;
}
.start {
  padding: 10px 24px;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid #475569;
  background: #334155;
  color: #f8fafc;
  cursor: pointer;
}
.start:disabled {
  opacity: 0.5;
  cursor: default;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers preparing for a machine coding round. Comfortable with <code>ref</code>, <code>computed</code> and components; game loops, timers and testable randomness are explained from zero.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> for the vocabulary. Excerpts come from the runnable solution; the Verified section is a deterministic run (seeded randomness, real timers) on Vue 3.5.44.

## 1. A Story First

A fairground Whack-a-Mole machine is a clock plus a rulebook: every so often pop a mole in a random hole, pull it down if it has been up too long, add a point when the mallet hits it, and stop everything when time runs out. Build the code the same way: a rulebook advanced by a clock and handed a random number when it needs one. Vue's job is only to tick the clock and draw the result.

## 2. The Plan

<code>src/mole.js</code> is the rulebook, with no timers and no <code>Math.random</code>: <code>initialState</code>, <code>start</code>, <code>tick(state, dt, random)</code>, <code>whack(state, hole)</code>, <code>pickHole</code>, <code>upTime</code> and <code>statusText</code>.

📌 **Interview term: Finite state machine** — the game is always <code>idle</code>, <code>playing</code> or <code>over</code>; inside <code>playing</code>, either waiting out a 400 ms gap or showing one mole. <code>tick</code> and <code>whack</code> are the only ways to move between states.

📌 **Interview term: Injected random source** — <code>tick</code> receives <code>random</code> as an argument. The app passes <code>() => Math.random()</code>; a test passes a seeded generator and gets the same holes every run.

| Value | Vue tool |
| :--- | :--- |
| The whole game object | <code>shallowRef(initialState())</code> |
| Is it playing? | <code>computed</code> |
| The clock | One <code>setInterval</code>, started and stopped by a <code>watch</code> on <code>playing</code> |
| Cleanup | <code>onBeforeUnmount</code> |

## 3. Build It Step by Step

### Step 1: the rules

\`\`\`js
export function tick(state, dt, random) {
  if (state.status !== "playing") return state;
  const timeLeft = Math.max(0, state.timeLeft - dt);
  if (timeLeft === 0)
    return { ...state, timeLeft, status: "over", mole: null };

  if (state.mole) {
    const left = state.mole.left - dt;
    if (left > 0)
      return { ...state, timeLeft, mole: { ...state.mole, left } };
    return {
      ...state,
      timeLeft,
      mole: null,
      misses: state.misses + 1,
      gapLeft: GAP_MS,
    }; // it got away
  }

  const gapLeft = state.gapLeft - dt;
  if (gapLeft > 0) return { ...state, timeLeft, gapLeft };
  const hole = pickHole(random, HOLES, state.lastHole);
  return {
    ...state,
    timeLeft,
    gapLeft: 0,
    mole: { hole, left: upTime(timeLeft) },
    lastHole: hole,
    spawned: state.spawned + 1,
  };
}

// Only a hit on the hole that has a mole counts,
// and only once: the mole goes down at once.
export function whack(state, hole) {
  if (
    state.status !== "playing" ||
    !state.mole ||
    state.mole.hole !== hole
  )
    return state;
  return {
    ...state,
    score: state.score + 1,
    mole: null,
    gapLeft: GAP_MS,
  };
}
\`\`\`

📌 **Interview term: Fixed-timestep game loop** — each <code>tick</code> advances the game by 100 ms: count down the clock, age the visible mole (it escapes when its time runs out), or count down the gap and spawn a mole in a random hole that is not the previous one. <code>upTime</code> shrinks a mole's time from 1200 ms to 500 ms as the clock runs down, so difficulty is just data. <code>whack</code> scores only on the mole's hole and hides it at once, so a double click scores once.

### Step 2: one clock driven by a watch

\`\`\`vue
<script setup>
import { shallowRef, computed, watch, onBeforeUnmount } from "vue";
import MoleHole from "./components/MoleHole.vue";
import {
  HOLES,
  TICK_MS,
  initialState,
  start,
  statusText,
  tick,
  whack,
} from "./mole.js";

// The random source the game uses. Read at call
// time, so a test can replace Math.random.
const random = () => Math.random();

// The game object is always replaced, never
// mutated, so a shallowRef is enough.
const game = shallowRef(initialState());
const playing = computed(() => game.value.status === "playing");
const holes = Array.from({ length: HOLES }, (_, i) => i);

let timer = null;
function stopTimer() {
  clearInterval(timer);
  timer = null;
}

// Start the clock when a game starts, stop it when the game ends.
watch(playing, (isPlaying) => {
  stopTimer();
  if (isPlaying)
    timer = setInterval(
      () => (game.value = tick(game.value, TICK_MS, random)),
      TICK_MS,
    );
});
onBeforeUnmount(stopTimer);

function onWhack(hole) {
  game.value = whack(game.value, hole);
}
</script>
\`\`\`

- 📌 **Interview term: shallowRef** — a ref that only tracks replacement of <code>.value</code>, not changes deep inside it. The game object is always replaced by <code>tick</code> and <code>whack</code>, so deep tracking would be wasted work. See [shallowRef and shallowReactive](/interview-question/what-are-shallowref-and-shallowreactive).
- The <code>watch</code> is on <code>playing</code>, a computed boolean, not on <code>game</code>. Ticks replace <code>game</code> ten times a second, but <code>playing</code> only changes on Start and on Game over, so the interval is created once per game and stopped exactly when <code>tick</code> flips the status to <code>over</code>. See [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch).
- The interval callback reads <code>game.value</code> at tick time, so it always sees the latest state; a ref is a live box, not a captured snapshot.
- <code>onBeforeUnmount(stopTimer)</code> clears the clock if the component disappears mid-game.
- <code>random</code> looks up <code>Math.random</code> on every call, which is the seam the test driver uses to install its seeded generator.

### Step 3: the template and the hole

\`\`\`vue
<template>
  <main class="wam">
    <h1>Whack-a-Mole</h1>
    <div class="hud">
      <span
        >Score:
        <strong data-testid="score">{{ game.score }}</strong></span
      >
      <span
        >Time:
        <strong data-testid="time">{{
          Math.ceil(game.timeLeft / 1000) + "s"
        }}</strong></span
      >
    </div>
    <p class="status" data-testid="status" aria-live="polite">
      {{ statusText(game) }}
    </p>
    <div class="field" role="group" aria-label="Mole holes">
      <MoleHole
        v-for="i in holes"
        :key="i"
        :index="i"
        :up="Boolean(game.mole) && game.mole.hole === i"
        :disabled="!playing"
        @whack="onWhack"
      />
    </div>
    <button
      type="button"
      class="start"
      data-testid="start"
      :disabled="playing"
      @click="game = start()"
    >
      {{ game.status === "over" ? "Play again" : "Start" }}
    </button>
  </main>
</template>
\`\`\`

<code>MoleHole.vue</code> is a button with <code>:aria-label</code> "Hole 6, mole!" or "Hole 6, empty", <code>:aria-disabled</code> while not playing, and <code>emit("whack", index)</code> on click. The mole itself is a span that slides up with a CSS transition when the button has the <code>up</code> class.

## 4. Verified

The rules alone, with node, using <code>mulberry32(42)</code> and three simulated players:

\`\`\`text
up time at 15s / 7.5s / 0s left: 1200 850 500 ms
fast player (200 ms) | moles 25 | score 24 | missed 0 | first holes 5,3,7,5,1,5,2,5
slow player (900 ms) | moles 12 | score 5 | missed 7 | first holes 5,3,7,5,1,5,2,5
never hits           | moles 12 | score 0 | missed 11 | first holes 5,3,7,5,1,5,2,5
same seed twice gives the same game: true
10,000 picks, same hole twice in a row: 0
\`\`\`

The SFCs were compiled and mounted in jsdom. The driver replaced <code>Math.random</code> with the same seeded generator, pressed Start, polled every 20 ms, clicked a wrong hole and the mole twice, whacked moles 2, 3, 5 and 6, let mole 4 escape and ignored the rest:

\`\`\`text
RENDERED: Whack-a-MoleScore: 0Time: 15sPress Start, then hit the molesStart
idle        : Press Start, then hit the moles | score 0 | time 15s | hole-0 aria-disabled = true
idle click  : score 0
started     : Go! | time 15s | start disabled = true
wrong hole  : mole in 5 | clicked 6 | score 0
double hit  : score 1 | mole still up? false
mole 4      : hole 5 aria-label = Hole 6, mole! | left alone
first mole  : after ~400 ms
holes       : 5, 3, 7, 5, 1, 5, 2, 5
mole 4      : got away by itself after roughly a second: true
score now   : 5
game over   : Game over! You scored 5 | time 0s | took 15 to 16.5 s: true | mole up? false
after 600ms : anything changed? false
late click  : score 5 | button = Play again
play again  : Go! | score 0 | time 15s
\`\`\`

The hole sequence matches the node run and the React and Angular builds. The double hit scored once, the board did not change for 600 ms after Game over (no leaked interval), and a late click did nothing. The first-mole delay is rounded and the escape is checked as a range because these are real timers; the slide-up animation was not checked in jsdom.

## 5. Common Pitfalls

- **Watching <code>game</code> to start the clock.** It fires on every tick and restarts the interval ten times a second.
- **A <code>setTimeout</code> per mole plus a countdown interval.** Several timers race, and some survive Game over.
- **<code>Math.random</code> inside the rules.** No deterministic test is possible.
- **No <code>onBeforeUnmount</code> cleanup.** The interval keeps running after the component is gone.
- **Deep <code>ref</code> plus mutation** (<code>game.value.score++</code>). It works, but it mixes rules into the component and makes replay testing impossible.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"It is a state machine: idle, playing, over, with a gap or one mole inside playing, all in one object."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Rules:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(state, dt, random)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">whack(state, hole)</code> are pure apart from the injected random source; no timers inside."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Clock:</strong> <span style="color:#f0e2c8;">"One 100 ms <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInterval</code>, started and stopped by a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">playing</code> computed, and cleared in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBeforeUnmount</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Reactivity:</strong> <span style="color:#f0e2c8;">"The game lives in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> because it is always replaced; the interval reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">game.value</code> at tick time, so nothing is stale."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Testing:</strong> <span style="color:#f0e2c8;">"With a seeded generator I replay whole games in node, and the UI driver sees the same hole sequence."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you package this for reuse?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useWhackAMole(random)</code> composable that owns the shallowRef, the watch, the interval and its cleanup, and returns the game, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hit</code>. The component only renders.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you pause in a background tab?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Listen for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">visibilitychange</code> and stop the interval while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.hidden</code> is true, restarting it when the page is visible again. The state machine does not change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add several moles at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mole</code> a list with its own time left per entry, spawn while below a cap, and have <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">whack</code> remove the matching entry. The single clock stays.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue Test Utils with fake timers and a mocked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.random</code>: click Start, advance 400 ms, find the hole with the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">up</code> class, click it and assert the score.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Finite state machine** | Always in one named state; events move it between states |
| **Injected random source** | Passing the random function in so tests can control it |
| **Fixed-timestep game loop** | Advancing the game in equal steps from one clock |
| **shallowRef** | A ref that tracks only replacement of its value |

---

**Conclusion:** In Vue, Whack-a-Mole is a pure tick-driven state machine in a plain module, a <code>shallowRef</code> holding the current game, and one interval started and stopped by a watch on a computed <code>playing</code> flag. Inject the random source and the whole game becomes replayable, testable and free of leaked timers.`,
        files: {
          "/src/App.vue": `<script setup>
import { shallowRef, computed, watch, onBeforeUnmount } from "vue";
import MoleHole from "./components/MoleHole.vue";
import {
  HOLES,
  TICK_MS,
  initialState,
  start,
  statusText,
  tick,
  whack,
} from "./mole.js";

// The random source the game uses. Read at call
// time, so a test can replace Math.random.
const random = () => Math.random();

// The game object is always replaced, never mutated, so a shallowRef is enough.
const game = shallowRef(initialState());
const playing = computed(() => game.value.status === "playing");
const holes = Array.from({ length: HOLES }, (_, i) => i);

let timer = null;
function stopTimer() {
  clearInterval(timer);
  timer = null;
}

// Start the clock when a game starts, stop it when the game ends.
watch(playing, (isPlaying) => {
  stopTimer();
  if (isPlaying)
    timer = setInterval(
      () => (game.value = tick(game.value, TICK_MS, random)),
      TICK_MS,
    );
});
onBeforeUnmount(stopTimer);

function onWhack(hole) {
  game.value = whack(game.value, hole);
}
</script>

<template>
  <main class="wam">
    <h1>Whack-a-Mole</h1>
    <div class="hud">
      <span
        >Score: <strong data-testid="score">{{ game.score }}</strong></span
      >
      <span
        >Time:
        <strong data-testid="time">{{
          Math.ceil(game.timeLeft / 1000) + "s"
        }}</strong></span
      >
    </div>
    <p class="status" data-testid="status" aria-live="polite">
      {{ statusText(game) }}
    </p>
    <div class="field" role="group" aria-label="Mole holes">
      <MoleHole
        v-for="i in holes"
        :key="i"
        :index="i"
        :up="Boolean(game.mole) && game.mole.hole === i"
        :disabled="!playing"
        @whack="onWhack"
      />
    </div>
    <button
      type="button"
      class="start"
      data-testid="start"
      :disabled="playing"
      @click="game = start()"
    >
      {{ game.status === "over" ? "Play again" : "Start" }}
    </button>
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}
.wam {
  max-width: 380px;
  margin: 0 auto;
  padding: 24px 16px;
  text-align: center;
}
.wam h1 {
  font-size: 1.4rem;
  margin: 0 0 8px;
}
.hud {
  display: flex;
  justify-content: space-between;
  font-size: 1.05rem;
}
.hud strong {
  color: #fbbf24;
}
.status {
  min-height: 1.5em;
  color: #94a3b8;
}
.field {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 16px 0;
}
.start {
  padding: 10px 24px;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid #475569;
  background: #334155;
  color: #f8fafc;
  cursor: pointer;
}
.start:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
`,
          "/src/components/MoleHole.vue": `<script setup>
defineProps({
  index: { type: Number, required: true },
  up: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["whack"]);
</script>

<template>
  <button
    type="button"
    :data-testid="'hole-' + index"
    :class="['hole', { up }]"
    :aria-label="'Hole ' + (index + 1) + (up ? ', mole!' : ', empty')"
    :aria-disabled="disabled"
    @click="emit('whack', index)"
  >
    <span class="mole" aria-hidden="true" />
  </button>
</template>

<style scoped>
.hole {
  position: relative;
  aspect-ratio: 1;
  border-radius: 50%;
  border: none;
  overflow: hidden;
  cursor: pointer;
  background: radial-gradient(circle at 50% 70%, #3f2a14 0 45%, #14532d 46%);
  touch-action: manipulation;
}
.hole[aria-disabled="true"] {
  cursor: default;
}
.hole:focus-visible {
  outline: 3px solid #38bdf8;
  outline-offset: 2px;
}
.mole {
  position: absolute;
  left: 22%;
  width: 56%;
  height: 56%;
  bottom: -60%;
  border-radius: 50% 50% 40% 40%;
  background: #a16207;
  transition: bottom 120ms ease-out;
}
.hole.up .mole {
  bottom: 18%;
}
</style>
`,
          "/src/mole.js": `// Pure Whack-a-Mole logic: a state machine advanced by fixed ticks.
// No timers and no Math.random in here: the caller
// passes the elapsed time and a random source,
// so a test can replay a whole game deterministically.
export const HOLES = 9;
export const GAME_MS = 15000;
export const TICK_MS = 100;
// pause between one mole leaving and the next appearing
export const GAP_MS = 400;
export const UP_START_MS = 1200; // how long a mole stays up at the start...
export const UP_END_MS = 500; // ...shrinking linearly to this by the end

export const initialState = () => ({
  status: "idle", // "idle" | "playing" | "over"
  timeLeft: GAME_MS,
  score: 0,
  misses: 0,
  mole: null, // { hole, left } while a mole is up
  lastHole: -1,
  gapLeft: 0,
  spawned: 0,
});

export function upTime(timeLeft) {
  // 0 at the start, 1 at the end
  const progress = (GAME_MS - timeLeft) / GAME_MS;
  return Math.round(UP_START_MS - (UP_START_MS - UP_END_MS) * progress);
}

// One random draw per mole; never the same hole twice in a row.
export function pickHole(random, holes, last) {
  const choices = last === -1 ? holes : holes - 1;
  let i = Math.floor(random() * choices);
  if (last !== -1 && i >= last) i++;
  return i;
}

export const start = () => ({
  ...initialState(),
  status: "playing",
  gapLeft: GAP_MS,
});

export function tick(state, dt, random) {
  if (state.status !== "playing") return state;
  const timeLeft = Math.max(0, state.timeLeft - dt);
  if (timeLeft === 0) return { ...state, timeLeft, status: "over", mole: null };

  if (state.mole) {
    const left = state.mole.left - dt;
    if (left > 0) return { ...state, timeLeft, mole: { ...state.mole, left } };
    return {
      ...state,
      timeLeft,
      mole: null,
      misses: state.misses + 1,
      gapLeft: GAP_MS,
    }; // it got away
  }

  const gapLeft = state.gapLeft - dt;
  if (gapLeft > 0) return { ...state, timeLeft, gapLeft };
  const hole = pickHole(random, HOLES, state.lastHole);
  return {
    ...state,
    timeLeft,
    gapLeft: 0,
    mole: { hole, left: upTime(timeLeft) },
    lastHole: hole,
    spawned: state.spawned + 1,
  };
}

// Only a hit on the hole that has a mole counts,
// and only once: the mole goes down at once.
export function whack(state, hole) {
  if (state.status !== "playing" || !state.mole || state.mole.hole !== hole)
    return state;
  return { ...state, score: state.score + 1, mole: null, gapLeft: GAP_MS };
}

export function statusText(state) {
  if (state.status === "idle") return "Press Start, then hit the moles";
  if (state.status === "over") return "Game over! You scored " + state.score;
  return "Go!";
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers preparing for a machine coding round. Comfortable with signals and components; game loops, timers and testable randomness are explained from zero.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> for the vocabulary. Excerpts come from the runnable solution; Verified output is a deterministic run (seeded randomness, real timers) on Angular 22.2.3, AOT and runtime JIT.

## 1. A Story First

A Whack-a-Mole machine is a clock and a rulebook. The clock ticks; the rulebook says when a mole pops up (in a random hole), when it hides, when a hit counts, and when the game ends. In Angular, the rulebook is a typed, framework-free file, the clock is one interval, and signals carry the result to the template.

## 2. The Plan

<code>mole.ts</code> defines <code>GameState</code> and the rules: <code>tick(state, dt, random)</code>, <code>whack(state, hole)</code>, <code>pickHole</code>, <code>upTime</code>, <code>start</code>, <code>statusText</code>. No timers, no <code>Math.random</code>.

📌 **Interview term: Finite state machine** — <code>idle</code>, <code>playing</code>, <code>over</code>; inside <code>playing</code>, a 400 ms gap or one mole up for 1200 ms shrinking to 500 ms.

📌 **Interview term: Injected random source** — the caller hands <code>tick</code> a <code>random</code> function; tests pass a seeded generator for exact replays.

| Value | Angular tool |
| :--- | :--- |
| The game | <code>signal&lt;GameState&gt;</code> |
| Playing, seconds left, status text | <code>computed()</code> |
| The clock | <code>effect()</code> that starts an interval while playing and clears it in <code>onCleanup</code> |

## 3. Build It Step by Step

### Step 1: the rules

\`\`\`ts
export function tick(
  state: GameState,
  dt: number,
  random: Random,
): GameState {
  if (state.status !== "playing") return state;
  const timeLeft = Math.max(0, state.timeLeft - dt);
  if (timeLeft === 0)
    return { ...state, timeLeft, status: "over", mole: null };

  if (state.mole) {
    const left = state.mole.left - dt;
    if (left > 0)
      return { ...state, timeLeft, mole: { ...state.mole, left } };
    return {
      ...state,
      timeLeft,
      mole: null,
      misses: state.misses + 1,
      gapLeft: GAP_MS,
    }; // it got away
  }

  const gapLeft = state.gapLeft - dt;
  if (gapLeft > 0) return { ...state, timeLeft, gapLeft };
  const hole = pickHole(random, HOLES, state.lastHole);
  return {
    ...state,
    timeLeft,
    gapLeft: 0,
    mole: { hole, left: upTime(timeLeft) },
    lastHole: hole,
    spawned: state.spawned + 1,
  };
}

// Only a hit on the hole that has a mole counts,
// and only once: the mole goes down at once.
export function whack(state: GameState, hole: number): GameState {
  if (
    state.status !== "playing" ||
    !state.mole ||
    state.mole.hole !== hole
  )
    return state;
  return {
    ...state,
    score: state.score + 1,
    mole: null,
    gapLeft: GAP_MS,
  };
}
\`\`\`

📌 **Interview term: Fixed-timestep game loop** — each call advances 100 ms: the countdown, the visible mole's remaining time (it escapes at zero), or the gap before the next spawn. <code>whack</code> scores only on the mole's hole and hides it immediately, so a double click scores once. Both return the same state object when nothing changes.

### Step 2: the clock as an effect

\`\`\`ts
export class AppComponent {
  readonly holes = Array.from({ length: HOLES }, (_, i) => i);
  readonly start = start;

  readonly game = signal<GameState>(initialState());
  readonly playing = computed(() => this.game().status === "playing");
  readonly seconds = computed(() =>
    Math.ceil(this.game().timeLeft / 1000),
  );
  readonly status = computed(() => statusText(this.game()));

  constructor() {
    // Start the clock when a game starts, stop it when
    // the game ends or the component is destroyed.
    effect((onCleanup) => {
      if (!this.playing()) return;
      const id = setInterval(
        () => this.game.update((g) => tick(g, TICK_MS, random)),
        TICK_MS,
      );
      // runs before the next effect run and on destroy
      onCleanup(() => clearInterval(id));
    });
  }

  onWhack(hole: number): void {
    this.game.update((g) => whack(g, hole));
  }
}
\`\`\`

- 📌 **Interview term: effect() with onCleanup** — an effect re-runs when the signals it read change. This one reads only <code>playing()</code>, a computed boolean, so the ten-per-second updates to <code>game</code> do not re-run it; it runs on Start and on Game over. <code>onCleanup</code> clears the interval before the next run and when the component is destroyed, because an effect created in a constructor belongs to the component. See [effect() and when not to use it](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it).
- <code>this.game.update((g) => tick(g, TICK_MS, random))</code> calls the function once per tick, so each spawn makes exactly one random draw.
- 📌 **Interview term: Zoneless rendering** — the playground runs without Zone.js. The interval callback re-renders the view only because it writes to a signal. See [zoneless Angular](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18).
- <code>readonly start = start</code> exposes the imported function to the template.

### Step 3: the template and the hole

\`\`\`ts
  template: \`
    <main class="wam">
      <h1>Whack-a-Mole</h1>
      <div class="hud">
        <span>Score: <strong data-testid="score">{{ game().score }}</strong></span>
        <span>Time: <strong data-testid="time">{{ seconds() + "s" }}</strong></span>
      </div>
      <p class="status" data-testid="status" aria-live="polite">{{ status() }}</p>
      <div class="field" role="group" aria-label="Mole holes">
        @for (i of holes; track i) {
          <app-hole [index]="i" [up]="game().mole?.hole === i" [disabled]="!playing()" (whack)="onWhack($event)" />
        }
      </div>
      <button type="button" class="start" data-testid="start" [disabled]="playing()" (click)="game.set(start())">
        {{ game().status === "over" ? "Play again" : "Start" }}
      </button>
\`\`\`

<code>HoleComponent</code> is a button with <code>[attr.aria-label]</code> ("Hole 6, mole!" or "Hole 6, empty"), <code>[attr.aria-disabled]</code> while not playing, <code>[class.up]</code> for the CSS slide, and an <code>@Output() whack</code>. The optional chain <code>game().mole?.hole === i</code> is false when no mole is up.

## 4. Verified

The rules, with node and <code>mulberry32(42)</code>:

\`\`\`text
up time at 15s / 7.5s / 0s left: 1200 850 500 ms
fast player (200 ms) | moles 25 | score 24 | missed 0 | first holes 5,3,7,5,1,5,2,5
slow player (900 ms) | moles 12 | score 5 | missed 7 | first holes 5,3,7,5,1,5,2,5
never hits           | moles 12 | score 0 | missed 11 | first holes 5,3,7,5,1,5,2,5
same seed twice gives the same game: true
10,000 picks, same hole twice in a row: 0
\`\`\`

Booted AOT (ngc, <code>strictTemplates</code>) and JIT; the driver installed the same seeded <code>Math.random</code>, pressed Start, polled every 20 ms, clicked a wrong hole and the mole twice, whacked moles 2, 3, 5 and 6, let 4 escape and ignored the rest. AOT output:

\`\`\`text
RENDERED: Whack-a-MoleScore: 0Time: 15sPress Start, then hit the moles Start
idle        : Press Start, then hit the moles | score 0 | time 15s | hole-0 aria-disabled = true
idle click  : score 0
started     : Go! | time 15s | start disabled = true
wrong hole  : mole in 5 | clicked 6 | score 0
double hit  : score 1 | mole still up? false
mole 4      : hole 5 aria-label = Hole 6, mole! | left alone
first mole  : after ~400 ms
holes       : 5, 3, 7, 5, 1, 5, 2, 5
mole 4      : got away by itself after roughly a second: true
score now   : 5
game over   : Game over! You scored 5 | time 0s | took 15 to 16.5 s: true | mole up? false
after 600ms : anything changed? false
late click  : score 5 | button = Play again
play again  : Go! | score 0 | time 15s
\`\`\`

The JIT run printed identical lines; the holes match the node run and the React and Vue builds. After Game over nothing changed for 600 ms, so the effect cleanup stopped the interval. Real-time values are rounded or range-checked; the slide animation was not checked in jsdom.

## 5. Common Pitfalls

- **An effect that reads <code>game()</code>.** It re-runs on every tick and recreates the interval ten times a second; depend on <code>playing()</code> only.
- **Plain fields updated from the interval.** In a zoneless app the view does not update.
- **Forgetting <code>onCleanup</code>.** Intervals pile up on every restart and survive destroy.
- **<code>Math.random</code> inside the rules.** No deterministic test.
- **Constructor-parameter DI in the playground.** Use <code>inject()</code> when you need services.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"A state machine in one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GameState</code>: idle, playing, over, and a gap or one mole while playing."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Rules:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(state, dt, random)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">whack(state, hole)</code> in a typed, framework-free file, with randomness injected."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Clock:</strong> <span style="color:#f0e2c8;">"An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> that reads only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">playing()</code>: it starts a 100 ms interval while playing and clears it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> on game over or destroy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Signals:</strong> <span style="color:#f0e2c8;">"Each tick does <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">game.update(g =&gt; tick(...))</code>, which is what re-renders in a zoneless app; seconds and status are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Testing:</strong> <span style="color:#f0e2c8;">"A seeded generator replays exact games in node, and the UI driver sees the same hole sequence in every framework."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use RxJS instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">interval(100).pipe(takeWhile(...))</code> subscribed on Start and cleaned up with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">takeUntilDestroyed</code> works well. The effect version keeps the clock tied to the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">playing</code> signal with less code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test with TestBed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Spy on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.random</code> with a seeded sequence, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fakeAsync</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(400)</code> to reach the first spawn, click the hole with the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">up</code> class, flush change detection and assert the score.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you pause on a hidden tab?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">visibilitychange</code> listener (via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@HostListener("document:visibilitychange")</code>) that sets a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">paused</code> signal; the effect reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">playing() &amp;&amp; !paused()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you show a hit animation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lastHit</code> field set by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">whack</code> and cleared by the next tick, and bind a class to it; the rules stay pure and the animation is CSS.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Finite state machine** | One named state at a time, moved by events |
| **Injected random source** | The random function is a parameter, so tests can control it |
| **Fixed-timestep game loop** | Equal time steps from one clock |
| **effect() with onCleanup** | Reactive side effect that tears down its previous run |
| **Zoneless rendering** | Views update when signals change, not after every async callback |

---

**Conclusion:** Angular Whack-a-Mole is a typed, pure, tick-driven state machine, one signal holding the game, and an effect that owns the only interval and cleans it up. Inject the randomness and the game becomes replayable and testable, with no leaked timers in either the AOT or the runtime-compiled build.`,
        files: {
          "/src/app/app.component.ts": `import { Component, computed, effect, signal } from "@angular/core";
import { HoleComponent } from "./hole.component";
import {
  GameState,
  HOLES,
  TICK_MS,
  initialState,
  start,
  statusText,
  tick,
  whack,
} from "./mole";

// The random source the game uses. Read at call
// time, so a test can replace Math.random.
const random = () => Math.random();

@Component({
  selector: "app-root",
  standalone: true,
  imports: [HoleComponent],
  template: \`
    <main class="wam">
      <h1>Whack-a-Mole</h1>
      <div class="hud">
        <span>Score: <strong data-testid="score">{{ game().score }}</strong></span>
        <span>Time: <strong data-testid="time">{{ seconds() + "s" }}</strong></span>
      </div>
      <p
        class="status"
        data-testid="status"
        aria-live="polite"
      >{{ status() }}</p>
      <div class="field" role="group" aria-label="Mole holes">
        @for (i of holes; track i) {
          <app-hole
            [index]="i"
            [up]="game().mole?.hole === i"
            [disabled]="!playing()"
            (whack)="onWhack($event)"
          />
        }
      </div>
      <button
        type="button"
        class="start"
        data-testid="start"
        [disabled]="playing()"
        (click)="game.set(start())"
      >
        {{ game().status === "over" ? "Play again" : "Start" }}
      </button>
    </main>
  \`,
  styles: [
    \`
    :host { display: block; font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    .wam { max-width: 380px; margin: 0 auto; padding: 24px 16px; text-align: center; }
    .wam h1 { font-size: 1.4rem; margin: 0 0 8px; }
    .hud { display: flex; justify-content: space-between; font-size: 1.05rem; }
    .hud strong { color: #fbbf24; }
    .status { min-height: 1.5em; color: #94a3b8; }
    .field { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
    .start { padding: 10px 24px; font-size: 1rem; border-radius: 8px; border: 1px solid #475569; background: #334155;
      color: #f8fafc; cursor: pointer; }
    .start:disabled { opacity: 0.5; cursor: default; }
  \`,
  ],
})
export class AppComponent {
  readonly holes = Array.from({ length: HOLES }, (_, i) => i);
  readonly start = start;

  readonly game = signal<GameState>(initialState());
  readonly playing = computed(() => this.game().status === "playing");
  readonly seconds = computed(() => Math.ceil(this.game().timeLeft / 1000));
  readonly status = computed(() => statusText(this.game()));

  constructor() {
    // Start the clock when a game starts, stop it when
    // the game ends or the component is destroyed.
    effect((onCleanup) => {
      if (!this.playing()) return;
      const id = setInterval(
        () => this.game.update((g) => tick(g, TICK_MS, random)),
        TICK_MS,
      );
      // runs before the next effect run and on destroy
      onCleanup(() => clearInterval(id));
    });
  }

  onWhack(hole: number): void {
    this.game.update((g) => whack(g, hole));
  }
}
`,
          "/src/app/hole.component.ts": `import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: "app-hole",
  standalone: true,
  template: \`
    <button
      type="button"
      [attr.data-testid]="'hole-' + index"
      class="hole"
      [class.up]="up"
      [attr.aria-label]="'Hole ' + (index + 1) + (up ? ', mole!' : ', empty')"
      [attr.aria-disabled]="disabled"
      (click)="whack.emit(index)"
    >
      <span class="mole" aria-hidden="true"></span>
    </button>
  \`,
  styles: [
    \`
      :host {
        display: block;
      }
      .hole {
        position: relative;
        display: block;
        width: 100%;
        aspect-ratio: 1;
        border-radius: 50%;
        border: none;
        overflow: hidden;
        cursor: pointer;
        background: radial-gradient(
          circle at 50% 70%,
          #3f2a14 0 45%,
          #14532d 46%
        );
        touch-action: manipulation;
      }
      .hole[aria-disabled="true"] {
        cursor: default;
      }
      .hole:focus-visible {
        outline: 3px solid #38bdf8;
        outline-offset: 2px;
      }
      .mole {
        position: absolute;
        left: 22%;
        width: 56%;
        height: 56%;
        bottom: -60%;
        border-radius: 50% 50% 40% 40%;
        background: #a16207;
        transition: bottom 120ms ease-out;
      }
      .hole.up .mole {
        bottom: 18%;
      }
    \`,
  ],
})
export class HoleComponent {
  @Input() index = 0;
  @Input() up = false;
  @Input() disabled = false;
  @Output() whack = new EventEmitter<number>();
}
`,
          "/src/app/mole.ts": `// Pure Whack-a-Mole logic: a state machine advanced by fixed ticks.
// No timers and no Math.random in here: the caller
// passes the elapsed time and a random source,
// so a test can replay a whole game deterministically.
export const HOLES = 9;
export const GAME_MS = 15000;
export const TICK_MS = 100;
// pause between one mole leaving and the next appearing
export const GAP_MS = 400;
export const UP_START_MS = 1200; // how long a mole stays up at the start...
export const UP_END_MS = 500; // ...shrinking linearly to this by the end

export type Status = "idle" | "playing" | "over";
export interface Mole {
  hole: number;
  left: number;
}
export interface GameState {
  status: Status;
  timeLeft: number;
  score: number;
  misses: number;
  mole: Mole | null;
  lastHole: number;
  gapLeft: number;
  spawned: number;
}
export type Random = () => number;

export const initialState = (): GameState => ({
  status: "idle",
  timeLeft: GAME_MS,
  score: 0,
  misses: 0,
  mole: null, // { hole, left } while a mole is up
  lastHole: -1,
  gapLeft: 0,
  spawned: 0,
});

export function upTime(timeLeft: number): number {
  // 0 at the start, 1 at the end
  const progress = (GAME_MS - timeLeft) / GAME_MS;
  return Math.round(UP_START_MS - (UP_START_MS - UP_END_MS) * progress);
}

// One random draw per mole; never the same hole twice in a row.
export function pickHole(random: Random, holes: number, last: number): number {
  const choices = last === -1 ? holes : holes - 1;
  let i = Math.floor(random() * choices);
  if (last !== -1 && i >= last) i++;
  return i;
}

export const start = (): GameState => ({
  ...initialState(),
  status: "playing",
  gapLeft: GAP_MS,
});

export function tick(state: GameState, dt: number, random: Random): GameState {
  if (state.status !== "playing") return state;
  const timeLeft = Math.max(0, state.timeLeft - dt);
  if (timeLeft === 0) return { ...state, timeLeft, status: "over", mole: null };

  if (state.mole) {
    const left = state.mole.left - dt;
    if (left > 0) return { ...state, timeLeft, mole: { ...state.mole, left } };
    return {
      ...state,
      timeLeft,
      mole: null,
      misses: state.misses + 1,
      gapLeft: GAP_MS,
    }; // it got away
  }

  const gapLeft = state.gapLeft - dt;
  if (gapLeft > 0) return { ...state, timeLeft, gapLeft };
  const hole = pickHole(random, HOLES, state.lastHole);
  return {
    ...state,
    timeLeft,
    gapLeft: 0,
    mole: { hole, left: upTime(timeLeft) },
    lastHole: hole,
    spawned: state.spawned + 1,
  };
}

// Only a hit on the hole that has a mole counts,
// and only once: the mole goes down at once.
export function whack(state: GameState, hole: number): GameState {
  if (state.status !== "playing" || !state.mole || state.mole.hole !== hole)
    return state;
  return { ...state, score: state.score + 1, mole: null, gapLeft: GAP_MS };
}

export function statusText(state: GameState): string {
  if (state.status === "idle") return "Press Start, then hit the moles";
  if (state.status === "over") return "Game over! You scored " + state.score;
  return "Go!";
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build an Undoable Counter (undo/redo history)",
    seoDescription: "Build an undoable counter with past, present and future stacks: undo, redo, a history table, keyboard shortcuts and redo cleared by a new action.",
    description: `**Question presented to candidate:**
"Build a counter that starts at 0 with four buttons: divide by 2, minus 1, plus 1 and times 2. Every operation should be undoable and redoable, and below the counter show a history table of what was done, with the old and new values. If I undo a few steps and then press a new operation, the steps I undid should no longer be redoable. Add Reset, and keyboard shortcuts if you have time."

**Requirements:**
- A value starting at 0 and four operation buttons: \`/2\`, \`-1\`, \`+1\`, \`x2\`.
- Undo reverts the latest operation; Redo re-applies the latest undone one. Both are disabled when there is nothing to do.
- A new operation after an undo clears the redo history.
- A history table, newest first, showing the operation, the old value and the new value.
- Reset clears the value and all history.
- Bonus: Ctrl+Z / Cmd+Z to undo, Ctrl+Shift+Z or Ctrl+Y to redo; a cap on history length.

**What a strong answer should cover:**
- The past / present / future model, kept in one state object so the three can never drift apart.
- Undo moves the newest past entry to the front of the future; redo moves it back; a new action pushes to the past and empties the future.
- Storing operations with their before and after values (or snapshots of the value), and why that makes undo exact even for \`/2\`.
- Pure transition functions that are trivial to unit-test, and immutable updates.
- Keyboard shortcuts on the window with cleanup, and disabling Undo / Redo when their stacks are empty.

**Clarifying questions expected:**
- "Should Reset itself be undoable?"
- "Is there a limit on how much history to keep?"
- "Should \`/2\` produce fractions, or round to an integer?"

**Code / implementation expected:** Yes. A working component with the undo/redo logic as pure functions, in about 30 minutes.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. Comfortable with React components and <code>useState</code>; the undo/redo model is explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Excerpts come from the runnable solution on this page, and the Verified section quotes what it printed on React 19.3.1 when a driver clicked buttons and pressed shortcuts.

## 1. Why This Even Matters — A Story First

Think about walking along a hallway of rooms. Behind you are the rooms you have already been through (the **past**). You are standing in one room right now (the **present**). If you stepped back earlier, the rooms you backed out of are still ahead of you (the **future**), and you can walk forward into them again.

Undo is stepping back one room. Redo is stepping forward again. Now the important rule: if you are standing a few rooms back and you open a *different* door, the old rooms ahead of you are no longer on your path. They belong to a timeline you just left. That is why a new action clears redo.

Every text editor, drawing app and form builder has this feature, and interviewers use this tiny counter to see whether you can model it cleanly without a tangle of flags.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is Reset undoable, or does it wipe history? | Undoable reset is just another operation; wiping history resets all three stacks. Here: it wipes. |
| Should history be capped? | Unbounded history grows forever in a long session. Here: 50 entries. |
| Fractions for <code>/2</code>, or round? | Rounding would make <code>/2</code> irreversible by inverse math; storing old values makes it exact either way. |
| Do you want the history table to include undone entries? | Some designs grey them out. Here the table shows the past only. |
| Keyboard shortcuts? | Adds a window listener and the platform conventions (Ctrl vs Cmd, Shift+Z vs Y). |

## 3. Requirements and the Plan

**Component tree:** <code>App</code> owns one <code>history</code> state object and the shortcut listener; <code>HistoryTable</code> renders the past. The logic lives in <code>src/history.js</code>, which has no React import.

| Value | Kind | Notes |
| :--- | :--- | :--- |
| <code>history.past</code> | State | Applied entries <code>{ op, from, to }</code>, oldest first |
| <code>history.present</code> | State | The current number |
| <code>history.future</code> | State | Undone entries, next-to-redo first |
| Can undo / can redo | Derived | Stack lengths |
| Table rows | Derived | <code>past</code> reversed |

📌 **Interview term: Undo stack and redo stack** — two lists that hold what you can undo and what you can redo. Together with the present value they are often called the <em>past / present / future</em> pattern.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Past, present and future boxes; undo moves the newest past entry to the future, redo moves it back, and a new action pushes to the past and clears the future">
  <defs>
    <marker id="ucr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="90" width="190" height="90" rx="12"/>
  <text class="d-text" x="125" y="124" text-anchor="middle">past</text>
  <text class="d-sub" x="125" y="150" text-anchor="middle">+1, +1, x2</text>
  <rect class="d-box-accent" x="270" y="90" width="160" height="90" rx="12"/>
  <text class="d-text d-accent" x="350" y="124" text-anchor="middle">present</text>
  <text class="d-sub" x="350" y="150" text-anchor="middle">4</text>
  <rect class="d-box" x="480" y="90" width="190" height="90" rx="12"/>
  <text class="d-text" x="575" y="124" text-anchor="middle">future</text>
  <text class="d-sub" x="575" y="150" text-anchor="middle">empty until undo</text>
  <path class="d-edge-accent" d="M 125 90 C 125 30, 575 30, 575 84" marker-end="url(#ucr-arrow)"/>
  <text class="d-sub" x="350" y="22" text-anchor="middle">undo: newest past entry moves to the future</text>
  <path class="d-edge" d="M 575 180 C 575 240, 125 240, 125 186" marker-end="url(#ucr-arrow)"/>
  <text class="d-sub" x="350" y="262" text-anchor="middle">redo: first future entry moves back</text>
</svg>

A new operation is the third arrow that is not drawn on purpose: it pushes onto the past and replaces the future with an empty list, because those undone steps belong to a timeline the user has left.

## 4. Build It Step by Step

### Step 1: the model and the three transitions

\`\`\`js
// Pure undo/redo logic. No framework
// code, so it can be tested on its own.
// past    = entries already applied, oldest first
// present = the current value
// future  = entries that were undone, next-to-redo first
export const HISTORY_LIMIT = 50;

export const OPERATIONS = [
  { label: "/2", apply: (v) => v / 2 },
  { label: "-1", apply: (v) => v - 1 },
  { label: "+1", apply: (v) => v + 1 },
  { label: "x2", apply: (v) => v * 2 },
];

export const initialHistory = () => ({
  past: [],
  present: 0,
  future: [],
});

// A new action records { op, from, to }
// and CLEARS the future: you cannot redo
// something that belongs to a timeline you have just left.
export function perform(h, op) {
  const entry = {
    op: op.label,
    from: h.present,
    to: op.apply(h.present),
  };
  const past = [...h.past, entry].slice(-HISTORY_LIMIT);
  return { past, present: entry.to, future: [] };
}

export function undo(h) {
  if (h.past.length === 0) return h;
  const entry = h.past[h.past.length - 1];
  return {
    past: h.past.slice(0, -1),
    present: entry.from,
    future: [entry, ...h.future],
  };
}

export function redo(h) {
  if (h.future.length === 0) return h;
  const [entry, ...rest] = h.future;
  return { past: [...h.past, entry], present: entry.to, future: rest };
}

export const canUndo = (h) => h.past.length > 0;
export const canRedo = (h) => h.future.length > 0;

// Ctrl+Z / Cmd+Z undoes; Ctrl+Shift+Z, Cmd+Shift+Z or Ctrl+Y redoes.
export function shortcutFor(e) {
  if (!(e.ctrlKey || e.metaKey)) return null;
  const key = e.key.toLowerCase();
  if (key === "z") return e.shiftKey ? "redo" : "undo";
  if (key === "y") return "redo";
  return null;
}
\`\`\`

Walk through each function:

- **<code>perform</code>** records an entry with the value before and after, pushes it onto <code>past</code>, sets the new <code>present</code>, and returns <code>future: []</code>. 📌 **Interview term: Redo invalidation** — a new action after an undo throws the redo stack away.
- **<code>undo</code>** takes the newest past entry, restores its <code>from</code> value, and puts the entry at the *front* of <code>future</code>.
- **<code>redo</code>** takes the first future entry, applies its <code>to</code> value, and pushes it back onto <code>past</code>.

📌 **Interview term: Storing before and after values** — each entry remembers <code>from</code> and <code>to</code>, so undo restores the exact old number. The alternative, running the inverse operation (undo <code>x2</code> by halving), breaks as soon as an operation is not perfectly reversible, for example a rounding <code>/2</code>. This is a lightweight cousin of the memento pattern.

<code>slice(-HISTORY_LIMIT)</code> keeps the newest 50 entries, so memory stays bounded. When nothing can be undone or redone, the functions return the *same* object, and React skips the re-render.

📌 **Interview term: Immutable update** — every function builds new arrays with spread and <code>slice</code>, never <code>push</code> or <code>splice</code>. React compares state by reference, and the old history objects stay valid. See [why state updates must be immutable](/interview-question/why-must-react-state-updates-be-immutable).

### Step 2: one state object in the component

\`\`\`jsx
export default function App() {
  // One state object holds all three stacks,
  // so they can never get out of step.
  const [history, setHistory] = useState(initialHistory);

  // Keyboard shortcuts. The listener only
  // calls the setter with a pure function,
  // so it never needs the current history and can be registered once.
  useEffect(() => {
    function onKeyDown(e) {
      const action = shortcutFor(e);
      if (!action) return;
      e.preventDefault();
      setHistory(action === "undo" ? undo : redo);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <main className="undo-app">
      <h1>Undoable Counter</h1>
      <div className="toolbar">
        <button type="button" data-testid="undo" disabled={!canUndo(history)} onClick={() => setHistory(undo)}>Undo</button>
        <button type="button" data-testid="redo" disabled={!canRedo(history)} onClick={() => setHistory(redo)}>Redo</button>
        <button type="button" data-testid="reset" onClick={() => setHistory(initialHistory())}>Reset</button>
      </div>
      <output className="value" data-testid="value" aria-live="polite">{history.present}</output>
      <div className="ops">
        {OPERATIONS.map((op) => (
          <button
            key={op.label}
            type="button"
            data-testid={"op-" + op.label}
            onClick={() => setHistory((h) => perform(h, op))}
          >
            {op.label}
          </button>
        ))}
      </div>
      <HistoryTable past={history.past} />
    </main>
  );
\`\`\`

- All three stacks live in **one** <code>useState</code>. With three separate states, a single undo would need three setter calls, and any early return or exception between them leaves the stacks out of step. One object and one pure function per action make that impossible. A <code>useReducer</code> with <code>perform</code>/<code>undo</code>/<code>redo</code> actions is an equally good shape; see [useState vs useReducer](/interview-question/what-is-the-difference-between-usestate-and-usereducer).
- <code>setHistory(undo)</code> passes the function itself as an updater, so React calls <code>undo(latestHistory)</code>. That is why fast repeated clicks or shortcuts never read a stale value.
- Undo and Redo use the native <code>disabled</code> attribute when their stacks are empty. It is a trade-off: a button you just used to undo the last step loses focus when it becomes disabled. For a toolbar that is acceptable; the shortcuts keep working.
- The value is an <code>&lt;output&gt;</code> element with <code>aria-live="polite"</code>, so screen readers announce the new number after each operation.

### Step 3: keyboard shortcuts

📌 **Interview term: Global keyboard listener with cleanup** — the effect adds one <code>keydown</code> listener to <code>window</code> on mount and removes it in the cleanup. Because the handler only passes pure functions to the setter, it never needs the current history and the effect has an empty dependency list. See [the cleanup function in useEffect](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect).

<code>shortcutFor</code> encodes the platform conventions: Ctrl or Cmd plus Z undoes, adding Shift redoes, and Ctrl+Y also redoes (common on Windows). <code>e.preventDefault()</code> stops the browser's own undo for the page. In a real app, also skip the shortcut when focus is in a text field, so the field's native undo still works; this widget has no text fields.

### Step 4: the history table

\`\`\`jsx
export default function HistoryTable({ past }) {
  if (past.length === 0)
    return (
      <p className="empty" data-testid="history-empty">
        No history yet
      </p>
    );
  // Newest first, so the row that Undo would revert is at the top.
  const rows = past.map((entry, i) => ({ ...entry, id: i })).reverse();
  return (
    <table className="history" data-testid="history">
      <thead>
        <tr>
          <th scope="col">Op</th>
          <th scope="col">Old</th>
          <th scope="col">New</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.op}</td>
            <td>{r.from}</td>
            <td>{r.to}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
\`\`\`

Newest first, so the row at the top is the one Undo would revert. The table uses <code>&lt;th scope="col"&gt;</code> headers so screen readers announce "Old, 2" when moving through cells. The row key is the entry's position in <code>past</code>, which is stable for a given entry while it stays in the past.

## 5. Verified

**The logic alone.** A node script stressed the edges:

\`\`\`text
undo on empty  : true (same object back, nothing to undo)
55 x +1        : present 55, past 50, future 0 | oldest kept entry: {"op":"+1","from":5,"to":6}
undo all       : present 5, past 0, future 50 | undos possible: 50
redo twice     : present 7, past 2, future 48
new action     : present 14, past 3, future 0 | redo now changes nothing: true
\`\`\`

The cap kept 50 of 55 entries (the oldest kept goes from 5 to 6), undoing all of them returned to 5 rather than 0 (the first five steps were dropped by the cap), and a new action after two redos left the future empty.

**The component.** Rendered in <code>&lt;StrictMode&gt;</code> in jsdom; the driver clicked buttons and dispatched keydown events on <code>document.body</code>, which bubble to <code>window</code>. History rows are printed newest first as "op old new":

\`\`\`text
RENDERED: Undoable CounterUndoRedoReset0/2-1+1x2No history yet
start      : 0 | undo off, redo off | history: (empty)
+1 +1 x2   : 4 | undo on, redo off | history: x2 2 4 | +1 1 2 | +1 0 1
undo       : 2 | undo on, redo on | history: +1 1 2 | +1 0 1
undo       : 1 | undo on, redo on | history: +1 0 1
redo       : 2 | undo on, redo on | history: +1 1 2 | +1 0 1
-1 (new)   : 1 | undo on, redo off | history: -1 2 1 | +1 1 2 | +1 0 1 <- the redo future is gone
/2         : 0.5 | undo on, redo off | history: /2 1 0.5 | -1 2 1 | +1 1 2 | +1 0 1
Ctrl+Z     : 1 | undo on, redo on | history: -1 2 1 | +1 1 2 | +1 0 1
Ctrl+Shift+Z: 0.5 | undo on, redo off | history: /2 1 0.5 | -1 2 1 | +1 1 2 | +1 0 1
Cmd+Z, Ctrl+Y: 0.5 | undo on, redo off | history: /2 1 0.5 | -1 2 1 | +1 1 2 | +1 0 1
plain z    : 0.5 (ignored)
reset      : 0 | undo off, redo off | history: (empty) | empty text = No history yet
\`\`\`

Read the "-1 (new)" line: after undo, undo, redo the future held the <code>x2</code> entry, and the new <code>-1</code> made Redo unavailable. The <code>Cmd+Z, Ctrl+Y</code> line is an undo followed by a redo, so the value returns to 0.5. A plain <code>z</code> without a modifier did nothing.

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Undo with empty past / redo with empty future | Functions return the same object; buttons are disabled |
| New action after undo | Future cleared |
| Long sessions | History capped at 50 entries |
| <code>/2</code> on odd numbers | Exact fractions; undo restores the stored old value |
| Shortcuts | Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y; listener removed on unmount |
| Screen readers | <code>&lt;output aria-live&gt;</code> for the value; table with column headers |
| Keyboard | All controls are native buttons |

## 7. Common Pitfalls

- **Three separate states for past, present and future.** They drift apart when one update is missed.
- **Forgetting to clear the future on a new action.** Redo then jumps into a timeline that no longer exists.
- **Undoing with inverse math.** Breaks for non-reversible operations; store the old value.
- **<code>push</code> or <code>splice</code> on the arrays.** Mutation may skip renders and corrupt snapshots.
- **Adding the window listener without cleanup.** Every remount adds another listener and one key press undoes twice.
- **Hijacking Ctrl+Z inside text inputs.** Users lose native text undo; check <code>e.target</code> in a real app.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"I keep one object with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">past</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">present</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">future</code>. Past holds applied operations with their old and new values; future holds undone ones."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Transitions:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">perform</code> pushes to past and clears the future, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undo</code> moves the newest past entry to the front of the future and restores its old value, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">redo</code> does the reverse. All pure, all immutable."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why old values:</strong> <span style="color:#f0e2c8;">"Each entry stores <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">from</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">to</code>, so undo is exact even for operations without a clean inverse, like a rounding divide."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Component:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code> and updater functions: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setHistory(undo)</code>. Undo and Redo are disabled on empty stacks; the value is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-live</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Extras and verify:</strong> <span style="color:#f0e2c8;">"A window <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keydown</code> listener with cleanup for Ctrl or Cmd plus Z, and a cap of 50 entries. I test undo, redo, redo invalidation after a new action, and the cap."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make this generic for any state, not just a number?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wrap any reducer: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useUndoable(reducer, initial)</code> hook that stores <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ past, present, future }</code> of whole snapshots and handles <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNDO</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">REDO</code> and any other action by pushing the old present. With immutable state, snapshots share structure, so they are cheap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Snapshots or commands: which would you store in a big app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Snapshots are simplest and exact when state is immutable and small. For large documents, store commands or patches (with enough data to invert them), which is what editors do. The trade-off is memory against complexity.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you group several changes into one undo step?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Batch them: start a transaction, apply changes to the present without pushing, and push a single entry when the transaction ends, or merge consecutive entries that happen within a short time, like typing in an editor.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you persist history across reloads?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Serialise the history object to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code> on change and read it back in the lazy initial state, wrapped in try/catch. With the cap, the stored size stays small.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">perform</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undo</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">redo</code> with sequences, including redo invalidation and the cap. Component tests click buttons and fire keyboard events, asserting the value, the table rows and the disabled states.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Undo / redo stacks** | Lists of what can be undone and what can be redone |
| **Past / present / future** | The three-part model of history around the current value |
| **Redo invalidation** | A new action after an undo clears the redo stack |
| **Storing before and after values** | Each entry remembers the old and new value, so undo is exact |
| **Immutable update** | Build new arrays and objects instead of editing old ones |
| **Global keyboard listener with cleanup** | A window listener added on mount and removed on unmount |

---

**Conclusion:** An undoable counter is the past / present / future pattern in its smallest form. Keep all three in one state object, write <code>perform</code>, <code>undo</code> and <code>redo</code> as pure functions that store old and new values and clear the future on every new action, and the component becomes a thin layer of buttons, a table and a keyboard listener that cleans up after itself. The same three functions scale to any editor once the "value" becomes a document.`,
        files: {
          "/App.js": `import { useEffect, useState } from "react";
import HistoryTable from "./src/HistoryTable";
import {
  OPERATIONS,
  canRedo,
  canUndo,
  initialHistory,
  perform,
  redo,
  shortcutFor,
  undo,
} from "./src/history";

export default function App() {
  // One state object holds all three stacks, so they can never get out of step.
  const [history, setHistory] = useState(initialHistory);

  // Keyboard shortcuts. The listener only
  // calls the setter with a pure function,
  // so it never needs the current history and can be registered once.
  useEffect(() => {
    function onKeyDown(e) {
      const action = shortcutFor(e);
      if (!action) return;
      e.preventDefault();
      setHistory(action === "undo" ? undo : redo);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <main className="undo-app">
      <h1>Undoable Counter</h1>
      <div className="toolbar">
        <button
          type="button"
          data-testid="undo"
          disabled={!canUndo(history)}
          onClick={() => setHistory(undo)}
        >
          Undo
        </button>
        <button
          type="button"
          data-testid="redo"
          disabled={!canRedo(history)}
          onClick={() => setHistory(redo)}
        >
          Redo
        </button>
        <button
          type="button"
          data-testid="reset"
          onClick={() => setHistory(initialHistory())}
        >
          Reset
        </button>
      </div>
      <output className="value" data-testid="value" aria-live="polite">
        {history.present}
      </output>
      <div className="ops">
        {OPERATIONS.map((op) => (
          <button
            key={op.label}
            type="button"
            data-testid={"op-" + op.label}
            onClick={() => setHistory((h) => perform(h, op))}
          >
            {op.label}
          </button>
        ))}
      </div>
      <HistoryTable past={history.past} />
    </main>
  );
}
`,
          "/src/HistoryTable.js": `export default function HistoryTable({ past }) {
  if (past.length === 0)
    return (
      <p className="empty" data-testid="history-empty">
        No history yet
      </p>
    );
  // Newest first, so the row that Undo would revert is at the top.
  const rows = past.map((entry, i) => ({ ...entry, id: i })).reverse();
  return (
    <table className="history" data-testid="history">
      <thead>
        <tr>
          <th scope="col">Op</th>
          <th scope="col">Old</th>
          <th scope="col">New</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.op}</td>
            <td>{r.from}</td>
            <td>{r.to}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
`,
          "/src/history.js": `// Pure undo/redo logic. No framework code, so it can be tested on its own.
// past    = entries already applied, oldest first
// present = the current value
// future  = entries that were undone, next-to-redo first
export const HISTORY_LIMIT = 50;

export const OPERATIONS = [
  { label: "/2", apply: (v) => v / 2 },
  { label: "-1", apply: (v) => v - 1 },
  { label: "+1", apply: (v) => v + 1 },
  { label: "x2", apply: (v) => v * 2 },
];

export const initialHistory = () => ({ past: [], present: 0, future: [] });

// A new action records { op, from, to } and CLEARS the future: you cannot redo
// something that belongs to a timeline you have just left.
export function perform(h, op) {
  const entry = { op: op.label, from: h.present, to: op.apply(h.present) };
  const past = [...h.past, entry].slice(-HISTORY_LIMIT);
  return { past, present: entry.to, future: [] };
}

export function undo(h) {
  if (h.past.length === 0) return h;
  const entry = h.past[h.past.length - 1];
  return {
    past: h.past.slice(0, -1),
    present: entry.from,
    future: [entry, ...h.future],
  };
}

export function redo(h) {
  if (h.future.length === 0) return h;
  const [entry, ...rest] = h.future;
  return { past: [...h.past, entry], present: entry.to, future: rest };
}

export const canUndo = (h) => h.past.length > 0;
export const canRedo = (h) => h.future.length > 0;

// Ctrl+Z / Cmd+Z undoes; Ctrl+Shift+Z, Cmd+Shift+Z or Ctrl+Y redoes.
export function shortcutFor(e) {
  if (!(e.ctrlKey || e.metaKey)) return null;
  const key = e.key.toLowerCase();
  if (key === "z") return e.shiftKey ? "redo" : "undo";
  if (key === "y") return "redo";
  return null;
}
`,
          "/styles.css": `body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}
.undo-app {
  max-width: 360px;
  margin: 0 auto;
  padding: 24px 16px;
  text-align: center;
}
.undo-app h1 {
  font-size: 1.4rem;
  margin: 0 0 12px;
}
.toolbar,
.ops {
  display: flex;
  gap: 8px;
  justify-content: center;
}
button {
  padding: 8px 14px;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid #475569;
  background: #334155;
  color: #f8fafc;
  cursor: pointer;
  min-width: 56px;
}
button:disabled {
  opacity: 0.45;
  cursor: default;
}
button:focus-visible {
  outline: 3px solid #38bdf8;
  outline-offset: 2px;
}
.value {
  display: block;
  font-size: 3rem;
  font-weight: 700;
  margin: 16px 0;
  color: #fbbf24;
}
.history {
  width: 100%;
  margin-top: 20px;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
.history th,
.history td {
  padding: 6px 8px;
  border-bottom: 1px solid #334155;
}
.history th {
  color: #94a3b8;
  font-weight: 600;
}
.empty {
  margin-top: 20px;
  color: #64748b;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue developers preparing for a machine coding round. Comfortable with <code>ref</code>, <code>computed</code> and components; the undo/redo model is explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> for the vocabulary. Excerpts come from the runnable solution; the Verified section is real output from Vue 3.5.44.

## 1. A Story First

Imagine a hallway of rooms. Behind you are the rooms you have walked through (the **past**), you stand in one room (the **present**), and if you stepped back earlier, the rooms you backed out of are ahead of you (the **future**). Undo steps back, redo steps forward. If you are a few rooms back and open a *different* door, the old rooms ahead are gone: a new action clears redo.

## 2. The Plan

<code>src/history.js</code> holds the whole model with no Vue in it: <code>OPERATIONS</code>, <code>initialHistory()</code>, <code>perform(h, op)</code>, <code>undo(h)</code>, <code>redo(h)</code>, <code>canUndo</code>, <code>canRedo</code>, <code>shortcutFor(e)</code> and a <code>HISTORY_LIMIT</code> of 50.

| Value | Vue tool |
| :--- | :--- |
| <code>{ past, present, future }</code> | One <code>shallowRef</code> |
| Can undo / can redo | <code>computed</code> |
| Table rows (newest first) | <code>computed</code> in <code>HistoryTable.vue</code> |
| Shortcuts | <code>window</code> listener added in <code>onMounted</code>, removed in <code>onBeforeUnmount</code> |

📌 **Interview term: Past / present / future** — the three-part history model. <code>past</code> holds applied entries <code>{ op, from, to }</code>, oldest first; <code>future</code> holds undone entries, next-to-redo first.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="A new action pushes onto the past, sets the present and empties the future">
  <defs>
    <marker id="ucv-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="120" width="180" height="80" rx="12"/>
  <text class="d-text" x="120" y="152" text-anchor="middle">past</text>
  <text class="d-sub" x="120" y="176" text-anchor="middle">+1, +1, -1</text>
  <rect class="d-box-accent" x="250" y="120" width="180" height="80" rx="12"/>
  <text class="d-text d-accent" x="340" y="152" text-anchor="middle">present</text>
  <text class="d-sub" x="340" y="176" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="470" y="120" width="180" height="80" rx="12"/>
  <text class="d-text" x="560" y="152" text-anchor="middle">future</text>
  <text class="d-sub" x="560" y="176" text-anchor="middle">cleared</text>
  <rect class="d-box-muted" x="250" y="20" width="180" height="56" rx="10"/>
  <text class="d-text" x="340" y="54" text-anchor="middle">new action -1</text>
  <path class="d-edge-accent" d="M 250 48 L 120 48 L 120 114" marker-end="url(#ucv-arrow)"/>
  <path class="d-edge-accent" d="M 340 76 L 340 114" marker-end="url(#ucv-arrow)"/>
  <path class="d-edge-dashed" d="M 430 48 L 560 48 L 560 114" marker-end="url(#ucv-arrow)"/>
</svg>

This is the moment from the Verified run where <code>-1</code> is pressed after undo, undo, redo: the entry joins the past, the present becomes 1, and the waiting <code>x2</code> in the future is thrown away.

## 3. Build It Step by Step

### Step 1: the pure model

\`\`\`js
// A new action records { op, from, to }
// and CLEARS the future: you cannot redo
// something that belongs to a timeline you have just left.
export function perform(h, op) {
  const entry = {
    op: op.label,
    from: h.present,
    to: op.apply(h.present),
  };
  const past = [...h.past, entry].slice(-HISTORY_LIMIT);
  return { past, present: entry.to, future: [] };
}

export function undo(h) {
  if (h.past.length === 0) return h;
  const entry = h.past[h.past.length - 1];
  return {
    past: h.past.slice(0, -1),
    present: entry.from,
    future: [entry, ...h.future],
  };
}

export function redo(h) {
  if (h.future.length === 0) return h;
  const [entry, ...rest] = h.future;
  return { past: [...h.past, entry], present: entry.to, future: rest };
}

export const canUndo = (h) => h.past.length > 0;
export const canRedo = (h) => h.future.length > 0;
\`\`\`

- 📌 **Interview term: Redo invalidation** — <code>perform</code> always returns <code>future: []</code>.
- <code>undo</code> restores the entry's <code>from</code> value and moves the entry to the front of <code>future</code>; <code>redo</code> applies its <code>to</code> value and moves it back. Storing both values makes undo exact for any operation, including ones without a clean inverse.
- <code>slice(-HISTORY_LIMIT)</code> keeps the newest 50 entries.

### Step 2: one shallowRef and a run helper

\`\`\`vue
<script setup>
import { shallowRef, computed, onMounted, onBeforeUnmount } from "vue";
import HistoryTable from "./components/HistoryTable.vue";
import {
  OPERATIONS,
  canRedo,
  canUndo,
  initialHistory,
  perform,
  redo,
  shortcutFor,
  undo,
} from "./history.js";

// One object holds all three stacks. Every
// change replaces it, so shallowRef is enough.
const history = shallowRef(initialHistory());
const undoable = computed(() => canUndo(history.value));
const redoable = computed(() => canRedo(history.value));

const run = (fn) => (history.value = fn(history.value));

function onKeyDown(e) {
  const action = shortcutFor(e);
  if (!action) return;
  e.preventDefault();
  run(action === "undo" ? undo : redo);
}
onMounted(() => window.addEventListener("keydown", onKeyDown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeyDown));
</script>

<template>
  <main class="undo-app">
    <h1>Undoable Counter</h1>
    <div class="toolbar">
      <button
        type="button"
        data-testid="undo"
        :disabled="!undoable"
        @click="run(undo)"
      >Undo</button>
      <button
        type="button"
        data-testid="redo"
        :disabled="!redoable"
        @click="run(redo)"
      >Redo</button>
      <button
        type="button"
        data-testid="reset"
        @click="history = initialHistory()"
      >Reset</button>
    </div>
    <output
      class="value"
      data-testid="value"
      aria-live="polite"
    >{{ history.present }}</output>
    <div class="ops">
      <button
        v-for="op in OPERATIONS"
        :key="op.label"
        type="button"
        :data-testid="'op-' + op.label"
        @click="run((h) => perform(h, op))"
      >
        {{ op.label }}
      </button>
    </div>
    <HistoryTable :past="history.past" />
  </main>
</template>
\`\`\`

- 📌 **Interview term: shallowRef** — tracks only replacement of <code>.value</code>. The history object is always replaced by the pure functions, so a deep reactive proxy would be wasted work. See [shallowRef and shallowReactive](/interview-question/what-are-shallowref-and-shallowreactive).
- <code>run(fn)</code> applies any transition: <code>run(undo)</code>, <code>run(redo)</code>, <code>run((h) => perform(h, op))</code>. One assignment per action means the three stacks can never be out of step.
- <code>undoable</code> and <code>redoable</code> are [computed](/interview-question/what-is-the-difference-between-computed-and-watch) values bound to <code>:disabled</code>.
- 📌 **Interview term: Global listener cleanup** — the <code>keydown</code> listener on <code>window</code> is added in <code>onMounted</code> and removed in <code>onBeforeUnmount</code>, using the same function reference, so a remount never stacks a second listener. See [Vue lifecycle hooks](/interview-question/what-are-vue-lifecycle-hooks).
- <code>&lt;output aria-live="polite"&gt;</code> announces the new value.

### Step 3: the table

<code>HistoryTable.vue</code> has a <code>computed</code> that reverses <code>past</code> (newest first, the row Undo would revert at the top), renders <code>&lt;th scope="col"&gt;</code> headers, and shows "No history yet" with <code>v-if</code>/<code>v-else</code> when the past is empty.

## 4. Verified

The model alone, with node:

\`\`\`text
undo on empty  : true (same object back, nothing to undo)
55 x +1        : present 55, past 50, future 0 | oldest kept entry: {"op":"+1","from":5,"to":6}
undo all       : present 5, past 0, future 50 | undos possible: 50
redo twice     : present 7, past 2, future 48
new action     : present 14, past 3, future 0 | redo now changes nothing: true
\`\`\`

The app compiled with <code>@vue/compiler-sfc</code>, mounted in jsdom, and driven by button clicks plus keydown events on <code>document.body</code> (they bubble to <code>window</code>). History rows are "op old new", newest first:

\`\`\`text
RENDERED: Undoable CounterUndoRedoReset0/2-1+1x2No history yet
start      : 0 | undo off, redo off | history: (empty)
+1 +1 x2   : 4 | undo on, redo off | history: x2 2 4 | +1 1 2 | +1 0 1
undo       : 2 | undo on, redo on | history: +1 1 2 | +1 0 1
undo       : 1 | undo on, redo on | history: +1 0 1
redo       : 2 | undo on, redo on | history: +1 1 2 | +1 0 1
-1 (new)   : 1 | undo on, redo off | history: -1 2 1 | +1 1 2 | +1 0 1 <- the redo future is gone
/2         : 0.5 | undo on, redo off | history: /2 1 0.5 | -1 2 1 | +1 1 2 | +1 0 1
Ctrl+Z     : 1 | undo on, redo on | history: -1 2 1 | +1 1 2 | +1 0 1
Ctrl+Shift+Z: 0.5 | undo on, redo off | history: /2 1 0.5 | -1 2 1 | +1 1 2 | +1 0 1
Cmd+Z, Ctrl+Y: 0.5 | undo on, redo off | history: /2 1 0.5 | -1 2 1 | +1 1 2 | +1 0 1
plain z    : 0.5 (ignored)
reset      : 0 | undo off, redo off | history: (empty) | empty text = No history yet
\`\`\`

These lines match the React and Angular builds. After undo, undo, redo, the new <code>-1</code> turned Redo off: the future was cleared.

## 5. Common Pitfalls

- **Separate refs for past, present and future.** Three assignments per action that can drift apart.
- **Mutating with <code>history.value.past.push(...)</code>.** With a <code>shallowRef</code> nothing re-renders; with a deep ref it works but breaks the pure model.
- **Not clearing the future on a new action.**
- **Adding the window listener in <code>setup</code> without removing it.** Each remount adds another listener.
- **Undoing with inverse math.** Store the old value instead.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"One object: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">past</code> of applied entries with old and new values, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">present</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">future</code> of undone entries."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Transitions:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">perform</code> pushes and clears the future, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undo</code> moves the newest past entry to the future front, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">redo</code> moves it back. All pure."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Vue state:</strong> <span style="color:#f0e2c8;">"A single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> replaced by a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">run(fn)</code> helper; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> flags drive the disabled buttons."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Shortcuts:</strong> <span style="color:#f0e2c8;">"A window <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keydown</code> listener added in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> and removed in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBeforeUnmount</code>, mapping Ctrl or Cmd plus Z, Shift+Z and Ctrl+Y."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verify:</strong> <span style="color:#f0e2c8;">"I test undo, redo, redo invalidation after a new action, the 50-entry cap, and the shortcuts."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it reusable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useUndoable(initial)</code> composable returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">present</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">canUndo</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">canRedo</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">perform</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undo</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">redo</code>, built on the same pure functions. For whole-object state, store snapshots instead of entries.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Vue <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watch</code> with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">deep</code> a good way to record history?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It can snapshot every change automatically, but it records too much (every keystroke) and makes grouping hard. Explicit actions through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">perform</code> are clearer and testable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should Reset be undoable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a product decision. If yes, treat it as an operation whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">to</code> is 0, so it lands in the past and can be undone like any other entry.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test the pure functions; then mount with Vue Test Utils, click buttons, trigger keydown on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code>, and assert the value, the rows and the disabled states.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Past / present / future** | The three-part history model |
| **Redo invalidation** | A new action clears the redo stack |
| **shallowRef** | A ref that reacts only to replacement of its value |
| **Global listener cleanup** | Removing a window listener when the component unmounts |

---

**Conclusion:** The Vue undoable counter is one <code>shallowRef</code> holding past, present and future, a <code>run</code> helper that applies pure <code>perform</code>/<code>undo</code>/<code>redo</code> functions, computed flags for the buttons, and a window listener that is removed on unmount. Clear the future on every new action and store old values, and undo stays exact and predictable.`,
        files: {
          "/src/App.vue": `<script setup>
import { shallowRef, computed, onMounted, onBeforeUnmount } from "vue";
import HistoryTable from "./components/HistoryTable.vue";
import {
  OPERATIONS,
  canRedo,
  canUndo,
  initialHistory,
  perform,
  redo,
  shortcutFor,
  undo,
} from "./history.js";

// One object holds all three stacks. Every
// change replaces it, so shallowRef is enough.
const history = shallowRef(initialHistory());
const undoable = computed(() => canUndo(history.value));
const redoable = computed(() => canRedo(history.value));

const run = (fn) => (history.value = fn(history.value));

function onKeyDown(e) {
  const action = shortcutFor(e);
  if (!action) return;
  e.preventDefault();
  run(action === "undo" ? undo : redo);
}
onMounted(() => window.addEventListener("keydown", onKeyDown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeyDown));
</script>

<template>
  <main class="undo-app">
    <h1>Undoable Counter</h1>
    <div class="toolbar">
      <button
        type="button"
        data-testid="undo"
        :disabled="!undoable"
        @click="run(undo)"
      >Undo</button>
      <button
        type="button"
        data-testid="redo"
        :disabled="!redoable"
        @click="run(redo)"
      >Redo</button>
      <button
        type="button"
        data-testid="reset"
        @click="history = initialHistory()"
      >Reset</button>
    </div>
    <output
      class="value"
      data-testid="value"
      aria-live="polite"
    >{{ history.present }}</output>
    <div class="ops">
      <button
        v-for="op in OPERATIONS"
        :key="op.label"
        type="button"
        :data-testid="'op-' + op.label"
        @click="run((h) => perform(h, op))"
      >
        {{ op.label }}
      </button>
    </div>
    <HistoryTable :past="history.past" />
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}
.undo-app {
  max-width: 360px;
  margin: 0 auto;
  padding: 24px 16px;
  text-align: center;
}
.undo-app h1 {
  font-size: 1.4rem;
  margin: 0 0 12px;
}
.toolbar,
.ops {
  display: flex;
  gap: 8px;
  justify-content: center;
}
.undo-app button {
  padding: 8px 14px;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid #475569;
  background: #334155;
  color: #f8fafc;
  cursor: pointer;
  min-width: 56px;
}
.undo-app button:disabled {
  opacity: 0.45;
  cursor: default;
}
.undo-app button:focus-visible {
  outline: 3px solid #38bdf8;
  outline-offset: 2px;
}
.value {
  display: block;
  font-size: 3rem;
  font-weight: 700;
  margin: 16px 0;
  color: #fbbf24;
}
</style>
`,
          "/src/components/HistoryTable.vue": `<script setup>
import { computed } from "vue";

const props = defineProps({ past: { type: Array, required: true } });
// Newest first, so the row that Undo would revert is at the top.
const rows = computed(() =>
  props.past.map((entry, i) => ({ ...entry, id: i })).reverse(),
);
</script>

<template>
  <p
    v-if="past.length === 0"
    class="empty"
    data-testid="history-empty"
  >No history yet</p>
  <table v-else class="history" data-testid="history">
    <thead>
      <tr><th scope="col">Op</th><th scope="col">Old</th><th scope="col">New</th></tr>
    </thead>
    <tbody>
      <tr v-for="r in rows" :key="r.id">
        <td>{{ r.op }}</td><td>{{ r.from }}</td><td>{{ r.to }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.history {
  width: 100%;
  margin-top: 20px;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
.history th,
.history td {
  padding: 6px 8px;
  border-bottom: 1px solid #334155;
}
.history th {
  color: #94a3b8;
  font-weight: 600;
}
.empty {
  margin-top: 20px;
  color: #64748b;
}
</style>
`,
          "/src/history.js": `// Pure undo/redo logic. No framework code, so it can be tested on its own.
// past    = entries already applied, oldest first
// present = the current value
// future  = entries that were undone, next-to-redo first
export const HISTORY_LIMIT = 50;

export const OPERATIONS = [
  { label: "/2", apply: (v) => v / 2 },
  { label: "-1", apply: (v) => v - 1 },
  { label: "+1", apply: (v) => v + 1 },
  { label: "x2", apply: (v) => v * 2 },
];

export const initialHistory = () => ({ past: [], present: 0, future: [] });

// A new action records { op, from, to } and CLEARS the future: you cannot redo
// something that belongs to a timeline you have just left.
export function perform(h, op) {
  const entry = { op: op.label, from: h.present, to: op.apply(h.present) };
  const past = [...h.past, entry].slice(-HISTORY_LIMIT);
  return { past, present: entry.to, future: [] };
}

export function undo(h) {
  if (h.past.length === 0) return h;
  const entry = h.past[h.past.length - 1];
  return {
    past: h.past.slice(0, -1),
    present: entry.from,
    future: [entry, ...h.future],
  };
}

export function redo(h) {
  if (h.future.length === 0) return h;
  const [entry, ...rest] = h.future;
  return { past: [...h.past, entry], present: entry.to, future: rest };
}

export const canUndo = (h) => h.past.length > 0;
export const canRedo = (h) => h.future.length > 0;

// Ctrl+Z / Cmd+Z undoes; Ctrl+Shift+Z, Cmd+Shift+Z or Ctrl+Y redoes.
export function shortcutFor(e) {
  if (!(e.ctrlKey || e.metaKey)) return null;
  const key = e.key.toLowerCase();
  if (key === "z") return e.shiftKey ? "redo" : "undo";
  if (key === "y") return "redo";
  return null;
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers preparing for a machine coding round. Comfortable with signals and components; the undo/redo model is explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> for the vocabulary. Excerpts come from the runnable solution; Verified output is from Angular 22.2.3, AOT with strict templates and runtime JIT.

## 1. A Story First

In a hallway of rooms, the rooms behind you are the **past**, the room you stand in is the **present**, and rooms you backed out of are the **future**. Undo steps back, redo steps forward, and opening a different door from a room you backed into erases the old path ahead. A new action clears redo.

## 2. The Plan

<code>history.ts</code> holds the typed model (<code>Operation</code>, <code>Entry</code>, <code>History</code>, <code>Action</code>) and pure functions: <code>perform</code>, <code>undo</code>, <code>redo</code>, <code>canUndo</code>, <code>canRedo</code>, <code>shortcutFor</code>, with a 50-entry cap.

| Value | Angular tool |
| :--- | :--- |
| <code>{ past, present, future }</code> | One <code>signal&lt;History&gt;</code> |
| Can undo / can redo | <code>computed()</code> |
| Shortcuts | <code>@HostListener("window:keydown")</code> |
| Table rows | A getter in <code>HistoryTableComponent</code> |

📌 **Interview term: Past / present / future** — applied entries <code>{ op, from, to }</code> oldest first, the current value, and undone entries next-to-redo first.

## 3. Build It Step by Step

### Step 1: the pure model

\`\`\`ts
// A new action records { op, from, to }
// and CLEARS the future: you cannot redo
// something that belongs to a timeline you have just left.
export function perform(h: History, op: Operation): History {
  const entry: Entry = {
    op: op.label,
    from: h.present,
    to: op.apply(h.present),
  };
  const past = [...h.past, entry].slice(-HISTORY_LIMIT);
  return { past, present: entry.to, future: [] };
}

export function undo(h: History): History {
  if (h.past.length === 0) return h;
  const entry = h.past[h.past.length - 1];
  return {
    past: h.past.slice(0, -1),
    present: entry.from,
    future: [entry, ...h.future],
  };
}

export function redo(h: History): History {
  if (h.future.length === 0) return h;
  const [entry, ...rest] = h.future;
  return { past: [...h.past, entry], present: entry.to, future: rest };
}

export const canUndo = (h: History): boolean => h.past.length > 0;
export const canRedo = (h: History): boolean => h.future.length > 0;
\`\`\`

📌 **Interview term: Redo invalidation** — <code>perform</code> returns <code>future: []</code>, so a new action after undo throws away the undone steps. <code>undo</code> restores <code>from</code> and moves the entry to the front of the future; <code>redo</code> applies <code>to</code> and moves it back. Storing both values makes undo exact without inverse math.

### Step 2: the component

\`\`\`ts
template: \`
    <main class="undo-app">
      <h1>Undoable Counter</h1>
      <div class="toolbar">
        <button type="button" data-testid="undo" [disabled]="!undoable()" (click)="run(undo)">Undo</button>
        <button type="button" data-testid="redo" [disabled]="!redoable()" (click)="run(redo)">Redo</button>
        <button type="button" data-testid="reset" (click)="history.set(initialHistory())">Reset</button>
      </div>
      <output class="value" data-testid="value" aria-live="polite">{{ history().present }}</output>
      <div class="ops">
        @for (op of operations; track op.label) {
          <button type="button" [attr.data-testid]="'op-' + op.label" (click)="apply(op)">{{ op.label }}</button>
        }
      </div>
      <app-history-table [past]="history().past" />
    </main>
  \`,
\`\`\`

\`\`\`ts
export class AppComponent {
  readonly operations = OPERATIONS;
  readonly undo = undo;
  readonly redo = redo;
  readonly initialHistory = initialHistory;

  // One signal holds all three stacks,
  // so they can never get out of step.
  readonly history = signal<History>(initialHistory());
  readonly undoable = computed(() => canUndo(this.history()));
  readonly redoable = computed(() => canRedo(this.history()));

  run(fn: (h: History) => History): void {
    this.history.update(fn);
  }

  apply(op: Operation): void {
    this.history.update((h) => perform(h, op));
  }

  // Keyboard shortcuts on the whole page;
  // Angular removes the listener on destroy.
  @HostListener("window:keydown", ["$event"])
  onKeyDown(e: KeyboardEvent): void {
    const action = shortcutFor(e);
    if (!action) return;
    e.preventDefault();
    this.run(action === "undo" ? undo : redo);
  }
}
\`\`\`

- 📌 **Interview term: Signal update** — <code>this.history.update(fn)</code> stores <code>fn(current)</code>. When undo or redo has nothing to do, the pure function returns the same object and the signal does not notify.
- <code>readonly undo = undo</code> exposes the imported functions to the template so <code>(click)="run(undo)"</code> works; templates cannot see module-level names.
- 📌 **Interview term: @HostListener** — <code>@HostListener("window:keydown", ["$event"])</code> registers a listener on <code>window</code> for the component's lifetime and removes it when the component is destroyed, so no manual cleanup is needed. See [@HostListener and @HostBinding](/interview-question/what-do-hostlistener-and-hostbinding-do).
- The value is an <code>&lt;output aria-live="polite"&gt;</code>, announced after each change.

### Step 3: the table

\`\`\`ts
export class HistoryTableComponent {
  @Input() past: Entry[] = [];

  // Newest first, so the row that Undo would revert is at the top.
  get rows(): (Entry & { id: number })[] {
    return this.past.map((entry, i) => ({ ...entry, id: i })).reverse();
  }
}
\`\`\`

The template uses <code>@if</code>/<code>@else</code> for the empty message and <code>@for (r of rows; track r.id)</code> for the rows, newest first, with <code>&lt;th scope="col"&gt;</code> headers. A getter is fine here because <code>past</code> is a small array; a <code>computed</code> would need a signal input, which the runtime-compiled playground does not register.

## 4. Verified

The model alone, with node:

\`\`\`text
undo on empty  : true (same object back, nothing to undo)
55 x +1        : present 55, past 50, future 0 | oldest kept entry: {"op":"+1","from":5,"to":6}
undo all       : present 5, past 0, future 50 | undos possible: 50
redo twice     : present 7, past 2, future 48
new action     : present 14, past 3, future 0 | redo now changes nothing: true
\`\`\`

Booted AOT (ngc, <code>strictTemplates</code>) and JIT, then driven with clicks and keydown events on <code>document.body</code> (they bubble to <code>window</code>). Rows are "op old new", newest first. AOT output:

\`\`\`text
RENDERED: Undoable CounterUndoRedoReset0/2-1+1x2No history yet
start      : 0 | undo off, redo off | history: (empty)
+1 +1 x2   : 4 | undo on, redo off | history: x2 2 4 | +1 1 2 | +1 0 1
undo       : 2 | undo on, redo on | history: +1 1 2 | +1 0 1
undo       : 1 | undo on, redo on | history: +1 0 1
redo       : 2 | undo on, redo on | history: +1 1 2 | +1 0 1
-1 (new)   : 1 | undo on, redo off | history: -1 2 1 | +1 1 2 | +1 0 1 <- the redo future is gone
/2         : 0.5 | undo on, redo off | history: /2 1 0.5 | -1 2 1 | +1 1 2 | +1 0 1
Ctrl+Z     : 1 | undo on, redo on | history: -1 2 1 | +1 1 2 | +1 0 1
Ctrl+Shift+Z: 0.5 | undo on, redo off | history: /2 1 0.5 | -1 2 1 | +1 1 2 | +1 0 1
Cmd+Z, Ctrl+Y: 0.5 | undo on, redo off | history: /2 1 0.5 | -1 2 1 | +1 1 2 | +1 0 1
plain z    : 0.5 (ignored)
reset      : 0 | undo off, redo off | history: (empty) | empty text = No history yet
\`\`\`

The JIT run printed identical lines, matching the React and Vue builds. After undo, undo, redo, the new <code>-1</code> disabled Redo.

## 5. Common Pitfalls

- **Separate signals for past, present and future.** One action then needs three writes that can drift.
- **Mutating the arrays inside the signal.** Same reference, no notification.
- **Referencing imported functions directly in the template.** They are undefined there; expose them as fields.
- **Forgetting redo invalidation.**
- **A manual <code>window.addEventListener</code> without removal.** Prefer <code>@HostListener</code> or remove it via <code>DestroyRef</code>.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">History</code> object with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">past</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">present</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">future</code>; entries store the operation and the old and new values."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Transitions:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">perform</code> pushes and clears the future, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undo</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">redo</code> move one entry between the stacks. Pure, immutable, typed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Angular state:</strong> <span style="color:#f0e2c8;">"One signal updated with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">history.update(fn)</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undoable</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">redoable</code> are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> and drive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[disabled]</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Shortcuts:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@HostListener</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window:keydown</code> maps Ctrl or Cmd plus Z, Shift+Z and Ctrl+Y, and Angular removes it on destroy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verify:</strong> <span style="color:#f0e2c8;">"I test undo, redo, redo invalidation, the 50-entry cap and the shortcuts."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you share undo across the app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Move the signal and the transitions into an injectable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HistoryStore</code> and inject it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> wherever undo is needed; the pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">history.ts</code> stays the engine.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you store history for complex state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store snapshots of immutable state, which share structure and are cheap, or patches that can be inverted for large documents. The past, present and future shape stays the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it with TestBed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Click the operation buttons through the fixture, dispatch a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">KeyboardEvent</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code>, wait for stability, and assert the value, the rows and the disabled buttons.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should the shortcut fire inside text inputs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">e.target</code> and skip when it is an input, textarea or contenteditable element, so the native text undo keeps working.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Past / present / future** | The three-part history model |
| **Redo invalidation** | A new action clears the redo stack |
| **Signal update** | <code>update(fn)</code> stores <code>fn(current)</code> |
| **@HostListener** | Declarative listener tied to the component lifetime |

---

**Conclusion:** The Angular undoable counter is one signal holding past, present and future, pure typed transitions that store old values and clear the future on every new action, computed flags for the buttons and a <code>@HostListener</code> for shortcuts. The design is identical in AOT and runtime builds and scales from a counter to any editor state.`,
        files: {
          "/src/app/app.component.ts": `import { Component, HostListener, computed, signal } from "@angular/core";
import { HistoryTableComponent } from "./history-table.component";
import {
  History,
  OPERATIONS,
  Operation,
  canRedo,
  canUndo,
  initialHistory,
  perform,
  redo,
  shortcutFor,
  undo,
} from "./history";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [HistoryTableComponent],
  template: \`
    <main class="undo-app">
      <h1>Undoable Counter</h1>
      <div class="toolbar">
        <button
          type="button"
          data-testid="undo"
          [disabled]="!undoable()"
          (click)="run(undo)"
        >Undo</button>
        <button
          type="button"
          data-testid="redo"
          [disabled]="!redoable()"
          (click)="run(redo)"
        >Redo</button>
        <button
          type="button"
          data-testid="reset"
          (click)="history.set(initialHistory())"
        >Reset</button>
      </div>
      <output
        class="value"
        data-testid="value"
        aria-live="polite"
      >{{ history().present }}</output>
      <div class="ops">
        @for (op of operations; track op.label) {
          <button
            type="button"
            [attr.data-testid]="'op-' + op.label"
            (click)="apply(op)"
          >{{ op.label }}</button>
        }
      </div>
      <app-history-table [past]="history().past" />
    </main>
  \`,
  styles: [
    \`
    :host { display: block; font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    .undo-app { max-width: 360px; margin: 0 auto; padding: 24px 16px; text-align: center; }
    .undo-app h1 { font-size: 1.4rem; margin: 0 0 12px; }
    .toolbar, .ops { display: flex; gap: 8px; justify-content: center; }
    button { padding: 8px 14px; font-size: 1rem; border-radius: 8px; border: 1px solid #475569; background: #334155;
      color: #f8fafc; cursor: pointer; min-width: 56px; }
    button:disabled { opacity: 0.45; cursor: default; }
    button:focus-visible { outline: 3px solid #38bdf8; outline-offset: 2px; }
    .value { display: block; font-size: 3rem; font-weight: 700; margin: 16px 0; color: #fbbf24; }
  \`,
  ],
})
export class AppComponent {
  readonly operations = OPERATIONS;
  readonly undo = undo;
  readonly redo = redo;
  readonly initialHistory = initialHistory;

  // One signal holds all three stacks, so they can never get out of step.
  readonly history = signal<History>(initialHistory());
  readonly undoable = computed(() => canUndo(this.history()));
  readonly redoable = computed(() => canRedo(this.history()));

  run(fn: (h: History) => History): void {
    this.history.update(fn);
  }

  apply(op: Operation): void {
    this.history.update((h) => perform(h, op));
  }

  // Keyboard shortcuts on the whole page;
  // Angular removes the listener on destroy.
  @HostListener("window:keydown", ["$event"])
  onKeyDown(e: KeyboardEvent): void {
    const action = shortcutFor(e);
    if (!action) return;
    e.preventDefault();
    this.run(action === "undo" ? undo : redo);
  }
}
`,
          "/src/app/history-table.component.ts": `import { Component, Input } from "@angular/core";
import { Entry } from "./history";

@Component({
  selector: "app-history-table",
  standalone: true,
  template: \`
    @if (past.length === 0) {
      <p class="empty" data-testid="history-empty">No history yet</p>
    } @else {
      <table class="history" data-testid="history">
        <thead>
          <tr>
            <th scope="col">Op</th>
            <th scope="col">Old</th>
            <th scope="col">New</th>
          </tr>
        </thead>
        <tbody>
          @for (r of rows; track r.id) {
            <tr>
              <td>{{ r.op }}</td>
              <td>{{ r.from }}</td>
              <td>{{ r.to }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  \`,
  styles: [
    \`
      .history {
        width: 100%;
        margin-top: 20px;
        border-collapse: collapse;
        font-variant-numeric: tabular-nums;
      }
      .history th,
      .history td {
        padding: 6px 8px;
        border-bottom: 1px solid #334155;
      }
      .history th {
        color: #94a3b8;
        font-weight: 600;
      }
      .empty {
        margin-top: 20px;
        color: #64748b;
      }
    \`,
  ],
})
export class HistoryTableComponent {
  @Input() past: Entry[] = [];

  // Newest first, so the row that Undo would revert is at the top.
  get rows(): (Entry & { id: number })[] {
    return this.past.map((entry, i) => ({ ...entry, id: i })).reverse();
  }
}
`,
          "/src/app/history.ts": `// Pure undo/redo logic. No framework code, so it can be tested on its own.
// past    = entries already applied, oldest first
// present = the current value
// future  = entries that were undone, next-to-redo first
export interface Operation {
  label: string;
  apply: (v: number) => number;
}
export interface Entry {
  op: string;
  from: number;
  to: number;
}
export interface History {
  past: Entry[];
  present: number;
  future: Entry[];
}
export type Action = "undo" | "redo";

export const HISTORY_LIMIT = 50;

export const OPERATIONS: Operation[] = [
  { label: "/2", apply: (v) => v / 2 },
  { label: "-1", apply: (v) => v - 1 },
  { label: "+1", apply: (v) => v + 1 },
  { label: "x2", apply: (v) => v * 2 },
];

export const initialHistory = (): History => ({
  past: [],
  present: 0,
  future: [],
});

// A new action records { op, from, to } and CLEARS the future: you cannot redo
// something that belongs to a timeline you have just left.
export function perform(h: History, op: Operation): History {
  const entry: Entry = {
    op: op.label,
    from: h.present,
    to: op.apply(h.present),
  };
  const past = [...h.past, entry].slice(-HISTORY_LIMIT);
  return { past, present: entry.to, future: [] };
}

export function undo(h: History): History {
  if (h.past.length === 0) return h;
  const entry = h.past[h.past.length - 1];
  return {
    past: h.past.slice(0, -1),
    present: entry.from,
    future: [entry, ...h.future],
  };
}

export function redo(h: History): History {
  if (h.future.length === 0) return h;
  const [entry, ...rest] = h.future;
  return { past: [...h.past, entry], present: entry.to, future: rest };
}

export const canUndo = (h: History): boolean => h.past.length > 0;
export const canRedo = (h: History): boolean => h.future.length > 0;

// Ctrl+Z / Cmd+Z undoes; Ctrl+Shift+Z, Cmd+Shift+Z or Ctrl+Y redoes.
export function shortcutFor(e: KeyboardEvent): Action | null {
  if (!(e.ctrlKey || e.metaKey)) return null;
  const key = e.key.toLowerCase();
  if (key === "z") return e.shiftKey ? "redo" : "undo";
  if (key === "y") return "redo";
  return null;
}
`,
        },
      },
    },
  },
];

export default augments;
