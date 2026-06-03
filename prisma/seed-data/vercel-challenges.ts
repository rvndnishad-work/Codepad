/**
 * Real starter content for the Vercel Engineering demo challenges.
 *
 * Shared by prisma/seed-vercel-workspace.ts (create) and
 * prisma/backfill-vercel-seed-content.ts (update existing rows in place) so the
 * challenge + its position-0 ChallengeStep both carry runnable content instead
 * of a "// starter code" placeholder.
 *
 * Frontend (react) challenges ship a real `/App.js` entry so the live preview
 * renders the actual scaffold (not Sandpack's default "Hello world"); DSA
 * (test-ts) challenges ship an `index.ts` stub + a jest `index.test.ts`.
 */

export type VercelSeedChallenge = {
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  /** Sandpack template id: "react" → live preview, "test-ts" → jest runner. */
  template: string;
  category: string;
  estimatedMinutes: number;
  tags: string[];
  description: string;
  starterFiles: Record<string, string>;
  testFiles: Record<string, string>;
};

export const VERCEL_SEED_CHALLENGES: VercelSeedChallenge[] = [
  // 0 — react / frontend (live preview, manual review)
  {
    slug: "vercel-seed-react-pagination",
    title: "React: Build a paginated user list",
    difficulty: "medium",
    template: "react",
    category: "Frontend",
    estimatedMinutes: 45,
    tags: ["react", "hooks", "pagination"],
    description: `## Paginated user list

Render the list of users **10 per page** with **Prev / Next** controls.

- Show only the users for the current page.
- Disable **Prev** on the first page and **Next** on the last page.
- Display "Page X of Y".

The scaffold in \`App.js\` already renders the list and the pager — wire up the
pagination logic where the \`TODO\`s are. The preview updates live as you edit.`,
    starterFiles: {
      "/App.js": `import { useState } from "react";
import "./styles.css";

// 25 sample users — in a real task you might fetch these from an API.
const USERS = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: "User " + (i + 1),
  email: "user" + (i + 1) + "@example.com",
}));

const PAGE_SIZE = 10;

export default function App() {
  const [page, setPage] = useState(1);

  // TODO: show only the users for the current page (PAGE_SIZE per page).
  const visible = USERS; // replace me

  // TODO: compute the total number of pages.
  const totalPages = 1; // replace me

  return (
    <div className="app">
      <h1>Users</h1>

      <ul className="user-list">
        {visible.map((u) => (
          <li key={u.id} className="user">
            <span className="name">{u.name}</span>
            <span className="email">{u.email}</span>
          </li>
        ))}
      </ul>

      <div className="pager">
        <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
          &larr; Prev
        </button>
        <span className="page-info">
          Page {page} of {totalPages}
        </span>
        <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
          Next &rarr;
        </button>
      </div>
    </div>
  );
}
`,
      "/styles.css": `* { box-sizing: border-box; }
body { margin: 0; font-family: "Inter", system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }
.app { max-width: 480px; margin: 0 auto; padding: 24px 16px; }
.app h1 { font-size: 1.5rem; margin: 0 0 16px; }
.user-list { list-style: none; margin: 0 0 16px; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.user { display: flex; justify-content: space-between; align-items: center; background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 10px 14px; }
.user .name { font-weight: 600; }
.user .email { color: #94a3b8; font-size: 0.85rem; }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; }
.pager button { padding: 8px 14px; border-radius: 8px; border: 1px solid #475569; background: #334155; color: #e2e8f0; font-size: 0.9rem; cursor: pointer; }
.pager button:disabled { opacity: 0.4; cursor: not-allowed; }
.pager button:not(:disabled):hover { background: #475569; border-color: #61dafb; }
.page-info { font-size: 0.85rem; color: #94a3b8; min-width: 90px; text-align: center; }
`,
    },
    testFiles: {},
  },

  // 1 — test-ts / DSA (jest runner, auto-graded)
  {
    slug: "vercel-seed-two-sum-ts",
    title: "Two Sum (TypeScript)",
    difficulty: "easy",
    template: "test-ts",
    category: "Algorithms",
    estimatedMinutes: 20,
    tags: ["arrays", "hashmap"],
    description: `## Two Sum

Given an array of integers \`nums\` and an integer \`target\`, return the
**indices** of the two numbers that add up to \`target\`.

Each input has **exactly one** solution and you may not use the same element
twice. Aim for **O(n)**.

Edit \`index.ts\` and run the tests to check your solution.`,
    starterFiles: {
      "/index.ts": `export function twoSum(nums: number[], target: number): number[] {
  // TODO: implement
  return [];
}
`,
    },
    testFiles: {
      "/index.test.ts": `import { twoSum } from "./index";

function sorted(a: number[]): number[] {
  return [...a].sort((x, y) => x - y);
}

describe("twoSum", () => {
  it("finds the two indices for a basic case", () => {
    expect(sorted(twoSum([2, 7, 11, 15], 9))).toEqual([0, 1]);
  });

  it("works for indices not at the start", () => {
    expect(sorted(twoSum([3, 2, 4], 6))).toEqual([1, 2]);
  });

  it("works for duplicates", () => {
    expect(sorted(twoSum([3, 3], 6))).toEqual([0, 1]);
  });

  it("works with negative numbers", () => {
    expect(sorted(twoSum([-1, -2, -3, -4, -5], -8))).toEqual([2, 4]);
  });
});
`,
    },
  },

  // 2 — react / frontend (live preview, manual review)
  {
    slug: "vercel-seed-debounce-hook",
    title: "Implement a useDebounce hook",
    difficulty: "medium",
    template: "react",
    category: "React",
    estimatedMinutes: 30,
    tags: ["react", "hooks", "timing"],
    description: `## useDebounce hook

Implement \`useDebounce(value, delayMs)\` in \`useDebounce.js\` so it returns
\`value\` only after it has stopped changing for \`delayMs\` milliseconds.

The demo in \`App.js\` shows the live value vs the debounced value as you type —
once the hook works, the "Debounced" line should lag behind by \`delayMs\`.`,
    starterFiles: {
      "/App.js": `import { useState } from "react";
import { useDebounce } from "./useDebounce";
import "./styles.css";

export default function App() {
  const [text, setText] = useState("");
  const debounced = useDebounce(text, 400);

  return (
    <div className="app">
      <h1>useDebounce</h1>
      <p className="hint">Type fast — the debounced value should update 400ms after you stop.</p>

      <input
        className="input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search…"
      />

      <div className="row">
        <span className="label">Live</span>
        <code>{text || "—"}</code>
      </div>
      <div className="row">
        <span className="label">Debounced</span>
        <code>{debounced || "—"}</code>
      </div>
    </div>
  );
}
`,
      "/useDebounce.js": `import { useState, useEffect } from "react";

// TODO: return \`value\`, but only after it has stopped changing for \`delayMs\`.
// Hint: keep the debounced value in state, and use useEffect with a setTimeout
// that you clear on every change.
export function useDebounce(value, delayMs) {
  // Currently returns the value immediately (no debouncing) — fix this.
  return value;
}
`,
      "/styles.css": `* { box-sizing: border-box; }
body { margin: 0; font-family: "Inter", system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }
.app { max-width: 460px; margin: 0 auto; padding: 24px 16px; }
.app h1 { font-size: 1.5rem; margin: 0 0 4px; }
.hint { color: #94a3b8; font-size: 0.85rem; margin: 0 0 16px; }
.input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #475569; background: #1e293b; color: #e2e8f0; font-size: 1rem; outline: none; margin-bottom: 16px; }
.input:focus { border-color: #61dafb; }
.row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid #1e293b; }
.row .label { width: 90px; color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
.row code { background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 2px 8px; color: #61dafb; }
`,
    },
    testFiles: {},
  },

  // 3 — test-ts / DSA (jest runner, auto-graded)
  {
    slug: "vercel-seed-lru-cache",
    title: "LRU Cache",
    difficulty: "hard",
    template: "test-ts",
    category: "Data Structures",
    estimatedMinutes: 60,
    tags: ["design", "hashmap", "linked-list"],
    description: `## LRU Cache

Implement an \`LRUCache\` with \`get(key)\` and \`put(key, value)\` running in
**O(1)** each.

- \`get(key)\` returns the value, or \`-1\` if the key is absent.
- \`put(key, value)\` inserts/updates the value.
- When capacity is exceeded, evict the **least-recently-used** entry.
- Both \`get\` and \`put\` count as "using" a key.

Edit \`index.ts\` and run the tests to check your solution.`,
    starterFiles: {
      "/index.ts": `export class LRUCache {
  constructor(capacity: number) {
    // TODO: initialise your storage with the given capacity
  }

  get(key: number): number {
    // TODO: return the value (and mark it most-recently-used), or -1 if absent
    return -1;
  }

  put(key: number, value: number): void {
    // TODO: insert/update; evict the least-recently-used entry past capacity
  }
}
`,
    },
    testFiles: {
      "/index.test.ts": `import { LRUCache } from "./index";

describe("LRUCache", () => {
  it("returns -1 for a missing key", () => {
    const c = new LRUCache(2);
    expect(c.get(1)).toBe(-1);
  });

  it("stores and retrieves values", () => {
    const c = new LRUCache(2);
    c.put(1, 1);
    c.put(2, 2);
    expect(c.get(1)).toBe(1);
    expect(c.get(2)).toBe(2);
  });

  it("evicts the least-recently-used entry past capacity", () => {
    const c = new LRUCache(2);
    c.put(1, 1);
    c.put(2, 2);
    c.put(3, 3); // evicts key 1
    expect(c.get(1)).toBe(-1);
    expect(c.get(3)).toBe(3);
  });

  it("a get refreshes recency", () => {
    const c = new LRUCache(2);
    c.put(1, 1);
    c.put(2, 2);
    expect(c.get(1)).toBe(1); // 1 is now most-recently-used
    c.put(3, 3); // evicts key 2
    expect(c.get(2)).toBe(-1);
    expect(c.get(1)).toBe(1);
    expect(c.get(3)).toBe(3);
  });
});
`,
    },
  },
];
