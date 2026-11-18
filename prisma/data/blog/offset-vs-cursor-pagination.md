---
slug: offset-vs-cursor-pagination
title: "Offset vs Cursor Pagination: Why Page 25,000 Is Slow and How Keyset Pagination Fixes It"
excerpt: Why LIMIT/OFFSET gets slower the deeper you page and shows duplicates when data changes, how keyset (cursor) pagination avoids both, and how to build a cursor API, with PostgreSQL plans and runnable examples.
tags: ["backend", "databases", "postgres", "api-design", "performance"]
cover: /blog-images/offset-vs-cursor-pagination/cover.png
---

Almost every list endpoint starts the same way: `LIMIT 20 OFFSET (page - 1) * 20`. It is easy to write and it works fine in development. Then the table grows, someone scrolls far down a feed or a script exports everything page by page, and the deep pages become slow. Meanwhile users notice the same post twice in their infinite scroll.

Both problems come from the same place: `OFFSET` counts rows instead of remembering *where you were*. This post shows why, measures it on a million-row PostgreSQL table, and walks through **keyset pagination** (usually exposed as **cursor pagination** in APIs), which fixes both. The SQL results below come from PostgreSQL 16.15 on a throwaway local database, and the JavaScript examples were run with Node 22.

## The two approaches in one minute

> **Short answer:** offset pagination says "skip N rows, then take 20". Keyset pagination says "take 20 rows that come after the last row I saw". The second one can jump straight to the right place in an index; the first one has to count its way there.

The test table has one million posts. Several posts share the same `created_at` (three per minute), which is realistic and matters later:

```sql
CREATE TABLE posts (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL,
  title text NOT NULL
);
CREATE INDEX posts_created_id ON posts (created_at DESC, id DESC);
```

**Offset pagination**, page 25,001 of 20 rows:

```sql
SELECT id, created_at, title FROM posts
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 500000;
```

**Keyset pagination** of the same page. The client sends back the `created_at` and `id` of the last row on the previous page, and the query asks for rows that sort after it:

```sql
SELECT id, created_at, title FROM posts
WHERE (created_at, id) < ('2026-04-26 17:47:00+00', 500001)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

Both returned the same 20 ids (500000 down to 499981) in my run. The difference is how much work it took to get them.

## Why OFFSET gets slower the deeper you go

> **Short answer:** the database cannot jump to "row 500,000" directly. It reads the first 500,000 rows in order and throws them away.

The [PostgreSQL documentation](https://www.postgresql.org/docs/current/queries-limit.html) says it plainly: "The rows skipped by an `OFFSET` clause still have to be computed inside the server; therefore a large `OFFSET` might be inefficient." `EXPLAIN ANALYZE` shows it. `TIMING OFF` and `COSTS OFF` hide the numbers that change between runs, so what is left is how many rows each step produced:

```sql
EXPLAIN (ANALYZE, TIMING OFF, SUMMARY OFF, COSTS OFF)
SELECT id, created_at, title FROM posts
ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 500000;
```

Output:

```text
 Limit (actual rows=20 loops=1)
   ->  Index Scan using posts_created_id on posts (actual rows=500020 loops=1)
```

The index scan produced 500,020 rows so that `Limit` could return 20. The keyset version of the same page:

```text
 Limit (actual rows=20 loops=1)
   ->  Index Scan using posts_created_id on posts (actual rows=20 loops=1)
         Index Cond: (ROW(created_at, id) < ROW('2026-04-26 17:47:00+00'::timestamp with time zone, 500001))
