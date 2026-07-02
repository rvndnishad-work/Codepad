/**
 * Node Phase N3 — Batch 13 (Testing, architecture & ops).
 * See node-augments-gold-1.ts for conventions.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the built-in node:test runner and how does it compare to Jest and Mocha?",
    answer: `**TL;DR.** <code>node:test</code> is Node's **built-in** test runner (stable since Node 20): no dependencies, parallel file execution, and bundled <code>node:assert</code>, **mocking**, and <code>--experimental-test-coverage</code>. Jest/Mocha add richer ecosystems (snapshots, watch UIs, huge plugin sets) at the cost of install size and config.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='node:test built-in vs Jest/Mocha ecosystems'>
  <rect class='d-box-accent' x='20' y='40' width='200' height='90' rx='10'/><text class='d-text' x='120' y='64' text-anchor='middle'>node:test</text><text class='d-sub' x='120' y='86' text-anchor='middle'>zero deps, built-in</text><text class='d-sub' x='120' y='106' text-anchor='middle'>assert + mock + coverage</text>
  <rect class='d-box-muted' x='240' y='40' width='200' height='90' rx='10'/><text class='d-text' x='340' y='64' text-anchor='middle'>Jest / Mocha</text><text class='d-sub' x='340' y='86' text-anchor='middle'>rich plugins, snapshots</text><text class='d-sub' x='340' y='106' text-anchor='middle'>more setup + deps</text>
</svg>

**How it works.** You write tests with <code>test()</code>/<code>describe()</code>/<code>it()</code> and assert with <code>node:assert</code>; run them via <code>node --test</code>, which discovers <code>*.test.js</code> files and runs them **in parallel** across processes. It includes subtests, <code>before/after</code> hooks, <code>mock.fn</code>/<code>mock.method</code>, fake timers, and TAP/spec reporters, plus built-in coverage. **Jest** bundles an opinionated all-in-one (snapshots, jsdom, powerful auto-mocking) popular in front-end stacks but heavier and with its own transform pipeline; **Mocha** is a flexible runner you pair with assertion/mocking libs. For a dependency-light backend, <code>node:test</code> is increasingly the default; choose Jest for snapshot-heavy or React projects.

### Runner comparison
| | node:test | Jest | Mocha |
| --- | --- | --- | --- |
| Install | built-in | dependency | dependency + libs |
| Mocks/coverage | built-in | built-in | add-ons |
| Snapshots | basic | strong | via plugin |
| Best for | lean backends | front-end/snapshots | flexible setups |

> **Interview tip:** Lead with **zero-dependency, parallel, batteries-included (assert/mock/coverage)** for node:test, and that Jest still wins for **snapshots/auto-mocking** in front-end-heavy projects.`,
    examples: [
      {
        label: "A node:test with mock + coverage",
        tech: "javascript",
        runnable: false,
        code: `import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

test('sends one email', () => {
  const send = mock.fn();
  notify({ send }, 'hi');
  assert.equal(send.mock.callCount(), 1);
});
// run:  node --test --experimental-test-coverage`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you mock modules, timers, and network calls in Node.js tests?",
    answer: `**TL;DR.** Use the runner's mock API (<code>mock.fn</code>, <code>mock.method</code>, <code>mock.timers</code>) or **Sinon** to replace dependencies and control time, and **nock** or undici's **MockAgent** to intercept HTTP. Mocking **isolates** the unit under test and makes async/time-dependent code **deterministic**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Real dependencies swapped for mocks around the unit under test'>
  <rect class='d-box-accent' x='160' y='52' width='140' height='46' rx='8'/><text class='d-text' x='230' y='79' text-anchor='middle'>unit under test</text>
  <rect class='d-box-muted' x='20' y='30' width='110' height='28' rx='6'/><text class='d-sub' x='75' y='49' text-anchor='middle'>HTTP → MockAgent</text>
  <rect class='d-box-muted' x='20' y='62' width='110' height='28' rx='6'/><text class='d-sub' x='75' y='81' text-anchor='middle'>time → fake timers</text>
  <rect class='d-box-muted' x='20' y='94' width='110' height='28' rx='6'/><text class='d-sub' x='75' y='113' text-anchor='middle'>dep → mock.fn</text>
  <path class='d-edge-dashed' d='M132 44 L160 64' marker-end='url(#m1)'/>
  <path class='d-edge-dashed' d='M132 76 H160' marker-end='url(#m1)'/>
  <path class='d-edge-dashed' d='M132 108 L160 88' marker-end='url(#m1)'/>
  <defs><marker id='m1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** **Function/method mocks** replace a dependency with a spy you can assert on (call count, args) and stub its return — keeping the test focused on **one** unit. **Fake timers** (<code>mock.timers</code> / Sinon) let you advance time synchronously so <code>setTimeout</code>/<code>setInterval</code>/debounce logic runs instantly and deterministically (no real waiting, no flakiness). For **network**, never hit real endpoints in tests: **nock** intercepts the <code>http</code> client and **undici's MockAgent** intercepts <code>fetch</code>, returning canned responses so tests are fast, offline, and stable. Restore mocks after each test (the runner can <code>mock.reset()</code>) to avoid leakage. Reserve real I/O for **integration** tests; mock at the boundaries for **unit** tests.

### What to mock with
| Target | Tool |
| --- | --- |
| function/method | <code>mock.fn</code>/<code>mock.method</code>, Sinon |
| timers | <code>mock.timers</code>, Sinon fake timers |
| <code>fetch</code> | undici <code>MockAgent</code> |
| <code>http</code> client | nock |

> **Interview tip:** Match tool to target (deps→mock.fn, time→fake timers, network→MockAgent/nock), stress **determinism** (control time, no real network), and **restore mocks** between tests.`,
    examples: [
      {
        label: "Fake timers + mocked fetch",
        tech: "javascript",
        runnable: false,
        code: `import { test, mock } from 'node:test';
import { MockAgent, setGlobalDispatcher } from 'undici';

test('retries after delay', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const agent = new MockAgent();
  setGlobalDispatcher(agent);
  agent.get('https://api').intercept({ path: '/x' }).reply(200, { ok: true });

  const p = fetchWithRetry('https://api/x');
  mock.timers.tick(1000);     // advance time instantly
  return p;
});`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between unit, integration, and end-to-end tests for a Node.js API?",
    answer: `**TL;DR.** **Unit** tests check one function in **isolation** with mocks (fast, many). **Integration** tests exercise several modules together — e.g. a route hitting a real (test) DB. **E2E** tests drive the **whole running system** over HTTP. The **testing pyramid** favors many fast unit tests and few slow E2E tests.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Testing pyramid: many unit, fewer integration, few e2e'>
  <path class='d-box' d='M180 30 L280 30 L320 110 L140 110 Z' fill='none'/>
  <rect class='d-box-muted' x='200' y='30' width='60' height='26' rx='4'/><text class='d-sub' x='230' y='48' text-anchor='middle'>E2E (few)</text>
  <rect class='d-box' x='180' y='58' width='100' height='24' rx='4'/><text class='d-sub' x='230' y='75' text-anchor='middle'>integration</text>
  <rect class='d-box-accent' x='150' y='84' width='160' height='24' rx='4'/><text class='d-sub' x='230' y='101' text-anchor='middle'>unit (many, fast)</text>
</svg>

**How it works.** A **unit** test isolates a function/class, mocking its collaborators (DB, network) — milliseconds each, pinpointing failures, so you write lots of them. An **integration** test verifies modules work **together** with real-ish infrastructure (a test database via Docker/Testcontainers, an in-process server) — slower, catches wiring/SQL/serialization bugs unit tests miss. An **E2E** test runs the **deployed** system and exercises real user flows over HTTP (supertest against the app, or Playwright against a running server) — slowest and most brittle but highest confidence. The **pyramid** guidance: most tests at the bottom (unit), fewer in the middle, very few at the top, so the suite stays fast and reliable while still covering real behavior. Some teams use a "testing trophy" emphasizing integration tests for APIs.

### Test levels
| Level | Scope | Speed | Count |
| --- | --- | --- | --- |
| unit | one function (mocked) | fast | many |
| integration | modules + test DB | medium | some |
| e2e | whole system over HTTP | slow | few |

> **Interview tip:** Describe the **pyramid** (many unit, few e2e) and what each catches. For APIs, note **integration tests** (route + real test DB) carry a lot of value — the "trophy" emphasis.`,
    examples: [
      {
        label: "Integration test of a route with supertest",
        tech: "javascript",
        runnable: false,
        code: `import request from 'supertest';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../app.js';      // real app + test DB

test('POST /users creates a user', async () => {
  const res = await request(app).post('/users').send({ email: 'a@b.com' });
  assert.equal(res.status, 201);
  assert.ok(res.body.id);
});`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the Repository pattern and how does it decouple business logic from the database?",
    answer: `**TL;DR.** The **Repository pattern** hides data access behind an **interface** (e.g. <code>UserRepository.findById</code>), so business logic depends on the **abstraction**, not on SQL or a specific ORM. This makes services **testable** with in-memory fakes and lets you **swap** the data store without touching domain code.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Service depends on a repository interface, implementations vary'>
  <rect class='d-box-accent' x='20' y='55' width='110' height='44' rx='8'/><text class='d-text' x='75' y='81' text-anchor='middle'>service</text>
  <path class='d-edge-accent' d='M132 77 H180' marker-end='url(#m2)'/>
  <rect class='d-box' x='182' y='55' width='120' height='44' rx='8'/><text class='d-text' x='242' y='75' text-anchor='middle'>Repository</text><text class='d-sub' x='242' y='91' text-anchor='middle'>interface</text>
  <path class='d-edge-dashed' d='M242 101 L150 130' marker-end='url(#m2)'/>
  <path class='d-edge-dashed' d='M242 101 L334 130' marker-end='url(#m2)'/>
  <rect class='d-box-muted' x='80' y='126' width='120' height='24' rx='4'/><text class='d-sub' x='140' y='143' text-anchor='middle'>Postgres impl</text>
  <rect class='d-box-muted' x='280' y='126' width='110' height='24' rx='4'/><text class='d-sub' x='335' y='143' text-anchor='middle'>in-memory fake</text>
  <defs><marker id='m2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** A repository exposes **domain-centric** methods (<code>save</code>, <code>findById</code>, <code>findActive</code>) returning domain objects, encapsulating the queries inside. Business/service code calls those methods without knowing whether it's Postgres, Mongo, or an HTTP API behind them — a clean **separation of concerns** that follows the **dependency-inversion** principle (depend on abstractions). Benefits: **unit-test** services against an in-memory repo (no DB needed), centralize query logic (easier to optimize/cache), and migrate stores or ORMs with localized changes. The trade-off is extra indirection and the risk of a leaky/anemic abstraction; for simple apps a thin ORM may be enough. Keep repositories per **aggregate/entity**, not one giant DAO.

### Repository benefits
| Benefit | How |
| --- | --- |
| testability | swap in-memory fake |
| decoupling | hide SQL/ORM details |
| centralized queries | one place to optimize |
| swappable store | localized change |

> **Interview tip:** Tie it to **dependency inversion** — services depend on the **interface**, enabling **in-memory test doubles** and store swaps. Mention the risk of an **anemic/leaky** abstraction if overused.`,
    examples: [
      {
        label: "Interface + two implementations",
        tech: "javascript",
        runnable: false,
        code: `// service depends on the shape, not the DB
class UserService {
  constructor(repo) { this.repo = repo; }
  async promote(id) { const u = await this.repo.findById(id); u.role = 'admin'; await this.repo.save(u); }
}

// prod impl
class PgUserRepo { async findById(id) { /* SQL */ } async save(u) { /* SQL */ } }
// test impl — no DB needed
class FakeUserRepo { users = new Map(); async findById(id){return this.users.get(id);} async save(u){this.users.set(u.id,u);} }`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the 12-factor app methodology as applied to Node.js services?",
    answer: `**TL;DR.** **12-factor** is a set of principles for portable, scalable cloud apps. The high-impact ones for Node: **config in the environment**, **explicit dependencies**, **stateless processes**, **logs as event streams**, **dev/prod parity**, and **disposability** (fast start, graceful shutdown). They let you scale horizontally and deploy reliably.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Key 12-factor principles around a stateless Node process'>
  <rect class='d-box-accent' x='160' y='55' width='140' height='44' rx='8'/><text class='d-text' x='230' y='75' text-anchor='middle'>stateless process</text><text class='d-sub' x='230' y='91' text-anchor='middle'>scale by replicas</text>
  <rect class='d-box-muted' x='20' y='20' width='130' height='26' rx='6'/><text class='d-sub' x='85' y='38' text-anchor='middle'>config in env</text>
  <rect class='d-box-muted' x='310' y='20' width='130' height='26' rx='6'/><text class='d-sub' x='375' y='38' text-anchor='middle'>logs → stdout</text>
  <rect class='d-box-muted' x='20' y='108' width='130' height='26' rx='6'/><text class='d-sub' x='85' y='126' text-anchor='middle'>explicit deps</text>
  <rect class='d-box-muted' x='310' y='108' width='130' height='26' rx='6'/><text class='d-sub' x='375' y='126' text-anchor='middle'>disposability</text>
