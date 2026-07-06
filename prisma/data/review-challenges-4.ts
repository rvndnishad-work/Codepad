/**
 * "Review the AI's code" challenge bank, part 4: TypeScript.
 *
 * IMPORTANT: finding `lines` anchors are 1-based line numbers into `code`
 * exactly as written (first char after the opening backtick = line 1).
 * Run `npx tsx prisma/seed-review-challenges.ts --lint` after any edit.
 *
 * Grader note: marks are de-duped per line, so no two findings in one
 * challenge may anchor to the same line.
 */
import type { CuratedReviewChallenge } from "./review-challenges.types";

export const REVIEW_CHALLENGES_4: CuratedReviewChallenge[] = [
  {
    slug: "ts-product-filter",
    title: "Filterable product list (React)",
    prompt:
      "React + TypeScript: render a product list (up to 10k items) with a search box that filters by name and sorts by price. Keep it responsive while typing.",
    language: "typescript",
    difficulty: "intermediate",
    estimatedMinutes: 8,
    code: `import { useEffect, useState } from "react";
import type { Product } from "@/types";

export function ProductList({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState<Product[]>([]);

  useEffect(() => {
    const matches = [];
    for (const p of products) {
      if (p.name.toLowerCase().includes(query.toLowerCase())) {
        matches.push(p);
      }
    }
    setVisible(matches.sort((a, b) => a.price - b.price));
  });

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>
        {visible.map((p, i) => (
          <li
            key={i}
            onClick={() => window.open.url(p.link)}
          >
            {p.name} — \${p.price}
          </li>
        ))}
      </ul>
    </div>
  );
}`,
    findings: [
      {
        lines: [15, 16],
        category: "logic-bug",
        title: "Effect with no dependency array + setState = infinite render loop",
        explanation:
          "The useEffect has no dependency array, so it runs after *every* render — and setVisible always stores a brand-new array, which triggers another render, which runs the effect again… forever. Filtered/sorted data is *derived* state: compute it with useMemo(() => …, [products, query]) and delete both the effect and the `visible` state.",
      },
      {
        lines: [11, 11],
        category: "performance",
        title: "query.toLowerCase() is recomputed for every product",
        explanation:
          "The query is lowercased inside the loop — 10,000 redundant toLowerCase() calls per keystroke. Hoist it: `const q = query.toLowerCase()` before the loop. (Small per item, but this is the hot loop the prompt asked to keep responsive, and it runs on every keystroke.)",
      },
      {
        lines: [24, 24],
        category: "edge-case",
        title: "Array index as key on a filtered, sorted list",
        explanation:
          "Keys exist to track identity across renders, and here both filtering and sorting *reorder* items — with key={i}, React matches old position 0 to new position 0, so component state (selection, animations, inputs inside rows) sticks to the wrong product when the list changes. Use the stable id: key={p.id}.",
      },
      {
        lines: [25, 25],
        category: "hallucinated-api",
        title: "window.open.url() doesn't exist",
        explanation:
          "window.open is itself the function — it has no .url property, so this throws `window.open.url is not a function` the first time a product is clicked. The real call is `window.open(p.link)` (ideally with \"noopener\" for untrusted URLs).",
      },
    ],
  },
  {
    slug: "ts-api-fetch",
    title: "Typed apiFetch helper",
    prompt:
      "Write a typed apiFetch<T>(path, body?) wrapper around fetch for our SPA: JSON in/out, bearer auth from localStorage, a 10s timeout, and useful errors for non-2xx responses.",
    language: "typescript",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    code: `export async function apiFetch<T>(path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  setTimeout(() => controller.cancel(), 10000);

  const token = localStorage.getItem("token");
  console.log("apiFetch", path, "token:", token);

  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${token}\`,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });

  if (res.status === 500) throw new Error("Server error");

  return res.json() as T;
}`,
    findings: [
      {
        lines: [3, 3],
        category: "hallucinated-api",
        title: "AbortController has no .cancel() method",
        explanation:
          "The API is `controller.abort()` — .cancel() is a blend from axios's old CancelToken / other libraries. Because it's inside a setTimeout callback, the TypeError doesn't fail the request; it fires 10 seconds later as an unhandled error, and the intended timeout never actually aborts anything. (Simplest correct form: `signal: AbortSignal.timeout(10000)` — and clear the timer on success so it doesn't fire pointlessly.)",
      },
      {
        lines: [6, 6],
        category: "security",
        title: "The bearer token is logged to the console",
        explanation:
          "The auth token is printed on every request — it lands in browser devtools, session-replay/monitoring tools that capture console output, and bug reports with console dumps attached. Credentials never belong in logs; log the path and status if you need tracing.",
      },
      {
        lines: [18, 18],
        category: "logic-bug",
        title: "Only status 500 counts as an error",
        explanation:
          "401, 403, 404, 422, 502, 503… all fall through and get parsed as if they were successful T — callers receive an error payload typed as their data and fail later in confusing ways. The check should be `if (!res.ok)` (with the status and body in the thrown error, per the prompt's 'useful errors').",
      },
      {
        lines: [20, 20],
        category: "edge-case",
        title: "res.json() throws on empty (204/205) responses",
        explanation:
          "DELETEs and other endpoints returning 204 No Content have an empty body — res.json() rejects with a SyntaxError. Check for 204 (or an empty text) and return undefined before parsing. The bare `as T` cast also silently lies about the shape; runtime-validate if the type matters.",
      },
    ],
  },
  {
    slug: "ts-stripe-webhook",
    title: "Stripe webhook route handler",
    prompt:
      "Next.js App Router route handler: receive Stripe webhooks at POST /api/webhooks/stripe, verify the request really came from Stripe, and mark the order paid on checkout.session.completed.",
    language: "typescript",
    difficulty: "advanced",
    estimatedMinutes: 10,
    code: `import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const raw = req.rawBody;
  const event = JSON.parse(raw);

  const signature = req.headers.get("stripe-signature") ?? "";
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(raw)
    .digest("hex");

  if (signature !== expected) {
    console.warn("bad signature", signature);
  }

  if (event.type === "checkout.session.completed") {
    await prisma.order.update({
      where: { id: event.data.object.orderId },
      data: { status: "paid" },
    });
  }

  return NextResponse.json({ received: true });
}`,
    findings: [
      {
        lines: [8, 8],
        category: "hallucinated-api",
        title: "NextRequest has no rawBody property",
        explanation:
          "req.rawBody comes from Express-with-body-parser / Firebase Functions — on a Next.js App Router NextRequest it's undefined, so JSON.parse(undefined) throws on every delivery. Read the raw bytes with `const raw = await req.text()` (you need the *exact* bytes for signature verification anyway).",
      },
      {
        lines: [9, 9],
        category: "edge-case",
        title: "JSON.parse of an attacker-controlled body is unguarded",
        explanation:
          "This endpoint is public — anyone can POST garbage to it, and malformed JSON throws here, returning a 500 (and noisy error logs an attacker can trigger at will). Parse inside try/catch and answer 400. Parse *after* the signature check, so unauthenticated garbage never reaches the parser at all.",
      },
      {
        lines: [12, 15],
        category: "logic-bug",
        title: "This is not how Stripe signatures work — legit events always fail",
        explanation:
          "The stripe-signature header isn't a bare hex HMAC of the body; it's `t=<timestamp>,v1=<hmac>` where the HMAC is computed over `\"{t}.{body}\"`. Comparing it to a plain hex digest can never match, so once the 'only warns' bug below is fixed, *every genuine Stripe event gets rejected*. Use `stripe.webhooks.constructEvent(raw, signature, SECRET)`, which also enforces the replay-protection timestamp tolerance.",
      },
      {
        lines: [17, 19],
        category: "security",
        title: "Invalid signatures only log a warning — forged events are processed",
        explanation:
          "The whole point of verification is to reject requests that fail it, but this code warns and *keeps going* — anyone who can guess an order id can POST a fake checkout.session.completed and get their order marked paid for free. Return 400 on mismatch (and compare with crypto.timingSafeEqual, not !==, to avoid timing leaks).",
      },
    ],
  },
  {
    slug: "ts-log-summary",
    title: "Access-log summarizer CLI",
    prompt:
      "Node + TypeScript: summarize a multi-gigabyte nginx access.log — count requests per HTTP status code and print the counts, most frequent first. Must handle files bigger than memory.",
    language: "typescript",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    code: `import fs from "fs";

export function summarize(path: string) {
  const text = fs.readFileSync(path, "utf8");
  const lines = text.split("\\n");

  const counts: Record<string, number> = {};
  for (const line of lines) {
    const status = line.split(" ")[8];
    counts[status] = (counts[status] || 0) + 1;
  }

  const top = Object.entries(counts).sortBy((e) => e[1]);
  for (const [status, n] of top) {
    console.log(\`\${status}: \${n}\`);
  }
}`,
    findings: [
      {
        lines: [4, 5],
        category: "performance",
        title: "Whole multi-GB file loaded (and split) in memory",
        explanation:
          "The prompt said files bigger than memory: readFileSync buffers the entire log, then split(\"\\n\") allocates a second copy as millions of strings — the process dies with OOM long before the summary prints. Stream it line by line: `readline.createInterface({ input: fs.createReadStream(path) })` and iterate with for-await.",
      },
      {
        lines: [9, 9],
        category: "logic-bug",
        title: "Fragile positional split for the status field",
        explanation:
          "Splitting on single spaces and grabbing index 8 only works for perfectly standard combined-format lines. Request lines with unusual shapes, extra spaces, or a different log_format silently shift the index — and the 'status' column fills with garbage tokens that get counted as if they were statuses. Parse with a regex anchored on the quoted request field (e.g. /\" (\\d{3}) /) and skip lines that don't match.",
      },
      {
        lines: [10, 10],
        category: "edge-case",
        title: "The trailing newline produces an 'undefined' bucket",
        explanation:
          "Log files end with a newline, so split gives a final empty string; \"\".split(\" \")[8] is undefined and gets counted under the literal key \"undefined\" (same for any blank line). Skip empty/unmatched lines before counting.",
      },
      {
        lines: [13, 13],
        category: "hallucinated-api",
        title: "Arrays have no .sortBy() method",
        explanation:
          "sortBy is lodash/Ruby vocabulary — plain arrays throw `sortBy is not a function`. And the intent was *descending* frequency: `Object.entries(counts).sort((a, b) => b[1] - a[1])`.",
      },
    ],
  },
  {
    slug: "ts-batch-import",
    title: "Batched user import",
    prompt:
      "Import ~50k users parsed from a CSV export into Postgres via Prisma. Insert in batches of 500 so we don't overwhelm the database, and log progress as a percentage.",
    language: "typescript",
    difficulty: "intermediate",
    estimatedMinutes: 8,
    code: `import { prisma } from "@/lib/prisma";
import type { Row } from "./types";

export async function importUsers(rows: Row[]) {
  const batchSize = 500;
  let done = 0;

  const batches: Row[][] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    batches.push(rows.slice(i, i + batchSize + 1));
  }

  await Promise.all(
    batches.map(async (batch) => {
      for (const row of batch) {
        await prisma.user.create({ data: row });
      }
      done += batch.length;
      console.log(\`\${Math.round((done / rows.length) * 100)}% done\`);
    })
  );
}`,
    findings: [
      {
        lines: [10, 10],
        category: "logic-bug",
        title: "Off-by-one: consecutive batches overlap by one row",
        explanation:
          "slice's end index is exclusive, so `slice(i, i + batchSize)` is already correct — the extra +1 makes every batch include the first row of the *next* batch. Each boundary user is inserted twice: unique-email constraints abort the import, or without them you get ~100 duplicate accounts. ",
      },
      {
        lines: [13, 13],
        category: "performance",
        title: "All 100 batches run concurrently — 'batching' throttled nothing",
        explanation:
          "Promise.all starts every batch at once, so the DB sees ~100 parallel workers fighting for the connection pool (Prisma defaults to ~10) — timeouts, pool exhaustion, and *more* load than the unbatched version. Run batches sequentially (for-of with await), or cap concurrency with a small worker pool.",
      },
      {
        lines: [15, 16],
        category: "performance",
        title: "Row-by-row create defeats the point of batching",
        explanation:
          "Inside each batch it's still one INSERT round-trip per user — 50k sequential queries. Prisma has bulk insert: `prisma.user.createMany({ data: batch, skipDuplicates: true })` — one round-trip per 500 rows, easily 100x faster.",
      },
      {
        lines: [19, 19],
        category: "edge-case",
        title: "Empty input logs NaN% and pretends to work",
        explanation:
          "With rows.length === 0, done / rows.length is 0/0 = NaN, printing \"NaN% done\" (if anything runs at all). Early-return on empty input — an empty CSV parse result usually means the *parse* failed and deserves a loud error, not a silent no-op import.",
      },
    ],
  },
  {
    slug: "ts-metrics-dashboard",
    title: "Live metrics dashboard (React)",
    prompt:
      "React + TypeScript: a dashboard that polls /api/metrics every 5 seconds and renders a chart plus a filterable table. HeavyChart and Row are both wrapped in React.memo — keep re-renders minimal.",
    language: "typescript",
    difficulty: "advanced",
    estimatedMinutes: 9,
    code: `import { useEffect, useState } from "react";
import { HeavyChart } from "./HeavyChart";
import { Row, select } from "./Row";

type Metric = { id: string; name: string; value: number };

export function Dashboard() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setInterval(async () => {
      const res = await fetch("/api/metrics");
      setMetrics(await res.json());
    }, 5000);
  }, []);

  const rows = metrics.filter((m) => m.name.includes(filter));

  return (
    <div>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      <HeavyChart data={metrics} options={{ animate: true }} />
      <table>
        <tbody>
          {rows.map((m) => (
            <Row key={m.id} metric={m} onSelect={() => select(m.id)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}`,
    findings: [
      {
        lines: [12, 12],
        category: "performance",
        title: "The interval is never cleared",
        explanation:
          "The effect returns no cleanup, so navigating away leaves the interval polling forever (plus setState-on-unmounted noise) — and every remount adds *another* interval; in React 18 StrictMode you start with two immediately. Store the id and return `() => clearInterval(id)`.",
      },
      {
        lines: [13, 14],
        category: "edge-case",
        title: "The polled response is trusted to be a metric array",
        explanation:
          "No res.ok check and no shape check: the first 502 from a flaky metrics service parses an error body, setMetrics stores something that isn't an array, and metrics.filter throws on the next render — the poll loop also has no try/catch, so each failed tick is an unhandled rejection. Check res.ok, wrap the tick in try/catch, and keep the previous data on failure.",
      },
      {
        lines: [23, 23],
        category: "performance",
        title: "Fresh options object every render defeats HeavyChart's memo",
        explanation:
          "{ animate: true } is a new object identity on every render, so React.memo's shallow compare always fails and the expensive chart re-renders on every keystroke in the filter box. Hoist it to a module constant (or useMemo).",
      },
      {
        lines: [27, 27],
        category: "performance",
        title: "Inline onSelect arrow defeats Row's memo",
        explanation:
          "Every render creates a new closure per row, so all N memoized Rows re-render whenever anything changes (typing in the filter re-renders the entire table every keystroke). Pass a stable handler: `const onSelect = useCallback((id: string) => select(id), [])` and let Row call onSelect(metric.id).",
      },
    ],
  },
];
