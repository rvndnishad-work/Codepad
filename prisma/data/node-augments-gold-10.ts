/**
 * Node Phase N3 — Batch 10 (Security I).
 * See node-augments-gold-1.ts for conventions.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are some common security best practices in Node.js applications?",
    answer: `**TL;DR.** Defense in depth: **validate all input**, use **parameterized queries**, **hash passwords** (bcrypt/argon2), set **security headers** (Helmet), enforce **HTTPS/TLS**, keep **secrets in env/vaults**, **rate-limit**, **audit dependencies** (<code>npm audit</code>), and never leak stack traces. No single control is enough.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Layered security controls around a Node app'>
  <rect class='d-box-muted' x='30' y='20' width='400' height='128' rx='12'/>
  <text class='d-sub' x='230' y='40' text-anchor='middle'>transport: HTTPS/TLS + headers (Helmet)</text>
  <rect class='d-box' x='60' y='50' width='340' height='80' rx='10'/>
  <text class='d-sub' x='230' y='70' text-anchor='middle'>edge: rate limit + authn/authz</text>
  <rect class='d-box-accent' x='100' y='80' width='260' height='40' rx='8'/>
  <text class='d-text' x='230' y='98' text-anchor='middle'>app core</text>
  <text class='d-sub' x='230' y='114' text-anchor='middle'>validate input · parameterized SQL · secrets in env</text>
</svg>

**How it works.** Most breaches exploit a handful of patterns, so the checklist maps to OWASP: **injection** (use parameterized queries / ORMs, validate with zod/joi), **broken auth** (strong password hashing, secure sessions/JWT, MFA), **sensitive data exposure** (TLS, no secrets in code, encrypt at rest), **security misconfig** (Helmet headers, disable verbose errors in prod), **vulnerable components** (<code>npm audit</code>, Dependabot, lockfile integrity), and **DoS** (rate limiting, body size limits, timeouts). Run with **least privilege** (non-root, the permission model), and log/monitor for anomalies. Treat security as cross-cutting, applied at transport, edge, and app layers.

### Quick checklist
| Area | Control |
| --- | --- |
| Input | validate + parameterize |
| Auth | hash pw, secure sessions/JWT |
| Transport | HTTPS, Helmet headers |
| Supply chain | <code>npm audit</code>, pin lockfile |
| Abuse | rate limit, body/size limits |

> **Interview tip:** Frame it as **OWASP-aligned defense in depth** across layers, and name concrete Node tools (zod, parameterized queries, bcrypt/argon2, Helmet, npm audit) rather than vague advice.`,
    examples: [
      {
        label: "A few high-impact defaults",
        tech: "javascript",
        runnable: false,
        code: `import helmet from 'helmet';
app.use(helmet());                          // security headers
app.use(express.json({ limit: '100kb' }));  // cap body size (DoS)

// parameterized query — no string interpolation
await db.query('SELECT * FROM users WHERE email=$1', [email]);

// never leak internals in prod:
app.use((err, req, res, next) => res.status(500).json({ error: 'Internal error' }));`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you secure your Node.js API endpoints?",
    answer: `**TL;DR.** Layer controls: **authenticate** (verify identity via JWT/session/OAuth), **authorize** (check permissions/RBAC per route), **validate input**, **rate-limit**, enforce **HTTPS** + security headers, and return **least-privilege** errors. Authentication answers *who*; authorization answers *what they may do*.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Request passes authn, authz, validation before the handler'>
  <rect class='d-box' x='14' y='55' width='90' height='44' rx='8'/><text class='d-sub' x='59' y='75' text-anchor='middle'>authn</text><text class='d-sub' x='59' y='91' text-anchor='middle'>who?</text>
  <path class='d-edge-accent' d='M106 77 H130' marker-end='url(#j1)'/>
  <rect class='d-box' x='132' y='55' width='90' height='44' rx='8'/><text class='d-sub' x='177' y='75' text-anchor='middle'>authz</text><text class='d-sub' x='177' y='91' text-anchor='middle'>allowed?</text>
  <path class='d-edge-accent' d='M224 77 H248' marker-end='url(#j1)'/>
  <rect class='d-box' x='250' y='55' width='90' height='44' rx='8'/><text class='d-sub' x='295' y='75' text-anchor='middle'>validate</text><text class='d-sub' x='295' y='91' text-anchor='middle'>input</text>
  <path class='d-edge-accent' d='M342 77 H366' marker-end='url(#j1)'/>
  <rect class='d-box-accent' x='368' y='55' width='80' height='44' rx='8'/><text class='d-sub' x='408' y='81' text-anchor='middle'>handler</text>
  <defs><marker id='j1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Put **authentication** middleware first to verify a token/session and attach <code>req.user</code>; reject anonymous calls to protected routes. Then **authorize** — check the user's role/ownership for that specific action (a valid token isn't permission). **Validate and sanitize** every input with a schema before it reaches business logic. Add **rate limiting** and **body-size limits** to blunt abuse, set **CORS** to an allowlist, and serve over **HTTPS** with Helmet headers. Don't expose internal errors or whether a record exists when it leaks info. For service-to-service, use mutual TLS or signed tokens. Keep the principle: **deny by default**, allow explicitly.

### Endpoint controls
| Control | Purpose |
| --- | --- |
| authentication | verify identity |
| authorization (RBAC) | enforce permissions |
| input validation | block injection/bad data |
| rate limit + size cap | resist abuse |

> **Interview tip:** Make the **authn vs authz** distinction sharp ("a valid token ≠ permission"), and list it as a **deny-by-default** pipeline: authenticate → authorize → validate → rate-limit.`,
    examples: [
      {
        label: "Auth + role guard + validation",
        tech: "javascript",
        runnable: false,
        code: `const requireRole = (role) => (req, res, next) =>
  req.user?.roles?.includes(role) ? next() : res.status(403).end();

app.post('/admin/users',
  authenticate,                 // who? sets req.user
  requireRole('admin'),         // allowed?
  validate(CreateUserSchema),   // input ok?
  createUserHandler,
);`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you protect a Node.js API against Denial of Service (DoS) and brute-force attacks?",
    answer: `**TL;DR.** Combine **rate limiting** (per IP/user/route), **body-size and request limits**, **timeouts**, **slow-down/backoff** on repeated auth failures, **account lockout/CAPTCHA**, and upstream protection (WAF/CDN). Also keep the **event loop unblocked** so one expensive request can't stall the whole server.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Layers of abuse protection in front of the app'>
  <rect class='d-box-muted' x='30' y='20' width='400' height='128' rx='12'/>
  <text class='d-sub' x='230' y='40' text-anchor='middle'>edge: CDN / WAF (volumetric DDoS)</text>
  <rect class='d-box' x='70' y='52' width='320' height='78' rx='10'/>
  <text class='d-sub' x='230' y='72' text-anchor='middle'>app: rate limit + size caps + timeouts</text>
  <rect class='d-box-accent' x='110' y='84' width='240' height='38' rx='8'/>
  <text class='d-text' x='230' y='102' text-anchor='middle'>auth: lockout / backoff / CAPTCHA</text>
  <text class='d-sub' x='230' y='117' text-anchor='middle'>(brute-force defense)</text>
</svg>

**How it works.** **Volumetric DDoS** is best absorbed at the **edge** (CDN/WAF) — Node can't outscale a botnet. At the app, **rate limiting** caps requests per window per key; **body-size limits** (<code>express.json({ limit })</code>) and **timeouts** stop slow-loris and oversized payloads; **concurrency/queue limits** protect downstreams. For **brute force** (credential stuffing), add progressive **slow-down**, **account lockout** after N failures, **CAPTCHA**, and monitor for spikes. Critically, avoid **algorithmic DoS**: a CPU-heavy sync route or a **ReDoS** regex lets a single request freeze the event loop — keep handlers non-blocking and validate input sizes.

### DoS/brute-force defenses
| Threat | Defense |
| --- | --- |
| flood per IP | rate limit |
| huge/slow bodies | size limits + timeouts |
| credential stuffing | lockout/backoff/CAPTCHA |
| algorithmic (ReDoS/CPU) | non-blocking code, input caps |

> **Interview tip:** Split **volumetric (edge/WAF)** from **application/brute-force (rate limit, lockout)**, and mention **algorithmic DoS** (a blocking handler or ReDoS) — a favorite Node-specific angle.`,
    examples: [
      {
        label: "Stricter limiter on the login route",
        tech: "javascript",
        runnable: false,
        code: `import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,                          // 5 attempts / 15 min / IP
  standardHeaders: true,
  message: 'Too many attempts, try later',
});
app.post('/login', loginLimiter, loginHandler);
app.use(express.json({ limit: '50kb' }));   // cap payload size`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you implement rate limiting in a Node.js Express application?",
    answer: `**TL;DR.** Cap how many requests a client can make in a time window using a middleware like <code>express-rate-limit</code>, backed by an **in-memory** store (single instance) or **Redis** (shared across instances). Common algorithms: **fixed window**, **sliding window**, and **token bucket**. Key by IP, API key, or user.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Requests counted against a per-key budget, excess rejected with 429'>
  <rect class='d-box' x='20' y='52' width='100' height='44' rx='8'/><text class='d-sub' x='70' y='78' text-anchor='middle'>requests</text>
  <path class='d-edge-accent' d='M122 74 H170' marker-end='url(#j2)'/>
  <rect class='d-box-accent' x='172' y='45' width='130' height='58' rx='10'/><text class='d-text' x='237' y='68' text-anchor='middle'>limiter</text><text class='d-sub' x='237' y='86' text-anchor='middle'>count per key/window</text>
  <path class='d-edge-accent' d='M304 60 H352' marker-end='url(#j2)'/>
  <path class='d-edge-dashed' d='M304 88 H352' marker-end='url(#j2)'/>
  <rect class='d-box' x='354' y='40' width='90' height='28' rx='6'/><text class='d-sub' x='399' y='59' text-anchor='middle'>allow</text>
  <rect class='d-box-muted' x='354' y='78' width='90' height='28' rx='6'/><text class='d-sub' x='399' y='97' text-anchor='middle'>429 reject</text>
  <defs><marker id='j2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** The limiter increments a counter per **key** (default: client IP) per **window**; once the count exceeds <code>max</code>, further requests get **HTTP 429** with <code>Retry-After</code>. **Fixed window** is simplest but allows bursts at window edges; **sliding window** smooths that; **token bucket** permits short bursts while bounding the average rate. For multiple instances behind a load balancer, an in-memory counter is per-process and leaky — use a **Redis** store so the limit is global. Mind **proxy trust** (read the real client IP from <code>X-Forwarded-For</code> via <code>trust proxy</code>) and apply **stricter limits** to sensitive routes (login, password reset).

### Algorithms
| Algorithm | Trait |
| --- | --- |
| fixed window | simple, edge bursts |
| sliding window | smoother, more cost |
| token bucket | allows bursts, steady avg |
| store | memory (1 inst) vs Redis (many) |

> **Interview tip:** Mention the **multi-instance** pitfall — in-memory counters need a **Redis store** — plus keying strategy, <code>trust proxy</code> for real IPs, and stricter limits on auth routes.`,
    examples: [
      {
        label: "Redis-backed global limiter",
        tech: "javascript",
        runnable: false,
        code: `import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

app.set('trust proxy', 1);   // behind a load balancer

app.use(rateLimit({
  store: new RedisStore({ sendCommand: (...a) => redis.call(...a) }),
  windowMs: 60_000,
  max: 100,                  // 100 req/min per IP, shared across instances
}));`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How can you securely store and verify passwords in a Node.js application?",
    answer: `**TL;DR.** **Never** store plaintext or fast hashes (MD5/SHA). Use a **slow, salted** password hash — **bcrypt**, **scrypt**, or **argon2** — which is deliberately expensive to resist brute force. Store only the hash (salt is embedded); verify with the library's **constant-time** compare. Use the **async** API so hashing doesn't block the event loop.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Password hashed with salt and cost factor, only hash stored'>
  <rect class='d-box' x='20' y='52' width='100' height='44' rx='8'/><text class='d-sub' x='70' y='78' text-anchor='middle'>password</text>
  <path class='d-edge-accent' d='M122 74 H170' marker-end='url(#j3)'/>
  <rect class='d-box-accent' x='172' y='45' width='140' height='58' rx='10'/><text class='d-text' x='242' y='68' text-anchor='middle'>argon2/bcrypt</text><text class='d-sub' x='242' y='86' text-anchor='middle'>salt + high cost</text>
  <path class='d-edge-accent' d='M314 74 H362' marker-end='url(#j3)'/>
  <rect class='d-box-muted' x='364' y='52' width='80' height='44' rx='8'/><text class='d-sub' x='404' y='73' text-anchor='middle'>store hash</text><text class='d-sub' x='404' y='89' text-anchor='middle'>only</text>
  <defs><marker id='j3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** A cryptographic **salt** (unique per user, stored with the hash) defeats rainbow tables and makes identical passwords hash differently. A high **cost/work factor** (bcrypt rounds, argon2 memory/time) makes each guess slow, so even a leaked database is expensive to crack — and you raise the factor as hardware improves. These functions are **CPU-heavy**, so use the **async** variants to keep the event loop free (and remember the libuv pool size). Verify by re-hashing the input with the stored parameters and a **timing-safe** comparison (the libraries do this). Argon2id is the modern recommendation; bcrypt remains solid. Add a server-side **pepper** and MFA for extra protection.

### Do / don't
| Do | Don't |
| --- | --- |
| argon2id / bcrypt / scrypt | MD5, SHA-1, plain SHA-256 |
| unique salt per user | shared/no salt |
| high, tunable cost factor | fast hashing |
| async + constant-time verify | sync in hot path |

> **Interview tip:** Stress **slow + salted** (argon2/bcrypt) vs fast hashes, the **adjustable work factor**, **constant-time** verification, and using the **async** API to avoid blocking.`,
    examples: [
      {
        label: "Hash + verify with argon2",
        tech: "javascript",
        runnable: false,
        code: `import argon2 from 'argon2';

// On signup — store only the hash (salt + params embedded):
const hash = await argon2.hash(password, { type: argon2.argon2id });

// On login — constant-time verify:
const ok = await argon2.verify(storedHash, password);
if (!ok) return res.status(401).end();`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is prototype pollution and how do you prevent it in Node.js?",
    answer: `**TL;DR.** **Prototype pollution** happens when untrusted input sets <code>__proto__</code>/<code>constructor</code>/<code>prototype</code> keys during a **deep merge** or recursive assignment, injecting properties onto <code>Object.prototype</code> — affecting **every** object and enabling DoS, privilege escalation, or RCE. Prevent it by **rejecting those keys**, using <code>Map</code>/<code>Object.create(null)</code>, and validating input shape.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Malicious __proto__ key pollutes Object.prototype affecting all objects'>
  <rect class='d-box-muted' x='20' y='50' width='150' height='50' rx='8'/><text class='d-sub' x='95' y='72' text-anchor='middle'>{"__proto__":</text><text class='d-sub' x='95' y='90' text-anchor='middle'>{"isAdmin":true}}</text>
  <path class='d-edge-accent' d='M172 75 H230' marker-end='url(#j4)'/>
  <text class='d-sub' x='201' y='66' text-anchor='middle'>deep merge</text>
  <rect class='d-box-accent' x='232' y='45' width='150' height='60' rx='10'/><text class='d-text' x='307' y='70' text-anchor='middle'>Object.prototype</text><text class='d-sub' x='307' y='90' text-anchor='middle'>polluted globally</text>
  <defs><marker id='j4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** JS objects inherit from <code>Object.prototype</code>. A naive recursive merge that copies attacker-controlled keys can walk into <code>obj["__proto__"]["isAdmin"] = true</code>, which sets a property on the **shared prototype** — now <code>({}).isAdmin</code> is truthy everywhere, potentially bypassing auth checks or crashing logic. The fix: **block dangerous keys** (<code>__proto__</code>, <code>constructor</code>, <code>prototype</code>) in any merge/parser; use <code>Object.create(null)</code> (no prototype) or <code>Map</code> for untrusted dictionaries; validate against a **schema** (zod) so unexpected keys are dropped; and prefer libraries patched against it. <code>Object.freeze(Object.prototype)</code> is a blunt mitigation.

### Prevention
| Technique | Effect |
| --- | --- |
| reject <code>__proto__</code>/<code>constructor</code> | block the vector |
| <code>Object.create(null)</code> / <code>Map</code> | no prototype to pollute |
| schema validation (zod) | drop unknown keys |
| patched merge libs | safe deep-merge |

> **Interview tip:** Define it as polluting the **shared <code>Object.prototype</code>** via unsanitized merges, and list concrete fixes — **key allowlisting**, **null-prototype objects/Map**, and **schema validation**.`,
    examples: [
      {
        label: "Vulnerable merge vs guarded merge",
        tech: "javascript",
        runnable: false,
        code: `// ❌ vulnerable: copies __proto__ into the prototype chain
function merge(t, s) { for (const k in s) t[k] = (typeof s[k]==='object') ? merge(t[k]??{}, s[k]) : s[k]; }

// ✅ guard dangerous keys
const BAD = new Set(['__proto__', 'constructor', 'prototype']);
function safeMerge(t, s) {
  for (const k of Object.keys(s)) {
    if (BAD.has(k)) continue;
    t[k] = (s[k] && typeof s[k] === 'object') ? safeMerge(t[k] ?? {}, s[k]) : s[k];
  }
  return t;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is a ReDoS (Regular Expression Denial of Service) attack and how do you avoid it?",
    answer: `**TL;DR.** A **ReDoS** exploits a regex with **catastrophic backtracking**: crafted input makes the engine try exponentially many paths, **pinning the single event-loop thread** and freezing the whole process. Avoid it with **linear-time patterns**, **input length limits**, **safe-regex linting**, or a non-backtracking engine like **RE2**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Evil regex on crafted input explodes into exponential backtracking, blocking the loop'>
  <rect class='d-box-muted' x='20' y='52' width='150' height='46' rx='8'/><text class='d-sub' x='95' y='72' text-anchor='middle'>(a+)+$  on</text><text class='d-sub' x='95' y='89' text-anchor='middle'>"aaaa…aaa!"</text>
  <path class='d-edge-accent' d='M172 75 H230' marker-end='url(#j5)'/>
  <rect class='d-box-accent' x='232' y='45' width='130' height='60' rx='10'/><text class='d-text' x='297' y='70' text-anchor='middle'>backtracking</text><text class='d-sub' x='297' y='90' text-anchor='middle'>O(2ⁿ) — loop frozen</text>
  <defs><marker id='j5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Backtracking regex engines (JS included) explore alternative matches when a pattern fails. Patterns with **nested or overlapping quantifiers** — like <code>(a+)+$</code> or <code>(\\d+)*</code> — have exponentially many ways to split the input, so a single malicious string (e.g. many <code>a</code>s ending in a non-match) can take seconds to minutes, blocking every other request because Node is single-threaded. Defenses: **simplify** patterns (avoid nested quantifiers, use possessive/atomic groups where available, anchor and be specific), **bound input length** before matching, lint with tools like <code>safe-regex</code>/eslint plugins, and for untrusted input use **RE2** (Google's linear-time, backtrack-free engine) or run matching in a worker with a timeout.

### Avoiding ReDoS
| Technique | Effect |
| --- | --- |
| avoid nested quantifiers | no exponential paths |
| limit input length | bound worst case |
| safe-regex linting | catch risky patterns |
| RE2 engine | guaranteed linear time |

> **Interview tip:** Tie it to Node's **single thread** — one bad regex freezes the server — and give concrete fixes: **simplify the pattern**, **cap input length**, lint, or use **RE2**.`,
    examples: [
      {
        label: "Risky pattern → safer approach",
        tech: "javascript",
        runnable: false,
        code: `// ❌ catastrophic backtracking on "aaaaaaaaaaaaaaaa!"
const evil = /^(a+)+$/;

// ✅ simple linear pattern + input cap
if (input.length > 256) throw new Error('input too long');
const safe = /^a+$/;

// ✅ or use RE2 for untrusted input (no backtracking)
// import RE2 from 're2'; new RE2('(a+)+$').test(input);`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is SSRF and how do you mitigate it in a Node.js backend?",
    answer: `**TL;DR.** **Server-Side Request Forgery** tricks your server into making requests to **attacker-chosen URLs** — often internal services, cloud **metadata** endpoints, or private IPs — using the server's trusted network position. Mitigate by **allowlisting** destinations, **resolving and blocking private IP ranges**, disabling redirects to new hosts, and isolating outbound access.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Attacker-supplied URL makes the server hit an internal metadata endpoint'>
  <rect class='d-box' x='20' y='52' width='110' height='44' rx='8'/><text class='d-sub' x='75' y='72' text-anchor='middle'>user URL</text><text class='d-sub' x='75' y='88' text-anchor='middle'>(untrusted)</text>
  <path class='d-edge-accent' d='M132 74 H190' marker-end='url(#j6)'/>
  <rect class='d-box-accent' x='192' y='52' width='100' height='44' rx='8'/><text class='d-text' x='242' y='78' text-anchor='middle'>your server</text>
  <path class='d-edge-dashed' d='M294 74 H352' marker-end='url(#j6)'/>
  <rect class='d-box-muted' x='354' y='48' width='96' height='52' rx='8'/><text class='d-sub' x='402' y='70' text-anchor='middle'>169.254.169.254</text><text class='d-sub' x='402' y='88' text-anchor='middle'>metadata!</text>
  <defs><marker id='j6' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Any feature that fetches a **user-supplied URL** (webhooks, link previews, image proxies, PDF/SVG renderers) is a candidate. An attacker points it at <code>http://169.254.169.254/</code> (cloud metadata → credentials), <code>http://localhost:admin</code>, or internal hostnames, and your server — inside the trusted perimeter — happily fetches them. Mitigate by **allowlisting** schemes/hosts, **resolving the hostname and rejecting private/loopback/link-local ranges** (and re-checking after redirects to avoid DNS-rebinding/TOCTOU), **disabling automatic redirects** (or re-validating each hop), stripping credentials, and ideally routing outbound traffic through an **egress proxy** with its own allowlist. Block the cloud metadata IP explicitly.

### SSRF mitigations
| Mitigation | Effect |
| --- | --- |
| host/scheme allowlist | only known destinations |
| block private/loopback IPs | no internal pivot |
| no auto-redirects / re-check | stop redirect bypass |
| egress proxy | central control + metadata block |

> **Interview tip:** Mention the **cloud metadata endpoint** as the classic target, and that **blocklists alone fail** due to DNS rebinding/redirects — prefer **allowlists + post-resolution IP checks** and an egress proxy.`,
    examples: [
      {
        label: "Validate the resolved IP before fetching",
        tech: "javascript",
        runnable: false,
        code: `import dns from 'node:dns/promises';
import net from 'node:net';

async function safeFetch(rawUrl) {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad scheme');
  const { address } = await dns.lookup(url.hostname);
  // reject private / loopback / link-local
  if (isPrivate(address)) throw new Error('blocked internal address');
  return fetch(url, { redirect: 'error' });   // no silent redirects
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between JWT and session-based authentication, and where do refresh tokens fit?",
    answer: `**TL;DR.** **Session auth** stores state server-side and gives the client an opaque **cookie id** (look up the session each request). **JWT auth** is **stateless** — a signed token carries the claims and is verified without a DB lookup, but is hard to revoke. **Short-lived access tokens** + a stored, **rotating refresh token** balance statelessness with revocability.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Session stores state server-side; JWT carries claims in a signed token'>
  <rect class='d-box-muted' x='20' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='120' y='54' text-anchor='middle'>session</text>
  <text class='d-sub' x='120' y='78' text-anchor='middle'>cookie = opaque id</text>
  <text class='d-sub' x='120' y='98' text-anchor='middle'>state on server (store)</text>
  <text class='d-sub' x='120' y='118' text-anchor='middle'>easy to revoke</text>
  <rect class='d-box-accent' x='240' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='340' y='54' text-anchor='middle'>JWT</text>
  <text class='d-sub' x='340' y='78' text-anchor='middle'>signed claims in token</text>
  <text class='d-sub' x='340' y='98' text-anchor='middle'>stateless, no lookup</text>
  <text class='d-sub' x='340' y='118' text-anchor='middle'>hard to revoke</text>
</svg>

**How it works.** With **sessions**, the server keeps a record (in Redis/DB) keyed by the cookie id; logout or revocation just deletes it, and you can store rich state — at the cost of a lookup per request and shared session storage when scaled. With **JWT**, the server signs claims (user id, roles, expiry); any instance verifies the signature locally, so it scales statelessly and suits APIs/microservices — but you **can't invalidate** an unexpired token without extra machinery (denylist/short TTL). The common hybrid: issue a **short-lived access JWT** (minutes) plus a **long-lived refresh token** (stored server-side, **rotated** on use, revocable). The client uses the refresh token to mint new access tokens; detecting reuse of a rotated refresh token signals theft. Store tokens in **HttpOnly, Secure** cookies to resist XSS.

### Session vs JWT
| | Session | JWT |
| --- | --- | --- |
| State | server-side | in token (stateless) |
| Revoke | easy (delete) | hard (denylist/TTL) |
| Scale | shared store | no lookup |
| Best for | classic web apps | APIs / microservices |

> **Interview tip:** The nuance: JWT's **statelessness is also its revocation weakness** — solve it with **short access TTL + rotating refresh tokens** stored server-side, in HttpOnly cookies.`,
    examples: [
      {
        label: "Access + refresh token issue/rotate",
        tech: "javascript",
        runnable: false,
        code: `import jwt from 'jsonwebtoken';

// short-lived access token (stateless)
const access = jwt.sign({ sub: user.id, roles: user.roles }, SECRET, { expiresIn: '10m' });

// long-lived refresh token: store a hash server-side so it's revocable + rotatable
const refresh = crypto.randomUUID();
await db.saveRefresh({ userId: user.id, hash: sha256(refresh) });

res.cookie('rt', refresh, { httpOnly: true, secure: true, sameSite: 'strict' });`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is Helmet and which HTTP security headers should a Node.js API set?",
    answer: `**TL;DR.** **Helmet** is Express middleware that sets defensive **HTTP headers** with sane defaults: <code>Content-Security-Policy</code>, <code>Strict-Transport-Security</code> (HSTS), <code>X-Content-Type-Options</code>, <code>X-Frame-Options</code>, and <code>Referrer-Policy</code>. They reduce XSS, clickjacking, MIME-sniffing, and protocol-downgrade risks with one line.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Helmet adds protective headers to every response'>
  <rect class='d-box-accent' x='20' y='52' width='110' height='44' rx='8'/><text class='d-text' x='75' y='78' text-anchor='middle'>helmet()</text>
  <path class='d-edge-accent' d='M132 74 H180' marker-end='url(#j7)'/>
  <rect class='d-box-muted' x='182' y='30' width='258' height='90' rx='10'/>
  <text class='d-sub' x='311' y='52' text-anchor='middle'>Content-Security-Policy</text>
  <text class='d-sub' x='311' y='72' text-anchor='middle'>Strict-Transport-Security (HSTS)</text>
  <text class='d-sub' x='311' y='92' text-anchor='middle'>X-Content-Type-Options / X-Frame-Options</text>
  <text class='d-sub' x='311' y='110' text-anchor='middle'>Referrer-Policy</text>
  <defs><marker id='j7' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Browsers enforce behavior based on response headers; Helmet sets the protective ones so you don't hand-roll them. **CSP** restricts which sources scripts/styles can load from — the strongest XSS mitigation (tune it per app). **HSTS** forces HTTPS for future visits, blocking downgrade/SSL-strip. **X-Content-Type-Options: nosniff** stops MIME-sniffing that can turn an upload into executable script. **X-Frame-Options**/CSP <code>frame-ancestors</code> prevent clickjacking. **Referrer-Policy** limits leaking URLs. For pure JSON APIs you'd also disable caching of sensitive responses and remove <code>X-Powered-By</code>. Headers are cheap defense-in-depth, not a replacement for input validation/auth.

### Key headers
| Header | Protects against |
| --- | --- |
| Content-Security-Policy | XSS / injection |
| Strict-Transport-Security | HTTPS downgrade |
| X-Content-Type-Options | MIME sniffing |
| X-Frame-Options / frame-ancestors | clickjacking |

> **Interview tip:** Name **CSP, HSTS, nosniff, X-Frame-Options** and what each blocks. Note **CSP needs tuning** per app and that Helmet is defaults — headers complement, not replace, validation/auth.`,
    examples: [
      {
        label: "Helmet with a tuned CSP",
        tech: "javascript",
        runnable: false,
        code: `import helmet from 'helmet';

app.use(helmet());                       // sensible defaults
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https://cdn.example.com'],
    frameAncestors: ["'none'"],          // anti-clickjacking
  },
}));
app.disable('x-powered-by');             // hide framework fingerprint`,
      },
    ],
  },
];

export default augments;