</svg>

**How it works.** Map each factor to a concrete Node practice: **Config** — read from <code>process.env</code> (no secrets in code), so one build runs anywhere. **Dependencies** — declared in <code>package.json</code> + lockfile, isolated in <code>node_modules</code>. **Processes** — keep them **stateless**; store sessions/cache in Redis so any replica can serve any request and you scale by adding processes (cluster/replicas). **Logs** — write to **stdout** as a stream; let the platform aggregate. **Dev/prod parity** — same DB engine and Node version across environments (Docker helps). **Disposability** — start fast and handle **SIGTERM** with graceful shutdown for safe rolling deploys. Other factors (backing services as attached resources, build/release/run separation, port binding, admin processes as one-off tasks) round it out. The payoff is apps that are cloud-portable, horizontally scalable, and CI/CD-friendly.

### Factor → Node practice
| Factor | Practice |
| --- | --- |
| config | <code>process.env</code> / secrets |
| processes | stateless + external state |
| logs | stream to stdout |
| disposability | fast boot + SIGTERM drain |

> **Interview tip:** You don't need all twelve — emphasize **env config, statelessness (scale by replicas), logs-to-stdout, and graceful shutdown** as the ones that most shape a Node service.`,
    examples: [
      {
        label: "Stateless + env config + stdout logs",
        tech: "javascript",
        runnable: false,
        code: `const port = process.env.PORT ?? 3000;     // config from env
// state lives in Redis, not in memory → any replica serves any request
const session = new RedisStore({ client: redis });

logger.info({ msg: 'up', port });          // logs to stdout, platform aggregates
process.on('SIGTERM', gracefulShutdown);    // disposability`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you containerize a Node.js app with a small, secure Docker image (multi-stage, distroless)?",
    answer: `**TL;DR.** Use a **multi-stage** Dockerfile: install/build in a full image, then copy only **production artifacts** into a slim or **distroless** base. Run as a **non-root** user, install with <code>npm ci --omit=dev</code>, leverage **layer caching**, and add a <code>.dockerignore</code> — keeping the image small and the attack surface low.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Build stage compiles, runtime stage copies only artifacts'>
  <rect class='d-box-muted' x='20' y='45' width='180' height='70' rx='10'/><text class='d-text' x='110' y='69' text-anchor='middle'>build stage</text><text class='d-sub' x='110' y='91' text-anchor='middle'>deps + tsc/bundle</text>
  <path class='d-edge-accent' d='M202 80 H262' marker-end='url(#m3)'/>
  <text class='d-sub' x='232' y='71' text-anchor='middle'>copy dist</text>
  <rect class='d-box-accent' x='264' y='45' width='176' height='70' rx='10'/><text class='d-text' x='352' y='69' text-anchor='middle'>runtime (distroless)</text><text class='d-sub' x='352' y='91' text-anchor='middle'>non-root, prod deps</text>
  <defs><marker id='m3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** A single-stage image ships your toolchain (compilers, dev deps, caches) — large and full of vulnerabilities. **Multi-stage** separates concerns: the **build** stage installs everything and produces artifacts (compiled JS, pruned <code>node_modules</code>); the **runtime** stage starts from a minimal base (<code>node:lts-slim</code> or Google **distroless**, which has no shell/package manager) and copies in only what runs. Order layers so dependencies (which change rarely) are cached before source, speeding rebuilds. Harden: run as a **non-root** user, use <code>npm ci --omit=dev</code> for reproducible prod installs, set <code>NODE_ENV=production</code>, add a <code>HEALTHCHECK</code>, handle <code>SIGTERM</code> (use an init like <code>--init</code> or tini for signal handling), and scan the image (Trivy). A <code>.dockerignore</code> keeps <code>node_modules</code>/secrets/git out of the build context.

### Image hardening
| Practice | Benefit |
| --- | --- |
| multi-stage | tiny runtime image |
| distroless/slim base | small attack surface |
| non-root user | least privilege |
| <code>npm ci --omit=dev</code> | reproducible prod deps |

> **Interview tip:** Hit **multi-stage + distroless/slim + non-root + npm ci --omit=dev**, layer caching for fast builds, and **signal handling** (tini/<code>--init</code>) so SIGTERM reaches Node for graceful shutdown.`,
    examples: [
      {
        label: "Multi-stage Dockerfile",
        tech: "bash",
        runnable: false,
        code: `# --- build stage ---
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci                      # cached unless deps change
COPY . .
RUN npm run build && npm prune --omit=dev

# --- runtime stage ---
FROM gcr.io/distroless/nodejs20
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER nonroot                    # least privilege
CMD ["dist/index.js"]`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is PM2 and what does it add over running `node server.js` directly?",
    answer: `**TL;DR.** **PM2** is a production **process manager** that keeps apps alive (**auto-restart** on crash), runs them in **cluster mode** across CPU cores, supports **zero-downtime reloads**, and centralizes **logs and metrics** — things bare <code>node server.js</code> doesn't provide. In containers, an **orchestrator** (Kubernetes) often replaces it.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='PM2 supervises clustered workers, restarting and reloading them'>
  <rect class='d-box-accent' x='170' y='20' width='120' height='38' rx='8'/><text class='d-text' x='230' y='44' text-anchor='middle'>PM2 daemon</text>
  <path class='d-edge-accent' d='M195 58 L120 100' marker-end='url(#m4)'/>
  <path class='d-edge-accent' d='M230 58 V100' marker-end='url(#m4)'/>
  <path class='d-edge-accent' d='M265 58 L340 100' marker-end='url(#m4)'/>
  <rect class='d-box' x='50' y='102' width='110' height='38' rx='8'/><text class='d-sub' x='105' y='126' text-anchor='middle'>worker 1</text>
  <rect class='d-box' x='175' y='102' width='110' height='38' rx='8'/><text class='d-sub' x='230' y='126' text-anchor='middle'>worker 2 (restart)</text>
  <rect class='d-box' x='300' y='102' width='110' height='38' rx='8'/><text class='d-sub' x='355' y='126' text-anchor='middle'>worker 3</text>
  <defs><marker id='m4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Running <code>node server.js</code> gives you **one** process that dies (and stays dead) on a crash and uses **one** core. PM2 supervises your app: it **restarts** on exit/crash (with backoff), launches <code>N</code> instances in **cluster mode** to use all cores behind a shared port, performs **reload** (restart workers one at a time → zero-downtime deploys), aggregates **logs**, exposes **monitoring** (CPU/memory), and can **resurrect** processes on server reboot. You define apps in an <code>ecosystem.config.js</code>. In a **containerized** world the common guidance is **one process per container** and let Kubernetes handle restarts/scaling/health — but PM2 remains handy on VMs/bare metal or for local-to-prod parity. (PM2's <code>pm2-runtime</code> exists for containers if you do want it.)

### What PM2 adds
| Feature | vs plain node |
| --- | --- |
| auto-restart | process stays up |
| cluster mode | uses all cores |
| zero-downtime reload | safe deploys |
| logs + monitoring | built-in ops |

> **Interview tip:** List **auto-restart, cluster mode, zero-downtime reload, log/metric management**, then add the nuance: in **Kubernetes** you usually run **one process per container** and let the orchestrator do restarts/scaling.`,
    examples: [
      {
        label: "Cluster mode + reload",
        tech: "bash",
        runnable: false,
        code: `pm2 start server.js -i max      # one instance per CPU core
pm2 reload server               # zero-downtime: restart workers one by one
pm2 logs                        # aggregated logs
pm2 startup && pm2 save         # resurrect on reboot
# In containers, prefer:  pm2-runtime start server.js  (or just one process/pod)`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you design liveness and readiness health-check endpoints?",
    answer: `**TL;DR.** A **liveness** probe answers "is the process alive?" and must stay **cheap** so orchestrators don't kill a busy-but-healthy app. A **readiness** probe answers "can it serve traffic?" and checks **dependencies** (DB, cache); failing it **removes the instance from the load balancer** without restarting it.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Liveness checks the process, readiness checks dependencies'>
  <rect class='d-box-accent' x='20' y='40' width='200' height='90' rx='10'/><text class='d-text' x='120' y='64' text-anchor='middle'>/livez (liveness)</text><text class='d-sub' x='120' y='86' text-anchor='middle'>cheap, no deps</text><text class='d-sub' x='120' y='106' text-anchor='middle'>fail ⇒ restart pod</text>
  <rect class='d-box-muted' x='240' y='40' width='200' height='90' rx='10'/><text class='d-text' x='340' y='64' text-anchor='middle'>/readyz (readiness)</text><text class='d-sub' x='340' y='86' text-anchor='middle'>check DB/cache</text><text class='d-sub' x='340' y='106' text-anchor='middle'>fail ⇒ drop from LB</text>
</svg>

**How it works.** Orchestrators poll both. **Liveness** should only verify the event loop is responsive — return <code>200</code> with no dependency calls; if it checks the DB and the DB blips, the orchestrator **restarts** an otherwise-fine process, causing crash loops. **Readiness** *should* check critical dependencies: if the DB/cache/queue is unreachable, return <code>503</code> so the load balancer **stops routing** new requests to this instance until it recovers — no restart needed. During **graceful shutdown**, flip readiness to **not ready first** so traffic drains before you close the server. A **startup** probe can cover slow boots. Keep checks fast and bounded (timeouts), and avoid making readiness so strict that a single non-critical dependency takes the whole fleet out.

### Liveness vs readiness
| | Liveness | Readiness |
| --- | --- | --- |
| Question | process alive? | can serve traffic? |
| Checks deps? | ❌ no | ✅ yes |
| On fail | restart pod | remove from LB |
| Cost | minimal | dependency checks |

> **Interview tip:** The classic mistake: **checking the DB in liveness** → crash loops on a transient blip. Liveness = cheap/no-deps (restart); readiness = deps (drain). Flip readiness off **first** during shutdown.`,
    examples: [
      {
        label: "Separate liveness and readiness",
        tech: "javascript",
        runnable: false,
        code: `let ready = true;
app.get('/livez', (req, res) => res.sendStatus(200));   // cheap, no deps

app.get('/readyz', async (req, res) => {
  if (!ready) return res.sendStatus(503);               // draining
  try { await db.query('SELECT 1'); res.sendStatus(200); }
  catch { res.sendStatus(503); }                         // dep down → drop from LB
});

process.on('SIGTERM', () => { ready = false; /* then drain + close */ });`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you run Node.js processes as a background service?",
    answer: `**TL;DR.** In production, run Node under a **supervisor** that keeps it alive and starts it on boot: a **process manager** (PM2/systemd) on VMs, or a **container orchestrator** (Docker + Kubernetes) in the cloud. Avoid ad-hoc <code>node app.js &</code> / <code>nohup</code> — they don't restart on crash or survive reboots.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Supervisor keeps the Node service running and restarts it'>
  <rect class='d-box-accent' x='20' y='52' width='150' height='46' rx='8'/><text class='d-text' x='95' y='73' text-anchor='middle'>supervisor</text><text class='d-sub' x='95' y='90' text-anchor='middle'>systemd / PM2 / k8s</text>
  <path class='d-edge-accent' d='M172 65 H230' marker-end='url(#m5)'/>
  <path class='d-edge-dashed' d='M230 85 H172' marker-end='url(#m5)'/>
  <text class='d-sub' x='201' y='110' text-anchor='middle'>restart on crash</text>
  <rect class='d-box' x='232' y='52' width='130' height='46' rx='8'/><text class='d-text' x='297' y='78' text-anchor='middle'>node service</text>
  <defs><marker id='m5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** A supervisor solves three things ad-hoc backgrounding doesn't: **restart on crash**, **start on boot**, and **log/lifecycle management**. On a Linux VM, a **systemd** unit is the native choice — it daemonizes the process, restarts it (<code>Restart=always</code>), captures stdout/stderr to the journal, and starts it at boot; **PM2** offers similar plus cluster mode and zero-downtime reloads. In the cloud, you typically **don't daemonize at all**: run Node in the **foreground** inside a container and let **Kubernetes** (or ECS/Nomad) restart, scale, and health-check it. Whichever you use, the app should log to **stdout**, handle **SIGTERM** for graceful shutdown, and externalize state. Plain <code>&</code>/<code>nohup</code>/<code>screen</code> are fine for quick experiments, not production.

### Supervision options
| Option | Best for |
| --- | --- |
| systemd unit | single VM, native |
| PM2 | VMs, cluster + reloads |
| Docker + Kubernetes | cloud, scaling |
| <code>node app &</code> / nohup | quick tests only |

> **Interview tip:** Recommend a **supervisor** (systemd/PM2/k8s) for **restart-on-crash + start-on-boot**, and note that **containerized** apps run in the **foreground** and let the orchestrator supervise — never <code>nohup</code> in prod.`,
    examples: [
      {
        label: "A systemd service unit",
        tech: "bash",
        runnable: false,
        code: `# /etc/systemd/system/myapp.service
[Service]
ExecStart=/usr/bin/node /srv/myapp/server.js
Restart=always
Environment=NODE_ENV=production
User=appuser
[Install]
WantedBy=multi-user.target

# enable + start (survives reboot, restarts on crash):
# sudo systemctl enable --now myapp`,
      },
    ],
  },
];

export default augments;
