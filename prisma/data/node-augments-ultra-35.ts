/**
 * Node.js gap batch 35 — Testing, reverse proxies and security.
 *
 * Three questions that previously had only a thin one-paragraph answer,
 * brought to the same depth as node-augments-ultra-1 … -29. Titles copied
 * verbatim from prisma/data/question-bank.json; difficulties unchanged
 * (easy, medium, hard).
 *
 * Verified in this batch, executed on this machine (Node v22.22.0):
 *   - Testing strategy: a small order API (pure pricing module + injected
 *     repo/payments) with 4 unit tests and 2 integration tests on node:test;
 *     all 6 passed (unit tests < 1ms each, first integration test ~87ms over
 *     a real socket). A planted coupon bug failed one unit and one
 *     integration test with exit code 1. Built-in coverage reported 98.99%
 *     lines with app.js line 22 (the 404 branch) uncovered, and
 *     --test-coverage-lines=100 failed the run. Two test files were
 *     confirmed to run in separate processes at the same time.
 *   - Reverse proxy: no Nginx on this machine, so a ~40-line node:http
 *     reverse proxy was run in front of two app instances: round-robin
 *     A/B/A/B, /static/ never reached the app, X-Forwarded-For appended
 *     after a spoofed value, a slow client (30 bytes at 50ms/byte) held the
 *     app 1501ms / 1462ms directly vs 0ms / 1ms through the buffering proxy,
 *     and failover after ECONNREFUSED. Express 4.22.3 req.ip with a spoofed
 *     XFF: 127.0.0.1 (no trust proxy), the attacker value (true), the real
 *     client (1 hop). http.Server defaults read: keepAliveTimeout 5000,
 *     headersTimeout 60000, requestTimeout 300000. The Nginx config block is
 *     NOT executed and says so.
 *   - Prototype pollution: JSON.parse and spread do not pollute;
 *     Object.assign replaces only the target prototype; naive merge
 *     (__proto__ and constructor.prototype) and a path setter pollute.
 *     lodash 4.17.4 merge polluted, 4.18.1 merge/set did not; qs 6.16.1
 *     dropped __proto__; Express 4.22.3 (extended query parser) passed
 *     a[constructor][prototype] through as data. npm audit flagged lodash
 *     4.17.4 critical. Gadgets: isAdmin / escapeHtml flipped, Object.hasOwn
 *     check held; execFileSync ignored polluted env/shell on this version.
 *     zod 4.6.7 strictObject rejected __proto__ and constructor; z.object
 *     stripped them. --disable-proto=delete/throw blocked __proto__ but not
 *     constructor.prototype; Object.freeze(Object.prototype) blocked
 *     pollution but made o.toString = ... throw in strict mode.
 *
 * Version / product facts checked via web search, not asserted from memory:
 *   - node:test marked stable in Node 20.0.0; coverage still behind
 *     --experimental-test-coverage; coverage thresholds added in 22.8.0.
 *   - --disable-proto added in v13.12.0, backported to v12.17.0.
 *   - lodash CVE-2018-3721 (merge/mergeWith/defaultsDeep) fixed in 4.17.5;
 *     CVE-2018-16487 fixed in 4.17.11.
 *   - Nginx defaults client_max_body_size 1m, proxy_request_buffering on,
 *     proxy_buffering on; AWS ALB idle timeout 60s and the keep-alive 502
 *     mismatch with Node's 5s keepAliveTimeout.
 *   - Silent Spring (USENIX Security 2023): 11 universal gadgets in Node core.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What testing strategies and tools would you use for a Node.js application?",
    seoDescription:
      "A Node.js testing strategy: many unit tests, real-server integration tests, a few E2E flows, coverage and CI. Verified with node:test.",
    description: `**Question presented to candidate:**
"You are joining a team with a Node.js API that has almost no tests. How would you decide what to test, which kinds of tests you would write, and which tools you would pick? Walk me through it."

**What a strong answer should cover:**
- The layers and what each one is for: **unit** tests for pure logic (fast, many), **integration** tests that run real modules together (a real HTTP server, a real or containerised database), and a few **end-to-end** tests of whole user flows. Plus non-functional checks where they matter: load, security scanning, contract tests between services.
- Design for testability: keep business rules in pure functions and **inject** the database and outside services, so a test can pass a fake without patching modules.
- **Test doubles** (fakes, stubs, spies, mocks) only at boundaries you do not own (payment provider, email, third-party APIs); prefer real code everywhere else.
- A concrete tool list and why: the built-in \`node:test\` + \`node:assert\`, or Jest / Vitest / Mocha; \`supertest\` or plain \`fetch\` against \`server.listen(0)\` for HTTP; \`nock\` / \`msw\` / undici \`MockAgent\` to stub outbound HTTP; Testcontainers for a real database; Playwright for browser E2E; coverage with Node's built-in coverage, \`c8\` or \`nyc\`.
- Coverage is a map of untested code, not a quality score; a threshold in CI stops it from sliding. Mutation testing (Stryker) checks whether the tests would actually catch a bug.
- Everything runs in CI on every pull request with \`npm ci\`, and a failing test or missed threshold fails the build (non-zero exit code).

**Clarifying questions expected:**
- "What breaks most often today: business logic, database queries, or integrations with other services?"
- "Is there a CI pipeline already, and how long are people willing to wait for it?"

**Code / implementation expected:** Optional: a unit test for a pure function and an integration test that starts the real server on a random port with a faked external dependency.`,
    answer: `**Target Audience:** Developers who write Node.js code but have not set up a test suite from scratch.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> for the word an interviewer expects. The small order API below and its tests were run with Node v22.22.0 using only the built-in test runner; every output block is copied from those runs.

## 1. Why This Even Matters — A Story First

Think of a restaurant kitchen before a busy night.

- The chef **tastes each sauce** on its own. It takes seconds and catches most mistakes early.
- Then they **cook one full dish** with the real pans and the real oven, to check the parts work together.
- Once in a while they run a **full dress rehearsal**: a waiter takes an order, the kitchen cooks it, the plate reaches a table.

Nobody runs a full rehearsal for every pinch of salt, because it is slow. Nobody skips tasting either, because a bad sauce ruins every plate. A Node.js test strategy is the same plan: lots of fast, small checks, fewer bigger ones, and a handful of full run-throughs, all done automatically before anything ships.

## 2. The Layers, and What Each One Catches

📌 **Interview term: unit test** — tests one function or module on its own, with no network, disk or database. Runs in milliseconds, so you can have hundreds. Best for business rules: prices, validation, date maths, state machines.

📌 **Interview term: integration test** — runs several real pieces together: your route handler, your validation, your data layer, a real HTTP server. It catches wiring mistakes that unit tests cannot see: wrong status codes, a missing \`await\`, a bad SQL query, JSON that does not match what the client expects.

📌 **Interview term: end-to-end (E2E) test** — drives the whole deployed system the way a user would (a browser with Playwright, or HTTP calls against a staging environment). Slow and more brittle, so keep a few for the flows that make money: sign-up, checkout, login.

📌 **Interview term: testing pyramid** — the shape of a healthy suite: many unit tests at the bottom, fewer integration tests, a thin tip of E2E tests. Many Node API teams lean toward a **"testing trophy"** instead, where integration tests are the biggest layer, because for an API most bugs live in how the pieces connect. Both agree on the same rule: push each check down to the cheapest layer that can catch it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="A testing pyramid with many fast unit tests at the bottom, fewer integration tests in the middle and a few end to end tests at the top">
  <rect class="d-box-muted" x="230" y="20" width="180" height="50" rx="8"/>
  <text class="d-text" x="320" y="42" text-anchor="middle">End-to-end</text>
  <text class="d-sub" x="320" y="60" text-anchor="middle">a few, slow, whole flows</text>
  <rect class="d-box" x="150" y="96" width="340" height="56" rx="8"/>
  <text class="d-text" x="320" y="120" text-anchor="middle">Integration</text>
  <text class="d-sub" x="320" y="140" text-anchor="middle">real server, real modules, fake third parties</text>
  <rect class="d-box-accent" x="60" y="178" width="520" height="60" rx="8"/>
  <text class="d-text d-accent" x="320" y="204" text-anchor="middle">Unit</text>
  <text class="d-sub" x="320" y="224" text-anchor="middle">many, milliseconds each, pure logic</text>
</svg>

Moving up the pyramid, each test gives more confidence that the real system works, but it costs more time to run and more effort to keep passing.

Two more kinds are worth naming in an interview, used only where they pay off:

📌 **Interview term: contract test** — checks that a service still matches the request and response shapes another service depends on (tools such as Pact), so two teams can deploy separately without breaking each other.

📌 **Interview term: load test** — sends many concurrent requests (autocannon, k6) to find the throughput limit and the latency under pressure. It answers "how fast", not "is it correct".

The neighbouring questions go deeper on two of these topics: [the difference between unit, integration and end-to-end tests](/interview-question/what-is-the-difference-between-unit-integration-and-end-to-end-tests-for-a-node-) and [the built-in node:test runner compared with Jest and Mocha](/interview-question/what-is-the-built-in-node-test-runner-and-how-does-it-compare-to-jest-and-mocha).

## 3. Strategy Starts in the Code: Make It Testable

Tests are cheap only when the code lets them be. Two habits do most of the work:

1. **Keep the rules pure.** \`orderTotal()\` below takes data and returns a number. No database, no \`fetch\`. A unit test is three lines.
2. **Inject the outside world.** \`createApp({ repo, payments })\` receives its database and payment client as arguments instead of \`require\`-ing them. A test can pass an in-memory repo and a fake payment client, with no module patching. This is [dependency injection](/interview-question/explain-dependency-injection-and-how-it-can-be-used-in-node-js).

~~~js
// src/pricing.js — pure business logic
function orderTotal(items, { couponPct = 0 } = {}) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("order has no items");
  if (couponPct < 0 || couponPct > 50) throw new RangeError("coupon must be 0-50%");
  const cents = items.reduce((sum, i) => sum + i.priceCents * i.qty, 0);
  return Math.round(cents * (1 - couponPct / 100));
}

// src/app.js — the HTTP layer gets its dependencies passed in
function createApp({ repo, payments }) {
  return http.createServer(async (req, res) => {
    // POST /orders: parse body, orderTotal(), payments.charge(), repo.save()
  });
}
~~~

📌 **Interview term: test double** — any stand-in for a real dependency during a test. A **fake** is a working, simpler version (an in-memory repository). A **stub** returns canned answers. A **spy** records how it was called. A **mock** is a spy with expectations about those calls. Use them at the edges you do not control (the card processor, email, a partner API), and keep your own code real. More on the mechanics in [How do you mock modules, timers, and network calls in Node.js tests?](/interview-question/how-do-you-mock-modules-timers-and-network-calls-in-node-js-tests)

## 4. The Tests

The unit tests check the rules, including the error paths:

~~~js
// test/pricing.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { orderTotal } = require("../src/pricing");

test("applies a coupon and rounds to whole cents", () => {
  assert.equal(orderTotal([{ priceCents: 999, qty: 1 }], { couponPct: 15 }), 849);
});
test("rejects an out-of-range coupon", () => {
  assert.throws(() => orderTotal([{ priceCents: 1, qty: 1 }], { couponPct: 80 }), RangeError);
});
~~~

The integration test starts the **real** server on port \`0\` (the OS picks a free port, so tests never clash), uses the real in-memory repository, and replaces only the payment provider with a \`mock.fn()\` spy:

~~~js
// test/orders.integration.test.js
const payments = { charge: mock.fn(async (amount) => ({ id: "ch_" + amount })) };

before(async () => {
  repo = createMemoryRepo();
  server = createApp({ repo, payments }).listen(0);
  await new Promise((r) => server.once("listening", r));
  base = \`http://127.0.0.1:\${server.address().port}\`;
});
after(() => server.close());

test("a bad order returns 400 and never charges the card", async () => {
  const res = await fetch(\`\${base}/orders\`, { method: "POST", body: JSON.stringify({ items: [] }) });
  assert.equal(res.status, 400);
  assert.equal(payments.charge.mock.callCount(), 0);   // the important business rule
});
~~~

Notice the second test checks something no unit test could: that a rejected order **never reaches the payment provider**. That is the kind of bug that costs real money.

## 5. Verified: Running the Code

All tests, with the readable \`spec\` reporter:

~~~bash
node --test --test-reporter=spec
~~~

~~~
✔ POST /orders charges once and stores the order (87.075757ms)
✔ a bad order returns 400 and never charges the card (7.165469ms)
✔ sums price x qty in cents (0.929703ms)
✔ applies a coupon and rounds to whole cents (0.140769ms)
✔ rejects an empty order (0.405648ms)
✔ rejects an out-of-range coupon (0.126802ms)
ℹ tests 6
ℹ pass 6
ℹ fail 0
ℹ duration_ms 204.092202
~~~

The unit tests each took well under 1 ms; the first integration test took 87 ms because it opened a real socket and made a real HTTP request. That gap is the pyramid in numbers.

Then I planted a bug in a copy of the project: the coupon was subtracted as a number of cents instead of a percentage (\`Math.round(cents - couponPct)\`). Both layers caught it, and the process exited with code **1**, which is what makes CI fail:

~~~
✖ POST /orders charges once and stores the order (67.742689ms)
✖ applies a coupon and rounds to whole cents (1.035856ms)
ℹ pass 4
ℹ fail 2

test at test/orders.integration.test.js:17:1
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  1490 !== 1350

test at test/pricing.test.js:10:1
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  984 !== 849
exit=1
~~~

Finally, coverage with Node's built-in coverage:

~~~bash
node --test --experimental-test-coverage --test-reporter=spec
~~~

~~~
ℹ file                        | line % | branch % | funcs % | uncovered lines
ℹ src                         |        |          |         |
ℹ  app.js                     |  97.06 |    87.50 |  100.00 | 22
ℹ  pricing.js                 | 100.00 |   100.00 |  100.00 |
ℹ all files                   |  98.99 |    96.67 |  100.00 |
~~~

Line 22 of \`app.js\` is the \`404\` branch: no test calls an unknown route. Coverage did its real job here: it pointed at an untested path. Adding \`--test-coverage-lines=100\` turned that gap into a failed run:

~~~
ℹ Error: 98.99% line coverage does not meet threshold of 100%.
exit=1
~~~

📌 **Interview term: code coverage** — the share of lines, branches and functions that ran during the tests. Low coverage proves code is untested; high coverage does **not** prove it is tested well, because a test can run a line without asserting anything about it.

📌 **Interview term: mutation testing** — a tool (Stryker for JavaScript) makes small changes to your code, like the coupon bug above, and checks that some test fails for each one. A change that no test notices is a "surviving mutant", meaning a real gap in your assertions.

Version notes, checked rather than assumed: the \`node:test\` runner has been marked stable since Node 20.0.0, but coverage still sits behind \`--experimental-test-coverage\` ([Node test runner docs](https://r2.nodejs.org/docs/v20.3.0/api/test.json)), and coverage thresholds such as \`--test-coverage-lines\` arrived in Node 22.8.0 ([Node v22.8.0 release notes](https://nodejs.org/en/blog/release/v22.8.0)).

## 6. Choosing Tools

| Job | Common choices | Notes |
| :--- | :--- | :--- |
| Test runner + assertions | \`node:test\` + \`node:assert\`, Jest, Vitest, Mocha + Chai | \`node:test\` needs no install; Jest and Vitest add snapshots, rich watch mode and module mocking out of the box |
| Spies, stubs, fake timers | \`mock.fn()\` / \`mock.timers\` in \`node:test\`, \`jest.fn()\`, Sinon | Use at boundaries, not on your own internals |
| HTTP route tests | \`supertest\`, or \`fetch\` against \`server.listen(0)\` | Both hit the real request pipeline (middleware, parsing, status codes) |
| Stubbing outbound HTTP | \`nock\`, \`msw\`, undici \`MockAgent\` | Stops tests from calling real third-party APIs |
| Real database in tests | Testcontainers (Docker), a test schema per run | Catches real query and migration bugs an in-memory fake hides |
| Browser E2E | Playwright, Cypress | Keep to a handful of critical flows |
| Coverage | built-in coverage, \`c8\`, \`nyc\` (Istanbul) | Use as a map plus a CI threshold |
| Load / performance | autocannon, k6 | Run before launches and after big changes, not on every commit |
| Static checks | TypeScript, ESLint | The cheapest "tests" of all: they run without executing code |

There is no single right stack. A fair interview answer is: "For a new service I would start with \`node:test\` because it has no dependencies, and switch to Vitest or Jest if the team wants snapshots or built-in module mocking."

## 7. What to Test Where

| Thing to check | Best layer | Why |
| :--- | :--- | :--- |
| Price, tax, discount, validation rules | Unit | Pure logic, many edge cases, needs to be fast |
| Status codes, headers, error JSON shape | Integration | Lives in the HTTP layer, invisible to unit tests |
| SQL queries, migrations, transactions | Integration with a real DB | Fakes cannot reproduce real database behaviour |
| Calls to Stripe, email, partner APIs | Integration with a stub or fake | Real calls are slow, flaky and may cost money |
| Sign-up, checkout, login | E2E | Proves the deployed pieces work together |
| Throughput and p99 latency | Load test | Correctness tests say nothing about speed |
| Known-vulnerable dependencies | \`npm audit\` in CI | Not a test of your code, but a check of what you ship |

## 8. Wiring It Into CI

A strategy only works if it runs on every change, automatically:

~~~bash
npm ci                                   # exact versions from package-lock.json
npx eslint .                             # static checks first: fastest feedback
node --test --experimental-test-coverage --test-coverage-lines=90
npm audit --audit-level=high             # fail on known high-severity CVEs
~~~

Each command exits non-zero on failure, so the pipeline stops and the pull request cannot merge. \`npm ci\` matters because it installs exactly what the lockfile says, so CI tests the same dependency tree that production will run; see [npm ci vs npm install](/interview-question/what-is-the-difference-between-npm-ci-and-npm-install).

## 9. Common Pitfalls

- **Mocking your own code.** If a test replaces the module it is supposed to test, it only proves the mock works. Mock the payment provider, not your pricing module.
- **Chasing 100% coverage.** Coverage counts lines that ran, not facts that were checked. A suite of tests with no assertions can score 100%. Use a sensible threshold to stop sliding, and read the uncovered lines for missing cases.
- **Tests that share state.** Tests that depend on run order or a shared database row pass alone and fail together. Give each test its own data, or reset it in \`beforeEach\`.
- **Hard-coded ports and real sleeps.** A fixed port clashes when files run in parallel (the \`node:test\` runner runs test files in separate processes at the same time); use \`listen(0)\`. A real \`setTimeout(5000)\` makes the suite slow; use fake timers.
- **Only testing the happy path.** The planted bug above was caught because a test used a coupon. Error paths, empty input, and limits (0%, 50%, 51%) are where real bugs live.
- **Too many E2E tests.** They are slow and flaky, and when they fail they rarely say why. If an E2E test keeps catching the same kind of bug, write a unit or integration test for it instead.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it as layers:</strong> <span style="color:#f0e2c8;">"I think in layers: many fast unit tests for pure business rules, a solid set of integration tests that start the real server, and a few end-to-end tests for the flows that make money."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Start with testable code:</strong> <span style="color:#f0e2c8;">"Keep rules in pure functions and inject the database and outside services, so a test can pass a fake without patching modules."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Fake only the edges:</strong> <span style="color:#f0e2c8;">"I use test doubles for things we do not own, like the payment provider or email, and keep our own code real. The integration test then proves a bad order never reaches the card processor."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the tools:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;">node:test</code> with <code style="background:#332310;color:#ffca28;">node:assert</code> needs no install; Jest or Vitest if the team wants snapshots and module mocking. <code style="background:#332310;color:#ffca28;">supertest</code> or <code style="background:#332310;color:#ffca28;">fetch</code> on <code style="background:#332310;color:#ffca28;">listen(0)</code> for HTTP, <code style="background:#332310;color:#ffca28;">nock</code> or <code style="background:#332310;color:#ffca28;">msw</code> for outbound calls, Testcontainers for a real database, Playwright for E2E."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close with CI:</strong> <span style="color:#f0e2c8;">"Everything runs on every pull request with <code style="background:#332310;color:#ffca28;">npm ci</code>. A failing test or a coverage threshold exits non-zero and blocks the merge. Coverage is a map of untested code, not a score."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test code that calls a real database?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pure logic gets unit tests with no database at all. For the data layer I run integration tests against a <strong style="color:#ffca28;">real</strong> database of the same engine, usually started with Testcontainers or a dedicated test schema, because an in-memory fake hides real behaviour: constraint errors, transactions, SQL dialect quirks. Each test gets its own data, inside a transaction that is rolled back or a schema that is reset, so tests can run in any order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What coverage target would you set?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">I would not chase 100%. I set a threshold close to the current number so it cannot slide, for example <code style="background:#332310;color:#ffca28;">--test-coverage-lines=85</code> with the built-in runner or the equivalent in Jest or c8, and I read the uncovered lines for missing cases. In my own run the report pointed straight at an untested 404 branch. To check test quality rather than quantity, mutation testing with Stryker shows which planted bugs no test catches.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Jest, Vitest or the built-in node:test runner?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a new backend service I start with <code style="background:#332310;color:#ffca28;">node:test</code> because it ships with Node, needs no config, and has spies, fake timers and coverage built in. Jest is the most widely known and has the richest module mocking and snapshots. Vitest has a Jest-like API and is fast, and is the natural choice if the project already uses Vite or native ESM heavily. The strategy matters much more than the runner.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop tests from calling real third-party APIs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two ways. First, design: inject the client, so the test passes a fake object, like the <code style="background:#332310;color:#ffca28;">payments</code> spy in my example. Second, at the network level: <code style="background:#332310;color:#ffca28;">nock</code> or <code style="background:#332310;color:#ffca28;">msw</code> intercept outbound HTTP, and undici <code style="background:#332310;color:#ffca28;">MockAgent</code> does it for the built-in <code style="background:#332310;color:#ffca28;">fetch</code>. I also make unexpected real calls fail loudly, so a forgotten stub breaks the test instead of silently hitting production.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your test suite is slow and flaky. What do you do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">First measure which files are slow. Usually the cause is too many E2E tests, real <code style="background:#332310;color:#ffca28;">setTimeout</code> waits, or shared state between tests. I move checks down the pyramid where possible, replace sleeps with fake timers, give each test its own data and its own server on port <code style="background:#332310;color:#ffca28;">0</code>, and quarantine a flaky test with a ticket rather than letting people learn to ignore red builds.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Unit test** | Checks one function alone, no I/O, runs in milliseconds |
| **Integration test** | Runs real modules together, such as a real server and data layer |
| **End-to-end test** | Drives the whole deployed system like a real user |
| **Testing pyramid / trophy** | Many cheap tests at the bottom, few expensive ones at the top |
| **Test double** | Any stand-in for a real dependency: fake, stub, spy or mock |
| **Contract test** | Checks a service still matches the API shape its consumers rely on |
| **Load test** | Measures throughput and latency under many concurrent requests |
| **Code coverage** | Share of lines and branches that ran during the tests |
| **Mutation testing** | Plants small bugs and checks that some test fails for each |

---
**Conclusion:** A good Node.js testing strategy is a plan for where each kind of check lives: many fast **unit** tests for pure business rules, a solid layer of **integration** tests that start the real server and talk to it over HTTP, and a few **end-to-end** tests for the flows that matter most. It starts in the code itself: pure functions and injected dependencies make tests cheap. In the run above, unit tests took under a millisecond, the integration test about 87 ms, a planted coupon bug failed both layers with exit code 1, and the built-in coverage report pointed straight at the one untested \`404\` branch. Pick tools that fit the team (\`node:test\` with no installs, or Jest/Vitest for more batteries), fake only the third parties you do not own, treat coverage as a map rather than a score, and run it all in CI on every pull request.`,
    examples: [
      {
        label: "Unit tests for pure business logic with node:test (src/pricing.js + test/pricing.test.js)",
        tech: "javascript",
        runnable: false,
        code: `// ── src/pricing.js ──
// Pure business logic: no I/O, so it is cheap to unit test.
function orderTotal(items, { couponPct = 0 } = {}) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("order has no items");
  if (couponPct < 0 || couponPct > 50) throw new RangeError("coupon must be 0-50%");
  const cents = items.reduce((sum, i) => sum + i.priceCents * i.qty, 0);
  return Math.round(cents * (1 - couponPct / 100));
}
module.exports = { orderTotal };

// ── test/pricing.test.js ──
// UNIT tests: one function, no network, no database.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { orderTotal } = require("../src/pricing");

test("sums price x qty in cents", () => {
  assert.equal(orderTotal([{ priceCents: 250, qty: 2 }, { priceCents: 100, qty: 1 }]), 600);
});

test("applies a coupon and rounds to whole cents", () => {
  assert.equal(orderTotal([{ priceCents: 999, qty: 1 }], { couponPct: 15 }), 849);
});

test("rejects an empty order", () => {
  assert.throws(() => orderTotal([]), /no items/);
});

test("rejects an out-of-range coupon", () => {
  assert.throws(() => orderTotal([{ priceCents: 1, qty: 1 }], { couponPct: 80 }), RangeError);
});`,
      },
      {
        label: "Integration test: the real HTTP server on port 0, a real in-memory repo, a mocked payment provider",
        tech: "javascript",
        runnable: false,
        code: `// ── src/app.js ──
const http = require("node:http");
const { orderTotal } = require("./pricing");

// The repository and payment client are injected, so tests can pass fakes.
function createApp({ repo, payments }) {
  return http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/orders") {
      let body = "";
      for await (const chunk of req) body += chunk;
      try {
        const { items, couponPct } = JSON.parse(body);
        const total = orderTotal(items, { couponPct });
        const charge = await payments.charge(total);
        const order = await repo.save({ items, total, chargeId: charge.id });
        res.writeHead(201, { "content-type": "application/json" });
        return res.end(JSON.stringify(order));
      } catch (err) {
        res.writeHead(400, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: err.message }));
      }
    }
    res.writeHead(404).end();
  });
}

// A real (in-memory) repository. Swap for Postgres in production.
function createMemoryRepo() {
  const rows = [];
  return {
    async save(o) { const row = { id: rows.length + 1, ...o }; rows.push(row); return row; },
    async count() { return rows.length; },
  };
}
module.exports = { createApp, createMemoryRepo };

// ── test/orders.integration.test.js ──
// INTEGRATION tests: real HTTP server + real repo, fake only the payment provider.
const { test, before, after, mock } = require("node:test");
const assert = require("node:assert/strict");
const { createApp, createMemoryRepo } = require("../src/app");

let server, base, repo;
const payments = { charge: mock.fn(async (amount) => ({ id: "ch_" + amount })) };

before(async () => {
  repo = createMemoryRepo();
  server = createApp({ repo, payments }).listen(0);
  await new Promise((r) => server.once("listening", r));
  base = \`http://127.0.0.1:\${server.address().port}\`;
});
after(() => server.close());

test("POST /orders charges once and stores the order", async () => {
  const res = await fetch(\`\${base}/orders\`, {
    method: "POST",
    body: JSON.stringify({ items: [{ priceCents: 500, qty: 3 }], couponPct: 10 }),
  });
  assert.equal(res.status, 201);
  const order = await res.json();
  assert.equal(order.total, 1350);
  assert.equal(order.chargeId, "ch_1350");
  assert.equal(payments.charge.mock.callCount(), 1);
  assert.deepEqual(payments.charge.mock.calls[0].arguments, [1350]);
  assert.equal(await repo.count(), 1);
});

test("a bad order returns 400 and never charges the card", async () => {
  payments.charge.mock.resetCalls();
  const res = await fetch(\`\${base}/orders\`, { method: "POST", body: JSON.stringify({ items: [] }) });
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: "order has no items" });
  assert.equal(payments.charge.mock.callCount(), 0);
});`,
      },
      {
        label: "Running the suite: spec reporter, built-in coverage, and a coverage threshold that fails CI",
        tech: "bash",
        runnable: false,
        code: `# all test files (node --test finds *.test.js under test/)
node --test --test-reporter=spec

# coverage report (still behind an experimental flag)
node --test --experimental-test-coverage --test-reporter=spec

# fail the run (exit code 1) if line coverage drops below 100%
node --test --experimental-test-coverage --test-coverage-lines=100
# -> Error: 98.99% line coverage does not meet threshold of 100%.`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the purpose of a reverse proxy (e.g., Nginx) in front of a Node.js application?",
    seoDescription:
      "A reverse proxy handles TLS, load balancing, static files, buffering and limits for Node. Verified: round-robin, slow-client buffering, trust proxy.",
    description: `**Question presented to candidate:**
"In production we run our Node.js API behind Nginx. Why bother? What does the reverse proxy actually do that Node could not do itself, and what do you have to configure in the Node app so the two work together correctly?"

**What a strong answer should cover:**
- Definition: a **reverse proxy** accepts client connections on behalf of one or more backend servers and forwards requests to them; clients only ever see the proxy. (A forward proxy is the opposite: it acts for clients.)
- The jobs it takes off Node: **TLS termination**, **load balancing** across several Node processes or machines (with health checks and failover), serving **static files** and **caching**, **gzip/brotli compression**, request **size limits**, rate and connection limits, and **buffering slow clients** so a slow upload does not hold a Node connection open.
- Why Node benefits: Node runs your JavaScript on one main thread per process, so time spent on bytes, crypto and slow sockets is time not spent on application logic; a dedicated proxy is built and hardened for exactly those jobs.
- The app-side contract: behind a proxy, \`req.socket.remoteAddress\` is the proxy, so the real client IP and scheme arrive in \`X-Forwarded-For\` / \`X-Forwarded-Proto\`. Only trust those headers from your own proxy hops (Express \`trust proxy\` set to a hop count or the proxy's address, never blindly \`true\`).
- Timeouts must line up: Node's \`keepAliveTimeout\` (5 s by default) should be longer than the proxy's or load balancer's idle timeout, or the proxy reuses a socket Node just closed and returns 502s.
- Trade-offs: one more hop and one more thing to configure and monitor; on a cloud platform a managed load balancer or Kubernetes ingress often plays this role instead of a hand-run Nginx.

**Clarifying questions expected:**
- "Is there already a cloud load balancer or ingress controller in front of the service, or is Nginx the only edge?"
- "Do we need WebSockets or large uploads? Both change the proxy's buffering and timeout settings."

**Code / implementation expected:** Optional: an Nginx \`upstream\` + \`location\` block with the forwarded headers, and the matching Express \`trust proxy\` setting.`,
    answer: `**Target Audience:** Backend engineers who deploy Node.js services and want to explain the edge of the system, not just the app.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> for the precise vocabulary. Nginx is not installed on the machine used for this doc, so the proxy behaviour was demonstrated with a small reverse proxy written with Node's own \`http\` module, and the Express \`trust proxy\` behaviour with Express 4.22.3. Those were run on Node v22.22.0 and their output is quoted exactly. The Nginx configuration in section 6 is the standard shape from the Nginx docs and was **not** executed here.

## 1. Why This Even Matters — A Story First

A big hotel does not let guests walk straight into the kitchen or the cleaning staff's rooms. Everyone comes through the **front desk**.

The front desk checks who you are, hands out room keys, sends the luggage straight up without bothering the chef, spreads the work across whichever staff member is free, and quietly redirects people when one of them is off sick. The chef never deals with a guest who takes twenty minutes to decide what they want; the desk waits, writes the order down, and passes it on complete.

Nginx is that front desk. Your Node.js app is the chef: very good at the one thing that is unique to your business, and much better off when somebody else handles the doorway.

## 2. What a Reverse Proxy Is

📌 **Interview term: reverse proxy** — a server that accepts client connections and forwards each request to one of several **upstream** (backend) servers, then relays the response back. The client only ever talks to the proxy; it does not know how many backends there are or where they live. Nginx, HAProxy, Envoy, Caddy, Traefik and cloud load balancers all play this role.

📌 **Interview term: forward proxy** — the opposite direction: it acts on behalf of **clients** (a corporate proxy that employees browse through). A reverse proxy acts on behalf of **servers**.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="Clients connect over HTTPS to a reverse proxy, which serves static files itself and forwards API requests over plain HTTP to two Node app instances">
  <defs>
    <marker id="rp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="95" width="120" height="56" rx="8"/>
  <text class="d-text" x="80" y="120" text-anchor="middle">clients</text>
  <text class="d-sub" x="80" y="138" text-anchor="middle">browsers, apps</text>
  <path class="d-edge" d="M 140 123 L 236 123" marker-end="url(#rp-arrow)"/>
  <text class="d-sub" x="188" y="110" text-anchor="middle">HTTPS</text>
  <rect class="d-box-accent" x="240" y="70" width="170" height="106" rx="10"/>
  <text class="d-text d-accent" x="325" y="98" text-anchor="middle">reverse proxy</text>
  <text class="d-sub" x="325" y="120" text-anchor="middle">TLS, static files</text>
  <text class="d-sub" x="325" y="138" text-anchor="middle">buffering, limits</text>
  <text class="d-sub" x="325" y="156" text-anchor="middle">load balancing</text>
  <path class="d-edge-accent" d="M 410 100 L 476 62" marker-end="url(#rp-arrow)"/>
  <path class="d-edge-accent" d="M 410 146 L 476 184" marker-end="url(#rp-arrow)"/>
  <rect class="d-box" x="480" y="30" width="140" height="50" rx="8"/>
  <text class="d-text" x="550" y="52" text-anchor="middle">Node app A</text>
  <text class="d-sub" x="550" y="70" text-anchor="middle">plain HTTP</text>
  <rect class="d-box" x="480" y="166" width="140" height="50" rx="8"/>
  <text class="d-text" x="550" y="188" text-anchor="middle">Node app B</text>
  <text class="d-sub" x="550" y="206" text-anchor="middle">plain HTTP</text>
</svg>

The app instances are usually reachable only from the proxy, on a private network or \`localhost\`, so the proxy is the single public entry point.

## 3. The Jobs It Takes Off Node

Node runs your JavaScript on **one main thread per process**. Everything that thread spends on encryption, gzip, pushing static bytes or babysitting slow sockets is time it is not spending on your business logic. A dedicated proxy is written in C, built for exactly these jobs, and hardened by years of facing the open internet.

| Job | What the proxy does | Why not in Node |
| :--- | :--- | :--- |
| **TLS termination** | Decrypts HTTPS, forwards plain HTTP inside the private network | One place to manage and renew certificates for every service; see [HTTPS/TLS in Node](/interview-question/how-does-node-js-support-https-tls-for-secure-servers) for when Node should terminate TLS itself |
| **Load balancing** | Spreads requests across several Node processes or machines, skips dead ones | One Node process uses one core for JavaScript; you scale by running more of them ([horizontal scaling](/interview-question/what-is-the-difference-between-horizontal-and-vertical-scaling-for-a-node-js-app)) |
| **Static files and caching** | Serves images, JS bundles and cached responses straight from disk or memory | No JavaScript needs to run to send a file |
| **Compression** | gzip / brotli of responses | CPU work that would otherwise run in your process; see [compression in Node](/interview-question/how-do-you-enable-gzip-brotli-compression-for-http-responses) |
| **Buffering slow clients** | Reads the whole request (and response) at network speed, then talks to Node at LAN speed | A slow phone upload would otherwise hold a Node connection open the whole time |
| **Limits and filtering** | Max body size, rate and connection limits, blocking bad paths | Rejects abuse before it costs Node anything; app-level [rate limiting](/interview-question/how-do-you-implement-rate-limiting-in-a-node-js-express-application) still has a place for per-user rules |
| **Zero-downtime deploys** | Drains one backend while others keep serving | Pairs with [graceful shutdown](/interview-question/how-do-you-handle-graceful-shutdown-in-a-node-js-application) in the app |
| **Hiding the topology** | Clients see one hostname and port | Backends can move, scale and change without clients noticing |

📌 **Interview term: TLS termination** — the point where HTTPS is decrypted. "Terminating at the proxy" means the proxy holds the certificate and the private key, and the hop to Node is plain HTTP (or re-encrypted if the internal network is not trusted).

📌 **Interview term: upstream** — Nginx's word for the group of backend servers it forwards to.

## 4. Verified: A Tiny Reverse Proxy, Built With Node

To show the mechanics without Nginx, \`proxy-demo.js\` (full code in the examples) starts two identical app instances and a ~40-line proxy in front of them. The proxy:

- serves \`/static/*\` itself,
- **buffers** the full request body before choosing a backend,
- picks backends **round-robin**,
- appends the real peer address to \`X-Forwarded-For\` and sets \`X-Forwarded-Proto: https\`,
- **retries the next backend** if one refuses the connection.

Each app instance replies with what it saw, including \`busyMs\`: how long the request held the app between arriving and finishing its body.

~~~js
// The heart of the proxy: buffer first, then forward
const server = http.createServer(async (req, res) => {
  if (req.url.startsWith("/static/")) return res.end("static file from proxy\\n");
  const chunks = [];
  for await (const c of req) chunks.push(c);           // BUFFER the whole body first
  const port = upstreams[next++ % upstreams.length];   // round-robin load balancing
  forward(port, req, Buffer.concat(chunks), res, upstreams.length - 1);
});
~~~

The slow client sends a 30-byte body **one byte every 50 ms**, like a phone on a bad connection. Running \`node proxy-demo.js\` printed:

~~~
1) Round-robin across two app instances:
   app-A
   app-B
   app-A
   app-B
2) Static files never reach Node:
   static file from proxy
3) What the app sees about the client:
   direct, spoofed header : { socketPeer: '127.0.0.1', xff: '6.6.6.6' }
   via proxy, spoofed     : { socketPeer: '127.0.0.1', xff: '6.6.6.6, 127.0.0.1', proto: 'https' }
4) Slow client (30 bytes at 50 ms/byte):
   direct to app   -> app busy for 1501 ms
   through proxy   -> app busy for 0 ms
5) One app instance dies:
   app-A
  proxy: upstream :39023 failed (ECONNREFUSED), retrying next upstream
   app-A
~~~

What each section shows:

1. **Load balancing**: requests alternate A, B, A, B.
2. **Static offload**: the app never saw the \`/static/\` request.
3. **Client identity**: the app always sees the **proxy** as its TCP peer (\`127.0.0.1\`). The real client address only survives in \`X-Forwarded-For\`, and a client can put anything it likes in that header: here \`6.6.6.6\` arrived unchanged, with the proxy's real observation appended after it. Section 5 below is about reading that header safely.
4. **Slow-client buffering**: talking to the app directly, the slow upload held it for **1501 ms** (a second run gave 1462 ms). Through the buffering proxy, the app received the complete body at once and was busy for **0 ms** (1 ms on the second run). With thousands of slow clients, that is the difference between a few open connections on Node and thousands.
5. **Failover**: after app B was shut down, the proxy got \`ECONNREFUSED\`, retried app A, and the client still got an answer.

📌 **Interview term: request buffering** — the proxy reads the client's request body completely before opening the upstream request. Nginx does this by default (\`proxy_request_buffering on\`) and buffers responses too (\`proxy_buffering on\`), so slow readers do not hold Node either.

📌 **Interview term: slowloris** — an attack that opens many connections and sends headers or body extremely slowly to tie up the server. A buffering proxy absorbs it; Node's own defence is its server timeouts (see section 7).

## 5. Verified: Trusting Forwarded Headers Correctly

Behind a proxy, the app needs \`X-Forwarded-For\` to log the client IP, rate-limit per IP, or check geography, and \`X-Forwarded-Proto\` to know the original request was HTTPS (for secure cookies and redirects). But the header is only as trustworthy as the hop that wrote it.

📌 **Interview term: \`X-Forwarded-For\` (XFF)** — a comma-separated list of addresses; each proxy **appends** the address it saw. The **leftmost** entry is whatever the client claimed, so it can be forged. The entries added by **your own** proxies, counted from the right, are the ones you can trust. The standard \`Forwarded\` header (RFC 7239) carries the same information in one structured header.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 170" role="img" aria-label="The X-Forwarded-For header 6.6.6.6 then 203.0.113.7, where the left value was written by the client and can be forged and the right value was appended by your own proxy and can be trusted">
  <rect class="d-box-muted" x="60" y="40" width="230" height="60" rx="8"/>
  <text class="d-text" x="175" y="66" text-anchor="middle">6.6.6.6</text>
  <text class="d-sub" x="175" y="86" text-anchor="middle">written by the client</text>
  <rect class="d-box-accent" x="350" y="40" width="230" height="60" rx="8"/>
  <text class="d-text d-accent" x="465" y="66" text-anchor="middle">203.0.113.7</text>
  <text class="d-sub" x="465" y="86" text-anchor="middle">appended by your proxy</text>
  <text class="d-sub" x="175" y="134" text-anchor="middle">can be forged</text>
  <text class="d-sub" x="465" y="134" text-anchor="middle">trust this one, one hop</text>
</svg>

\`trust.js\` sends exactly that header, as one proxy would deliver it, to three Express apps with different \`trust proxy\` settings, and prints \`req.ip\` and \`req.protocol\`:

~~~js
app.set("trust proxy", 1);   // trust exactly one hop: our Nginx
app.get("/", (req, res) => res.json({ ip: req.ip, protocol: req.protocol }));
~~~

~~~
no trust proxy           {"ip":"127.0.0.1","protocol":"http"}
trust proxy = true       {"ip":"6.6.6.6","protocol":"https"}
trust proxy = 1 (hops)   {"ip":"203.0.113.7","protocol":"https"}
~~~

- **Not set**: Express ignores the headers. Every client looks like the proxy (\`127.0.0.1\`), so per-IP rate limiting would throttle everyone together, and \`req.protocol\` says \`http\` even though the user used HTTPS.
- **\`true\`**: Express takes the leftmost address, which the **attacker wrote**. An IP-based rate limit or allowlist is now bypassed by sending a fake header.
- **\`1\`**: Express trusts one hop from the right, the address your proxy actually saw. This is correct when exactly one proxy sits in front. Use the real hop count, or a list of your proxy addresses or subnets.

In plain \`http\` (no Express), the same rule applies: split the header on commas and take the entry your proxy added, never the first one.

## 6. A Typical Nginx Configuration (not executed here)

This is the standard shape, written from the Nginx documentation; it was not run on this machine because Nginx is not installed.

~~~bash
upstream node_app {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    keepalive 32;                          # reuse connections to Node
}

server {
    listen 443 ssl;
    server_name api.example.com;
    ssl_certificate     /etc/ssl/api.crt;
    ssl_certificate_key /etc/ssl/api.key;

    client_max_body_size 10m;              # reject huge bodies before Node sees them
    gzip on;

    location /static/ {
        root /srv/app/public;              # files served by Nginx, no Node involved
        expires 7d;
    }

    location / {
        proxy_pass http://node_app;
        proxy_http_version 1.1;            # needed for upstream keepalive
        proxy_set_header Connection "";
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
~~~

\`$proxy_add_x_forwarded_for\` appends the client address to whatever \`X-Forwarded-For\` arrived, which is exactly the "append" behaviour in the demo. For [WebSockets](/interview-question/how-do-you-implement-real-time-communication-with-websockets-ws-in-node-js) you also forward the \`Upgrade\` and \`Connection: upgrade\` headers and raise the read timeout. Nginx's default maximum body size is \`1m\` and request and response buffering are on by default ([Wallarm's table of Nginx defaults](https://docs.wallarm.com/installation/security-edge/inline/nginx-overrides/)), which is why large uploads usually need \`client_max_body_size\` raised on purpose.

## 7. Verified: Timeouts That Must Line Up

Reading the defaults from a fresh \`http.createServer()\` on Node v22.22.0:

~~~
{
  headersTimeout: 60000,
  requestTimeout: 300000,
  keepAliveTimeout: 5000,
  maxHeadersCount: null,
  timeout: 0
}
~~~

- \`headersTimeout\` (60 s) and \`requestTimeout\` (300 s) are Node's own guard against slow clients when nothing sits in front of it.
- \`keepAliveTimeout\` (5 s) is how long Node keeps an idle connection open. A proxy or load balancer also keeps idle connections to Node and reuses them. If Node closes an idle socket at 5 s while the proxy thinks it can reuse it for longer, a request sent on that socket fails and the client gets a **502 Bad Gateway**. The common fix is to set Node's \`keepAliveTimeout\` longer than the proxy's idle timeout, and \`headersTimeout\` a little longer still. AWS's Application Load Balancer defaults to a 60-second idle timeout, so a typical setting is about 65 s ([Flightcontrol troubleshooting guide](https://www.flightcontrol.dev/docs/troubleshooting/load-balancer-502-keepalive-timeout), [iximiuz on keep-alive and 502s](https://iximiuz.com/en/posts/reverse-proxy-http-keep-alive-and-502s/)).

~~~js
server.keepAliveTimeout = 65_000;   // longer than the load balancer idle timeout
server.headersTimeout = 66_000;     // a little longer than keepAliveTimeout
~~~

## 8. Do You Always Need Nginx?

No. The **role** is almost always needed; the specific product is a choice.

| Setup | Who plays the reverse proxy |
| :--- | :--- |
| A VM or bare server | Nginx, HAProxy or Caddy on the same machine |
| AWS / GCP / Azure | The managed load balancer (often plus a CDN for static files) |
| Kubernetes | The ingress controller (often Nginx or Envoy inside) |
| PaaS (Heroku, Render, Fly) | The platform router |
| Internal service with mutual TLS | Sometimes nobody: Node terminates TLS itself |

Running \`node server.js\` directly on port 443 works, but then Node must do TLS, compression, slow-client defence and static files itself, and you have one process using one core for JavaScript. For multiple processes on one machine, Node's [cluster module](/interview-question/explain-how-clustering-works-in-node-js) or [PM2](/interview-question/what-is-pm2-and-what-does-it-add-over-running-node-server-js-directly) can share a port, but they do not give you TLS management, caching or buffering.

## 9. Common Pitfalls

- **\`trust proxy\` set to \`true\`.** As shown above, Express then believes the leftmost, client-written address. Set it to the hop count or your proxy addresses.
- **Not setting \`trust proxy\` at all.** Every request seems to come from the proxy, so per-IP rate limits throttle all users together and \`req.secure\` is false, which breaks secure cookies and HTTPS redirects.
- **Node's \`keepAliveTimeout\` shorter than the proxy idle timeout.** Produces rare, hard-to-reproduce 502s under load. Make Node's the longer one.
- **Leaving the Node port open to the internet.** If clients can reach port 3000 directly, they skip TLS, limits and header rewriting, and can forge \`X-Forwarded-For\` freely. Bind Node to \`127.0.0.1\` or a private network.
- **Forgetting the proxy for WebSockets and uploads.** Without the \`Upgrade\` headers WebSockets fail; with the default \`1m\` body limit large uploads get a 413 from Nginx, not from Node.
- **Assuming the proxy makes the app secure.** It filters the edge; it does not validate input, check authorisation, or fix injection bugs inside the app.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it:</strong> <span style="color:#f0e2c8;">"A reverse proxy like Nginx accepts every client connection and forwards requests to one or more Node processes. Clients only ever see the proxy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. List the jobs:</strong> <span style="color:#f0e2c8;">"It terminates TLS, load-balances across Node instances and skips dead ones, serves static files and caches, compresses, enforces body-size and rate limits, and buffers slow clients."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Explain why Node benefits:</strong> <span style="color:#f0e2c8;">"Node runs JavaScript on one main thread per process. Time spent on TLS, gzip or slow sockets is time not spent on business logic. In my demo a slow upload held the app for 1.5 seconds directly and 0 ms behind a buffering proxy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cover the app-side contract:</strong> <span style="color:#f0e2c8;">"Behind the proxy the socket peer is the proxy, so the real client IP and scheme come in <code style="background:#332310;color:#ffca28;">X-Forwarded-For</code> and <code style="background:#332310;color:#ffca28;">X-Forwarded-Proto</code>. In Express I set <code style="background:#332310;color:#ffca28;">trust proxy</code> to the hop count, never <code style="background:#332310;color:#ffca28;">true</code>, because <code style="background:#332310;color:#ffca28;">true</code> trusts the client-written leftmost address."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Mention timeouts and trade-offs:</strong> <span style="color:#f0e2c8;">"Node keepAliveTimeout defaults to 5 seconds and must be longer than the proxy idle timeout, or you get random 502s. On cloud platforms a managed load balancer or ingress often plays this role instead of a hand-run Nginx."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just run Node directly on port 443?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can, and for an internal service with mutual TLS that is sometimes right. But then Node does TLS, compression, slow-client defence and static files itself, certificates are managed per service, and one process uses one core for JavaScript. A proxy centralises certificates, spreads load across several processes, and absorbs slow or abusive clients before they cost Node anything.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the app get the real client IP?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From <code style="background:#332310;color:#ffca28;">X-Forwarded-For</code>, which each proxy appends to. The leftmost entry is whatever the client sent, so it can be forged. You trust only the entries your own proxies added, counted from the right. In Express that is <code style="background:#332310;color:#ffca28;">app.set("trust proxy", 1)</code> for one proxy, or a list of proxy subnets. I tested it: with <code style="background:#332310;color:#ffca28;">true</code>, <code style="background:#332310;color:#ffca28;">req.ip</code> became the attacker value <code style="background:#332310;color:#ffca28;">6.6.6.6</code>; with <code style="background:#332310;color:#ffca28;">1</code> it was the real client.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Users see random 502 errors only under load. What do you check?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The keep-alive mismatch first. The proxy or load balancer reuses idle connections to Node; Node closes idle sockets after <code style="background:#332310;color:#ffca28;">keepAliveTimeout</code>, 5 seconds by default. If the proxy idle timeout is longer, it sometimes sends a request on a socket Node just closed. Set <code style="background:#332310;color:#ffca28;">server.keepAliveTimeout</code> above the proxy timeout, for example 65 seconds behind an AWS ALB with its 60 second default, and <code style="background:#332310;color:#ffca28;">headersTimeout</code> slightly higher still.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for WebSockets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The proxy must forward the HTTP upgrade: in Nginx, <code style="background:#332310;color:#ffca28;">proxy_http_version 1.1</code> plus the <code style="background:#332310;color:#ffca28;">Upgrade</code> and <code style="background:#332310;color:#ffca28;">Connection: upgrade</code> headers, and a longer read timeout because WebSocket connections stay open and quiet. With several Node instances, a client stays on one instance for its connection, so broadcasts across instances need a shared channel such as Redis pub/sub.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the cluster module or PM2 a replacement for Nginx?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, they solve a different part. <code style="background:#332310;color:#ffca28;">cluster</code> and PM2 run several Node processes on one machine sharing a port, which uses more CPU cores. They do not manage certificates, serve static files, cache, buffer slow clients, or balance across machines. A common setup uses both: Nginx or a cloud load balancer at the edge, and several Node processes behind it.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reverse proxy** | Accepts client requests and forwards them to backend servers |
| **Forward proxy** | Acts on behalf of clients, the opposite direction |
| **Upstream** | The group of backend servers a proxy forwards to |
| **TLS termination** | The place where HTTPS is decrypted |
| **Load balancing** | Spreading requests across several backends |
| **Request buffering** | Reading the full request before passing it on |
| **Slowloris** | An attack that ties up servers with very slow connections |
| **X-Forwarded-For** | Header listing client and proxy addresses, appended per hop |
| **trust proxy** | Express setting for which hops may set forwarded headers |
| **keepAliveTimeout** | How long Node keeps an idle connection open (5 s by default) |

---
**Conclusion:** A reverse proxy is the front desk for your Node.js service: it holds the TLS certificate, spreads traffic across several Node processes and skips dead ones, serves static files, compresses responses, enforces size and rate limits, and buffers slow clients so Node only ever sees complete requests. The demo above showed each of those in action: alternating backends, static files that never touched the app, a slow upload that held the app for about 1.5 s directly but 0 ms through the proxy, and transparent failover when one instance died. The price is that the app no longer sees the client directly, so it must read \`X-Forwarded-For\` and \`X-Forwarded-Proto\` from trusted hops only (\`trust proxy\` set to the hop count, not \`true\`, which handed an attacker-written IP to \`req.ip\` in the test), and its keep-alive timeout must outlast the proxy's to avoid 502s.`,
    examples: [
      {
        label: "A minimal reverse proxy with node:http: round-robin, static offload, X-Forwarded-For, slow-client buffering, failover",
        tech: "javascript",
        runnable: false,
        code: `// A tiny reverse proxy built only with node:http, to show what Nginx does for you.
const http = require("node:http");
const net = require("node:net");

// ── Two identical app instances ("upstreams") ──────────────────────────────
function startBackend(name) {
  const server = http.createServer(async (req, res) => {
    const t0 = Date.now();
    let body = "";
    for await (const chunk of req) body += chunk;        // read the request body
    const busyMs = Date.now() - t0;                      // how long this request held the app
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({
      servedBy: name,
      socketPeer: req.socket.remoteAddress,              // who opened the TCP connection
      xff: req.headers["x-forwarded-for"] ?? null,
      proto: req.headers["x-forwarded-proto"] ?? null,
      bodyBytes: body.length,
      busyMs,
    }));
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r(server)));
}

// ── The reverse proxy ──────────────────────────────────────────────────────
function startProxy(upstreams) {
  let next = 0;
  const forward = (port, req, body, res, attemptsLeft) => {
    const up = http.request({
      host: "127.0.0.1", port, method: req.method, path: req.url,
      headers: {
        ...req.headers,
        // Append the real peer address, like Nginx $proxy_add_x_forwarded_for
        "x-forwarded-for": [req.headers["x-forwarded-for"], req.socket.remoteAddress].filter(Boolean).join(", "),
        "x-forwarded-proto": "https",                    // TLS would be terminated here
        "content-length": Buffer.byteLength(body),
      },
    }, (upRes) => { res.writeHead(upRes.statusCode, upRes.headers); upRes.pipe(res); });
    up.on("error", (err) => {                            // upstream down: try the next one
      if (attemptsLeft > 0) {
        console.log(\`  proxy: upstream :\${port} failed (\${err.code}), retrying next upstream\`);
        return forward(upstreams[next++ % upstreams.length], req, body, res, attemptsLeft - 1);
      }
      res.writeHead(502).end("bad gateway");
    });
    up.end(body);
  };
  const server = http.createServer(async (req, res) => {
    if (req.url.startsWith("/static/")) {                // served by the proxy, app never sees it
      return res.end("static file from proxy\\n");
    }
    const chunks = [];
    for await (const c of req) chunks.push(c);           // BUFFER the whole body first
    const port = upstreams[next++ % upstreams.length];   // round-robin load balancing
    forward(port, req, Buffer.concat(chunks), res, upstreams.length - 1);
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r(server)));
}

// ── A deliberately slow client: sends a 30-byte body one byte every 50 ms ─
function slowPost(port) {
  return new Promise((resolve) => {
    const sock = net.connect(port, "127.0.0.1", async () => {
      const body = "x".repeat(30);
      sock.write(\`POST /upload HTTP/1.1\\r\\nHost: x\\r\\nContent-Length: \${body.length}\\r\\nConnection: close\\r\\n\\r\\n\`);
      for (const ch of body) { sock.write(ch); await new Promise((r) => setTimeout(r, 50)); }
    });
    let raw = "";
    sock.on("data", (d) => (raw += d));
    sock.on("end", () => resolve(JSON.parse(raw.slice(raw.indexOf("\\r\\n\\r\\n") + 4))));
  });
}

const get = (port, path, headers = {}) =>
  fetch(\`http://127.0.0.1:\${port}\${path}\`, { headers }).then((r) => r.text());

(async () => {
  const a = await startBackend("app-A");
  const b = await startBackend("app-B");
  const proxy = await startProxy([a.address().port, b.address().port]);
  const P = proxy.address().port;

  console.log("1) Round-robin across two app instances:");
  for (let i = 0; i < 4; i++) console.log("  ", JSON.parse(await get(P, "/api")).servedBy);

  console.log("2) Static files never reach Node:");
  console.log("  ", (await get(P, "/static/logo.png")).trim());

  console.log("3) What the app sees about the client:");
  const direct = JSON.parse(await get(a.address().port, "/api", { "x-forwarded-for": "6.6.6.6" }));
  console.log("   direct, spoofed header :", { socketPeer: direct.socketPeer, xff: direct.xff });
  const viaProxy = JSON.parse(await get(P, "/api", { "x-forwarded-for": "6.6.6.6" }));
  console.log("   via proxy, spoofed     :", { socketPeer: viaProxy.socketPeer, xff: viaProxy.xff, proto: viaProxy.proto });

  console.log("4) Slow client (30 bytes at 50 ms/byte):");
  const slowDirect = await slowPost(a.address().port);
  console.log("   direct to app   -> app busy for", slowDirect.busyMs, "ms");
  const slowProxied = await slowPost(P);
  console.log("   through proxy   -> app busy for", slowProxied.busyMs, "ms");

  console.log("5) One app instance dies:");
  await new Promise((r) => b.close(r));
  for (let i = 0; i < 2; i++) console.log("  ", JSON.parse(await get(P, "/api")).servedBy);

  a.close(); proxy.close();
})();`,
      },
      {
        label: "Express trust proxy: false vs true vs 1 hop, with a spoofed X-Forwarded-For",
        tech: "javascript",
        runnable: false,
        code: `const express = require("express");
const http = require("node:http");

function appWith(trust) {
  const app = express();
  if (trust !== undefined) app.set("trust proxy", trust);
  app.get("/", (req, res) => res.json({ ip: req.ip, protocol: req.protocol }));
  return app;
}
const ask = (port, xff) => new Promise((resolve) => {
  http.get({ port, path: "/", headers: { "x-forwarded-for": xff, "x-forwarded-proto": "https" } },
    (res) => { let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => resolve(d)); });
});

(async () => {
  // Header as the app receives it behind ONE proxy that appended the real client 203.0.113.7,
  // after the attacker had already put a fake 6.6.6.6 in the header.
  const xff = "6.6.6.6, 203.0.113.7";
  for (const [label, trust] of [["no trust proxy", undefined], ["trust proxy = true", true], ["trust proxy = 1 (hops)", 1]]) {
    const server = appWith(trust).listen(0);
    await new Promise((r) => server.once("listening", r));
    console.log(label.padEnd(24), await ask(server.address().port, xff));
    server.close();
  }
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you prevent prototype pollution vulnerabilities in a Node.js application?",
    seoDescription:
      "Stop prototype pollution with allowlist validation, safe merges, Map or null-prototype objects and audits. Verified: what pollutes and what blocks it.",
    description: `**Question presented to candidate:**
"A security scan flags a prototype pollution issue in our Node.js API. Walk me through how the attack actually works end to end, where in a typical codebase it can come from, and the layers of defence you would put in place so it cannot happen again, not just a patch for this one bug."

**What a strong answer should cover:**
- The three parts of an exploit: a **source** (attacker-controlled keys from JSON bodies, query strings, YAML, config), a **sink** that walks or assigns keys without checks (deep merge, deep clone, path setters like \`set(obj, "a.b.c", v)\`, \`Object.assign\` in some cases), and a **gadget** (code that reads a property it never set, such as \`if (user.isAdmin)\` or an \`options.shell\` default) that turns the polluted value into impact.
- Precise facts: \`JSON.parse\` alone does **not** pollute (it creates an own \`"__proto__"\` key); the damage happens when a sink later assigns through it. The \`constructor.prototype\` path reaches \`Object.prototype\` without the word \`__proto__\` at all, so a blocklist must cover \`__proto__\`, \`constructor\` and \`prototype\`.
- Defence in depth: **validate at the boundary** with an allowlist schema that rejects unknown keys (zod / joi / JSON Schema); **safe sinks** (own keys only, skip the three dangerous keys, use maintained libraries); **safe data structures** (\`Map\`, \`Object.create(null)\`) for attacker-chosen keys; **gadget hardening** with \`Object.hasOwn\` and null-prototype option objects.
- Runtime hardening and its limits: \`node --disable-proto=delete|throw\` removes the \`__proto__\` accessor but does **not** stop \`constructor.prototype\`; \`Object.freeze(Object.prototype)\` blocks writes but can break code that assigns to inherited names.
- Supply chain: many real cases were in dependencies (old \`lodash.merge\`, CVE-2018-3721); \`npm audit\` in CI, a lockfile, and regular updates. Add regression tests that send \`__proto__\` and \`constructor.prototype\` payloads.

**Clarifying questions expected:**
- "Is the flagged code our own helper or a dependency, and which inputs reach it (body, query, headers, config files)?"
- "Is there a validation layer at the API boundary today, and does it reject unknown keys or pass them through?"

**Code / implementation expected:** Yes: a vulnerable merge shown polluting \`Object.prototype\`, then a fixed version, plus at least one boundary or runtime defence.`,
    answer: `**Target Audience:** Backend engineers who know what a prototype is and need to defend a real Node.js codebase, including its dependencies.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> for the precise vocabulary. Every attack and defence below was run on Node v22.22.0. Library behaviour was tested against real packages installed in a scratch folder: lodash 4.17.4 and 4.18.1, qs 6.16.1, zod 4.6.7, and \`npm audit\` against the registry. Output blocks are copied from those runs. For a shorter introduction to the attack itself, see [What is prototype pollution and how do you prevent it in Node.js?](/interview-question/what-is-prototype-pollution-and-how-do-you-prevent-it-in-node-js); this doc is about preventing it across a whole application.

## 1. Why This Even Matters — A Story First

Picture an office where every desk has a little card of personal settings, and the wall by the door has one big poster called **"House defaults"**. If your card does not say something, you follow the poster. Nobody ever looks at the poster closely, because everyone's card usually says enough.

Now someone slips in and adds one line to the poster: "Everyone may open the safe." Nobody's personal card mentions the safe, so suddenly **everyone** may open it, including people hired tomorrow. Nothing on any desk changed.

In JavaScript, \`Object.prototype\` is the poster. Every plain object \`{}\` falls back to it for any property it does not have itself. Prototype pollution is getting a write onto that poster. Preventing it is about three questions: how could anyone reach the poster, what code reads from it, and how do you lock it down.

## 2. The Three Ingredients of a Real Exploit

📌 **Interview term: prototype chain** — when you read \`obj.x\` and \`obj\` has no own \`x\`, JavaScript looks at \`Object.getPrototypeOf(obj)\`, then its prototype, and so on. For a plain object the chain is just \`Object.prototype\`, shared by every plain object in the process.

📌 **Interview term: \`__proto__\` accessor** — a getter/setter defined on \`Object.prototype\`. Assigning \`obj.__proto__ = value\` does not create a property; it **changes the prototype**, and reading \`obj.__proto__\` returns the shared prototype itself. That is the door most attacks use.

An exploit needs all three of these:

📌 **Interview term: source** — where attacker-controlled **keys** come in: JSON request bodies, query strings like \`?a[__proto__][x]=1\`, YAML or config files, form fields, message queue payloads.

📌 **Interview term: sink** — code that walks or assigns keys taken from the source **without checking them**: recursive merge, deep clone, deep defaults, path setters like \`set(obj, "a.b.c", value)\`.

📌 **Interview term: gadget** — ordinary code elsewhere that reads a property it never set and makes a decision with it: \`if (user.isAdmin)\`, \`opts.escapeHtml ?? true\`, \`config.shell\`. The gadget is what turns "an extra property exists" into "authorisation bypass" or worse.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="Attacker keys from a source flow into a sink such as a deep merge, which writes onto Object.prototype, and a gadget elsewhere then reads the polluted value">
  <defs>
    <marker id="pp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="16" y="40" width="130" height="64" rx="8"/>
  <text class="d-text" x="81" y="66" text-anchor="middle">source</text>
  <text class="d-sub" x="81" y="86" text-anchor="middle">JSON, query</text>
  <path class="d-edge" d="M 146 72 L 180 72" marker-end="url(#pp-arrow)"/>
  <rect class="d-box" x="184" y="40" width="130" height="64" rx="8"/>
  <text class="d-text" x="249" y="66" text-anchor="middle">sink</text>
  <text class="d-sub" x="249" y="86" text-anchor="middle">deep merge, set</text>
  <path class="d-edge-accent" d="M 314 72 L 348 72" marker-end="url(#pp-arrow)"/>
  <rect class="d-box-accent" x="352" y="40" width="130" height="64" rx="8"/>
  <text class="d-text d-accent" x="417" y="66" text-anchor="middle">prototype</text>
  <text class="d-sub" x="417" y="86" text-anchor="middle">shared by all</text>
  <path class="d-edge-accent" d="M 482 72 L 516 72" marker-end="url(#pp-arrow)"/>
  <rect class="d-box" x="520" y="40" width="104" height="64" rx="8"/>
  <text class="d-text" x="572" y="66" text-anchor="middle">gadget</text>
  <text class="d-sub" x="572" y="86" text-anchor="middle">user.isAdmin</text>
  <rect class="d-box-muted" x="16" y="140" width="298" height="50" rx="8"/>
  <text class="d-sub" x="165" y="170" text-anchor="middle">break here: validate keys, safe sinks</text>
  <rect class="d-box-muted" x="352" y="140" width="272" height="50" rx="8"/>
  <text class="d-sub" x="488" y="170" text-anchor="middle">break here: own-property reads</text>
</svg>

Remove any one link and the exploit fails. Good defence removes several, so a mistake in one layer is caught by another.

## 3. Verified: Which Operations Are Actually Sinks?

A common misconception is that \`JSON.parse\` is the problem. \`vectors.js\` feeds the same \`__proto__\` payload through six common operations and checks whether a brand-new \`{}\` has gained a \`polluted\` property:

~~~
JSON.parse own keys: [ '__proto__' ] | proto changed: false
1. JSON.parse alone                          safe
spread own keys: [ '__proto__' ] | proto changed: false
2. { ...parsed }                             safe
Object.assign: assigned.polluted = yes | own keys: []
3. Object.assign({}, parsed)  (global)       safe
4. naive deep merge, __proto__ key           POLLUTED -> via merge
5. naive deep merge, constructor.prototype   POLLUTED -> via constructor.prototype
6. setPath(obj, "__proto__.polluted")        POLLUTED -> via path setter
~~~

What this shows:

1. **\`JSON.parse\` is safe on its own.** It creates an ordinary **own** property literally named \`"__proto__"\`. The prototype is untouched. It is a loaded gun, not a shot.
2. **Object spread is safe.** Spread defines properties, so \`"__proto__"\` stays an ordinary own key.
3. **\`Object.assign\` is a local sink.** It **assigns** each key, so \`target.__proto__ = {polluted: "yes"}\` runs the setter and replaces the **target's own prototype**. The global prototype was not touched, but \`assigned.polluted\` now reads \`"yes"\` with no own keys at all. Any gadget reading that one object is fooled.
4. **A naive recursive merge is a global sink.** Reading \`target["__proto__"]\` returns \`Object.prototype\` itself, and the merge then writes into it.
5. **\`constructor.prototype\` needs no \`__proto__\` at all.** \`({}).constructor\` is \`Object\`, and \`Object.prototype\` is the shared prototype. A filter that only blocks the string \`"__proto__"\` misses this.
6. **Path setters are sinks too.** Any \`set(obj, path, value)\` that splits on dots and walks the path will walk straight into \`__proto__\`.

📌 **Interview term: define vs. assign semantics** — "define" (spread, \`Object.defineProperty\`, \`JSON.parse\`, \`structuredClone\`) creates an own property even for the name \`__proto__\`; "assign" (\`obj[key] = v\`, \`Object.assign\`) goes through setters, including the \`__proto__\` setter. Sinks are almost always assign-based.

## 4. Verified: Gadgets Turn Pollution Into Impact

\`gadgets.js\` simulates what a polluting merge would do, then calls ordinary-looking code:

~~~js
function canDelete(user) { return user.isAdmin === true; }
function render(opts = {}) { return opts.escapeHtml === false ? "raw" : "escaped"; }
function canDeleteSafe(user) { return Object.hasOwn(user, "isAdmin") && user.isAdmin === true; }
~~~

~~~
before: canDelete(alice) = false | render() = escaped
after : canDelete(alice) = true | render() = raw
after : canDeleteSafe(alice) = false
child_process with polluted env/shell -> not injected
~~~

- \`alice\` was never touched, yet \`canDelete(alice)\` flipped to \`true\`: an **authorisation bypass**.
- \`render()\` with default options turned off HTML escaping: a pollution-to-**XSS** chain.
- \`canDeleteSafe\`, which reads only an **own** property via \`Object.hasOwn\`, was not fooled.
- On Node v22.22.0, \`execFileSync\` did **not** pick up a polluted \`env\` or \`shell\` option in this test. That is only one test on one version, not a guarantee. Research has found real code-execution gadgets in Node.js core APIs: the USENIX Security 2023 paper *Silent Spring* reports 11 universal gadgets in Node core and eight exploited RCE cases in applications including the npm CLI ([USENIX](https://usenix.org/conference/usenixsecurity23/presentation/shcherbakov), [arXiv](https://arxiv.org/pdf/2207.11171)). The safe assumption is that pollution in a large app **will** find a gadget somewhere, so stop it at the source and sink.

## 5. Verified: Your Dependencies Are Sinks Too

Most real cases are in third-party code. \`libs.js\` ran the same payload through real packages:

~~~
lodash 4.17.4 _.merge       : POLLUTED
lodash 4.18.1 _.merge       : safe
lodash 4.18.1 _.set path    : safe
lodash 4.18.1 _.set ctor    : safe
qs 6.16.1 parse          : safe {"user":{"name":"ann"}}
~~~

- Old lodash \`merge\` polluted the global prototype. That is CVE-2018-3721, affecting \`merge\`, \`mergeWith\` and \`defaultsDeep\` before 4.17.5 ([GitLab advisory](https://advisories.gitlab.com/pkg/npm/lodash/CVE-2018-3721)); an incomplete fix led to a second CVE (CVE-2018-16487) fixed in 4.17.11 ([Sonatype](https://www.sonatype.com/blog/cve-2018-16487-lodash-rce-prototype-pollution)).
- Current lodash blocks both \`__proto__\` and \`constructor.prototype\` paths in \`merge\` and \`set\`.
- \`qs\` (the query-string parser behind Express 4's default \`extended\` query parser) silently dropped \`__proto__[polluted]=yes\` and \`user[__proto__][admin]=true\`.

But "the parser is safe" is not the same as "the data is safe". Through a real Express 4.22.3 app, \`GET /?a[b]=1&__proto__[polluted]=yes&a[constructor][prototype][polluted]=yes\` produced:

~~~
express 4.22.3 query parser: extended
{"query":{"a":{"b":"1","constructor":{"prototype":{"polluted":"yes"}}}},"polluted":null}
~~~

\`__proto__\` was dropped, but \`constructor.prototype\` came through as ordinary nested data. Nothing is polluted yet; pass that \`req.query\` into a naive deep merge and the payload from section 3, row 5, fires. Parsers are not a substitute for safe sinks or validation.

\`npm audit\` finds the old version immediately. Against a project with only \`lodash@4.17.4\` installed:

~~~
# npm audit report

lodash  <=4.17.23
Severity: critical
Prototype Pollution in lodash - https://github.com/advisories/GHSA-fvqr-27wr-82fm
Command Injection in lodash - https://github.com/advisories/GHSA-35jh-r3h4-6jhm
Prototype Pollution in lodash - https://github.com/advisories/GHSA-4xc9-xhrj-v574
Prototype Pollution in lodash - https://github.com/advisories/GHSA-jf85-cpcp-j695
Prototype Pollution in lodash - https://github.com/advisories/GHSA-p6mc-m468-83gw
...
fix available via \`npm audit fix\`
1 critical severity vulnerability
~~~

The lesson for the interview: the fix for one bug is a patch; the fix for the **class** of bug includes keeping dependencies audited and current, with \`npm audit --audit-level=high\` failing CI.

## 6. Verified: The Defence Layers

### Layer 1 — Validate at the boundary with an allowlist

The strongest single control: never let unknown keys into the app at all. An allowlist schema describes what **is** allowed, so \`__proto__\` and \`constructor\` are rejected without anyone having to remember them. See [request validation with zod / joi](/interview-question/how-do-you-validate-and-sanitize-request-input-zod-joi).

~~~js
const Prefs = z.strictObject({ theme: z.strictObject({ color: z.string().regex(/^[a-z]{1,20}$/) }) });
const Loose = z.object({ theme: z.object({ color: z.string() }) });
~~~

~~~
zod 4.6.7
strictObject: false Unrecognized key: "__proto__" at [theme] | Unrecognized key: "constructor" at []
object (strips): true {"theme":{"color":"red"}} own keys of theme: [ 'color' ]
~~~

\`strictObject\` **rejected** the request, naming both dangerous keys, even the one nested inside \`theme\`. A plain \`z.object\` **stripped** them and returned a clean object. Either is safe; strict is better for an API because the client learns its request was wrong. The same idea works with joi, JSON Schema (\`additionalProperties: false\`), or a hand-written check, which \`defenses.js\` also shows:

~~~
4. allowlist schema          : unexpected keys: __proto__, constructor
~~~

### Layer 2 — Make every sink safe

When you must merge or set by path with dynamic keys, the sink itself has to refuse to walk into prototypes:

~~~js
const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);
const isPlain = (v) => v !== null && typeof v === "object" &&
  [Object.prototype, null].includes(Object.getPrototypeOf(v));

function safeMerge(target, source) {
  for (const key of Object.keys(source)) {            // own enumerable keys only
    if (FORBIDDEN.has(key)) continue;                 // never walk into prototypes
    const value = source[key];
    if (isPlain(value)) {
      if (!isPlain(target[key]) || !Object.hasOwn(target, key)) target[key] = {};
      safeMerge(target[key], value);
    } else target[key] = value;
  }
  return target;
}
~~~

Three details matter: \`Object.keys\` instead of \`for...in\` (no inherited keys), all **three** forbidden names, and \`Object.hasOwn(target, key)\` before recursing so the merge never descends into an inherited object. A \`JSON.parse\` reviver can also drop the keys as the data enters:

~~~
1. safeMerge                 : safe {"theme":{"color":"red"}}
2. reviver strips keys       : {"theme":{"color":"red"}}
~~~

Better still, delete hand-rolled merge and path helpers and use one maintained library everywhere, so there is one place to patch.

### Layer 3 — Use data structures that have no prototype to pollute

When keys come from users (a dictionary of tags, headers, user ids), do not store them on a plain object:

~~~
3a. Object.create(null) dict : safe | own keys: [ '__proto__' ] | has toString: false
3b. Map                      : safe | size: 1
~~~

📌 **Interview term: null-prototype object** — \`Object.create(null)\` makes an object with **no** prototype, so \`"__proto__"\` is just an ordinary key and there is no shared object behind it. It also has no \`toString\` or \`hasOwnProperty\`, so use \`Object.hasOwn(obj, k)\` with it. A \`Map\` keeps keys completely separate from properties and is usually the cleaner choice.

### Layer 4 — Harden the gadgets

Code that makes security decisions should read **own** properties only:

- \`Object.hasOwn(user, "isAdmin")\` instead of \`user.isAdmin\` for permission checks (verified above).
- Build options with a null prototype and explicit defaults: \`const opts = { __proto__: null, escapeHtml: true, ...userOpts }\`. In an object literal, \`__proto__: null\` sets the prototype to \`null\` rather than creating a key. With a hostile \`userOpts\` parsed from \`{"__proto__": {"escapeHtml": false}, "theme": "dark"}\`:

~~~
prototype is null: true | escapeHtml: true | keys: [ 'escapeHtml', '__proto__', 'theme' ]
~~~

  The default held, and the attacker's \`__proto__\` became a harmless own key (spread defines, it does not assign).
- Prefer \`Map\` lookups or \`switch\` statements over \`handlers[req.query.action]\`. On a plain object, \`handlers["constructor"]\` returned the \`Object\` function itself (verified: \`typeof\` was \`function\`), so a dispatch table can call something you never put in it.

### Layer 5 — Runtime hardening, and its real limits

📌 **Interview term: \`--disable-proto\`** — a Node command-line flag (added in v13.12.0 and backported to v12.17.0, per the [Node CLI docs](https://r2.nodejs.org/dist/v14.3.0/docs/api/cli.json)) that removes the \`Object.prototype.__proto__\` accessor (\`delete\`) or makes it throw \`ERR_PROTO_ACCESS\` (\`throw\`).

\`proto-flag.js\` sent both kinds of payload through a naive merge under each mode:

~~~
== node
__proto__ payload       -> proto
constructor.prototype   -> ctor
== node --disable-proto=delete
__proto__ payload       -> safe
constructor.prototype   -> ctor
== node --disable-proto=throw
__proto__ payload       -> ERR_PROTO_ACCESS Accessing Object.prototype.__proto__ has been disallowed with --disable-proto=throw
constructor.prototype   -> ctor
~~~

The flag **closed the \`__proto__\` door but not the \`constructor.prototype\` one**. It is a useful extra layer (\`NODE_OPTIONS=--disable-proto=delete\`), not a fix. Some packages use \`__proto__\` legitimately and break under \`throw\`, so test before enabling it.

📌 **Interview term: freezing \`Object.prototype\`** — \`Object.freeze(Object.prototype)\` at startup makes every write to it fail. \`freeze.js\`, in strict mode:

~~~
frozen prototype, strict mode -> TypeError: Cannot add property polluted, object is not extensible
({}).polluted = undefined
side effect -> Cannot assign to read only property 'toString' of object '#<Object>'
~~~

The pollution was blocked. But the last line is the catch: once \`Object.prototype.toString\` is frozen, **assigning** \`o.toString = ...\` on an ordinary object also fails, because JavaScript refuses to shadow a read-only inherited property by assignment. (This is often called the "override mistake".) Older libraries that patch methods by assignment break, so freezing needs a full test run before it ships.

## 7. The Defences Side by Side

| Defence | Stops \`__proto__\` | Stops \`constructor.prototype\` | Cost / limit |
| :--- | :--- | :--- | :--- |
| Allowlist schema at the boundary (zod strict) | Yes | Yes | Must cover every input path, including query and config |
| Safe merge / set (three-key blocklist, own keys) | Yes | Yes | Every hand-rolled helper must be fixed; prefer one library |
| \`Map\` / \`Object.create(null)\` for user keys | Yes | Yes | Code changes where dictionaries are built |
| \`Object.hasOwn\` in gadgets | Limits impact | Limits impact | Cannot find every gadget, especially in dependencies |
| \`--disable-proto=delete\` | Yes | **No** (verified) | Some packages rely on \`__proto__\` |
| \`Object.freeze(Object.prototype)\` | Yes | Yes | Breaks code that assigns over inherited names |
| \`npm audit\` + updates | Known library bugs | Known library bugs | Only finds already-published CVEs |

No single row covers everything with no cost, which is why the answer is layers.

## 8. Making It Stick

- **Regression tests** that post \`{"__proto__":{"isAdmin":true}}\` and \`{"constructor":{"prototype":{"isAdmin":true}}}\` to every endpoint that accepts objects, then assert \`({}).isAdmin === undefined\`.
- **Static analysis**: CodeQL ships queries for prototype-polluting assignments and merges (the *Silent Spring* research above was built on CodeQL); run such scanners in CI.
- **Code review rule**: any \`obj[key] = value\` where \`key\` comes from input needs a reason.
- **Do not "fix" by restarting.** Pollution lives in memory, so a restart clears it, and the next malicious request writes it again.

Related security topics: [common Node.js security best practices](/interview-question/what-are-some-common-security-best-practices-in-node-js-applications), [SQL injection](/interview-question/how-do-you-prevent-sql-injection-in-node-js-database-access) and [the risks of eval()](/interview-question/what-are-the-main-security-risks-of-using-the-eval-function-in-node-js).

## 9. Common Pitfalls

- **Blocking only \`"__proto__"\`.** The \`constructor.prototype\` path polluted the prototype in the test above without that word appearing anywhere. Block all three names, or better, allowlist.
- **Blaming \`JSON.parse\`.** It only creates an own key. Swapping JSON parsers does nothing if a naive merge runs afterwards; fix the sink.
- **Assuming \`Object.assign\` is harmless.** It does not pollute globally, but it does replace the target's prototype, so that object answers for properties it does not have.
- **Treating \`--disable-proto\` as the fix.** Verified above: \`constructor.prototype\` still worked under both \`delete\` and \`throw\`.
- **Using \`for...in\` in merge or copy helpers.** It also walks inherited keys, which spreads pollution further once it exists. Use \`Object.keys\` or \`Object.entries\`.
- **Patching your own helper and ignoring dependencies.** Old lodash polluted in one line. Audit the lockfile in CI and keep dependencies current.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Explain the mechanism:</strong> <span style="color:#f0e2c8;">"Prototype pollution is getting an attacker-chosen property onto <code style="background:#332310;color:#ffca28;">Object.prototype</code>, which every plain object falls back to. It needs a source of attacker keys, a sink that assigns them unchecked, and a gadget that reads the result, like <code style="background:#332310;color:#ffca28;">if (user.isAdmin)</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Be precise about sinks:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;">JSON.parse</code> alone does not pollute; it makes an own <code style="background:#332310;color:#ffca28;">__proto__</code> key. The damage comes from deep merge, deep clone or path setters, and <code style="background:#332310;color:#ffca28;">constructor.prototype</code> reaches the prototype without the word <code style="background:#332310;color:#ffca28;">__proto__</code> at all."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Lead with boundary validation:</strong> <span style="color:#f0e2c8;">"First layer: an allowlist schema at every input, such as zod <code style="background:#332310;color:#ffca28;">strictObject</code>, so unknown keys are rejected. In my test it rejected both <code style="background:#332310;color:#ffca28;">__proto__</code> and <code style="background:#332310;color:#ffca28;">constructor</code>, even nested."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Then safe code and data:</strong> <span style="color:#f0e2c8;">"Sinks skip <code style="background:#332310;color:#ffca28;">__proto__</code>, <code style="background:#332310;color:#ffca28;">constructor</code> and <code style="background:#332310;color:#ffca28;">prototype</code> and walk own keys only. User-chosen keys go in a <code style="background:#332310;color:#ffca28;">Map</code> or <code style="background:#332310;color:#ffca28;">Object.create(null)</code>. Security checks use <code style="background:#332310;color:#ffca28;">Object.hasOwn</code>. And <code style="background:#332310;color:#ffca28;">npm audit</code> in CI, because old lodash <code style="background:#332310;color:#ffca28;">merge</code> polluted in one line."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Mention hardening and its limits:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;">--disable-proto=delete</code> and freezing <code style="background:#332310;color:#ffca28;">Object.prototype</code> add depth, but I verified the flag leaves <code style="background:#332310;color:#ffca28;">constructor.prototype</code> open, and freezing breaks code that assigns over inherited names. They are layers, not the fix."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does using JSON.parse on request bodies make us vulnerable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by itself. I ran it: <code style="background:#332310;color:#ffca28;">JSON.parse('{"__proto__":{"x":1}}')</code> returns an object with an <strong style="color:#ffca28;">own</strong> key named <code style="background:#332310;color:#ffca28;">__proto__</code> and its prototype unchanged, and spreading it keeps that as an own key too. The danger is what happens next: a naive deep merge reads <code style="background:#332310;color:#ffca28;">target["__proto__"]</code>, gets <code style="background:#332310;color:#ffca28;">Object.prototype</code>, and writes into it. So the fix is in the sink and in validation, not in the JSON parser.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is blocking the __proto__ key not enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;">obj.constructor</code> is <code style="background:#332310;color:#ffca28;">Object</code> and <code style="background:#332310;color:#ffca28;">Object.prototype</code> is the shared prototype, so a payload like <code style="background:#332310;color:#ffca28;">{"constructor":{"prototype":{"isAdmin":true}}}</code> pollutes through a naive merge with no <code style="background:#332310;color:#ffca28;">__proto__</code> anywhere. I verified it, and also that <code style="background:#332310;color:#ffca28;">--disable-proto=delete</code> does not stop this path. Block all three names: <code style="background:#332310;color:#ffca28;">__proto__</code>, <code style="background:#332310;color:#ffca28;">constructor</code>, <code style="background:#332310;color:#ffca28;">prototype</code>, or better, allowlist the keys you expect.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How can pollution become remote code execution?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Through a gadget: code that reads an option it never set and passes it to something powerful, like a template compiler, <code style="background:#332310;color:#ffca28;">child_process</code> options or <code style="background:#332310;color:#ffca28;">require</code> paths. The USENIX Security 2023 paper Silent Spring found 11 such universal gadgets in Node core APIs and exploited RCE in apps including the npm CLI. In my test on Node 22, <code style="background:#332310;color:#ffca28;">execFileSync</code> did not pick up a polluted <code style="background:#332310;color:#ffca28;">env</code>, but one negative test proves little; assume a gadget exists and stop pollution at the sink.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use Object.create(null) versus a Map?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both remove the shared prototype from the picture. A <code style="background:#332310;color:#ffca28;">Map</code> is usually better for dynamic, user-chosen keys: keys are never properties, it has <code style="background:#332310;color:#ffca28;">size</code>, keeps insertion order and accepts any key type. <code style="background:#332310;color:#ffca28;">Object.create(null)</code> is handy when the data must stay a plain object, for example it gets serialised with <code style="background:#332310;color:#ffca28;">JSON.stringify</code>, but it has no <code style="background:#332310;color:#ffca28;">hasOwnProperty</code> or <code style="background:#332310;color:#ffca28;">toString</code>, so you use <code style="background:#332310;color:#ffca28;">Object.hasOwn(obj, key)</code> with it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should we freeze Object.prototype at startup?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a strong extra layer: in my test a naive merge then threw <code style="background:#332310;color:#ffca28;">Cannot add property polluted, object is not extensible</code>. The cost is compatibility. Freezing also blocks <strong style="color:#ffca28;">assigning</strong> an own property that shadows a frozen inherited one, so <code style="background:#332310;color:#ffca28;">o.toString = ...</code> threw in strict mode. Some libraries do that, so I would only enable it after the full test suite and staging traffic pass, and never as a substitute for fixing sinks and validating input.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prototype pollution** | Writing attacker-chosen properties onto a shared prototype |
| **Prototype chain** | Where JavaScript looks when an object lacks its own property |
| **\`__proto__\` accessor** | Getter/setter on \`Object.prototype\` that reads or replaces a prototype |
| **Source** | Where attacker-controlled keys enter: body, query, config |
| **Sink** | Code that assigns those keys unchecked: merge, clone, path set |
| **Gadget** | Code that reads an unset property and acts on it |
| **Define vs. assign** | Define creates own keys; assign runs setters such as \`__proto__\` |
| **Null-prototype object** | \`Object.create(null)\`: no prototype, so nothing shared to pollute |
| **\`--disable-proto\`** | Node flag that deletes or blocks the \`__proto__\` accessor |
| **Override mistake** | Assigning over a frozen inherited property fails |

---
**Conclusion:** Prototype pollution needs a **source** of attacker keys, a **sink** that assigns them without checks, and a **gadget** that reads the result. The tests above showed that \`JSON.parse\` and spread are safe on their own, that a naive merge or path setter pollutes the whole process through either \`__proto__\` or \`constructor.prototype\`, and that an untouched \`user\` object then passed an \`isAdmin\` check. Prevention is layered: an allowlist schema at the boundary (zod \`strictObject\` rejected both dangerous keys), safe sinks that skip all three names and walk own keys only, \`Map\` or null-prototype objects for user-chosen keys, \`Object.hasOwn\` in security decisions, and \`npm audit\` plus updates for dependencies (lodash 4.17.4 polluted; 4.18.1 did not). Runtime switches help but are not the fix: \`--disable-proto\` left the \`constructor.prototype\` path open, and freezing \`Object.prototype\` blocks pollution at the cost of breaking code that assigns over inherited names.`,
    examples: [
      {
        label: "Which operations are sinks: JSON.parse, spread, Object.assign, naive merge, constructor.prototype, path setter",
        tech: "javascript",
        runnable: false,
        code: `// Where does "__proto__" in untrusted input actually become dangerous?
const reset = () => { delete Object.prototype.polluted; };
const check = (label) => { console.log(label.padEnd(44), ({}).polluted === undefined ? "safe" : "POLLUTED -> " + ({}).polluted); reset(); };

// 1. JSON.parse alone: "__proto__" becomes an ordinary OWN property.
const parsed = JSON.parse('{"__proto__": {"polluted": "yes"}}');
console.log("JSON.parse own keys:", Object.keys(parsed), "| proto changed:", Object.getPrototypeOf(parsed) !== Object.prototype);
check("1. JSON.parse alone");

// 2. Spread copies with define semantics, so it stays an own property.
const spread = { ...parsed };
console.log("spread own keys:", Object.keys(spread), "| proto changed:", Object.getPrototypeOf(spread) !== Object.prototype);
check("2. { ...parsed }");

// 3. Object.assign uses [[Set]]: the TARGET object gets a new prototype.
const assigned = Object.assign({}, parsed);
console.log("Object.assign: assigned.polluted =", assigned.polluted, "| own keys:", Object.keys(assigned));
check("3. Object.assign({}, parsed)  (global)");

// 4. A naive recursive merge walks INTO target.__proto__ (= Object.prototype).
function naiveMerge(target, source) {
  for (const key in source) {
    if (typeof source[key] === "object" && source[key] !== null) {
      if (!target[key]) target[key] = {};
      naiveMerge(target[key], source[key]);
    } else target[key] = source[key];
  }
  return target;
}
naiveMerge({}, JSON.parse('{"__proto__": {"polluted": "via merge"}}'));
check("4. naive deep merge, __proto__ key");

// 5. Same merge, no __proto__ at all: constructor.prototype reaches it too.
naiveMerge({}, JSON.parse('{"constructor": {"prototype": {"polluted": "via constructor.prototype"}}}'));
check("5. naive deep merge, constructor.prototype");

// 6. A path setter: setPath(obj, "a.b.c", v) style helpers.
function setPath(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  for (const k of keys.slice(0, -1)) cur = cur[k] ??= {};
  cur[keys.at(-1)] = value;
}
setPath({}, "__proto__.polluted", "via path setter");
check("6. setPath(obj, \\"__proto__.polluted\\")");`,
      },
      {
        label: "Gadgets and defences: Object.hasOwn checks, a safe merge, a JSON.parse reviver, Map / Object.create(null), an allowlist",
        tech: "javascript",
        runnable: false,
        code: `// ── gadgets.js ──
// A "gadget" is ordinary code that reads a property it never set.
// After pollution, the inherited value silently answers for it.
const { execFileSync } = require("node:child_process");

function canDelete(user) { return user.isAdmin === true; }            // gadget 1
function render(opts = {}) { return opts.escapeHtml === false ? "raw" : "escaped"; } // gadget 2
function canDeleteSafe(user) { return Object.hasOwn(user, "isAdmin") && user.isAdmin === true; }

const alice = { name: "alice" };
console.log("before: canDelete(alice) =", canDelete(alice), "| render() =", render());

Object.prototype.isAdmin = true;          // what a polluting merge would do
Object.prototype.escapeHtml = false;
console.log("after : canDelete(alice) =", canDelete(alice), "| render() =", render());
console.log("after : canDeleteSafe(alice) =", canDeleteSafe(alice));

// Does Node core read polluted options? child_process "shell" / "env":
Object.prototype.shell = true;
Object.prototype.env = { INJECTED: "from-prototype", PATH: process.env.PATH };
const out = execFileSync(process.execPath, ["-e", "console.log(process.env.INJECTED ?? 'not injected')"]).toString().trim();
console.log("child_process with polluted env/shell ->", out);
for (const k of ["isAdmin", "escapeHtml", "shell", "env"]) delete Object.prototype[k];

// ── defenses.js ──
const evil = '{"__proto__": {"polluted": 1}, "constructor": {"prototype": {"polluted": 2}}, "theme": {"color": "red"}}';
const status = () => { const r = ({}).polluted === undefined ? "safe" : "POLLUTED"; delete Object.prototype.polluted; return r; };

// Defense 1: a merge that only walks OWN, NON-DANGEROUS keys into PLAIN objects.
const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);
const isPlain = (v) => v !== null && typeof v === "object" &&
  [Object.prototype, null].includes(Object.getPrototypeOf(v));
function safeMerge(target, source) {
  for (const key of Object.keys(source)) {            // own enumerable keys only
    if (FORBIDDEN.has(key)) continue;                 // never walk into prototypes
    const value = source[key];
    if (isPlain(value)) {
      if (!isPlain(target[key]) || !Object.hasOwn(target, key)) target[key] = {};
      safeMerge(target[key], value);
    } else target[key] = value;
  }
  return target;
}
const merged = safeMerge({}, JSON.parse(evil));
console.log("1. safeMerge                 :", status(), JSON.stringify(merged));

// Defense 2: JSON.parse reviver that drops the dangerous keys at the door.
const clean = JSON.parse(evil, (k, v) => (FORBIDDEN.has(k) ? undefined : v));
console.log("2. reviver strips keys       :", JSON.stringify(clean));

// Defense 3: prototype-less dictionaries and Map for attacker-chosen keys.
const dict = Object.create(null);
dict["__proto__"] = { polluted: 3 };
console.log("3a. Object.create(null) dict :", status(), "| own keys:", Object.keys(dict), "| has toString:", "toString" in dict);
const m = new Map([["__proto__", { polluted: 4 }]]);
console.log("3b. Map                      :", status(), "| size:", m.size);

// Defense 4: allowlist schema — only known keys of the right type survive.
function parsePrefs(input) {
  const out = {};
  if (typeof input.theme?.color === "string" && /^[a-z]{1,20}$/.test(input.theme.color))
    out.theme = { color: input.theme.color };
  const extra = Object.keys(input).filter((k) => k !== "theme");
  if (extra.length) throw new Error("unexpected keys: " + extra.join(", "));
  return out;
}
try { parsePrefs(JSON.parse(evil)); } catch (e) { console.log("4. allowlist schema          :", e.message); }`,
      },
      {
        label: "Runtime hardening: --disable-proto=delete|throw leaves constructor.prototype open",
        tech: "javascript",
        runnable: false,
        code: `// Run three ways:
//   node proto-flag.js
//   node --disable-proto=delete proto-flag.js
//   node --disable-proto=throw proto-flag.js
function naiveMerge(t, s) { for (const k in s) { if (typeof s[k] === "object" && s[k]) { if (!t[k]) t[k] = {}; naiveMerge(t[k], s[k]); } else t[k] = s[k]; } return t; }
try {
  naiveMerge({}, JSON.parse('{"__proto__": {"polluted": "proto"}}'));
  console.log("__proto__ payload       ->", ({}).polluted ?? "safe");
} catch (e) { console.log("__proto__ payload       ->", e.code, e.message); }
delete Object.prototype.polluted;
naiveMerge({}, JSON.parse('{"constructor": {"prototype": {"polluted": "ctor"}}}'));
console.log("constructor.prototype   ->", ({}).polluted ?? "safe");`,
      },
    ],
  },

];

export default augments;
