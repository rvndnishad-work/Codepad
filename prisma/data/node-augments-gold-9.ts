/**
 * Node Phase N3 — Batch 9 (HTTP & networking).
 * See node-augments-gold-1.ts for conventions.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle CORS (Cross-Origin Resource Sharing) in Node.js?",
    answer: `**TL;DR.** **CORS** is a browser security mechanism: the browser blocks cross-origin requests unless the server returns the right <code>Access-Control-Allow-*</code> headers. In Node you set those headers — usually via the <code>cors</code> middleware in Express — to **allowlist** specific origins, methods, headers, and credentials.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Browser preflight checks Allow headers before the real request'>
  <rect class='d-box-accent' x='20' y='55' width='110' height='44' rx='8'/><text class='d-text' x='75' y='75' text-anchor='middle'>browser</text><text class='d-sub' x='75' y='91' text-anchor='middle'>origin A</text>
  <path class='d-edge-accent' d='M132 68 H250' marker-end='url(#i1)'/>
  <text class='d-sub' x='191' y='59' text-anchor='middle'>OPTIONS preflight</text>
  <path class='d-edge-dashed' d='M250 88 H132' marker-end='url(#i1)'/>
  <text class='d-sub' x='191' y='108' text-anchor='middle'>Allow-Origin: A</text>
  <rect class='d-box-muted' x='252' y='55' width='110' height='44' rx='8'/><text class='d-text' x='307' y='75' text-anchor='middle'>API</text><text class='d-sub' x='307' y='91' text-anchor='middle'>origin B</text>
  <defs><marker id='i1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** When JS on origin A calls your API on origin B, the browser enforces the **same-origin policy**. For "non-simple" requests it first sends a **preflight** <code>OPTIONS</code> asking which origins/methods/headers are allowed; your server must answer with <code>Access-Control-Allow-Origin</code> (a specific origin, not <code>*</code> when credentials are involved), <code>Allow-Methods</code>, and <code>Allow-Headers</code>. To send cookies you set <code>Allow-Credentials: true</code> **and** the browser uses <code>credentials: 'include'</code>. CORS is a **browser** control — it doesn't protect server-to-server calls — so still authenticate every request.

### Key CORS headers
| Header | Controls |
| --- | --- |
| <code>Access-Control-Allow-Origin</code> | which origin(s) |
| <code>Allow-Methods</code> | permitted verbs |
| <code>Allow-Headers</code> | custom request headers |
| <code>Allow-Credentials</code> | cookies/auth allowed |

> **Interview tip:** Make clear CORS is **enforced by the browser, not the server**, and that <code>*</code> can't be combined with credentials — allowlist explicit origins. It's not a substitute for auth.`,
    examples: [
      {
        label: "Allowlist origins with the cors middleware",
        tech: "javascript",
        runnable: false,
        code: `import cors from 'cors';

app.use(cors({
  origin: ['https://app.example.com', 'https://admin.example.com'],
  methods: ['GET', 'POST'],
  credentials: true,          // allow cookies
}));
// Manually, you'd set res.setHeader('Access-Control-Allow-Origin', origin) etc.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is undici and why is the global fetch built on it in modern Node.js?",
    answer: `**TL;DR.** **undici** is a fast, from-scratch **HTTP/1.1 client** written for Node, and the **global <code>fetch</code>** is implemented on top of it. It provides **connection pooling** (<code>Agent</code>/<code>Pool</code>), lower overhead than the legacy <code>http</code> client, and high-throughput APIs (<code>request</code>, <code>stream</code>, <code>pipeline</code>).

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='fetch sits on undici which pools connections to servers'>
  <rect class='d-box-accent' x='20' y='55' width='110' height='44' rx='8'/><text class='d-text' x='75' y='81' text-anchor='middle'>fetch()</text>
  <path class='d-edge-accent' d='M132 77 H180' marker-end='url(#i2)'/>
  <rect class='d-box' x='182' y='50' width='120' height='54' rx='8'/><text class='d-text' x='242' y='73' text-anchor='middle'>undici</text><text class='d-sub' x='242' y='91' text-anchor='middle'>pooled keep-alive</text>
  <path class='d-edge-accent' d='M304 77 H352' marker-end='url(#i2)'/>
  <rect class='d-box-muted' x='354' y='55' width='96' height='44' rx='8'/><text class='d-sub' x='402' y='81' text-anchor='middle'>upstream API</text>
  <defs><marker id='i2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** The old <code>http</code>/<code>https</code> modules carried legacy overhead; undici was built for speed with efficient connection **pools** that keep sockets alive and reuse them, dramatically improving throughput for services that make many outbound calls. Because Node's <code>fetch</code> is undici under the hood, you get a standard browser-compatible API plus the ability to tune the underlying client — set a custom <code>Agent</code> (pool size, keep-alive, timeouts) via the <code>dispatcher</code> option, or use undici's <code>MockAgent</code> to intercept requests in tests. It also supports HTTP/1.1 pipelining and streaming bodies.

### undici offers
| Feature | Benefit |
| --- | --- |
| connection pooling | reuse sockets, more throughput |
| <code>fetch</code> standard API | browser-compatible |
| <code>Agent</code>/<code>Pool</code> tuning | size, keep-alive, timeouts |
| <code>MockAgent</code> | intercept in tests |

> **Interview tip:** Connect the dots: **<code>fetch</code> = undici**, so you tune it via a <code>dispatcher</code>/<code>Agent</code> and mock it with <code>MockAgent</code>. The headline win is **connection pooling** for high-throughput outbound calls.`,
    examples: [
      {
        label: "Tune fetch's pool + mock it in tests",
        tech: "javascript",
        runnable: false,
        code: `import { Agent, setGlobalDispatcher, MockAgent } from 'undici';

// Bigger keep-alive pool for a chatty service:
setGlobalDispatcher(new Agent({ connections: 128, keepAliveTimeout: 10_000 }));
const res = await fetch('https://api.example.com/data');

// In tests, intercept without real network:
const mock = new MockAgent();
mock.get('https://api.example.com').intercept({ path: '/data' }).reply(200, { ok: true });`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does HTTP/2 support work in Node.js and how does it differ from HTTP/1.1?",
    answer: `**TL;DR.** The <code>node:http2</code> module **multiplexes** many concurrent request/response **streams over one TCP connection** with **header compression (HPACK)**, eliminating HTTP/1.1's connection-level head-of-line blocking. Browsers require **TLS** for HTTP/2, and the API is **stream-based** rather than the classic req/res.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='HTTP/1.1 one request per connection vs HTTP/2 multiplexed streams'>
  <rect class='d-box-muted' x='20' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='120' y='54' text-anchor='middle'>HTTP/1.1</text>
  <text class='d-sub' x='120' y='78' text-anchor='middle'>1 request per connection</text>
  <text class='d-sub' x='120' y='98' text-anchor='middle'>head-of-line blocking</text>
  <text class='d-sub' x='120' y='118' text-anchor='middle'>many sockets</text>
  <rect class='d-box-accent' x='240' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='340' y='54' text-anchor='middle'>HTTP/2</text>
  <text class='d-sub' x='340' y='78' text-anchor='middle'>multiplexed streams</text>
  <text class='d-sub' x='340' y='98' text-anchor='middle'>HPACK header compression</text>
  <text class='d-sub' x='340' y='118' text-anchor='middle'>one TLS connection</text>
</svg>

**How it works.** Over HTTP/1.1 a connection handles one request at a time, so browsers open ~6 sockets and still suffer **head-of-line blocking**. HTTP/2 sends multiple **independent streams** over a single connection, interleaving frames, plus compresses repetitive headers with HPACK — big wins for many small assets/requests. In Node you create the server with <code>http2.createSecureServer</code> (TLS cert) and handle a <code>'stream'</code> event (respond via <code>stream.respond</code>/<code>stream.end</code>); it also offers a compatibility mode mimicking the http1 API. Note: HTTP/2 only fixes HOL blocking **above** TCP — packet-loss HOL blocking is solved by HTTP/3 (QUIC). Often a reverse proxy (nginx) terminates HTTP/2 and forwards http1 to Node.

### 1.1 vs 2
| | HTTP/1.1 | HTTP/2 |
| --- | --- | --- |
| Concurrency | 1 req/connection | multiplexed streams |
| Headers | plaintext, repeated | HPACK compressed |
| Connections | many | one |
| TLS | optional | required (browsers) |

> **Interview tip:** Lead with **multiplexing + header compression over one connection**. Mention TLS requirement, the stream-based API, and that a proxy frequently terminates HTTP/2 in front of Node.`,
    examples: [
      {
        label: "Minimal HTTP/2 server",
        tech: "javascript",
        runnable: false,
        code: `import http2 from 'node:http2';
import { readFileSync } from 'node:fs';

const server = http2.createSecureServer({
  key: readFileSync('key.pem'), cert: readFileSync('cert.pem'),
});
server.on('stream', (stream, headers) => {
  stream.respond({ ':status': 200, 'content-type': 'text/plain' });
  stream.end('hello over HTTP/2');
});
server.listen(8443);`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you implement real-time communication with WebSockets (ws) in Node.js?",
    answer: `**TL;DR.** **WebSockets** upgrade an HTTP connection to a **persistent, full-duplex** channel so server and client **push** messages anytime without polling. The <code>ws</code> library attaches to an HTTP server, emits <code>'connection'</code> and <code>'message'</code> events, and you **broadcast** by iterating connected clients.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='HTTP upgrade to a persistent two-way WebSocket'>
  <rect class='d-box-accent' x='30' y='52' width='120' height='44' rx='8'/><text class='d-text' x='90' y='78' text-anchor='middle'>client</text>
  <path class='d-edge-accent' d='M152 64 H308' marker-end='url(#i3)'/>
  <text class='d-sub' x='230' y='55' text-anchor='middle'>Upgrade → ws://</text>
  <path class='d-edge-accent' d='M308 84 H152' marker-end='url(#i3)'/>
  <text class='d-sub' x='230' y='104' text-anchor='middle'>full-duplex push</text>
  <rect class='d-box-accent' x='310' y='52' width='120' height='44' rx='8'/><text class='d-text' x='370' y='78' text-anchor='middle'>server</text>
  <defs><marker id='i3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** A client sends an HTTP request with <code>Upgrade: websocket</code>; the server completes the handshake and the connection becomes a long-lived TCP socket carrying **frames** in both directions. With <code>ws</code>, each connection is a socket object: listen for <code>'message'</code> to receive, call <code>.send()</code> to push, and track all sockets in a set to **broadcast**. For production: implement **heartbeats** (ping/pong) to drop dead connections, authenticate during the upgrade, and to scale across instances use a **pub/sub backplane** (Redis) since a socket lives on one process. Use WebSockets when you need **bidirectional** realtime (chat, multiplayer, collaborative editing).

### WebSocket essentials
| Concern | Approach |
| --- | --- |
| Receive/send | <code>'message'</code> / <code>.send()</code> |
| Broadcast | iterate client set |
| Liveness | ping/pong heartbeat |
| Scale-out | Redis pub/sub backplane |

> **Interview tip:** Emphasize **full-duplex over a persistent connection** (vs polling), and the scaling caveat: a socket is pinned to one process, so multi-instance broadcast needs a **Redis backplane**. Mention heartbeats.`,
    examples: [
      {
        label: "Echo + broadcast server",
        tech: "javascript",
        runnable: false,
        code: `import { WebSocketServer } from 'ws';
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (socket) => {
  socket.on('message', (data) => {
    // broadcast to everyone
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) client.send(data);
    }
  });
});`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you implement Server-Sent Events (SSE) in Node.js?",
    answer: `**TL;DR.** **SSE** keeps a single HTTP response open with <code>Content-Type: text/event-stream</code> and writes <code>data: ...\\n\\n</code> frames to **push updates one-way** (server→client). The browser consumes it with <code>EventSource</code>, which **auto-reconnects**. It's simpler than WebSockets when you only need server-to-client streaming.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Server streams event frames down one open HTTP response'>
  <rect class='d-box-accent' x='20' y='52' width='120' height='44' rx='8'/><text class='d-text' x='80' y='78' text-anchor='middle'>server</text>
  <path class='d-edge-accent' d='M142 62 H320' marker-end='url(#i4)'/>
  <text class='d-sub' x='231' y='53' text-anchor='middle'>data: {...}  (stream)</text>
  <text class='d-sub' x='231' y='88' text-anchor='middle'>one-way, auto-reconnect</text>
  <rect class='d-box-accent' x='322' y='52' width='120' height='44' rx='8'/><text class='d-text' x='382' y='78' text-anchor='middle'>EventSource</text>
  <defs><marker id='i4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** You set the streaming headers, **don't end** the response, and <code>res.write()</code> messages as <code>data: payload\\n\\n</code> (optionally <code>event:</code>, <code>id:</code>, and <code>retry:</code> fields). The browser's <code>EventSource</code> handles reconnection automatically and replays from the <code>Last-Event-ID</code> header so you can resume. SSE rides ordinary HTTP (works through proxies, no special upgrade), supports compression, but is **one-way** and limited to text. Use it for live feeds, notifications, progress, and dashboards; choose WebSockets when the client must also send a steady stream. Remember to clean up on <code>req.on('close')</code> and watch per-connection limits under HTTP/1.1.

### SSE vs WebSockets
| | SSE | WebSocket |
| --- | --- | --- |
| Direction | server → client | bidirectional |
| Protocol | plain HTTP | upgrade |
| Reconnect | built-in | manual |
| Payload | text only | text + binary |

> **Interview tip:** Pitch SSE as the **simple one-way** option with **built-in reconnection** over plain HTTP. Mention cleaning up on <code>'close'</code> and resuming via <code>Last-Event-ID</code>.`,
    examples: [
      {
        label: "An SSE endpoint",
        tech: "javascript",
        runnable: false,
        code: `app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const timer = setInterval(() => {
    res.write(\`data: \${JSON.stringify({ t: Date.now() })}\\n\\n\`);
  }, 1000);
  req.on('close', () => clearInterval(timer));   // cleanup
});`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you enable gzip/Brotli compression for HTTP responses?",
    answer: `**TL;DR.** Compress responses based on the client's <code>Accept-Encoding</code> header using <code>zlib</code> (gzip/brotli) or Express's <code>compression</code> middleware. **Brotli** compresses smaller but costs more CPU; you typically **skip** already-compressed assets (images, video) and tiny payloads, and often offload compression to a reverse proxy/CDN.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Server picks an encoding from Accept-Encoding and compresses the body'>
  <rect class='d-box' x='20' y='52' width='130' height='46' rx='8'/><text class='d-sub' x='85' y='72' text-anchor='middle'>Accept-Encoding:</text><text class='d-sub' x='85' y='89' text-anchor='middle'>br, gzip</text>
  <path class='d-edge-accent' d='M152 75 H210' marker-end='url(#i5)'/>
  <rect class='d-box-accent' x='212' y='52' width='120' height='46' rx='8'/><text class='d-text' x='272' y='73' text-anchor='middle'>compress</text><text class='d-sub' x='272' y='90' text-anchor='middle'>br / gzip</text>
  <path class='d-edge-accent' d='M334 75 H392' marker-end='url(#i5)'/>
  <rect class='d-box-muted' x='394' y='52' width='56' height='46' rx='8'/><text class='d-sub' x='422' y='79' text-anchor='middle'>smaller</text>
  <defs><marker id='i5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** The client advertises supported encodings in <code>Accept-Encoding</code>; the server picks one, compresses the body, and sets <code>Content-Encoding</code> + <code>Vary: Accept-Encoding</code>. <code>compression</code> middleware does this transparently for text responses (HTML/JSON/CSS/JS), where ratios are high. **Don't** re-compress already-compressed binaries (PNG/JPEG/MP4) — wasted CPU for no gain — and skip very small bodies where overhead exceeds savings. Brotli (<code>br</code>) yields ~15-20% better ratios than gzip for static assets that you can **pre-compress** at build time; for dynamic responses, gzip's lower CPU is often the better trade. In production, a CDN/reverse proxy usually handles this, freeing Node's CPU.

### Compression choices
| Encoding | Ratio | CPU | Best for |
| --- | --- | --- | --- |
| gzip | good | low | dynamic responses |
| brotli | better | higher | pre-compressed static |
| none | — | — | already-compressed media |

> **Interview tip:** Mention compressing **by <code>Accept-Encoding</code>**, **skipping already-compressed media**, the **brotli ratio vs gzip CPU** trade-off, and that a **proxy/CDN** often does it instead of Node.`,
    examples: [
      {
        label: "Compression middleware with a filter",
        tech: "javascript",
        runnable: false,
        code: `import compression from 'compression';

app.use(compression({
  threshold: 1024,                      // skip tiny bodies
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res); // skips already-compressed types
  },
}));`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the purpose of the HTTP Agent in Node.js?",
    answer: `**TL;DR.** An <code>http.Agent</code> manages a **pool of sockets** for outgoing HTTP requests, enabling **keep-alive** connection reuse so you don't pay TCP+TLS setup on every call. It also caps concurrent sockets per host (<code>maxSockets</code>) and queues the rest — crucial for high-throughput clients.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Agent reuses keep-alive sockets across requests to a host'>
  <rect class='d-box' x='20' y='30' width='100' height='28' rx='6'/><text class='d-sub' x='70' y='49' text-anchor='middle'>req 1</text>
  <rect class='d-box' x='20' y='62' width='100' height='28' rx='6'/><text class='d-sub' x='70' y='81' text-anchor='middle'>req 2</text>
  <rect class='d-box' x='20' y='94' width='100' height='28' rx='6'/><text class='d-sub' x='70' y='113' text-anchor='middle'>req 3</text>
  <path class='d-edge-accent' d='M122 44 L180 65' marker-end='url(#i6)'/>
  <path class='d-edge-accent' d='M122 76 H180' marker-end='url(#i6)'/>
  <path class='d-edge-accent' d='M122 108 L180 87' marker-end='url(#i6)'/>
  <rect class='d-box-accent' x='182' y='48' width='130' height='56' rx='10'/><text class='d-text' x='247' y='72' text-anchor='middle'>Agent pool</text><text class='d-sub' x='247' y='90' text-anchor='middle'>keep-alive sockets</text>
  <path class='d-edge-accent' d='M314 76 H372' marker-end='url(#i6)'/>
  <rect class='d-box-muted' x='374' y='52' width='76' height='48' rx='8'/><text class='d-sub' x='412' y='80' text-anchor='middle'>host</text>
  <defs><marker id='i6' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Without keep-alive, each request opens and tears down a connection — expensive, especially with TLS. An Agent with <code>keepAlive: true</code> keeps idle sockets open and **reuses** them for subsequent requests to the same host, cutting latency and CPU. <code>maxSockets</code> bounds concurrency per host (extra requests queue), preventing you from overwhelming a downstream; <code>maxFreeSockets</code> caps idle ones. The legacy <code>http</code> module's default agent doesn't keep-alive, which is a common hidden performance bug; the modern <code>fetch</code>/**undici** does pool by default. You can also set timeouts and a custom agent per request.

### Agent knobs
| Option | Effect |
| --- | --- |
| <code>keepAlive</code> | reuse sockets |
| <code>maxSockets</code> | concurrency cap per host |
| <code>maxFreeSockets</code> | idle socket cap |
| <code>timeout</code> | socket inactivity timeout |

> **Interview tip:** Center on **connection reuse via keep-alive** to avoid repeated TCP/TLS handshakes, and that **undici/fetch pools by default** while the legacy default agent did not.`,
    examples: [
      {
        label: "Keep-alive agent for outbound calls",
        tech: "javascript",
        runnable: false,
        code: `import http from 'node:http';

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,          // cap concurrency per host
  keepAliveMsecs: 10_000,
});

http.get('http://api.internal/health', { agent }, (res) => { /* ... */ });
// Sockets are reused across requests instead of reconnecting each time.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does the Node.js 'dns' module differ from browser-based DNS resolution?",
    answer: `**TL;DR.** Node's <code>dns</code> module gives you **programmatic** DNS with two flavors: <code>dns.lookup</code> (uses the OS resolver via the **libuv thread pool**, honoring <code>/etc/hosts</code>) and <code>dns.resolve*</code> (talks to DNS servers directly over the **network**, no thread pool). Browsers, by contrast, resolve DNS **internally** with their own cache and give pages no DNS API.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='dns.lookup uses OS+thread pool, dns.resolve queries servers directly'>
  <rect class='d-box-accent' x='20' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='120' y='54' text-anchor='middle'>dns.lookup</text>
  <text class='d-sub' x='120' y='78' text-anchor='middle'>OS resolver</text>
  <text class='d-sub' x='120' y='98' text-anchor='middle'>honors /etc/hosts</text>
  <text class='d-sub' x='120' y='118' text-anchor='middle'>uses thread pool ⚠</text>
  <rect class='d-box-muted' x='240' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='340' y='54' text-anchor='middle'>dns.resolve*</text>
  <text class='d-sub' x='340' y='78' text-anchor='middle'>queries DNS servers</text>
  <text class='d-sub' x='340' y='98' text-anchor='middle'>network, no pool</text>
  <text class='d-sub' x='340' y='118' text-anchor='middle'>record types (A, MX…)</text>
</svg>

**How it works.** <code>dns.lookup</code> mimics how connections normally resolve names — it calls <code>getaddrinfo</code> on a **thread-pool** thread, so a burst of lookups can **saturate the pool** (default 4) and stall other pool work (fs, crypto). <code>dns.resolve</code> family sends real DNS queries asynchronously over the network without the pool and lets you fetch specific record types (<code>A</code>, <code>AAAA</code>, <code>MX</code>, <code>TXT</code>, <code>SRV</code>). Node doesn't cache DNS by default (the OS may), which can surprise you. Browsers handle all this opaquely with an internal cache and expose no equivalent API to page scripts — DNS is purely an implementation detail there.

### lookup vs resolve
| | <code>dns.lookup</code> | <code>dns.resolve*</code> |
| --- | --- | --- |
| Backend | OS resolver | DNS servers |
| Thread pool | ✅ (can saturate) | ❌ |
| <code>/etc/hosts</code> | honored | ignored |
| Record types | A/AAAA | A, MX, TXT, SRV… |

> **Interview tip:** The gotcha that impresses: **<code>dns.lookup</code> uses the libuv thread pool** (and can bottleneck it), while <code>dns.resolve</code> goes over the network. Browsers cache/resolve internally with no page-level API.`,
    examples: [
      {
        label: "lookup vs resolve",
        tech: "javascript",
        runnable: false,
        code: `import dns from 'node:dns/promises';

// OS resolver (thread pool, honors hosts file):
console.log(await dns.lookup('example.com'));        // { address, family }

// Direct DNS query, specific record types (no thread pool):
console.log(await dns.resolveMx('example.com'));     // mail servers
console.log(await dns.resolve4('example.com'));      // A records`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain the concept of 'middleware' in Express.js.",
    answer: `**TL;DR.** **Middleware** are functions with the signature <code>(req, res, next)</code> that run **in order** for each request. Each can inspect/modify <code>req</code>/<code>res</code>, end the response, or call <code>next()</code> to pass control onward. They form a **pipeline** for cross-cutting concerns: logging, auth, parsing, validation, and error handling.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Request flows through a chain of middleware to the handler'>
  <rect class='d-box-accent' x='14' y='55' width='80' height='44' rx='8'/><text class='d-sub' x='54' y='81' text-anchor='middle'>request</text>
  <path class='d-edge-accent' d='M96 77 H120' marker-end='url(#i7)'/>
  <rect class='d-box' x='122' y='55' width='80' height='44' rx='8'/><text class='d-sub' x='162' y='75' text-anchor='middle'>logger</text><text class='d-sub' x='162' y='91' text-anchor='middle'>next()</text>
  <path class='d-edge-accent' d='M204 77 H228' marker-end='url(#i7)'/>
  <rect class='d-box' x='230' y='55' width='80' height='44' rx='8'/><text class='d-sub' x='270' y='75' text-anchor='middle'>auth</text><text class='d-sub' x='270' y='91' text-anchor='middle'>next()</text>
  <path class='d-edge-accent' d='M312 77 H336' marker-end='url(#i7)'/>
  <rect class='d-box-accent' x='338' y='55' width='106' height='44' rx='8'/><text class='d-sub' x='391' y='81' text-anchor='middle'>route handler</text>
  <defs><marker id='i7' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Express maintains an ordered stack; for each request it invokes middleware top-to-bottom. A middleware either **responds** (ending the chain) or calls <code>next()</code> to continue — forgetting <code>next()</code> hangs the request. You scope middleware **globally** (<code>app.use</code>), **per-path**, or **per-route**, and order matters (e.g. body parser before handlers, auth before protected routes). **Error-handling** middleware is special — it takes **four** args <code>(err, req, res, next)</code> and runs when something calls <code>next(err)</code>. This composition keeps concerns modular and reusable.

### Middleware kinds
| Kind | Signature / scope |
| --- | --- |
| application | <code>app.use(fn)</code> |
| router/route | <code>router.get(path, fn)</code> |
| built-in/3rd-party | <code>express.json()</code>, <code>cors()</code> |
| error-handling | <code>(err, req, res, next)</code> |

> **Interview tip:** Stress the **<code>(req,res,next)</code> contract and ordering** — call <code>next()</code> or respond — and that **error middleware has 4 args**. Order matters: parsers/auth before handlers.`,
    examples: [
      {
        label: "Logger + auth + error middleware",
        tech: "javascript",
        runnable: false,
        code: `// runs for every request, then passes on
app.use((req, res, next) => { console.log(req.method, req.url); next(); });

// guard: respond OR continue
function auth(req, res, next) {
  if (!req.headers.authorization) return res.status(401).end();
  next();
}
app.get('/secret', auth, (req, res) => res.send('ok'));

// error middleware — note the 4 args
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));`,
      },
    ],
  },
];

export default augments;
