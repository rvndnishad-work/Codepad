/**
 * Node Phase N3 — Batch 11 (Config/env, validation, data access & crypto).
 * See node-augments-gold-1.ts for conventions.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle environment variables in Node.js?",
    answer: `**TL;DR.** Read environment variables from <code>process.env</code>. Keep secrets and per-environment settings **out of code** — load them from the real environment (or a <code>.env</code> file in dev via <code>--env-file</code>/dotenv), **validate** them at startup, and never commit <code>.env</code>. This follows the 12-factor "config in the environment" principle.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Environment variables injected into the process and validated at boot'>
  <rect class='d-box-muted' x='20' y='50' width='130' height='48' rx='8'/><text class='d-sub' x='85' y='70' text-anchor='middle'>.env / shell /</text><text class='d-sub' x='85' y='88' text-anchor='middle'>secrets manager</text>
  <path class='d-edge-accent' d='M152 74 H210' marker-end='url(#k1)'/>
  <rect class='d-box-accent' x='212' y='50' width='120' height='48' rx='8'/><text class='d-text' x='272' y='72' text-anchor='middle'>process.env</text><text class='d-sub' x='272' y='90' text-anchor='middle'>validate at boot</text>
  <path class='d-edge-accent' d='M334 74 H392' marker-end='url(#k1)'/>
  <rect class='d-box' x='394' y='50' width='56' height='48' rx='8'/><text class='d-sub' x='422' y='78' text-anchor='middle'>config</text>
  <defs><marker id='k1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** <code>process.env</code> values are **always strings** (or undefined), so coerce/validate them (a missing <code>DATABASE_URL</code> should crash the app **at boot**, not at first query). In development, load a <code>.env</code> with <code>node --env-file=.env</code> (built-in) or the <code>dotenv</code> package; in production, inject vars via the platform/orchestrator or a **secrets manager** (Vault, AWS Secrets Manager) rather than files. Centralize access in one typed **config module** so the rest of the app never touches <code>process.env</code> directly. Add <code>.env</code> to <code>.gitignore</code> and ship a <code>.env.example</code> for onboarding.

### Best practices
| Practice | Why |
| --- | --- |
| validate at startup | fail fast on misconfig |
| typed config module | one access point |
| <code>.env</code> only in dev | prod uses real env/secrets |
| never commit <code>.env</code> | avoid leaking secrets |

> **Interview tip:** Note values are **strings** (validate/coerce), config belongs in the **environment** (12-factor), and production should use a **secrets manager** — not a committed <code>.env</code>.`,
    examples: [
      {
        label: "Validate env once with zod",
        tech: "javascript",
        runnable: false,
        code: `import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
});

export const env = Env.parse(process.env);   // throws at boot if invalid
// Run dev with: node --env-file=.env src/index.js`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you manage configuration in a Node.js application for different environments?",
    answer: `**TL;DR.** Keep configuration **in the environment**, not in code, and **layer** it: sensible defaults → per-environment overrides → environment variables/secrets (highest precedence). Validate the merged config **once at startup** into a typed object, so dev/staging/prod differ only by their env, not their build.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Defaults overridden by env-specific values then env vars'>
  <rect class='d-box' x='20' y='52' width='120' height='44' rx='8'/><text class='d-sub' x='80' y='72' text-anchor='middle'>defaults</text><text class='d-sub' x='80' y='88' text-anchor='middle'>(lowest)</text>
  <path class='d-edge-accent' d='M142 74 H180' marker-end='url(#k2)'/>
  <rect class='d-box' x='182' y='52' width='120' height='44' rx='8'/><text class='d-sub' x='242' y='72' text-anchor='middle'>per-env file</text><text class='d-sub' x='242' y='88' text-anchor='middle'>staging/prod</text>
  <path class='d-edge-accent' d='M304 74 H342' marker-end='url(#k2)'/>
  <rect class='d-box-accent' x='344' y='52' width='110' height='44' rx='8'/><text class='d-text' x='399' y='72' text-anchor='middle'>env vars</text><text class='d-sub' x='399' y='88' text-anchor='middle'>(highest)</text>
  <defs><marker id='k2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** The same artifact runs everywhere; only **config** changes between environments (12-factor). Establish precedence — base defaults, then optional environment-specific values, then **environment variables** that win — so secrets and deploy-specific settings come from the platform. Validate the final shape with a schema and expose it as an **immutable, typed** config object that the app imports (no scattered <code>process.env</code> reads). Avoid baking environment into the build (it prevents promoting the same image through stages) and never store secrets in the repo. Libraries like <code>convict</code>/<code>node-config</code> formalize layering, but a small zod-validated module usually suffices.

### Layering precedence
| Source | Precedence |
| --- | --- |
| code defaults | lowest |
| env-specific file | middle |
| env vars / secrets | highest |
| validate merged | once at boot |

> **Interview tip:** Emphasize **one build, env-driven config** with **clear precedence** and **startup validation** — and that secrets come from the environment/secrets manager, not per-env files in the repo.`,
    examples: [
      {
        label: "Layered, validated config module",
        tech: "javascript",
        runnable: false,
        code: `import { z } from 'zod';

const defaults = { logLevel: 'info', cacheTtl: 60 };
const Schema = z.object({
  logLevel: z.string(),
  cacheTtl: z.coerce.number(),
  databaseUrl: z.string().url(),
});

export const config = Object.freeze(Schema.parse({
  ...defaults,
  logLevel: process.env.LOG_LEVEL ?? defaults.logLevel,  // env wins
  databaseUrl: process.env.DATABASE_URL,
}));`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you manage sessions and authentication in a Node.js web application?",
    answer: `**TL;DR.** Authenticate the user (password+hash, OAuth, magic link), then maintain a **session**: either **server-side sessions** (a record in Redis keyed by a signed <code>HttpOnly</code> cookie) or **stateless tokens** (JWT). Protect cookies (<code>HttpOnly</code>, <code>Secure</code>, <code>SameSite</code>), guard against **CSRF** and **session fixation**, and authorize per request.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Login creates a session stored in Redis, cookie carries the id'>
  <rect class='d-box-accent' x='20' y='52' width='110' height='44' rx='8'/><text class='d-text' x='75' y='73' text-anchor='middle'>login</text><text class='d-sub' x='75' y='89' text-anchor='middle'>verify creds</text>
  <path class='d-edge-accent' d='M132 74 H180' marker-end='url(#k3)'/>
  <rect class='d-box' x='182' y='52' width='130' height='44' rx='8'/><text class='d-text' x='247' y='73' text-anchor='middle'>session id</text><text class='d-sub' x='247' y='89' text-anchor='middle'>HttpOnly cookie</text>
  <path class='d-edge-accent' d='M314 74 H362' marker-end='url(#k3)'/>
  <rect class='d-box-muted' x='364' y='52' width='86' height='44' rx='8'/><text class='d-sub' x='407' y='79' text-anchor='middle'>Redis store</text>
  <defs><marker id='k3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** On successful login you create a session and hand the client a credential. With **server-side sessions** (<code>express-session</code> + a Redis store), the cookie holds only an opaque, signed id; the server looks up state and can **revoke instantly** — ideal for classic web apps but needs shared storage when scaled. With **JWT**, the token is self-contained and stateless (great for APIs) but harder to revoke (use short TTL + refresh tokens). Either way: set cookies <code>HttpOnly</code> (no JS access → XSS-resistant), <code>Secure</code> (HTTPS only), and <code>SameSite</code> (CSRF mitigation); **regenerate the session id on login** to prevent fixation; add CSRF tokens for cookie-based flows; and check authorization on every protected route. Offload password handling to vetted libraries (Passport, Lucia, or a provider).

### Session security checklist
| Control | Purpose |
| --- | --- |
| <code>HttpOnly</code>/<code>Secure</code>/<code>SameSite</code> | resist XSS/CSRF |
| regenerate id on login | prevent fixation |
| store in Redis (scaled) | shared, revocable |
| short TTL + refresh (JWT) | bound exposure |

> **Interview tip:** Contrast **server sessions (revocable, stateful)** vs **JWT (stateless, hard to revoke)**, and rattle off the **cookie flags + session-fixation regeneration + CSRF** controls.`,
    examples: [
      {
        label: "Redis-backed sessions with secure cookies",
        tech: "javascript",
        runnable: false,
        code: `import session from 'express-session';
import { RedisStore } from 'connect-redis';

app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET,
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 86_400_000 },
}));

app.post('/login', async (req, res) => {
  if (!(await verify(req.body))) return res.status(401).end();
  req.session.regenerate(() => { req.session.userId = user.id; res.json({ ok: true }); });
});`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you validate and sanitize request input (zod / joi)?",
    answer: `**TL;DR.** Validate **every external input** (body, query, params, headers) against an explicit **schema** (zod, joi) at the **boundary**, rejecting malformed requests before they reach business logic. With **zod** the schema also **infers the TypeScript type**, giving one source of truth for runtime checks and static types.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Schema validates input at the boundary, rejecting bad data'>
  <rect class='d-box' x='20' y='52' width='110' height='44' rx='8'/><text class='d-sub' x='75' y='78' text-anchor='middle'>raw request</text>
  <path class='d-edge-accent' d='M132 74 H180' marker-end='url(#k4)'/>
  <rect class='d-box-accent' x='182' y='45' width='130' height='58' rx='10'/><text class='d-text' x='247' y='68' text-anchor='middle'>schema.parse</text><text class='d-sub' x='247' y='86' text-anchor='middle'>validate + coerce</text>
  <path class='d-edge-accent' d='M314 60 H362' marker-end='url(#k4)'/>
  <path class='d-edge-dashed' d='M314 88 H362' marker-end='url(#k4)'/>
  <rect class='d-box' x='364' y='44' width='86' height='26' rx='6'/><text class='d-sub' x='407' y='62' text-anchor='middle'>typed data</text>
  <rect class='d-box-muted' x='364' y='78' width='86' height='26' rx='6'/><text class='d-sub' x='407' y='96' text-anchor='middle'>400 reject</text>
  <defs><marker id='k4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Treat all client data as hostile. A schema declares the expected shape, types, formats, and bounds; parsing **rejects** anything that doesn't fit (returning 400 with details) and can **coerce/strip** to a clean object — so downstream code works with trusted, well-typed data and you avoid injection, type confusion, and prototype-pollution from unexpected keys. Validate at the **edge** (a middleware per route), not scattered through handlers. zod's <code>z.infer</code> ties the runtime schema to the compile-time type, eliminating drift between validation and TypeScript interfaces. Combine with **output** encoding (for XSS) and parameterized queries (for SQLi) — validation is necessary but not the only control.

### Validation principles
| Principle | Detail |
| --- | --- |
| validate at boundary | one place per route |
| reject unknown keys | drop/strip extras |
| coerce to clean types | trusted downstream data |
| schema = type (zod) | no runtime/type drift |

> **Interview tip:** Say validate **all** external input against a schema at the **edge**, strip unknown keys, and use **zod's type inference** so the validator and TS type can't drift. Pair with parameterized queries/output encoding.`,
    examples: [
      {
        label: "Validation middleware with zod",
        tech: "javascript",
        runnable: false,
        code: `import { z } from 'zod';

const CreateUser = z.object({
  email: z.string().email(),
  age: z.coerce.number().int().min(13),
}).strict();                 // reject unknown keys

const validate = (schema) => (req, res, next) => {
  const r = schema.safeParse(req.body);
  if (!r.success) return res.status(400).json({ errors: r.error.issues });
  req.body = r.data;          // clean, typed
  next();
};
app.post('/users', validate(CreateUser), createUser);`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you prevent SQL injection in Node.js database access?",
    answer: `**TL;DR.** **Never interpolate user input into SQL strings.** Use **parameterized / prepared statements** (<code>$1</code>, <code>?</code> placeholders) so the driver sends the query and the data **separately** — the input is treated as a value, never as SQL, making injection impossible. ORMs and query builders parameterize by default.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Parameterized query keeps SQL and user data separate'>
  <rect class='d-box-muted' x='20' y='30' width='200' height='44' rx='8'/><text class='d-sub' x='120' y='51' text-anchor='middle'>"…WHERE id=" + input</text><text class='d-sub' x='120' y='67' text-anchor='middle'>❌ injectable</text>
  <rect class='d-box-accent' x='20' y='84' width='200' height='44' rx='8'/><text class='d-sub' x='120' y='105' text-anchor='middle'>"…WHERE id=$1", [input]</text><text class='d-sub' x='120' y='121' text-anchor='middle'>✅ parameterized</text>
  <path class='d-edge-accent' d='M222 106 H290' marker-end='url(#k5)'/>
  <rect class='d-box' x='292' y='78' width='150' height='56' rx='8'/><text class='d-sub' x='367' y='102' text-anchor='middle'>input = data only,</text><text class='d-sub' x='367' y='120' text-anchor='middle'>never executed</text>
  <defs><marker id='k5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** SQL injection occurs when attacker input becomes part of the SQL **command** (e.g. <code>' OR 1=1 --</code>), letting them read/alter/delete data. **Parameterized queries** send a query template with placeholders plus a separate array of values; the database binds the values as literals, so they can never change the query's structure. Where you must build dynamic SQL (variable column/table names that can't be parameters), **allowlist** identifiers against known-good values rather than concatenating. ORMs/query builders (Prisma, Knex, Sequelize) parameterize automatically — but their **raw** escape hatches reintroduce risk, so still parameterize there. Combine with **least-privilege** DB accounts and input validation for defense in depth.

### Do / don't
| Do | Don't |
| --- | --- |
| placeholders + values array | string concatenation |
| allowlist dynamic identifiers | interpolate column names |
| ORM/query builder defaults | unsafe raw queries |
| least-privilege DB user | app uses superuser |

> **Interview tip:** The one rule: **parameterize — never concatenate.** Add the nuance that **identifiers can't be parameters** (allowlist them) and that ORM **raw** queries still need binding.`,
    examples: [
      {
        label: "Parameterized query with pg",
        tech: "javascript",
        runnable: false,
        code: `// ❌ injectable
// db.query("SELECT * FROM users WHERE email = '" + email + "'");

// ✅ parameterized — input bound as a value
const { rows } = await db.query(
  'SELECT * FROM users WHERE email = $1 AND active = $2',
  [email, true],
);`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do database transactions work in Node.js and how do you avoid connection leaks?",
    answer: `**TL;DR.** A transaction runs <code>BEGIN</code> → your queries → <code>COMMIT</code> (or <code>ROLLBACK</code> on error) on a **single** connection checked out from the pool, giving **all-or-nothing** atomicity. The classic leak is forgetting to **release** that connection on an error path — so always release in a <code>finally</code> (or use the driver's managed-transaction helper).

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='BEGIN, queries, then COMMIT or ROLLBACK on one connection, always released'>
  <rect class='d-box-accent' x='14' y='55' width='80' height='44' rx='8'/><text class='d-text' x='54' y='81' text-anchor='middle'>BEGIN</text>
  <path class='d-edge-accent' d='M96 77 H120' marker-end='url(#k6)'/>
  <rect class='d-box' x='122' y='55' width='90' height='44' rx='8'/><text class='d-sub' x='167' y='81' text-anchor='middle'>queries</text>
  <path class='d-edge-accent' d='M214 67 H242' marker-end='url(#k6)'/>
  <path class='d-edge-dashed' d='M214 87 H242' marker-end='url(#k6)'/>
  <rect class='d-box' x='244' y='44' width='90' height='28' rx='6'/><text class='d-sub' x='289' y='63' text-anchor='middle'>COMMIT</text>
  <rect class='d-box-muted' x='244' y='80' width='90' height='28' rx='6'/><text class='d-sub' x='289' y='99' text-anchor='middle'>ROLLBACK</text>
  <path class='d-edge-accent' d='M336 76 H370' marker-end='url(#k6)'/>
  <rect class='d-box-accent' x='372' y='55' width='80' height='44' rx='8'/><text class='d-sub' x='412' y='81' text-anchor='middle'>release()</text>
  <defs><marker id='k6' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Because a transaction's statements must run on the **same** physical connection, you acquire one client from the pool, issue <code>BEGIN</code>, run the work, then <code>COMMIT</code> or <code>ROLLBACK</code>, and **return** the client. If any step throws and you don't <code>release()</code>, that connection is lost from the pool; repeat under load and the pool empties, so every request hangs waiting to acquire — a slow, total outage. The fix is a <code>try/catch/finally</code> where <code>finally</code> always releases, or a higher-level <code>pool.transaction(cb)</code>/ORM helper that handles acquire/begin/commit/rollback/release for you. Keep transactions **short** (they hold locks), choose the right **isolation level**, and don't do unrelated slow I/O while one is open.

### Transaction hygiene
| Rule | Why |
| --- | --- |
| same connection for BEGIN..COMMIT | atomicity |
| release in <code>finally</code> | prevent pool leak |
| keep transactions short | avoid lock contention |
| rollback on any error | no partial writes |

> **Interview tip:** Two musts: a transaction lives on **one connection**, and you must **release it on every path** (use <code>finally</code> or a managed helper) — leaks are the classic "pool exhausted, everything hangs" bug.`,
    examples: [
      {
        label: "Transaction with guaranteed release",
        tech: "javascript",
        runnable: false,
        code: `async function transfer(from, to, amount) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE acct SET bal = bal - $1 WHERE id=$2', [amount, from]);
    await client.query('UPDATE acct SET bal = bal + $1 WHERE id=$2', [amount, to]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();          // ALWAYS — even on error
  }
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between an ORM, a query builder, and a raw driver?",
    answer: `**TL;DR.** A **raw driver** (<code>pg</code>) sends SQL strings you write. A **query builder** (Knex) composes SQL programmatically while staying close to it. An **ORM** (Prisma, TypeORM, Sequelize) maps rows to objects and generates queries from a schema — trading some control and performance for **productivity and type-safety**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Abstraction spectrum from raw driver to ORM'>
  <rect class='d-box-muted' x='15' y='45' width='135' height='80' rx='10'/><text class='d-text' x='82' y='69' text-anchor='middle'>raw driver</text><text class='d-sub' x='82' y='91' text-anchor='middle'>you write SQL</text><text class='d-sub' x='82' y='111' text-anchor='middle'>max control</text>
  <rect class='d-box' x='162' y='45' width='135' height='80' rx='10'/><text class='d-text' x='229' y='69' text-anchor='middle'>query builder</text><text class='d-sub' x='229' y='91' text-anchor='middle'>compose SQL</text><text class='d-sub' x='229' y='111' text-anchor='middle'>balance</text>
  <rect class='d-box-accent' x='309' y='45' width='135' height='80' rx='10'/><text class='d-text' x='376' y='69' text-anchor='middle'>ORM</text><text class='d-sub' x='376' y='91' text-anchor='middle'>schema → queries</text><text class='d-sub' x='376' y='111' text-anchor='middle'>productivity</text>
</svg>

**How it works.** The trade-off is **abstraction vs control**. A **raw driver** gives full SQL power and predictable performance but means manual mapping and more boilerplate. A **query builder** lets you build queries with chainable methods (good for dynamic queries) while emitting transparent SQL — a middle ground. An **ORM** models entities/relations and generates SQL, handling migrations, relations, and type-safe results (Prisma is schema-first with great TS types); it's fastest to build with but can produce inefficient queries (the **N+1** problem) and hides the SQL, so you must still understand what it runs. Many teams use an ORM for CRUD and **drop to raw SQL** for complex/perf-critical queries.

### Trade-offs
| | Raw driver | Query builder | ORM |
| --- | --- | --- | --- |
| Control | highest | high | lower |
| Boilerplate | high | medium | low |
| Type-safety | manual | partial | strong (Prisma) |
| Risk | verbose | — | N+1 / hidden SQL |

> **Interview tip:** Frame it as a **control-vs-productivity spectrum**, name the ORM **N+1** pitfall, and say you'd use an ORM for CRUD but **raw SQL** for hot/complex queries.`,
    examples: [
      {
        label: "Same fetch at three levels",
        tech: "javascript",
        runnable: false,
        code: `// raw driver (pg)
await pool.query('SELECT * FROM users WHERE id=$1', [id]);

// query builder (knex)
await knex('users').where({ id }).first();

// ORM (prisma) — typed result
await prisma.user.findUnique({ where: { id }, include: { posts: true } });`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you manage database schema migrations in a Node.js project?",
    answer: `**TL;DR.** Migrations are **versioned, ordered scripts** (via Prisma Migrate, Knex, or node-pg-migrate) that evolve the schema **reproducibly** across environments. A <code>migrations</code> table records which have run, so each deploy applies only **new** ones. Use **backward-compatible "expand then contract"** steps for **zero-downtime** deploys.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Ordered migrations applied in sequence, tracked in a table'>
  <rect class='d-box-accent' x='20' y='55' width='90' height='40' rx='8'/><text class='d-sub' x='65' y='79' text-anchor='middle'>001_init</text>
  <path class='d-edge-accent' d='M112 75 H148' marker-end='url(#k7)'/>
  <rect class='d-box-accent' x='150' y='55' width='110' height='40' rx='8'/><text class='d-sub' x='205' y='79' text-anchor='middle'>002_add_col</text>
  <path class='d-edge-accent' d='M262 75 H298' marker-end='url(#k7)'/>
  <rect class='d-box' x='300' y='55' width='130' height='40' rx='8'/><text class='d-sub' x='365' y='79' text-anchor='middle'>003_index (new)</text>
  <text class='d-sub' x='230' y='125' text-anchor='middle'>migrations table tracks what's applied</text>
  <defs><marker id='k7' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Each migration is an immutable, timestamped/numbered file describing a schema change (and often a <code>down</code> to reverse it). The tool runs pending migrations **in order** inside transactions and stamps a tracking table, so every environment converges to the same schema and CI/CD can apply them automatically on deploy. **Never edit a migration that's already run** — add a new one. For **zero-downtime**, follow **expand→migrate→contract**: first add the new column/table (compatible with old code), deploy code that uses it, backfill, then remove the old structure in a later release — so the running app never sees a schema it can't handle. Keep migrations small, test them, and have a rollback/forward-fix plan.

### Migration practices
| Practice | Why |
| --- | --- |
| versioned + tracked | reproducible, ordered |
| never edit applied ones | history integrity |
| expand→contract | zero-downtime deploys |
| run in CI/CD | environments stay in sync |

> **Interview tip:** Hit **ordered, tracked, immutable** migrations and the **expand-then-contract** pattern for zero-downtime — the senior signal is treating schema change as backward-compatible steps, not one big ALTER.`,
    examples: [
      {
        label: "Prisma migration flow",
        tech: "bash",
        runnable: false,
        code: `# edit schema.prisma, then create + apply a migration in dev:
npx prisma migrate dev --name add_user_status

# in CI/CD / production, apply pending migrations only:
npx prisma migrate deploy

# Zero-downtime: add nullable column first, backfill, then enforce NOT NULL later.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain how the 'crypto' module secures sensitive data in Node.js",
    answer: `**TL;DR.** The <code>node:crypto</code> module wraps OpenSSL to provide **hashing** (SHA-256), **HMAC**, **symmetric** encryption (AES), **asymmetric** keys (RSA/EC), **signing/verification**, and secure **random** bytes. Use it to protect data **at rest and in transit** — but for passwords use slow KDFs (pbkdf2/scrypt/argon2), not plain hashes.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='crypto provides hashing, symmetric and asymmetric encryption, signing'>
  <rect class='d-box-accent' x='20' y='40' width='100' height='40' rx='8'/><text class='d-sub' x='70' y='64' text-anchor='middle'>hash / HMAC</text>
  <rect class='d-box-accent' x='130' y='40' width='100' height='40' rx='8'/><text class='d-sub' x='180' y='64' text-anchor='middle'>AES (symmetric)</text>
  <rect class='d-box' x='240' y='40' width='100' height='40' rx='8'/><text class='d-sub' x='290' y='64' text-anchor='middle'>RSA/EC</text>
  <rect class='d-box' x='350' y='40' width='90' height='40' rx='8'/><text class='d-sub' x='395' y='64' text-anchor='middle'>sign/verify</text>
  <rect class='d-box-muted' x='130' y='95' width='200' height='34' rx='8'/><text class='d-sub' x='230' y='116' text-anchor='middle'>randomBytes / randomUUID</text>
</svg>

**How it works.** For **integrity** you compute a hash or, with a key, an **HMAC** to detect tampering. For **confidentiality at rest** you use **symmetric** AES (ideally an authenticated mode like **AES-GCM**, with a unique IV/nonce per message) to encrypt fields/files. For **identity/exchange** you use **asymmetric** keys: sign data with a private key and verify with the public one, or use them in TLS. Generate keys, IVs, salts, and tokens with the CSPRNG (<code>crypto.randomBytes</code>/<code>randomUUID</code>), never <code>Math.random</code>. Prefer the **async** APIs for heavy work so the event loop stays free, and compare secrets with <code>crypto.timingSafeEqual</code> to avoid timing attacks. Crucially, **passwords** need a slow, salted KDF (pbkdf2/scrypt/argon2), not a fast hash.

### crypto building blocks
| Goal | Tool |
| --- | --- |
| integrity | hash / HMAC |
| confidentiality | AES-GCM (symmetric) |
| identity/exchange | RSA/EC sign/verify |
| randomness | <code>randomBytes</code>/<code>randomUUID</code> |

> **Interview tip:** Map **integrity→HMAC**, **confidentiality→AES-GCM (unique IV)**, **passwords→slow KDF**, and **randomness→CSPRNG (not <code>Math.random</code>)**. Mention <code>timingSafeEqual</code> for secret comparison.`,
    examples: [
      {
        label: "Authenticated AES-GCM encryption",
        tech: "javascript",
        runnable: false,
        code: `import crypto from 'node:crypto';

function encrypt(plaintext, key /* 32 bytes */) {
  const iv = crypto.randomBytes(12);                 // unique per message
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { iv, tag: cipher.getAuthTag(), data: enc }; // tag proves integrity
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are the main security risks of using the 'eval()' function in Node.js?",
    answer: `**TL;DR.** <code>eval()</code> (and friends — <code>new Function</code>, <code>vm</code> without isolation, <code>setTimeout('code')</code>) executes **arbitrary strings as code**. If any part is attacker-influenced, it's **remote code execution**. It also defeats optimization, breaks scope safety, and is nearly impossible to sandbox correctly. **Avoid it**; use safe parsers/data structures instead.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='User input flowing into eval becomes executed code'>
  <rect class='d-box-muted' x='20' y='52' width='130' height='46' rx='8'/><text class='d-sub' x='85' y='73' text-anchor='middle'>user input</text><text class='d-sub' x='85' y='90' text-anchor='middle'>(string)</text>
  <path class='d-edge-accent' d='M152 75 H210' marker-end='url(#k8)'/>
  <rect class='d-box-accent' x='212' y='52' width='110' height='46' rx='8'/><text class='d-text' x='267' y='73' text-anchor='middle'>eval()</text><text class='d-sub' x='267' y='90' text-anchor='middle'>runs as code</text>
  <path class='d-edge-accent' d='M324 75 H382' marker-end='url(#k8)'/>
  <rect class='d-box-muted' x='384' y='52' width='66' height='46' rx='8'/><text class='d-sub' x='417' y='79' text-anchor='middle'>RCE</text>
  <defs><marker id='k8' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Because <code>eval</code> runs in the **current scope** with full process privileges, evaluated input can read your variables, access <code>require</code>/<code>process</code>, exfiltrate secrets, or run shell commands — full server compromise. Even without malicious input it **disables V8 optimizations** for the enclosing scope (slow), enables subtle scope bugs, and complicates security review. The common temptations have safe replacements: parse data with <code>JSON.parse</code> (not <code>eval</code>), look up behavior via a **map/dispatch table** instead of building code, and compute with real expression parsers. If you truly must run untrusted code, the <code>vm</code> module is **not** a security boundary on its own — use a real sandbox (separate process/container, isolated-vm) with strict limits.

### Risks & alternatives
| Risk from <code>eval</code> | Safer choice |
| --- | --- |
| RCE from injected code | <code>JSON.parse</code>, validators |
| secret/scope exposure | dispatch table / map |
| deopt + slow | precompiled functions |
| false sandbox (<code>vm</code>) | isolated-vm / separate process |

> **Interview tip:** Call <code>eval</code> on user input **RCE**, note it also **deopts** and can't be safely sandboxed by <code>vm</code> alone. Offer concrete replacements: <code>JSON.parse</code>, lookup maps, real sandboxes.`,
    examples: [
      {
        label: "Replace eval with safe parsing / dispatch",
        tech: "javascript",
        runnable: false,
        code: `// ❌ never: executes whatever the client sent
// const data = eval('(' + req.body + ')');

// ✅ parse data, don't execute it
const data = JSON.parse(req.body);

// ✅ choose behavior via a map, not generated code
const ops = { add: (a, b) => a + b, sub: (a, b) => a - b };
const fn = ops[req.query.op] ?? (() => { throw new Error('bad op'); });`,
      },
    ],
  },
];

export default augments;
