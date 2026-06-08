/**
 * Seed script: Frontend UI / Design challenges (manual-review).
 * Source: GreatFrontEnd-style "build a component" questions.
 *
 * Run with: npx tsx prisma/seed-frontend-ui.ts
 *
 * These are kept SEPARATE from the JS/TS logic utilities:
 *   - category  = "Frontend UI"   (own bucket, distinct from "Frontend")
 *   - tags      include "ui","react"  → the Type filter classifies them as "UI"
 *   - template  = "react"         → challengeSurface() => "frontend" surface
 *                                   (live preview + file tree, NOT auto-graded)
 *   - judgingMode = "frontend"    → submitted for manual review via /attempt
 *
 * No auto-grading / Piston needed: the candidate builds against a live preview
 * and submits their work for review.
 *
 * Idempotent: upserts Challenge + its single ChallengeStep by slug/position.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Ui = {
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  estimatedMinutes: number;
  description: string;
  /** Candidate-visible React starter (/App.js). */
  app: string;
};

const UIS: Ui[] = [
  {
    slug: "fe-ui-counter",
    title: "Counter",
    difficulty: "easy",
    topics: ["state", "events"],
    estimatedMinutes: 15,
    description:
      "Build a **Counter** component.\n\n**Requirements**\n- Show the current count (starts at `0`).\n- `+` increments, `−` decrements, `Reset` sets it back to `0`.\n- The count must never go below `0`.\n\nBuild it in `App.js`; the preview updates live.",
    app: `import { useState } from "react";

export default function App() {
  // TODO: track the count and wire up the three buttons.
  // The count must never go below 0.
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Counter</h1>
      <p style={{ fontSize: 48, fontWeight: 700, margin: "12px 0" }}>0</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button>−</button>
        <button>Reset</button>
        <button>+</button>
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-digital-clock",
    title: "Digital Clock",
    difficulty: "easy",
    topics: ["effects", "timers"],
    estimatedMinutes: 15,
    description:
      "Build a **Digital Clock** that shows the current time as `HH:MM:SS` and updates every second.\n\n**Requirements**\n- Zero-pad hours, minutes, seconds to two digits.\n- Update once per second; clean up the interval on unmount.",
    app: `import { useState, useEffect } from "react";

export default function App() {
  // TODO: show the current time as HH:MM:SS, updating every second.
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Digital Clock</h1>
      <p style={{ fontSize: 44, fontVariantNumeric: "tabular-nums", letterSpacing: 2 }}>
        00:00:00
      </p>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-progress-bar",
    title: "Progress Bar",
    difficulty: "easy",
    topics: ["state", "styling"],
    estimatedMinutes: 15,
    description:
      "Build a **Progress Bar**.\n\n**Requirements**\n- A bar that fills to a percentage (0–100).\n- Buttons to step the value down/up by 10, clamped to `[0, 100]`.\n- Show the numeric percentage and animate the fill smoothly.",
    app: `import { useState } from "react";

export default function App() {
  // TODO: a bar that fills to \`progress\`% with -10 / +10 controls (clamp 0..100).
  const progress = 0;
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 420, margin: "0 auto" }}>
      <h1>Progress Bar</h1>
      <div style={{ height: 16, background: "#eee", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            width: progress + "%",
            height: "100%",
            background: "#4f46e5",
            transition: "width 200ms ease",
          }}
        />
      </div>
      <p style={{ marginTop: 8 }}>{progress}%</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button>-10</button>
        <button>+10</button>
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-todo-list",
    title: "Todo List",
    difficulty: "medium",
    topics: ["lists", "forms", "state"],
    estimatedMinutes: 25,
    description:
      "Build a **Todo List**.\n\n**Requirements**\n- An input + Add button appends a todo (ignore empty/whitespace-only).\n- Each todo has a Delete button that removes only that item.\n- Submitting clears the input.",
    app: `import { useState } from "react";

export default function App() {
  // TODO: add todos from the input; render the list; delete individual items.
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 420, margin: "0 auto" }}>
      <h1>Todo List</h1>
      <form style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input placeholder="Add a task…" style={{ flex: 1, padding: 8 }} />
        <button type="submit">Add</button>
      </form>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {/* TODO: render one <li> per todo with a Delete button */}
      </ul>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-star-rating",
    title: "Star Rating",
    difficulty: "medium",
    topics: ["events", "hover", "state"],
    estimatedMinutes: 25,
    description:
      "Build an interactive **Star Rating** (5 stars).\n\n**Requirements**\n- Hovering a star previews that rating (it and all stars to its left fill).\n- Clicking a star sets the rating; it persists after the mouse leaves.\n- Show the selected rating as text (e.g. `3 / 5`).",
    app: `import { useState } from "react";

const STARS = [1, 2, 3, 4, 5];

export default function App() {
  // TODO: hover previews, click selects. Filled stars use ★, empty use ☆.
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Star Rating</h1>
      <div style={{ fontSize: 40, color: "#f59e0b", cursor: "pointer" }}>
        {STARS.map((n) => (
          <span key={n}>☆</span>
        ))}
      </div>
      <p>0 / 5</p>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-accordion",
    title: "Accordion",
    difficulty: "medium",
    topics: ["state", "toggle"],
    estimatedMinutes: 25,
    description:
      "Build an **Accordion**.\n\n**Requirements**\n- Each section header toggles its panel open/closed on click.\n- Multiple sections may be open at once (independent toggles).\n- Indicate open/closed state (e.g. a `+`/`−` or chevron).",
    app: `import { useState } from "react";

const ITEMS = [
  { title: "What is Interviewpad?", body: "A browser-based interview prep platform." },
  { title: "Is it free?", body: "There is a free tier plus paid plans." },
  { title: "Which languages?", body: "Seven languages for DSA, plus frontend tracks." },
];

export default function App() {
  // TODO: clicking a header toggles its panel. Sections toggle independently.
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <h1>Accordion</h1>
      {ITEMS.map((it, i) => (
        <div key={i} style={{ border: "1px solid #ddd", borderRadius: 8, marginBottom: 8 }}>
          <button style={{ width: "100%", textAlign: "left", padding: 12, background: "none", border: "none", fontWeight: 600 }}>
            {it.title}
          </button>
          {/* TODO: render <div style={{ padding: 12 }}>{it.body}</div> only when open */}
        </div>
      ))}
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-tabs",
    title: "Tabs",
    difficulty: "medium",
    topics: ["state", "navigation"],
    estimatedMinutes: 25,
    description:
      "Build a **Tabs** component.\n\n**Requirements**\n- Clicking a tab shows its panel and visually marks it active.\n- Exactly one panel is visible at a time; the first tab is active initially.",
    app: `import { useState } from "react";

const TABS = [
  { label: "Overview", content: "The overview panel." },
  { label: "Details", content: "The details panel." },
  { label: "Reviews", content: "The reviews panel." },
];

export default function App() {
  // TODO: clicking a tab activates it and shows its content.
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <h1>Tabs</h1>
      <div style={{ display: "flex", gap: 4, borderBottom: "2px solid #eee" }}>
        {TABS.map((t, i) => (
          <button key={i} style={{ padding: "8px 14px", border: "none", background: "none", fontWeight: 600 }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ padding: 16 }}>{/* TODO: render the active tab's content */}</div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-modal",
    title: "Modal Dialog",
    difficulty: "medium",
    topics: ["state", "portals", "accessibility"],
    estimatedMinutes: 30,
    description:
      "Build a **Modal Dialog**.\n\n**Requirements**\n- A button opens the modal over a dimmed backdrop.\n- Close via the close button, clicking the backdrop, or pressing `Escape`.\n- Clicking inside the dialog must not close it.",
    app: `import { useState, useEffect } from "react";

export default function App() {
  // TODO: open a modal over a backdrop; close via button, backdrop, or Escape.
  const open = false;
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Modal Dialog</h1>
      <button>Open modal</button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "grid", placeItems: "center",
          }}
        >
          <div style={{ background: "#fff", padding: 24, borderRadius: 12, minWidth: 280 }}>
            <h2>Hello 👋</h2>
            <p>This is a modal.</p>
            <button>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-like-button",
    title: "Like Button",
    difficulty: "easy",
    topics: ["state", "events"],
    estimatedMinutes: 15,
    description:
      "Build a **Like Button**.\n\n**Requirements**\n- Clicking toggles between liked / not-liked.\n- Show the like count, and the heart filled (♥) when liked, outline (♡) when not.",
    app: `import { useState } from "react";

export default function App() {
  // TODO: clicking toggles liked state and updates the count.
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Like Button</h1>
      <button style={{ fontSize: 18, padding: "8px 16px" }}>♡ Like · 0</button>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-stopwatch",
    title: "Stopwatch",
    difficulty: "medium",
    topics: ["state", "timers"],
    estimatedMinutes: 25,
    description:
      "Build a **Stopwatch**.\n\n**Requirements**\n- Start, Stop, and Reset controls.\n- Display elapsed time as `mm:ss.cs` (centiseconds), updating while running.\n- Reset returns to zero and stops.",
    app: `import { useState, useRef } from "react";

export default function App() {
  // TODO: Start/Stop/Reset; show elapsed as mm:ss.cs and tick while running.
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Stopwatch</h1>
      <p style={{ fontSize: 44, fontVariantNumeric: "tabular-nums" }}>00:00.00</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button>Start</button>
        <button>Stop</button>
        <button>Reset</button>
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-traffic-light",
    title: "Traffic Light",
    difficulty: "medium",
    topics: ["state", "timers"],
    estimatedMinutes: 25,
    description:
      "Build a **Traffic Light** that cycles **green → yellow → red → green** automatically on a timer, highlighting the active light (others dimmed). Use different durations per light if you like.",
    app: `import { useState, useEffect } from "react";

const ORDER = ["green", "yellow", "red"];

export default function App() {
  // TODO: cycle green -> yellow -> red on a timer; highlight the active light.
  const active = "red";
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Traffic Light</h1>
      <div style={{ display: "inline-flex", flexDirection: "column", gap: 10, background: "#222", padding: 14, borderRadius: 16 }}>
        {ORDER.map((c) => (
          <span key={c} style={{ width: 50, height: 50, borderRadius: "50%", background: active === c ? c : "#444" }} />
        ))}
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-image-carousel",
    title: "Image Carousel",
    difficulty: "medium",
    topics: ["state", "arrays"],
    estimatedMinutes: 25,
    description:
      "Build an **Image Carousel**.\n\n**Requirements**\n- Previous / Next buttons cycle through the slides and **wrap around** at the ends.\n- Dot indicators show the current slide; clicking a dot jumps to it.",
    app: `import { useState } from "react";

const SLIDES = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];

export default function App() {
  // TODO: prev/next cycle through SLIDES (wrap around); dots show + set the index.
  const index = 0;
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Image Carousel</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
        <button>‹</button>
        <div style={{ width: 240, height: 140, borderRadius: 12, background: SLIDES[index] }} />
        <button>›</button>
      </div>
      <div style={{ marginTop: 10 }}>
        {SLIDES.map((_, i) => (
          <span key={i} style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", margin: 3, background: i === index ? "#111" : "#ccc" }} />
        ))}
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-pagination",
    title: "Pagination",
    difficulty: "medium",
    topics: ["state"],
    estimatedMinutes: 20,
    description:
      "Build a **Pagination** control.\n\n**Requirements**\n- Render page buttons `1..totalPages` plus Previous / Next.\n- Highlight the current page; disable Previous on page 1 and Next on the last page.",
    app: `import { useState } from "react";

export default function App() {
  // TODO: page buttons + prev/next; highlight current; disable at the ends.
  const totalPages = 5;
  const page = 1;
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Pagination</h1>
      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
        <button>‹</button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button key={i} style={{ fontWeight: page === i + 1 ? 700 : 400 }}>{i + 1}</button>
        ))}
        <button>›</button>
      </div>
      <p>Page {page} of {totalPages}</p>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-contact-form",
    title: "Contact Form",
    difficulty: "medium",
    topics: ["forms", "validation"],
    estimatedMinutes: 25,
    description:
      "Build a **Contact Form** with controlled `name`, `email`, and `message` fields.\n\n**Requirements**\n- All fields required; `email` must look like an email.\n- On submit, show inline validation errors; if valid, show a success message and clear the form.",
    app: `import { useState } from "react";

export default function App() {
  // TODO: controlled inputs; validate required + email format; show errors on submit.
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 360, margin: "0 auto" }}>
      <h1>Contact Form</h1>
      <form style={{ display: "grid", gap: 8 }}>
        <input placeholder="Name" />
        <input placeholder="Email" />
        <textarea placeholder="Message" rows={3} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-toast",
    title: "Toast Notifications",
    difficulty: "medium",
    topics: ["state", "timers"],
    estimatedMinutes: 25,
    description:
      "Build a **Toast** system.\n\n**Requirements**\n- A button pushes a new toast into a stack (bottom-right).\n- Each toast auto-dismisses after ~3 seconds; a close button dismisses it early.\n- Multiple toasts stack without overlapping.",
    app: `import { useState } from "react";

export default function App() {
  // TODO: "Notify" pushes a toast that auto-dismisses after ~3s; allow manual close.
  const toasts = [];
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Toasts</h1>
      <button>Notify</button>
      <div style={{ position: "fixed", bottom: 16, right: 16, display: "grid", gap: 8 }}>
        {toasts.map((t, i) => (
          <div key={i} style={{ background: "#111", color: "#fff", padding: "10px 14px", borderRadius: 8 }}>{t}</div>
        ))}
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-dropdown-menu",
    title: "Dropdown Menu",
    difficulty: "medium",
    topics: ["state", "events", "accessibility"],
    estimatedMinutes: 25,
    description:
      "Build a **Dropdown Menu**.\n\n**Requirements**\n- A trigger button toggles the menu open/closed.\n- Selecting an item closes the menu.\n- Clicking anywhere outside the menu also closes it.",
    app: `import { useState, useRef, useEffect } from "react";

export default function App() {
  // TODO: toggle the menu; close on item select or outside click.
  const open = false;
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Dropdown Menu</h1>
      <div style={{ display: "inline-block", position: "relative" }}>
        <button>Menu ▾</button>
        {open && (
          <ul style={{ position: "absolute", top: "100%", left: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, listStyle: "none", padding: 4, margin: 4, minWidth: 120 }}>
            <li style={{ padding: 6 }}>Profile</li>
            <li style={{ padding: 6 }}>Settings</li>
            <li style={{ padding: 6 }}>Logout</li>
          </ul>
        )}
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-autocomplete",
    title: "Autocomplete",
    difficulty: "hard",
    topics: ["state", "filtering"],
    estimatedMinutes: 30,
    description:
      "Build an **Autocomplete / Typeahead** input.\n\n**Requirements**\n- As the user types, show suggestions from the list that match (case-insensitive).\n- Clicking a suggestion fills the input and hides the list.\n- Show nothing when the query is empty.",
    app: `import { useState } from "react";

const FRUITS = ["Apple", "Apricot", "Banana", "Blueberry", "Cherry", "Date", "Grape", "Mango"];

export default function App() {
  // TODO: filter FRUITS by the query (case-insensitive); click a suggestion to fill.
  const query = "";
  const matches = [];
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 320, margin: "0 auto" }}>
      <h1>Autocomplete</h1>
      <input placeholder="Search fruit…" style={{ width: "100%", padding: 8, boxSizing: "border-box" }} />
      <ul style={{ listStyle: "none", padding: 0, margin: 0, border: matches.length ? "1px solid #ddd" : "none" }}>
        {matches.map((m, i) => (
          <li key={i} style={{ padding: 6, cursor: "pointer" }}>{m}</li>
        ))}
      </ul>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-nested-checkboxes",
    title: "Nested Checkboxes",
    difficulty: "hard",
    topics: ["state", "recursion"],
    estimatedMinutes: 35,
    description:
      "Build **Nested Checkboxes**.\n\n**Requirements**\n- Checking/unchecking a parent toggles all of its children.\n- A parent is checked when all children are checked, and reflects a mixed (indeterminate) state otherwise.",
    app: `import { useState } from "react";

const TREE = {
  label: "Fruits",
  children: [{ label: "Apple" }, { label: "Banana" }, { label: "Cherry" }],
};

export default function App() {
  // TODO: parent toggles all children; parent reflects children's combined state.
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 360, margin: "0 auto" }}>
      <h1>Nested Checkboxes</h1>
      <label style={{ display: "block", fontWeight: 600 }}>
        <input type="checkbox" /> {TREE.label}
      </label>
      <div style={{ paddingLeft: 20 }}>
        {TREE.children.map((c, i) => (
          <label key={i} style={{ display: "block" }}>
            <input type="checkbox" /> {c.label}
          </label>
        ))}
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-transfer-list",
    title: "Transfer List",
    difficulty: "medium",
    topics: ["state", "lists"],
    estimatedMinutes: 30,
    description:
      "Build a **Transfer List**.\n\n**Requirements**\n- Two lists (Available / Selected). Select one or more items, then move them to the other list with the `›` / `‹` buttons.\n- Moved items leave the source list.",
    app: `import { useState } from "react";

export default function App() {
  // TODO: select items in either list and move them to the other.
  const left = ["Apple", "Banana", "Cherry"];
  const right = [];
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, display: "flex", gap: 16, justifyContent: "center" }}>
      <ListBox title="Available" items={left} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
        <button>›</button>
        <button>‹</button>
      </div>
      <ListBox title="Selected" items={right} />
    </div>
  );
}

function ListBox({ title, items }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8, minWidth: 140 }}>
      <strong>{title}</strong>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {items.map((it, i) => (
          <li key={i} style={{ padding: 4, cursor: "pointer" }}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-file-explorer",
    title: "File Explorer",
    difficulty: "medium",
    topics: ["recursion", "tree"],
    estimatedMinutes: 30,
    description:
      "Build a **File Explorer** tree.\n\n**Requirements**\n- Render the nested tree; folders show a 📁, files a 📄.\n- Clicking a folder expands / collapses its children.",
    app: `import { useState } from "react";

const TREE = {
  name: "root",
  children: [
    { name: "src", children: [{ name: "index.ts" }, { name: "App.tsx" }] },
    { name: "package.json" },
  ],
};

export default function App() {
  // TODO: render the tree; clicking a folder toggles its children.
  return (
    <div style={{ fontFamily: "ui-monospace, monospace", padding: 24 }}>
      <h1 style={{ fontFamily: "system-ui" }}>File Explorer</h1>
      <Node node={TREE} depth={0} />
    </div>
  );
}

function Node({ node, depth }) {
  const isFolder = Array.isArray(node.children);
  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <span style={{ cursor: isFolder ? "pointer" : "default" }}>
        {isFolder ? "📁" : "📄"} {node.name}
      </span>
      {isFolder && node.children.map((c, i) => <Node key={i} node={c} depth={depth + 1} />)}
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-tic-tac-toe",
    title: "Tic-Tac-Toe",
    difficulty: "hard",
    topics: ["state", "game-logic"],
    estimatedMinutes: 35,
    description:
      "Build **Tic-Tac-Toe**.\n\n**Requirements**\n- Two players alternate X and O by clicking empty cells.\n- Detect and announce a winner (3 in a row) or a draw.\n- A Reset button starts a new game.",
    app: `import { useState } from "react";

export default function App() {
  // TODO: alternate X/O on click; detect a winner or draw; allow reset.
  const board = Array(9).fill("");
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Tic-Tac-Toe</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 64px)", gap: 4, justifyContent: "center" }}>
        {board.map((cell, i) => (
          <button key={i} style={{ width: 64, height: 64, fontSize: 28, fontWeight: 700 }}>{cell}</button>
        ))}
      </div>
      <p>Next player: X</p>
      <button>Reset</button>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-data-table",
    title: "Data Table",
    difficulty: "hard",
    topics: ["state", "sorting", "pagination"],
    estimatedMinutes: 35,
    description:
      "Build a **Data Table**.\n\n**Requirements**\n- Click a column header to sort by that column; clicking again toggles ascending/descending.\n- Paginate the rows (e.g. 4 per page) with Previous / Next.",
    app: `import { useState } from "react";

const ROWS = [
  { name: "Alice", age: 30 }, { name: "Bob", age: 24 }, { name: "Carol", age: 29 },
  { name: "Dan", age: 41 }, { name: "Eve", age: 22 }, { name: "Frank", age: 35 },
];

export default function App() {
  // TODO: sort by a clicked column (toggle asc/desc); paginate the rows.
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 420, margin: "0 auto" }}>
      <h1>Data Table</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", cursor: "pointer", borderBottom: "2px solid #eee" }}>Name</th>
            <th style={{ textAlign: "left", cursor: "pointer", borderBottom: "2px solid #eee" }}>Age</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r, i) => (
            <tr key={i}>
              <td>{r.name}</td>
              <td>{r.age}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`,
  },
];

async function main() {
  let created = 0;
  for (const u of UIS) {
    const tags = ["ui", "react", "frontend", ...u.topics];
    const starterFiles = JSON.stringify({ "/App.js": u.app });

    const challenge = await prisma.challenge.upsert({
      where: { slug: u.slug },
      update: {
        title: u.title,
        description: u.description,
        difficulty: u.difficulty,
        category: "Frontend UI",
        tags: JSON.stringify(tags),
        estimatedMinutes: u.estimatedMinutes,
        published: true,
        visibility: "public",
      },
      create: {
        slug: u.slug,
        title: u.title,
        description: u.description,
        difficulty: u.difficulty,
        template: "react",
        starterFiles,
        testFiles: "{}",
        category: "Frontend UI",
        tags: JSON.stringify(tags),
        estimatedMinutes: u.estimatedMinutes,
        published: true,
        visibility: "public",
      },
      select: { id: true },
    });

    await prisma.challengeStep.upsert({
      where: { challengeId_position: { challengeId: challenge.id, position: 0 } },
      update: {
        description: u.description,
        template: "react",
        estimatedMinutes: u.estimatedMinutes,
        judgingMode: "frontend",
        starterFiles,
        testFiles: "{}",
      },
      create: {
        challengeId: challenge.id,
        position: 0,
        title: u.title,
        description: u.description,
        template: "react",
        starterFiles,
        testFiles: "{}",
        estimatedMinutes: u.estimatedMinutes,
        judgingMode: "frontend",
      },
    });

    created++;
    console.log(`  ✓ ${u.slug} (${u.difficulty})`);
  }
  console.log(`\nSeeded ${created} frontend UI challenges.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
