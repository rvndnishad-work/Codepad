/**
 * SYSTEM DESIGN ULTRA — batch 03: Real-time communication. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `When would you use WebSockets vs polling vs SSE?`,
    difficulty: "medium",
    seoDescription: `Short polling, long polling, Server-Sent Events and WebSockets compared: latency, request load, reconnects, proxies, and when each one is the right choice.`,
    description: `**Question presented to candidate:**
"Our app needs to show fresh data without the user pressing refresh. You could poll, long-poll, use Server-Sent Events or open a WebSocket. How do they differ, and how would you pick one for, say, a live sports score page versus a chat app?"

**What a strong answer should cover:**
- How each works: **short polling** (ask on a timer), **long polling** (server holds the request until there is news), **SSE** (one HTTP response that never ends, server to client only), **WebSocket** (an upgraded connection carrying messages both ways)
- The cost model: polling trades latency against empty requests; push transports trade request load for **long-lived connections** that the server and every proxy must hold
- SSE details that matter: plain HTTP, built-in reconnect with **Last-Event-ID**, text only, the **6-connection-per-domain limit over HTTP/1.1** that HTTP/2 removes
- WebSocket details: **HTTP Upgrade** handshake (RFC 6455), tiny frame overhead, binary support, no built-in reconnect or resume, idle timeouts at load balancers
- A decision rule tied to the product: update frequency, direction of data, client count, and infrastructure (proxies, serverless, mobile battery)

**Clarifying questions expected:**
- How often does the data change, and how stale may the screen be?
- Does the client need to send frequent messages back, or only receive?
- How many clients are connected at once, and what sits between them and the servers (CDN, corporate proxies, a serverless platform)?

**Code / implementation expected:** Optional — a clear comparison and a reasoned choice; the example simulates all four on the same minute of events.`,
    answer: `**Target Audience:** Beginners to system design who have built a web page that calls an API; no networking background assumed.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Protocol facts are cited from RFC 6455, RFC 8441, MDN and the AWS load balancer docs.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Numbers come from running the example; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

You are waiting for a parcel. You can walk to the front door every five minutes to check (**short polling**). You can stand at the door holding it open, and the courier hands you the parcel the moment they arrive, after which you go back and stand there again (**long polling**). You can give the courier company a phone number and they call you every time anything changes, but you cannot call them back on that line (**Server-Sent Events**). Or you can keep an open phone call with the courier all day, and either of you can talk at any moment (**WebSocket**).

Walking to the door is simple and needs nothing special, but most trips are wasted and you can be up to five minutes late. The open phone call is instant, but somebody has to hold a phone for every customer all day. That is the whole trade-off: **wasted requests and lag** against **held connections**.

The web was built on request and response: the browser asks, the server answers, the exchange ends. The server cannot start a conversation. Every technique here is a way around that rule.

## 2. The Four Options, One at a Time

### Short polling

The client sends \`GET /scores\` every N seconds. Each answer is complete and the connection can be reused or closed.

📌 **Interview term: short polling** — repeating an ordinary request on a fixed interval. Worst-case staleness is one interval plus a round trip; cost is one full HTTP exchange per client per interval, whether or not anything changed.

### Long polling

The client sends a request; the server does **not** answer until it has news (or a timeout, often 20–30 seconds, passes). The moment the client gets an answer, it sends the next request.

📌 **Interview term: long polling** — an HTTP request the server deliberately holds open until there is data. Latency is close to push, but there is a small **gap** after each answer while the next request travels to the server; events in that gap wait.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Short polling sends a request every interval and most answers are empty; long polling holds each request until an event arrives">
  <defs>
    <marker id="sd03q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="40">Short polling</text>
  <rect class="d-box-muted" x="20" y="60" width="680" height="70" rx="10"/>
  <path class="d-edge" d="M 80 120 L 80 75" marker-end="url(#sd03q1-arrow)"/>
  <text class="d-sub" x="80" y="100" text-anchor="middle" dx="34">empty</text>
  <path class="d-edge" d="M 240 120 L 240 75" marker-end="url(#sd03q1-arrow)"/>
  <text class="d-sub" x="240" y="100" text-anchor="middle" dx="34">empty</text>
  <path class="d-edge-accent" d="M 400 120 L 400 75" marker-end="url(#sd03q1-arrow)"/>
  <text class="d-accent" x="400" y="100" text-anchor="middle" dx="34">data</text>
  <path class="d-edge" d="M 560 120 L 560 75" marker-end="url(#sd03q1-arrow)"/>
  <text class="d-sub" x="560" y="100" text-anchor="middle" dx="34">empty</text>
  <text class="d-text" x="20" y="190">Long polling</text>
  <rect class="d-box-muted" x="20" y="210" width="680" height="70" rx="10"/>
  <path class="d-edge-dashed" d="M 80 245 L 330 245"/>
  <path class="d-edge-accent" d="M 330 270 L 330 222" marker-end="url(#sd03q1-arrow)"/>
  <text class="d-sub" x="205" y="235" text-anchor="middle">request held</text>
  <path class="d-edge-dashed" d="M 350 245 L 600 245"/>
  <path class="d-edge-accent" d="M 600 270 L 600 222" marker-end="url(#sd03q1-arrow)"/>
  <text class="d-sub" x="475" y="235" text-anchor="middle">request held</text>
</svg>

Each arrow is an answer reaching the client. Short polling answers on the clock, mostly with nothing; long polling answers only when there is news, then immediately asks again.

### Server-Sent Events (SSE)

The client opens one HTTP request with \`Accept: text/event-stream\`, and the server never finishes the response. It writes events as lines of text:

~~~text
id: 42
event: score
data: {"home":2,"away":1}

~~~

The browser API is \`new EventSource("/stream")\`. If the connection drops, the browser reconnects by itself and sends the last \`id\` it saw in a \`Last-Event-ID\` request header, so the server can replay what was missed. The server can set the reconnect delay with a \`retry:\` line. These rules are part of the WHATWG HTML standard.

📌 **Interview term: Server-Sent Events (SSE)** — a one-way, server-to-client stream of text events over a normal HTTP response, with automatic reconnection and resume by event ID built into the browser.

**The connection limit.** Over HTTP/1.1 browsers allow only **6 connections per domain**, shared by all tabs, and MDN warns that each open \`EventSource\` uses one. The Chrome and Firefox bugs about it are marked "Won't fix". Over **HTTP/2** many streams share one connection, so serve SSE over HTTP/2 or HTTP/3.

### WebSocket

The client sends an ordinary HTTP request with \`Upgrade: websocket\`; the server answers \`101 Switching Protocols\`, and from then on the same TCP connection carries **frames** in both directions. The protocol is **RFC 6455** (December 2011). **RFC 8441** (September 2018) defines how to run a WebSocket over one stream of an HTTP/2 connection using extended \`CONNECT\`, because HTTP/2 has no \`Upgrade\` header.

📌 **Interview term: WebSocket** — a full-duplex, message-oriented connection that starts as an HTTP request and is then upgraded. Either side can send at any time; text and binary are both supported.

📌 **Interview term: frame** — the WebSocket unit on the wire. Per RFC 6455 a server-to-client frame with a payload under 126 bytes has a 2-byte header; client-to-server frames add a 4-byte masking key. Compare that with hundreds of bytes of headers on every HTTP request.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="SSE keeps one response open and the server writes events down it; a WebSocket carries messages in both directions on one connection">
  <defs>
    <marker id="sd03q1-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="140" height="64" rx="10"/>
  <text class="d-text" x="90" y="67" text-anchor="middle">Browser</text>
  <rect class="d-box-accent" x="560" y="30" width="140" height="64" rx="10"/>
  <text class="d-text" x="630" y="67" text-anchor="middle">Server</text>
  <path class="d-edge-accent" d="M 554 62 L 166 62" marker-end="url(#sd03q1-arrow2)"/>
  <text class="d-sub" x="360" y="48" text-anchor="middle">SSE: events, one way</text>
  <rect class="d-box" x="20" y="160" width="140" height="64" rx="10"/>
  <text class="d-text" x="90" y="197" text-anchor="middle">Browser</text>
  <rect class="d-box-accent" x="560" y="160" width="140" height="64" rx="10"/>
  <text class="d-text" x="630" y="197" text-anchor="middle">Server</text>
  <path class="d-edge-accent" d="M 554 180 L 166 180" marker-end="url(#sd03q1-arrow2)"/>
  <path class="d-edge-accent" d="M 166 206 L 554 206" marker-end="url(#sd03q1-arrow2)"/>
  <text class="d-sub" x="360" y="168" text-anchor="middle">WebSocket: frames both ways</text>
</svg>

The client can still send data alongside SSE — with ordinary \`POST\` requests. That combination (SSE down, HTTP up) covers more products than people expect.

## 3. One Minute, Four Strategies — Measured

The example puts all four on a fake clock: six events in one minute (two close together at 41.5 s and 41.53 s), a 50 ms one-way network delay, an assumed 700 bytes of headers per HTTP exchange and 60-byte payloads.

~~~text
strategy              requests  empty  avg ms  max ms  bytes
short poll every 5s   12        8      2512    3550    8760
short poll every 1s   60        56     512     950     42360
long poll (30s hold)  7         1      62      120     5260
SSE                   1         0      50      50      1144
WebSocket             1         0      50      50      1072
~~~

What it shows:

- **Short polling is a dial between waste and lag.** Every 5 s: 8 of 12 requests came back empty and events waited 2.5 s on average. Every 1 s: latency drops to 512 ms, but 56 of 60 requests are empty and the bytes rise almost five-fold.
- **Long polling gets close to push.** Average 62 ms, but the event at 41.53 s waited 120 ms because it arrived while the client was still re-sending its request (the gap). One request timed out empty after 30 s of silence.
- **SSE and WebSocket** pay one handshake and then a few bytes per event: SSE adds its \`id:\`/\`data:\` text framing, WebSocket a 2-byte frame header.

Scale it to a million clients and the difference becomes architecture, not tuning:

~~~text
short poll every 5s: 200,000 requests/s, 1.1 Gbit/s of headers alone
short poll every 1s: 1,000,000 requests/s, 5.6 Gbit/s of headers alone
long poll (7 requests/min each, as above): 116,667 requests/s, plus 1,000,000 held requests
SSE or WebSocket: 1,000,000 open connections, 0 requests/s when idle
~~~

With push, the cost moves from **requests per second** to **connections held**: memory per socket, file descriptors, and every proxy on the path keeping state. That is its own design problem, covered in [How do you scale WebSockets to 1M connections with Redis Pub/Sub?](/interview-question/how-do-you-scale-websockets-to-1m-connections-with-redis-pub-sub).

📌 **Interview term: fan-out** — delivering one event to many connected clients. With push, the server does fan-out; with polling, every client pulls the same data separately (which a cache or CDN can absorb, see [What is a CDN and how does it work?](/interview-question/what-is-a-cdn-and-how-does-it-work)).

## 4. Side-by-Side Comparison

| | Short polling | Long polling | SSE | WebSocket |
| :--- | :--- | :--- | :--- | :--- |
| Direction | client pulls | client pulls, server delays | server to client | both ways |
| Latency | up to one interval | near push, small gap | push | push |
| Load when idle | full request every interval | one held request per client | one held connection | one held connection |
| Protocol | plain HTTP | plain HTTP | plain HTTP, \`text/event-stream\` | HTTP Upgrade, then frames |
| Data | anything | anything | UTF-8 text | text or binary |
| Reconnect and resume | not needed | client loop | built in (\`Last-Event-ID\`) | you build it |
| Caching by CDN | yes | no | no | no |
| Works through strict proxies | always | usually | usually (it is HTTP) | sometimes blocked or cut |
| Typical use | dashboards refreshed each minute, job status | legacy fallback, simple notifications | feeds, live scores, progress, LLM token streaming | chat, multiplayer, collaborative editing, trading |

## 5. How to Choose

Ask three questions in order:

1. **How fresh must the data be?** If a minute is fine, poll — it is cacheable, stateless and works everywhere. Do not build a connection tier for a dashboard that refreshes every 60 s.
2. **Does the client send often?** If messages flow mainly server to client (scores, notifications, a progress bar, streaming text from a model), use **SSE** and send the occasional user action with a normal \`POST\`.
3. **Is it truly interactive?** Typing indicators, cursors, game input, many small messages each way: **WebSocket**. Then plan for what it does not give you: heartbeats, reconnect with backoff, resume after a drop, and authentication on connect. Those are the subject of [WebSocket presence, sticky sessions, and resume — do you need sticky LB?](/interview-question/websocket-presence-sticky-sessions-and-resume-do-you-need-sticky-lb).

For a live sports score page: SSE (or even 10-second polling behind a CDN, if millions watch the same match). For chat: WebSocket, as in [How would you design a real-time chat system?](/interview-question/how-would-you-design-a-real-time-chat-system).

📌 **Interview term: heartbeat (ping/pong)** — a small message sent on a timer so both sides and every middlebox see traffic. It detects dead peers and stops idle timeouts from closing the connection. WebSocket has ping and pong control frames for this; SSE servers send a comment line (\`: ping\`).

## 6. Verified: Running the Code

The example **"Polling, long polling, SSE and WebSocket on one simulated minute: requests, latency, bytes"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
Part 1: one client, one minute, 6 events, one-way delay 50 ms
strategy              requests  empty  avg ms  max ms  bytes
short poll every 5s   12        8      2512    3550    8760
short poll every 1s   60        56     512     950     42360
long poll (30s hold)  7         1      62      120     5260
SSE                   1         0      50      50      1144
WebSocket             1         0      50      50      1072
long poll latencies: 50, 50, 50, 50, 120, 50 (the 41530 event arrived while no request was waiting)

Part 2: the same choice for 1,000,000 connected clients
short poll every 5s: 200,000 requests/s, 1.1 Gbit/s of headers alone
short poll every 1s: 1,000,000 requests/s, 5.6 Gbit/s of headers alone
long poll (7 requests/min each, as above): 116,667 requests/s, plus 1,000,000 held requests
SSE or WebSocket: 1,000,000 open connections, 0 requests/s when idle
~~~

What the simulation stands for and leaves out: the clock is a variable and the network is a constant 50 ms each way, so there is no TCP slow start, no packet loss and no TLS handshake. The 700-byte header figure is an assumption (real headers range from a few hundred bytes to several kilobytes with cookies; HTTP/2 header compression shrinks repeats). The bytes column counts headers, payload and stream framing only.

## Edge Cases Worth Knowing

- **Idle timeouts kill quiet connections.** An AWS Application Load Balancer closes a connection after **60 seconds** without data by default (configurable from 1 to 4000 s, per the AWS ELB docs). Send heartbeats more often than the shortest timeout on the path.
- **Buffering proxies break SSE.** A proxy or compression layer that buffers responses holds your events until the buffer fills. Disable buffering for the stream path (for example nginx \`X-Accel-Buffering: no\`).
- **Serverless platforms and long connections do not mix well.** Functions billed per duration, or with a maximum run time, are a poor fit for connections held for hours; use a managed WebSocket gateway or a dedicated connection tier.
- **Mobile battery and network changes.** Phones switch between Wi-Fi and cellular, and a held connection dies silently. Clients need reconnect with backoff and jitter, or a reconnect storm follows every deploy.
- **WebSocket bypasses HTTP tooling.** Rate limits, auth middleware, request logs and CDN caching all work per request; after the upgrade there are no more requests, so you need per-message equivalents.

## Common Pitfalls

- **Reaching for WebSockets by default.** If the data flows one way, SSE gives you reconnect and resume for free over plain HTTP.
- **Polling every second "to feel real-time".** In the run it made 56 of 60 requests empty; at a million clients that is a million requests a second.
- **Opening SSE over HTTP/1.1 in several tabs.** The 6-per-domain browser limit blocks the seventh connection and every other request to that domain.
- **Forgetting heartbeats.** Quiet connections are dropped by load balancers and NATs without either end noticing.
- **No resume plan.** A reconnect that does not send "last seen ID" silently loses messages sent during the gap.
- **Ignoring the gap in long polling.** Events that arrive while the next request is in flight must be buffered on the server, or they are lost.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core trade:</strong> <span style="color:#f0e2c8;">Polling pays in <strong style="color:#ffca28;">wasted requests and lag</strong>; push transports pay in <strong style="color:#ffca28;">held connections</strong>. Every option sits somewhere on that line.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The four options:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Short polling</strong> repeats a request on a timer; <strong style="color:#ffca28;">long polling</strong> holds each request until there is news; <strong style="color:#ffca28;">SSE</strong> is one never-ending HTTP response, server to client, with built-in reconnect and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Last-Event-ID</code>; <strong style="color:#ffca28;">WebSocket</strong> upgrades the connection to frames in both directions (RFC 6455).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Numbers:</strong> <span style="color:#f0e2c8;">In my simulation, polling every 5 s left 8 of 12 requests empty and events 2.5 s late on average; at a million clients that is 200,000 requests a second. SSE and WebSocket delivered in one network delay with a few bytes of framing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Choice:</strong> <span style="color:#f0e2c8;">Slow-changing data: poll, ideally through a cache. Server-to-client streams: <strong style="color:#ffca28;">SSE</strong>, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">POST</code> for the rare upload. Truly interactive, high-frequency both ways: <strong style="color:#ffca28;">WebSocket</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Operations:</strong> <span style="color:#f0e2c8;">Push needs heartbeats under the load balancer idle timeout (60 s default on AWS ALB), reconnect with backoff and jitter, resume from a last-seen ID, and HTTP/2 for SSE to avoid the 6-connection browser limit.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use WebSockets for everything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They are stateful: every connection is held by a server and every proxy, they bypass HTTP caching and per-request middleware, and you must build reconnect, resume and heartbeats yourself. For one-way data, SSE gives those for free.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does SSE resume after a dropped connection?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The browser reconnects automatically and sends the last event <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id</code> it received in the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Last-Event-ID</code> header. The server replays events after that ID from a log or buffer. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">retry:</code> field sets the reconnect delay.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the catch with long polling?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After each answer there is a gap until the next request reaches the server; events in that gap must be buffered or they are lost. In the run, an event 30 ms after another waited 120 ms instead of 50. It also costs one full HTTP exchange per event.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do WebSockets work with HTTP/2?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">HTTP/2 has no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Upgrade</code> mechanism, so RFC 8441 adds an extended <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CONNECT</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:protocol</code> pseudo-header that tunnels one WebSocket over one HTTP/2 stream. Many deployments still use HTTP/1.1 for the upgrade.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">A million users watch one live match score. What would you pick?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The data is identical for everyone and one-way, so either SSE from a fan-out tier or short polling of a cached JSON file through a CDN with a few seconds of TTL. Polling through a CDN moves all the load to the edge and needs no connection tier at all.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Short polling | Repeating a normal request on a fixed interval |
| Long polling | A request the server holds open until there is data |
| Server-Sent Events (SSE) | One-way text event stream over an HTTP response, with auto-reconnect |
| WebSocket | Full-duplex message connection started by an HTTP Upgrade |
| Frame | The WebSocket unit on the wire, with a 2-byte minimum header |
| Fan-out | Delivering one event to many clients |
| Heartbeat (ping/pong) | Periodic small message that keeps a connection alive and detects dead peers |

**Conclusion:** The four techniques answer one question — how does a server tell a client something the client did not ask for — and they differ in where the cost lands. Polling keeps servers stateless at the price of empty requests and staleness; long polling narrows the staleness but keeps the request overhead; SSE and WebSocket deliver in one network delay but turn every client into a held connection. Pick by freshness, direction and scale: poll for slow data, SSE for server-to-client streams, WebSocket for real two-way interaction, and in every push design budget for heartbeats, reconnects and resume.`,
    examples: [
      {
        label: `Polling, long polling, SSE and WebSocket on one simulated minute: requests, latency, bytes`,
        variants: [
          { tech: "node", code: `// Polling vs long polling vs SSE vs WebSocket on one simulated minute.
// Times are integer milliseconds on a fake clock; the network is a fixed delay.
const EVENTS = [3200, 3900, 17000, 41500, 41530, 58100]; // when the server learns news
const END = 60000;
const ONE_WAY = 50;          // ms, client <-> server, one direction
const HTTP_HEADERS = 700;    // assumed bytes of request + response headers per HTTP exchange
const PAYLOAD = 60;          // bytes of JSON per event

function shortPoll(interval) {
  let requests = 0, empty = 0, i = 0;
  const lat = [];
  for (let t = interval; t <= END; t += interval) {   // request reaches server at t
    requests++;
    let got = 0;
    while (i < EVENTS.length && EVENTS[i] <= t) { lat.push(t + ONE_WAY - EVENTS[i]); i++; got++; }
    if (got === 0) empty++;
  }
  return { requests, empty, lat, bytes: requests * HTTP_HEADERS + lat.length * PAYLOAD };
}

function longPoll(timeout) {
  let requests = 0, empty = 0, i = 0, pendingAt = ONE_WAY; // first request arrives at 50 ms
  const lat = [];
  while (pendingAt < END) {
    requests++;
    const next = i < EVENTS.length ? Math.max(EVENTS[i], pendingAt) : Infinity;
    let answerAt;
    if (next <= pendingAt + timeout && next < END) {
      answerAt = next;
      while (i < EVENTS.length && EVENTS[i] <= answerAt) { lat.push(answerAt + ONE_WAY - EVENTS[i]); i++; }
    } else {
      answerAt = Math.min(pendingAt + timeout, END);
      empty++;
    }
    pendingAt = answerAt + 2 * ONE_WAY; // response travels back, client sends a new request
  }
  return { requests, empty, lat, bytes: requests * HTTP_HEADERS + lat.length * PAYLOAD };
}

function stream(kind) {
  // One HTTP request (SSE) or one upgrade (WebSocket), then every event is pushed.
  const lat = EVENTS.map(() => ONE_WAY);
  let framing = 0;
  EVENTS.forEach((_, n) => {
    if (kind === "sse") framing += ("id: " + (n + 1) + "\\n").length + "data: ".length + "\\n\\n".length;
    else framing += 2; // RFC 6455: 2-byte header for an unmasked server frame under 126 bytes
  });
  return { requests: 1, empty: 0, lat, bytes: HTTP_HEADERS + framing + EVENTS.length * PAYLOAD };
}

const pad = (s, n) => String(s).padEnd(n);
const avg = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
console.log("Part 1: one client, one minute, 6 events, one-way delay 50 ms");
console.log(pad("strategy", 22) + pad("requests", 10) + pad("empty", 7) + pad("avg ms", 8) + pad("max ms", 8) + "bytes");
const rows = [
  ["short poll every 5s", shortPoll(5000)],
  ["short poll every 1s", shortPoll(1000)],
  ["long poll (30s hold)", longPoll(30000)],
  ["SSE", stream("sse")],
  ["WebSocket", stream("ws")],
];
for (const [name, r] of rows) {
  console.log(pad(name, 22) + pad(r.requests, 10) + pad(r.empty, 7) + pad(avg(r.lat), 8) + pad(Math.max(...r.lat), 8) + r.bytes);
}
const lp = longPoll(30000).lat;
console.log("long poll latencies: " + lp.join(", ") + " (the 41530 event arrived while no request was waiting)");

console.log("\\nPart 2: the same choice for 1,000,000 connected clients");
const N = 1000000;
for (const s of [5, 1]) {
  const rps = N / s;
  console.log("short poll every " + s + "s: " + rps.toLocaleString("en-US") + " requests/s, " +
    ((rps * HTTP_HEADERS * 8) / 1e9).toFixed(1) + " Gbit/s of headers alone");
}
const lpPerMin = longPoll(30000).requests;
const lpRps = Math.round((N * lpPerMin) / 60);
console.log("long poll (" + lpPerMin + " requests/min each, as above): " + lpRps.toLocaleString("en-US") + " requests/s, plus 1,000,000 held requests");
console.log("SSE or WebSocket: 1,000,000 open connections, 0 requests/s when idle");` },
          { tech: "python", code: `# Polling vs long polling vs SSE vs WebSocket on one simulated minute.
# Times are integer milliseconds on a fake clock; the network is a fixed delay.
EVENTS = [3200, 3900, 17000, 41500, 41530, 58100]  # when the server learns news
END = 60000
ONE_WAY = 50          # ms, client <-> server, one direction
HTTP_HEADERS = 700    # assumed bytes of request + response headers per HTTP exchange
PAYLOAD = 60          # bytes of JSON per event
INF = float("inf")


def short_poll(interval):
    requests = empty = i = 0
    lat = []
    for t in range(interval, END + 1, interval):  # request reaches server at t
        requests += 1
        got = 0
        while i < len(EVENTS) and EVENTS[i] <= t:
            lat.append(t + ONE_WAY - EVENTS[i]); i += 1; got += 1
        if got == 0:
            empty += 1
    return dict(requests=requests, empty=empty, lat=lat, bytes=requests * HTTP_HEADERS + len(lat) * PAYLOAD)


def long_poll(timeout):
    requests = empty = i = 0
    pending_at = ONE_WAY  # first request arrives at 50 ms
    lat = []
    while pending_at < END:
        requests += 1
        nxt = max(EVENTS[i], pending_at) if i < len(EVENTS) else INF
        if nxt <= pending_at + timeout and nxt < END:
            answer_at = nxt
            while i < len(EVENTS) and EVENTS[i] <= answer_at:
                lat.append(answer_at + ONE_WAY - EVENTS[i]); i += 1
        else:
            answer_at = min(pending_at + timeout, END)
            empty += 1
        pending_at = answer_at + 2 * ONE_WAY  # response travels back, client sends a new request
    return dict(requests=requests, empty=empty, lat=lat, bytes=requests * HTTP_HEADERS + len(lat) * PAYLOAD)


def stream(kind):
    # One HTTP request (SSE) or one upgrade (WebSocket), then every event is pushed.
    lat = [ONE_WAY for _ in EVENTS]
    framing = 0
    for n in range(len(EVENTS)):
        if kind == "sse":
            framing += len("id: " + str(n + 1) + "\\n") + len("data: ") + len("\\n\\n")
        else:
            framing += 2  # RFC 6455: 2-byte header for an unmasked server frame under 126 bytes
    return dict(requests=1, empty=0, lat=lat, bytes=HTTP_HEADERS + framing + len(EVENTS) * PAYLOAD)


def pad(s, n):
    return str(s).ljust(n)


def avg(a):
    return int(sum(a) / len(a) + 0.5)


print("Part 1: one client, one minute, 6 events, one-way delay 50 ms")
print(pad("strategy", 22) + pad("requests", 10) + pad("empty", 7) + pad("avg ms", 8) + pad("max ms", 8) + "bytes")
rows = [
    ("short poll every 5s", short_poll(5000)),
    ("short poll every 1s", short_poll(1000)),
    ("long poll (30s hold)", long_poll(30000)),
    ("SSE", stream("sse")),
    ("WebSocket", stream("ws")),
]
for name, r in rows:
    print(pad(name, 22) + pad(r["requests"], 10) + pad(r["empty"], 7) + pad(avg(r["lat"]), 8) + pad(max(r["lat"]), 8) + str(r["bytes"]))
lp = long_poll(30000)["lat"]
print("long poll latencies: " + ", ".join(str(x) for x in lp) + " (the 41530 event arrived while no request was waiting)")

print("\\nPart 2: the same choice for 1,000,000 connected clients")
N = 1000000
for s in (5, 1):
    rps = N // s
    print(f"short poll every {s}s: {rps:,} requests/s, {rps * HTTP_HEADERS * 8 / 1e9:.1f} Gbit/s of headers alone")
lp_per_min = long_poll(30000)["requests"]
lp_rps = int(N * lp_per_min / 60 + 0.5)
print(f"long poll ({lp_per_min} requests/min each, as above): {lp_rps:,} requests/s, plus 1,000,000 held requests")
print("SSE or WebSocket: 1,000,000 open connections, 0 requests/s when idle")` },
        ],
      },
    ],
  },
  {
    title: `WebSocket presence, sticky sessions, and resume — do you need sticky LB?`,
    difficulty: "medium",
    seoDescription: `Do WebSocket servers need sticky load balancing? Where presence and resume state belong, heartbeat TTLs, replay by sequence number, when stickiness helps.`,
    description: `**Question presented to candidate:**
"We run a chat product on a fleet of WebSocket servers behind a load balancer. Product wants an accurate online indicator, and when a phone drops off the network for a few seconds it should reconnect and get the messages it missed. Do we need sticky sessions on the load balancer to make that work? Where does the state live?"

**What a strong answer should cover:**
- An open WebSocket is already pinned to one server for its whole life; **stickiness only matters for the next connection** (a reconnect) or for transports made of several HTTP requests (long-polling fallbacks such as Socket.IO's, which its docs say require sticky sessions)
- Keeping resume buffers or presence in **server memory** makes correctness depend on routing and on that server staying alive; **externalising** them (presence store with TTLs, a per-conversation log with sequence numbers) lets any server serve any reconnect
- **Presence** as heartbeats with a TTL, and why a silent disconnect is only detected when the TTL expires; multi-device presence; the cost of fanning presence changes out
- **Resume**: the client sends its last sequence number, the server replays from a durable log, and falls back to a full resync when the gap is too old
- Stickiness as an **optimisation** (warm caches, fewer cross-node hops), and why hash-mod-N stickiness reshuffles users when the fleet changes

**Clarifying questions expected:**
- How long may a client be gone and still expect a seamless resume (seconds, minutes, days)?
- Is presence per user or per device, and who needs to see it (friends, a room, everyone)?
- Do clients ever fall back to HTTP long polling?

**Code / implementation expected:** Optional — a design with the state placed explicitly; the example shows resume succeeding or failing under each choice.`,
    answer: `**Target Audience:** Engineers who know what a WebSocket is (see [When would you use WebSockets vs polling vs SSE?](/interview-question/when-would-you-use-websockets-vs-polling-vs-sse)) and want to run them on more than one server.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Socket.IO and AWS facts are cited from their documentation.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the vocabulary an interviewer expects. Behaviour claims come from the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A hotel has three receptionists. You check in with Priya, and she writes your messages on a notepad at her desk: "the taxi called", "your parcel arrived". You go out for an hour. When you come back, the lobby sends you to whichever receptionist is free — Tom. Tom has no idea who you are and no notepad. Your messages are on Priya's desk.

Two fixes exist. The lobby can always send you back to Priya (**sticky sessions**). Or the hotel can keep messages in a shared logbook behind the desk that any receptionist can read (**externalised state**). The first fix fails the day Priya is off sick; the second does not care who is on shift.

WebSocket servers are those receptionists. The "online" dot next to a name and "here is what you missed" after a reconnect are the notepad. The question is not really about the load balancer; it is about **where you put that state**.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How long can a client be away and still resume? | Seconds can be served from a short buffer; days need a durable log or a full resync from the database |
| Presence per user or per device? | A user with a phone and a laptop is online if any device is; you count connections, not users |
| Who sees presence changes? | Pushing every change to 200 friends is far more expensive than letting clients fetch presence when they open a screen |
| Do clients fall back to long polling? | Multi-request transports need every request of a session on the same server, so stickiness becomes mandatory |
| How often do we deploy or scale the WebSocket tier? | Every restart disconnects its clients; frequent changes make in-memory state and hash-based stickiness painful |
| How accurate must "online" be? | Faster detection means more frequent heartbeats and more writes to the presence store |

## 3. What Sticky Actually Means for a WebSocket

📌 **Interview term: sticky session (session affinity)** — a load balancer rule that sends requests from the same client to the same backend, usually by a cookie or by hashing the client IP or user ID.

An ordinary HTTP app sends many separate requests, so affinity changes behaviour on every request. A WebSocket is different: after the upgrade handshake it is **one TCP connection**, and the load balancer forwards it to one server until it closes. There is nothing left to route. Stickiness can only affect:

1. **The next connection** — a reconnect after a network drop, a deploy or a crash.
2. **Transports made of several HTTP requests.** Socket.IO starts with HTTP long polling by default; its "Using multiple nodes" docs say sticky sessions are then **required**, otherwise requests hit a server that does not know the session and fail with HTTP 400 "Session ID unknown". With the WebSocket transport only, that requirement disappears.

So for a plain WebSocket tier the honest answer is: **you do not need sticky routing for correctness if you do not keep correctness-critical state in server memory.**

## 4. The State, and Where It Should Live

| State | Lives on the server because | Should live in |
| :--- | :--- | :--- |
| The socket itself | it is a kernel object | the server — unavoidable |
| Subscriptions (which rooms this socket listens to) | needed to route messages to it | server memory, rebuilt on reconnect from the user profile |
| Missed-message buffer for resume | convenient | a durable per-conversation log with sequence numbers |
| Presence (who is online) | convenient | a shared store with TTL keys, written by heartbeats |
| "Which server holds user X" | needed for targeted delivery | a shared routing registry, or pub/sub so no registry is needed |

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Clients reach any of three WebSocket servers through a load balancer; all servers read and write a shared presence store and a shared message log">
  <defs>
    <marker id="sd03q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="130" width="130" height="64" rx="10"/>
  <text class="d-text" x="85" y="158" text-anchor="middle">Clients</text>
  <text class="d-sub" x="85" y="180" text-anchor="middle">lastSeq per chat</text>
  <rect class="d-box" x="210" y="130" width="120" height="64" rx="10"/>
  <text class="d-text" x="270" y="167" text-anchor="middle">LB</text>
  <rect class="d-box" x="400" y="30" width="140" height="56" rx="10"/>
  <text class="d-text" x="470" y="63" text-anchor="middle">ws-a</text>
  <rect class="d-box" x="400" y="134" width="140" height="56" rx="10"/>
  <text class="d-text" x="470" y="167" text-anchor="middle">ws-b</text>
  <rect class="d-box" x="400" y="238" width="140" height="56" rx="10"/>
  <text class="d-text" x="470" y="271" text-anchor="middle">ws-c</text>
  <rect class="d-box-accent" x="610" y="60" width="130" height="64" rx="10"/>
  <text class="d-text" x="675" y="88" text-anchor="middle">Presence</text>
  <text class="d-sub" x="675" y="110" text-anchor="middle">TTL keys</text>
  <rect class="d-box-accent" x="610" y="200" width="130" height="64" rx="10"/>
  <text class="d-text" x="675" y="228" text-anchor="middle">Message log</text>
  <text class="d-sub" x="675" y="250" text-anchor="middle">seq numbers</text>
  <path class="d-edge" d="M 150 162 L 204 162" marker-end="url(#sd03q2-arrow)"/>
  <path class="d-edge" d="M 330 150 L 394 62" marker-end="url(#sd03q2-arrow)"/>
  <path class="d-edge" d="M 330 162 L 394 162" marker-end="url(#sd03q2-arrow)"/>
  <path class="d-edge" d="M 330 176 L 394 266" marker-end="url(#sd03q2-arrow)"/>
  <path class="d-edge-dashed" d="M 540 58 L 604 84"/>
  <path class="d-edge-dashed" d="M 540 162 L 604 100"/>
  <path class="d-edge-dashed" d="M 540 162 L 604 224"/>
  <path class="d-edge-dashed" d="M 540 266 L 604 240"/>
</svg>

The load balancer can send a reconnect to any server, because every server reads the same presence store and the same log. The only thing a server owns is the sockets currently attached to it.

## 5. Resume: Sequence Numbers and Replay

📌 **Interview term: sequence number** — a per-conversation counter assigned when a message is stored: 1, 2, 3 and so on. It gives a total order and lets a client say precisely what it has.

📌 **Interview term: resume (replay)** — on reconnect the client sends \`lastSeq\` for each conversation; the server reads the log from \`lastSeq + 1\` and sends the gap before live messages. If the gap is older than the log keeps, the server tells the client to do a **full resync** (reload recent history from the database).

The example runs both placements on three servers. Alice has seen messages 1–3; messages 4 and 5 arrive while she is away:

~~~text
Part 1: alice saw seq 1-3, messages 4 and 5 arrive while she is away, she reconnects
  only her network dropped:
    buffer in server memory, round-robin  ws-a -> ws-b: no session here: missed 4,5
    buffer in server memory, sticky       ws-c -> ws-c: replays [4,5]
    log in shared store, round-robin      ws-a -> ws-b: replays [4,5]
  her server crashed:
    buffer in server memory, round-robin  ws-a -> ws-c: no session here: missed 4,5
    buffer in server memory, sticky       ws-c -> ws-b: no session here: missed 4,5
    log in shared store, round-robin      ws-a -> ws-c: replays [4,5]
~~~

Stickiness rescues the in-memory design only while the server survives. The shared log works with plain round-robin in both cases. In practice the log is a Redis Stream, a Kafka partition or the messages table itself, indexed by \`(conversation_id, seq)\`. The **client** also deduplicates by sequence number, because a message can arrive both live and in the replay.

📌 **Interview term: connection draining** — on a deploy, the load balancer stops sending new connections to a server and the server closes its sockets gradually, so clients reconnect elsewhere in a trickle rather than all at once. With a shared log, each of those reconnects resumes cleanly.

## 6. Presence: Heartbeats and TTLs

📌 **Interview term: presence** — knowing which users or devices are connected right now, usually shown as an online dot or "last seen".

The naive version — mark online on connect, offline on disconnect — breaks because many disconnects are **silent**: a laptop lid closes, a phone loses signal, a server crashes. No close frame ever arrives. So presence is built from **heartbeats**: each connection refreshes a key such as \`presence:alice:device-1\` with a TTL every N seconds, and "online" means "the key exists".

📌 **Interview term: TTL-based liveness** — treating an entity as alive while it keeps renewing a key that would otherwise expire. Detection delay is up to one TTL after the last heartbeat; tolerance for missed heartbeats is TTL divided by the interval.

~~~text
Part 2: presence with heartbeats every 10s and a 30s TTL in the shared store
  t= 0s online: alice,bob
  t=10s online: alice,bob
  t=20s online: alice,bob
  t=30s online: alice,bob
  t=40s online: alice,bob
  t=50s online: bob
  t=60s online: bob
  alice shows online until t=49s: a dead socket is only noticed by TTL
~~~

Bob missed the heartbeat at t=30 and stayed online, because the TTL covers three intervals. Alice's laptop slept after t=20 and she showed online for another 29 seconds. That is the knob: a shorter TTL catches dead clients sooner but flaps on a single lost heartbeat.

**Multi-device:** keep one key per device and call the user online if any key exists. **Debounce:** wait a few seconds before broadcasting "offline", so a quick reconnect does not flash the dot.

### Presence at scale — a worked estimate

Assumptions: 10 million connected users, a heartbeat every 30 s, 10 sessions per user per day (each an online and an offline transition), 200 friends per user.

- Heartbeat writes: 10,000,000 / 30 = **333,333 writes/s** to the presence store — shard it by user ID.
- Presence transitions: 10,000,000 × 10 × 2 / 86,400 = **2,315 changes/s**.
- If every change is pushed to every friend: 2,315 × 200 = **462,963 notifications/s**, most to people who are not looking.

That last number is why large systems push presence only to users who currently have a relevant screen open (a chat window, a room) and let everyone else fetch it on demand.

## 7. When Sticky Routing Still Helps

Stickiness is a useful **optimisation** even with externalised state: a reconnect that lands on the same server finds warm caches and its subscriptions already set up. But how you implement it matters. Hashing the user ID modulo the number of servers reshuffles almost everyone when the fleet changes:

~~~text
Part 3: sticky by hash(user) mod N when ws-c is removed (1,200 users)
  before: ws-a 397, ws-b 411, ws-c 392
  hash mod N: 414 of 808 users on healthy servers are routed elsewhere
  cookie stickiness: 0 of 808 move; only the 392 ws-c users reconnect
~~~

Removing one of three servers sent 414 of the 808 users on *healthy* servers somewhere new. A cookie that names the server (or [consistent hashing](/interview-question/what-is-consistent-hashing)) moves only the users whose server actually left. AWS Application Load Balancers offer both duration-based (\`lb_cookie\`) and application cookie (\`app_cookie\`) stickiness on target groups.

## 8. Verified: Running the Code

The example **"Resume and presence across 3 WebSocket servers: in-memory buffers vs a shared log, sticky vs round-robin"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
Part 1: alice saw seq 1-3, messages 4 and 5 arrive while she is away, she reconnects
  only her network dropped:
    buffer in server memory, round-robin  ws-a -> ws-b: no session here: missed 4,5
    buffer in server memory, sticky       ws-c -> ws-c: replays [4,5]
    log in shared store, round-robin      ws-a -> ws-b: replays [4,5]
  her server crashed:
    buffer in server memory, round-robin  ws-a -> ws-c: no session here: missed 4,5
    buffer in server memory, sticky       ws-c -> ws-b: no session here: missed 4,5
    log in shared store, round-robin      ws-a -> ws-c: replays [4,5]

Part 2: presence with heartbeats every 10s and a 30s TTL in the shared store
  t= 0s online: alice,bob
  t=10s online: alice,bob
  t=20s online: alice,bob
  t=30s online: alice,bob
  t=40s online: alice,bob
  t=50s online: bob
  t=60s online: bob
  alice shows online until t=49s: a dead socket is only noticed by TTL

Part 3: sticky by hash(user) mod N when ws-c is removed (1,200 users)
  before: ws-a 397, ws-b 411, ws-c 392
  hash mod N: 414 of 808 users on healthy servers are routed elsewhere
  cookie stickiness: 0 of 808 move; only the 392 ws-c users reconnect
~~~

What the simulation stands for and leaves out: servers are names in an array, the "shared store" is a JavaScript or Python object standing in for Redis (TTL keys and a stream), and the clock is fake. There are no sockets, no network partitions and no store failures. Cookie stickiness in Part 3 is counted by construction: a cookie keeps pointing at its server, so only the removed server's users move. FNV-1a is used as the user hash.

## Edge Cases Worth Knowing

- **Reconnect storms.** When a server with 50,000 sockets dies, 50,000 clients reconnect at once. Clients must back off with random jitter, and resume must be cheap (one log read per conversation, not a full history load).
- **The shared store is now critical.** If the presence store is down, show presence as unknown rather than everyone offline; if the log is down, fall back to a full resync from the database.
- **Ordering across servers.** Assign sequence numbers in one place per conversation (the log append, or a database sequence), never on the WebSocket server, or two servers will hand out the same number.
- **Auth on reconnect.** A resume request must carry a fresh token; a long-lived socket can outlive its token, so re-check on resume and periodically.
- **IP-hash stickiness and mobile networks.** Carrier NAT puts many users behind one IP, and a phone changes IP when it switches networks, so IP affinity is both lumpy and unstable.

## Common Pitfalls

- **Answering "yes, enable sticky sessions" and stopping.** Stickiness does not survive a server crash; the run shows the sticky in-memory design losing messages 4 and 5.
- **Marking users offline only on a close event.** Silent disconnects never send one; use heartbeat TTLs.
- **Pushing every presence change to every friend.** At 10 million users that was 462,963 notifications a second in the estimate.
- **Hash-mod-N affinity.** Scaling from three servers to two moved 414 of 808 users who were on healthy servers.
- **Generating sequence numbers on the gateway.** Two gateways will collide; assign them where the message is stored.
- **Forgetting Socket.IO polling.** With its default long-polling start, multi-node deployments need sticky sessions per its docs, or restrict to the WebSocket transport.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reframe:</strong> <span style="color:#f0e2c8;">An open WebSocket is already pinned to one server; stickiness only affects the <strong style="color:#ffca28;">next</strong> connection. So the real question is where presence and resume state live.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. My default:</strong> <span style="color:#f0e2c8;">Keep servers stateless apart from the sockets: <strong style="color:#ffca28;">presence</strong> as heartbeat keys with a TTL in a shared store, and missed messages in a durable <strong style="color:#ffca28;">per-conversation log with sequence numbers</strong>. Then any server can serve any reconnect with plain round-robin.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Resume:</strong> <span style="color:#f0e2c8;">The client sends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lastSeq</code>; the server replays from the log, the client deduplicates by sequence number, and a too-old gap triggers a full resync.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Presence:</strong> <span style="color:#f0e2c8;">Heartbeat every 10 to 30 s, TTL of about three intervals, one key per device, debounce offline, and push changes only to users watching a relevant screen.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Where sticky helps:</strong> <span style="color:#f0e2c8;">As an optimisation for warm caches, using a cookie or consistent hashing rather than hash mod N, and as a hard requirement for multi-request transports such as Socket.IO long polling.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Our servers keep a small buffer of recent messages per socket. Is sticky enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only until that server restarts or crashes; then the buffer is gone and the reconnect lands elsewhere. Move the buffer into a shared log keyed by conversation and sequence number and the routing stops mattering.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How quickly can you detect that a user went offline?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A clean close is instant. A silent drop is noticed when the presence TTL expires — up to one TTL after the last heartbeat. With 10 s heartbeats and a 30 s TTL, a user can show online for almost 30 s after vanishing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens on a deploy of the WebSocket tier?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Drain each server: stop new connections, close existing ones gradually, and let clients reconnect with jittered backoff to other servers, resuming from their <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lastSeq</code>. Deploy a few servers at a time so the reconnect wave stays small.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a message for Bob reach the server that holds his socket?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either a registry maps user to server and the sender publishes to that server, or every server subscribes to pub/sub channels for the rooms its sockets are in. The second needs no registry; see the Redis Pub/Sub scaling question.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use IP hash for stickiness?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mobile and corporate users share IPs behind NAT, so load is lumpy, and phones change IP when switching networks, so the affinity breaks exactly when reconnects happen.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Sticky session (session affinity) | Load balancer rule that routes a client to the same backend each time |
| Sequence number | Per-conversation counter giving each stored message an order |
| Resume (replay) | Sending the messages after the client last-seen sequence number on reconnect |
| Connection draining | Closing a server's sockets gradually so clients move elsewhere without a storm |
| Presence | Knowing which users or devices are connected now |
| TTL-based liveness | Alive while a key keeps being renewed before it expires |

**Conclusion:** You do not need a sticky load balancer to run WebSockets correctly; you need to stop keeping correctness-critical state on the WebSocket servers. Put presence in a shared store as heartbeat keys with a TTL, put messages in a log with per-conversation sequence numbers, and let any server resume any client. Stickiness then becomes what it should be — an optimisation for warm caches, implemented with cookies or consistent hashing — plus a hard requirement only for multi-request transports like Socket.IO long polling. For the next step, delivering messages across servers, see [How do you scale WebSockets to 1M connections with Redis Pub/Sub?](/interview-question/how-do-you-scale-websockets-to-1m-connections-with-redis-pub-sub).`,
    examples: [
      {
        label: `Resume and presence across 3 WebSocket servers: in-memory buffers vs a shared log, sticky vs round-robin`,
        variants: [
          { tech: "node", code: `// Presence and resume across 3 WebSocket servers, with and without sticky routing.
// "shared" stands for Redis: a presence hash with heartbeat TTLs and a per-room log
// with sequence numbers (a Redis Stream). Clock is fake seconds; no real sockets.
function fnv1a(s) {
  let h = 0x811c9dc5;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}

function run(design, sticky, serverDies) {
  let pool = ["ws-a", "ws-b", "ws-c"];
  let rr = 0;
  const pick = (user) => sticky ? pool[fnv1a(user) % pool.length] : pool[rr++ % pool.length];
  const sessions = { "ws-a": {}, "ws-b": {}, "ws-c": {} }; // local design: buffers in server memory
  const log = [];                                          // shared design: one log in Redis
  const first = pick("alice");
  sessions[first].alice = [];
  for (let seq = 1; seq <= 5; seq++) {
    log.push(seq);
    if (seq > 3) sessions[first].alice.push(seq); // alice is gone; her server buffers 4 and 5
  }
  if (serverDies) { sessions[first] = {}; pool = pool.filter((s) => s !== first); }
  rr = 1; // the next round-robin pick is a different server
  const second = pick("alice");
  let result;
  if (design === "shared") result = "replays [" + log.filter((q) => q > 3).join(",") + "]";
  else if (sessions[second].alice) result = "replays [" + sessions[second].alice.join(",") + "]";
  else result = "no session here: missed 4,5";
  return first + " -> " + second + ": " + result;
}

console.log("Part 1: alice saw seq 1-3, messages 4 and 5 arrive while she is away, she reconnects");
for (const dies of [false, true]) {
  console.log(dies ? "  her server crashed:" : "  only her network dropped:");
  for (const [design, sticky] of [["local", false], ["local", true], ["shared", false]]) {
    const name = (design === "local" ? "buffer in server memory" : "log in shared store") + (sticky ? ", sticky" : ", round-robin");
    console.log("    " + name.padEnd(38) + run(design, sticky, dies));
  }
}

console.log("\\nPart 2: presence with heartbeats every 10s and a 30s TTL in the shared store");
const TTL = 30;
const seen = { alice: 0, bob: 0 };
const online = (now) => Object.keys(seen).filter((u) => now - seen[u] < TTL).join(",") || "-";
for (let t = 0; t <= 60; t += 10) {
  if (t <= 20) seen.alice = t;          // alice's laptop sleeps after t=20: no close frame
  if (t !== 30) seen.bob = t;           // bob misses one heartbeat at t=30
  console.log("  t=" + String(t).padStart(2) + "s online: " + online(t));
}
console.log("  alice shows online until t=" + (20 + TTL - 1) + "s: a dead socket is only noticed by TTL");

console.log("\\nPart 3: sticky by hash(user) mod N when ws-c is removed (1,200 users)");
const users = Array.from({ length: 1200 }, (_, i) => "user" + i);
const before = { "ws-a": 0, "ws-b": 0, "ws-c": 0 };
let survivorsMoved = 0, survivors = 0;
for (const u of users) {
  const was = ["ws-a", "ws-b", "ws-c"][fnv1a(u) % 3];
  const now = ["ws-a", "ws-b"][fnv1a(u) % 2];
  before[was]++;
  if (was !== "ws-c") { survivors++; if (now !== was) survivorsMoved++; }
}
console.log("  before: ws-a " + before["ws-a"] + ", ws-b " + before["ws-b"] + ", ws-c " + before["ws-c"]);
console.log("  hash mod N: " + survivorsMoved + " of " + survivors + " users on healthy servers are routed elsewhere");
console.log("  cookie stickiness: 0 of " + survivors + " move; only the " + before["ws-c"] + " ws-c users reconnect");` },
          { tech: "python", code: `# Presence and resume across 3 WebSocket servers, with and without sticky routing.
# "shared" stands for Redis: a presence hash with heartbeat TTLs and a per-room log
# with sequence numbers (a Redis Stream). Clock is fake seconds; no real sockets.


def fnv1a(s):
    h = 0x811C9DC5
    for c in s:
        h ^= ord(c)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def run(design, sticky, server_dies):
    pool = ["ws-a", "ws-b", "ws-c"]
    rr = [0]

    def pick(user):
        if sticky:
            return pool[fnv1a(user) % len(pool)]
        s = pool[rr[0] % len(pool)]
        rr[0] += 1
        return s

    sessions = {"ws-a": {}, "ws-b": {}, "ws-c": {}}  # local design: buffers in server memory
    log = []                                          # shared design: one log in Redis
    first = pick("alice")
    sessions[first]["alice"] = []
    for seq in range(1, 6):
        log.append(seq)
        if seq > 3:
            sessions[first]["alice"].append(seq)  # alice is gone; her server buffers 4 and 5
    if server_dies:
        sessions[first] = {}
        pool = [s for s in pool if s != first]
    rr[0] = 1  # the next round-robin pick is a different server
    second = pick("alice")
    if design == "shared":
        result = "replays [" + ",".join(str(q) for q in log if q > 3) + "]"
    elif "alice" in sessions[second]:
        result = "replays [" + ",".join(str(q) for q in sessions[second]["alice"]) + "]"
    else:
        result = "no session here: missed 4,5"
    return first + " -> " + second + ": " + result


print("Part 1: alice saw seq 1-3, messages 4 and 5 arrive while she is away, she reconnects")
for dies in (False, True):
    print("  her server crashed:" if dies else "  only her network dropped:")
    for design, sticky in (("local", False), ("local", True), ("shared", False)):
        name = ("buffer in server memory" if design == "local" else "log in shared store") + (", sticky" if sticky else ", round-robin")
        print("    " + name.ljust(38) + run(design, sticky, dies))

print("\\nPart 2: presence with heartbeats every 10s and a 30s TTL in the shared store")
TTL = 30
seen = {"alice": 0, "bob": 0}


def online(now):
    return ",".join(u for u in seen if now - seen[u] < TTL) or "-"


for t in range(0, 61, 10):
    if t <= 20:
        seen["alice"] = t   # alice's laptop sleeps after t=20: no close frame
    if t != 30:
        seen["bob"] = t     # bob misses one heartbeat at t=30
    print(f"  t={t:2d}s online: {online(t)}")
print(f"  alice shows online until t={20 + TTL - 1}s: a dead socket is only noticed by TTL")

print("\\nPart 3: sticky by hash(user) mod N when ws-c is removed (1,200 users)")
users = ["user" + str(i) for i in range(1200)]
before = {"ws-a": 0, "ws-b": 0, "ws-c": 0}
survivors_moved = survivors = 0
for u in users:
    was = ["ws-a", "ws-b", "ws-c"][fnv1a(u) % 3]
    now = ["ws-a", "ws-b"][fnv1a(u) % 2]
    before[was] += 1
    if was != "ws-c":
        survivors += 1
        if now != was:
            survivors_moved += 1
print(f"  before: ws-a {before['ws-a']}, ws-b {before['ws-b']}, ws-c {before['ws-c']}")
print(f"  hash mod N: {survivors_moved} of {survivors} users on healthy servers are routed elsewhere")
print(f"  cookie stickiness: 0 of {survivors} move; only the {before['ws-c']} ws-c users reconnect")` },
        ],
      },
    ],
  },
  {
    title: `How do you scale WebSockets to 1M connections with Redis Pub/Sub?`,
    difficulty: "hard",
    seoDescription: `Design a WebSocket tier for 1M connections: gateway sizing, OS limits, Redis Pub/Sub channel design, sharded Pub/Sub, slow subscribers and resume.`,
    description: `**Question presented to candidate:**
"We have a chat and live-update product that is about to hit a million concurrent WebSocket connections. One server cannot hold them all, and a message sent by a user on one server has to reach recipients on other servers. Walk me through how you would build this with Redis Pub/Sub, with numbers, and tell me what breaks first."

**What a strong answer should cover:**
- A **gateway tier** that only holds sockets, sized with a worked estimate (connections per node, memory per connection, headroom for a lost node), plus OS limits: file descriptors and the **ephemeral port** range between a proxy and a backend
- **Cross-node fan-out** with Redis Pub/Sub: gateways subscribe only to channels for rooms their sockets are in, and the publish path is persist first, then publish
- Channel design trade-offs (one global channel vs per-room vs per-gateway) and when each wastes work; **sharded Pub/Sub** (Redis 7.0, \`SPUBLISH\`/\`SSUBSCRIBE\`) so cluster traffic stays within one shard
- Redis Pub/Sub is **at-most-once** and keeps nothing: pair it with a durable log and client resume by sequence number
- **Slow consumers and backpressure**: the \`client-output-buffer-limit pubsub\` cutoff, per-socket send queues, and what happens at 10x (hot rooms, reconnect storms)

**Clarifying questions expected:**
- What is the room size distribution (mostly 1:1 and small groups, or a few huge broadcast rooms)?
- Message rate and size at peak, and is delivery allowed to be lossy (typing indicators) or must it be reliable (messages)?
- Is there an existing durable store for messages, and how long must a disconnected client be able to resume?

**Code / implementation expected:** Optional — a design with numbers; the example simulates the fan-out counts, the cluster hash slot and a slow-subscriber cutoff in four languages.`,
    answer: `**Target Audience:** Engineers who have run a single WebSocket server and now need many. Read [When would you use WebSockets vs polling vs SSE?](/interview-question/when-would-you-use-websockets-vs-polling-vs-sse) and [WebSocket presence, sticky sessions, and resume — do you need sticky LB?](/interview-question/websocket-presence-sticky-sessions-and-resume-do-you-need-sticky-lb) first if those are new.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output). Redis, Linux, AWS and WhatsApp facts are cited inline.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the vocabulary an interviewer expects. Numbers come from running the example or from arithmetic shown on the page; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

Imagine a stadium of a million people, each holding a walkie-talkie. One radio tower cannot talk to a million handsets, so you build 25 towers, each serving 40,000 people. Now someone in section A says something to their friend group, whose members are spread over towers 3, 9 and 17. Tower 3 hears it. How do towers 9 and 17 find out?

You add a **dispatcher room**: every tower tells the dispatcher which friend groups have members on it, and when tower 3 hears a group message it hands it to the dispatcher, who passes it only to towers 9 and 17. That dispatcher is Redis Pub/Sub. The hard parts are the ones the story hides: how many towers, what the dispatcher does when a tower is too slow to listen, and what happens to messages when a tower blinks off for a second.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What are the room sizes? | Small rooms make per-room channels cheap; huge rooms mean every gateway subscribes to everything anyway |
| Peak publish rate and message size? | Sets Redis bandwidth and per-gateway socket writes per second |
| Is loss acceptable for any message type? | Typing indicators can be fire-and-forget; chat messages need a durable log and resume |
| How long can a client be offline and resume? | Decides log retention and whether resume reads Redis, Kafka or the database |
| Where do connections come from? | Mobile networks mean frequent reconnects; one region or many changes the fan-out topology |
| Managed or self-hosted Redis, cluster or single primary? | Classic Pub/Sub in a cluster is broadcast to every node; sharded Pub/Sub changes the design |

## 3. Requirements

**Functional:** clients hold a WebSocket, join rooms (1:1 chats, groups, live channels), send messages, receive messages for their rooms in order, and resume after a disconnect.

**Non-functional:** 1,000,000 concurrent connections; median delivery under 100 ms within a region; survive the loss of any one gateway or Redis node; no message loss for chat messages (typing and presence may be lossy).

## 4. Capacity Estimate

Assumptions are stated, then computed (the first lines are printed by the example):

~~~text
Part 1: capacity (assumptions: 30 KB per connection, 25% headroom)
  25 nodes x 40000 connections = 1000000; at 80% fill each node can take 50000
  memory per node: 40000 x 30 KB = 1.2 GB
~~~

- **30 KB per connection** is an assumption covering kernel socket buffers, TLS state and application objects; measure yours. Memory is rarely the first limit at this size — 1.2 GB per node.
- **Headroom:** run nodes at 80% of their tested capacity, so when one node dies its 40,000 clients fit on the other 24 (40,000 / 24 = 1,667 extra each).
- **Messages:** assume 5,000 published messages per second at peak, 1 KB each. Part 2 of the example shows that, for small rooms, a per-room channel design needs about 3.7 gateway deliveries per message — 18,415 per 5,000 messages, so about **18.4 MB/s** out of Redis. A single global channel would be 125,000 deliveries, about **125 MB/s (1 Gbit/s)**.
- **Heartbeats:** 1,000,000 / 30 s = **33,333 pings/s** across the fleet, about 1,333 per node. Cheap, but not free.
- **Reconnect storm:** a dead node sheds 40,000 clients. If they reconnect with jitter spread over 30 s, that is **1,333 handshakes/s** (TLS included) landing on the survivors.

For the general method, see [How do you approach back-of-the-envelope capacity estimation?](/interview-question/how-do-you-approach-back-of-the-envelope-capacity-estimation).

### What a single box can hold

The ceiling is far above 40,000. WhatsApp reported more than 2 million TCP connections on one FreeBSD server running Erlang in 2012 ("1 million is so 2011", WhatsApp blog). You choose a lower number because a smaller node means a smaller reconnect storm when it dies, faster deploys and less blast radius.

📌 **Interview term: file descriptor limit** — every socket is a file descriptor, and the default per-process limit on a typical Linux install is far below 40,000. Raise \`ulimit -n\` (and \`fs.file-max\`) on gateways, or new connections fail with \`EMFILE\` ("too many open files") once the limit is reached.

📌 **Interview term: ephemeral port exhaustion** — a TCP connection is identified by source IP, source port, destination IP and destination port. When a proxy or load balancer opens connections to one backend address, only the source port varies, and Linux uses ports **32768–60999** by default (28,232 ports). A proxy with one IP cannot hold 40,000 connections to one backend IP and port; give the proxy several source IPs, or have the gateway listen on several ports.

## 5. API and Data Model

Client protocol over the WebSocket (JSON frames):

~~~json
{ "type": "join",   "room": "room:42", "lastSeq": 1180 }
{ "type": "send",   "room": "room:42", "clientMsgId": "c-77f1", "text": "hi" }
{ "type": "msg",    "room": "room:42", "seq": 1181, "from": "alice", "text": "hi" }
{ "type": "resync", "room": "room:42" }
~~~

\`clientMsgId\` makes a retried send idempotent ([What is idempotency and why does it matter?](/interview-question/what-is-idempotency-and-why-does-it-matter)); \`seq\` is assigned by the message store, never by a gateway.

Redis usage:

| Key or channel | Type | Purpose |
| :--- | :--- | :--- |
| \`room:{id}\` | Pub/Sub channel | live fan-out of new messages to gateways with members in the room |
| \`log:{room:id}\` | Stream (or Kafka partition, or DB table) | durable messages by \`seq\`, read on resume |
| \`presence:{user}:{device}\` | string with TTL | heartbeat liveness |

## 6. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 780 340" role="img" aria-label="Clients connect through a layer 4 load balancer to gateways; a chat service stores each message and publishes it to Redis, which delivers it to the gateways subscribed to that room">
  <defs>
    <marker id="sd03q3-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="140" width="120" height="60" rx="10"/>
  <text class="d-text" x="80" y="175" text-anchor="middle">1M clients</text>
  <rect class="d-box" x="190" y="140" width="110" height="60" rx="10"/>
  <text class="d-text" x="245" y="168" text-anchor="middle">L4 LB</text>
  <text class="d-sub" x="245" y="188" text-anchor="middle">TCP pass</text>
  <rect class="d-box" x="360" y="40" width="150" height="56" rx="10"/>
  <text class="d-text" x="435" y="73" text-anchor="middle">gateway 1</text>
  <rect class="d-box" x="360" y="142" width="150" height="56" rx="10"/>
  <text class="d-text" x="435" y="175" text-anchor="middle">gateway 2</text>
  <rect class="d-box" x="360" y="244" width="150" height="56" rx="10"/>
  <text class="d-text" x="435" y="277" text-anchor="middle">gateway 25</text>
  <rect class="d-box-accent" x="590" y="40" width="170" height="60" rx="10"/>
  <text class="d-text" x="675" y="66" text-anchor="middle">Redis Pub/Sub</text>
  <text class="d-sub" x="675" y="88" text-anchor="middle">room channels</text>
  <rect class="d-box" x="590" y="160" width="170" height="60" rx="10"/>
  <text class="d-text" x="675" y="186" text-anchor="middle">Chat service</text>
  <text class="d-sub" x="675" y="208" text-anchor="middle">assigns seq</text>
  <rect class="d-box-muted" x="590" y="270" width="170" height="56" rx="10"/>
  <text class="d-text" x="675" y="303" text-anchor="middle">Message log</text>
  <path class="d-edge" d="M 140 170 L 184 170" marker-end="url(#sd03q3-arrow)"/>
  <path class="d-edge" d="M 300 160 L 354 70" marker-end="url(#sd03q3-arrow)"/>
  <path class="d-edge" d="M 300 170 L 354 170" marker-end="url(#sd03q3-arrow)"/>
  <path class="d-edge" d="M 300 180 L 354 272" marker-end="url(#sd03q3-arrow)"/>
  <path class="d-edge" d="M 510 178 L 584 190" marker-end="url(#sd03q3-arrow)"/>
  <path class="d-edge" d="M 675 220 L 675 264" marker-end="url(#sd03q3-arrow)"/>
  <path class="d-edge-accent" d="M 675 160 L 675 106" marker-end="url(#sd03q3-arrow)"/>
  <path class="d-edge-accent" d="M 590 64 L 516 66" marker-end="url(#sd03q3-arrow)"/>
  <path class="d-edge-accent" d="M 600 100 L 516 266" marker-end="url(#sd03q3-arrow)"/>
</svg>

The send path goes gateway to chat service; the chat service writes the message to the log (getting its \`seq\`), then publishes it to the room channel; Redis delivers it to every gateway subscribed to that channel, and each gateway writes it to its local sockets in the room.

Why each piece:

- **Layer 4 load balancer** passes TCP through, so it does not parse every frame; TLS can end at the gateway or the balancer. Configure its idle timeout above your heartbeat interval.
- **Gateways are dumb and replaceable.** They hold sockets, a map from room to local sockets, and Redis subscriptions. They hold no message history.
- **Persist, then publish.** If the publish is lost, clients still recover the message on resume from the log. The reverse order would announce messages that may never be stored.
- **The chat service** validates, assigns \`seq\`, writes, publishes. It scales horizontally, partitioned by room.

## 7. Deep Dive 1 — Which Channels Do Gateways Subscribe To?

📌 **Interview term: Redis Pub/Sub** — \`SUBSCRIBE channel\` registers a connection as a listener; \`PUBLISH channel message\` pushes the message to every current listener and returns how many received it. Nothing is stored.

Three designs:

1. **One global channel.** Every gateway receives every message and drops the ones for rooms it does not hold. Simple, and wasteful.
2. **A channel per room.** A gateway subscribes to \`room:42\` when its first local member joins and unsubscribes when its last one leaves. Redis sends each message only to gateways that need it.
3. **A channel per gateway.** The publisher looks up which gateways hold the room members (a registry) and publishes to each \`gw:{n}\` channel. Fewer subscriptions, but the registry is a second source of truth to keep correct.

The example places 1,000,000 connections at random on 25 gateways and sends 5,000 messages to random rooms:

~~~text
Part 2: 5000 messages to random rooms
  small rooms: 250000 rooms, avg 4 members
    one global channel: 125000 Redis->gateway sends, 106585 of them to gateways with nobody to tell
    channel per room:   18415 Redis->gateway sends (15% of global)
    socket writes by gateways: 19900
  big rooms: 1000 rooms, avg 1000 members
    one global channel: 125000 Redis->gateway sends, 0 of them to gateways with nobody to tell
    channel per room:   125000 Redis->gateway sends (100% of global)
    socket writes by gateways: 4997139
~~~

With small rooms, per-room channels cut Redis output to 15% of the global design. With 1,000-member rooms spread at random, every gateway has members of every room, so per-room channels save nothing — and the real cost moves to the gateways: almost **5 million socket writes** for 5,000 messages. For big rooms the levers are different: batching several messages into one frame, and placing members of the same room on the same gateways (room-affinity routing) so fewer gateways are involved.

📌 **Interview term: subscription churn** — the rate of \`SUBSCRIBE\`/\`UNSUBSCRIBE\` calls as members join and leave. Per-room channels make it proportional to room joins on each gateway; keep a short delay before unsubscribing so a quick rejoin does not cause two calls.

## 8. Deep Dive 2 — Redis Cluster and Sharded Pub/Sub

With classic Pub/Sub in Redis Cluster, a \`PUBLISH\` sent to any node is forwarded over the cluster bus to **all** nodes, because a subscriber may be connected to any of them. Adding nodes adds traffic instead of capacity.

📌 **Interview term: sharded Pub/Sub** — added in Redis 7.0 (\`SSUBSCRIBE\`, \`SUNSUBSCRIBE\`, \`SPUBLISH\`). A shard channel is assigned to a **hash slot** exactly like a key, and its messages stay within the shard that owns the slot (Redis docs, "Pub/Sub"). Subscribers connect to that shard primary or one of its replicas. Shard channels and classic channels are separate: an \`SSUBSCRIBE\` client does not receive a classic \`PUBLISH\`.

📌 **Interview term: hash slot** — Redis Cluster splits the key space into 16,384 slots; a key slot is \`CRC16(key) mod 16384\`, and if the key contains \`{...}\`, only the text inside the braces is hashed (a **hash tag**), so related keys and channels land on the same shard.

~~~text
Part 3: sharded Pub/Sub routes a channel by hash slot (3 shards, even split)
  crc16("123456789") = 0x31C3
  room:41              slot  4015 -> shard-1
  room:42              slot 16332 -> shard-3
  room:43              slot 12269 -> shard-3
  {room:42}:typing     slot 16332 -> shard-3
  {room:42}:presence   slot 16332 -> shard-3
~~~

The first line is the standard check value of CRC16-XMODEM, confirming the implementation. The hash tag puts \`{room:42}:typing\` on the same slot as \`room:42\`, so a gateway can subscribe to everything about room 42 through one shard connection. The three-shard split is the example's assumption; real slot ownership is whatever the cluster reports for its shards.

## 9. Deep Dive 3 — Delivery Guarantees and Slow Subscribers

📌 **Interview term: at-most-once delivery** — a message is delivered zero or one time, never retried. The Redis docs state this for Pub/Sub: if a subscriber is disconnected or fails to handle a message, it is lost. For a stronger guarantee they point to Redis Streams.

So Pub/Sub is the **fast path**, and the log is the **safety net**. When a gateway loses its Redis connection, even for a second, it cannot know what it missed. The safe response is: resubscribe, then tell its clients to resume from their \`lastSeq\` (they do so from the log). That is the same resume mechanism as a client reconnect, covered in the [presence and resume question](/interview-question/websocket-presence-sticky-sessions-and-resume-do-you-need-sticky-lb).

📌 **Interview term: slow consumer** — a subscriber that reads slower than messages arrive. Redis cannot slow the publisher down, so it buffers the backlog in the subscriber output buffer, in Redis memory. The \`client-output-buffer-limit pubsub\` setting disconnects such a subscriber; the commonly documented default is \`32mb 8mb 60\` — cut off at 32 MB, or after 60 seconds above 8 MB (Redis config file comments, as quoted by Netdata and OneUptime guides).

~~~text
Part 4: a gateway reads 800 msg/s while 1000 msg/s of 1 KB arrive
  t=41s buffer 8.01 MB passes the 8 MB soft limit
  t=101s buffer 19.73 MB: Redis closes the subscriber; 20200 messages were still unread
~~~

A gateway that falls behind by 200 messages a second is cut off after 101 seconds, and the 20,200 messages in its buffer are gone — the at-most-once rule in action. The gateway must treat that disconnect like any other: reconnect, resubscribe, and have clients resume. Inside the gateway, apply the same idea one level down: give each socket a bounded send queue, and close (or drop lossy messages for) a client whose queue is full, rather than letting one slow phone grow gateway memory without bound. See [What is backpressure and how do you handle it?](/interview-question/what-is-backpressure-and-how-do-you-handle-it).

## 10. What Breaks at 10x (10 Million Connections)

- **Gateway count** grows to about 250 at the same density; classic cluster Pub/Sub would forward every message to every Redis node, so sharded Pub/Sub (or a channel per gateway) becomes necessary.
- **Hot rooms.** A live event with a million viewers turns one publish into a million socket writes. Use a dedicated broadcast path: gateways batch, coalesce (send "1,240 new reactions", not 1,240 frames), and sample lossy updates.
- **Reconnect storms** grow with node size. Keep nodes moderately sized, require jittered backoff in clients, and rate-limit handshakes at the load balancer.
- **Redis as a single dependency.** Run replicas with automatic failover, and design the gateway reaction to a Redis failover as "resubscribe and resume".
- **Cross-region.** Publish locally and relay between regions through a durable stream rather than one global Redis.

Alternatives worth naming: NATS or Kafka as the backbone between chat service and gateways (Kafka gives replay; see [Kafka vs SQS — how do you choose for an event-driven system in 2025?](/interview-question/kafka-vs-sqs-how-do-you-choose-for-an-event-driven-system-in-2025)), and managed WebSocket gateways that hold the sockets for you.

## 11. Verified: Running the Code

The example **"1M connections over Redis Pub/Sub: global vs per-room channels, cluster hash slots, slow-subscriber cutoff"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and \`javac Main.java && java Main\` (Java 21). All four print exactly this:

~~~text
Part 1: capacity (assumptions: 30 KB per connection, 25% headroom)
  25 nodes x 40000 connections = 1000000; at 80% fill each node can take 50000
  memory per node: 40000 x 30 KB = 1.2 GB

Part 2: 5000 messages to random rooms
  small rooms: 250000 rooms, avg 4 members
    one global channel: 125000 Redis->gateway sends, 106585 of them to gateways with nobody to tell
    channel per room:   18415 Redis->gateway sends (15% of global)
    socket writes by gateways: 19900
  big rooms: 1000 rooms, avg 1000 members
    one global channel: 125000 Redis->gateway sends, 0 of them to gateways with nobody to tell
    channel per room:   125000 Redis->gateway sends (100% of global)
    socket writes by gateways: 4997139

Part 3: sharded Pub/Sub routes a channel by hash slot (3 shards, even split)
  crc16("123456789") = 0x31C3
  room:41              slot  4015 -> shard-1
  room:42              slot 16332 -> shard-3
  room:43              slot 12269 -> shard-3
  {room:42}:typing     slot 16332 -> shard-3
  {room:42}:presence   slot 16332 -> shard-3

Part 4: a gateway reads 800 msg/s while 1000 msg/s of 1 KB arrive
  t=41s buffer 8.01 MB passes the 8 MB soft limit
  t=101s buffer 19.73 MB: Redis closes the subscriber; 20200 messages were still unread
~~~

The core of the fan-out count is one bitmask per room — bit *i* set means gateway *i* holds a member — so a per-room publish costs the number of set bits:

~~~javascript
globalSends += NODES;   // every gateway subscribes to one channel "all"
perRoomSends += nodes;  // gateways subscribe to "room:<id>" only while they hold a member
~~~

What the simulation stands for and leaves out: Redis, gateways and sockets are counters and arrays; placement uses a seeded MINSTD generator so every language draws the same numbers. It models channel routing, CRC16 slots with hash tags, and the output-buffer cutoff rule. It does not model network latency, Redis CPU, TLS cost, subscription churn or failover. Each connection joins exactly one room, which is simpler than real users who are in many.

## Common Pitfalls

- **Treating Redis Pub/Sub as reliable delivery.** It is at-most-once and stores nothing; a gateway that blinks or is cut off as a slow subscriber loses messages. Pair it with a log and resume.
- **Publishing before persisting.** Clients can see a message that never got stored; persist first, assign \`seq\`, then publish.
- **One global channel.** In the small-room run, 106,585 of 125,000 sends went to gateways with nobody to tell.
- **Classic Pub/Sub on a big Redis Cluster.** Every publish crosses the cluster bus to every node; use sharded Pub/Sub with hash-tagged channel names.
- **Forgetting OS limits.** Default file-descriptor limits and the 28,232-port ephemeral range break long before CPU or memory does.
- **No per-socket send limit.** One slow client should be disconnected, not allowed to grow gateway memory.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Shape:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">gateway tier</strong> that only holds sockets (25 nodes at 40,000 each, run at 80% so a lost node fits), a chat service that <strong style="color:#ffca28;">persists, assigns \`seq\`, then publishes</strong>, and Redis Pub/Sub carrying each message to the gateways that hold members of the room.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Channels:</strong> <span style="color:#f0e2c8;">Gateways subscribe to a <strong style="color:#ffca28;">channel per room</strong> while they hold a member. In my simulation that was 15% of the Redis traffic of a global channel for small rooms, but no saving for 1,000-member rooms, where socket writes become the cost.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cluster:</strong> <span style="color:#f0e2c8;">Classic Pub/Sub in Redis Cluster broadcasts every publish to every node; <strong style="color:#ffca28;">sharded Pub/Sub</strong> (Redis 7.0, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SPUBLISH</code>) keeps a channel on the shard owning its hash slot, and hash tags keep a room's channels together.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Guarantees:</strong> <span style="color:#f0e2c8;">Redis Pub/Sub is <strong style="color:#ffca28;">at-most-once</strong> and stores nothing, so the log is the safety net: on any disconnect, gateway or client, resubscribe and resume from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lastSeq</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">Slow subscribers are cut by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">client-output-buffer-limit pubsub</code> (default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">32mb 8mb 60</code>); bound each socket send queue too, raise file-descriptor limits, watch ephemeral ports, and require jittered reconnects.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just broadcast every message to every gateway?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is simple, but output grows with gateways times messages. With 25 gateways and small rooms, 85% of the sends in the simulation reached gateways with no member of the room. Per-room channels send only where needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">A gateway loses its Redis connection for two seconds. What happens?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Messages published meanwhile are lost for that gateway, because Pub/Sub keeps nothing. On reconnect it resubscribes and tells its clients to resume; each client sends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lastSeq</code> and gets the gap from the durable log.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a room with a million viewers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Treat it as broadcast, not chat: every gateway subscribes, gateways coalesce and batch updates, lossy updates such as reactions are sampled or counted, and members can be packed on fewer gateways. The cost is socket writes, not Redis.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use a layer 4 load balancer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After the upgrade there are no requests to route, only a long TCP stream, so a layer 4 balancer passing TCP is cheaper and holds less state per connection. Its idle timeout must exceed the heartbeat interval.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why Redis Pub/Sub and not Kafka between services and gateways?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pub/Sub gives low latency and dynamic per-room subscriptions with no consumer offsets to manage. Kafka gives replay but is a poor fit for hundreds of thousands of short-lived per-room subscriptions. Many designs use both: Kafka or a database as the log, Redis Pub/Sub for live fan-out.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| File descriptor limit | Maximum open files and sockets per process; must be raised on gateways |
| Ephemeral port exhaustion | Running out of source ports between one proxy IP and one backend address |
| Redis Pub/Sub | Channel-based broadcast to current subscribers, nothing stored |
| Subscription churn | Rate of subscribe and unsubscribe calls as members join and leave |
| Sharded Pub/Sub | Redis 7.0 channels assigned to hash slots, kept within one shard |
| Hash slot | One of 16,384 buckets; CRC16 of the key, or of its hash tag |
| At-most-once delivery | Delivered zero or one time, never retried |
| Slow consumer | A subscriber that reads slower than messages arrive |

**Conclusion:** A million WebSockets is a fleet of simple gateways plus a routing problem. Size the gateways for failure rather than for the maximum a box can hold, raise the OS limits, and let Redis Pub/Sub carry each message only to the gateways that need it — per-room channels for small rooms, a broadcast path for huge ones, sharded Pub/Sub in a cluster. Then accept what Pub/Sub is: fast and at-most-once. Persist first, publish second, and make every disconnect end in a resume from the log, so a lost Redis message costs a little latency rather than a lost chat message.`,
    examples: [
      {
        label: `1M connections over Redis Pub/Sub: global vs per-room channels, cluster hash slots, slow-subscriber cutoff`,
        variants: [
          { tech: "node", code: `// 1M WebSocket connections behind 25 gateway nodes, with Redis Pub/Sub simulated in-process.
// Counts what Redis must send to gateways under two subscription designs, computes the
// Redis Cluster hash slot of channel names, and replays a slow-subscriber buffer limit.
let seed = 42;
const rand = (n) => { seed = (seed * 48271) % 2147483647; return seed % n; }; // MINSTD, fixed seed

const CONNS = 1000000, NODES = 25, MESSAGES = 5000;
console.log("Part 1: capacity (assumptions: 30 KB per connection, 25% headroom)");
const perNode = CONNS / NODES;
console.log("  " + NODES + " nodes x " + perNode + " connections = " + CONNS + "; at 80% fill each node can take " + (perNode / 0.8));
console.log("  memory per node: " + perNode + " x 30 KB = " + (perNode * 30 / 1000000).toFixed(1) + " GB");

function scenario(name, rooms) {
  const roomOf = new Int32Array(CONNS);
  const size = new Int32Array(rooms);
  const nodesMask = new Int32Array(rooms); // bit i set = node i has a member of this room
  for (let c = 0; c < CONNS; c++) {
    const node = rand(NODES), room = rand(rooms);
    roomOf[c] = room; size[room]++; nodesMask[room] |= 1 << node;
  }
  let globalSends = 0, perRoomSends = 0, sockets = 0, wasted = 0;
  for (let m = 0; m < MESSAGES; m++) {
    const room = rand(rooms);
    let nodes = 0;
    for (let i = 0; i < NODES; i++) if (nodesMask[room] & (1 << i)) nodes++;
    globalSends += NODES;          // every gateway subscribes to one channel "all"
    perRoomSends += nodes;         // gateways subscribe to "room:<id>" only while they hold a member
    wasted += NODES - nodes;
    sockets += size[room];
  }
  console.log("  " + name + ": " + rooms + " rooms, avg " + CONNS / rooms + " members");
  console.log("    one global channel: " + globalSends + " Redis->gateway sends, " + wasted + " of them to gateways with nobody to tell");
  console.log("    channel per room:   " + perRoomSends + " Redis->gateway sends (" + Math.round(100 * perRoomSends / globalSends) + "% of global)");
  console.log("    socket writes by gateways: " + sockets);
}
console.log("\\nPart 2: " + MESSAGES + " messages to random rooms");
scenario("small rooms", 250000);
scenario("big rooms", 1000);

function crc16(s) { // CRC16-XMODEM, the function Redis Cluster uses for key slots
  let crc = 0;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}
function slot(key) { // only the part inside the first {...} is hashed, if it is non-empty
  const open = key.indexOf("{");
  if (open >= 0) { const close = key.indexOf("}", open + 1); if (close > open + 1) key = key.slice(open + 1, close); }
  return crc16(key) % 16384;
}
console.log("\\nPart 3: sharded Pub/Sub routes a channel by hash slot (3 shards, even split)");
console.log("  crc16(\\"123456789\\") = 0x" + crc16("123456789").toString(16).toUpperCase());
const shardOf = (s) => (s < 5461 ? "shard-1" : s < 10923 ? "shard-2" : "shard-3");
for (const ch of ["room:41", "room:42", "room:43", "{room:42}:typing", "{room:42}:presence"]) {
  const s = slot(ch);
  console.log("  " + ch.padEnd(20) + " slot " + String(s).padStart(5) + " -> " + shardOf(s));
}

console.log("\\nPart 4: a gateway reads 800 msg/s while 1000 msg/s of 1 KB arrive");
const SOFT = 8 * 1024 * 1024, HARD = 32 * 1024 * 1024, SOFT_SECONDS = 60;
let buf = 0, overSince = -1;
for (let t = 1; t <= 300; t++) {
  buf += (1000 - 800) * 1024;
  if (buf > SOFT && overSince < 0) { overSince = t; console.log("  t=" + t + "s buffer " + (buf / 1048576).toFixed(2) + " MB passes the 8 MB soft limit"); }
  if (buf > HARD || (overSince >= 0 && t - overSince >= SOFT_SECONDS)) {
    console.log("  t=" + t + "s buffer " + (buf / 1048576).toFixed(2) + " MB: Redis closes the subscriber; " + (t * 1000 - t * 800) + " messages were still unread");
    break;
  }
}` },
          { tech: "python", code: `# 1M WebSocket connections behind 25 gateway nodes, with Redis Pub/Sub simulated in-process.
# Counts what Redis must send to gateways under two subscription designs, computes the
# Redis Cluster hash slot of channel names, and replays a slow-subscriber buffer limit.
seed = 42


def rand(n):  # MINSTD, fixed seed
    global seed
    seed = (seed * 48271) % 2147483647
    return seed % n


CONNS, NODES, MESSAGES = 1000000, 25, 5000
print("Part 1: capacity (assumptions: 30 KB per connection, 25% headroom)")
per_node = CONNS // NODES
print(f"  {NODES} nodes x {per_node} connections = {CONNS}; at 80% fill each node can take {round(per_node / 0.8)}")
print(f"  memory per node: {per_node} x 30 KB = {per_node * 30 / 1000000:.1f} GB")


def scenario(name, rooms):
    size = [0] * rooms
    nodes_mask = [0] * rooms  # bit i set = node i has a member of this room
    for _ in range(CONNS):
        node = rand(NODES)
        room = rand(rooms)
        size[room] += 1
        nodes_mask[room] |= 1 << node
    global_sends = per_room_sends = sockets = wasted = 0
    for _ in range(MESSAGES):
        room = rand(rooms)
        nodes = bin(nodes_mask[room]).count("1")
        global_sends += NODES     # every gateway subscribes to one channel "all"
        per_room_sends += nodes   # gateways subscribe to "room:<id>" only while they hold a member
        wasted += NODES - nodes
        sockets += size[room]
    print(f"  {name}: {rooms} rooms, avg {CONNS // rooms} members")
    print(f"    one global channel: {global_sends} Redis->gateway sends, {wasted} of them to gateways with nobody to tell")
    print(f"    channel per room:   {per_room_sends} Redis->gateway sends ({round(100 * per_room_sends / global_sends)}% of global)")
    print(f"    socket writes by gateways: {sockets}")


print(f"\\nPart 2: {MESSAGES} messages to random rooms")
scenario("small rooms", 250000)
scenario("big rooms", 1000)


def crc16(s):  # CRC16-XMODEM, the function Redis Cluster uses for key slots
    crc = 0
    for ch in s:
        crc ^= ord(ch) << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return crc


def slot(key):  # only the part inside the first {...} is hashed, if it is non-empty
    o = key.find("{")
    if o >= 0:
        c = key.find("}", o + 1)
        if c > o + 1:
            key = key[o + 1:c]
    return crc16(key) % 16384


print("\\nPart 3: sharded Pub/Sub routes a channel by hash slot (3 shards, even split)")
print(f'  crc16("123456789") = 0x{crc16("123456789"):X}')


def shard_of(s):
    return "shard-1" if s < 5461 else "shard-2" if s < 10923 else "shard-3"


for ch in ["room:41", "room:42", "room:43", "{room:42}:typing", "{room:42}:presence"]:
    s = slot(ch)
    print(f"  {ch:<20} slot {s:5d} -> {shard_of(s)}")

print("\\nPart 4: a gateway reads 800 msg/s while 1000 msg/s of 1 KB arrive")
SOFT, HARD, SOFT_SECONDS = 8 * 1024 * 1024, 32 * 1024 * 1024, 60
buf, over_since = 0, -1
for t in range(1, 301):
    buf += (1000 - 800) * 1024
    if buf > SOFT and over_since < 0:
        over_since = t
        print(f"  t={t}s buffer {buf / 1048576:.2f} MB passes the 8 MB soft limit")
    if buf > HARD or (over_since >= 0 and t - over_since >= SOFT_SECONDS):
        print(f"  t={t}s buffer {buf / 1048576:.2f} MB: Redis closes the subscriber; {t * 1000 - t * 800} messages were still unread")
        break` },
          { tech: "go", code: `// 1M WebSocket connections behind 25 gateway nodes, with Redis Pub/Sub simulated in-process.
// Counts what Redis must send to gateways under two subscription designs, computes the
// Redis Cluster hash slot of channel names, and replays a slow-subscriber buffer limit.
package main

import (
	"fmt"
	"math"
	"math/bits"
	"strings"
)

var seed int64 = 42

func rand(n int64) int64 { // MINSTD, fixed seed
	seed = (seed * 48271) % 2147483647
	return seed % n
}

const CONNS, NODES, MESSAGES = 1000000, 25, 5000

func scenario(name string, rooms int) {
	size := make([]int, rooms)
	mask := make([]uint32, rooms) // bit i set = node i has a member of this room
	for c := 0; c < CONNS; c++ {
		node := rand(NODES)
		room := rand(int64(rooms))
		size[room]++
		mask[room] |= 1 << uint(node)
	}
	globalSends, perRoomSends, sockets, wasted := 0, 0, 0, 0
	for m := 0; m < MESSAGES; m++ {
		room := rand(int64(rooms))
		nodes := bits.OnesCount32(mask[room])
		globalSends += NODES  // every gateway subscribes to one channel "all"
		perRoomSends += nodes // gateways subscribe to "room:<id>" only while they hold a member
		wasted += NODES - nodes
		sockets += size[room]
	}
	fmt.Printf("  %s: %d rooms, avg %d members\\n", name, rooms, CONNS/rooms)
	fmt.Printf("    one global channel: %d Redis->gateway sends, %d of them to gateways with nobody to tell\\n", globalSends, wasted)
	fmt.Printf("    channel per room:   %d Redis->gateway sends (%d%% of global)\\n", perRoomSends, int(math.Round(100*float64(perRoomSends)/float64(globalSends))))
	fmt.Printf("    socket writes by gateways: %d\\n", sockets)
}

func crc16(s string) int { // CRC16-XMODEM, the function Redis Cluster uses for key slots
	crc := 0
	for i := 0; i < len(s); i++ {
		crc ^= int(s[i]) << 8
		for b := 0; b < 8; b++ {
			if crc&0x8000 != 0 {
				crc = ((crc << 1) ^ 0x1021) & 0xffff
			} else {
				crc = (crc << 1) & 0xffff
			}
		}
	}
	return crc
}

func slot(key string) int { // only the part inside the first {...} is hashed, if it is non-empty
	if o := strings.Index(key, "{"); o >= 0 {
		if c := strings.Index(key[o+1:], "}"); c > 0 {
			key = key[o+1 : o+1+c]
		}
	}
	return crc16(key) % 16384
}

func shardOf(s int) string {
	if s < 5461 {
		return "shard-1"
	} else if s < 10923 {
		return "shard-2"
	}
	return "shard-3"
}

func main() {
	fmt.Println("Part 1: capacity (assumptions: 30 KB per connection, 25% headroom)")
	perNode := CONNS / NODES
	fmt.Printf("  %d nodes x %d connections = %d; at 80%% fill each node can take %d\\n", NODES, perNode, CONNS, int(math.Round(float64(perNode)/0.8)))
	fmt.Printf("  memory per node: %d x 30 KB = %.1f GB\\n", perNode, float64(perNode)*30/1000000)
	fmt.Printf("\\nPart 2: %d messages to random rooms\\n", MESSAGES)
	scenario("small rooms", 250000)
	scenario("big rooms", 1000)

	fmt.Println("\\nPart 3: sharded Pub/Sub routes a channel by hash slot (3 shards, even split)")
	fmt.Printf("  crc16(\\"123456789\\") = 0x%X\\n", crc16("123456789"))
	for _, ch := range []string{"room:41", "room:42", "room:43", "{room:42}:typing", "{room:42}:presence"} {
		s := slot(ch)
		fmt.Printf("  %-20s slot %5d -> %s\\n", ch, s, shardOf(s))
	}

	fmt.Println("\\nPart 4: a gateway reads 800 msg/s while 1000 msg/s of 1 KB arrive")
	const SOFT, HARD, SOFT_SECONDS = 8 * 1024 * 1024, 32 * 1024 * 1024, 60
	buf, overSince := 0, -1
	for t := 1; t <= 300; t++ {
		buf += (1000 - 800) * 1024
		if buf > SOFT && overSince < 0 {
			overSince = t
			fmt.Printf("  t=%ds buffer %.2f MB passes the 8 MB soft limit\\n", t, float64(buf)/1048576)
		}
		if buf > HARD || (overSince >= 0 && t-overSince >= SOFT_SECONDS) {
			fmt.Printf("  t=%ds buffer %.2f MB: Redis closes the subscriber; %d messages were still unread\\n", t, float64(buf)/1048576, t*1000-t*800)
			break
		}
	}
}` },
          { tech: "java", code: `// 1M WebSocket connections behind 25 gateway nodes, with Redis Pub/Sub simulated in-process.
// Counts what Redis must send to gateways under two subscription designs, computes the
// Redis Cluster hash slot of channel names, and replays a slow-subscriber buffer limit.
public class Main {
    static long seed = 42;
    static int rand(int n) { seed = (seed * 48271) % 2147483647L; return (int) (seed % n); } // MINSTD

    static final int CONNS = 1000000, NODES = 25, MESSAGES = 5000;

    static void scenario(String name, int rooms) {
        int[] size = new int[rooms];
        int[] mask = new int[rooms]; // bit i set = node i has a member of this room
        for (int c = 0; c < CONNS; c++) {
            int node = rand(NODES), room = rand(rooms);
            size[room]++;
            mask[room] |= 1 << node;
        }
        long globalSends = 0, perRoomSends = 0, sockets = 0, wasted = 0;
        for (int m = 0; m < MESSAGES; m++) {
            int room = rand(rooms);
            int nodes = Integer.bitCount(mask[room]);
            globalSends += NODES;  // every gateway subscribes to one channel "all"
            perRoomSends += nodes; // gateways subscribe to "room:<id>" only while they hold a member
            wasted += NODES - nodes;
            sockets += size[room];
        }
        System.out.printf("  %s: %d rooms, avg %d members%n", name, rooms, CONNS / rooms);
        System.out.printf("    one global channel: %d Redis->gateway sends, %d of them to gateways with nobody to tell%n", globalSends, wasted);
        System.out.printf("    channel per room:   %d Redis->gateway sends (%d%% of global)%n", perRoomSends, Math.round(100.0 * perRoomSends / globalSends));
        System.out.printf("    socket writes by gateways: %d%n", sockets);
    }

    static int crc16(String s) { // CRC16-XMODEM, the function Redis Cluster uses for key slots
        int crc = 0;
        for (int i = 0; i < s.length(); i++) {
            crc ^= s.charAt(i) << 8;
            for (int b = 0; b < 8; b++) crc = (crc & 0x8000) != 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
        }
        return crc;
    }

    static int slot(String key) { // only the part inside the first {...} is hashed, if it is non-empty
        int o = key.indexOf('{');
        if (o >= 0) { int c = key.indexOf('}', o + 1); if (c > o + 1) key = key.substring(o + 1, c); }
        return crc16(key) % 16384;
    }

    static String shardOf(int s) { return s < 5461 ? "shard-1" : s < 10923 ? "shard-2" : "shard-3"; }

    public static void main(String[] args) {
        System.out.println("Part 1: capacity (assumptions: 30 KB per connection, 25% headroom)");
        int perNode = CONNS / NODES;
        System.out.printf("  %d nodes x %d connections = %d; at 80%% fill each node can take %d%n", NODES, perNode, CONNS, Math.round(perNode / 0.8));
        System.out.printf("  memory per node: %d x 30 KB = %.1f GB%n", perNode, perNode * 30 / 1000000.0);
        System.out.printf("%nPart 2: %d messages to random rooms%n", MESSAGES);
        scenario("small rooms", 250000);
        scenario("big rooms", 1000);

        System.out.println("\\nPart 3: sharded Pub/Sub routes a channel by hash slot (3 shards, even split)");
        System.out.printf("  crc16(\\"123456789\\") = 0x%X%n", crc16("123456789"));
        for (String ch : new String[] {"room:41", "room:42", "room:43", "{room:42}:typing", "{room:42}:presence"}) {
            int s = slot(ch);
            System.out.printf("  %-20s slot %5d -> %s%n", ch, s, shardOf(s));
        }

        System.out.println("\\nPart 4: a gateway reads 800 msg/s while 1000 msg/s of 1 KB arrive");
        final int SOFT = 8 * 1024 * 1024, HARD = 32 * 1024 * 1024, SOFT_SECONDS = 60;
        int buf = 0, overSince = -1;
        for (int t = 1; t <= 300; t++) {
            buf += (1000 - 800) * 1024;
            if (buf > SOFT && overSince < 0) {
                overSince = t;
                System.out.printf("  t=%ds buffer %.2f MB passes the 8 MB soft limit%n", t, buf / 1048576.0);
            }
            if (buf > HARD || (overSince >= 0 && t - overSince >= SOFT_SECONDS)) {
                System.out.printf("  t=%ds buffer %.2f MB: Redis closes the subscriber; %d messages were still unread%n", t, buf / 1048576.0, t * 1000 - t * 800);
                break;
            }
        }
    }
}` },
        ],
      },
    ],
  },
  {
    title: `What is the publish-subscribe pattern?`,
    difficulty: "medium",
    seoDescription: `The publish-subscribe pattern explained: topics, fan-out, ephemeral vs durable subscriptions, consumer groups, delivery guarantees and ordering.`,
    description: `**Question presented to candidate:**
"Explain the publish-subscribe pattern. How is it different from just calling the other services, or from a work queue? And what changes when the broker is Redis Pub/Sub versus something like Kafka?"

**What a strong answer should cover:**
- Publishers send messages to a **topic** without knowing who listens; the broker delivers a copy to **every subscriber** (fan-out), so producers and consumers are decoupled in identity, number and often time
- The contrast with a **point-to-point queue**, where each message goes to one consumer, and how **consumer groups** combine both (fan-out across groups, load sharing within a group)
- **Ephemeral** subscriptions (Redis Pub/Sub: only connected subscribers receive, at-most-once) versus **durable** ones (a retained log with per-subscriber offsets: late or offline subscribers catch up)
- Delivery guarantees: durable systems are usually **at-least-once**, so subscribers must be **idempotent**; ordering is typically per partition or per key, not global
- Costs: harder to trace a flow, schema evolution of events, and no reply path — pub/sub is for notifications, not for questions that need an answer

**Code / implementation expected:** Optional — the concepts matter most; the example builds an ephemeral channel and a durable partitioned log side by side.`,
    answer: `**Target Audience:** Beginners to system design who have written services that call each other; no messaging background assumed.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Redis and Kafka behaviour is cited from their documentation.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Behaviour claims come from the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A bakery takes an order. Without pub/sub, the cashier has to walk to the kitchen and tell the baker, then phone the delivery driver, then update the loyalty-points book, then tell the accountant. Every new department means the cashier learns a new step, and if the accountant is at lunch, the cashier waits.

With pub/sub, the cashier pins the order slip to a board marked **Orders** and goes back to the queue. The baker, the driver, the loyalty clerk and the accountant each read the board. When the bakery adds a social-media person who posts "another cake sold!", nobody tells the cashier — the new person just starts reading the board.

The board is the **topic**. The cashier is the **publisher**. Everyone reading is a **subscriber**. The cashier does not know, or care, how many readers there are.

## 2. The Pattern

📌 **Interview term: publish-subscribe (pub/sub)** — a messaging pattern where publishers send messages to a named topic and a broker delivers a copy to every subscriber of that topic. Publishers and subscribers never address each other directly.

📌 **Interview term: topic (channel)** — the named stream a message is published to, such as \`orders\` or \`room:42\`. Subscribers choose topics; some brokers also allow patterns (Redis \`PSUBSCRIBE orders.*\`) or filters on message attributes.

📌 **Interview term: fan-out** — one published message becoming many deliveries, one per subscriber.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="An order service publishes to the orders topic, and the broker delivers a copy to the email, analytics and inventory services">
  <defs>
    <marker id="sd03q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="118" width="150" height="64" rx="10"/>
  <text class="d-text" x="95" y="146" text-anchor="middle">Order service</text>
  <text class="d-sub" x="95" y="168" text-anchor="middle">publisher</text>
  <rect class="d-box-accent" x="270" y="112" width="160" height="76" rx="10"/>
  <text class="d-text" x="350" y="144" text-anchor="middle">Topic orders</text>
  <text class="d-sub" x="350" y="168" text-anchor="middle">broker</text>
  <rect class="d-box" x="530" y="20" width="170" height="56" rx="10"/>
  <text class="d-text" x="615" y="53" text-anchor="middle">Email</text>
  <rect class="d-box" x="530" y="122" width="170" height="56" rx="10"/>
  <text class="d-text" x="615" y="155" text-anchor="middle">Analytics</text>
  <rect class="d-box" x="530" y="224" width="170" height="56" rx="10"/>
  <text class="d-text" x="615" y="257" text-anchor="middle">Inventory</text>
  <path class="d-edge" d="M 170 150 L 264 150" marker-end="url(#sd03q4-arrow)"/>
  <path class="d-edge-accent" d="M 430 134 L 524 52" marker-end="url(#sd03q4-arrow)"/>
  <path class="d-edge-accent" d="M 430 150 L 524 150" marker-end="url(#sd03q4-arrow)"/>
  <path class="d-edge-accent" d="M 430 166 L 524 250" marker-end="url(#sd03q4-arrow)"/>
</svg>

One publish, three deliveries. Adding a fourth subscriber changes nothing on the publisher side.

### What decoupling buys you, precisely

- **Identity:** the publisher does not know the subscriber names or addresses.
- **Number:** zero, one or fifty subscribers; the publish call is the same.
- **Time (only with durable brokers):** a subscriber can be offline and catch up later.
- **Failure:** a slow or crashed subscriber does not slow the publisher (the broker absorbs it, within limits).

📌 **Interview term: event** — a message that states a fact that already happened (\`OrderPlaced\`, \`UserSignedUp\`), named in the past tense. Pub/sub carries events; subscribers decide what to do about them. A **command** (\`SendEmail\`) tells one specific receiver to act, and usually belongs on a queue.

### Pub/sub vs a work queue vs calling services directly

| | Direct call | Work queue (point-to-point) | Pub/sub |
| :--- | :--- | :--- | :--- |
| Each message reaches | the one service called | exactly one of the workers | every subscriber |
| Caller knows receivers | yes | knows the queue only | knows the topic only |
| Caller waits | yes | no | no |
| Good for | queries, things needing an answer | spreading jobs across workers | broadcasting facts to many independent consumers |
| Examples | HTTP, gRPC | SQS, a RabbitMQ queue | Redis Pub/Sub, SNS, Kafka topics, Google Pub/Sub |

The queue side is covered in [What is a message queue and why use one?](/interview-question/what-is-a-message-queue-and-why-use-one).

## 3. Two Very Different Implementations

### Ephemeral: deliver to whoever is connected

Redis Pub/Sub is the classic example. \`PUBLISH\` hands the message to the subscribers connected at that instant and returns how many there were; nothing is stored. The Redis docs call this **at-most-once** delivery: a subscriber that is disconnected or fails to process a message loses it.

~~~text
Part 1: ephemeral channel 'prices'
  publish p0 -> delivered to 0 subscribers (lost)
  dash-1 got p1,p2,p3,p4; dash-2 got p3 (joined late, missed p4 while away)
~~~

\`dash-2\` subscribed late, so it never saw p1 or p2, and a short network blip cost it p4. That is fine for live price ticks or typing indicators, where only the newest value matters. It is wrong for orders.

📌 **Interview term: ephemeral (non-durable) subscription** — a subscription that exists only while the subscriber is connected; messages published while it is away are not kept for it.

### Durable: a log that subscribers read at their own pace

Kafka is the classic example. A topic is an append-only **log** split into **partitions**; messages stay for a retention period (Kafka broker default \`log.retention.hours=168\`, seven days) whether or not anyone has read them. Each subscriber keeps an **offset** — how far it has read — so it can go offline and continue later.

📌 **Interview term: offset** — the position of the next message a consumer will read in a partition. Committing an offset records progress; after a crash the consumer resumes from the last committed offset.

📌 **Interview term: consumer group** — a set of consumer instances sharing one subscription. Every **group** receives every message (fan-out across groups), but within a group each partition is read by only one member at a time (load sharing). So "email" can run two instances without sending each email twice.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="Two partitions of the orders log; the email group has one member per partition, and the analytics group reads both partitions with its own offsets">
  <rect class="d-box-muted" x="20" y="40" width="380" height="56" rx="10"/>
  <text class="d-text" x="210" y="73" text-anchor="middle">partition 0: o2 o4 o5</text>
  <rect class="d-box-muted" x="20" y="170" width="380" height="56" rx="10"/>
  <text class="d-text" x="210" y="203" text-anchor="middle">partition 1: o1 o3 o6</text>
  <rect class="d-box" x="480" y="20" width="220" height="56" rx="10"/>
  <text class="d-text" x="590" y="53" text-anchor="middle">email member a</text>
  <rect class="d-box" x="480" y="110" width="220" height="56" rx="10"/>
  <text class="d-text" x="590" y="143" text-anchor="middle">email member b</text>
  <rect class="d-box-accent" x="480" y="200" width="220" height="56" rx="10"/>
  <text class="d-text" x="590" y="233" text-anchor="middle">analytics, own offsets</text>
  <path class="d-edge" d="M 400 62 L 474 48"/>
  <path class="d-edge" d="M 400 198 L 474 140"/>
  <path class="d-edge-accent" d="M 400 76 L 474 220"/>
  <path class="d-edge-accent" d="M 400 210 L 474 228"/>
</svg>

The email group splits the partitions between its two members; the analytics group reads both partitions independently, so both groups see all six orders.

The example builds that log with two partitions keyed by customer:

~~~text
Part 2: durable topic 'orders', 2 partitions keyed by customer
  partition 0: bea:o2 cy:o4
  partition 1: ann:o1 ann:o3
  group email, member a owns p0: o2,o4; member b owns p1: o1,o3
  group analytics is offline; nothing is lost, its offsets are still [0,0]
~~~

📌 **Interview term: partition key** — the field hashed to choose a partition (here, the customer). All messages with one key go to one partition, which is what gives **per-key ordering**: \`ann\` orders always arrive o1, o3, o6. There is no ordering promise *across* partitions.

## 4. Delivery Guarantees: Why Subscribers Must Be Idempotent

A durable subscriber processes a message and then commits its offset. If it crashes between the two, it reprocesses that message after restart. That is **at-least-once** delivery, the normal guarantee of durable pub/sub.

~~~text
Part 3: analytics comes back, crashes once before committing, restarts
  p0@0 o2 amt 15
  p0@1 o4 amt 50
  p0@2 o5 amt 25
  run 1: crashed before commit
  p0@2 o5 amt 25
  p1@0 o1 amt 30
  p1@1 o3 amt 20
  p1@2 o6 amt 10
  run 2: ok
  revenue: true 150, naive counter 175, idempotent counter 150
  per-key order for ann: o1 -> o3 -> o6
~~~

Order o5 was handled twice. The naive revenue counter reported 175 instead of 150; the version that remembers processed order IDs reported the correct 150. Committing *before* processing would flip the failure into **at-most-once** (a crash loses the message instead). Exactly-once is achievable only within narrow boundaries; see [Exactly-once processing — can Kafka or SQS guarantee it?](/interview-question/exactly-once-processing-can-kafka-or-sqs-guarantee-it) and [What is idempotency and why does it matter?](/interview-question/what-is-idempotency-and-why-does-it-matter).

📌 **Interview term: idempotent consumer** — a subscriber that produces the same result whether a message is handled once or several times, usually by recording processed message IDs or by making writes naturally repeatable (set a value rather than add to it).

| Guarantee | How it happens | Who uses it |
| :--- | :--- | :--- |
| At-most-once | no storage, or commit before processing | Redis Pub/Sub, metrics where loss is fine |
| At-least-once | store, process, then commit | typical Kafka consumers, SNS to SQS, most durable brokers |
| Effectively once | at-least-once plus idempotent processing or transactions | payments, counters, anything with money |

## 5. Where Pub/Sub Shows Up in Designs

- **Event-driven microservices:** the order service publishes \`OrderPlaced\`; email, inventory and analytics subscribe ([What are the trade-offs of microservices vs a monolith?](/interview-question/what-are-the-trade-offs-of-microservices-vs-a-monolith)).
- **Real-time fan-out:** chat gateways subscribe to room channels ([How do you scale WebSockets to 1M connections with Redis Pub/Sub?](/interview-question/how-do-you-scale-websockets-to-1m-connections-with-redis-pub-sub)).
- **Cache invalidation:** a write publishes "key changed"; every app server drops its local copy.
- **Change data capture:** the database change log becomes a topic for search and caches ([How does CDC with Debezium keep search and cache in sync with Postgres?](/interview-question/how-does-cdc-with-debezium-keep-search-and-cache-in-sync-with-postgres)).
- **SNS plus SQS fan-out:** a topic delivers to one queue per consuming service, so each service gets durability and its own retry pace.

## 6. Verified: Running the Code

The example **"Pub/sub two ways: an ephemeral channel vs a durable log with consumer groups and redelivery"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
Part 1: ephemeral channel 'prices'
  publish p0 -> delivered to 0 subscribers (lost)
  dash-1 got p1,p2,p3,p4; dash-2 got p3 (joined late, missed p4 while away)

Part 2: durable topic 'orders', 2 partitions keyed by customer
  partition 0: bea:o2 cy:o4
  partition 1: ann:o1 ann:o3
  group email, member a owns p0: o2,o4; member b owns p1: o1,o3
  group analytics is offline; nothing is lost, its offsets are still [0,0]

Part 3: analytics comes back, crashes once before committing, restarts
  p0@0 o2 amt 15
  p0@1 o4 amt 50
  p0@2 o5 amt 25
  run 1: crashed before commit
  p0@2 o5 amt 25
  p1@0 o1 amt 30
  p1@1 o3 amt 20
  p1@2 o6 amt 10
  run 2: ok
  revenue: true 150, naive counter 175, idempotent counter 150
  per-key order for ann: o1 -> o3 -> o6
~~~

What the simulation stands for and leaves out: the "broker" is a few in-memory maps and arrays. The ephemeral channel mirrors Redis \`PUBLISH\` semantics (deliver to current subscribers, return the count); the partitioned log, offsets and groups mirror Kafka concepts. There is no network, replication, retention expiry or group rebalancing, and the partitioner is a simple character-code sum rather than Kafka murmur2 hash.

## Common Pitfalls

- **Using ephemeral pub/sub for data you cannot lose.** In the run, a subscriber that joined late and blinked once missed four of the five messages.
- **Assuming exactly-once.** Durable pub/sub redelivers after crashes; the naive counter in the run over-counted by 25.
- **Expecting global ordering.** Order holds per partition (per key) only; choose the key that matters, such as the order or account ID.
- **Hiding a request-response in events.** If the publisher needs an answer to continue, an event is the wrong tool; use a call or a saga ([What is the saga pattern for distributed transactions?](/interview-question/what-is-the-saga-pattern-for-distributed-transactions)).
- **Breaking subscribers with schema changes.** Unknown consumers read your events; evolve schemas compatibly (add optional fields, never rename) and version them.
- **No visibility into who consumes what.** Track subscribers and their lag, or a dead subscriber goes unnoticed until its data is weeks stale.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Publishers send messages to a <strong style="color:#ffca28;">topic</strong>; the broker delivers a copy to <strong style="color:#ffca28;">every subscriber</strong>. Publishers do not know who, or how many, the subscribers are.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Versus a queue:</strong> <span style="color:#f0e2c8;">A queue gives each message to <strong style="color:#ffca28;">one</strong> worker to share load; pub/sub gives it to <strong style="color:#ffca28;">all</strong> subscribers. <strong style="color:#ffca28;">Consumer groups</strong> combine them: every group gets every message, and members of a group split the partitions.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Two flavours:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Ephemeral</strong> pub/sub such as Redis delivers only to connected subscribers and is at-most-once. <strong style="color:#ffca28;">Durable</strong> pub/sub such as Kafka keeps a log with retention and per-subscriber <strong style="color:#ffca28;">offsets</strong>, so offline subscribers catch up.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Guarantees:</strong> <span style="color:#f0e2c8;">Durable systems are <strong style="color:#ffca28;">at-least-once</strong>: a crash between processing and committing replays a message, so subscribers must be <strong style="color:#ffca28;">idempotent</strong>. Ordering is per partition key, not global.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When to use it:</strong> <span style="color:#f0e2c8;">Broadcasting facts (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OrderPlaced</code>) to independent consumers, real-time fan-out and cache invalidation; not for calls that need an answer. Watch consumer lag and schema evolution.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between pub/sub and the observer pattern?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The observer pattern is in-process: the subject holds direct references to its observers and calls them synchronously. Pub/sub puts a broker in between, so publishers and subscribers can live in different processes, run at different speeds and not know each other.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make sure a new subscriber gets historical events?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a durable log and start the new consumer group from the earliest retained offset, or from a snapshot plus the log. With ephemeral pub/sub there is no history to give it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you guarantee that all events for one order are processed in sequence?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the order ID as the <strong style="color:#ffca28;">partition key</strong>, so all its events land in one partition, which one consumer in the group reads in order. Different orders still process in parallel.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Subscribers process the same event twice. Bug or expected?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Expected under at-least-once delivery, after a crash, a rebalance or a timeout. Make handlers idempotent: record processed event IDs, or use upserts keyed by the event.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose Redis Pub/Sub over Kafka?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When messages are live-only and losing some is acceptable — typing indicators, presence pings, cache invalidation hints — and you want very low latency with cheap, dynamic channels. For anything that must survive a subscriber outage, use a log.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Publish-subscribe (pub/sub) | Publishers send to topics; every subscriber gets a copy |
| Topic (channel) | The named stream messages are published to |
| Fan-out | One message delivered to many subscribers |
| Event | A message stating something that already happened |
| Ephemeral subscription | Exists only while connected; nothing kept while away |
| Offset | Position of the next message a consumer will read |
| Consumer group | Instances sharing one subscription and splitting partitions |
| Partition key | Field hashed to pick a partition; gives per-key ordering |
| Idempotent consumer | Gives the same result if a message is handled more than once |

**Conclusion:** Pub/sub is the pattern of announcing facts without knowing the audience: one publish, many independent deliveries, and new subscribers added without touching the publisher. The key design decision is which flavour you need. Ephemeral pub/sub is fast and simple but at-most-once, right for live, replaceable data. Durable pub/sub keeps a log with offsets and consumer groups, so subscribers can be offline, scale out and replay — at the price of at-least-once delivery, which you meet with idempotent consumers and a deliberate choice of partition key for ordering.`,
    examples: [
      {
        label: `Pub/sub two ways: an ephemeral channel vs a durable log with consumer groups and redelivery`,
        variants: [
          { tech: "node", code: `// Publish-subscribe two ways, in one process: an ephemeral channel (Redis Pub/Sub style)
// and a durable partitioned log with consumer groups (Kafka style). No real broker.

// ---- 1. Ephemeral: deliver to whoever is subscribed right now, keep nothing ----
const channels = {};
const subscribe = (ch, name, inbox) => ((channels[ch] ||= {})[name] = inbox);
const unsubscribe = (ch, name) => delete channels[ch][name];
const publishNow = (ch, msg) => {
  const subs = Object.values(channels[ch] || {});
  subs.forEach((inbox) => inbox.push(msg));
  return subs.length; // like Redis PUBLISH, the reply is how many subscribers got it
};
const d1 = [], d2 = [];
console.log("Part 1: ephemeral channel 'prices'");
console.log("  publish p0 -> delivered to " + publishNow("prices", "p0") + " subscribers (lost)");
subscribe("prices", "dash-1", d1);
publishNow("prices", "p1"); publishNow("prices", "p2");
subscribe("prices", "dash-2", d2);
publishNow("prices", "p3");
unsubscribe("prices", "dash-2"); // network blip
publishNow("prices", "p4");
subscribe("prices", "dash-2", d2);
console.log("  dash-1 got " + d1.join(",") + "; dash-2 got " + d2.join(",") + " (joined late, missed p4 while away)");

// ---- 2. Durable log: every group gets every message; members of a group split partitions ----
const PARTITIONS = 2;
const log = Array.from({ length: PARTITIONS }, () => []);
const partitionOf = (key) => [...key].reduce((s, c) => s + c.charCodeAt(0), 0) % PARTITIONS;
const append = (key, value) => log[partitionOf(key)].push({ key, value });
const committed = {}; // group -> [offset per partition]
function poll(group, partitions, handler, crashAfter = -1) {
  const offs = (committed[group] ||= Array(PARTITIONS).fill(0));
  let handled = 0;
  for (const p of partitions) {
    while (offs[p] < log[p].length) {
      handler(log[p][offs[p]], p, offs[p]);
      handled++;
      if (handled === crashAfter) return "crashed before commit";
      offs[p]++; // commit after processing: at-least-once
    }
  }
  return "ok";
}
const orders = [["ann", "o1", 30], ["bea", "o2", 15], ["ann", "o3", 20], ["cy", "o4", 50], ["bea", "o5", 25], ["ann", "o6", 10]];
orders.slice(0, 4).forEach(([k, id, amt]) => append(k, { id, amt }));
console.log("\\nPart 2: durable topic 'orders', " + PARTITIONS + " partitions keyed by customer");
for (let p = 0; p < PARTITIONS; p++) console.log("  partition " + p + ": " + log[p].map((m) => m.key + ":" + m.value.id).join(" "));
const emailSeen = { "email-a": [], "email-b": [] };
poll("email", [0], (m) => emailSeen["email-a"].push(m.value.id));
poll("email", [1], (m) => emailSeen["email-b"].push(m.value.id));
console.log("  group email, member a owns p0: " + emailSeen["email-a"].join(",") + "; member b owns p1: " + emailSeen["email-b"].join(","));
console.log("  group analytics is offline; nothing is lost, its offsets are still " + JSON.stringify(committed.analytics || [0, 0]));
orders.slice(4).forEach(([k, id, amt]) => append(k, { id, amt }));

// ---- 3. At-least-once redelivery and an idempotent subscriber ----
console.log("\\nPart 3: analytics comes back, crashes once before committing, restarts");
let naive = 0, safe = 0;
const processed = new Set();
const handle = (m, p, off) => {
  naive += m.value.amt;
  if (!processed.has(m.value.id)) { processed.add(m.value.id); safe += m.value.amt; }
  console.log("  p" + p + "@" + off + " " + m.value.id + " amt " + m.value.amt);
};
console.log("  run 1: " + poll("analytics", [0, 1], handle, 3));
console.log("  run 2: " + poll("analytics", [0, 1], handle));
const truth = orders.reduce((s, o) => s + o[2], 0);
console.log("  revenue: true " + truth + ", naive counter " + naive + ", idempotent counter " + safe);
console.log("  per-key order for ann: " + log[partitionOf("ann")].filter((m) => m.key === "ann").map((m) => m.value.id).join(" -> "));` },
          { tech: "python", code: `# Publish-subscribe two ways, in one process: an ephemeral channel (Redis Pub/Sub style)
# and a durable partitioned log with consumer groups (Kafka style). No real broker.

# ---- 1. Ephemeral: deliver to whoever is subscribed right now, keep nothing ----
channels = {}


def subscribe(ch, name, inbox):
    channels.setdefault(ch, {})[name] = inbox


def unsubscribe(ch, name):
    del channels[ch][name]


def publish_now(ch, msg):
    subs = list(channels.get(ch, {}).values())
    for inbox in subs:
        inbox.append(msg)
    return len(subs)  # like Redis PUBLISH, the reply is how many subscribers got it


d1, d2 = [], []
print("Part 1: ephemeral channel 'prices'")
print(f"  publish p0 -> delivered to {publish_now('prices', 'p0')} subscribers (lost)")
subscribe("prices", "dash-1", d1)
publish_now("prices", "p1"); publish_now("prices", "p2")
subscribe("prices", "dash-2", d2)
publish_now("prices", "p3")
unsubscribe("prices", "dash-2")  # network blip
publish_now("prices", "p4")
subscribe("prices", "dash-2", d2)
print(f"  dash-1 got {','.join(d1)}; dash-2 got {','.join(d2)} (joined late, missed p4 while away)")

# ---- 2. Durable log: every group gets every message; members of a group split partitions ----
PARTITIONS = 2
log = [[] for _ in range(PARTITIONS)]


def partition_of(key):
    return sum(ord(c) for c in key) % PARTITIONS


def append(key, value):
    log[partition_of(key)].append({"key": key, "value": value})


committed = {}  # group -> [offset per partition]


def poll(group, partitions, handler, crash_after=-1):
    offs = committed.setdefault(group, [0] * PARTITIONS)
    handled = 0
    for p in partitions:
        while offs[p] < len(log[p]):
            handler(log[p][offs[p]], p, offs[p])
            handled += 1
            if handled == crash_after:
                return "crashed before commit"
            offs[p] += 1  # commit after processing: at-least-once
    return "ok"


orders = [("ann", "o1", 30), ("bea", "o2", 15), ("ann", "o3", 20), ("cy", "o4", 50), ("bea", "o5", 25), ("ann", "o6", 10)]
for k, i, amt in orders[:4]:
    append(k, {"id": i, "amt": amt})
print(f"\\nPart 2: durable topic 'orders', {PARTITIONS} partitions keyed by customer")
for p in range(PARTITIONS):
    print(f"  partition {p}: " + " ".join(m["key"] + ":" + m["value"]["id"] for m in log[p]))
email_seen = {"email-a": [], "email-b": []}
poll("email", [0], lambda m, p, o: email_seen["email-a"].append(m["value"]["id"]))
poll("email", [1], lambda m, p, o: email_seen["email-b"].append(m["value"]["id"]))
print(f"  group email, member a owns p0: {','.join(email_seen['email-a'])}; member b owns p1: {','.join(email_seen['email-b'])}")
offs = committed.get("analytics", [0, 0])
print(f"  group analytics is offline; nothing is lost, its offsets are still [{offs[0]},{offs[1]}]")
for k, i, amt in orders[4:]:
    append(k, {"id": i, "amt": amt})

# ---- 3. At-least-once redelivery and an idempotent subscriber ----
print("\\nPart 3: analytics comes back, crashes once before committing, restarts")
totals = {"naive": 0, "safe": 0}
processed = set()


def handle(m, p, off):
    v = m["value"]
    totals["naive"] += v["amt"]
    if v["id"] not in processed:
        processed.add(v["id"])
        totals["safe"] += v["amt"]
    print(f"  p{p}@{off} {v['id']} amt {v['amt']}")


print("  run 1: " + poll("analytics", [0, 1], handle, 3))
print("  run 2: " + poll("analytics", [0, 1], handle))
truth = sum(o[2] for o in orders)
print(f"  revenue: true {truth}, naive counter {totals['naive']}, idempotent counter {totals['safe']}")
print("  per-key order for ann: " + " -> ".join(m["value"]["id"] for m in log[partition_of("ann")] if m["key"] == "ann"))` },
        ],
      },
    ],
  },
  {
    title: `What is a message queue and why use one?`,
    difficulty: "medium",
    seoDescription: `What a message queue is and why use one: async work, absorbing spikes, competing consumers, acks, visibility timeouts, retries and dead-letter queues.`,
    description: `**Question presented to candidate:**
"What is a message queue, and why would you put one between two services instead of having one call the other? Tell me what happens when a consumer crashes halfway through a message, and what can go wrong."

**What a strong answer should cover:**
- A queue is a **durable buffer** between **producers** and **consumers**: the producer hands off work and returns; consumers pull at their own pace
- The reasons: **asynchronous work** (fast user response), **absorbing traffic spikes** (load levelling), **independent scaling and failure** of each side, and **competing consumers** for parallelism
- The delivery mechanics: receive, process, **acknowledge/delete**; an unacknowledged message comes back after a **visibility timeout**; repeated failures go to a **dead-letter queue**
- The consequence: delivery is usually **at-least-once**, so consumers must be **idempotent**; FIFO ordering costs throughput and is usually per group
- The costs: queue depth and consumer lag to monitor, eventual rather than immediate results, one more system to run, and a real product example (SQS defaults, RabbitMQ acks, Kafka)

**Code / implementation expected:** Optional — explanation first; the example simulates a burst, a crashed consumer, a poison message and a duplicate delivery.`,
    answer: `**Target Audience:** Beginners to system design who have built an API that does all its work inside the request.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Amazon SQS and Kafka facts are cited from AWS and Apache announcements and docs.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the vocabulary an interviewer expects. Behaviour claims come from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A busy restaurant does not make the waiter stand in the kitchen until the dish is cooked. The waiter writes the order on a ticket, clips it to the rail and goes back to the tables. Cooks take tickets from the rail one by one. At 8 pm, when twenty tables order at once, the rail fills up — but no customer is turned away at the door, and the cooks work through the tickets at their steady pace. If a cook burns a dish and walks off, the ticket is still there for another cook.

The ticket rail is a **message queue**. The waiter is the **producer**, the cooks are **consumers**, and each ticket is a **message**. The rail gives three things: the waiter is fast (asynchronous), a rush becomes a longer rail instead of chaos (buffering), and a ticket is not lost because one cook failed (reliability).

## 2. What a Queue Is

📌 **Interview term: message queue** — a broker that stores messages from producers until consumers take and acknowledge them. Each message is processed by **one** consumer (point-to-point), in contrast to pub/sub, where every subscriber gets a copy ([What is the publish-subscribe pattern?](/interview-question/what-is-the-publish-subscribe-pattern)).

📌 **Interview term: producer and consumer** — the producer sends messages and does not wait for the work; the consumer (or worker) receives, processes and acknowledges them.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="An API server sends jobs to a queue, three workers take jobs from it, and messages that fail too often move to a dead-letter queue">
  <defs>
    <marker id="sd03q5-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="100" width="140" height="64" rx="10"/>
  <text class="d-text" x="90" y="128" text-anchor="middle">API server</text>
  <text class="d-sub" x="90" y="150" text-anchor="middle">producer</text>
  <rect class="d-box-accent" x="240" y="100" width="180" height="64" rx="10"/>
  <text class="d-text" x="330" y="128" text-anchor="middle">Queue</text>
  <text class="d-sub" x="330" y="150" text-anchor="middle">durable buffer</text>
  <rect class="d-box" x="530" y="20" width="160" height="50" rx="10"/>
  <text class="d-text" x="610" y="50" text-anchor="middle">worker 1</text>
  <rect class="d-box" x="530" y="107" width="160" height="50" rx="10"/>
  <text class="d-text" x="610" y="137" text-anchor="middle">worker 2</text>
  <rect class="d-box" x="530" y="194" width="160" height="50" rx="10"/>
  <text class="d-text" x="610" y="224" text-anchor="middle">worker 3</text>
  <rect class="d-box-muted" x="250" y="214" width="160" height="50" rx="10"/>
  <text class="d-text" x="330" y="244" text-anchor="middle">Dead-letter queue</text>
  <path class="d-edge" d="M 160 132 L 234 132" marker-end="url(#sd03q5-arrow)"/>
  <path class="d-edge-accent" d="M 420 120 L 524 46" marker-end="url(#sd03q5-arrow)"/>
  <path class="d-edge-accent" d="M 420 132 L 524 132" marker-end="url(#sd03q5-arrow)"/>
  <path class="d-edge-accent" d="M 420 146 L 524 218" marker-end="url(#sd03q5-arrow)"/>
  <path class="d-edge-dashed" d="M 330 164 L 330 208" marker-end="url(#sd03q5-arrow)"/>
</svg>

Each job goes to exactly one of the workers. A job that keeps failing is moved aside to the dead-letter queue instead of blocking or looping forever.

## 3. Why Use One — Four Reasons

1. **Asynchronous work.** Sign-up returns in 50 ms; the welcome email, the thumbnail and the CRM sync happen afterwards from the queue. The user does not wait for the slowest step.
2. **Absorbing spikes (load levelling).** Consumers run at a steady rate; a burst grows the queue instead of overloading the backend.
3. **Independent scaling and failure.** Add workers when the queue grows; deploy or restart workers without the producer noticing; a downstream outage becomes a backlog, not an error page.
4. **Parallelism with competing consumers.** Many workers read the same queue and each message goes to one of them, so throughput scales by adding workers.

📌 **Interview term: competing consumers** — several consumer instances reading one queue, each taking different messages. It is the standard way to scale queue processing horizontally.

📌 **Interview term: load levelling** — using a queue so a bursty arrival rate becomes a steady processing rate.

### Load levelling, measured

The example sends 380 jobs in 10 seconds, with a spike of 150 per second at t=2 and t=3, to workers that handle 30 per second in total:

~~~text
Part 1: 380 jobs in 10 s, workers handle 30/s
  no queue (call the service directly): 240 requests rejected or timed out
  with a queue:
  t= 0s arrived  10, processed 10, depth 0
  t= 1s arrived  10, processed 10, depth 0
  t= 2s arrived 150, processed 30, depth 120
  t= 3s arrived 150, processed 30, depth 240
  t= 4s arrived  10, processed 30, depth 220
  t=13s arrived   0, processed 30, depth 0
  with a queue: 380 done, 0 rejected, oldest job waited 8 s
~~~

Without a queue, 240 of 380 requests fail. With one, all 380 complete, and the price is **latency**: the queue peaked at 240 and the oldest job waited 8 seconds. That is the trade a queue makes — it turns overload into delay. If the arrival rate stays above the processing rate, the queue grows forever, which is why queue depth is the number to alert on ([What is backpressure and how do you handle it?](/interview-question/what-is-backpressure-and-how-do-you-handle-it)).

📌 **Interview term: queue depth (backlog)** — the number of messages waiting. Depth divided by processing rate is roughly how long a new message will wait: 240 / 30 = 8 seconds here.

## 4. Acknowledgements, Visibility Timeout and Dead Letters

A consumer can crash after receiving a message. A queue must not delete the message on delivery, or the work is lost. So delivery is a two-step contract:

1. **Receive.** The broker hands the message to one consumer and hides it from the others.
2. **Acknowledge.** After processing, the consumer deletes (acks) it. If no ack arrives in time, the broker makes the message available again.

📌 **Interview term: acknowledgement (ack)** — the consumer telling the broker "done, remove it". In SQS you call \`DeleteMessage\`; in RabbitMQ you send \`basic.ack\`.

📌 **Interview term: visibility timeout** — in SQS, how long a received message stays hidden from other consumers. Per the AWS docs the default is 30 seconds and the maximum is 12 hours. If the consumer has not deleted the message by then, it becomes visible and is delivered again.

📌 **Interview term: dead-letter queue (DLQ)** — a side queue for messages that failed too many times. In SQS a redrive policy sets \`maxReceiveCount\`; when a message's receive count exceeds it, SQS moves the message to the DLQ. This stops a **poison message** (one that can never succeed) from being retried forever.

~~~text
Part 2: visibility timeout 30 s, maxReceiveCount 3
  t=0s m1 processed and acked (receive 1)
  t=0s worker takes m2 and crashes (no ack)
  t=0s m3 fails (receive 1), becomes visible again at t=30s
  t=30s m2 processed and acked (receive 2)
  t=30s m3 fails (receive 2), becomes visible again at t=60s
  t=60s m3 fails (receive 3), becomes visible again at t=90s
  t=90s m3 moved to DLQ after 3 failed receives
  queue empty: true; DLQ holds m3 'corrupt file'
~~~

m2 survived its worker crash: 30 seconds later it reappeared and another worker finished it. m3, a corrupt file, failed three times and was parked in the DLQ for a human or a repair job, instead of burning worker time forever.

## 5. The Consequence: At-Least-Once, So Be Idempotent

The redelivery that saved m2 has a side effect. If processing takes **longer** than the visibility timeout, the message reappears while the first worker is still working, and a second worker takes it too:

~~~text
Part 3: charge job takes 40 s, visibility timeout is 30 s
 without an idempotency key:
  t=0s worker-1 receives pay-17; t=30s it is still working, so the message reappears
  t=30s worker-2 receives pay-17 (receive 2)
  t=40s worker-1 charges $25
  t=70s worker-2 charges $25
  customer charged 2 time(s), total $50
 with an idempotency key:
  t=0s worker-1 receives pay-17; t=30s it is still working, so the message reappears
  t=30s worker-2 receives pay-17 (receive 2)
  t=40s worker-1 charges $25
  t=70s worker-2 finds key order-17 already used, skips
  customer charged 1 time(s), total $25
~~~

📌 **Interview term: at-least-once delivery** — every message is delivered one or more times; duplicates are possible after crashes, timeouts or network errors. It is the default contract of most queues, including SQS standard queues.

📌 **Interview term: idempotency key** — a unique ID carried by the message (here \`order-17\`) that the consumer records when it performs the side effect, so a duplicate becomes a no-op. Details in [What is idempotency and why does it matter?](/interview-question/what-is-idempotency-and-why-does-it-matter) and [How do you make a payment system reliable against retries?](/interview-question/how-do-you-make-a-payment-system-reliable-against-retries).

Two further defences: set the visibility timeout comfortably above the worst-case processing time, and for long jobs extend it while working (SQS \`ChangeMessageVisibility\`). SQS FIFO queues also deduplicate sends with the same deduplication ID within a **5-minute** window (AWS docs) — useful against producer retries, but not a replacement for idempotent consumers.

## 6. Ordering

A plain queue with many competing consumers does not preserve order in processing: message 2 can finish before message 1 on a faster worker. When order matters, it usually matters **per entity** (per account, per order), not globally. FIFO queues (SQS FIFO with a message group ID, Kafka partitions keyed by entity) give in-order delivery within a group while different groups still run in parallel. Global ordering would mean one consumer at a time, which caps throughput.

## 7. Real Systems at a Glance

| | Amazon SQS | RabbitMQ | Kafka |
| :--- | :--- | :--- | :--- |
| Model | managed queue | broker with exchanges and queues | partitioned log with consumer groups |
| After processing | message deleted | message acked and removed | offset committed; data kept until retention |
| Redelivery trigger | visibility timeout expires | consumer channel closes without ack, or a nack | consumer restarts from last committed offset |
| Ordering | FIFO queues per message group | per queue, with one consumer | per partition |
| Notable limits | max message 1 MiB since August 2025, up from 256 KiB (AWS announcement); retention 4 days default, 14 days max | memory and disk of the broker | retention default 7 days (\`log.retention.hours=168\`) |

Kafka is a log rather than a queue, but it is widely used for queue-like work; Apache Kafka 4.2 also declared **share groups** (KIP-932, "Queues for Kafka") production-ready, letting several consumers share one partition with per-message acknowledgement (Apache Kafka 4.2.0 release announcement). For choosing between them, see [Kafka vs SQS — how do you choose for an event-driven system in 2025?](/interview-question/kafka-vs-sqs-how-do-you-choose-for-an-event-driven-system-in-2025); for building one, [How would you design a distributed message queue?](/interview-question/how-would-you-design-a-distributed-message-queue-572o).

## 8. Verified: Running the Code

The example **"A message queue: burst absorption, visibility timeout, dead-letter queue, duplicate delivery"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
Part 1: 380 jobs in 10 s, workers handle 30/s
  no queue (call the service directly): 240 requests rejected or timed out
  with a queue:
  t= 0s arrived  10, processed 10, depth 0
  t= 1s arrived  10, processed 10, depth 0
  t= 2s arrived 150, processed 30, depth 120
  t= 3s arrived 150, processed 30, depth 240
  t= 4s arrived  10, processed 30, depth 220
  t=13s arrived   0, processed 30, depth 0
  with a queue: 380 done, 0 rejected, oldest job waited 8 s

Part 2: visibility timeout 30 s, maxReceiveCount 3
  t=0s m1 processed and acked (receive 1)
  t=0s worker takes m2 and crashes (no ack)
  t=0s m3 fails (receive 1), becomes visible again at t=30s
  t=30s m2 processed and acked (receive 2)
  t=30s m3 fails (receive 2), becomes visible again at t=60s
  t=60s m3 fails (receive 3), becomes visible again at t=90s
  t=90s m3 moved to DLQ after 3 failed receives
  queue empty: true; DLQ holds m3 'corrupt file'

Part 3: charge job takes 40 s, visibility timeout is 30 s
 without an idempotency key:
  t=0s worker-1 receives pay-17; t=30s it is still working, so the message reappears
  t=30s worker-2 receives pay-17 (receive 2)
  t=40s worker-1 charges $25
  t=70s worker-2 charges $25
  customer charged 2 time(s), total $50
 with an idempotency key:
  t=0s worker-1 receives pay-17; t=30s it is still working, so the message reappears
  t=30s worker-2 receives pay-17 (receive 2)
  t=40s worker-1 charges $25
  t=70s worker-2 finds key order-17 already used, skips
  customer charged 1 time(s), total $25
~~~

What the simulation stands for and leaves out: the queue is an in-memory array with a fake clock in whole seconds, standing in for SQS or RabbitMQ. It models receive, hide, ack, redelivery after a visibility timeout, a receive-count DLQ and an idempotency check. It leaves out durability and replication of the broker, long polling for receives, batching and network failures. In Part 3 the worker timeline is scripted (worker-1 finishing at t=40, worker-2 at t=70); the charge and idempotency logic is real.

## Common Pitfalls

- **Assuming exactly-once delivery.** Duplicates are normal; in the run, a 40-second job with a 30-second visibility timeout charged a customer twice without an idempotency key.
- **Visibility timeout shorter than processing time.** Set it above the worst case, or extend it while working.
- **No dead-letter queue.** A poison message is retried forever and keeps consuming workers; configure a DLQ and alarm on its size.
- **Watching CPU instead of queue depth.** Depth and the age of the oldest message tell you if consumers keep up; autoscale on them.
- **Expecting order with competing consumers.** Use FIFO groups or partition keys per entity.
- **Using a queue for a request that needs an immediate answer.** The user then polls for a result; that is fine for long jobs, wrong for a page load.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A message queue is a <strong style="color:#ffca28;">durable buffer</strong> between producers and consumers. The producer hands off a message and returns; <strong style="color:#ffca28;">one</strong> consumer takes it, processes it and acknowledges it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why:</strong> <span style="color:#f0e2c8;">Four reasons: <strong style="color:#ffca28;">async</strong> work so users do not wait, <strong style="color:#ffca28;">load levelling</strong> so a spike becomes a backlog instead of errors, independent <strong style="color:#ffca28;">scaling and failure</strong> of each side, and <strong style="color:#ffca28;">competing consumers</strong> for parallelism. In my simulation a spike that would have failed 240 of 380 calls completed all 380, with the oldest job waiting 8 seconds.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Mechanics:</strong> <span style="color:#f0e2c8;">Receive hides the message; the consumer deletes it on success. If it crashes, the <strong style="color:#ffca28;">visibility timeout</strong> (30 s default on SQS) expires and the message is redelivered. After <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxReceiveCount</code> failures it moves to a <strong style="color:#ffca28;">dead-letter queue</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Consequence:</strong> <span style="color:#f0e2c8;">That makes delivery <strong style="color:#ffca28;">at-least-once</strong>, so consumers must be <strong style="color:#ffca28;">idempotent</strong>, usually with an idempotency key; and order holds only per FIFO group or partition key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Operations:</strong> <span style="color:#f0e2c8;">Alert on <strong style="color:#ffca28;">queue depth</strong> and oldest-message age, autoscale workers on them, size the visibility timeout above the worst-case processing time, and monitor the DLQ.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if a consumer crashes halfway through a message?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It never acknowledged, so the message stays in the queue, hidden until the visibility timeout expires, then another consumer receives it. Any side effects the first consumer already performed may happen again, which is why consumers must be idempotent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a poison message and how do you handle it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A message that fails every time, such as malformed data. Without a limit it loops forever. A redrive policy moves it to a dead-letter queue after a set number of receives, where you alarm, inspect and replay it once fixed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Queue depth keeps growing. What do you do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Consumers are slower than producers. Scale out consumers if the bottleneck is them, find the downstream bottleneck if it is not, and if it persists apply backpressure upstream: rate-limit producers or shed low-priority work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Queue or pub/sub for sending an order confirmation email?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The email is a command for one service, so a queue fits. If several services react to the order, publish an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OrderPlaced</code> event to a topic and give each service its own queue subscribed to it (the SNS-to-SQS fan-out).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep messages for the same user in order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a FIFO queue with the user ID as the message group, or a Kafka partition keyed by user. Messages within a group are delivered in order and one at a time, while other users proceed in parallel.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Message queue | Broker that holds messages until one consumer takes and acks each |
| Producer and consumer | Sender of messages; receiver that processes and acks them |
| Competing consumers | Many workers on one queue, each taking different messages |
| Load levelling | Turning bursty arrivals into steady processing |
| Queue depth (backlog) | Number of messages waiting |
| Acknowledgement (ack) | Consumer telling the broker a message is done |
| Visibility timeout | How long a received message stays hidden before redelivery |
| Dead-letter queue (DLQ) | Side queue for messages that failed too many times |
| At-least-once delivery | Each message delivered one or more times |
| Idempotency key | Unique ID that turns a duplicate side effect into a no-op |

**Conclusion:** A message queue lets a producer say "this needs doing" and move on, while consumers do it at their own pace. That buys fast responses, survives spikes by turning overload into waiting time, and lets each side scale and fail independently. The machinery that makes it reliable — hide on receive, delete on success, redeliver after a timeout, dead-letter after repeated failure — is also what makes delivery at-least-once, so the other half of using a queue well is writing idempotent consumers and watching queue depth.`,
    examples: [
      {
        label: `A message queue: burst absorption, visibility timeout, dead-letter queue, duplicate delivery`,
        variants: [
          { tech: "node", code: `// A message queue in one process: burst absorption, visibility timeout, retries, a
// dead-letter queue and a duplicate delivery. It stands in for SQS or RabbitMQ; the clock is fake.

// ---- 1. A burst: 3 workers x 10 jobs/s against a spike ----
const ARRIVALS = [10, 10, 150, 150, 10, 10, 10, 10, 10, 10];
const CAPACITY = 30;
console.log("Part 1: 380 jobs in 10 s, workers handle " + CAPACITY + "/s");
let rejected = 0;
for (const a of ARRIVALS) rejected += Math.max(0, a - CAPACITY);
console.log("  no queue (call the service directly): " + rejected + " requests rejected or timed out");
const waiting = []; // arrival second of each queued job
let done = 0, maxWait = 0, t = 0;
const rows = [];
while (t < ARRIVALS.length || waiting.length) {
  for (let i = 0; i < (ARRIVALS[t] || 0); i++) waiting.push(t);
  let served = 0;
  while (served < CAPACITY && waiting.length) { maxWait = Math.max(maxWait, t - waiting.shift()); served++; }
  done += served;
  if (t <= 4 || waiting.length === 0) rows.push("  t=" + String(t).padStart(2) + "s arrived " + String(ARRIVALS[t] || 0).padStart(3) + ", processed " + served + ", depth " + waiting.length);
  if (waiting.length === 0 && t >= ARRIVALS.length) break;
  t++;
}
console.log("  with a queue:\\n" + rows.join("\\n"));
console.log("  with a queue: " + done + " done, 0 rejected, oldest job waited " + maxWait + " s");

// ---- 2. Visibility timeout, redelivery and a dead-letter queue ----
console.log("\\nPart 2: visibility timeout 30 s, maxReceiveCount 3");
const VIS = 30, MAX_RECEIVES = 3;
const queue = [
  { id: "m1", body: "resize photo 1", receives: 0, visibleAt: 0 },
  { id: "m2", body: "resize photo 2", receives: 0, visibleAt: 0 },
  { id: "m3", body: "corrupt file", receives: 0, visibleAt: 0 },
];
const dlq = [];
let crashedOnce = false;
function receive(now) {
  const m = queue.find((x) => x.visibleAt <= now);
  if (!m) return null;
  m.receives++;
  if (m.receives > MAX_RECEIVES) { queue.splice(queue.indexOf(m), 1); dlq.push(m); console.log("  t=" + now + "s " + m.id + " moved to DLQ after " + MAX_RECEIVES + " failed receives"); return receive(now); }
  m.visibleAt = now + VIS; // hidden from other consumers until acked or timed out
  return m;
}
const ack = (m) => queue.splice(queue.indexOf(m), 1);
for (let now = 0; now <= 120; now += 10) {
  let m;
  while ((m = receive(now))) {
    if (m.id === "m2" && !crashedOnce) { crashedOnce = true; console.log("  t=" + now + "s worker takes m2 and crashes (no ack)"); continue; }
    if (m.id === "m3") { console.log("  t=" + now + "s m3 fails (receive " + m.receives + "), becomes visible again at t=" + m.visibleAt + "s"); continue; }
    ack(m);
    console.log("  t=" + now + "s " + m.id + " processed and acked (receive " + m.receives + ")");
  }
}
console.log("  queue empty: " + (queue.length === 0) + "; DLQ holds " + dlq.map((x) => x.id + " '" + x.body + "'").join(","));

// ---- 3. Processing longer than the visibility timeout: a duplicate ----
console.log("\\nPart 3: charge job takes 40 s, visibility timeout is 30 s");
const charges = [], seenKeys = new Set();
const job = { id: "pay-17", idemKey: "order-17", amount: 25 };
function charge(worker, at, idempotent) {
  if (idempotent && seenKeys.has(job.idemKey)) return "  t=" + at + "s " + worker + " finds key " + job.idemKey + " already used, skips";
  seenKeys.add(job.idemKey); charges.push(job.amount);
  return "  t=" + at + "s " + worker + " charges $" + job.amount;
}
for (const idempotent of [false, true]) {
  charges.length = 0; seenKeys.clear();
  console.log(idempotent ? " with an idempotency key:" : " without an idempotency key:");
  console.log("  t=0s worker-1 receives pay-17; t=30s it is still working, so the message reappears");
  console.log("  t=30s worker-2 receives pay-17 (receive 2)");
  console.log(charge("worker-1", 40, idempotent));
  console.log(charge("worker-2", 70, idempotent));
  console.log("  customer charged " + charges.length + " time(s), total $" + charges.reduce((a, b) => a + b, 0));
}` },
          { tech: "python", code: `# A message queue in one process: burst absorption, visibility timeout, retries, a
# dead-letter queue and a duplicate delivery. It stands in for SQS or RabbitMQ; the clock is fake.
from collections import deque

# ---- 1. A burst: 3 workers x 10 jobs/s against a spike ----
ARRIVALS = [10, 10, 150, 150, 10, 10, 10, 10, 10, 10]
CAPACITY = 30
print(f"Part 1: 380 jobs in 10 s, workers handle {CAPACITY}/s")
rejected = sum(max(0, a - CAPACITY) for a in ARRIVALS)
print(f"  no queue (call the service directly): {rejected} requests rejected or timed out")
waiting = deque()  # arrival second of each queued job
done = max_wait = t = 0
rows = []
while t < len(ARRIVALS) or waiting:
    arrived = ARRIVALS[t] if t < len(ARRIVALS) else 0
    for _ in range(arrived):
        waiting.append(t)
    served = 0
    while served < CAPACITY and waiting:
        max_wait = max(max_wait, t - waiting.popleft())
        served += 1
    done += served
    if t <= 4 or not waiting:
        rows.append(f"  t={t:2d}s arrived {arrived:3d}, processed {served}, depth {len(waiting)}")
    if not waiting and t >= len(ARRIVALS):
        break
    t += 1
print("  with a queue:\\n" + "\\n".join(rows))
print(f"  with a queue: {done} done, 0 rejected, oldest job waited {max_wait} s")

# ---- 2. Visibility timeout, redelivery and a dead-letter queue ----
print("\\nPart 2: visibility timeout 30 s, maxReceiveCount 3")
VIS, MAX_RECEIVES = 30, 3
queue = [
    {"id": "m1", "body": "resize photo 1", "receives": 0, "visible_at": 0},
    {"id": "m2", "body": "resize photo 2", "receives": 0, "visible_at": 0},
    {"id": "m3", "body": "corrupt file", "receives": 0, "visible_at": 0},
]
dlq = []
crashed_once = False


def receive(now):
    m = next((x for x in queue if x["visible_at"] <= now), None)
    if m is None:
        return None
    m["receives"] += 1
    if m["receives"] > MAX_RECEIVES:
        queue.remove(m); dlq.append(m)
        print(f"  t={now}s {m['id']} moved to DLQ after {MAX_RECEIVES} failed receives")
        return receive(now)
    m["visible_at"] = now + VIS  # hidden from other consumers until acked or timed out
    return m


for now in range(0, 121, 10):
    while True:
        m = receive(now)
        if m is None:
            break
        if m["id"] == "m2" and not crashed_once:
            crashed_once = True
            print(f"  t={now}s worker takes m2 and crashes (no ack)")
            continue
        if m["id"] == "m3":
            print(f"  t={now}s m3 fails (receive {m['receives']}), becomes visible again at t={m['visible_at']}s")
            continue
        queue.remove(m)  # ack
        print(f"  t={now}s {m['id']} processed and acked (receive {m['receives']})")
print(f"  queue empty: {'true' if not queue else 'false'}; DLQ holds " + ",".join(f"{x['id']} '{x['body']}'" for x in dlq))

# ---- 3. Processing longer than the visibility timeout: a duplicate ----
print("\\nPart 3: charge job takes 40 s, visibility timeout is 30 s")
charges, seen_keys = [], set()
job = {"id": "pay-17", "idem_key": "order-17", "amount": 25}


def charge(worker, at, idempotent):
    if idempotent and job["idem_key"] in seen_keys:
        return f"  t={at}s {worker} finds key {job['idem_key']} already used, skips"
    seen_keys.add(job["idem_key"]); charges.append(job["amount"])
    return f"  t={at}s {worker} charges \${job['amount']}"


for idempotent in (False, True):
    charges.clear(); seen_keys.clear()
    print(" with an idempotency key:" if idempotent else " without an idempotency key:")
    print("  t=0s worker-1 receives pay-17; t=30s it is still working, so the message reappears")
    print("  t=30s worker-2 receives pay-17 (receive 2)")
    print(charge("worker-1", 40, idempotent))
    print(charge("worker-2", 70, idempotent))
    print(f"  customer charged {len(charges)} time(s), total \${sum(charges)}")` },
        ],
      },
    ],
  },
];

export default augments;