```

Twenty rows read, twenty returned. The `Index Cond` line shows the database used the cursor to position itself in the index before reading anything.

![LIMIT 20 OFFSET 500000 reads 500,020 index entries and returns 20, while the keyset query jumps to the cursor and reads 20](/blog-images/offset-vs-cursor-pagination/offset-vs-keyset.svg)

How that turns into time in my test environment (a small cloud container with the whole table in memory; median of five runs after one warm-up, measured with `psql`'s `\timing`):

| Query (20 rows per page) | Median time |
| :--- | ---: |
| `OFFSET 10` | 1.2 ms |
| `OFFSET 100000` | 14.3 ms |
| `OFFSET 500000` | 66.2 ms |
| `OFFSET 900000` | 121.2 ms |
| Keyset, same page as `OFFSET 500000` | 1.5 ms |

The exact milliseconds will differ on your hardware, but the shape will not: offset cost grows in a straight line with the page number, and keyset cost stays flat. On a real server, with rows not all in memory and many users paging at once, the deep offset pages are also the ones that push useful data out of the cache.

## The second problem: duplicates and missing rows

> **Short answer:** offset pages are defined by position, so when rows are added or removed between two requests, every later row shifts. Users see some rows twice and never see others.

A feed sorted newest first is the classic case. The reader loads page 1, someone publishes a new post, and the reader asks for page 2. The new post pushed everything down one place, so "skip 3" now lands on a row the reader has already seen:

![A new post arrives after page 1; offset page 2 shows post 8 again, while keyset page 2 continues with 7, 6, 5](/blog-images/offset-vs-cursor-pagination/offset-drift.svg)

The same thing in code, including the opposite case where rows are deleted:

```javascript-run
// A feed sorted newest first. Each post has an increasing id.
const fresh = () => [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((id) => ({ id }));
const PAGE = 3;

// Offset pagination: "skip N rows, take 3"
const byOffset = (posts, page) => posts.slice(page * PAGE, page * PAGE + PAGE).map((p) => p.id);

// Keyset pagination: "take 3 rows older than the last one I saw"
const byKeyset = (posts, afterId) =>
  posts.filter((p) => afterId === null || p.id < afterId).slice(0, PAGE).map((p) => p.id);

let posts = fresh();
const page1 = byOffset(posts, 0);
console.log("page 1:", page1.join(", "));

// Case 1: someone publishes post 11 while the reader is on page 1
posts = [{ id: 11 }, ...fresh()];
console.log("after an insert, offset page 2:", byOffset(posts, 1).join(", "));
console.log("after an insert, keyset page 2:", byKeyset(posts, page1.at(-1)).join(", "));

// Case 2: posts 10 and 9 are deleted while the reader is on page 1
posts = fresh().filter((p) => p.id !== 10 && p.id !== 9);
console.log("after two deletes, offset page 2:", byOffset(posts, 1).join(", "));
console.log("after two deletes, keyset page 2:", byKeyset(posts, page1.at(-1)).join(", "));
```

Output:

```text
page 1: 10, 9, 8
after an insert, offset page 2: 8, 7, 6
after an insert, keyset page 2: 7, 6, 5
after two deletes, offset page 2: 5, 4, 3
after two deletes, keyset page 2: 7, 6, 5
```

After the insert, offset page 2 repeats post 8. After the deletes, offset page 2 jumps to 5, so posts 7 and 6 are never shown at all. Keyset pagination continues from "older than 8" in both cases, because it remembers a *value*, not a position.

This is why infinite-scroll feeds, activity logs and sync or export jobs should not use offsets. For a sync job, a skipped row is silent data loss.

## The tie-breaker everyone forgets

> **Short answer:** the cursor must identify exactly one row. Sorting by a timestamp alone is not enough when two rows can share a timestamp; add a unique column such as `id` to both the `ORDER BY` and the cursor.

If the cursor is only `created_at`, "older than the last timestamp I saw" skips any other row that has the same timestamp but did not fit on the previous page:

```javascript-run
// Six posts, published in bursts: several share the same timestamp.
const posts = [
  { id: 6, at: "10:02" },
  { id: 5, at: "10:01" },
  { id: 4, at: "10:01" },
  { id: 3, at: "10:01" },
  { id: 2, at: "10:00" },
  { id: 1, at: "10:00" },
]; // already sorted by at DESC, id DESC

const PAGE = 2;

function readAll(isAfter) {
  const seen = [];
  let last = null;
  while (true) {
    const page = posts.filter((p) => last === null || isAfter(p, last)).slice(0, PAGE);
    if (page.length === 0) return seen;
    seen.push(...page.map((p) => p.id));
    last = page.at(-1);
  }
}

// Cursor on the timestamp only: "older than the last timestamp I saw"
const timeOnly = readAll((p, last) => p.at < last.at);
// Cursor on (timestamp, id): older timestamp, or same timestamp and smaller id
const withTieBreaker = readAll((p, last) => p.at < last.at || (p.at === last.at && p.id < last.id));

console.log("timestamp only:", timeOnly.join(", "), `(${timeOnly.length} of ${posts.length})`);
console.log("timestamp + id:", withTieBreaker.join(", "), `(${withTieBreaker.length} of ${posts.length})`);
```

Output:

```text
timestamp only: 6, 5, 2, 1 (4 of 6)
timestamp + id: 6, 5, 4, 3, 2, 1 (6 of 6)
```

With a timestamp-only cursor, posts 4 and 3 vanish because they share `10:01` with post 5, which ended page 2. Adding `id` as a tie-breaker makes the sort order unique, so every row is read exactly once. The PostgreSQL docs make the same point for `LIMIT` in general: "it is important to use an `ORDER BY` clause that constrains the result rows into a unique order. Otherwise you will get an unpredictable subset of the query's rows."

In SQL, the cleanest way to write "after this (`created_at`, `id`) pair" is a **row value comparison**: `(created_at, id) < ($1, $2)`. It compares the timestamps first and only looks at `id` when they are equal, which is exactly the rule in the JavaScript above. Two conditions make it fast:

1. **An index whose columns and directions match the `ORDER BY`.** Here, `(created_at DESC, id DESC)` for `ORDER BY created_at DESC, id DESC`. The plan above shows the index condition being used.
2. **Every column sorted in the same direction.** A row comparison works for "all descending" or "all ascending". For mixed directions (newest first, then by name A to Z) you have to spell it out with `OR`: `created_at < $1 OR (created_at = $1 AND name > $2)`, and check the plan to make sure the index is still used.

## Building a cursor API

Clients should not have to know which columns you sort by. The usual design returns an **opaque cursor**: a string the client stores and sends back unchanged, which the server decodes into the last row's sort values.

```javascript
// Run with: node cursor.js
// Turn the last row of a page into an opaque cursor string, and back.
function encodeCursor(row) {
  const json = JSON.stringify({ v: 1, createdAt: row.createdAt, id: row.id });
  return Buffer.from(json).toString("base64url");
}

function decodeCursor(cursor) {
  let data;
  try {
    data = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new Error("invalid cursor");
  }
  if (data.v !== 1 || typeof data.createdAt !== "string" || !Number.isInteger(data.id)) {
    throw new Error("invalid cursor");
  }
  return { createdAt: data.createdAt, id: data.id };
}

const lastRow = { id: 500001, createdAt: "2026-04-26T17:47:00Z", title: "Post 500001" };
const cursor = encodeCursor(lastRow);
console.log("next_cursor:", cursor);
console.log("decoded:", decodeCursor(cursor));

for (const bad of ["not-a-cursor", encodeCursor({ createdAt: 5, id: "x" })]) {
  try {
    decodeCursor(bad);
  } catch (err) {
    console.log(`rejected ${bad.slice(0, 12)}...: ${err.message}`);
  }
}
```

Output:

```text
next_cursor: eyJ2IjoxLCJjcmVhdGVkQXQiOiIyMDI2LTA0LTI2VDE3OjQ3OjAwWiIsImlkIjo1MDAwMDF9
decoded: { createdAt: '2026-04-26T17:47:00Z', id: 500001 }
rejected not-a-cursor...: invalid cursor
rejected eyJ2IjoxLCJj...: invalid cursor
```

A typical response then looks like:

```json
{
  "data": [ ... 20 posts ... ],
  "next_cursor": "eyJ2IjoxLCJjcmVhdGVkQXQiOi...",
  "has_more": true
}
```

Things to get right:

- **Fetch one extra row to compute `has_more`.** Ask the database for `LIMIT 21`, return 20, and set `has_more` to whether the 21st row existed. That avoids a separate count query.
- **Validate the decoded cursor like any other input.** It came from the client, so check its shape and types, and use it only as query parameters, never by pasting it into SQL. Base64 is an encoding, not encryption: anyone can read a cursor. If its contents are sensitive or you do not want clients to build their own, sign it with an HMAC.
- **Version the cursor.** The `v: 1` field lets you change the sort columns later and reject or translate old cursors.
- **Tie the cursor to the query.** A cursor from a list filtered by `status=open` should not be reused with `status=closed`. Either include the filters in the cursor or reject a mismatch.

Real APIs work this way. [Stripe's list endpoints](https://docs.stripe.com/api/pagination) use "cursor-based pagination through the `starting_after` and `ending_before` parameters", where each parameter is the ID of an object in the list, and every response includes `has_more`.

## What you give up with keyset pagination

Keyset pagination is not free. Be ready to explain the trade-offs:

- **No jumping to an arbitrary page.** You can go to the next page and, with a reversed query, the previous one, but not straight to page 400. For most feeds and APIs that is fine; "page 400" is rarely what a person wants. Search results and admin tables with page numbers are where offset is still common.
- **No cheap total count.** Showing "page 3 of 12,481" needs a `COUNT(*)`, which is expensive on large tables whichever method you use. Many products show "more results" instead, or an estimate.
- **The sort must be stable and indexed.** Sorting by a column that changes (like a score that updates every minute) can still move rows between pages. Keyset gives consistent pages for stable sort keys.
- **A bit more code.** The cursor encoding, the tie-breaker and the reversed query for "previous page" all need care.

A reasonable rule: use offset for small, bounded lists where people want page numbers, and keyset for feeds, infinite scroll, public APIs, exports and anything that can grow without limit.

## Questions interviewers ask about pagination

**Why is a large OFFSET slow even with an index?**
Because the index lets the database read rows in order, but not skip ahead by count. It walks through every skipped entry, so the cost grows with the offset. The `EXPLAIN ANALYZE` above showed 500,020 rows read for 20 returned.

**Why do users see duplicates in an offset-paginated feed?**
Because pages are positions. An insert above the reader's position shifts rows down, so the next page starts on a row they already saw; a delete shifts rows up and some are skipped.

**Why add `id` to the cursor if you sort by time?**
To make the sort order unique. Without a tie-breaker, rows with the same timestamp can be skipped or repeated at a page boundary.

**How do you implement "previous page" with cursors?**
Flip the comparison and the sort (`(created_at, id) > cursor ORDER BY created_at ASC, id ASC`), take the page, and reverse it in your code before returning it.

**How would you paginate a sync job that copies a whole table?**
Keyset on the primary key: `WHERE id > $last ORDER BY id LIMIT 1000`. It is fast on every batch, cannot skip rows that already existed when it started, and can resume from the last id after a crash.

## Cheat sheet

| | Offset (`LIMIT … OFFSET n`) | Keyset / cursor (`WHERE (sort, id) < cursor`) |
| :--- | :--- | :--- |
| Cost of a deep page | Grows with `n` (reads every skipped row) | Flat (index seek, then read the page) |
| Rows added or removed between requests | Duplicates or missing rows | Continues from the last row seen |
| Jump to page 400 | Yes | No, next and previous only |
| Total count | Needs `COUNT(*)` | Needs `COUNT(*)` |
| Requirements | A unique `ORDER BY` | A unique `ORDER BY`, a matching index, a cursor |
| Good fit | Small admin tables, numbered pages | Feeds, infinite scroll, public APIs, exports, sync jobs |
