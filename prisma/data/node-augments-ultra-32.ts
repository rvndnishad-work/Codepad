/**
 * Node.js gap batch 32 — networking, real time and scaling (5 questions that
 * previously had only a thin answer): real-time communication, net vs dgram,
 * how cluster distributes connections, horizontal vs vertical scaling, and
 * GraphQL vs REST.
 *
 * Verified in this batch, executed on this machine (Node v22.22.0, Linux,
 * 4 cores). Every example below was run with `node` and its output is quoted
 * verbatim in the answer:
 *   - A hand-written WebSocket handshake on http's `upgrade` event, talked to
 *     by Node 22's global WebSocket client. Two instances without a shared bus:
 *     the client on instance B never received a message sent via instance A.
 *     With a shared bus (EventEmitter standing in for Redis pub/sub): it did.
 *     A ping/pong heartbeat terminated a socket once pongs stopped.
 *   - net vs dgram: three back-to-back TCP writes arrived as ONE 'data' chunk
 *     ("onetwothree", 5 of 5 runs); the same three UDP sends arrived as three
 *     separate 'message' events. TCP connect to a closed port: ECONNREFUSED;
 *     UDP send to the same closed port: callback err = null. A 70,000-byte
 *     datagram: EMSGSIZE. A newline framer recovered 3 messages from 2 chunks.
 *   - cluster: SCHED_RR gave w1 w2 w3 w1 w2 w3 ... for new connections; one
 *     keep-alive connection stayed on a single worker for all 12 requests.
 *     /proc showed the listening socket held only by the primary under RR,
 *     and shared by primary + every worker under SCHED_NONE. RoundRobinHandle
 *     source (printed via --expose-internals) shows a worker is re-queued as
 *     free only after it acknowledges the previous handoff. A worker blocked
 *     300 ms per request still got 3 of 12 connections under RR; under
 *     SCHED_NONE it got between 2 and 10 across 5 runs.
 *   - scaling: 4 CPU-bound jobs took ~3.8-4.3x one job in one process but
 *     ~1.2-1.8x across 4 processes; two instances with in-memory sessions behind a
 *     round-robin proxy returned 401 on every other request until a shared
 *     store was used; --max-old-space-size changed v8 heap_size_limit.
 *   - GraphQL (graphql@16.14.2, installed in the scratch folder only) vs a
 *     REST server on node:http for the same screen: 2 round trips / 1430 bytes
 *     vs 1 round trip / 84 bytes; unknown id gave 404 in REST and 200 with
 *     {"user":null} in GraphQL; a users+posts query made 4 db calls (1 + N).
 *
 * Version facts checked by web search, not memory:
 *   - Node 22 ships a browser-compatible WebSocket client as a global, on by
 *     default (it was behind a flag in Node 21); client only.
 *   - cluster: round-robin (SCHED_RR) is the default on every platform except
 *     Windows; NODE_CLUSTER_SCHED_POLICY accepts "rr" or "none".
 *   - Socket.IO docs: multiple servers need a non-default adapter (e.g. Redis)
 *     and, when HTTP long-polling is enabled, sticky sessions.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How would you implement real-time communication (e.g., WebSockets) in a Node.js application?",
    seoDescription:
      "Build real-time Node.js features: choose polling, SSE or WebSockets, handle the upgrade, fan out across instances with pub/sub and add heartbeats.",
    description: `**Question presented to candidate:**
"We want a live order-status page and a support chat in our Node.js app. Walk me through how you would build the real-time part: which transport you would pick, what the server code looks like, and what changes once we run more than one instance of the app."

**What a strong answer should cover:**
- Picks the transport from the traffic shape: polling for rare updates, Server-Sent Events for server-to-client only, WebSockets when both sides send at any time. Chat needs WebSockets; order status could use either.
- Explains the WebSocket handshake: an ordinary HTTP request with \`Upgrade: websocket\`, a \`101 Switching Protocols\` reply, and then the same TCP socket carries framed messages both ways. In Node this hangs off the \`http\` server's \`upgrade\` event, which is where \`ws\` and Socket.IO attach.
- Knows the connection set lives in one process's memory, so with two or more instances a message must be fanned out through a shared pub/sub layer (Redis pub/sub, NATS, a Socket.IO adapter), or clients on other instances never see it.
- Covers liveness: heartbeats (ping/pong) to find dead connections, client reconnection with backoff, and resuming missed messages if the product needs that.
- Mentions operational details: load balancers must allow the upgrade and long-lived connections, sticky sessions are needed for Socket.IO long-polling fallback, and per-connection memory sets the cap on connections per instance.

**Clarifying questions expected:**
- "Does the client also need to send messages, or does the server only push updates?"
- "How many concurrent connections do we expect, and how many app instances will run?"
- "Is it acceptable to miss a message while a client is reconnecting, or must we replay it?"

**Code / implementation expected:** Yes. A small WebSocket server attached to \`http\`'s \`upgrade\` event, a broadcast loop, and an explanation of how a shared pub/sub bus fixes cross-instance delivery.`,
    answer: `**Target Audience:** Engineers preparing for Node.js backend and system design interviews who have built REST endpoints but not a live feature.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer expects. Every code sample here was run with Node v22.22.0, using only built-in modules, and the output shown is the output it printed.

## 1. Why This Even Matters — A Story First

Picture a pizza shop where the only way to learn whether your pizza is ready is to walk up to the counter and ask. Ask too rarely and your pizza goes cold; ask every ten seconds and the staff spend their evening answering you. That is **polling**. Now picture the shop handing you a buzzer that vibrates the moment the pizza is ready. That is a **push** channel. And if the buzzer also let you talk back ("extra napkins, please"), it would be a **two-way** channel.

"Real-time" in a web app means building that buzzer. The interesting part of the interview is not the API call that opens a socket; it is choosing the right buzzer, keeping track of who is holding one, and noticing what breaks when the shop opens a second branch.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Who sends: only the server, or both sides? | Server-only push fits SSE; two-way fits WebSockets. |
| How fresh must data be? Seconds, or sub-second? | If a 10-30 second delay is fine, polling is simpler and cache-friendly. |
| How many concurrent connections, and how many instances? | Sets memory per instance and forces the cross-instance fan-out design. |
| Can a client miss messages while offline? | Decides whether you need message IDs and replay, or just "latest state". |
| Which clients: browsers, mobile, other services? | Browsers have a native \`WebSocket\` and \`EventSource\`; corporate proxies sometimes break upgrades. |
| What sits in front of Node (Nginx, a cloud load balancer)? | It must pass the upgrade through and allow long idle connections. |

## 3. Pick the Transport From the Traffic Shape

| Option | Who can send | How it works | Good for | Watch out for |
| :--- | :--- | :--- | :--- | :--- |
| Short polling | Client asks | A normal \`GET\` every N seconds | Dashboards that refresh every 30 s | Wasted requests; delay of up to N |
| Long polling | Client asks, server holds | Server keeps the request open until there is news | Fallback when upgrades are blocked | One request per message; needs sticky routing |
| Server-Sent Events | Server only | One long HTTP response with \`text/event-stream\` | Notifications, order status, live logs | One direction only; text only |
| WebSocket | Both, any time | HTTP request upgraded to a framed, two-way socket | Chat, collaboration, games | Stateful connections; harder to scale and proxy |

📌 **Interview term: full-duplex** — both ends can send at the same time over one connection. WebSockets are full-duplex; SSE is one-way (server to client).

For the support chat in the prompt, the customer types messages too, so WebSockets are the right fit. For the order status page alone, [Server-Sent Events](/interview-question/how-do-you-implement-server-sent-events-sse-in-node-js) would do the job with less machinery.

## 4. What a WebSocket Actually Is

A WebSocket starts life as an ordinary HTTP request. The browser sends \`GET /chat\` with two special headers, \`Upgrade: websocket\` and a random \`Sec-WebSocket-Key\`. If the server agrees, it replies \`101 Switching Protocols\` and proves it understood by sending back \`Sec-WebSocket-Accept\`: the SHA-1 hash of the key plus a fixed GUID, base64-encoded. From then on, **the same TCP socket** stops speaking HTTP and carries small binary **frames** in both directions.

📌 **Interview term: protocol upgrade** — the \`101 Switching Protocols\` response that turns an HTTP connection into a WebSocket connection. Nothing new is opened; the existing socket changes protocol.

📌 **Interview term: frame** — the unit a WebSocket sends: a couple of header bytes (final-fragment flag, an opcode such as text, binary, ping, pong or close, the payload length) and the payload. Frames from a browser to the server are always masked with a 4-byte key; frames from the server are not.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Sequence of a WebSocket handshake: the client sends an HTTP GET with an Upgrade header, the server answers 101 Switching Protocols, then text frames flow in both directions on the same socket">
  <defs>
    <marker id="rt-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="20" width="160" height="44" rx="8"/>
  <text class="d-text" x="120" y="47" text-anchor="middle">Browser</text>
  <rect class="d-box" x="440" y="20" width="160" height="44" rx="8"/>
  <text class="d-text" x="520" y="47" text-anchor="middle">Node server</text>
  <path class="d-edge" d="M 120 64 L 120 290"/>
  <path class="d-edge" d="M 520 64 L 520 290"/>
  <path class="d-edge" d="M 124 100 L 512 100" marker-end="url(#rt-arrow)"/>
  <text class="d-sub" x="320" y="90" text-anchor="middle">GET /chat with Upgrade: websocket</text>
  <path class="d-edge" d="M 516 150 L 128 150" marker-end="url(#rt-arrow)"/>
  <text class="d-sub" x="320" y="140" text-anchor="middle">101 Switching Protocols</text>
  <path class="d-edge-accent" d="M 516 200 L 128 200" marker-end="url(#rt-arrow)"/>
  <text class="d-text d-accent" x="320" y="190" text-anchor="middle">text frame: welcome</text>
  <path class="d-edge-accent" d="M 124 250 L 512 250" marker-end="url(#rt-arrow)"/>
  <text class="d-text d-accent" x="320" y="240" text-anchor="middle">text frame: hi (masked)</text>
</svg>

The first two arrows are HTTP. After the \`101\`, the same socket carries frames, and the server can send first without being asked.

In Node, the \`http.Server\` emits an \`upgrade\` event for any request carrying an \`Upgrade\` header. That event hands you the raw \`net.Socket\`, and every WebSocket library (\`ws\`, Socket.IO, uWebSockets.js) does its work from there. To make that concrete, the example below implements the handshake and short text frames by hand. It is about 40 lines, which shows there is no magic, and also why you should not ship a hand-rolled version (it skips fragmentation, long payloads, close codes and UTF-8 checks).

## 5. Working Example: Two Instances, With and Without a Shared Bus

The script starts two app instances, **A** and **B**, on different ports, as you would have behind a load balancer. Alice connects to A, Bob connects to B, both using the \`WebSocket\` client that is a global in Node 22 (no package). Alice sends "hi from alice". The script runs the scenario twice: once where each instance only broadcasts to its own sockets, and once where both instances publish to a shared bus. The bus here is an in-process \`EventEmitter\` standing in for Redis pub/sub so the demo runs anywhere; the shape of the code is the same with Redis.

~~~js
server.on("upgrade", (req, socket) => {
  const accept = crypto.createHash("sha1").update(req.headers["sec-websocket-key"] + GUID).digest("base64");
  socket.write("HTTP/1.1 101 Switching Protocols\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\n" +
               \`Sec-WebSocket-Accept: \${accept}\\r\\n\\r\\n\`);
  sockets.add(socket);
  socket.write(frame(\`welcome from \${name}\`)); // server speaks first
  socket.on("data", (buf) => {
    const msg = unmask(buf);
    if (bus) bus.emit("chat", msg);                       // fan out to every instance
    else for (const s of sockets) s.write(frame(msg));    // local clients only
  });
});
if (bus) bus.on("chat", (msg) => { for (const s of sockets) s.write(frame(msg)); });
~~~

The full script is the first example below.

## 6. Verified: Running the Code

~~~text
global WebSocket client: function
--- two instances, no shared bus
alice@A got: welcome from A
alice@A got: hi from alice
bob@B got: welcome from B
--- two instances, shared pub/sub bus
alice@A got: welcome from A
alice@A got: hi from alice
bob@B got: welcome from B
bob@B got: hi from alice
~~~

What this shows, line by line:

- \`typeof WebSocket\` is \`function\`: Node 22 ships a browser-compatible WebSocket **client** as a global. It is a client only; you still need \`ws\` or similar for the server side.
- Each client received a \`welcome\` it never asked for. That is the server pushing first, which plain request/response HTTP cannot do.
- **Without the bus, Bob never got Alice's message.** Instance A broadcast to every socket it holds, but Bob's socket lives in instance B's memory. Nothing failed and nothing was logged; the message was simply never delivered. This is the bug teams hit the day they scale from one instance to two.
- **With the bus, Bob got it.** A published the message; both instances were subscribed and wrote it to their own local sockets.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Fan-out across instances: Alice is connected to instance A and Bob to instance B; A publishes the chat message to a shared pub sub bus, and both instances receive it and write it to their own sockets">
  <defs>
    <marker id="rt-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="24" width="150" height="44" rx="8"/>
  <text class="d-text" x="115" y="51" text-anchor="middle">Alice</text>
  <rect class="d-box-muted" x="450" y="24" width="150" height="44" rx="8"/>
  <text class="d-text" x="525" y="51" text-anchor="middle">Bob</text>
  <rect class="d-box" x="40" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="115" y="140" text-anchor="middle">Instance A</text>
  <rect class="d-box" x="450" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="525" y="140" text-anchor="middle">Instance B</text>
  <rect class="d-box-accent" x="220" y="196" width="200" height="50" rx="8"/>
  <text class="d-text d-accent" x="320" y="220" text-anchor="middle">Pub/sub bus</text>
  <text class="d-sub" x="320" y="238" text-anchor="middle">Redis, NATS, ...</text>
  <path class="d-edge" d="M 115 68 L 115 104" marker-end="url(#rt-arrow2)"/>
  <path class="d-edge" d="M 525 104 L 525 72" marker-end="url(#rt-arrow2)"/>
  <path class="d-edge-accent" d="M 150 160 L 236 196" marker-end="url(#rt-arrow2)"/>
  <path class="d-edge-accent" d="M 404 196 L 490 164" marker-end="url(#rt-arrow2)"/>
</svg>

Every instance subscribes to the bus and writes to the sockets it holds, so it no longer matters which instance a client happens to be connected to.

📌 **Interview term: fan-out** — delivering one message to many recipients. Across instances it needs a shared broker; within one instance it is a loop over the open sockets.

📌 **Interview term: adapter (Socket.IO)** — the pluggable layer Socket.IO uses for that fan-out. The default adapter is in-memory; the Socket.IO docs say you must replace it (for example with the Redis adapter) when you run more than one server ([Socket.IO adapter docs](https://socket.io/docs/v4/adapter/)).

## 7. Keeping Connections Honest: Heartbeats

A WebSocket can die without a goodbye: a phone loses signal, a laptop lid closes, a NAT box forgets the mapping. TCP will not tell you for a long time. So servers send a **ping** frame on a timer and expect a **pong** back; a connection that misses a pong is closed and its memory freed. The browser and Node's built-in client answer pings automatically.

The second example pings every 100 ms, then after three heartbeats pretends the client vanished by ignoring its pongs:

~~~text
server: pong 1 received
server: pong 2 received
server: pong 3 received
server: simulating a dead client, pongs now ignored
server: no pong since last ping -> terminating socket
client: close event, wasClean = false
server: socket closed
~~~

The first three pings got pongs. Once pongs stopped arriving, the very next tick found \`alive\` still \`false\`, destroyed the socket, and the client saw a close with \`wasClean = false\` because no close frame was exchanged. Real servers use 15 to 30 seconds rather than 100 ms; the logic is identical, and it is the same pattern the \`ws\` README recommends.

📌 **Interview term: heartbeat** — a periodic ping/pong used to detect dead connections. The client side of the same idea is **reconnect with exponential backoff**, so a server restart does not cause every client to reconnect in the same second.

## 8. The Production Checklist

- **Library choice.** \`ws\` is a small, fast, spec-only server; you build rooms, auth and reconnect yourself. Socket.IO adds rooms, acknowledgements, automatic reconnection and a long-polling fallback, at the cost of its own protocol: a plain WebSocket client cannot talk to a Socket.IO server. The [ws deep-dive](/interview-question/how-do-you-implement-real-time-communication-with-websockets-ws-in-node-js) covers the \`ws\` API itself.
- **Authenticate during the upgrade.** Check the session cookie or a token in the \`upgrade\` handler and destroy the socket on failure, before any frames flow. Also check the \`Origin\` header, since browsers do not apply CORS to WebSockets.
- **Load balancers.** Nginx needs \`proxy_set_header Upgrade\` and \`Connection "upgrade"\` plus a long \`proxy_read_timeout\`; cloud balancers have an idle timeout that your heartbeat interval must beat.
- **Sticky sessions.** Plain WebSockets do not need them (one connection, one instance). Socket.IO with long-polling does, because one session is many HTTP requests that must reach the same process ([Socket.IO: using multiple nodes](https://socket.io/docs/v4/using-multiple-nodes)).
- **Backpressure.** \`socket.write()\` returns \`false\` when the kernel buffer is full. A slow client in a busy room can grow your memory without bound; check \`bufferedAmount\` (client) or the write return value (server) and drop or disconnect laggards. See [backpressure in streams](/interview-question/what-is-backpressure-in-node-js-streams-and-how-do-you-handle-it).
- **Missed messages.** Pub/sub is fire-and-forget: a client that is reconnecting misses what was published meanwhile. If that matters, give messages IDs, persist them (a database or Redis Streams), and let the client ask for "everything after ID 1234" on reconnect.
- **Graceful shutdown.** On deploy, send a close frame with code 1001 ("going away") so clients reconnect to another instance; see [graceful shutdown](/interview-question/how-do-you-handle-graceful-shutdown-in-a-node-js-application).

## 9. Common Pitfalls

- **Broadcasting from an in-memory \`Set\` after scaling out.** As the run above showed, clients on other instances silently miss messages. Add the pub/sub bus before the second instance goes live.
- **No heartbeat.** Dead sockets pile up, each holding buffers and listeners, and memory creeps up until the process restarts. Ping on a timer and terminate on a missed pong.
- **Trusting the first message for auth.** Accepting the upgrade and then waiting for a "login" frame lets anyone hold open sockets for free. Authenticate in the \`upgrade\` handler.
- **Using WebSockets for one-way updates.** If only the server talks, SSE gives you automatic reconnection and \`Last-Event-ID\` replay in the browser for free, over plain HTTP.
- **Sending unbounded data to slow clients.** Ignoring \`write()\` returning \`false\` turns one slow mobile client into a memory leak on the server.
- **Doing CPU-heavy work per message on the event loop.** One expensive JSON transform per broadcast, times 10,000 sockets, blocks every other connection. Precompute the payload once and write the same \`Buffer\` to each socket.

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Pick by traffic shape:</strong> <span style="color:#f0e2c8;">"If only the server pushes, I use SSE; if both sides send at any time, like chat, I use WebSockets; if a 30-second delay is fine, plain polling."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Explain the mechanism:</strong> <span style="color:#f0e2c8;">"A WebSocket is an HTTP request with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">Upgrade: websocket</code>; the server replies <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">101 Switching Protocols</code> and the same TCP socket then carries frames both ways. In Node that is the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">http</code> server's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">upgrade</code> event, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">ws</code> or Socket.IO handle for me."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Show the server code:</strong> <span style="color:#f0e2c8;">"On connection I add the socket to a set, possibly keyed by room; on message I validate it and broadcast to the room; on close I remove it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Scale it:</strong> <span style="color:#f0e2c8;">"Connections live in one process, so with several instances I fan out through Redis pub/sub or the Socket.IO Redis adapter. Without it, clients on other instances silently miss messages, which I have reproduced."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keep it healthy:</strong> <span style="color:#f0e2c8;">"Heartbeats to drop dead sockets, reconnect with backoff on the client, auth in the upgrade handler, and message IDs with replay if missing a message is not acceptable."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use HTTP long polling everywhere?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works through any proxy, which is why Socket.IO keeps it as a fallback, but each message costs a full HTTP request with headers, there is a gap between one response and the next request where messages must be buffered, and a session is spread over many requests, so a load balancer must route them all to the same instance (<strong style="color:#ffca28;">sticky sessions</strong>). A WebSocket pays the HTTP cost once and then sends frames with only a few bytes of overhead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many WebSocket connections can one Node process hold?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The limit is usually memory and file descriptors, not the event loop: an idle socket costs little CPU. Each connection holds kernel buffers, a JavaScript object graph and any per-user state, so measure it under load for your app (heap per 1,000 connections) and raise the OS <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">ulimit -n</code>. The CPU limit appears when you broadcast: one message to 50,000 sockets is 50,000 writes, so serialise the payload once and reuse the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">Buffer</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The load balancer round-robins requests. Do WebSockets need sticky sessions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plain WebSockets do not: once upgraded, the connection is one long TCP stream pinned to the instance that accepted it. <strong style="color:#ffca28;">Sticky sessions</strong> matter for Socket.IO when HTTP long-polling is enabled, because that session is many separate requests that must reach the same process. What all setups need is cross-instance fan-out, which is a separate problem from routing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you authenticate a WebSocket connection?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">upgrade</code> handler, before calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">handleUpgrade</code> (with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">ws</code>) or writing the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">101</code>: read the session cookie or a short-lived token from the query string, verify it, and on failure write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">HTTP/1.1 401 Unauthorized</code> and destroy the socket. Also check the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">Origin</code> header, because a browser can attach cookies to a WebSocket request started by another site and CORS does not apply. Re-check authorisation per message for actions like joining a room.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">A user reconnects after 20 seconds offline. How do they get what they missed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pub/sub alone cannot help, because it does not store anything. Give every message a sequence ID and persist it (a table, or Redis Streams with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">XADD</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">XRANGE</code>). The client remembers the last ID it saw and sends it on reconnect; the server replays everything after it, then switches to live messages. SSE has this idea built in as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">Last-Event-ID</code>.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Polling / long polling** | The client repeatedly asks for news; in long polling the server holds each request open until there is some |
| **Server-Sent Events (SSE)** | A one-way stream of text events from server to browser over one HTTP response |
| **Full-duplex** | Both ends can send at any time over the same connection |
| **Protocol upgrade** | The \`101 Switching Protocols\` reply that turns an HTTP connection into a WebSocket |
| **Frame** | One WebSocket message unit: opcode, length, (mask), payload |
| **Fan-out** | Delivering one message to many recipients, across instances via a broker |
| **Adapter** | Socket.IO plug-in that routes broadcasts between servers (in-memory by default) |
| **Heartbeat** | Periodic ping/pong used to find and close dead connections |
| **Sticky session** | Load balancer rule that sends a client back to the same instance every time |

---
**Conclusion:** Implementing real-time features in Node.js starts with choosing the transport from who needs to send what: polling for slow data, SSE for server-only push, WebSockets for two-way traffic like chat. A WebSocket is an HTTP request upgraded on the same socket, and in Node every library builds on the \`http\` server's \`upgrade\` event, as the hand-written handshake above showed. The hard parts are the ones that appear in production: the run above showed a second instance silently dropping messages until a shared pub/sub bus was added, and a dead client being detected only because a heartbeat was in place. Add authentication in the upgrade handler, backpressure checks and, if needed, message replay, and you have a design that holds up in an interview and in production.
`,
    examples: [
      {
        label: "WebSocket handshake and frames on node:http, two instances with and without a shared pub/sub bus (Node 22 global WebSocket client)",
        tech: "javascript",
        runnable: false,
        code: `// Minimal WebSocket server on node:http (no packages) + Node 22's global WebSocket client.
const http = require("node:http");
const crypto = require("node:crypto");
const { EventEmitter } = require("node:events");

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"; // fixed by RFC 6455

function frame(text) {                       // server -> client: FIN + text opcode, unmasked
  const payload = Buffer.from(text);
  if (payload.length > 125) throw new Error("demo only handles short frames");
  return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
}
function unmask(buf) {                       // client -> server frames are always masked
  const len = buf[1] & 0x7f, mask = buf.subarray(2, 6), data = buf.subarray(6, 6 + len);
  return Buffer.from(data.map((b, i) => b ^ mask[i % 4])).toString();
}

function startInstance(name, bus) {
  const sockets = new Set();
  const server = http.createServer((req, res) => res.end("plain HTTP still works\\n"));
  server.on("upgrade", (req, socket) => {
    const accept = crypto.createHash("sha1").update(req.headers["sec-websocket-key"] + GUID).digest("base64");
    socket.write("HTTP/1.1 101 Switching Protocols\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\n" +
                 \`Sec-WebSocket-Accept: \${accept}\\r\\n\\r\\n\`);
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.write(frame(\`welcome from \${name}\`)); // server speaks first: no request needed
    socket.on("data", (buf) => {
      const opcode = buf[0] & 0x0f;
      if (opcode === 0x8) return socket.end();  // close frame
      if (opcode !== 0x1) return;               // ignore pong etc. in this demo
      const msg = unmask(buf);
      if (bus) bus.emit("chat", msg);           // fan out to every instance
      else for (const s of sockets) s.write(frame(msg)); // local clients only
    });
  });
  if (bus) bus.on("chat", (msg) => { for (const s of sockets) s.write(frame(msg)); });
  return new Promise((r) => server.listen(0, () => r({ server, port: server.address().port, sockets })));
}

function client(label, port, log) {
  return new Promise((resolve) => {
    const ws = new WebSocket(\`ws://localhost:\${port}\`);
    ws.onmessage = (e) => log.push(\`\${label} got: \${e.data}\`);
    ws.onopen = () => setTimeout(() => resolve(ws), 30);
  });
}

async function scenario(title, bus) {
  const log = [];
  const a = await startInstance("A", bus), b = await startInstance("B", bus);
  const alice = await client("alice@A", a.port, log);
  const bob = await client("bob@B", b.port, log);
  alice.send("hi from alice");
  await new Promise((r) => setTimeout(r, 100));
  console.log(\`--- \${title}\`);
  const who = (l) => l.split(" ")[0];
  for (const line of log.sort((x, y) => who(x).localeCompare(who(y)))) console.log(line);
  alice.close(); bob.close();
  for (const s of [...a.sockets, ...b.sockets]) s.destroy();
  a.server.close(); b.server.close();
}

(async () => {
  console.log("global WebSocket client:", typeof WebSocket);
  await scenario("two instances, no shared bus", null);
  await scenario("two instances, shared pub/sub bus", new EventEmitter());
})();`,
      },
      {
        label: "Heartbeat: ping on a timer, terminate the socket when a pong is missed",
        tech: "javascript",
        runnable: false,
        code: `// Heartbeat: the server pings, the client (Node 22 global WebSocket) answers with a pong by itself.
const http = require("node:http");
const crypto = require("node:crypto");
const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

const server = http.createServer();
server.on("upgrade", (req, socket) => {
  const accept = crypto.createHash("sha1").update(req.headers["sec-websocket-key"] + GUID).digest("base64");
  socket.write(\`HTTP/1.1 101 Switching Protocols\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Accept: \${accept}\\r\\n\\r\\n\`);
  let alive = true, beats = 0;
  socket.on("data", (buf) => {
    if ((buf[0] & 0x0f) === 0xa) {                  // pong
      alive = true;
      console.log(\`server: pong \${++beats} received\`);
    }
  });
  const timer = setInterval(() => {
    if (!alive) { console.log("server: no pong since last ping -> terminating socket"); clearInterval(timer); return socket.destroy(); }
    alive = false;
    socket.write(Buffer.from([0x89, 0]));           // ping frame, empty payload
  }, 100);
  socket.on("close", () => { clearInterval(timer); console.log("server: socket closed"); server.close(); });
  // after 3 heartbeats, simulate a client that silently vanished (stop reading its pongs)
  setTimeout(() => { socket.removeAllListeners("data"); console.log("server: simulating a dead client, pongs now ignored"); }, 350);
});
server.listen(0, () => {
  const ws = new WebSocket(\`ws://localhost:\${server.address().port}\`);
  ws.onclose = (e) => console.log("client: close event, wasClean =", e.wasClean);
});`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between the net and dgram modules in Node.js?",
    seoDescription:
      "net is TCP: a reliable, ordered byte stream that needs framing. dgram is UDP: separate datagrams with no delivery guarantee. Shown with real runs.",
    description: `**Question presented to candidate:**
"Node has two low-level networking modules, \`net\` and \`dgram\`. If I write three messages with each of them, what does the receiving side actually see, and how would you decide which one a new service should use?"

**What a strong answer should cover:**
- \`net\` is TCP (plus local IPC over Unix domain sockets or Windows named pipes): connection-oriented, reliable, ordered, with flow control. A \`net.Socket\` is a Duplex stream with \`connect\`, \`data\`, \`end\` and \`close\`.
- \`dgram\` is UDP: connectionless datagrams with no delivery, ordering or duplicate guarantees. A \`dgram.Socket\` is an EventEmitter, not a stream; every \`message\` event is one whole datagram plus \`rinfo\` (sender address and port).
- The key practical difference: TCP is a byte stream with no message boundaries, so three writes can arrive as one chunk and the protocol must add framing (delimiters or length prefixes). UDP keeps boundaries but each datagram is capped (65,507 bytes of payload over IPv4) and should stay under the path MTU to avoid fragmentation.
- Error behaviour differs: TCP to a closed port fails with \`ECONNREFUSED\`; a UDP send to a closed port usually "succeeds" because nothing confirms delivery.
- Use cases: TCP for anything that must arrive intact (HTTP, databases, custom RPC); UDP for DNS, metrics such as StatsD, discovery/multicast, games and media where a late packet is worse than a lost one. QUIC/HTTP/3 shows reliability can be rebuilt on UDP in user space.

**Clarifying questions expected:**
- "Can the application tolerate lost or reordered messages, or must every one arrive?"
- "Is this traffic local to the machine (IPC) or across a network?"

**Code / implementation expected:** Optional but strong: a short script that sends the same messages over both and shows TCP merging them into one chunk while UDP delivers separate datagrams, plus a framing fix for TCP.`,
    answer: `**Target Audience:** Backend engineers preparing for Node.js interviews that go below HTTP into sockets and protocols.
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every behaviour claimed below (chunk merging, error codes, size limits) comes from scripts that were run with Node v22.22.0 on Linux; the exact output is quoted.

## 1. Why This Even Matters — A Story First

Imagine sending a friend three short notes. With the first service, you book a phone call: you dial, they pick up, and everything you say arrives in order. But you are not sending notes any more, you are talking in one continuous stream, and if you say "one two three" quickly, your friend just hears "onetwothree". It is up to the two of you to agree where one note ends. That is **TCP**, and in Node it is the \`net\` module.

With the second service, you drop three postcards in a mailbox. No call, no pickup. Each postcard arrives as its own separate card, but the post office promises nothing: one might be late, arrive twice, or never arrive, and you are not told. That is **UDP**, and in Node it is the \`dgram\` module.

Almost every interview mistake on this topic comes from forgetting the phone-call half of the story: people assume one \`write()\` on TCP equals one \`data\` event on the other side. The scripts below show it does not.

## 2. The Core Distinction

📌 **Interview term: connection-oriented vs connectionless** — TCP sets up a connection with a handshake before data flows and tears it down afterwards; UDP just sends each packet to an address with no setup.

📌 **Interview term: byte stream vs datagram** — TCP delivers an ordered sequence of bytes with no built-in message boundaries. UDP delivers individual messages (datagrams) whose boundaries are kept, but delivery and ordering are not guaranteed.

| | \`net\` (TCP / IPC) | \`dgram\` (UDP) |
| :--- | :--- | :--- |
| Setup | \`net.createServer()\` / \`net.connect()\`; handshake first | \`dgram.createSocket("udp4" or "udp6")\`, then \`bind()\` / \`send()\` |
| Node object | \`net.Socket\`, a **Duplex stream** | \`dgram.Socket\`, an **EventEmitter** (not a stream) |
| Receive event | \`data\` with an arbitrary slice of the byte stream | \`message\` with one whole datagram + \`rinfo\` |
| Delivery | Reliable, ordered, retransmitted, no duplicates | Best effort: may be lost, reordered or duplicated |
| Message boundaries | **None**: you must frame | **Kept**: one send = one message |
| Flow and congestion control | Yes, built into TCP | None; you can flood the receiver or the network |
| Size per message | Unlimited stream | 65,507 bytes payload max over IPv4; aim for well under the MTU |
| Peers | One connection = exactly two endpoints | One socket can talk to many peers; supports broadcast and multicast |
| Local IPC | Unix domain sockets / Windows named pipes via a path | Not used for IPC |
| Typical uses | HTTP, databases, Redis, custom RPC | DNS, StatsD metrics, service discovery, games, voice/video |

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="Three writes over TCP arrive as one merged chunk on the receiver, while three UDP sends arrive as three separate datagrams">
  <text class="d-text" x="160" y="26" text-anchor="middle">net (TCP): byte stream</text>
  <text class="d-text" x="480" y="26" text-anchor="middle">dgram (UDP): datagrams</text>
  <rect class="d-box-muted" x="30" y="50" width="70" height="36" rx="6"/>
  <text class="d-sub" x="65" y="73" text-anchor="middle">one</text>
  <rect class="d-box-muted" x="125" y="50" width="70" height="36" rx="6"/>
  <text class="d-sub" x="160" y="73" text-anchor="middle">two</text>
  <rect class="d-box-muted" x="220" y="50" width="70" height="36" rx="6"/>
  <text class="d-sub" x="255" y="73" text-anchor="middle">three</text>
  <rect class="d-box-accent" x="50" y="170" width="220" height="44" rx="8"/>
  <text class="d-text d-accent" x="160" y="197" text-anchor="middle">1 data event: onetwothree</text>
  <path class="d-edge" d="M 160 96 L 160 162"/>
  <text class="d-sub" x="170" y="135" text-anchor="start">merged</text>
  <rect class="d-box-muted" x="350" y="50" width="70" height="36" rx="6"/>
  <text class="d-sub" x="385" y="73" text-anchor="middle">one</text>
  <rect class="d-box-muted" x="445" y="50" width="70" height="36" rx="6"/>
  <text class="d-sub" x="480" y="73" text-anchor="middle">two</text>
  <rect class="d-box-muted" x="540" y="50" width="70" height="36" rx="6"/>
  <text class="d-sub" x="575" y="73" text-anchor="middle">three</text>
  <rect class="d-box-accent" x="350" y="170" width="70" height="44" rx="6"/>
  <text class="d-sub" x="385" y="197" text-anchor="middle">msg 1</text>
  <rect class="d-box-accent" x="445" y="170" width="70" height="44" rx="6"/>
  <text class="d-sub" x="480" y="197" text-anchor="middle">msg 2</text>
  <rect class="d-box-accent" x="540" y="170" width="70" height="44" rx="6"/>
  <text class="d-sub" x="575" y="197" text-anchor="middle">msg 3</text>
  <path class="d-edge" d="M 385 96 L 385 162"/>
  <path class="d-edge" d="M 480 96 L 480 162"/>
  <path class="d-edge" d="M 575 96 L 575 162"/>
</svg>

Left: the receiver got all three writes glued together in one \`data\` event. Right: each UDP send arrived as its own \`message\` event. Both results are from the run in section 4.

## 3. The Two APIs Side by Side

~~~js
// TCP: a connection, then a stream of bytes
const server = net.createServer((sock) => sock.on("data", (chunk) => { /* any slice of the stream */ }));
server.listen(4000);
const c = net.connect(4000, () => c.write("one"));

// UDP: no connection, just addressed messages
const s = dgram.createSocket("udp4");
s.on("message", (msg, rinfo) => { /* one whole datagram from rinfo.address:rinfo.port */ });
s.bind(4001);
dgram.createSocket("udp4").send("one", 4001, "127.0.0.1");
~~~

Two things stand out. The TCP server callback runs once **per connection** and gives you a socket for that one peer; the UDP socket has no per-peer object at all, so you reply by sending to \`rinfo.address\` and \`rinfo.port\`. And \`net.Socket\` plugs into the stream world (\`pipe\`, \`pipeline\`, backpressure via the \`write()\` return value), while a \`dgram.Socket\` does not.

## 4. Verified: Running the Code

The first example sends \`"one"\`, \`"two"\`, \`"three"\` over each module, then tries both against a port nobody is listening on, then sends an oversized datagram:

~~~text
TCP  'data' events: 1 ["onetwothree"]
UDP  'message' events: 3 ["one <- 127.0.0.1","two <- 127.0.0.1","three <- 127.0.0.1"]
TCP  to closed port: ECONNREFUSED
UDP  to closed port: send callback err = null
UDP  70000-byte datagram: EMSGSIZE
~~~

- **TCP merged the three writes into one chunk.** Five out of five runs on this machine gave \`1 ["onetwothree"]\`. This is not a bug and not guaranteed either: TCP may deliver the same bytes as one, two or three chunks depending on timing and buffer sizes. The only promise is the order of the bytes.
- **UDP kept the three messages apart**, and each came with \`rinfo\` telling the receiver who sent it.
- **TCP to a closed port failed loudly** with \`ECONNREFUSED\`, because the handshake was rejected.
- **UDP to the same closed port reported nothing.** The send callback's \`err\` was \`null\`: the datagram left this socket, and that is all a UDP send can tell you.
- **A 70,000-byte datagram failed with \`EMSGSIZE\`.** UDP cannot carry it in one message.

The second example pins down the size limit and shows a less-known feature, the connected UDP socket:

~~~text
net.Socket is a Duplex stream: true
dgram.Socket is a stream: false | is an EventEmitter: true
IPv4 datagram of 65507 bytes: sent
IPv4 datagram of 65508 bytes: EMSGSIZE
1st send to closed port: no error
connected UDP socket error event: ECONNREFUSED
2nd send to closed port: no error
~~~

- 65,507 bytes is the largest IPv4 UDP payload (65,535 minus the 8-byte UDP header and 20-byte IP header); one byte more is rejected. In practice you keep datagrams far smaller, roughly under 1,200-1,400 bytes, so they are not fragmented on the way, because losing any fragment loses the whole datagram.
- After \`socket.connect(port)\`, a UDP socket only talks to that one peer. The first send still returned no error, but the kernel then received an ICMP "port unreachable" and Node emitted an \`error\` event with \`ECONNREFUSED\`. Without \`connect()\`, that signal has nowhere to go. It is still a hint, not a delivery guarantee: a firewall can drop the ICMP message.

📌 **Interview term: rinfo** — the "remote info" object (\`address\`, \`family\`, \`port\`, \`size\`) passed with every UDP \`message\` event; it is the only way to know whom to reply to.

## 5. Fixing TCP: Message Framing

Because TCP has no boundaries, every protocol built on it defines its own. HTTP/1.1 uses headers plus \`Content-Length\` or chunked encoding; Redis uses \`\\r\\n\`-terminated lines; many binary protocols prefix each message with its length.

📌 **Interview term: framing** — the rule that tells the receiver where one message ends and the next begins in a byte stream. Common choices are a **delimiter** (a newline) or a **length prefix** (a 4-byte integer before each message).

The third example sends \`"one\\ntw"\` and then \`"o\\nthree\\n"\`, splitting the second message across two writes on purpose. A small newline framer buffers the partial tail:

~~~js
function lineFramer(onMessage) {
  let buffered = "";
  return (chunk) => {
    buffered += chunk;
    let nl;
    while ((nl = buffered.indexOf("\\n")) !== -1) {
      onMessage(buffered.slice(0, nl));
      buffered = buffered.slice(nl + 1);   // keep the partial tail for the next chunk
    }
  };
}
~~~

~~~text
message: "one"
message: "two"
message: "three"
data chunks received: 2
~~~

Two chunks in, three clean messages out, including \`"two"\`, which was split between them. With binary data, use \`Buffer\` concatenation and a length prefix instead of strings, and set \`socket.setEncoding("utf8")\` only for text so a multi-byte character split across chunks is decoded correctly, as the example does.

## 6. Choosing Between Them

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="Decision: if every message must arrive in order use net over TCP and add framing; if a late message is worse than a lost one use dgram over UDP and add your own sequence numbers if needed">
  <defs>
    <marker id="nd-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="170" y="20" width="300" height="50" rx="8"/>
  <text class="d-text" x="320" y="50" text-anchor="middle">Must every message arrive?</text>
  <rect class="d-box-accent" x="30" y="140" width="250" height="64" rx="8"/>
  <text class="d-text d-accent" x="155" y="166" text-anchor="middle">Yes: net (TCP)</text>
  <text class="d-sub" x="155" y="188" text-anchor="middle">add framing</text>
  <rect class="d-box-muted" x="360" y="140" width="250" height="64" rx="8"/>
  <text class="d-text" x="485" y="166" text-anchor="middle">Late is worse: dgram (UDP)</text>
  <text class="d-sub" x="485" y="188" text-anchor="middle">add sequence numbers if needed</text>
  <path class="d-edge" d="M 260 70 L 170 134" marker-end="url(#nd-arrow)"/>
  <path class="d-edge" d="M 380 70 L 470 134" marker-end="url(#nd-arrow)"/>
</svg>

Most services land on the left: if the data matters, TCP gives you retransmission, ordering and flow control for free. UDP wins when freshness beats completeness (a game position from 200 ms ago is useless, so retransmitting it is wasted effort), when you want one-to-many delivery via broadcast or multicast, or when a single tiny request/response such as a DNS lookup or a StatsD metric does not justify a handshake.

Choosing UDP does not mean giving up on reliability entirely; it means building only the reliability you need yourself. QUIC, the transport under HTTP/3, does exactly that: it runs over UDP and adds its own ordering, retransmission and encryption in user space.

## 7. Common Pitfalls

- **Treating one TCP \`data\` event as one message.** The run above merged three writes into one chunk. Always frame, and test with deliberately split writes as in section 5.
- **Assuming a UDP send that "succeeded" was delivered.** The callback with \`err = null\` above went to a closed port. If you need confirmation, the application must send acknowledgements.
- **Large UDP payloads.** Anything over 65,507 bytes fails with \`EMSGSIZE\`, and anything over the path MTU is fragmented, multiplying the chance of loss. Keep datagrams small.
- **Forgetting UDP has no flow control.** A fast sender can overflow the receiver's socket buffer and packets are silently dropped. Rate-limit senders, or raise the buffer with the \`recvBufferSize\` option of \`dgram.createSocket()\`.
- **Not handling \`error\` on either socket.** An unhandled \`error\` event on a \`net.Socket\` or \`dgram.Socket\` crashes the process; the connected UDP run above produced an asynchronous \`ECONNREFUSED\` event long after the send returned.
- **Expecting \`dgram\` to work with \`pipe()\`/\`pipeline()\`.** It is not a stream (confirmed: \`instanceof Duplex\` is \`false\`). Wrap it yourself if you need stream semantics.

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State the core split:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">net</code> is TCP and local IPC: connection-based, reliable, ordered. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">dgram</code> is UDP: connectionless datagrams with no delivery or ordering guarantees."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the practical consequence:</strong> <span style="color:#f0e2c8;">"TCP is a byte stream with no message boundaries, so the protocol must frame messages. I have seen three writes arrive as a single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">data</code> chunk, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">onetwothree</code>. UDP keeps each message separate."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Contrast the APIs:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">net.Socket</code> is a Duplex stream with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">connect</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">data</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">end</code>; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">dgram.Socket</code> is an EventEmitter that emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">message</code> with the payload and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">rinfo</code>, and you reply to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">rinfo.address</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">rinfo.port</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mention errors and limits:</strong> <span style="color:#f0e2c8;">"TCP to a closed port gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">ECONNREFUSED</code>; a UDP send there reports no error. UDP payloads are capped at 65,507 bytes over IPv4 and should stay under the MTU."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Pick by use case:</strong> <span style="color:#f0e2c8;">"TCP for anything that must arrive intact, like HTTP, databases and RPC. UDP for DNS, metrics, discovery and real-time media or games, where a late packet is worse than a lost one."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you send structured messages over a raw <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">net</code> socket?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add framing. For text, newline-delimited JSON is simple: buffer incoming chunks, split on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">\\n</code>, keep the trailing partial piece for the next chunk. For binary, write a 4-byte length (for example with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">buf.writeUInt32BE</code>) before each payload, and on the receiver wait until at least 4 bytes plus that length have arrived. Test it with writes split mid-message, because merged and split chunks are both normal.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is DNS usually over UDP, and when does it switch to TCP?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A typical lookup is one small question and one small answer, so a TCP handshake would add a full round trip for nothing; if the reply is lost the client simply retries. When a response is too large for a UDP message (the server sets the truncated flag), or for zone transfers, DNS falls back to TCP on the same port 53.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">socket.connect()</code> do on a UDP socket if UDP has no connections?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It does not handshake. It tells the kernel to remember one default peer, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">send()</code> no longer needs an address and datagrams from other peers are filtered out. The useful side effect, which I verified, is error reporting: when the peer port is closed, the ICMP "port unreachable" reply is delivered back as an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">error</code> event with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">ECONNREFUSED</code>. An unconnected socket never sees that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">net</code> be used without any network at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Pass a file path instead of a port to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">server.listen()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">net.connect()</code> and you get a Unix domain socket on Linux and macOS, or a named pipe on Windows, where the path uses the special pipe prefix. It is the same stream API with lower overhead than loopback TCP, and it is how many local daemons, such as Docker, expose their APIs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If UDP is unreliable, why does HTTP/3 use it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the reliability lives in QUIC instead of the kernel. Building on UDP lets QUIC ship in user space and evolve quickly, combine the transport and TLS handshakes, and keep a separate ordered stream per request, so one lost packet only stalls its own stream instead of every request on the connection, which is head-of-line blocking that TCP cannot avoid.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **TCP** | Connection-oriented transport: reliable, ordered byte stream (Node \`net\`) |
| **UDP** | Connectionless transport: independent datagrams, best effort (Node \`dgram\`) |
| **Byte stream** | Data with order but no message boundaries |
| **Datagram** | One self-contained UDP message with its boundary kept |
| **Framing** | The rule that marks where each message ends in a byte stream |
| **rinfo** | Sender address, port, family and size passed with each UDP message |
| **Connected UDP socket** | A UDP socket fixed to one peer, which can receive ICMP-based errors |
| **MTU** | Largest packet a network link carries without fragmenting it |
| **IPC** | Inter-process communication on one machine; \`net\` does it over Unix sockets or named pipes |

---
**Conclusion:** The \`net\` module gives you TCP and local IPC: a connection, a reliable ordered byte stream, and a Duplex stream object that fits the rest of Node's stream tooling. The \`dgram\` module gives you UDP: no connection, independent datagrams, and an EventEmitter that hands you each message with its sender. The runs above make the difference concrete: three TCP writes arrived as one \`onetwothree\` chunk and needed a framer, three UDP sends arrived as three messages, a TCP connect to a closed port failed with \`ECONNREFUSED\` while a UDP send there reported nothing, and a datagram over 65,507 bytes was rejected. Choose TCP when every byte must arrive in order, choose UDP when freshness, one-to-many delivery or tiny request/response exchanges matter more, and in both cases add what the transport leaves out: framing for TCP, acknowledgements or sequence numbers for UDP.
`,
    examples: [
      {
        label: "Same three messages over net (TCP) and dgram (UDP), a closed port, and an oversized datagram",
        tech: "javascript",
        runnable: false,
        code: `// net (TCP, a byte stream) vs dgram (UDP, separate datagrams), same three sends.
const net = require("node:net");
const dgram = require("node:dgram");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function tcp() {
  const chunks = [];
  const server = net.createServer((sock) => sock.on("data", (d) => chunks.push(d.toString())));
  await new Promise((r) => server.listen(0, r));
  const c = net.connect(server.address().port);
  await new Promise((r) => c.on("connect", r));
  c.write("one"); c.write("two"); c.write("three");      // three writes, back to back
  await wait(100);
  console.log("TCP  'data' events:", chunks.length, JSON.stringify(chunks));
  c.end(); server.close();
}

async function udp() {
  const got = [];
  const server = dgram.createSocket("udp4");
  server.on("message", (msg, rinfo) => got.push(\`\${msg} <- \${rinfo.address}\`)); // rinfo = who sent it
  await new Promise((r) => server.bind(0, "127.0.0.1", r));
  const c = dgram.createSocket("udp4");
  for (const m of ["one", "two", "three"]) c.send(m, server.address().port, "127.0.0.1");
  await wait(100);
  console.log("UDP  'message' events:", got.length, JSON.stringify(got));
  c.close(); server.close();
}

async function nobodyListening() {
  const probe = net.createServer(); // grab a free port, then free it again
  await new Promise((r) => probe.listen(0, r));
  const port = probe.address().port;
  await new Promise((r) => probe.close(r));

  await new Promise((r) => net.connect(port).on("error", (e) => { console.log("TCP  to closed port:", e.code); r(); }));

  const u = dgram.createSocket("udp4");
  u.send("hello?", port, "127.0.0.1", (err) => console.log("UDP  to closed port: send callback err =", err ? err.code : null));
  u.on("error", (e) => console.log("UDP  socket error:", e.code));
  await wait(100);
  u.close();
}

async function tooBig() {
  const u = dgram.createSocket("udp4");
  u.send(Buffer.alloc(70_000), 9, "127.0.0.1", (err) => {
    console.log("UDP  70000-byte datagram:", err ? err.code : "sent");
    u.close();
  });
  await wait(50);
}

(async () => { await tcp(); await udp(); await nobodyListening(); await tooBig(); })();`,
      },
      {
        label: "UDP size limit, connected UDP sockets reporting ECONNREFUSED, and which socket is a stream",
        tech: "javascript",
        runnable: false,
        code: `// More UDP facts, checked: size limit, connected UDP sockets, and what kind of object each socket is.
const net = require("node:net");
const dgram = require("node:dgram");
const { Duplex } = require("node:stream");
const { EventEmitter } = require("node:events");

console.log("net.Socket is a Duplex stream:", new net.Socket() instanceof Duplex);
const probe = dgram.createSocket("udp4");
console.log("dgram.Socket is a stream:", probe instanceof Duplex, "| is an EventEmitter:", probe instanceof EventEmitter);
probe.close();

const sizes = [65507, 65508];
const u = dgram.createSocket("udp4");
u.bind(0, "127.0.0.1", () => {
  let left = sizes.length;
  for (const n of sizes)
    u.send(Buffer.alloc(n), u.address().port, "127.0.0.1", (err) => {
      console.log(\`IPv4 datagram of \${n} bytes:\`, err ? err.code : "sent");
      if (--left === 0) { u.close(); connectedUdp(); }
    });
});

// A "connected" UDP socket remembers one peer, so the kernel can report ICMP port-unreachable back to it.
function connectedUdp() {
  const tmp = net.createServer().listen(0, () => {
    const port = tmp.address().port;
    tmp.close(() => {
      const c = dgram.createSocket("udp4");
      c.on("error", (e) => console.log("connected UDP socket error event:", e.code));
      c.connect(port, "127.0.0.1", () => {
        c.send("ping", (err) => console.log("1st send to closed port:", err ? err.code : "no error"));
        setTimeout(() => c.send("ping", (err) => {
          console.log("2nd send to closed port:", err ? err.code : "no error");
          c.close();
        }), 50);
      });
    });
  });
}`,
      },
      {
        label: "Newline framing on a TCP socket: recovering three messages from two chunks",
        tech: "javascript",
        runnable: false,
        code: `// TCP has no message boundaries, so the protocol must add them: here, one message per line.
const net = require("node:net");

function lineFramer(onMessage) {
  let buffered = "";
  return (chunk) => {
    buffered += chunk;
    let nl;
    while ((nl = buffered.indexOf("\\n")) !== -1) {
      onMessage(buffered.slice(0, nl));
      buffered = buffered.slice(nl + 1);   // keep the partial tail for the next chunk
    }
  };
}

const server = net.createServer((sock) => {
  sock.setEncoding("utf8");
  let chunks = 0;
  const feed = lineFramer((msg) => console.log("message:", JSON.stringify(msg)));
  sock.on("data", (d) => { chunks++; feed(d); });
  sock.on("end", () => { console.log("data chunks received:", chunks); server.close(); });
});

server.listen(0, () => {
  const c = net.connect(server.address().port, () => {
    c.write("one\\ntw");                        // a message split across two writes
    setTimeout(() => { c.write("o\\nthree\\n"); c.end(); }, 50);
  });
});`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does the cluster module distribute incoming connections across worker processes?",
    seoDescription:
      "Node cluster spreads connections, not requests: round-robin via the primary by default, or kernel accept with SCHED_NONE. Verified with real worker counts.",
    description: `**Question presented to candidate:**
"You run an HTTP server under the \`cluster\` module with four workers on one port. A new TCP connection arrives. Walk me through exactly which process accepts it and how it ends up in a worker. Then tell me why, under load testing, one worker sometimes ends up with almost all the traffic."

**What a strong answer should cover:**
- Two scheduling policies: \`cluster.SCHED_RR\` (round-robin, the default everywhere except Windows) and \`cluster.SCHED_NONE\` (leave it to the OS). Selected with \`cluster.schedulingPolicy\` before the first \`fork()\` or with \`NODE_CLUSTER_SCHED_POLICY=rr|none\`.
- Under round-robin the **primary** owns the listening socket, calls \`accept()\`, and passes each accepted connection's handle to a worker over the IPC channel. Workers never listen on the real socket.
- Under \`SCHED_NONE\` the primary creates the listening socket and shares that one handle with every worker; all of them call \`accept()\` on it and the kernel decides who wins, which can be very uneven.
- Distribution is **per connection, not per request**: with HTTP keep-alive, every request on a connection goes to the same worker, so a few long-lived connections (or a load balancer with a small pool of upstream connections) defeat the balancing.
- Round-robin is not load-aware: a worker that is busy but still accepting keeps getting connections. Workers do not share memory, so sessions, caches and WebSocket rooms need an external store or sticky routing.
- Alternatives: a reverse proxy in front of separate processes, PM2 cluster mode (built on \`cluster\`), or one process per container with an external load balancer.

**Clarifying questions expected:**
- "Which OS does this run on, and has anyone changed the scheduling policy?"
- "Are clients using keep-alive connections, and is there a proxy in front holding a small pool of upstream sockets?"

**Code / implementation expected:** Yes. A script that forks workers, tags each response with the worker id, and compares new-connection-per-request with a single keep-alive connection under both policies.`,
    answer: `**Target Audience:** Engineers who already know what \`cluster.fork()\` does and want to understand the connection hand-off underneath it.
**Difficulty:** Hard

> **How to read this doc:** Plain-language explanations come first, each followed by a <code>📌 Interview term:</code> callout. All distribution results below come from scripts run on Node v22.22.0 on a 4-core Linux machine, and the outputs are quoted exactly. Where a result varies from run to run, several runs are shown.

## 1. Why This Even Matters — A Story First

A busy restaurant has one front door and four waiters. There are two ways to seat guests. In the first, a host stands at the door, greets each party and walks it to the next waiter in turn: waiter 1, 2, 3, 4, 1, 2... That is **round-robin**: tidy and even, but every guest goes through the host. In the second, there is no host. The door opens straight into the dining room and whichever waiter happens to reach the party first takes it. That is **leaving it to the operating system**: no middleman, but the waiter standing nearest the door can end up with most of the tables.

One more detail matters: a party that stays for a long dinner and keeps ordering always orders from the same waiter. Seating happens once per **party** (a TCP connection), not once per **order** (an HTTP request).

If you have not met \`cluster\` before, start with [how clustering works](/interview-question/explain-how-clustering-works-in-node-js), which covers forking workers and sharing a port. This page is about what happens to each connection after that.

## 2. The Two Scheduling Policies

📌 **Interview term: \`cluster.SCHED_RR\`** — round-robin. The primary process listens on the port, accepts every incoming connection, and sends the accepted socket handle to a worker over the IPC channel. It is the default on every platform except Windows.

📌 **Interview term: \`cluster.SCHED_NONE\`** — the primary creates the listening socket once and shares the same handle with all workers. Each worker calls \`accept()\` on it, and the kernel decides which one gets each connection.

You choose with \`cluster.schedulingPolicy = cluster.SCHED_NONE\` before the first \`fork()\`, or with the environment variable \`NODE_CLUSTER_SCHED_POLICY=rr\` or \`none\`. The policy is fixed once the first worker is spawned.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="Round-robin: the primary accepts each connection and passes the socket handle to the next worker over IPC">
  <defs>
    <marker id="cl-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="24" text-anchor="middle">SCHED_RR (default on Linux and macOS)</text>
  <rect class="d-box-muted" x="30" y="90" width="130" height="50" rx="8"/>
  <text class="d-text" x="95" y="120" text-anchor="middle">Client</text>
  <rect class="d-box-accent" x="230" y="80" width="170" height="70" rx="8"/>
  <text class="d-text d-accent" x="315" y="108" text-anchor="middle">Primary</text>
  <text class="d-sub" x="315" y="130" text-anchor="middle">listens and accepts</text>
  <rect class="d-box" x="480" y="40" width="130" height="40" rx="8"/>
  <text class="d-sub" x="545" y="65" text-anchor="middle">worker 1</text>
  <rect class="d-box" x="480" y="105" width="130" height="40" rx="8"/>
  <text class="d-sub" x="545" y="130" text-anchor="middle">worker 2</text>
  <rect class="d-box" x="480" y="170" width="130" height="40" rx="8"/>
  <text class="d-sub" x="545" y="195" text-anchor="middle">worker 3</text>
  <path class="d-edge" d="M 160 115 L 222 115" marker-end="url(#cl-arrow)"/>
  <path class="d-edge-accent" d="M 400 100 L 474 64" marker-end="url(#cl-arrow)"/>
  <path class="d-edge-accent" d="M 400 118 L 474 124" marker-end="url(#cl-arrow)"/>
  <path class="d-edge-accent" d="M 400 136 L 474 186" marker-end="url(#cl-arrow)"/>
  <text class="d-sub" x="315" y="200" text-anchor="middle">handle sent over IPC</text>
</svg>

Under round-robin, every connection passes through the primary once; after the hand-off, the bytes flow directly between the client and that worker.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="SCHED NONE: one listening socket shared by all workers, the kernel wakes one worker per connection">
  <defs>
    <marker id="cl-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="24" text-anchor="middle">SCHED_NONE (default on Windows)</text>
  <rect class="d-box-muted" x="30" y="90" width="130" height="50" rx="8"/>
  <text class="d-text" x="95" y="120" text-anchor="middle">Client</text>
  <rect class="d-box-accent" x="230" y="80" width="170" height="70" rx="8"/>
  <text class="d-text d-accent" x="315" y="108" text-anchor="middle">Shared socket</text>
  <text class="d-sub" x="315" y="130" text-anchor="middle">kernel picks a worker</text>
  <rect class="d-box" x="480" y="40" width="130" height="40" rx="8"/>
  <text class="d-sub" x="545" y="65" text-anchor="middle">worker 1 accept</text>
  <rect class="d-box" x="480" y="105" width="130" height="40" rx="8"/>
  <text class="d-sub" x="545" y="130" text-anchor="middle">worker 2 accept</text>
  <rect class="d-box" x="480" y="170" width="130" height="40" rx="8"/>
  <text class="d-sub" x="545" y="195" text-anchor="middle">worker 3 accept</text>
  <path class="d-edge" d="M 160 115 L 222 115" marker-end="url(#cl-arrow2)"/>
  <path class="d-edge" d="M 474 60 L 400 100"/>
  <path class="d-edge" d="M 474 125 L 400 118"/>
  <path class="d-edge" d="M 474 190 L 400 136"/>
</svg>

With \`SCHED_NONE\` there is no middleman: all workers wait on the same socket, and which one wins depends on the kernel and on which worker is idle at that instant.

## 3. Verified: Who Actually Holds the Listening Socket?

Diagrams are easy to draw wrong, so the third example asks the Linux kernel directly. It reads \`/proc/net/tcp\` to find the inode of the listening socket, then scans \`/proc/<pid>/fd\` of the primary and each worker to see who has it open:

~~~text
rr: 1 listening socket, held by -> primary
none: 1 listening socket, held by -> primary, worker 1, worker 2
~~~

Under round-robin, only the primary holds the listening socket; the workers' \`server.listen(8124)\` calls never bound anything, because the cluster module intercepts them and registers the worker with the primary instead. Under \`SCHED_NONE\`, there is still exactly **one** listening socket, now open in all three processes. That is why the two policies are not "one socket vs four sockets"; they are "one acceptor vs many acceptors on one socket".

## 4. Verified: How Connections Get Spread

The first example forks three workers; each response is just the worker id. The primary then makes 12 requests one after another, first with a new TCP connection for each request, then all 12 over a single keep-alive connection:

~~~text
policy: SCHED_RR (round-robin)
new connection per request: w1 w2 w3 w1 w2 w3 w1 w2 w3 w1 w2 w3
one keep-alive connection:  w1 w1 w1 w1 w1 w1 w1 w1 w1 w1 w1 w1

policy: SCHED_NONE (OS decides)
new connection per request: w2 w2 w1 w3 w1 w3 w3 w3 w2 w1 w3 w2
one keep-alive connection:  w3 w3 w3 w3 w3 w3 w3 w3 w3 w3 w3 w3
~~~

- **Round-robin, new connection each time:** a perfect \`w1 w2 w3\` rotation.
- **\`SCHED_NONE\`, new connection each time:** no pattern at all; whichever worker the kernel woke up took it. Over many runs the counts drift and can be very lopsided, which is exactly the warning in the [Node cluster docs](https://nodejs.org/api/cluster.html) that led to round-robin becoming the default.
- **Keep-alive, either policy:** all 12 requests went to one worker. The policy decides who gets a **connection**; after that, every request on it stays with that worker.

📌 **Interview term: connection-level balancing** — \`cluster\` balances TCP connections, not HTTP requests. If your traffic arrives over a few long-lived keep-alive connections (a reverse proxy with a small upstream pool, an HTTP/2 client, a WebSocket), most workers can sit idle while one does all the work.

## 5. Verified: Is Round-Robin Load-Aware?

The second example makes worker 1 burn 300 ms of CPU on every request, then fires 12 concurrent connections. Five runs per policy:

~~~text
rr: busy w1=3  w2=5  w3=4  all 12 done in 924 ms
rr: busy w1=3  w2=4  w3=5  all 12 done in 924 ms
rr: busy w1=3  w2=5  w3=4  all 12 done in 925 ms
rr: busy w1=3  w2=5  w3=4  all 12 done in 925 ms
rr: busy w1=3  w2=6  w3=3  all 12 done in 930 ms
none: busy w1=2  w2=5  w3=5  all 12 done in 625 ms
none: busy w1=5  w2=5  w3=2  all 12 done in 1528 ms
none: busy w1=10  w2=1  w3=1  all 12 done in 3038 ms
none: busy w1=2  w2=4  w3=6  all 12 done in 626 ms
none: busy w1=2  w2=8  w3=2  all 12 done in 630 ms
~~~

Round-robin was steady in these five runs: the slow worker still received about a quarter of the connections (3 of 12), so the batch took about 3 x 300 ms = 925 ms each time (a later rerun gave it 2 connections and 660 ms; the hand-off timing explained below varies a little). \`SCHED_NONE\` swung wildly: in one run the slow worker took 10 of 12 connections and the batch took 3,038 ms; in others it took 2 and finished in 625 ms.

Why did the busy worker get 3 rather than exactly 4? The round-robin code in Node's source (\`lib/internal/cluster/round_robin_handle.js\`, printed here with \`node --expose-internals\`) keeps a queue of **free** workers. When it hands a connection to a worker, that worker leaves the queue until it replies to the IPC message; only then does \`handoff()\` put it back:

~~~js
sendHelper(worker.process, message, handle, (reply) => {
  if (reply.accepted)
    handle.close();
  else
    this.distribute(0, handle);  // Worker is shutting down. Send to another.

  this.handoff(worker);
});
~~~

A worker whose event loop is blocked cannot reply, so it misses its turn for a while. That is a side effect, not real load balancing: the primary knows nothing about CPU usage, queue length or response time. If you need least-busy routing, put a proxy that supports it (for example Nginx \`least_conn\` or HAProxy \`leastconn\`) in front of separate processes.

📌 **Interview term: thundering herd** — many processes waiting on the same socket are all woken for one connection and only one wins. It is part of why \`SCHED_NONE\` distribution is uneven and hard to predict.

## 6. What the Primary Costs You

Round-robin's fairness is not free:

- Every connection costs one \`accept()\` in the primary plus an IPC message to pass the handle. For workloads with very many short connections, the primary can become the bottleneck, and if the primary is blocked, nobody gets new connections.
- If the primary dies, the workers lose their connection source. Keep the primary tiny: fork, restart crashed workers on the \`exit\` event, and do nothing else.
- On Windows, the default is \`SCHED_NONE\`.

On Linux there is another option that skips the primary entirely: \`SO_REUSEPORT\`, which lets independent processes each bind their own socket to the same port while the kernel spreads connections between them. On this machine's Node v22.22.0, \`net\` exposes it as a \`reusePort\` listen option (check that your Node version documents it before relying on it). A small script started two independent processes on one port, with and without it:

~~~js
net.createServer((s) => s.end(\`p\${id}\`))
  .listen({ port: 8126, host: "127.0.0.1", reusePort: true });
~~~

~~~text
reusePort=false: 20 connections -> {"p2":20} process 1 failed to listen: EADDRINUSE
reusePort=true: 20 connections -> {"p2":11,"p1":9}
~~~

Without the option, the second process failed with \`EADDRINUSE\`; with it, both bound and the kernel split the 20 connections 11 / 9.

## 7. Comparison: How Connections Reach a Node Process

| Approach | Who accepts | Balancing | Good for | Watch out for |
| :--- | :--- | :--- | :--- | :--- |
| \`cluster\` with \`SCHED_RR\` | Primary, then IPC hand-off | Even per connection | One machine, simple setup, Linux/macOS default | Primary is a hop and a single point; not load-aware |
| \`cluster\` with \`SCHED_NONE\` | Each worker on a shared socket | Kernel decides; can be very uneven | Windows default; avoiding the primary hop | Hot workers, unpredictable spread |
| \`reusePort\` (Linux) | Each process on its own socket | Kernel hashes connections across sockets | Independent processes without a primary | Platform-specific; check Node version |
| Reverse proxy (Nginx, HAProxy, Envoy) | The proxy | Round-robin, least-connections, per request | Multiple machines, health checks, TLS | Another component to run |
| PM2 cluster mode | Uses \`cluster\` underneath | Same as \`cluster\` | Process management plus clustering | Same connection-level caveats; see [PM2](/interview-question/what-is-pm2-and-what-does-it-add-over-running-node-server-js-directly) |

## 8. Common Pitfalls

- **Load testing with keep-alive and concluding cluster "does not work".** A load tool with 2 connections drives at most 2 workers, as the keep-alive run above showed. Use as many connections as you expect in production.
- **Assuming round-robin means each worker has equal load.** It hands out connections evenly, not work. One slow endpoint or one CPU-heavy request makes a worker slow without it being skipped for long.
- **Setting \`cluster.schedulingPolicy\` after forking.** The policy is fixed at the first \`fork()\`; set it at the top of the primary or use \`NODE_CLUSTER_SCHED_POLICY\`.
- **Doing real work in the primary.** Under round-robin, a blocked primary means no worker gets new connections. The primary should only manage workers.
- **Keeping per-user state in worker memory.** A user's next connection can land on a different worker. Sessions, rate-limit counters and WebSocket room membership need Redis or another shared store.
- **Expecting sticky sessions from \`cluster\`.** It has no notion of a user. Socket.IO's long-polling fallback needs sticky routing, which requires something like \`@socket.io/sticky\` or a proxy with cookie or IP affinity.

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the two policies:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">cluster</code> has two scheduling policies: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">SCHED_RR</code>, round-robin, which is the default except on Windows, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">SCHED_NONE</code>, which leaves it to the operating system. You pick with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">cluster.schedulingPolicy</code> before forking or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">NODE_CLUSTER_SCHED_POLICY</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Explain round-robin:</strong> <span style="color:#f0e2c8;">"In round-robin the primary owns the listening socket, accepts each connection and passes the socket handle to the next free worker over IPC. Workers never bind the port; I checked in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">/proc</code> and only the primary held it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Explain SCHED_NONE:</strong> <span style="color:#f0e2c8;">"With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">SCHED_NONE</code>, one listening socket is shared by all workers and each calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">accept()</code>; the kernel picks, which can be very uneven. In my test a slow worker took 10 of 12 connections in one run."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the key caveat:</strong> <span style="color:#f0e2c8;">"Balancing is per connection, not per request. Over one keep-alive connection all 12 of my requests hit the same worker, so few long-lived connections defeat it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close with limits and options:</strong> <span style="color:#f0e2c8;">"Round-robin is not load-aware and the primary is an extra hop. For per-request or least-connections balancing, or multiple machines, I put a reverse proxy in front, and I keep shared state in Redis because workers share no memory."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did Node make round-robin the default instead of letting the kernel do it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the kernel approach turned out to be very unbalanced in practice. The cluster docs put it down to operating system scheduler quirks and describe loads where over 70% of all connections ended up in just two of eight processes. Round-robin trades an extra IPC hop in the primary for a predictable spread. Windows keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">SCHED_NONE</code> because, per the same docs, libuv cannot yet hand off Windows IOCP handles between processes without a large performance cost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your Nginx upstream keeps 8 keep-alive connections to a 16-worker cluster. What happens?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At most 8 workers ever receive traffic, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">cluster</code> only balances when a new connection arrives and every request on an existing connection stays with its worker. Fixes: raise the upstream <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">keepalive</code> pool well above the worker count, run fewer workers per port, or skip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">cluster</code> and let Nginx balance across separate processes on different ports, where it can route per request.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a worker's <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">server.listen(3000)</code> work if the worker never binds the port?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In a worker, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">listen()</code> is intercepted by the cluster module: the worker sends a message to the primary asking for a handle for that address and port. The primary creates or reuses the real listening socket, keyed by address and port, and either keeps it and starts round-robin hand-offs (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">SCHED_RR</code>) or sends the handle itself to the worker (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">SCHED_NONE</code>). The worker then gets a normal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">listening</code> event, so application code looks the same as in a single process.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to connections when a worker crashes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its open connections die with it, because the sockets lived in that process. New connections keep flowing to the remaining workers; under round-robin the dead worker is removed from the free queue. The primary should listen for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">exit</code>, log it, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">fork()</code> a replacement, ideally with a backoff so a crash loop does not spin. For planned restarts, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">worker.disconnect()</code> so the worker stops taking new connections and finishes the ones it has.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">cluster</code> at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In containers orchestrated by Kubernetes or ECS it is common to run one Node process per container and let the platform run more replicas, so restarts, health checks and balancing live in one place. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">cluster</code> also does not help with CPU-heavy work inside a single request; that needs [worker threads](/interview-question/what-are-worker-threads-in-node-js-and-when-would-you-use-them). And if you need per-request balancing or health-aware routing, a proxy does that and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">cluster</code> does not.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Primary** | The process that forks workers and, under round-robin, accepts connections (formerly called master) |
| **\`SCHED_RR\`** | Round-robin policy: the primary accepts and hands each connection to the next free worker |
| **\`SCHED_NONE\`** | OS policy: workers share one listening socket and the kernel picks who accepts |
| **Handle passing** | Sending an open socket from one process to another over the IPC channel |
| **Connection-level balancing** | Spreading TCP connections; every request on a connection stays on its worker |
| **Keep-alive** | Reusing one TCP connection for many HTTP requests |
| **Thundering herd** | Many waiting processes woken for one event, only one of which can take it |
| **\`SO_REUSEPORT\` / \`reusePort\`** | Linux socket option letting independent processes bind the same port, with kernel balancing |

---
**Conclusion:** The \`cluster\` module spreads **connections**, not requests, using one of two policies. Under the default round-robin policy, the primary is the only process holding the listening socket (confirmed in \`/proc\`): it accepts each connection and passes the handle to the next free worker over IPC, giving the clean \`w1 w2 w3\` rotation seen above. Under \`SCHED_NONE\`, every worker accepts from one shared socket and the kernel decides, which in these runs sent anywhere from 2 to 10 of 12 connections to a deliberately slow worker. In both cases a keep-alive connection pins all its requests to one worker, and neither policy knows how busy a worker is. Say that clearly in an interview, then explain when a reverse proxy, \`reusePort\` or one process per container is the better fit.
`,
    examples: [
      {
        label: "Which worker answers: new connection per request vs one keep-alive connection (run with and without NODE_CLUSTER_SCHED_POLICY=none)",
        tech: "javascript",
        runnable: false,
        code: `// How does the primary spread connections? Count which worker answered each request.
const cluster = require("node:cluster");
const http = require("node:http");

if (cluster.isPrimary) {
  const policy = cluster.schedulingPolicy === cluster.SCHED_RR ? "SCHED_RR (round-robin)" : "SCHED_NONE (OS decides)";
  console.log("policy:", policy);
  const ids = [];
  for (let i = 0; i < 3; i++) ids.push(cluster.fork().id);
  let listening = 0;
  cluster.on("listening", async () => {
    if (++listening < 3) return;
    const port = 8123;
    const get = (agent) => new Promise((res) =>
      http.get({ port, path: "/", agent }, (r) => { let b = ""; r.on("data", (c) => (b += c)); r.on("end", () => res(b)); }));

    // A: 12 requests, each on a NEW TCP connection (no keep-alive), sent one after another
    const fresh = new http.Agent({ keepAlive: false });
    const seqA = [];
    for (let i = 0; i < 12; i++) seqA.push(await get(fresh));
    console.log("new connection per request:", seqA.join(" "));

    // B: 12 requests over ONE kept-alive connection
    const pinned = new http.Agent({ keepAlive: true, maxSockets: 1 });
    const seqB = [];
    for (let i = 0; i < 12; i++) seqB.push(await get(pinned));
    console.log("one keep-alive connection: ", seqB.join(" "));
    pinned.destroy();

    for (const id in cluster.workers) cluster.workers[id].kill();
  });
} else {
  http.createServer((req, res) => res.end(\`w\${cluster.worker.id}\`)).listen(8123);
}`,
      },
      {
        label: "A worker blocked 300 ms per request: how many of 12 concurrent connections it still receives under each policy",
        tech: "javascript",
        runnable: false,
        code: `// Round-robin is not load-aware... or is it? Worker 1 blocks its event loop for 300ms per request.
const cluster = require("node:cluster");
const http = require("node:http");

if (cluster.isPrimary) {
  for (let i = 0; i < 3; i++) cluster.fork();
  let up = 0;
  cluster.on("listening", async () => {
    if (++up < 3) return;
    const agent = new http.Agent({ keepAlive: false, maxSockets: Infinity });
    const t0 = Date.now();
    const one = () => new Promise((res) => http.get({ port: 8125, agent }, (r) => {
      let b = ""; r.on("data", (c) => (b += c)); r.on("end", () => res(b));
    }));
    const results = await Promise.all(Array.from({ length: 12 }, one)); // 12 concurrent connections
    const ms = Date.now() - t0;
    const count = { w1: 0, w2: 0, w3: 0 };
    for (const w of results) count[w]++;
    console.log(\`\${process.env.NODE_CLUSTER_SCHED_POLICY ?? "rr"}: busy w1=\${count.w1}  w2=\${count.w2}  w3=\${count.w3}  all 12 done in \${ms} ms\`);
    for (const id in cluster.workers) cluster.workers[id].kill();
  });
} else {
  http.createServer((req, res) => {
    if (cluster.worker.id === 1) { const end = Date.now() + 300; while (Date.now() < end); } // CPU-bound
    res.end(\`w\${cluster.worker.id}\`);
  }).listen(8125);
}`,
      },
      {
        label: "Ask the Linux kernel via /proc which processes hold the listening socket under each policy",
        tech: "javascript",
        runnable: false,
        code: `// Who actually holds the listening socket? Ask the Linux kernel via /proc while the cluster is up.
const cluster = require("node:cluster");
const http = require("node:http");
const fs = require("node:fs");

function listenInodes(port) {            // LISTEN state is "0A" in /proc/net/tcp*
  const hex = ":" + port.toString(16).toUpperCase().padStart(4, "0");
  return ["/proc/net/tcp", "/proc/net/tcp6"].filter((f) => fs.existsSync(f)).flatMap((f) =>
    fs.readFileSync(f, "utf8").split("\\n").slice(1).map((l) => l.trim().split(/\\s+/))
      .filter((c) => c[1]?.endsWith(hex) && c[3] === "0A").map((c) => c[9]));
}
function holders(pids, inodes) {
  return Object.keys(pids).filter((pid) => fs.readdirSync(\`/proc/\${pid}/fd\`).some((fd) => {
    try { return inodes.includes(/socket:\\[(\\d+)\\]/.exec(fs.readlinkSync(\`/proc/\${pid}/fd/\${fd}\`))?.[1]); }
    catch { return false; }
  })).map((pid) => pids[pid]);
}

if (cluster.isPrimary) {
  const pids = { [process.pid]: "primary" };
  for (let i = 0; i < 2; i++) { const w = cluster.fork(); pids[w.process.pid] = \`worker \${w.id}\`; }
  let up = 0;
  cluster.on("listening", () => {
    if (++up < 2) return;
    const inodes = listenInodes(8124);
    const owners = holders(pids, inodes);
    console.log(\`\${process.env.NODE_CLUSTER_SCHED_POLICY ?? "rr"}: \${inodes.length} listening socket, held by ->\`, owners.sort().join(", "));
    for (const id in cluster.workers) cluster.workers[id].kill();
  });
} else {
  http.createServer((q, s) => s.end()).listen(8124, "127.0.0.1");
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between horizontal and vertical scaling for a Node.js application?",
    seoDescription:
      "Vertical scaling grows one Node instance; horizontal adds instances. Measured: one process uses one core, and in-memory sessions break on scale-out.",
    description: `**Question presented to candidate:**
"Our Node.js API is hitting 90% CPU at peak. One engineer wants to move it to a machine with twice the cores; another wants to run more copies behind a load balancer. Explain the difference between those two options, what each one requires from the code, and which you would do first."

**What a strong answer should cover:**
- Vertical scaling (scale up) means a bigger machine: more CPU, RAM, faster disk. Horizontal scaling (scale out) means more instances of the app behind a load balancer.
- The Node-specific twist: one Node process runs JavaScript on one main thread, so a bigger box does not help unless you also run more processes (\`cluster\`, PM2, several containers) or move CPU work to worker threads. Vertical scaling of memory also needs \`--max-old-space-size\` because V8 caps the heap.
- Horizontal scaling requires the app to be stateless: sessions, caches, uploads, rate-limit counters and WebSocket fan-out must live in shared services (Redis, a database, object storage), or requests that land on another instance break.
- Trade-offs: vertical is simple but has a hardware ceiling, a single point of failure and often a restart to resize; horizontal gives fault tolerance and near-linear growth but adds a load balancer, health checks, distributed state and the risk of moving the bottleneck to the database.
- First steps: measure where the time goes (CPU profile, event-loop lag), fix obvious hot spots, then scale out on one box with multiple processes and across boxes behind a load balancer, with autoscaling on a metric such as CPU or latency.

**Clarifying questions expected:**
- "Is the bottleneck CPU in our Node code, memory, or a downstream dependency like the database?"
- "Is any state kept in process memory today: sessions, caches, in-memory queues, WebSocket connections?"

**Code / implementation expected:** Optional. A short demonstration that one process does not use extra cores, and that in-memory sessions break once two instances share traffic, makes the trade-off concrete.`,
    answer: `**Target Audience:** Engineers preparing for Node.js system design rounds who need to explain scaling choices in Node's terms, not just in general cloud terms.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language and then tagged with <code>📌 Interview term:</code>. The timing, session and heap-limit results below come from scripts run on Node v22.22.0 on a 4-core, 16 GB Linux machine; the outputs are quoted exactly and the numbers will differ on other hardware.

## 1. Why This Even Matters — A Story First

A food truck has a queue around the block. Option one: buy a bigger truck with a bigger grill. Option two: park three more ordinary trucks next to it. The bigger truck is easy, with one menu, one till and one cook who knows everything. But there is a biggest truck you can buy, and if it breaks down, nobody eats. More trucks can grow almost forever, and one breaking down is no disaster, but now the trucks must share the same recipe book and the same list of who has paid, or a customer who paid at truck 1 gets turned away at truck 2.

There is a Node twist to this story: the bigger truck still has **one cook**. A Node process runs your JavaScript on a single main thread, so a truck with eight grills and one cook cooks no faster. Most of this answer is about that twist.

## 2. The Two Definitions

📌 **Interview term: vertical scaling (scale up)** — giving one instance more resources: more CPU cores, more RAM, faster disks or network.

📌 **Interview term: horizontal scaling (scale out)** — running more instances of the same app and spreading traffic across them with a load balancer.

| | Vertical (scale up) | Horizontal (scale out) |
| :--- | :--- | :--- |
| What changes | Bigger machine or container limits | More processes, containers or machines |
| Code changes | Usually none... except in Node (see below) | App must be stateless; state moves to shared services |
| Ceiling | The largest machine you can buy | Mostly the shared dependencies (database, cache) |
| Failure impact | One instance down = outage | One instance down = reduced capacity |
| Resizing | Often a restart or migration | Add or remove instances, often automatically |
| Cost curve | Big instances cost more per unit of CPU at the top end | Roughly linear, plus load balancer and coordination costs |
| Operational complexity | Low | Higher: health checks, deploys, distributed state, observability |

## 3. The Node Twist: One Process, One Main Thread

A Node process runs your JavaScript on one main thread. The libuv thread pool and the OS do some I/O and crypto work in parallel, but every request handler, every \`JSON.parse\` and every template render runs on that one thread. So the CPU half of vertical scaling does nothing for a single Node process.

The first example runs a CPU-bound job (a 300-million-iteration loop) once, then four times in one process, then once in each of four processes:

~~~text
cores visible: 4
1 job,  1 process : 563 ms
4 jobs, 1 process : 2342 ms  (4.2x one job)
4 jobs, 4 processes: 785 ms  (1.4x one job)
~~~

Four jobs in one process took about four times as long as one job (4.2x): the machine had four cores, and the process used one. Spread over four processes, the same four jobs finished in 1.4x the time of one job. Timings move between runs (other runs on this machine gave 3.8x and 1.8x), but the gap between the two layouts was large every time. That is the real meaning of "scale up" for Node: **a bigger box only helps if you also run more processes on it** (\`cluster\`, PM2, or several containers per host), or move CPU-heavy work to [worker threads](/interview-question/what-are-worker-threads-in-node-js-and-when-would-you-use-them). Running more processes on one box is already horizontal scaling, just inside one machine.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="Vertical scaling of a single Node process uses one of four cores; horizontal scaling runs one process per core and more machines behind a load balancer">
  <text class="d-text" x="160" y="26" text-anchor="middle">Scale up, one process</text>
  <text class="d-text" x="480" y="26" text-anchor="middle">Scale out, many processes</text>
  <rect class="d-box" x="40" y="50" width="240" height="150" rx="10"/>
  <rect class="d-box-accent" x="60" y="70" width="90" height="50" rx="6"/>
  <text class="d-sub" x="105" y="100" text-anchor="middle">node: busy</text>
  <rect class="d-box-muted" x="170" y="70" width="90" height="50" rx="6"/>
  <text class="d-sub" x="215" y="100" text-anchor="middle">core idle</text>
  <rect class="d-box-muted" x="60" y="135" width="90" height="50" rx="6"/>
  <text class="d-sub" x="105" y="165" text-anchor="middle">core idle</text>
  <rect class="d-box-muted" x="170" y="135" width="90" height="50" rx="6"/>
  <text class="d-sub" x="215" y="165" text-anchor="middle">core idle</text>
  <rect class="d-box" x="360" y="50" width="240" height="150" rx="10"/>
  <rect class="d-box-accent" x="380" y="70" width="90" height="50" rx="6"/>
  <text class="d-sub" x="425" y="100" text-anchor="middle">node 1</text>
  <rect class="d-box-accent" x="490" y="70" width="90" height="50" rx="6"/>
  <text class="d-sub" x="535" y="100" text-anchor="middle">node 2</text>
  <rect class="d-box-accent" x="380" y="135" width="90" height="50" rx="6"/>
  <text class="d-sub" x="425" y="165" text-anchor="middle">node 3</text>
  <rect class="d-box-accent" x="490" y="135" width="90" height="50" rx="6"/>
  <text class="d-sub" x="535" y="165" text-anchor="middle">node 4</text>
</svg>

On the left, a single Node process on a 4-core machine keeps one core busy and leaves three idle. On the right, one process per core uses the whole machine, and the same pattern then repeats across machines.

The memory half of vertical scaling has its own catch: V8 caps the JavaScript heap, and a bigger machine does not automatically raise that cap for you. The second example reads the limit:

~~~text
default heap limit 8240 MB; machine RAM 16093 MB
--max-old-space-size=256 -> heap limit 304 MB
--max-old-space-size=1024 -> heap limit 1072 MB
~~~

On this 16 GB machine the default limit was 8,240 MB; the flag set the old-generation size, and the reported total adds the young generation on top (256 becomes 304). Defaults depend on the machine and Node version, so check them where you deploy with \`v8.getHeapStatistics()\` and set \`--max-old-space-size\` to match your container's memory limit, leaving room for buffers and native memory outside the heap.

## 4. What Horizontal Scaling Demands From Your Code

Once there are two copies of the app, any request can land on either one. Anything kept in one process's memory becomes a bug. The third example puts two instances, A and B, behind a tiny round-robin proxy. Each first stores sessions in its own \`Map\`, then both use one shared store (a \`Map\` standing in for Redis):

~~~text
--- each instance keeps sessions in its own Map
A: logged in
401 B: who are you?
200 A: hello alice
401 B: who are you?
--- both instances use one shared store
A: logged in
200 B: hello alice
200 A: hello alice
200 B: hello alice
~~~

With per-instance memory, Alice logged in on A and then got \`401\` on every request that landed on B: a user "randomly" logged out every other click. With a shared store, every request succeeded no matter which instance served it.

📌 **Interview term: stateless service** — an instance keeps no data between requests that another instance would need. Any instance can serve any request, so instances can be added, removed or restarted freely.

The usual checklist for making a Node service stateless:

| State kept in process | Where it moves |
| :--- | :--- |
| Sessions in memory (\`express-session\` default store) | Redis or the database, or signed tokens (see [JWT vs sessions](/interview-question/what-is-the-difference-between-jwt-and-session-based-authentication-and-where-do)) |
| In-memory cache (\`Map\`, \`lru-cache\`) | Keep as a small per-instance L1 if stale data is acceptable; shared data in Redis (see [caching](/interview-question/how-would-you-implement-caching-in-a-node-js-application)) |
| Uploaded files on local disk | Object storage such as S3 |
| Rate-limit counters | Redis, so limits apply across instances (see [rate limiting](/interview-question/how-do-you-implement-rate-limiting-in-a-node-js-express-application)) |
| \`setInterval\` jobs, cron | A job queue or a single scheduler, or every instance runs the job (see [job queues](/interview-question/what-is-a-background-job-queue-bullmq-redis-and-when-do-you-need-one)) |
| WebSocket connections | Pub/sub fan-out between instances (see [real-time communication](/interview-question/how-would-you-implement-real-time-communication-e-g-websockets-in-a-node-js-appl)) |

📌 **Interview term: sticky sessions** — the load balancer always sends a given client to the same instance. It hides in-memory state problems, but loses that state when the instance restarts and spreads load unevenly, so treat it as a stopgap rather than a design.

## 5. A Worked Capacity Estimate

Numbers make the decision concrete. Say profiling shows each request costs **4 ms of CPU** on the main thread, and peak traffic is **2,000 requests per second**. (These two inputs are illustrative; measure your own with a CPU profile and your traffic graphs.)

- One process can do at most 1,000 ms / 4 ms = **250 req/s** of CPU work, before any headroom.
- Target 60% utilisation so spikes and GC pauses do not tip it over: about **150 req/s** per process.
- 2,000 / 150 is about **14 processes**.
- Doubling a 4-core box to 8 cores, with one process, still gives 150 req/s. With one process per core it gives 8 x 150 = 1,200 req/s, still short. You need two 8-core machines, or four 4-core ones; and with N+1 redundancy for one machine failing, five 4-core machines.

The same arithmetic also tells you where the next bottleneck is: 2,000 req/s with, say, three queries each is 6,000 queries per second on the database. Scaling Node out does not scale the database; connection pools per instance multiply too (14 processes x a pool of 10 = 140 connections).

## 6. Which to Do First

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Order of operations: measure first, fix hot spots, use every core with one process per core, then scale out across machines behind a load balancer">
  <defs>
    <marker id="sc-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="240" height="56" rx="8"/>
  <text class="d-text" x="160" y="54" text-anchor="middle">1. Measure</text>
  <text class="d-sub" x="160" y="74" text-anchor="middle">CPU profile, event loop lag</text>
  <rect class="d-box" x="360" y="30" width="240" height="56" rx="8"/>
  <text class="d-text" x="480" y="54" text-anchor="middle">2. Fix hot spots</text>
  <text class="d-sub" x="480" y="74" text-anchor="middle">slow code, N+1 queries</text>
  <rect class="d-box-accent" x="40" y="170" width="240" height="56" rx="8"/>
  <text class="d-text d-accent" x="160" y="194" text-anchor="middle">3. Use every core</text>
  <text class="d-sub" x="160" y="214" text-anchor="middle">one process per core</text>
  <rect class="d-box-accent" x="360" y="170" width="240" height="56" rx="8"/>
  <text class="d-text d-accent" x="480" y="194" text-anchor="middle">4. Scale out</text>
  <text class="d-sub" x="480" y="214" text-anchor="middle">stateless, load balancer</text>
  <path class="d-edge" d="M 280 58 L 352 58" marker-end="url(#sc-arrow)"/>
  <path class="d-edge" d="M 420 86 L 220 164" marker-end="url(#sc-arrow)"/>
  <path class="d-edge" d="M 280 198 L 352 198" marker-end="url(#sc-arrow)"/>
</svg>

For the 90%-CPU prompt: profile first ([CPU profiling](/interview-question/how-do-you-profile-cpu-usage-with-prof-0x-or-clinic-js-flame-graphs)), because one slow regex or a synchronous call can be the whole problem. Then make sure each machine runs one process per core. Then go horizontal behind a load balancer with health checks ([health endpoints](/interview-question/what-is-the-purpose-of-health-check-and-readiness-liveness-endpoints-in-a-node-j)) and autoscaling. Vertical scaling still has a place: right-size each instance so it is not starved of memory, and scale the database vertically, which is often easier than sharding it.

## 7. Common Pitfalls

- **Buying a bigger machine for a single Node process.** As measured above, extra cores sit idle unless you run more processes or worker threads.
- **Scaling out with in-memory sessions.** The proxy run above produced a \`401\` on every request that hit the other instance. Externalise state before adding the second instance.
- **Forgetting the heap cap.** A container with 8 GB of RAM can still crash with "JavaScript heap out of memory" if the heap limit is lower than the app needs; set \`--max-old-space-size\` deliberately.
- **Moving the bottleneck to the database.** Ten times the Node instances means ten times the connection pools. Use a pooler (such as PgBouncer), caching and read replicas.
- **Running scheduled jobs in every instance.** A \`setInterval\` that sends a daily email sends it N times after scaling to N instances. Use a queue with a single consumer or a distributed lock.
- **Scaling without graceful shutdown.** Autoscalers remove instances constantly; without draining in-flight requests on \`SIGTERM\`, every scale-in drops requests. See [graceful shutdown](/interview-question/how-do-you-handle-graceful-shutdown-in-a-node-js-application).

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define both:</strong> <span style="color:#f0e2c8;">"Vertical scaling gives one instance more CPU and memory; horizontal scaling runs more instances behind a load balancer."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Add the Node twist:</strong> <span style="color:#f0e2c8;">"A Node process runs JavaScript on one main thread, so more cores do nothing for one process. I measured it: four CPU jobs took 4.2x one job in one process and 1.4x across four processes. Scaling up in Node really means running a process per core, which is already scaling out."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the requirement:</strong> <span style="color:#f0e2c8;">"Scaling out needs a stateless app. Sessions, caches, uploads, rate-limit counters and WebSocket fan-out move to Redis, the database or object storage, otherwise users hit an instance that does not know them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the trade-offs:</strong> <span style="color:#f0e2c8;">"Vertical is simple but has a ceiling and a single point of failure; horizontal gives redundancy and elastic growth but adds a load balancer, health checks and distributed state, and it pushes load onto the database."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Say what you would do:</strong> <span style="color:#f0e2c8;">"Profile first, fix hot spots, run one process per core, then scale out with autoscaling and graceful shutdown, and watch database connections as instances grow."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">cluster</code> on one big machine count as horizontal or vertical scaling?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both, depending on how you frame it. The machine grew vertically, but the app scaled by running more independent processes, which is the horizontal pattern on a single host. In an interview, say so explicitly, then note that it still has the vertical weakness: if that one machine fails, every worker goes down with it, so you need more than one machine for availability.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know whether the bottleneck is Node or the database?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Look at where the time goes. If Node's CPU is high and event loop lag (for example from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">perf_hooks.monitorEventLoopDelay</code>) is rising, the bottleneck is JavaScript on the main thread and more Node processes help. If Node's CPU is low but latency is high, requests are waiting on I/O: check database query times, pool wait times and downstream latency. Adding Node instances in that case only adds more waiters and more database connections.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Our app keeps a 2 GB in-memory cache. How does that affect scaling?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It makes each instance expensive and slow to start, because each one rebuilds its own copy, and the copies drift apart. With 10 instances you hold 20 GB of mostly duplicated data. Options are a shared cache (Redis) with a small per-instance cache for the hottest keys, or, if the data is truly read-only, a lazily loaded shared file. It is also a reason to prefer fewer, larger instances, a legitimate vertical choice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you autoscale on?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A metric that tracks saturation for this workload: CPU for CPU-bound services, event loop delay or p95 latency for mixed ones, queue depth for workers that consume jobs. Add a cool-down so the group does not flap, keep a minimum of two or three instances for availability, and make sure new instances pass a readiness check before receiving traffic and drain on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">SIGTERM</code> before being removed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is vertical scaling the right answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the component is hard to distribute, like a primary relational database; when per-instance memory is the problem, such as a large working set or heap limit; when traffic is small and a second instance would only add complexity; or as a quick stopgap while making the app stateless. For the Node tier itself, the usual answer is right-sized instances, scaled horizontally.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Vertical scaling** | Making one instance bigger: more CPU, RAM, disk |
| **Horizontal scaling** | Running more instances and spreading traffic across them |
| **Stateless service** | An instance keeps nothing between requests that another instance would need |
| **Load balancer** | Component that spreads incoming requests across instances and skips unhealthy ones |
| **Sticky sessions** | Routing a client to the same instance every time; a stopgap for in-memory state |
| **Heap limit** | V8's cap on JavaScript heap size, set with \`--max-old-space-size\` |
| **Autoscaling** | Adding or removing instances automatically based on a metric |
| **N+1 redundancy** | Running one more instance or machine than the load needs, so one can fail |

---
**Conclusion:** Vertical scaling makes one instance bigger; horizontal scaling adds more instances. For Node.js the line between them is blurrier than usual, because one process runs JavaScript on one thread: the run above showed four CPU-bound jobs taking 4.2x as long in one process but only 1.4x across four processes, so a bigger machine only pays off when you run a process per core. Scaling out across machines then adds fault tolerance and room to grow, but only if the app is stateless, as the in-memory session run showed with a \`401\` on every request that hit the other instance. A strong answer measures first, uses every core, externalises state, scales out behind a load balancer, and keeps an eye on the database, which becomes the next bottleneck.
`,
    examples: [
      {
        label: "Does one Node process use more cores? Four CPU-bound jobs in one process vs four processes",
        tech: "javascript",
        runnable: false,
        code: `// Vertical vs horizontal on one 4-core box: does one Node process use the extra cores?
const { fork } = require("node:child_process");
const os = require("node:os");

function burn() { let x = 0; for (let i = 0; i < 3e8; i++) x += i % 7; return x; } // ~CPU-bound job

if (process.argv[2] === "child") { burn(); process.send("done"); return; }

(async () => {
  console.log("cores visible:", os.availableParallelism());
  let t = Date.now(); burn(); const one = Date.now() - t;
  console.log(\`1 job,  1 process : \${one} ms\`);

  t = Date.now(); for (let i = 0; i < 4; i++) burn();
  const serial = Date.now() - t;
  console.log(\`4 jobs, 1 process : \${serial} ms  (\${(serial / one).toFixed(1)}x one job)\`);

  t = Date.now();
  await Promise.all(Array.from({ length: 4 }, () => new Promise((res) => fork(__filename, ["child"]).on("message", res))));
  const parallel = Date.now() - t;
  console.log(\`4 jobs, 4 processes: \${parallel} ms  (\${(parallel / one).toFixed(1)}x one job)\`);
})();`,
      },
      {
        label: "Two instances behind a round-robin proxy: in-memory sessions vs a shared store",
        tech: "javascript",
        runnable: false,
        code: `// Horizontal scaling breaks in-process state. Two instances behind a round-robin balancer.
const http = require("node:http");

function makeInstance(name, store) {
  return http.createServer((req, res) => {
    const sid = (req.headers.cookie || "").replace("sid=", "");
    if (req.url === "/login") {
      const id = Math.random().toString(36).slice(2);
      store.set(id, { user: "alice" });
      res.setHeader("set-cookie", \`sid=\${id}\`);
      return res.end(\`\${name}: logged in\`);
    }
    const s = store.get(sid);
    res.statusCode = s ? 200 : 401;
    res.end(\`\${name}: \${s ? "hello " + s.user : "who are you?"}\`);
  });
}

function balancer(ports) {                   // tiny round-robin reverse proxy
  let next = 0;
  return http.createServer((req, res) => {
    const port = ports[next++ % ports.length];
    const up = http.request({ port, path: req.url, method: req.method, headers: req.headers }, (r) => {
      res.writeHead(r.statusCode, r.headers); r.pipe(res);
    });
    req.pipe(up);
  });
}

const listen = (s) => new Promise((r) => s.listen(0, () => r(s.address().port)));
const call = (port, path, cookie) => new Promise((r) => http.get({ port, path, headers: cookie ? { cookie } : {} }, (res) => {
  let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => r({ status: res.statusCode, body: b, cookie: res.headers["set-cookie"]?.[0] }));
}));

async function run(label, storeA, storeB) {
  const a = makeInstance("A", storeA), b = makeInstance("B", storeB);
  const lb = balancer([await listen(a), await listen(b)]);
  const port = await listen(lb);
  const login = await call(port, "/login");
  console.log(\`--- \${label}\\n\${login.body}\`);
  for (let i = 0; i < 3; i++) { const r = await call(port, "/me", login.cookie); console.log(r.status, r.body); }
  for (const s of [a, b, lb]) s.close();
}

(async () => {
  await run("each instance keeps sessions in its own Map", new Map(), new Map());
  const shared = new Map();                  // stands in for Redis / a database
  await run("both instances use one shared store", shared, shared);
})();`,
      },
      {
        label: "Read V8's heap limit with and without --max-old-space-size",
        tech: "bash",
        runnable: false,
        code: `# Vertical scaling of memory is a flag, not just a bigger box: V8 caps the heap.
node -e "console.log('default heap limit', Math.round(require('v8').getHeapStatistics().heap_size_limit/1048576), 'MB; machine RAM', Math.round(require('os').totalmem()/1048576), 'MB')"
for m in 256 1024; do
  node --max-old-space-size=$m -e "console.log('--max-old-space-size=$m -> heap limit', Math.round(require('v8').getHeapStatistics().heap_size_limit/1048576), 'MB')"
done`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does GraphQL compare to REST when building a Node.js backend?",
    seoDescription:
      "GraphQL lets clients pick fields in one request; REST keeps HTTP caching and status codes. Measured: round trips, bytes, error codes and N+1 calls.",
    description: `**Question presented to candidate:**
"We are starting a new Node.js backend that will serve a web app, two mobile apps and a few partner integrations. The team is split between REST and GraphQL. Compare them for this situation: what does each do well, what does each make harder on the server, and which would you choose?"

**What a strong answer should cover:**
- REST models resources as URLs with HTTP verbs; the server fixes each response shape. GraphQL exposes one endpoint and a typed schema; the client asks for exactly the fields it needs, including nested data, in one request.
- The client-side win of GraphQL: no over-fetching (fields you do not use) and no under-fetching (extra round trips for related data). That matters most for many different clients and mobile networks.
- The server-side costs: resolvers per field, the N+1 query problem (fixed with batching such as DataLoader), protecting against expensive queries (depth and complexity limits, persisted queries), and authorisation per field rather than per route.
- HTTP semantics REST gets for free and GraphQL does not: URL-based caching by browsers and CDNs, status codes per resource (a missing item is often \`200\` with \`null\` and an \`errors\` array in GraphQL), simple file downloads and uploads, and per-endpoint metrics.
- A typed schema gives validation, introspection and generated client types; REST can get similar benefits from OpenAPI. Evolution differs: GraphQL adds fields and deprecates old ones, REST often versions URLs.
- A reasoned choice: REST for public or partner APIs, simple CRUD and cache-heavy reads; GraphQL as a gateway or backend-for-frontend when many clients need different shapes of related data. Running both is common.

**Clarifying questions expected:**
- "How many different clients, and how different are the data shapes they need per screen?"
- "Do we need CDN or HTTP caching for public reads, and do partners expect a conventional REST API?"

**Code / implementation expected:** Optional. A comparison that serves the same screen both ways and counts round trips, bytes and database calls is a strong way to back up the trade-offs.`,
    answer: `**Target Audience:** Backend engineers who have built REST APIs in Node.js and need to argue the REST vs GraphQL choice in a system design round.
**Difficulty:** Medium

> **How to read this doc:** Plain-language explanations first, then <code>📌 Interview term:</code> callouts with the vocabulary interviewers expect. The comparison below serves the same screen both ways from one Node.js server (built-in \`http\` plus the \`graphql\` package, v16.14.2) on Node v22.22.0; the round trips, byte counts, status codes and database-call counts are what the scripts printed.

## 1. Why This Even Matters — A Story First

Two ways to order lunch. At the first cafe there is a fixed menu: "Sandwich combo" comes with a sandwich, crisps, a drink and a cookie, every time. If you only wanted the sandwich, you still carry the rest (over-fetching). If you also wanted soup, that is a second trip to the counter (under-fetching). But the kitchen is fast and predictable, and the cafe next door can stack ready-made combos on a shelf for anyone who walks in (caching).

At the second cafe you fill in a form: "sandwich, no crisps, plus a soup". You get exactly what you asked for in one trip. The price is a busier kitchen: it has to understand every form, some customers order things that take the kitchen an hour, and nothing can be pre-made on a shelf because every order is different.

The first cafe is **REST**, the second is **GraphQL**. Neither is better in general; the interview question is which kitchen fits your customers.

## 2. The Core Distinction

📌 **Interview term: REST** — an API style where each resource has a URL (\`/users/1\`, \`/users/1/posts\`) and you act on it with HTTP methods (\`GET\`, \`POST\`, \`PUT\`, \`DELETE\`). The server decides the shape of each response.

📌 **Interview term: GraphQL** — a query language and runtime where the server publishes a typed **schema**, the client sends a **query** naming exactly the fields it wants (usually as a \`POST\` to one \`/graphql\` endpoint), and **resolver** functions on the server fetch each field.

📌 **Interview term: over-fetching / under-fetching** — receiving fields you do not use, or needing extra requests to get related data you do use.

| | REST | GraphQL |
| :--- | :--- | :--- |
| Endpoints | Many: one per resource | Usually one: \`/graphql\` |
| Who shapes the response | Server, per endpoint | Client, per query |
| Related data | Extra requests or custom "include" parameters | Nested in one query |
| Contract | Implicit, or OpenAPI if you write it | Schema is required and introspectable |
| Errors | HTTP status codes per resource | Usually \`200\`, with an \`errors\` array and \`null\` fields |
| HTTP caching / CDN | Works out of the box for \`GET\` by URL | Needs \`GET\` queries or persisted queries; often client-side cache instead |
| Main server risk | Many endpoints to maintain, chatty clients | N+1 resolver calls, expensive client-written queries |
| Evolution | New versions (\`/v2\`) or additive changes | Add fields, mark old ones \`@deprecated\` |
| Real-time | SSE / WebSockets alongside | Subscriptions in the spec (transport still WebSockets or SSE) |
| Files | Native: streams, \`Content-Type\`, ranges | Awkward; usually a separate REST upload/download endpoint |

## 3. Working Example: The Same Screen, Both Ways

The screen shows a user's name and the titles of their posts. The first example runs one Node server with both styles on the same in-memory data:

~~~js
// REST: one URL per resource, the server decides the shape
const routes = {
  "/users/1": () => q(() => db.users[0]),
  "/users/1/posts": () => q(() => db.posts.filter((p) => p.authorId === "1")),
};

// GraphQL: one URL, the client decides the shape
const schema = buildSchema(\`
  type Post { id: ID! title: String! body: String! tags: [String!]! }
  type User { id: ID! name: String! email: String! bio: String! posts: [Post!]! }
  type Query { user(id: ID!): User, users: [User!]! }
\`);
// client sends: { user(id: "1") { name posts { title } } }
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="REST makes two round trips to two URLs and receives every field, GraphQL makes one round trip to one URL and receives only the requested fields">
  <defs>
    <marker id="gq-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="160" y="24" text-anchor="middle">REST</text>
  <text class="d-text" x="480" y="24" text-anchor="middle">GraphQL</text>
  <rect class="d-box-muted" x="40" y="44" width="240" height="40" rx="8"/>
  <text class="d-sub" x="160" y="69" text-anchor="middle">GET /users/1</text>
  <rect class="d-box-muted" x="40" y="114" width="240" height="40" rx="8"/>
  <text class="d-sub" x="160" y="139" text-anchor="middle">GET /users/1/posts</text>
  <rect class="d-box" x="40" y="184" width="240" height="44" rx="8"/>
  <text class="d-text" x="160" y="211" text-anchor="middle">2 trips, 1430 bytes</text>
  <path class="d-edge" d="M 160 84 L 160 108" marker-end="url(#gq-arrow)"/>
  <path class="d-edge" d="M 160 154 L 160 178" marker-end="url(#gq-arrow)"/>
  <rect class="d-box-muted" x="360" y="44" width="240" height="110" rx="8"/>
  <text class="d-sub" x="480" y="80" text-anchor="middle">POST /graphql</text>
  <text class="d-sub" x="480" y="104" text-anchor="middle">user name</text>
  <text class="d-sub" x="480" y="126" text-anchor="middle">posts title</text>
  <rect class="d-box-accent" x="360" y="184" width="240" height="44" rx="8"/>
  <text class="d-text d-accent" x="480" y="211" text-anchor="middle">1 trip, 84 bytes</text>
  <path class="d-edge" d="M 480 154 L 480 178" marker-end="url(#gq-arrow)"/>
</svg>

REST needed two requests in sequence and returned every column; GraphQL needed one request and returned only the two fields the screen uses.

## 4. Verified: Running the Code

~~~text
REST:    2 round trips, 1430 bytes received, 2 db calls
  fields used: name + titles; fields sent: 10
GraphQL: 1 round trip,  84 bytes received, 2 db calls
  response: {"data":{"user":{"name":"Alice","posts":[{"title":"Streams"},{"title":"Cluster"}]}}}
  typo in query -> Cannot query field "nam" on type "User". Did you mean "name"?
REST    GET /users/99 -> HTTP 404
GraphQL user(id: 99)  -> HTTP 200 {"data":{"user":null}}
GraphQL users + posts for 3 users -> 4 db calls (1 + N)
~~~

Reading it top to bottom:

- **Round trips and bytes.** REST took 2 sequential requests and 1,430 bytes, because each endpoint returned all 10 fields (bio, email, post bodies, tags) when the screen used 2. GraphQL took 1 request and 84 bytes. On a phone with 200 ms of latency, that second sequential round trip alone is the difference users feel.
- **Database calls were the same (2).** GraphQL did not make the server do less work here; it moved the decision about what to return to the client. The bytes saved are network, not database.
- **Validation for free.** The typo \`nam\` was rejected by the schema before any resolver ran, with a suggestion. In REST, an unknown query parameter is usually silently ignored unless you add validation.
- **Missing data looks different.** REST answered \`404\`. GraphQL answered \`200\` with \`{"user": null}\`, because a null field is a valid result. Monitoring, retries and CDNs that rely on status codes see a success. You need to inspect the body, and GraphQL servers usually report real failures in an \`errors\` array alongside partial \`data\`.
- **The 1 + N pattern.** Asking for every user plus their posts made 4 database calls for 3 users: one for the list, then one per user from the \`posts\` resolver.

📌 **Interview term: N+1 problem** — a list query runs one query for the list and then one more per item, because each item's resolver runs separately. The deep dive is in [building a GraphQL API and the N+1 problem](/interview-question/how-do-you-build-a-graphql-api-in-node-js-and-what-is-the-n-1-problem); the short version is the second example.

## 5. Fixing N+1 With Batching

The second example collects every \`posts\` lookup requested in the same tick and runs one \`IN (...)\` query for all of them, which is the idea behind the \`dataloader\` package:

~~~js
function batchLoader(loadMany) {
  let queue = null;
  return (key) => new Promise((resolve) => {
    if (!queue) {
      queue = [];
      process.nextTick(async () => {
        const batch = queue; queue = null;
        const rows = await loadMany(batch.map((b) => b.key));
        for (const b of batch) b.resolve(rows.filter((r) => r.authorId === b.key));
      });
    }
    queue.push({ key, resolve });
  });
}
~~~

~~~text
--- naive resolver: 4 queries
  SELECT * FROM users
  SELECT * FROM posts WHERE author_id = 1
  SELECT * FROM posts WHERE author_id = 2
  SELECT * FROM posts WHERE author_id = 3
--- batched resolver: 2 queries
  SELECT * FROM users
  SELECT * FROM posts WHERE author_id IN (1, 2, 3)
same result: true {"users":[{"name":"Alice","posts":[{"title":"Streams"},{"title":"Cluster"}]},{"name":"Bob","posts":[]},{"name":"Cara","posts":[{"title":"QUIC"}]}]}
~~~

Four queries became two with an identical result. The batch works because GraphQL calls all three \`posts\` resolvers before any of their promises resolve, so all three keys are queued before the \`nextTick\` callback runs. Create the loader **per request**, so one user's cached rows never leak into another user's response.

REST has its own version of this problem, just moved to the client: a screen listing 20 users that calls \`/users/:id/posts\` for each makes 21 HTTP requests. REST teams solve it with purpose-built endpoints or \`?include=posts\`; GraphQL teams solve it with batching in resolvers.

## 6. What GraphQL Makes Harder on a Node Server

- **Expensive queries.** Clients write the queries, so one request can ask for users, their posts, each post's comments, each comment's author... Protect the server with a maximum query depth, a complexity or cost limit, timeouts and pagination limits on lists. For first-party apps, **persisted queries** (the client sends a hash of a query the server already knows) shut the door on arbitrary queries entirely.
- **Authorisation per field.** In REST you guard a route. In GraphQL the same \`User.email\` field can be reached from many queries, so checks belong in the resolvers or the business layer they call, not only at the endpoint.
- **Caching.** Browsers and CDNs cache \`GET\` by URL. A \`POST /graphql\` body is not a cache key, so GraphQL APIs lean on client caches (Apollo, urql, Relay normalise by \`id\`), server-side resolver caching, or \`GET\` with persisted query hashes so a CDN can help again.
- **Observability.** Every request is \`POST /graphql\` returning \`200\`, so per-endpoint dashboards stop working. You need tracing per operation name and per resolver.
- **Event loop cost.** Parsing, validating and walking a large query and response is CPU work on the main thread. Very large responses can block other requests; cap list sizes and cache parsed documents.

## 7. What REST Makes Harder

- **Many clients, many shapes.** A web dashboard, a mobile list and a partner integration all want different fields. REST ends up with several near-duplicate endpoints, \`fields=\` and \`include=\` parameters, or a backend-for-frontend per client.
- **Chatty screens.** Related data means sequential round trips, as the run above showed.
- **Contract drift.** Without OpenAPI and validation, the shape of each endpoint lives in code and docs that drift apart. GraphQL's schema is the contract and generates client types.
- **Versioning.** Breaking changes push REST toward \`/v2\` ([API versioning](/interview-question/how-would-you-approach-versioning-a-node-js-rest-api)); GraphQL usually adds new fields and deprecates old ones instead, though removing a field still needs a usage check.

## 8. Choosing for the Prompt

For the prompt's mix of a web app, two mobile apps and partner integrations, a common and defensible answer is **both**:

- **GraphQL as the gateway for your own apps**, where many screens need different shapes of related data and you control the clients (so persisted queries are possible).
- **REST for partners and public endpoints**, because partners expect conventional URLs, status codes, rate limits per endpoint and HTTP caching, and they should not be able to write arbitrary queries against your database.
- **REST (or signed URLs) for files**, whichever style the rest uses.

If the team is small, the API is mostly simple CRUD, and responses are cache-heavy public reads, REST alone with OpenAPI is the simpler, safer choice. The Node ecosystem supports both well: Express, Fastify or the built-in \`http\` for REST; Apollo Server, GraphQL Yoga or Mercurius (Fastify) for GraphQL, all built on the reference \`graphql\` package used here.

## 9. Common Pitfalls

- **Assuming GraphQL reduces database load.** The run above made the same 2 database calls; GraphQL saved bytes and round trips, not queries. Naive resolvers can make it worse, as the 1 + N run showed.
- **Shipping GraphQL without query limits.** Without depth, complexity and list-size limits, one nested query can tie up the event loop and the database.
- **Relying on HTTP status codes for GraphQL errors.** A missing user came back as \`200\` with \`null\`. Alert on the \`errors\` array and on null critical fields, not just on 5xx.
- **Creating one DataLoader for the whole process.** Its cache then serves one user's data to another and never expires. Create loaders per request.
- **Exposing the database schema as the GraphQL schema.** Auto-generated schemas leak internal columns and lock you into table design. Design the schema around what clients need.
- **Rebuilding REST in GraphQL or GraphQL in REST.** Endless \`include=\` and \`fields=\` parameters suggest GraphQL would fit; a GraphQL schema of one query per screen with no nesting suggests REST would have been simpler.

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define the difference:</strong> <span style="color:#f0e2c8;">"REST exposes resources at URLs and the server fixes each response shape. GraphQL exposes one endpoint and a typed schema, and the client asks for exactly the fields it needs, including nested data, in one request."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Quantify the client win:</strong> <span style="color:#f0e2c8;">"For a user-plus-post-titles screen I measured REST at 2 round trips and 1,430 bytes versus GraphQL at 1 round trip and 84 bytes. That matters most for many clients and mobile networks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Be honest about server cost:</strong> <span style="color:#f0e2c8;">"GraphQL moves complexity to the server: resolvers per field, the N+1 problem, which I saw as 4 database calls for 3 users and fixed to 2 with batching, plus query cost limits and per-field authorisation."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name what REST gets for free:</strong> <span style="color:#f0e2c8;">"HTTP caching by URL and CDNs, meaningful status codes (a missing user was <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">404</code> in REST and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">200</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">null</code> in GraphQL), simple file transfer, and per-endpoint monitoring."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Make a decision:</strong> <span style="color:#f0e2c8;">"For many first-party clients with varied screens, GraphQL as a gateway with persisted queries; for partners, public cacheable reads and simple CRUD, REST with OpenAPI. Running both is normal."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you cache GraphQL responses if every request is a POST to one URL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At several layers. On the client, normalised caches (Apollo Client, Relay, urql) store objects by type and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">id</code>, so different queries reuse the same records. On the server, cache resolver results or the data layer under them, with per-request DataLoader caching to dedupe within a request. For the CDN, send queries as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">GET</code> with <strong style="color:#ffca28;">persisted query</strong> hashes in the URL, which turns them back into cacheable URLs, and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">Cache-Control</code> based on the most restrictive field in the response.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop a client from sending a query that takes down the server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Combine limits: maximum query depth, a cost or complexity score per field with a per-request budget, mandatory pagination arguments with maximum page sizes, a timeout per operation, and rate limits by cost rather than by request count. For first-party apps, allow only persisted queries in production so arbitrary queries are rejected outright. Also disable or restrict introspection on public endpoints if the schema should not be discoverable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is GraphQL faster than REST?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not inherently. It often feels faster to users because one round trip replaces several and the payload is smaller, as the 84-byte versus 1,430-byte run showed. On the server it can be slower: query parsing and validation cost CPU, resolvers can trigger N+1 queries, and you lose CDN caching unless you add persisted queries. A well-designed REST endpoint for a specific screen can match GraphQL on the network and beat it on caching.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does error handling differ?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">REST uses the status code per request: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">404</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">401</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">422</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">500</code>. GraphQL usually returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">200</code> for anything that parsed and validated, with partial <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">data</code> and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">errors</code> array listing what failed and where (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">path</code>), so one failing field does not discard the rest of the response. Clients and monitoring must read the body. Many teams also model expected failures (not found, validation) as typed results in the schema, such as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">UserResult</code> union, instead of generic errors.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does authorisation go in a GraphQL server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Authenticate once per request (read the token or session and put the user on the context object). Authorise close to the data: in the business-logic functions that resolvers call, or with field-level rules, because the same field can be reached through many query paths. Checking only at the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">/graphql</code> endpoint is the GraphQL version of protecting the front door and leaving every room unlocked.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **REST** | Resources at URLs, acted on with HTTP methods; server-defined response shapes |
| **GraphQL** | Typed schema plus client-written queries, usually over one endpoint |
| **Schema** | The typed description of every type and field a GraphQL API offers |
| **Resolver** | Server function that produces the value of one field |
| **Over-fetching / under-fetching** | Getting unused fields / needing extra requests for related data |
| **N+1 problem** | One query for a list, then one more per item |
| **DataLoader (batching)** | Collects lookups made in the same tick and runs one query for all |
| **Persisted query** | A pre-registered query the client calls by hash; enables \`GET\` caching and blocks arbitrary queries |
| **Introspection** | Asking a GraphQL server for its own schema |

---
**Conclusion:** REST and GraphQL are two answers to who decides the shape of a response. REST lets the server decide, per URL, and in return keeps everything HTTP already does well: caching by URL, status codes, simple files and per-endpoint metrics. GraphQL lets the client decide, which in the run above turned 2 round trips and 1,430 bytes into 1 round trip and 84 bytes, but it moves work onto the Node server: resolvers, N+1 queries (4 calls cut to 2 with batching), query cost limits, per-field authorisation, and errors hidden behind a \`200\`. Pick GraphQL when many clients you control need different views of related data; pick REST for partners, public cacheable reads and simple CRUD; and say plainly that running both is often the best design.
`,
    examples: [
      {
        label: "One Node server, same screen served via REST and GraphQL: round trips, bytes, validation, status codes and 1 + N db calls",
        tech: "javascript",
        runnable: false,
        code: `// The same screen ("a user's name + the titles of their posts") built with REST and with GraphQL.
const http = require("node:http");
const { buildSchema, graphql } = require("graphql"); // npm i graphql@16

const db = {
  users: [
    { id: "1", name: "Alice", email: "alice@example.com", bio: "x".repeat(200), createdAt: "2024-01-01" },
    { id: "2", name: "Bob", email: "bob@example.com", bio: "x".repeat(200), createdAt: "2024-02-01" },
    { id: "3", name: "Cara", email: "cara@example.com", bio: "x".repeat(200), createdAt: "2024-03-01" },
  ],
  posts: [
    { id: "p1", authorId: "1", title: "Streams", body: "y".repeat(500), tags: ["node"] },
    { id: "p2", authorId: "1", title: "Cluster", body: "y".repeat(500), tags: ["node"] },
  ],
};
let dbCalls = 0;
const q = (fn) => { dbCalls++; return fn(); };

// ---- REST: one URL per resource, the server decides the shape
const routes = {
  "/users/1": () => q(() => db.users[0]),
  "/users/1/posts": () => q(() => db.posts.filter((p) => p.authorId === "1")),
};

// ---- GraphQL: one URL, the client decides the shape
const schema = buildSchema(\`
  type Post { id: ID! title: String! body: String! tags: [String!]! }
  type User { id: ID! name: String! email: String! bio: String! posts: [Post!]! }
  type Query { user(id: ID!): User, users: [User!]! }
\`);
const withPosts = (u) => ({ ...u, posts: () => q(() => db.posts.filter((p) => p.authorId === u.id)) });
const root = {
  user: ({ id }) => { const u = q(() => db.users.find((x) => x.id === id)); return u && withPosts(u); },
  users: () => q(() => db.users).map(withPosts),
};

const server = http.createServer(async (req, res) => {
  res.setHeader("content-type", "application/json");
  if (req.url === "/graphql" && req.method === "POST") {
    let body = ""; for await (const c of req) body += c;
    const { query } = JSON.parse(body);
    return res.end(JSON.stringify(await graphql({ schema, source: query, rootValue: root })));
  }
  const handler = routes[req.url];
  res.statusCode = handler ? 200 : 404;
  res.end(JSON.stringify(handler ? handler() : { error: "not found" }));
});

function send(port, method, path, body) {
  return new Promise((resolve) => {
    const r = http.request({ port, method, path, headers: { "content-type": "application/json" } }, (res) => {
      let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => resolve(b));
    });
    r.end(body);
  });
}

server.listen(0, async () => {
  const port = server.address().port;

  dbCalls = 0;
  const user = await send(port, "GET", "/users/1");
  const posts = await send(port, "GET", "/users/1/posts");
  console.log(\`REST:    2 round trips, \${user.length + posts.length} bytes received, \${dbCalls} db calls\`);
  console.log("  fields used: name + titles; fields sent:", Object.keys(JSON.parse(user)).length + Object.keys(JSON.parse(posts)[0]).length);

  dbCalls = 0;
  const gql = await send(port, "POST", "/graphql", JSON.stringify({ query: \`{ user(id: "1") { name posts { title } } }\` }));
  console.log(\`GraphQL: 1 round trip,  \${gql.length} bytes received, \${dbCalls} db calls\`);
  console.log("  response:", gql);

  const bad = await send(port, "POST", "/graphql", JSON.stringify({ query: \`{ user(id: "1") { nam } }\` }));
  console.log("  typo in query ->", JSON.parse(bad).errors[0].message);

  // Missing data: REST says it in the status code, GraphQL says it in the body.
  const status = (method, path, body) => new Promise((r) => {
    const x = http.request({ port, method, path }, (s) => { s.resume(); r(s.statusCode); }); x.end(body);
  });
  console.log("REST    GET /users/99 -> HTTP", await status("GET", "/users/99"));
  const q99 = JSON.stringify({ query: \`{ user(id: "99") { name } }\` });
  console.log("GraphQL user(id: 99)  -> HTTP", await status("POST", "/graphql", q99), await send(port, "POST", "/graphql", q99));

  // Nested lists: one resolver call per parent row unless you batch (the N+1 problem).
  dbCalls = 0;
  await send(port, "POST", "/graphql", JSON.stringify({ query: "{ users { name posts { title } } }" }));
  console.log(\`GraphQL users + posts for \${db.users.length} users -> \${dbCalls} db calls (1 + N)\`);
  server.close();
});`,
      },
      {
        label: "Fixing the GraphQL N+1 problem with a per-request batch loader (the DataLoader idea)",
        tech: "javascript",
        runnable: false,
        code: `// Fixing the 1 + N resolver calls with per-request batching (the idea behind DataLoader).
const { buildSchema, graphql } = require("graphql"); // npm i graphql@16

const users = [{ id: "1", name: "Alice" }, { id: "2", name: "Bob" }, { id: "3", name: "Cara" }];
const posts = [{ authorId: "1", title: "Streams" }, { authorId: "1", title: "Cluster" }, { authorId: "3", title: "QUIC" }];
const log = [];
const db = {
  allUsers: async () => { log.push("SELECT * FROM users"); return users; },
  postsByAuthor: async (id) => { log.push(\`SELECT * FROM posts WHERE author_id = \${id}\`); return posts.filter((p) => p.authorId === id); },
  postsByAuthors: async (ids) => { log.push(\`SELECT * FROM posts WHERE author_id IN (\${ids.join(", ")})\`); return posts.filter((p) => ids.includes(p.authorId)); },
};

// Collect every key asked for in the same tick, then run ONE query for all of them.
function batchLoader(loadMany) {
  let queue = null;
  return (key) => new Promise((resolve) => {
    if (!queue) {
      queue = [];
      process.nextTick(async () => {
        const batch = queue; queue = null;
        const rows = await loadMany(batch.map((b) => b.key));
        for (const b of batch) b.resolve(rows.filter((r) => r.authorId === b.key));
      });
    }
    queue.push({ key, resolve });
  });
}

const schema = buildSchema(\`
  type Post { title: String! }
  type User { name: String! posts: [Post!]! }
  type Query { users: [User!]! }
\`);
const query = "{ users { name posts { title } } }";

async function run(label, postsFor) {
  log.length = 0;
  const rootValue = { users: async () => (await db.allUsers()).map((u) => ({ ...u, posts: () => postsFor(u.id) })) };
  const res = await graphql({ schema, source: query, rootValue });
  console.log(\`--- \${label}: \${log.length} queries\`);
  log.forEach((l) => console.log("  " + l));
  return JSON.stringify(res.data);
}

(async () => {
  const a = await run("naive resolver", (id) => db.postsByAuthor(id));
  const loader = batchLoader(db.postsByAuthors);  // create one per request in a real server
  const b = await run("batched resolver", (id) => loader(id));
  console.log("same result:", a === b, a);
})();`,
      },
    ],
  },

];

export default augments;
