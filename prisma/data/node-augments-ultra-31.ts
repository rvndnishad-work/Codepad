/**
 * Node.js gap batch 31 — Streams, files, memory and native addons.
 *
 * Five questions that previously had only a thin one-paragraph answer,
 * brought to the same depth as node-augments-ultra-1 … -29. Titles copied
 * verbatim from prisma/data/question-bank.json.
 *
 * Verified in this batch, executed on this machine (Node v22.22.0, 16 GB RAM):
 *   - Streams: a custom Readable -> Transform -> Writable pipeline printed
 *     "2,4,6,8,10"; a custom Duplex showed its write side and read side are
 *     independent; instanceof checks confirmed Transform is a Duplex and a
 *     Duplex is both Readable and Writable. Built-ins classified at runtime:
 *     fs read/write streams, net.Socket (Duplex), zlib.createGzip (Transform),
 *     and process.stdout (Duplex when piped, Writable when redirected to a
 *     file). Default byte-stream highWaterMark measured at 65536.
 *   - fs.readFile vs readFileSync: console.log ordering; a 512 MiB read froze a
 *     5ms heartbeat for 300-400ms with readFileSync versus a worst gap of ~7-10ms
 *     with readFile / fs.promises.readFile (which took longer in wall time);
 *     ENOENT surfaced via throw / callback err / rejection; a 3 GiB sparse
 *     file was refused by both with ERR_FS_FILE_TOO_LARGE.
 *   - --max-old-space-size: heap_size_limit measured for default (8240 MB),
 *     64, 512, 4096, NODE_OPTIONS, and with --max-semi-space-size; a
 *     never-evicting cache crashed with "Reached heap limit" (exit 134) at both
 *     a 64 MB and a 256 MB cap, with neither 'exit' nor 'uncaughtException'
 *     handlers running; 500 MB of Buffers ran fine under a 64 MB cap
 *     (off-heap memory). A command-line flag reached a fork() child but not a
 *     spawn(process.execPath) child; NODE_OPTIONS reached both; a flag after the
 *     script name had no effect. --heapsnapshot-near-heap-limit wrote a snapshot
 *     before the OOM. (Worker resourceLimits.maxOldGenerationSizeMb did NOT
 *     change the worker heap_size_limit on Node 20/22/24 here, so the doc makes
 *     no claim about it.)
 *   - Native addons: a C Node-API addon was compiled with node-gyp and the
 *     SAME .node file loaded on Node 20.20.2, 22.22.0 and 24.22.0, while a raw
 *     V8-API (node.h) addon built on 22 failed on 20 and 24 with
 *     NODE_MODULE_VERSION mismatch (ERR_DLOPEN_FAILED). Timings: the C loop
 *     was roughly level with V8-JIT JavaScript (int64 C was slower), 10M trivial
 *     native calls cost tens of times the JS equivalent, a sync native call delayed a
 *     10ms timer by 600-700ms, and napi_create_async_work kept the loop ticking.
 *   - HTTPS/TLS: a private CA + SAN cert made with openssl; https.get failed
 *     with UNABLE_TO_VERIFY_LEAF_SIGNATURE without the CA, succeeded on TLS 1.3
 *     with it, failed with ERR_TLS_CERT_ALTNAME_INVALID on a name mismatch, a
 *     TLS1.3-only server rejected a TLS1.2 client (EPROTO); setSecureContext
 *     swapped a renewed cert without a restart; plain HTTP to the TLS port got
 *     ECONNRESET; mutual TLS refused a client with no certificate
 *     (ERR_SSL_TLSV13_ALERT_CERTIFICATE_REQUIRED) and accepted a CA-signed one.
 *     SNICallback saw the client SNI name; NODE_EXTRA_CA_CERTS made a request
 *     with no "ca" option succeed. tls.DEFAULT_MIN_VERSION read at runtime as
 *     TLSv1.2.
 *
 * Version facts checked via web search, not asserted from memory:
 *   - Default stream highWaterMark raised from 16 KiB to 64 KiB in Node 22
 *     (nodejs/node PR #52037, per secondary sources; also measured here).
 *   - Node-API (N-API) shipped experimental in Node 8.0.0 and is marked
 *     Stability 2 - Stable in the Node 10 docs.
 *   - Node derives its default heap from cgroup/container limits (Red Hat,
 *     Node 20); the exact default cap differs by version, so the doc tells the
 *     reader to measure heap_size_limit rather than quoting a fixed number.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are the different types of Streams in Node.js (Readable, Writable, Duplex, Transform)?",
    seoDescription:
      "Readable, Writable, Duplex and Transform streams explained with a verified pipeline, a Duplex whose two sides stay independent, and real built-in examples.",
    description: `**Question presented to candidate:**
"Node has four base stream classes: Readable, Writable, Duplex and Transform. Walk me through what each one is for, give me a real built-in example of each, and tell me how a Duplex differs from a Transform, since both can be read from and written to."

**What a strong answer should cover:**
- **Readable** is a source you consume (\`fs.createReadStream\`, an HTTP request on the server), **Writable** is a sink you write into (\`fs.createWriteStream\`, an HTTP response), and the classes you extend implement \`_read()\` / \`_write()\`.
- **Duplex** has two **independent** channels in one object: what you write does not come back out of the readable side. A TCP \`net.Socket\` is the classic example: you write a request, and the server's reply arrives on the readable side.
- **Transform** is a Duplex whose output is **computed from its input** (\`zlib.createGzip()\`, a CSV parser). You implement only \`transform(chunk, enc, callback)\`.
- The class relationships: \`Transform\` extends \`Duplex\`, and a Duplex passes \`instanceof\` for both \`Readable\` and \`Writable\`.
- Every stream buffers up to a \`highWaterMark\` (bytes, or objects in \`objectMode\`), which is what makes **backpressure** work. Chain streams with \`stream.pipeline()\` so errors and cleanup are handled.
- Bonus: \`objectMode\` streams carry JavaScript objects instead of Buffers, and \`Readable.from(iterable)\` turns arrays or async generators into a Readable.

**Clarifying questions expected:**
- "Are we talking about Node's classic \`node:stream\` classes or the Web Streams API (\`ReadableStream\`/\`WritableStream\`)?"
- "Does the data being processed fit in memory, or is the point to handle something larger than RAM?"

**Code / implementation expected:** Optional but strong: a few lines building a Readable -> Transform -> Writable pipeline, and naming \`net.Socket\` as the real-world Duplex.`,
    answer: `**Target Audience:** Engineers preparing for Node.js interviews who have used \`fs\` or \`http\` but have never written a stream class themselves.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer expects. Every code sample below was run with Node v22.22.0 and the output shown is what it printed.

If you have not met streams at all yet, start with [What are Node.js Streams and when would you use them?](/interview-question/what-are-node-js-streams-and-when-would-you-use-them). This page is about the **four kinds** and how they relate.

## 1. Why This Even Matters — A Story First

Picture a small juice bar.

- The **fruit crate** only gives things out. You take oranges from it one at a time.
- The **bin** only takes things in. You drop peel into it.
- The **juicer** takes oranges in one end and pushes juice out the other. What comes out is made from what went in.
- The **telephone** on the counter has a mouthpiece and an earpiece. You talk into one and listen on the other, but your own words do not come back out of the earpiece. Someone else's words do.

Those are the four stream types: the crate is a **Readable**, the bin is a **Writable**, the juicer is a **Transform**, and the telephone is a **Duplex**. People mix up the last two all the time, because both have an "in" and an "out". The difference is whether the out is *made from* the in.

## 2. The Four Types in Plain Language

📌 **Interview term: Readable stream** — a source of data you consume chunk by chunk. You get data with \`for await\`, \`.on("data")\`, or by piping it somewhere. To build one, extend \`Readable\` and implement \`_read()\`, calling \`this.push(chunk)\` for data and \`this.push(null)\` for "no more".

📌 **Interview term: Writable stream** — a destination you send data into with \`.write(chunk)\` and finish with \`.end()\`. To build one, implement \`_write(chunk, encoding, callback)\` and call \`callback()\` when you are ready for the next chunk.

📌 **Interview term: Duplex stream** — one object with a readable side **and** a writable side that work **independently**. Writing does not feed the readable side. A network socket is the textbook example.

📌 **Interview term: Transform stream** — a special Duplex where the readable output is **computed from** the writable input. You implement just \`transform(chunk, encoding, callback)\` and pass the result to the callback. Gzip, encryption and parsers are transforms.

| Type | Direction | You implement | Built-in example | Juice-bar picture |
| :--- | :--- | :--- | :--- | :--- |
| Readable | out only | \`_read()\` | \`fs.createReadStream\`, \`http.IncomingMessage\` | fruit crate |
| Writable | in only | \`_write()\` | \`fs.createWriteStream\`, \`zlib\`/\`crypto\` inputs, \`process.stdout\` (to a file) | bin |
| Duplex | in and out, unrelated | \`_read()\` and \`_write()\` | \`net.Socket\` | telephone |
| Transform | in, then derived out | \`transform()\` | \`zlib.createGzip()\`, \`crypto.createCipheriv()\` | juicer |

## 3. Duplex vs Transform, Drawn

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="A Duplex stream has a writable side and a readable side that are not connected to each other, like the two ends of a telephone call">
  <defs>
    <marker id="s4-arrow-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="24" text-anchor="middle">Duplex: two independent channels</text>
  <rect class="d-box-muted" x="20" y="56" width="140" height="44" rx="8"/>
  <text class="d-sub" x="90" y="83" text-anchor="middle">your code writes</text>
  <path class="d-edge-accent" d="M 160 78 L 236 78" marker-end="url(#s4-arrow-a)"/>
  <rect class="d-box-accent" x="244" y="46" width="152" height="140" rx="10"/>
  <text class="d-text d-accent" x="320" y="72" text-anchor="middle">net.Socket</text>
  <text class="d-sub" x="320" y="102" text-anchor="middle">write side</text>
  <text class="d-sub" x="320" y="160" text-anchor="middle">read side</text>
  <path class="d-edge-accent" d="M 396 78 L 472 78" marker-end="url(#s4-arrow-a)"/>
  <rect class="d-box" x="480" y="56" width="140" height="44" rx="8"/>
  <text class="d-sub" x="550" y="83" text-anchor="middle">to the server</text>
  <rect class="d-box" x="480" y="134" width="140" height="44" rx="8"/>
  <text class="d-sub" x="550" y="161" text-anchor="middle">from the server</text>
  <path class="d-edge-accent" d="M 480 156 L 404 156" marker-end="url(#s4-arrow-a)"/>
  <path class="d-edge-accent" d="M 244 156 L 168 156" marker-end="url(#s4-arrow-a)"/>
  <rect class="d-box-muted" x="20" y="134" width="140" height="44" rx="8"/>
  <text class="d-sub" x="90" y="161" text-anchor="middle">your code reads</text>
</svg>

The bytes you write go one way; the bytes you read came from somewhere else entirely. Nothing inside the socket connects the two sides.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 150" role="img" aria-label="A Transform stream takes chunks in on its writable side, runs a transform function, and pushes the result out of its readable side">
  <defs>
    <marker id="s4-arrow-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="24" text-anchor="middle">Transform: output is computed from input</text>
  <rect class="d-box-muted" x="20" y="56" width="150" height="56" rx="8"/>
  <text class="d-sub" x="95" y="80" text-anchor="middle">write: plain text</text>
  <text class="d-sub" x="95" y="100" text-anchor="middle">chunk in</text>
  <path class="d-edge-accent" d="M 170 84 L 236 84" marker-end="url(#s4-arrow-b)"/>
  <rect class="d-box-accent" x="244" y="46" width="152" height="76" rx="10"/>
  <text class="d-text d-accent" x="320" y="78" text-anchor="middle">zlib.createGzip()</text>
  <text class="d-sub" x="320" y="102" text-anchor="middle">transform(chunk)</text>
  <path class="d-edge-accent" d="M 396 84 L 462 84" marker-end="url(#s4-arrow-b)"/>
  <rect class="d-box" x="470" y="56" width="150" height="56" rx="8"/>
  <text class="d-sub" x="545" y="80" text-anchor="middle">read: gzip bytes</text>
  <text class="d-sub" x="545" y="100" text-anchor="middle">chunk out</text>
</svg>

Here the output exists only because of the input. Stop writing, and the readable side runs dry.

## 4. Verified: All Four Types in One Script

The script below (the first example on this page) builds a custom Readable that counts 1 to 5, a Transform that doubles each number, a Writable that collects the result, and then a separate Duplex whose two sides do unrelated things.

~~~js
class Counter extends Readable {
  _read() {
    this.n += 1;
    this.push(this.n <= this.max ? \`\${this.n}\\n\` : null);   // null = end of stream
  }
}
const doubler = new Transform({
  transform(chunk, _enc, done) { done(null, \`\${Number(chunk.toString()) * 2}\\n\`); },
});
pipeline(new Counter(5), doubler, sink, (err) => { /* ... */ });
~~~

Output:

~~~text
pipeline finished, err = null
sink received: 2,4,6,8,10
duplex write side got: hello
Transform instanceof Duplex: true
Duplex instanceof Readable: true
Duplex instanceof Writable: true
Readable instanceof Writable: false
duplex read side emitted: unrelated server message
~~~

What this proves:

- The Transform turned \`1..5\` into \`2,4,6,8,10\`: its output was **derived from** its input.
- The Duplex received \`"hello"\` on its write side, and its read side emitted a completely **unrelated** message. Writing did not echo anything.
- \`Transform instanceof Duplex\` is \`true\`, and a Duplex passes \`instanceof\` for **both** Readable and Writable. A plain Readable is not a Writable.
- One ordering detail: the \`'data'\` line printed **after** all the synchronous \`console.log\` calls, even though \`push()\` ran earlier. Attaching a \`'data'\` listener switches the stream to flowing mode, and the first chunk is delivered on a later tick, not synchronously.

📌 **Interview term: \`stream.pipeline()\`** — connects streams in order, forwards errors from any stage to one callback, and destroys every stream on failure. It is the right default over \`.pipe()\`; see [Why is \`stream.pipeline()\` preferred over \`.pipe()\` for chaining streams?](/interview-question/why-is-stream-pipeline-preferred-over-pipe-for-chaining-streams).

## 5. Verified: Which Type Is Each Built-in?

Instead of trusting a table from memory, the second example asks each built-in what it is with \`instanceof\`, checking the most specific class first:

~~~text
fs.createReadStream  -> Readable
fs.createWriteStream -> Writable
process.stdout       -> Writable
net.Socket           -> Duplex
zlib.createGzip()    -> Transform
Readable.from([1,2]) -> Readable
~~~

That run had stdout redirected to a file. Running the same script with its output piped (\`node real-world.js | cat\`) printed:

~~~text
fs.createReadStream  -> Readable
fs.createWriteStream -> Writable
process.stdout       -> Duplex
net.Socket           -> Duplex
zlib.createGzip()    -> Transform
Readable.from([1,2]) -> Readable
~~~

A few more claims checked the same way (the HTTP one surprises people):

~~~text
threw ERR_INVALID_ARG_TYPE
Readable.fromWeb: function Readable.toWeb: function
req Readable: true | res Writable: false | res.write is fn: function | req.socket Duplex: true
~~~

The server-side request is a real Readable and its socket is a real Duplex, but the HTTP **response is not an instance of \`stream.Writable\`**. \`ServerResponse\` extends the older \`OutgoingMessage\` class, which has \`write()\`, \`end()\` and backpressure like a Writable, and works fine as the last stage of \`pipeline()\`, but it is not built on the \`Writable\` class. Saying "the response is Writable-like" is the precise version.

So \`process.stdout\` is not always the same class. Piped, it is a socket-like Duplex; sent to a file, it is a plain Writable. That is a nice detail to mention if an interviewer asks "what kind of stream is stdout?", because the honest answer is "it depends on where it points".

## 6. Object Mode and the highWaterMark

📌 **Interview term: \`highWaterMark\`** — how much a stream buffers before it signals "slow down". For byte streams it is counted in bytes; in **object mode** it is counted in objects. When a Writable's buffer passes it, \`write()\` returns \`false\`, which is how **backpressure** works. The full story is in [What is backpressure in Node.js streams and how do you handle it?](/interview-question/what-is-backpressure-in-node-js-streams-and-how-do-you-handle-it).

📌 **Interview term: \`objectMode\`** — a stream option that lets chunks be any JavaScript value instead of a Buffer or string. Great for pipelines of database rows or parsed records.

~~~text
Readable.from objectMode: true hwm: 1
default byte-stream hwm: 65536 bytes
{ id: 1, price: 10, total: 12 }
{ id: 2, price: 25, total: 30 }
{ id: 3, price: 40, total: 48 }
done
~~~

The default byte-stream \`highWaterMark\` measured here is **65536** bytes. That number changed: Node 22 raised the general default from 16 KiB to 64 KiB (nodejs/node PR #52037, as reported in the [Node.js 22 release roundup](https://dev.to/siddharth_g/nodejs-22-is-now-available-41m7)). On Node 20 and earlier you would see 16384, so do not quote a single number without the version.

## 7. Which One Do I Extend?

<details>
<summary>Click to expand: a quick decision guide</summary>

- **I produce data from somewhere** (a database cursor, an API that pages, a generator): extend \`Readable\`, or simply use \`Readable.from(asyncGenerator)\`.
- **I consume data and put it somewhere** (a bulk-insert into a database, an upload): extend \`Writable\`, and only call the callback once the chunk is really stored so backpressure works.
- **I change data as it flows** (parse, compress, encrypt, filter): extend \`Transform\`. A full walk-through is in [How do you implement a custom Transform stream?](/interview-question/how-do-you-implement-a-custom-transform-stream).
- **I wrap a two-way connection** (a protocol over a socket, a child process wrapper): extend \`Duplex\`.
- **I am in browser-compatible code**: consider the Web Streams API instead; see [What are the Web Streams API (ReadableStream/WritableStream) in Node.js and how do they differ from node:stream?](/interview-question/what-are-the-web-streams-api-readablestream-writablestream-in-node-js-and-how-do).

</details>

## 8. Common Pitfalls

- **Calling a Transform "just a Duplex".** It is a Duplex, but the important part is that output is derived from input. A socket is a Duplex that is not a Transform.
- **Never calling \`push(null)\` in a custom Readable.** The stream never ends, so \`pipeline\` never calls its callback and \`for await\` never finishes.
- **Forgetting the callback in \`_write()\` or \`transform()\`.** The stream stalls after one chunk, with no error, because it is waiting for you to say "done".
- **Using \`.pipe()\` and assuming errors propagate.** They do not. An error in the middle stage leaves the other streams open. Use \`pipeline()\`.
- **Mixing object mode and byte mode in one pipeline** without thinking: as checked above, \`write({ a: 1 })\` on a byte-mode Writable throws \`ERR_INVALID_ARG_TYPE\`.
- **Assuming \`process.stdout\` is always the same class.** As measured above, it was a Duplex when piped and a Writable when redirected to a file.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the four:</strong> <span style="color:#f0e2c8;">"Readable is a source, Writable is a sink, Duplex is both with independent sides, and Transform is a Duplex whose output is computed from its input."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give real examples:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;">fs.createReadStream</code> and the HTTP request are Readable, <code style="background:#332310;color:#ffca28;">fs.createWriteStream</code> is Writable, <code style="background:#332310;color:#ffca28;">net.Socket</code> is Duplex, <code style="background:#332310;color:#ffca28;">zlib.createGzip()</code> is Transform."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Nail Duplex vs Transform:</strong> <span style="color:#f0e2c8;">"On a socket, what I write goes to the server and what I read comes from the server. In gzip, what I read only exists because of what I wrote."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Say what you implement:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;">_read</code> with <code style="background:#332310;color:#ffca28;">push</code> and <code style="background:#332310;color:#ffca28;">push(null)</code>, <code style="background:#332310;color:#ffca28;">_write</code> with its callback, or just <code style="background:#332310;color:#ffca28;">transform</code> for a Transform."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close on why it matters:</strong> <span style="color:#f0e2c8;">"They all buffer up to a highWaterMark, which gives backpressure, so I can process data bigger than memory. I chain them with <code style="background:#332310;color:#ffca28;">pipeline()</code> for error handling."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is an HTTP request object on the server a Readable or a Duplex?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The request (<code style="background:#332310;color:#ffca28;">IncomingMessage</code>) is a Readable: checked above, <code style="background:#332310;color:#ffca28;">req instanceof Readable</code> is true. The thing underneath it, <code style="background:#332310;color:#ffca28;">req.socket</code>, is the Duplex. The response is the subtle one: it behaves like a Writable (write, end, backpressure, usable in pipeline), but <code style="background:#332310;color:#ffca28;">res instanceof Writable</code> printed false, because <code style="background:#332310;color:#ffca28;">ServerResponse</code> extends the older <code style="background:#332310;color:#ffca28;">OutgoingMessage</code> class. HTTP splits one two-way socket into a read side and a write side for you.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between paused mode and flowing mode on a Readable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A Readable starts paused: data sits in its buffer until you ask for it with <code style="background:#332310;color:#ffca28;">read()</code>. Attaching a <code style="background:#332310;color:#ffca28;">'data'</code> listener, calling <code style="background:#332310;color:#ffca28;">resume()</code> or piping switches it to flowing, where chunks are pushed to you as fast as they arrive. In the verified run above, the first <code style="background:#332310;color:#ffca28;">'data'</code> event fired after all the synchronous logs, because flowing begins on a later tick. <code style="background:#332310;color:#ffca28;">for await</code> is the modern way and handles this for you.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you write a Duplex instead of a Transform?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the two directions are separate conversations. Wrapping a socket with a framing protocol, wrapping a child process (write to its stdin, read from its stdout), or an in-memory fake connection for tests are all Duplex cases. If every output chunk is a function of input chunks, it is a Transform, and Transform is much simpler to write because you only implement one method.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;">highWaterMark</code> actually limit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a threshold, not a hard cap. When a Writable has buffered more than the highWaterMark, <code style="background:#332310;color:#ffca28;">write()</code> returns <code style="background:#332310;color:#ffca28;">false</code> and a well-behaved producer waits for <code style="background:#332310;color:#ffca28;">'drain'</code>. If the producer ignores that, memory keeps growing. It counts bytes in byte mode and objects in object mode; measured here it was 65536 bytes for a byte stream and 1 for <code style="background:#332310;color:#ffca28;">Readable.from()</code> in object mode.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do Node streams relate to the Web Streams API?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They are two separate designs. Web Streams have <code style="background:#332310;color:#ffca28;">ReadableStream</code>, <code style="background:#332310;color:#ffca28;">WritableStream</code> and <code style="background:#332310;color:#ffca28;">TransformStream</code>, and are what <code style="background:#332310;color:#ffca28;">fetch()</code> returns. Node can convert between them with <code style="background:#332310;color:#ffca28;">Readable.fromWeb()</code> and <code style="background:#332310;color:#ffca28;">Readable.toWeb()</code>. There is no separate Web "Duplex" class; a pair of readable and writable streams plays that role.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Readable** | A source you read chunks from; ends with \`push(null)\` |
| **Writable** | A sink you write chunks into; finish with \`end()\` |
| **Duplex** | Readable and Writable in one object, two independent sides |
| **Transform** | A Duplex whose output is computed from its input |
| **\`highWaterMark\`** | Buffer threshold that triggers backpressure (bytes, or objects in object mode) |
| **\`objectMode\`** | Lets chunks be any JavaScript value |
| **\`pipeline()\`** | Chains streams with shared error handling and cleanup |
| **Flowing / paused mode** | Whether a Readable pushes data to you or waits to be asked |

---
**Conclusion:** Node's four stream types are one idea in four shapes. A **Readable** gives data out, a **Writable** takes data in, a **Duplex** does both through two sides that have nothing to do with each other (a socket), and a **Transform** is a Duplex whose output is made from its input (gzip). The verified script showed exactly that: the Transform turned 1 to 5 into 2 to 10, while the Duplex ignored what was written to it and emitted its own message. Runtime \`instanceof\` checks confirmed that Transform extends Duplex and that a Duplex counts as both Readable and Writable, and the built-ins were classified by running code rather than from memory. Add the \`highWaterMark\` (65536 bytes by default on Node 22) and \`pipeline()\` to your answer and you have covered what interviewers listen for.`,
    examples: [
      {
        label: "All four stream types in one script: Readable -> Transform -> Writable, plus an independent Duplex",
        tech: "javascript",
        runnable: false,
        code: `const { Readable, Writable, Duplex, Transform, pipeline } = require("node:stream");

// 1. Readable: a SOURCE. You implement read(); push(null) means "no more data".
class Counter extends Readable {
  constructor(max) { super(); this.n = 0; this.max = max; }
  _read() {
    this.n += 1;
    this.push(this.n <= this.max ? \`\${this.n}\\n\` : null);
  }
}

// 2. Transform: data goes IN one side and comes OUT changed on the other.
const doubler = new Transform({
  transform(chunk, _enc, done) {
    done(null, \`\${Number(chunk.toString()) * 2}\\n\`);
  },
});

// 3. Writable: a SINK. You implement write(); the callback says "ready for more".
const collected = [];
const sink = new Writable({
  write(chunk, _enc, done) { collected.push(chunk.toString().trim()); done(); },
});

pipeline(new Counter(5), doubler, sink, (err) => {
  console.log("pipeline finished, err =", err ?? null);
  console.log("sink received:", collected.join(","));

  // 4. Duplex: TWO independent channels in one object (like a socket).
  const echoLater = new Duplex({
    read() {},                                      // readable side: we push when we like
    write(chunk, _enc, done) {                      // writable side: does NOT feed the readable side
      console.log("duplex write side got:", chunk.toString());
      done();
    },
  });
  echoLater.on("data", (d) => console.log("duplex read side emitted:", d.toString()));
  echoLater.write("hello");                        // goes to the write side only
  echoLater.push("unrelated server message");      // readable side, independent of the write
  echoLater.push(null);

  // How the classes relate
  console.log("Transform instanceof Duplex:", doubler instanceof Duplex);
  console.log("Duplex instanceof Readable:", echoLater instanceof Readable);
  console.log("Duplex instanceof Writable:", echoLater instanceof Writable);
  console.log("Readable instanceof Writable:", new Counter(1) instanceof Writable);
});`,
      },
      {
        label: "Which type is each built-in stream? Classified at runtime",
        tech: "javascript",
        runnable: false,
        code: `const fs = require("node:fs");
const net = require("node:net");
const zlib = require("node:zlib");
const { Readable, Writable, Duplex, Transform } = require("node:stream");

const kind = (s) =>
  s instanceof Transform ? "Transform" :
  s instanceof Duplex ? "Duplex" :
  s instanceof Readable ? "Readable" :
  s instanceof Writable ? "Writable" : "?";

const server = net.createServer((sock) => sock.end()).listen(0, () => {
  const sock = net.connect(server.address().port);
  console.log("fs.createReadStream  ->", kind(fs.createReadStream(__filename)));
  console.log("fs.createWriteStream ->", kind(fs.createWriteStream("/dev/null")));
  console.log("process.stdout       ->", kind(process.stdout));
  console.log("net.Socket           ->", kind(sock));
  console.log("zlib.createGzip()    ->", kind(zlib.createGzip()));
  console.log("Readable.from([1,2]) ->", kind(Readable.from([1, 2])));
  sock.on("close", () => server.close());
});`,
      },
      {
        label: "Object mode: streams of JavaScript objects instead of bytes",
        tech: "javascript",
        runnable: false,
        code: `const { Readable, Transform, Writable, pipeline } = require("node:stream");
const rows = Readable.from([{ id: 1, price: 10 }, { id: 2, price: 25 }, { id: 3, price: 40 }]);
const withTax = new Transform({
  objectMode: true,
  transform(row, _e, done) { done(null, { ...row, total: row.price * 1.2 }); },
});
const out = new Writable({ objectMode: true, write(row, _e, done) { console.log(row); done(); } });
console.log("Readable.from objectMode:", rows.readableObjectMode, "hwm:", rows.readableHighWaterMark);
console.log("default byte-stream hwm:", new Writable().writableHighWaterMark, "bytes");
pipeline(rows, withTax, out, () => console.log("done"));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between fs.readFile and fs.readFileSync?",
    seoDescription:
      "fs.readFile runs on the libuv thread pool and lets the event loop keep going; readFileSync blocks it. Verified with ordering logs and a heartbeat timer.",
    description: `**Question presented to candidate:**
"You see \`fs.readFileSync\` inside an Express route handler during code review. Is that a problem? Explain what \`fs.readFile\` does differently, and tell me when \`readFileSync\` is perfectly fine to use."

**What a strong answer should cover:**
- \`readFileSync\` is **synchronous**: the JavaScript thread stops until the whole file is in memory. No other request, timer or callback can run in the meantime.
- \`readFile\` (and \`fs.promises.readFile\`) is **asynchronous**: the read is handed to libuv's **thread pool**, the call returns immediately, and the callback or promise settles later, after the current synchronous code has finished.
- Error handling differs: the sync version **throws** (use \`try/catch\`); the callback version passes \`err\` as the first argument; the promise version **rejects**.
- Neither one streams. Both load the **whole file** into one Buffer, so both are wrong for very large files (and both refuse files over 2 GiB with \`ERR_FS_FILE_TOO_LARGE\`). For big files, use \`fs.createReadStream\`.
- \`readFileSync\` is fine at **startup** (loading config or a certificate before the server listens), in CLI scripts and in build tools, where nothing else is waiting.
- A strong candidate notes the trade-off: async is not faster for one read (it can be slower in wall time); it is better because it does not freeze everything else.

**Clarifying questions expected:**
- "Is this code on a request path, or does it run once at startup?"
- "How big are the files, and are they read on every request or could they be cached?"

**Code / implementation expected:** Optional: a short snippet showing log ordering, or a timer that gets delayed by \`readFileSync\`.`,
    answer: `**Target Audience:** Beginners to Node.js, and anyone who wants a precise answer to a classic warm-up question.
**Difficulty:** Easy

> **How to read this doc:** Ideas come first in plain language, then the exact vocabulary is tagged with <code>📌 Interview term:</code>. Every snippet was run with Node v22.22.0; the output blocks are copied from those runs.

## 1. Why This Even Matters — A Story First

Imagine a coffee shop with **one barista**.

A customer asks for a pastry that has to be fetched from the storeroom out back.

- **The sync way:** the barista walks to the storeroom and stands there until the pastry is found. The queue at the counter just waits. Nobody gets coffee.
- **The async way:** the barista asks a helper to go to the storeroom, then keeps making coffee for the next customers. When the helper comes back, the barista hands over the pastry.

Node has one JavaScript thread: that is the barista. \`fs.readFileSync\` is "go to the storeroom yourself". \`fs.readFile\` is "send a helper". The helpers are libuv's thread pool.

## 2. The Core Difference

📌 **Interview term: blocking (synchronous) I/O** — the call does not return until the work is done, so the JavaScript thread can do nothing else. \`fs.readFileSync(path)\` returns the file contents directly.

📌 **Interview term: non-blocking (asynchronous) I/O** — the call starts the work and returns at once; you get the result later through a callback or a promise. \`fs.readFile(path, callback)\` and \`await fs.promises.readFile(path)\` work this way.

📌 **Interview term: libuv thread pool** — a small pool of background threads (4 by default, set by \`UV_THREADPOOL_SIZE\`) that Node uses for file system work, because most operating systems have no truly async API for regular files. See [How does the thread pool work in Node.js?](/interview-question/how-does-the-thread-pool-work-in-node-js).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 170" role="img" aria-label="With readFileSync the main thread waits for the disk and other work is stuck behind it">
  <text class="d-text" x="320" y="24" text-anchor="middle">readFileSync: the main thread waits</text>
  <rect class="d-box-muted" x="20" y="52" width="130" height="44" rx="8"/>
  <text class="d-sub" x="85" y="79" text-anchor="middle">your code</text>
  <rect class="d-box-accent" x="200" y="52" width="240" height="44" rx="8"/>
  <text class="d-text d-accent" x="320" y="79" text-anchor="middle">reading the file</text>
  <rect class="d-box-muted" x="490" y="52" width="130" height="44" rx="8"/>
  <text class="d-sub" x="555" y="79" text-anchor="middle">your code</text>
  <rect class="d-box" x="200" y="118" width="240" height="36" rx="8"/>
  <text class="d-sub" x="320" y="141" text-anchor="middle">timers and requests stuck</text>
</svg>

The whole read sits on the main thread's timeline, so everything else queues behind it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="With readFile the read runs on a thread pool thread while the main thread keeps handling other work, and the callback runs later">
  <defs>
    <marker id="rf-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="24" text-anchor="middle">readFile: the read moves to the thread pool</text>
  <rect class="d-box-muted" x="20" y="50" width="120" height="44" rx="8"/>
  <text class="d-sub" x="80" y="77" text-anchor="middle">your code</text>
  <rect class="d-box" x="180" y="50" width="280" height="44" rx="8"/>
  <text class="d-sub" x="320" y="77" text-anchor="middle">other requests and timers run</text>
  <rect class="d-box-muted" x="500" y="50" width="120" height="44" rx="8"/>
  <text class="d-sub" x="560" y="77" text-anchor="middle">callback</text>
  <rect class="d-box-accent" x="180" y="130" width="280" height="44" rx="8"/>
  <text class="d-text d-accent" x="320" y="157" text-anchor="middle">thread pool reads the file</text>
  <path class="d-edge-accent" d="M 140 94 L 176 136" marker-end="url(#rf-arrow)"/>
  <path class="d-edge-accent" d="M 460 136 L 506 98" marker-end="url(#rf-arrow)"/>
</svg>

The main thread is free during the read; the callback is queued back onto it when the pool thread finishes.

## 3. Verified: The Order Things Happen In

~~~js
console.log("1. before readFileSync");
const data = fs.readFileSync("config.json", "utf8");
console.log("2. readFileSync returned:", data);

console.log("3. before readFile");
fs.readFile("config.json", "utf8", (err, text) => {
  console.log("5. readFile callback:", err, text);
});
console.log("4. after readFile (the callback has NOT run yet)");
~~~

Output of the full script (the first example on this page):

~~~text
1. before readFileSync
2. readFileSync returned: {"port":8080}
3. before readFile
4. after readFile (the callback has NOT run yet)
sync error caught by try/catch: ENOENT
async error in callback: ENOENT
promise rejection: ENOENT
5. readFile callback: null {"port":8080}
~~~

- Line 2 came straight after line 1: \`readFileSync\` handed back the contents as its return value.
- Line 4 printed **before** line 5. The callback cannot run until the current synchronous code has finished, no matter how small or fast the file is. Even the error-handling lines that came later in the script printed before it.
- The three error styles are visible: the sync version **threw** (caught with \`try/catch\`), the callback got \`err.code === "ENOENT"\`, and the promise **rejected**.

The relative order of the three async results (two error callbacks, one promise, one success callback) is not something to rely on. They come back from different pool threads, and which finishes first is up to the thread pool and the disk. The only guarantee is "after the synchronous code".

## 4. Verified: How Long the Event Loop Freezes

The second example writes a 512 MiB file and reads it three ways while a \`setInterval\` "heartbeat" tries to tick every 5ms. The worst gap between heartbeats is how long the event loop was frozen.

~~~text
readFileSync: read took 373ms, heartbeats=7, worst gap=359ms
readFile    : read took 432ms, heartbeats=88, worst gap=8ms
promises    : read took 429ms, heartbeats=89, worst gap=7ms
~~~

📌 **Interview term: event loop blocking** — while synchronous work runs, nothing else on the main thread can. Here the heartbeat went silent for several hundred milliseconds (over 300ms in every run) during \`readFileSync\`, while the async versions kept it ticking every ~5-10ms. In a server, that gap is time added to **every** other request that arrived at the same time. More on that in [Explain the concept of 'Event Loop Pollution' and how to avoid it.](/interview-question/explain-the-concept-of-event-loop-pollution-and-how-to-avoid-it)

Notice the other number: the async reads took **longer** in wall time (roughly 15-30% longer across runs; compare the \`read took\` numbers above). Handing work to a pool thread and back has a cost. Async is not about making one read faster; it is about letting everything else carry on while the read happens.

## 5. Verified: Neither One Is for Huge Files

Both functions read the **whole file into one Buffer**. The third example creates a 3 GiB sparse file (no real disk used) and tries both:

~~~text
readFileSync: ERR_FS_FILE_TOO_LARGE - File size (3221225472) is greater than 2 GiB
readFile:     ERR_FS_FILE_TOO_LARGE - File size (3221225472) is greater than 2 GiB
~~~

Even below that limit, reading a 1 GiB file means 1 GiB of memory per concurrent request. For large files, read in chunks with \`fs.createReadStream\`; the trade-offs are covered in [What is the difference between readFile and createReadStream in Node.js?](/interview-question/what-is-the-difference-between-readfile-and-createreadstream-in-node-js) and [Explain how to read and write large files using streams in Node.js](/interview-question/explain-how-to-read-and-write-large-files-using-streams-in-node-js).

## 6. Side by Side

| | \`fs.readFileSync\` | \`fs.readFile\` (callback) | \`fs.promises.readFile\` |
| :--- | :--- | :--- | :--- |
| Returns | the data | \`undefined\`; data comes in the callback | a Promise of the data |
| Blocks the event loop | yes, for the whole read | no | no |
| Where the read happens | main thread | libuv thread pool | libuv thread pool |
| Errors | thrown | \`err\` argument | rejection |
| Memory | whole file in one Buffer | whole file in one Buffer | whole file in one Buffer |
| Good for | startup config, CLIs, build scripts | older callback code | modern server code with \`async/await\` |

## 7. When Sync Is Fine

\`readFileSync\` is not "bad"; it is bad **on a hot path in a server**. These are all reasonable:

- Loading a config file, a TLS certificate or a template **once at startup**, before \`server.listen()\`, when there are no requests yet to delay.
- A CLI tool or build script that does one thing at a time anyway.
- Code inside \`require()\` time, such as reading a JSON schema the module needs to export.

A useful rule for reviews: *sync calls are fine before the server starts listening, and a smell after.*

## 8. Common Pitfalls

- **\`readFileSync\` inside a request handler.** One slow disk or large file stalls every concurrent request, as the heartbeat measurement showed.
- **Wrapping \`readFileSync\` in a Promise and calling it async.** \`new Promise((r) => r(fs.readFileSync(p)))\` still runs the read on the main thread. Use \`fs.promises.readFile\`.
- **Forgetting the encoding.** Without \`"utf8"\` you get a Buffer. Checked on Node 22: \`JSON.parse(buffer)\` still works (the Buffer is turned into a string), but \`buffer === "..."\` is always false and \`.length\` counts bytes, not characters.
- **Using \`readFile\` on a file that might be huge** (uploads, logs). It still loads everything; past 2 GiB it fails outright with \`ERR_FS_FILE_TOO_LARGE\`.
- **Relying on the order of several \`readFile\` callbacks.** They finish in whatever order the pool threads do. Use \`Promise.all\` if you need them all.
- **Checking \`fs.existsSync\` before \`readFile\`.** The file can disappear in between. Just read it and handle \`ENOENT\`.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State the difference:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;">readFileSync</code> blocks the single JavaScript thread until the file is read; <code style="background:#332310;color:#ffca28;">readFile</code> hands the read to libuv's thread pool and calls me back later."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Say why it matters:</strong> <span style="color:#f0e2c8;">"While a sync read runs, no other request or timer can. I measured a 512 MiB sync read freezing a 5ms timer for over 300ms; the async read kept it ticking."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Mention errors:</strong> <span style="color:#f0e2c8;">"Sync throws, so I need try/catch. The callback gets <code style="background:#332310;color:#ffca28;">err</code> first. In modern code I use <code style="background:#332310;color:#ffca28;">fs.promises.readFile</code> with await."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Say when sync is fine:</strong> <span style="color:#f0e2c8;">"At startup before <code style="background:#332310;color:#ffca28;">listen()</code>, in CLIs and build scripts, where nothing else is waiting."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Add the nuance:</strong> <span style="color:#f0e2c8;">"Both load the whole file into memory, so for big files I use <code style="background:#332310;color:#ffca28;">createReadStream</code>. And async is not faster per read; it just does not freeze everything else."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If the file is tiny and cached by the OS, does <code style="background:#4a3418;color:#ffe0b2;">readFileSync</code> on a request path still matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually much less, since a cached small file reads in microseconds. But you cannot promise the file is always cached, network file systems can stall for seconds, and the cost scales with load. If the file rarely changes, the better fix is to read it once at startup and keep it in memory, which removes both the blocking and the repeated work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does the async read actually happen, if JavaScript is single-threaded?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On a libuv thread pool thread, written in C. Your JavaScript stays on one thread; libuv runs the blocking <code style="background:#332310;color:#ffca28;">open</code>/<code style="background:#332310;color:#ffca28;">read</code>/<code style="background:#332310;color:#ffca28;">close</code> system calls on a pool thread and then queues your callback back on the main thread. The pool has 4 threads by default, so many concurrent file reads, plus <code style="background:#332310;color:#ffca28;">crypto.pbkdf2</code> or <code style="background:#332310;color:#ffca28;">zlib</code> calls, share those 4 threads.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your measurement showed the async read took longer. So why is it better?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because a server cares about total throughput and tail latency, not one read. The extra time comes from passing work to another thread and back. In exchange, the main thread handled close to 90 heartbeat ticks during the read instead of a handful. With many users, those freed-up milliseconds go to other requests.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;">await fs.promises.readFile()</code> any different from the callback version under the hood?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both use the thread pool and both kept the heartbeat ticking in the measurement. The difference is the interface: a promise works with <code style="background:#332310;color:#ffca28;">async/await</code>, <code style="background:#332310;color:#ffca28;">Promise.all</code> and <code style="background:#332310;color:#ffca28;">try/catch</code>, and both accept an <code style="background:#332310;color:#ffca28;">AbortSignal</code> through the <code style="background:#332310;color:#ffca28;">signal</code> option to cancel a read. For new code the promise API is the usual choice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find sync calls that slipped into request handlers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run with <code style="background:#332310;color:#ffca28;">node --trace-sync-io</code>, which prints <code style="background:#332310;color:#ffca28;">WARNING: Detected use of sync API</code> with a stack trace whenever a synchronous I/O call happens after the first turn of the event loop, which is exactly "after startup". Tried here: a <code style="background:#332310;color:#ffca28;">readFileSync</code> at the top of a script produced no warning, and the same call inside a <code style="background:#332310;color:#ffca28;">setTimeout</code> did. Lint rules that ban <code style="background:#332310;color:#ffca28;">*Sync</code> calls outside startup files, and an event-loop delay metric in production, catch the rest.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Blocking / synchronous** | The call returns only when the work is done; nothing else runs meanwhile |
| **Non-blocking / asynchronous** | The call returns at once; the result arrives later |
| **libuv thread pool** | Background C threads (4 by default) that do file system work |
| **Event loop blocking** | Synchronous work that stops timers and other requests from running |
| **\`ENOENT\`** | Error code for "no such file or directory" |
| **\`ERR_FS_FILE_TOO_LARGE\`** | \`readFile\`/\`readFileSync\` refuse files larger than 2 GiB |

---
**Conclusion:** \`fs.readFileSync\` and \`fs.readFile\` read the same bytes into the same kind of Buffer; the difference is **who waits**. The sync version makes Node's only JavaScript thread wait, which the heartbeat test showed as a freeze of over 300ms for a 512 MiB file. The async version sends the read to libuv's thread pool, returns at once, and runs your callback after the current code finishes, which the ordering test showed with line 4 printing before line 5. Use the promise API on any request path, keep sync reads for startup and scripts, and remember that neither one is for large files: both hold the whole file in memory and both refuse anything over 2 GiB.`,
    examples: [
      {
        label: "Ordering and error handling: readFileSync vs readFile vs fs.promises.readFile",
        tech: "javascript",
        runnable: false,
        code: `const fs = require("node:fs");
fs.writeFileSync("config.json", JSON.stringify({ port: 8080 }));

console.log("1. before readFileSync");
const data = fs.readFileSync("config.json", "utf8");
console.log("2. readFileSync returned:", data);

console.log("3. before readFile");
fs.readFile("config.json", "utf8", (err, text) => {
  console.log("5. readFile callback:", err, text);
});
console.log("4. after readFile (the callback has NOT run yet)");

// Errors: sync throws, async passes err to the callback
try {
  fs.readFileSync("missing.json");
} catch (e) {
  console.log("sync error caught by try/catch:", e.code);
}
fs.readFile("missing.json", (err) => console.log("async error in callback:", err.code));
fs.promises.readFile("missing.json").catch((e) => console.log("promise rejection:", e.code));`,
      },
      {
        label: "Measuring how long each one freezes the event loop on a 512 MiB file",
        tech: "javascript",
        runnable: false,
        code: `const fs = require("node:fs");
const FILE = "big.bin";
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, Buffer.alloc(512 * 1024 * 1024, 1)); // 512 MiB

// A heartbeat that should fire every 5ms. The worst gap shows how long
// the event loop was frozen.
function watch(label, run) {
  return new Promise((resolve) => {
    let last = Date.now(), worst = 0, beats = 0;
    const hb = setInterval(() => {
      const now = Date.now();
      worst = Math.max(worst, now - last);
      last = now; beats++;
    }, 5);
    const t0 = Date.now();
    run(() => {
      const took = Date.now() - t0;
      setTimeout(() => {
        clearInterval(hb);
        console.log(\`\${label}: read took \${took}ms, heartbeats=\${beats}, worst gap=\${worst}ms\`);
        resolve();
      }, 20);
    });
  });
}

(async () => {
  await watch("readFileSync", (done) => setTimeout(() => { fs.readFileSync(FILE); done(); }, 20));
  await watch("readFile    ", (done) => setTimeout(() => fs.readFile(FILE, () => done()), 20));
  await watch("promises    ", (done) => setTimeout(() => fs.promises.readFile(FILE).then(() => done()), 20));
})();`,
      },
      {
        label: "Both refuse files over 2 GiB: ERR_FS_FILE_TOO_LARGE",
        tech: "javascript",
        runnable: false,
        code: `const fs = require("node:fs");
fs.closeSync(fs.openSync("sparse-3g.bin", "w"));
fs.truncateSync("sparse-3g.bin", 3 * 1024 ** 3); // 3 GiB sparse file, no real disk used
try { fs.readFileSync("sparse-3g.bin"); } catch (e) { console.log("readFileSync:", e.code, "-", e.message); }
fs.readFile("sparse-3g.bin", (err) => {
  console.log("readFile:    ", err.code, "-", err.message);
  fs.unlinkSync("sparse-3g.bin");
});`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the purpose of the --max-old-space-size flag in Node.js?",
    seoDescription:
      "--max-old-space-size caps V8's old-generation heap in MB. Verified: measured limits, a leak that still crashes at a higher cap, and off-heap Buffers.",
    description: `**Question presented to candidate:**
"A nightly Node.js job dies with \`FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory\`. Someone suggests adding \`--max-old-space-size=8192\`. What does that flag actually control, is it the right fix, and how would you set it safely in a container?"

**What a strong answer should cover:**
- V8 splits the heap into a small **young generation** (new objects) and a large **old generation** (objects that survived a few GCs). \`--max-old-space-size\` caps the **old generation**, in **megabytes**.
- The total heap limit is the old-space cap **plus** the young generation, so \`v8.getHeapStatistics().heap_size_limit\` comes out a little higher than the flag value.
- Hitting the limit is **fatal**: the process aborts. It is not a catchable exception, and \`'exit'\` / \`'uncaughtException'\` handlers do not run.
- Raising the cap is the right fix only when the **working set is genuinely large** (big batch job, large in-memory index). For a **leak**, a higher cap only delays the crash.
- The flag limits only the V8 heap. **Buffers, ArrayBuffers and native memory live outside it**, so RSS can be far above the cap.
- In containers, set it below the container limit (leave headroom for off-heap memory and the runtime itself), pass it via \`node --max-old-space-size=…\` or \`NODE_OPTIONS\`, and confirm with \`heap_size_limit\` inside the container.

**Clarifying questions expected:**
- "Does memory grow steadily until the crash, or does it jump during one big phase of the job?" (leak vs large working set)
- "How much memory does the container or host give the process?"

**Code / implementation expected:** Optional: the command line, plus a one-liner that prints \`heap_size_limit\` to prove the flag took effect.`,
    answer: `**Target Audience:** Engineers who have seen "JavaScript heap out of memory" and want to know what the usual fix really does.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> for the exact vocabulary. Every number on this page was measured with Node v22.22.0 on a 16 GB Linux machine; the output blocks are copied from those runs.

## 1. Why This Even Matters — A Story First

Think of a warehouse with two rooms. Deliveries land in a small **front room**. Every so often, workers sweep it: anything nobody has claimed gets thrown out, and anything still wanted gets moved to the big **back room** for long-term storage. Once in a while the back room gets a full clean-out too.

\`--max-old-space-size\` sets **how big the back room is allowed to get**. If the back room fills up and a full clean-out cannot free any space, the warehouse does not slow down politely: it shuts its doors.

Making the back room bigger is right when you really do have more stock to keep. It is the wrong fix when the problem is that nobody ever throws anything away. A bigger room just takes longer to fill.

## 2. What the Flag Controls

📌 **Interview term: young generation (new space)** — a small area where new objects are created. It is cleaned often and quickly by a **Scavenge** (minor GC).

📌 **Interview term: old generation (old space)** — where objects go after surviving a couple of scavenges. It is much bigger and cleaned by **Mark-Compact** (major GC). For the full GC story, see [Explain how memory management and Garbage Collection work in the V8 engine.](/interview-question/explain-how-memory-management-and-garbage-collection-work-in-the-v8-engine)

📌 **Interview term: \`--max-old-space-size=<MB>\`** — a V8 flag that caps the old generation, in megabytes. When the old generation is full and a major GC cannot free enough, V8 aborts the process.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="The V8 heap limit is made of a small young generation plus the old generation, and the max old space size flag only sets the old generation part">
  <text class="d-text" x="320" y="24" text-anchor="middle">heap_size_limit = young generation + old generation</text>
  <rect class="d-box-muted" x="20" y="54" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="84" text-anchor="middle">young</text>
  <text class="d-sub" x="95" y="106" text-anchor="middle">48 MB here</text>
  <rect class="d-box-accent" x="200" y="54" width="420" height="70" rx="10"/>
  <text class="d-text d-accent" x="410" y="84" text-anchor="middle">old generation</text>
  <text class="d-sub" x="410" y="106" text-anchor="middle">set by --max-old-space-size</text>
  <rect class="d-box" x="20" y="148" width="600" height="38" rx="8"/>
  <text class="d-sub" x="320" y="172" text-anchor="middle">Buffers and native memory: outside both, not limited by the flag</text>
</svg>

The flag moves only the right-hand box. Off-heap memory, such as Buffers, sits outside the heap entirely.

## 3. Verified: What Limit Do You Actually Get?

\`v8.getHeapStatistics().heap_size_limit\` reports the real limit. Measured with different settings:

~~~text
default:
heap_size_limit=8240MB  old_space in use=3MB
--max-old-space-size=64:
heap_size_limit=112MB  old_space in use=3MB
--max-old-space-size=512:
heap_size_limit=560MB  old_space in use=3MB
--max-old-space-size=4096:
heap_size_limit=4144MB  old_space in use=3MB
NODE_OPTIONS=--max-old-space-size=1024:
heap_size_limit=1072MB  old_space in use=3MB
--max-semi-space-size=64 --max-old-space-size=512:
heap_size_limit=704MB  old_space in use=3MB
~~~

What the numbers show:

- Every limit is the flag value **plus 48 MB**. That 48 MB is the young generation (on this machine, three times the default 16 MB semi-space).
- Raising \`--max-semi-space-size\` to 64 grew the young part to 192 MB (\`512 + 192 = 704\`), which confirms the split.
- \`NODE_OPTIONS="--max-old-space-size=1024"\` worked exactly like the command-line flag.
- The **default** on this 16 GB machine was 8240 MB. The default is computed from available memory, and the rule has changed between Node and V8 versions. Red Hat documents that Node 20 sizes the default heap from the **container's cgroup memory limit** ([Red Hat Developer, Node.js 20 memory management in containers](https://developers.redhat.com/articles/2025/10/10/nodejs-20-memory-management-containers)), but sources disagree on the exact cap. So do not quote a default from memory: **measure \`heap_size_limit\` in the real environment.**

## 4. Verified: A Leak Still Crashes at a Higher Cap

The second example is a "cache" that never evicts anything. It was run with a 64 MB cap and then a 256 MB cap (V8 garbage-collector trace lines and native stack frames trimmed from the output):

~~~text
$ node --max-old-space-size=64 leak.js
limit 112MB
objects=100000  heapUsed=35MB

<--- Last few GCs --->

<--- JS stacktrace --->

FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
----- Native stack trace -----

exit code: 134
~~~

~~~text
$ node --max-old-space-size=256 leak.js
limit 304MB
objects=100000  heapUsed=35MB
objects=200000  heapUsed=67MB
objects=300000  heapUsed=99MB
objects=400000  heapUsed=132MB
objects=500000  heapUsed=159MB
objects=600000  heapUsed=194MB
objects=700000  heapUsed=223MB
objects=800000  heapUsed=252MB

<--- Last few GCs --->

<--- JS stacktrace --->

FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
----- Native stack trace -----

exit code: 134
~~~

📌 **Interview term: heap out of memory (OOM)** — V8 could not allocate after a full GC, so it aborts. Exit code **134** on Linux means the process was killed by \`SIGABRT\`.

Three things to notice:

1. Quadrupling the cap let the leak hold several times as many objects (about 800,000, against at most 200,000 at 64 MB; the progress lines are every 100,000, and the exact crash point varies a little between runs) and then it died with the **same** error. A higher cap bought time, not a fix.
2. The script had both \`process.on("exit")\` and \`process.on("uncaughtException")\` handlers. **Neither one ran.** A heap OOM is a fatal error in V8, not a JavaScript exception, so you cannot catch it or log from it. Plan to collect evidence *before* the limit, for example with \`--heapsnapshot-near-heap-limit\` or by watching \`process.memoryUsage()\`.
3. The \`heapUsed\` numbers climbed steadily the whole time. That steady climb is the classic shape of a leak, which is what you should check for before touching the flag. See [What are memory leaks in Node.js and how do you detect them?](/interview-question/what-are-memory-leaks-in-node-js-and-how-do-you-detect-them) and [How do you capture and analyze a heap snapshot to find a memory leak?](/interview-question/how-do-you-capture-and-analyze-a-heap-snapshot-to-find-a-memory-leak).

## 5. Verified: Buffers Are Not Counted

The third example allocates 500 MB of filled Buffers under a 64 MB old-space cap:

~~~text
heap limit=112MB heapUsed=4MB arrayBuffers=500MB rss=543MB
~~~

📌 **Interview term: off-heap (external) memory** — memory Node allocates outside the V8 heap: \`Buffer\`, \`ArrayBuffer\`, native addon memory, and the runtime itself. The process used **543 MB of RSS** with a heap limit of 112 MB and only 4 MB of heap in use. Two consequences:

- A Buffer-heavy app (file processing, image work, big network payloads) can blow past a container memory limit even with a small \`--max-old-space-size\`. The container's OOM killer then ends it with \`SIGKILL\` (exit 137), which looks different from the V8 error.
- Setting \`--max-old-space-size\` equal to the container limit leaves **no room** for off-heap memory. Leave headroom.

## 6. Choosing a Value in Production

| Situation | What to do |
| :--- | :--- |
| Batch job with a genuinely large working set | Raise the cap, measure peak \`heapUsed\`, keep some margin |
| Memory climbs steadily and never levels off | Find the leak first; raising the cap only delays the crash |
| Container with a hard memory limit | Set the cap below the limit (many teams use roughly 70-80%), leaving room for Buffers and the runtime |
| Many small processes on one host (cluster, PM2) | Each process gets its own heap; multiply before you raise |
| Not sure what the current limit is | Print \`heap_size_limit\` inside the actual container |

The first example on this page shows the commands. The key one-liner to prove the flag took effect:

~~~bash
node --max-old-space-size=512 -p "Math.round(require('v8').getHeapStatistics().heap_size_limit / 2**20) + ' MB'"
# 560 MB
~~~

For ongoing monitoring once the value is set, see [How do you monitor a Node.js application's memory usage in production?](/interview-question/how-do-you-monitor-a-node-js-application-s-memory-usage-in-production).

## 7. Verified: Does the Flag Reach Child Processes?

Build tools, test runners and \`npm\` itself often start extra Node processes, and the one that crashes may not be the one you passed the flag to. \`children.js\` prints its own limit, then starts one child with \`fork()\` and one with \`spawn(process.execPath, ...)\`:

~~~js
const { fork, spawn } = require("node:child_process");
const v8 = require("node:v8");
const mb = (b) => Math.round(b / 2 ** 20);
if (process.argv[2] === "child") {
  console.log(\`  \${process.argv[3]}: heap_size_limit=\${mb(v8.getHeapStatistics().heap_size_limit)}MB\`);
} else {
  console.log(\`parent: heap_size_limit=\${mb(v8.getHeapStatistics().heap_size_limit)}MB\`);
  fork(__filename, ["child", "fork() child "]).on("exit", () => {
    spawn(process.execPath, [__filename, "child", "spawn(node) child"], { stdio: "inherit" });
  });
}
~~~

~~~text
$ node --max-old-space-size=256 children.js
parent: heap_size_limit=304MB
  fork() child : heap_size_limit=304MB
  spawn(node) child: heap_size_limit=8240MB
$ NODE_OPTIONS=--max-old-space-size=256 node children.js
parent: heap_size_limit=304MB
  fork() child : heap_size_limit=304MB
  spawn(node) child: heap_size_limit=304MB
$ node children.js --max-old-space-size=256   (flag AFTER the script)
parent: heap_size_limit=8240MB
  fork() child : heap_size_limit=8240MB
  spawn(node) child: heap_size_limit=8240MB
~~~

- A command-line flag reached the \`fork()\` child (fork reuses the parent's \`execArgv\`) but **not** the \`spawn\` child.
- \`NODE_OPTIONS\` reached **every** child, because environment variables are inherited.
- A flag written **after** the script name did nothing at all: Node passed it to the script as an ordinary argument.

## 8. Common Pitfalls

- **Treating the flag as a leak fix.** As measured, a 4x cap let the leak grow several times bigger and then gave the same crash.
- **Thinking the value is in bytes or gigabytes.** It is megabytes: \`4096\` means 4 GB.
- **Setting it equal to the container limit.** Off-heap memory (543 MB of Buffers in the test above) is not counted, so the container gets killed first.
- **Expecting to catch the OOM.** No \`try/catch\`, \`'uncaughtException'\` or \`'exit'\` handler runs; in the test, neither handler printed anything.
- **Putting the flag after the script name.** \`node app.js --max-old-space-size=4096\` passes it to your app as an argument, not to V8; the measured limit stayed at the default. It must come before the script, or go in \`NODE_OPTIONS\`.
- **Setting the flag on the wrong process.** A child started with \`spawn\` did not inherit a command-line flag in the test above; \`NODE_OPTIONS\` did.
- **Quoting a default limit from memory.** It depends on the Node version and the machine or container; this machine reported 8240 MB.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it:</strong> <span style="color:#f0e2c8;">"It caps V8's old generation, where long-lived objects live, in megabytes. The total heap limit is that plus the small young generation."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Say what happens at the limit:</strong> <span style="color:#f0e2c8;">"If a full GC cannot free space, V8 aborts with 'heap out of memory'. It is fatal; no exception handler or exit handler runs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Separate leak from big workload:</strong> <span style="color:#f0e2c8;">"Raise it only for a genuinely large working set. For a leak it just delays the crash; I measured it: a 4x cap let the leak grow several times bigger, then the same error."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mention off-heap memory:</strong> <span style="color:#f0e2c8;">"Buffers are outside the V8 heap. 500 MB of Buffers ran fine under a 64 MB cap, so in a container I set the flag well below the memory limit."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Show how to verify:</strong> <span style="color:#f0e2c8;">"I pass it on the command line or in <code style="background:#332310;color:#ffca28;">NODE_OPTIONS</code>, then print <code style="background:#332310;color:#ffca28;">v8.getHeapStatistics().heap_size_limit</code> inside the container to confirm."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the reported heap limit a bit higher than the number you passed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;">heap_size_limit</code> covers the whole heap, and the flag only sets the old generation. Measured here, the difference was always 48 MB, the young generation. With <code style="background:#332310;color:#ffca28;">--max-semi-space-size=64</code> the gap grew to 192 MB, which shows the young part is sized separately.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The process is killed in Kubernetes with exit code 137 but never logs "heap out of memory". What is going on?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">137 is 128 + 9, a <code style="background:#332310;color:#ffca28;">SIGKILL</code>, which usually means the container's memory limit was hit and the kernel killed the process. V8's own limit was never reached, because the memory was outside the heap (Buffers, native code) or the heap cap was set higher than the container allows. The V8 error instead ends with <code style="background:#332310;color:#ffca28;">SIGABRT</code>, exit 134, as in the test. Fix it by lowering the heap cap below the limit or reducing off-heap use.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you get any information out of a process that is about to run out of heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not from JavaScript at the moment of the crash, since no handler runs. But Node can write a heap snapshot as the limit gets close with <code style="background:#332310;color:#ffca28;">--heapsnapshot-near-heap-limit=1</code>, and you can watch <code style="background:#332310;color:#ffca28;">process.memoryUsage().heapUsed</code> against <code style="background:#332310;color:#ffca28;">heap_size_limit</code> and alert or shed load before reaching it. Tried here on the 64 MB leak script: Node printed <code style="background:#332310;color:#ffca28;">Wrote snapshot to Heap.….heapsnapshot</code> (a 166 MB file) just before the fatal error. The snapshot then shows which objects filled the heap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a bigger heap always better if the machine has the RAM?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A bigger old generation means each major GC has more to scan, so pauses can get longer, and a leak takes longer to show up, which makes it harder to catch in testing. It also lets one process take memory other processes on the host need. Size it to the real working set plus margin, not to "as much as possible".</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">You added the flag, but the process that crashes still has the old limit. What would you check?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">First, placement: a flag after the script name becomes a plain argument and V8 never sees it. Second, which process crashes: tools like npm, test runners and build tools often start more Node processes. Measured in section 7, a command-line flag reached a <code style="background:#332310;color:#ffca28;">fork()</code> child (fork reuses the parent <code style="background:#332310;color:#ffca28;">execArgv</code>) but not a child started with <code style="background:#332310;color:#ffca28;">spawn(process.execPath, ...)</code>, while <code style="background:#332310;color:#ffca28;">NODE_OPTIONS</code> reached both because it is inherited through the environment. Then print <code style="background:#332310;color:#ffca28;">heap_size_limit</code> from the process that actually dies.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Young generation / new space** | Small area for new objects, cleaned often by Scavenge |
| **Old generation / old space** | Large area for long-lived objects, cleaned by Mark-Compact |
| **\`--max-old-space-size\`** | Caps the old generation, in MB |
| **\`heap_size_limit\`** | The real total heap limit, from \`v8.getHeapStatistics()\` |
| **Heap OOM** | V8 cannot allocate after a full GC and aborts (exit 134) |
| **Off-heap memory** | Buffers, ArrayBuffers, native memory: not limited by the flag |
| **\`NODE_OPTIONS\`** | Environment variable for passing Node flags |

---
**Conclusion:** \`--max-old-space-size\` sets the size of V8's old generation in megabytes, and the total heap limit is that value plus the young generation (48 MB extra on every measurement here). When the old generation fills up and garbage collection cannot free space, the process aborts with exit 134, and no JavaScript handler gets a chance to run. That makes the flag the right tool for a job that genuinely needs a bigger working set, and the wrong tool for a leak: the never-evicting cache grew several times bigger under a four-times-larger cap and then died the same way. Remember that Buffers live outside the heap (500 MB of them ran under a 64 MB cap), set the cap below any container limit, and confirm the result with \`heap_size_limit\` rather than trusting a default from memory.`,
    examples: [
      {
        label: "Setting the flag and reading back the limit the process really got",
        tech: "bash",
        runnable: false,
        code: `# Value is in megabytes (MiB) and caps V8's OLD generation only
node --max-old-space-size=4096 server.js

# Same thing through the environment (handy for npm scripts, Docker, PaaS)
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Check the limit the process actually got (run it INSIDE the container)
node --max-old-space-size=512 -p "Math.round(require('v8').getHeapStatistics().heap_size_limit / 2**20) + ' MB'"
# -> 560 MB   (512 old space + 48 MB young generation on this machine)`,
      },
      {
        label: "A never-evicting cache: raising the cap only delays the crash",
        tech: "javascript",
        runnable: false,
        code: `const v8 = require("node:v8");
const mb = (b) => Math.round(b / 1024 / 1024);
console.log(\`limit \${mb(v8.getHeapStatistics().heap_size_limit)}MB\`);
process.on("exit", (code) => console.log("exit handler ran, code", code));
process.on("uncaughtException", (e) => console.log("uncaughtException handler ran:", e.message));

const keep = [];                 // a "cache" that never evicts: every object stays reachable
let i = 0;
setInterval(() => {
  for (let k = 0; k < 20000; k++) keep.push({ id: i++, payload: "x".repeat(100) + i });
  if (i % 100000 === 0) console.log(\`objects=\${i}  heapUsed=\${mb(process.memoryUsage().heapUsed)}MB\`);
}, 1);`,
      },
      {
        label: "Buffers live outside the V8 heap, so the flag does not limit them",
        tech: "javascript",
        runnable: false,
        code: `const v8 = require("node:v8");
const mb = (b) => Math.round(b / 1024 / 1024);
const bufs = [];
for (let i = 0; i < 10; i++) bufs.push(Buffer.alloc(50 * 1024 * 1024, 1)); // 500 MB of Buffers
const m = process.memoryUsage();
console.log(\`heap limit=\${mb(v8.getHeapStatistics().heap_size_limit)}MB heapUsed=\${mb(m.heapUsed)}MB arrayBuffers=\${mb(m.arrayBuffers)}MB rss=\${mb(m.rss)}MB\`);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Node.js native addons and when would you use N-API?",
    seoDescription:
      "Native addons are compiled .node libraries. Verified: one Node-API build loaded on Node 20, 22 and 24, a raw V8 addon did not, and C was no faster than JS.",
    description: `**Question presented to candidate:**
"Your team wants to call an existing C++ image-processing library from Node, and someone else suggests rewriting a slow JavaScript loop in C 'to make it faster'. Explain what a native addon is, what Node-API (N-API) gives you over writing against V8 directly, and which of those two ideas is actually a good reason to go native."

**What a strong answer should cover:**
- A **native addon** is a shared library (a \`.node\` file) compiled from C/C++ (or Rust, Zig…) that Node loads with \`require()\` like a JS module. \`bcrypt\`, \`sharp\`, \`better-sqlite3\` and \`canvas\` are well-known examples.
- **Node-API** is a C API that is **ABI-stable**: an addon compiled once keeps loading on later Node major versions. Addons written directly against V8/\`node.h\` (or NAN) are tied to one \`NODE_MODULE_VERSION\` and must be rebuilt for every major.
- Good reasons to go native: **wrapping an existing C/C++ library**, using OS or hardware features JavaScript cannot reach, or SIMD/heavily optimised code. "Rewrite a loop in C" is usually **not** one: V8's JIT is fast, and every JS-to-native call has a cost.
- A synchronous native function **blocks the event loop** like any sync JS. Long work should use \`napi_create_async_work\` (runs on the libuv thread pool) or a worker thread.
- The costs: a compiler toolchain (\`node-gyp\`, Python, a C++ compiler) on install, or prebuilt binaries per platform/arch (\`prebuildify\`, \`node-pre-gyp\`); memory-safety bugs that crash the whole process; harder debugging.
- Alternatives worth naming: **WebAssembly** (portable, sandboxed), worker threads for CPU work in plain JS, or calling a separate process.

**Clarifying questions expected:**
- "Is there an existing native library we must use, or is this purely about speed?"
- "Which platforms and Node versions do we have to ship to, and can our install environment compile C++?"

**Code / implementation expected:** Optional: the shape of a Node-API function (\`napi_get_cb_info\`, \`napi_create_double\`), the \`binding.gyp\`, and how it is loaded from JS.`,
    answer: `**Target Audience:** Senior Node.js engineers who may need to call C/C++ code, and anyone asked "would you rewrite this in C?" in a design round.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with <code>📌 Interview term:</code>. A real C addon was written, compiled with \`node-gyp\`, and loaded on Node v20.20.2, v22.22.0 and v24.22.0 on Linux x64. All output on this page is from those runs.

## 1. Why This Even Matters — A Story First

Imagine you hire a specialist contractor who only speaks another language. You have two options.

- You can learn the contractor's dialect exactly as it is spoken **this year**. It works, but every time the dialect shifts, your instructions stop making sense and you must relearn them.
- Or you can both agree to use a **standard phrasebook** that is promised never to change. You write your instructions once, and they keep working year after year.

A **native addon** is Node hiring a C/C++ contractor. Writing against **V8's own C++ API** is learning this year's dialect: V8 changes with every Node major, so the addon must be recompiled. **Node-API** is the phrasebook: a stable C interface, so one compiled addon keeps working on newer Node versions.

And one more thing the story teaches: calling a contractor has overhead. You would not phone a specialist to add two numbers.

## 2. What a Native Addon Is

📌 **Interview term: native addon** — a shared library compiled from C, C++ or another systems language, with a \`.node\` extension. \`require("./build/Release/x.node")\` loads it with the operating system's dynamic loader (\`dlopen\` on Linux), and its exports appear as normal JavaScript functions.

📌 **Interview term: Node-API (formerly N-API)** — a C API, provided by Node itself, for writing addons without touching V8's internal C++ types. It shipped as experimental in Node 8.0.0 and is marked stable in the Node 10 docs ([Node.js v10.14.2 N-API docs](https://nodejs.org/download/release/v10.14.2/docs/api/n-api.html)). There is also \`node-addon-api\`, a header-only C++ wrapper around it.

📌 **Interview term: ABI stability** — "application binary interface": the compiled shape of function calls and data structures. Node-API keeps it the same across Node versions, so the compiled \`.node\` file does not need rebuilding.

📌 **Interview term: \`NODE_MODULE_VERSION\`** — a number that changes with each Node major (shown at runtime as \`process.versions.modules\`). Addons built directly on V8/\`node.h\` are stamped with it and refuse to load if it does not match.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="JavaScript calls into a native addon either through the stable Node-API layer, which survives Node upgrades, or directly against the V8 C++ API, which must be rebuilt for each Node major version">
  <defs>
    <marker id="na-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="230" y="16" width="180" height="40" rx="8"/>
  <text class="d-text" x="320" y="41" text-anchor="middle">your JavaScript</text>
  <path class="d-edge-accent" d="M 290 56 L 160 100" marker-end="url(#na-arrow)"/>
  <path class="d-edge" d="M 350 56 L 480 100" marker-end="url(#na-arrow)"/>
  <rect class="d-box-accent" x="40" y="106" width="240" height="56" rx="10"/>
  <text class="d-text d-accent" x="160" y="130" text-anchor="middle">Node-API (C)</text>
  <text class="d-sub" x="160" y="150" text-anchor="middle">same binary on 20, 22, 24</text>
  <rect class="d-box" x="360" y="106" width="240" height="56" rx="10"/>
  <text class="d-text" x="480" y="130" text-anchor="middle">V8 C++ API, node.h</text>
  <text class="d-sub" x="480" y="150" text-anchor="middle">rebuild for every major</text>
  <rect class="d-box-muted" x="40" y="180" width="560" height="36" rx="8"/>
  <text class="d-sub" x="320" y="203" text-anchor="middle">V8 engine and libuv inside the node binary</text>
</svg>

Both paths end up in the same engine. The difference is whether your compiled code depends on V8's internal layout (right) or on a stable contract that Node translates for you (left).

## 3. The Addon That Was Built

A small C file with four functions: \`add(a, b)\`, two versions of a prime-counting loop (64-bit and 32-bit integers), and an async version that runs on the thread pool and returns a Promise.

<details>
<summary>Click to expand: the full fastmath.c (Node-API, plain C)</summary>

~~~c
#include <node_api.h>
#include <stdlib.h>

/* add(a, b): two JS numbers in, one JS number out */
static napi_value Add(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];
  napi_get_cb_info(env, info, &argc, args, NULL, NULL);
  if (argc < 2) {
    napi_throw_type_error(env, NULL, "add expects two numbers");
    return NULL;
  }
  double a, b;
  if (napi_get_value_double(env, args[0], &a) != napi_ok ||
      napi_get_value_double(env, args[1], &b) != napi_ok) {
    napi_throw_type_error(env, NULL, "add expects two numbers");
    return NULL;
  }
  napi_value result;
  napi_create_double(env, a + b, &result);
  return result;
}

/* countPrimes(n): a CPU-bound loop that runs entirely in C */
static napi_value CountPrimes(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, NULL, NULL);
  int64_t n = 0;
  napi_get_value_int64(env, args[0], &n);
  int64_t count = 0;
  for (int64_t i = 2; i < n; i++) {
    int prime = 1;
    for (int64_t d = 2; d * d <= i; d++) {
      if (i % d == 0) { prime = 0; break; }
    }
    count += prime;
  }
  napi_value result;
  napi_create_int64(env, count, &result);
  return result;
}

/* Same loop with 32-bit integers, which is what V8 uses for small ints */
static napi_value CountPrimes32(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, NULL, NULL);
  uint32_t n = 0;
  napi_get_value_uint32(env, args[0], &n);
  uint32_t count = 0;
  for (uint32_t i = 2; i < n; i++) {
    int prime = 1;
    for (uint32_t d = 2; d * d <= i; d++) {
      if (i % d == 0) { prime = 0; break; }
    }
    count += prime;
  }
  napi_value result;
  napi_create_uint32(env, count, &result);
  return result;
}

/* countPrimesAsync(n): same loop on a libuv thread-pool thread, returns a Promise */
typedef struct { uint32_t n; uint32_t count; napi_deferred deferred; napi_async_work work; } Job;

static void Execute(napi_env env, void* data) {      /* worker thread: no JS allowed here */
  Job* job = (Job*)data;
  uint32_t count = 0;
  for (uint32_t i = 2; i < job->n; i++) {
    int prime = 1;
    for (uint32_t d = 2; d * d <= i; d++) { if (i % d == 0) { prime = 0; break; } }
    count += prime;
  }
  job->count = count;
}

static void Complete(napi_env env, napi_status status, void* data) {  /* back on the main thread */
  Job* job = (Job*)data;
  napi_value result;
  napi_create_uint32(env, job->count, &result);
  napi_resolve_deferred(env, job->deferred, result);
  napi_delete_async_work(env, job->work);
  free(job);
}

static napi_value CountPrimesAsync(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1], promise, name;
  napi_get_cb_info(env, info, &argc, args, NULL, NULL);
  Job* job = (Job*)calloc(1, sizeof(Job));
  napi_get_value_uint32(env, args[0], &job->n);
  napi_create_promise(env, &job->deferred, &promise);
  napi_create_string_utf8(env, "countPrimes", NAPI_AUTO_LENGTH, &name);
  napi_create_async_work(env, NULL, name, Execute, Complete, job, &job->work);
  napi_queue_async_work(env, job->work);
  return promise;
}

NAPI_MODULE_INIT() {
  napi_value fn;
  napi_create_function(env, "add", NAPI_AUTO_LENGTH, Add, NULL, &fn);
  napi_set_named_property(env, exports, "add", fn);
  napi_create_function(env, "countPrimes", NAPI_AUTO_LENGTH, CountPrimes, NULL, &fn);
  napi_set_named_property(env, exports, "countPrimes", fn);
  napi_create_function(env, "countPrimes32", NAPI_AUTO_LENGTH, CountPrimes32, NULL, &fn);
  napi_set_named_property(env, exports, "countPrimes32", fn);
  napi_create_function(env, "countPrimesAsync", NAPI_AUTO_LENGTH, CountPrimesAsync, NULL, &fn);
  napi_set_named_property(env, exports, "countPrimesAsync", fn);
  return exports;
}
~~~

</details>

The anatomy of every Node-API function is the same:

1. \`napi_get_cb_info\` — get the JavaScript arguments.
2. \`napi_get_value_double\` / \`_int64\` / \`_uint32\` — convert JS values to C values. Each call returns a \`napi_status\`, which you check.
3. Do the work in C.
4. \`napi_create_double\` / \`_uint32\` — wrap the result as a JS value and return it. To raise an error, call \`napi_throw_type_error\`.
5. \`NAPI_MODULE_INIT\` — registers the exports when the module loads.

\`binding.gyp\` lists the source files, and \`npx node-gyp rebuild\` compiles them into \`build/Release/fastmath.node\`. The third example on this page shows the build commands.

## 4. Verified: One Binary, Three Node Versions

The same compiled \`fastmath.node\`, built once on Node 22, loaded by three different Node majors:

~~~text
v22.22.0 napi 10 modules ABI 127 -> add(2,3) = 5
v20.20.2 napi 9 modules ABI 115 -> add(2,3) = 5
v24.22.0 napi 10 modules ABI 137 -> add(2,3) = 5
~~~

For comparison, a tiny addon written directly against \`node.h\` and V8's C++ classes, also built on Node 22:

~~~text
v22.22.0 raw V8 addon add(2,3) = 5
v20.20.2 raw V8 addon FAILED: was compiled against a different Node.js version using NODE_MODULE_VERSION 127. This version of Node.js requires
v24.22.0 raw V8 addon FAILED: was compiled against a different Node.js version using NODE_MODULE_VERSION 127. This version of Node.js requires
~~~

The full error on Node 20 was:

~~~text
The module '<work>/rawv8/build/Release/rawadd.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 127. This version of Node.js requires
NODE_MODULE_VERSION 115. Please try re-compiling or re-installing
the module (for instance, using \`npm rebuild\` or \`npm install\`).
~~~

with error code \`ERR_DLOPEN_FAILED\`. This is exactly the error people hit after upgrading Node with an old \`node_modules\` folder. With Node-API, the three \`NODE_MODULE_VERSION\`s (115, 127, 137) did not matter.

📌 **Interview term: Node-API version** — separate from the Node version. \`process.versions.napi\` was 9 on Node 20 and 10 on Node 22 and 24. An addon declares the minimum Node-API version it needs; it then loads on any Node that offers at least that.

## 5. Verified: "Rewrite It in C" Is Usually Not a Speed Win

The first example on this page calls the addon and runs the same algorithm in plain JavaScript:

~~~text
Node-API version of this runtime: 10
native.add(2, 3) = 5
bad input -> TypeError: add expects two numbers
C, int64 loop  countPrimes(3000000) = 216816 in 1090ms
C, uint32 loop countPrimes(3000000) = 216816 in 652ms
JavaScript     countPrimes(3000000) = 216816 in 673ms
10 million tiny add() calls: native 310ms, JavaScript 9ms
a 10ms timer fired after 705ms
~~~

The same benchmark repeated five times (just the loop timings):

~~~text
C, int64 loop  1126ms | C, uint32 loop 661ms | JavaScript     736ms | 
C, int64 loop  1046ms | C, uint32 loop 645ms | JavaScript     691ms | 
C, int64 loop  1079ms | C, uint32 loop 642ms | JavaScript     715ms | 
C, int64 loop  1060ms | C, uint32 loop 667ms | JavaScript     678ms | 
C, int64 loop  1169ms | C, uint32 loop 661ms | JavaScript     661ms | 
~~~

Read these numbers carefully, because they are the most useful part of this page for an interview:

- **The C loop was not meaningfully faster than JavaScript.** Across all runs, the 32-bit C loop landed within about 20% of JavaScript (usually a little ahead, occasionally behind), and the 64-bit C loop was clearly **slower** than JavaScript every time. The likely reason is that 64-bit division costs more than the 32-bit integer math V8's JIT can use for small JavaScript integers. V8 compiles hot JS to optimised machine code, so simple numeric loops are already close to native speed.
- **Crossing the boundary costs something.** Ten million calls to a native \`add()\` took tens of times longer than calling a JavaScript \`add()\` (V8 can inline the JS one; it cannot inline C), because each call converts arguments and return values between JS and C. Native code wins only when each call does a **lot** of work.
- **A synchronous native call blocks the event loop.** A 10ms timer fired after more than 600ms, because the main thread was busy inside C. Going native does not make work asynchronous.

So the honest answer to "rewrite the slow loop in C" is: profile first, try algorithmic fixes and worker threads, and expect little or no gain from C for this kind of code. See [How do you profile CPU usage with --prof, 0x, or clinic.js flame graphs?](/interview-question/how-do-you-profile-cpu-usage-with-prof-0x-or-clinic-js-flame-graphs).

## 6. Verified: Async Native Work Keeps the Loop Free

📌 **Interview term: \`napi_create_async_work\`** — schedules an \`Execute\` function to run on a libuv thread-pool thread and a \`Complete\` function to run back on the main thread. \`Execute\` must not touch JavaScript values; \`Complete\` resolves the Promise.

The second example calls \`countPrimesAsync\` with a ticking \`setInterval\`:

~~~text
countPrimesAsync() returned immediately: 1 ms
  event loop tick at 201ms
  event loop tick at 402ms
  event loop tick at 602ms
async native result 216816 after 668ms
~~~

The call returned at once, the event loop kept ticking every 200ms, and the Promise resolved when the C loop finished on a pool thread. This is how addons such as \`bcrypt\` keep heavy work off the main thread. It shares the same thread pool as \`fs\` and \`crypto\`, though; see [How does the thread pool work in Node.js?](/interview-question/how-does-the-thread-pool-work-in-node-js).

## 7. When Would You Actually Use One?

| Reason | Native addon a good fit? | Notes |
| :--- | :--- | :--- |
| Wrap an existing C/C++ library (image codecs, databases, ML runtimes) | **Yes** — the main reason | \`sharp\` wraps libvips, \`better-sqlite3\` wraps SQLite |
| OS or hardware access JS cannot reach (USB, special syscalls, GPU APIs) | **Yes** | Often the only option |
| SIMD or hand-tuned numeric kernels | Sometimes | Measure against WebAssembly SIMD too |
| "Make this simple JS loop faster" | **Rarely** | Measured above: no gain, and call overhead |
| CPU-heavy work that blocks the event loop | Not by itself | Use worker threads, or async work inside the addon |

Alternatives to weigh:

- **WebAssembly**: compile C/C++/Rust to \`.wasm\`. One file runs on every OS and CPU with no compiler at install time, and it is sandboxed, so a bug cannot corrupt Node's memory. It cannot call OS APIs directly.
- **Worker threads** for CPU-bound JavaScript: [What are Worker Threads in Node.js and when would you use them?](/interview-question/what-are-worker-threads-in-node-js-and-when-would-you-use-them).
- **A separate process** (a CLI tool or a small service in another language), called through [child_process](/interview-question/when-would-you-use-child-process-module-in-node-js).

## 8. Shipping an Addon

<details>
<summary>Click to expand: what it takes to distribute one</summary>

- **Build from source on install** with \`node-gyp\`. The user's machine needs Python, \`make\` and a C/C++ compiler. This is the classic cause of failed \`npm install\` on Windows or slim Docker images.
- **Prebuilt binaries**: build \`.node\` files for each OS and CPU in CI and ship them inside the package (\`prebuildify\` + \`node-gyp-build\`) or download them at install (\`node-pre-gyp\`, \`prebuild-install\`). With Node-API you need one binary per OS/CPU, not one per Node major as well.
- **Rust and other languages**: \`napi-rs\` (Rust) and similar tools generate Node-API bindings, so the ABI stability benefit is the same.
- **Alpine / musl** systems need their own builds; a glibc binary will not load there.

</details>

## 9. Common Pitfalls

- **Assuming native means faster.** Measured above: the C loop was at best roughly level with JavaScript and at worst slower, and tiny native calls cost tens of times more than JS calls.
- **Doing long work synchronously in the addon.** It froze a 10ms timer for over 600ms. Use async work or a worker.
- **Touching JS values from the worker thread** inside \`Execute\`. Only \`Complete\` (on the main thread) may create or read JS values; breaking this rule crashes the process.
- **Ignoring \`napi_status\` return values.** A wrong argument type then turns into garbage data or a crash instead of a clean \`TypeError\` like the one shown above.
- **Writing against V8 or NAN directly for new code.** You sign up for a rebuild every Node major; the raw addon failed to load on both Node 20 and 24.
- **Forgetting that a crash in C takes down the whole process.** There is no \`try/catch\` for a segmentation fault. Fuzz and test native code harder than JS.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it:</strong> <span style="color:#f0e2c8;">"A native addon is a compiled C or C++ shared library, a <code style="background:#332310;color:#ffca28;">.node</code> file, that Node loads with require and exposes as JavaScript functions."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Explain Node-API:</strong> <span style="color:#f0e2c8;">"Node-API is a stable C interface. I built one addon on Node 22 and the same binary loaded on 20 and 24; a raw V8 addon failed with a NODE_MODULE_VERSION mismatch."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the right reasons:</strong> <span style="color:#f0e2c8;">"Wrapping an existing C/C++ library, or reaching OS and hardware features JavaScript cannot. Speed alone is rarely a good reason."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Back that with data:</strong> <span style="color:#f0e2c8;">"A prime loop in C was roughly level with V8-compiled JS, and slower with 64-bit ints, and tiny native calls were tens of times slower because of the boundary cost. Sync native calls still block the event loop."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the costs and alternatives:</strong> <span style="color:#f0e2c8;">"Toolchain or prebuilt binaries per platform, crashes that kill the process. I would also consider WebAssembly, worker threads, or a separate process."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">After a Node upgrade, the app crashes with "compiled against a different Node.js version". What happened and how do you fix it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A dependency has a non-Node-API addon compiled for the old <code style="background:#332310;color:#ffca28;">NODE_MODULE_VERSION</code>, the exact <code style="background:#332310;color:#ffca28;">ERR_DLOPEN_FAILED</code> reproduced above. The immediate fix is <code style="background:#332310;color:#ffca28;">npm rebuild</code> or a clean <code style="background:#332310;color:#ffca28;">npm ci</code> on the new Node. The lasting fix is upgrading to a version of that package built on Node-API, and in Docker, running the install step on the same Node image you run in production.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a native addon avoid blocking the event loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By not doing the work on the main thread. <code style="background:#332310;color:#ffca28;">napi_create_async_work</code> runs an <code style="background:#332310;color:#ffca28;">Execute</code> callback on a libuv pool thread and a <code style="background:#332310;color:#ffca28;">Complete</code> callback back on the main thread, where it resolves a Promise. In the test, the timer kept ticking every 200ms during the async version, while the sync version delayed a 10ms timer past 600ms. For calling back into JS repeatedly from a native thread there is <code style="background:#332310;color:#ffca28;">napi_threadsafe_function</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Native addon or WebAssembly: how would you choose?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">WebAssembly when the code is pure computation (codecs, parsers, crypto primitives): one portable file, no install-time compiler, sandboxed memory, and it can also run in the browser. A native addon when you need things Wasm cannot do directly: OS APIs, threads managed by the library, GPU drivers, or an existing library that is hard to compile to Wasm. Native gives the most access; Wasm gives the most safety and portability.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;">node-gyp</code>, Node-API and <code style="background:#4a3418;color:#ffe0b2;">node-addon-api</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They are three different layers. <code style="background:#332310;color:#ffca28;">node-gyp</code> is the build tool: it reads <code style="background:#332310;color:#ffca28;">binding.gyp</code>, fetches Node headers and runs the compiler. Node-API is the C interface your code calls, built into Node. <code style="background:#332310;color:#ffca28;">node-addon-api</code> is an optional C++ wrapper over Node-API with classes like <code style="background:#332310;color:#ffca28;">Napi::Number</code> and C++ exceptions, so you write less boilerplate. The addon on this page used plain C Node-API and node-gyp, no wrapper.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why was the 64-bit C loop slower than JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Most likely integer width. V8 represents small JavaScript integers specially and its optimising compiler can use 32-bit integer math for them. The C version declared <code style="background:#332310;color:#ffca28;">int64_t</code>, and 64-bit division is slower on x86-64. Switching only the types to <code style="background:#332310;color:#ffca28;">uint32_t</code> took the C loop from about 1050-1170ms to about 610-740ms, roughly level with JavaScript. The lesson: the type choices and the algorithm matter far more than the language, and you only know by measuring.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Native addon** | A compiled \`.node\` shared library loaded with \`require()\` |
| **Node-API (N-API)** | Node's stable C API for addons; same binary across Node majors |
| **ABI** | The compiled calling convention and data layout code depends on |
| **\`NODE_MODULE_VERSION\`** | Per-major number that non-Node-API addons must match |
| **\`node-gyp\`** | Build tool that compiles addons from \`binding.gyp\` |
| **\`node-addon-api\`** | Optional C++ wrapper over Node-API |
| **\`napi_create_async_work\`** | Runs native work on the libuv thread pool, then completes on the main thread |
| **WebAssembly** | Portable, sandboxed compiled code; an alternative to native addons |

---
**Conclusion:** A native addon is a compiled C/C++ library that Node loads like a module, and Node-API is the stable C interface that lets one compiled binary keep working across Node upgrades. That was shown directly here: the Node-API addon built on Node 22 loaded on 20, 22 and 24, while a raw V8 addon failed on both other versions with a \`NODE_MODULE_VERSION\` mismatch. The same experiment also answers "when would you use one": not to speed up a simple loop (C was at best roughly level with V8's JIT, and tiny native calls cost tens of times more than JS calls), but to wrap existing native libraries or reach OS and hardware features. If you do go native, do long work with async work on the thread pool, ship prebuilt binaries per platform, and keep WebAssembly and worker threads in mind as simpler options.`,
    examples: [
      {
        label: "Loading and benchmarking a compiled Node-API addon against plain JavaScript",
        tech: "javascript",
        runnable: false,
        code: `const native = require("./build/Release/fastmath.node");

console.log("Node-API version of this runtime:", process.versions.napi);
console.log("native.add(2, 3) =", native.add(2, 3));
try { native.add("two", 3); } catch (e) { console.log("bad input ->", e.name + ":", e.message); }

// The same prime-counting loop in plain JavaScript
function countPrimesJS(n) {
  let count = 0;
  for (let i = 2; i < n; i++) {
    let prime = 1;
    for (let d = 2; d * d <= i; d++) if (i % d === 0) { prime = 0; break; }
    count += prime;
  }
  return count;
}
const time = (fn) => {
  const t = process.hrtime.bigint();
  const r = fn();
  return [r, (Number(process.hrtime.bigint() - t) / 1e6).toFixed(0)];
};

const N = 3_000_000;
for (const [name, fn] of [
  ["C, int64 loop ", () => native.countPrimes(N)],
  ["C, uint32 loop", () => native.countPrimes32(N)],
  ["JavaScript    ", () => countPrimesJS(N)],
]) {
  const [r, ms] = time(fn);
  console.log(\`\${name} countPrimes(\${N}) = \${r} in \${ms}ms\`);
}

// Crossing the JS <-> C boundary is not free
const jsAdd = (x, y) => x + y;
const [, nMs] = time(() => { let s = 0; for (let i = 0; i < 1e7; i++) s = native.add(s, 1); return s; });
const [, jMs] = time(() => { let s = 0; for (let i = 0; i < 1e7; i++) s = jsAdd(s, 1); return s; });
console.log(\`10 million tiny add() calls: native \${nMs}ms, JavaScript \${jMs}ms\`);

// A synchronous native call blocks the event loop like any sync JS would
const start = Date.now();
setTimeout(() => console.log(\`a 10ms timer fired after \${Date.now() - start}ms\`), 10);
native.countPrimes32(N);`,
      },
      {
        label: "Async native work on the thread pool keeps the event loop free",
        tech: "javascript",
        runnable: false,
        code: `const native = require("./build/Release/fastmath.node");
const N = 3_000_000;

const start = Date.now();
const ticks = setInterval(() => console.log(\`  event loop tick at \${Date.now() - start}ms\`), 200);

native.countPrimesAsync(N).then((count) => {
  console.log(\`async native result \${count} after \${Date.now() - start}ms\`);
  clearInterval(ticks);
});
console.log("countPrimesAsync() returned immediately:", Date.now() - start, "ms");`,
      },
      {
        label: "Build with node-gyp, then load the same binary on three Node versions",
        tech: "bash",
        runnable: false,
        code: `# binding.gyp tells node-gyp what to compile
cat > binding.gyp <<'GYP'
{ "targets": [ { "target_name": "fastmath", "sources": ["fastmath.c"] } ] }
GYP

npx node-gyp rebuild            # compiles fastmath.c -> build/Release/fastmath.node

# The SAME compiled file, loaded by three different Node majors
for n in node ./node20/bin/node ./node24/bin/node; do
  $n -e 'const m = require("./build/Release/fastmath.node");
         console.log(process.version, "ABI", process.versions.modules, "add(2,3) =", m.add(2, 3))'
done
# v22.22.0 ABI 127 add(2,3) = 5
# v20.20.2 ABI 115 add(2,3) = 5
# v24.22.0 ABI 137 add(2,3) = 5`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does Node.js support HTTPS/TLS for secure servers?",
    seoDescription:
      "Node's https module is an http server on a tls.Server. Verified: cert trust, hostname checks, TLS version limits and hot certificate rotation.",
    description: `**Question presented to candidate:**
"You need a Node.js service to accept HTTPS traffic. Show me how you would create the server, explain what the certificate and private key are actually for, and tell me where you would terminate TLS in a real production setup and why."

**What a strong answer should cover:**
- \`https.createServer({ key, cert }, handler)\` is the \`http\` server API running on top of a \`tls.Server\`. The handler code is identical to plain HTTP; \`req.socket\` is a \`tls.TLSSocket\`.
- The **certificate** proves the server's identity (it binds a public key to a hostname, signed by a CA the client trusts); the **private key** proves the server owns that certificate and is used in the handshake. The key never leaves the server.
- Clients verify two things: the certificate **chains to a trusted CA**, and the **hostname matches** its subjectAltName. Node's client does both by default; \`rejectUnauthorized: false\` turns verification off and should never ship.
- Protocol settings: Node defaults to TLS 1.2 minimum and TLS 1.3 maximum; \`minVersion\`, \`ciphers\` and ALPN (\`ALPNProtocols\`) are configurable per server.
- Operations: certificates expire, so renewal must be automated (Let's Encrypt / ACME), and \`server.setSecureContext()\` swaps in a renewed certificate without a restart. \`SNICallback\` serves several hostnames from one port.
- Production trade-off: most teams **terminate TLS at a load balancer or reverse proxy** (Nginx, Envoy, a cloud LB) for central certificate management and offloading, then re-encrypt internally if the network is not trusted. Terminate in Node when you need end-to-end encryption to the process, mutual TLS, or there is no proxy.

**Clarifying questions expected:**
- "Is there a load balancer or ingress in front of this service already, and does traffic inside the network also need encryption?"
- "Do clients need to authenticate with certificates too (mutual TLS), or only the server?"

**Code / implementation expected:** Yes: a minimal \`https.createServer\` with key and cert, and ideally a client call that shows certificate verification working.`,
    answer: `**Target Audience:** Backend engineers who have deployed Node behind HTTPS but never set up TLS in Node itself.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> for the precise vocabulary. A private certificate authority and certificates were created with \`openssl\`, and every server and client scenario below was run with Node v22.22.0 (OpenSSL 3.5.4 bundled). The output blocks are copied from those runs.

## 1. Why This Even Matters — A Story First

You are sending a sealed letter through a busy post office. Two things matter:

- **Nobody in the middle should read or change it.** So you lock it in a box.
- **It must reach the real recipient, not someone pretending.** So before you hand over the box, the recipient shows you an ID card issued by an office you trust, and the name on the card matches the address on the letter.

TLS does both. The locked box is **encryption**. The ID card is the **certificate**, the trusted office is a **certificate authority (CA)**, and checking the name is **hostname verification**. The private key is the recipient's secret that proves the ID card is really theirs. HTTPS is just ordinary HTTP sent inside that locked box.

## 2. The Moving Parts

📌 **Interview term: TLS (Transport Layer Security)** — the protocol that encrypts a connection and authenticates the server (and optionally the client). HTTPS is HTTP over TLS. Node's TLS support is built on OpenSSL; \`process.versions.openssl\` shows the version.

📌 **Interview term: certificate** — a public document that says "this public key belongs to \`api.example.com\`", signed by a CA. Modern clients check the names in its **subjectAltName (SAN)** field.

📌 **Interview term: private key** — the secret half of the key pair. The server uses it during the handshake to prove it owns the certificate. It never leaves the server and must not be committed to a repository.

📌 **Interview term: certificate authority (CA) and chain of trust** — a CA signs certificates. The client trusts a fixed list of root CAs (Node ships Mozilla's list), and a certificate is accepted only if it chains back to one of them. Your server should send its **intermediate** certificates too, usually by putting the full chain in \`cert\`.

📌 **Interview term: TLS handshake** — the first round trips of a connection, where client and server agree on a protocol version and cipher, the server presents its certificate, and they derive shared encryption keys.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="In the TLS handshake the client says hello, the server answers with its certificate, the client checks the certificate chain and hostname, and then encrypted HTTP flows">
  <defs>
    <marker id="tls-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="16" width="150" height="40" rx="8"/>
  <text class="d-text" x="95" y="41" text-anchor="middle">client</text>
  <rect class="d-box-accent" x="470" y="16" width="150" height="40" rx="8"/>
  <text class="d-text d-accent" x="545" y="41" text-anchor="middle">https server</text>
  <path class="d-edge" d="M 170 84 L 466 84" marker-end="url(#tls-arrow)"/>
  <text class="d-sub" x="318" y="74" text-anchor="middle">hello: versions, ciphers, SNI name</text>
  <path class="d-edge-accent" d="M 470 130 L 174 130" marker-end="url(#tls-arrow)"/>
  <text class="d-sub" x="322" y="120" text-anchor="middle">certificate, proof of private key</text>
  <rect class="d-box" x="20" y="150" width="260" height="40" rx="8"/>
  <text class="d-sub" x="150" y="175" text-anchor="middle">check CA chain and hostname</text>
  <path class="d-edge-accent" d="M 170 222 L 466 222" marker-end="url(#tls-arrow)"/>
  <text class="d-sub" x="318" y="212" text-anchor="middle">encrypted HTTP request</text>
</svg>

Only after the client is satisfied with the certificate does any HTTP data flow, and from then on all of it is encrypted.

## 3. How Node Exposes It

📌 **Interview term: \`https.createServer(options, handler)\`** — the same request handler you would give \`http.createServer\`, plus TLS options: \`key\`, \`cert\`, and optionally \`ca\`, \`minVersion\`, \`ciphers\`, \`ALPNProtocols\`, \`SNICallback\`, \`requestCert\`. Under the hood, the server is a \`tls.Server\`, and every \`req.socket\` is a \`tls.TLSSocket\` with methods like \`getProtocol()\`, \`getCipher()\` and \`getPeerCertificate()\`.

The \`tls\` module is the lower layer: \`tls.createServer\` gives you encrypted TCP for protocols that are not HTTP. For HTTP/2 there is \`http2.createSecureServer\`, covered in [How does HTTP/2 support work in Node.js and how does it differ from HTTP/1.1?](/interview-question/how-does-http-2-support-work-in-node-js-and-how-does-it-differ-from-http-1-1).

The certificates for the tests below were created like this (a private CA for local use; in production a public CA such as Let's Encrypt signs your certificate instead):

~~~bash
# 1. A private certificate authority (CA) for local/dev use
openssl req -x509 -newkey rsa:2048 -nodes -keyout ca-key.pem -out ca-cert.pem \\
  -days 30 -subj "/CN=Demo Local CA"

# 2. A key + signing request for the server
openssl req -newkey rsa:2048 -nodes -keyout server-key.pem -out server.csr -subj "/CN=localhost"

# 3. The CA signs it. Modern clients check subjectAltName, not CN
printf "subjectAltName=DNS:localhost,IP:127.0.0.1\\n" > san.ext
openssl x509 -req -in server.csr -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial \\
  -out server-cert.pem -days 30 -extfile san.ext

# 4. (for mutual TLS) a client certificate signed by the same CA
openssl req -newkey rsa:2048 -nodes -keyout client-key.pem -out client.csr -subj "/CN=billing-service"
openssl x509 -req -in client.csr -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out client-cert.pem -days 30
~~~

## 4. Verified: Trust, Hostnames and Versions

The first example on this page starts an HTTPS server and calls it five different ways:

~~~text
defaults: TLSv1.2 to TLSv1.3
https.Server is a tls.Server: true
1. default trust store only    -> FAIL UNABLE_TO_VERIFY_LEAF_SIGNATURE
2. ca: our private CA          -> OK   TLSv1.3 TLS_AES_256_GCM_SHA384
3. ca ok, servername mismatch  -> FAIL ERR_TLS_CERT_ALTNAME_INVALID
4. ca ok, client max TLS 1.2   -> OK   TLSv1.2 ECDHE-RSA-AES128-GCM-SHA256
   strict server tlsClientError: ERR_SSL_UNSUPPORTED_PROTOCOL
5. TLS1.3-only server, client max 1.2 -> FAIL EPROTO
~~~

What each line proves:

1. **Without our CA, the client refused.** Node's client verifies certificates by default against its bundled root CAs, and our private CA is not one of them. This is the error you get with a self-made certificate.
2. **With \`ca\` set, the connection worked** and negotiated **TLS 1.3** with \`TLS_AES_256_GCM_SHA384\`.
3. **Right CA, wrong name: refused** with \`ERR_TLS_CERT_ALTNAME_INVALID\`. A valid certificate for \`localhost\` is useless for \`example.com\`. Hostname checking is what stops a stolen-but-valid certificate for another site from being used against you.
4. A client limited to TLS 1.2 still connected, with an ECDHE cipher, because Node's defaults allow **TLS 1.2 to 1.3** (read at runtime from \`tls.DEFAULT_MIN_VERSION\` / \`DEFAULT_MAX_VERSION\`).
5. A server with \`minVersion: "TLSv1.3"\` **refused** that same client, and the server saw it as a \`tlsClientError\`.

📌 **Interview term: \`rejectUnauthorized\`** — client option that defaults to \`true\`. Setting it to \`false\` (or \`NODE_TLS_REJECT_UNAUTHORIZED=0\`) skips steps 1 and 3 entirely, so anyone in the middle can impersonate the server. The correct fix for a private CA is the \`ca\` option, exactly as in line 2, or the \`NODE_EXTRA_CA_CERTS\` environment variable.

Both fixes were checked. A second script, \`sni-extra.js\`, runs a server whose certificate is chosen by an \`SNICallback\` and makes a request with **no** \`ca\` option at all:

~~~text
$ node sni-extra.js
  SNICallback asked for: localhost
no ca option -> FAIL UNABLE_TO_VERIFY_LEAF_SIGNATURE
$ NODE_EXTRA_CA_CERTS=ca-cert.pem node sni-extra.js
  SNICallback asked for: localhost
no ca option -> 200 serial EFA8EE7A
~~~

The same request failed without the variable and succeeded with it. The callback also showed the client sending the hostname (\`localhost\`) before the server picked a certificate, which is SNI at work.

## 5. Verified: Renewing a Certificate Without a Restart

Certificates expire, often every 90 days with Let's Encrypt. The second example swaps in a renewed certificate on a running server:

~~~text
before rotation: serial=EFA8EE7A valid_to=Nov 16 13:10:57 2026 GMT
after  rotation: serial=EFA8EE7B valid_to=Dec 16 13:11:33 2026 GMT
plain http:// to the TLS port -> ECONNRESET
~~~

📌 **Interview term: \`server.setSecureContext(options)\`** — replaces the key and certificate for **new** connections without closing the listening socket. The serial number and expiry date changed between the two requests, with no restart. In practice you would call it when your ACME client (certbot, a cert-manager sidecar) writes new files, for example from an \`fs.watch\` handler.

The last line is a common debugging moment: plain \`http://\` sent to an HTTPS port does not get a helpful error page. The TLS layer sees garbage instead of a handshake and drops the connection (\`ECONNRESET\` here).

## 6. Verified: Mutual TLS

📌 **Interview term: mutual TLS (mTLS)** — the server also requires a certificate from the **client**. It is common between internal services, where it replaces or backs up API keys.

The third example sets \`requestCert: true\` and \`rejectUnauthorized: true\` on the server, with \`ca\` listing the CA that signs client certificates:

~~~text
client with no certificate  -> FAIL ERR_SSL_TLSV13_ALERT_CERTIFICATE_REQUIRED
client with a CA-signed cert -> 200 hello billing-service
~~~

The client without a certificate was rejected during the handshake, before any HTTP happened. The one with a CA-signed certificate got through, and the handler read the client's identity (\`CN=billing-service\`) from \`req.socket.getPeerCertificate()\`.

## 7. Where Should TLS Terminate?

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Option A terminates TLS at a load balancer which forwards plain or re-encrypted HTTP to Node, option B lets Node terminate TLS itself">
  <defs>
    <marker id="term-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="30">A. at the edge</text>
  <rect class="d-box-muted" x="20" y="46" width="120" height="40" rx="8"/>
  <text class="d-sub" x="80" y="71" text-anchor="middle">browser</text>
  <path class="d-edge-accent" d="M 140 66 L 226 66" marker-end="url(#term-arrow)"/>
  <rect class="d-box-accent" x="234" y="46" width="170" height="40" rx="8"/>
  <text class="d-sub" x="319" y="71" text-anchor="middle">load balancer TLS</text>
  <path class="d-edge-dashed" d="M 404 66 L 490 66" marker-end="url(#term-arrow)"/>
  <rect class="d-box" x="498" y="46" width="122" height="40" rx="8"/>
  <text class="d-sub" x="559" y="71" text-anchor="middle">node http</text>
  <text class="d-text" x="20" y="134">B. in Node</text>
  <rect class="d-box-muted" x="20" y="150" width="120" height="40" rx="8"/>
  <text class="d-sub" x="80" y="175" text-anchor="middle">client</text>
  <path class="d-edge-accent" d="M 140 170 L 490 170" marker-end="url(#term-arrow)"/>
  <rect class="d-box-accent" x="498" y="150" width="122" height="40" rx="8"/>
  <text class="d-sub" x="559" y="175" text-anchor="middle">node https</text>
</svg>

The dashed hop in option A is plain HTTP or a second, internal TLS connection, depending on how much you trust the network between the load balancer and Node.

| | TLS at a load balancer / reverse proxy | TLS in Node (\`https\`) |
| :--- | :--- | :--- |
| Certificate management | One place, often automatic (cloud LB, cert-manager) | Every Node instance needs the files and renewal |
| CPU for handshakes | Offloaded from Node | On the Node process |
| Encryption inside the network | Only if you re-encrypt to the backend | End to end by default |
| Mutual TLS to the app | Proxy must verify and forward identity in headers | Node sees the client certificate directly |
| Client IP and protocol | Must read \`X-Forwarded-For\` / \`X-Forwarded-Proto\` and trust only the proxy | Available on the socket |
| Typical use | Public web apps and APIs | Service-to-service mTLS, small deployments, no proxy available |

Most production setups pick option A for public traffic. Either way, also send an HSTS header so browsers never fall back to plain HTTP; see [What is Helmet and which HTTP security headers should a Node.js API set?](/interview-question/what-is-helmet-and-which-http-security-headers-should-a-node-js-api-set).

## 8. Common Pitfalls

- **\`rejectUnauthorized: false\` or \`NODE_TLS_REJECT_UNAUTHORIZED=0\` to "fix" a certificate error.** It silences exactly the checks that failed in lines 1 and 3 above. Use \`ca\` or \`NODE_EXTRA_CA_CERTS\`.
- **Serving only the leaf certificate.** Some clients cannot build the chain without the intermediate. Put the full chain in \`cert\`.
- **A certificate without the right subjectAltName.** Clients check SAN, not just the CN; a missing name gives \`ERR_TLS_CERT_ALTNAME_INVALID\`.
- **Forgetting renewal.** A certificate that expires takes the whole service down. Automate it and reload with \`setSecureContext()\`.
- **Loosening \`minVersion\` or \`ciphers\` for one old client.** That weakens every connection. The defaults (TLS 1.2+) are sensible; tighten rather than loosen.
- **Trusting \`X-Forwarded-Proto\` from anyone.** Behind a proxy, only trust forwarding headers set by your own proxy (\`app.set("trust proxy", ...)\` in Express), or a client can claim it used HTTPS when it did not.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the API:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;">https.createServer({ key, cert }, handler)</code>. It is the normal http server on top of a <code style="background:#332310;color:#ffca28;">tls.Server</code>, built on OpenSSL, so the handler code does not change."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Explain cert and key:</strong> <span style="color:#f0e2c8;">"The certificate is the public ID card, signed by a CA, naming the host. The private key proves the server owns it and never leaves the server."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Describe verification:</strong> <span style="color:#f0e2c8;">"Clients check the chain to a trusted CA and the hostname. I tested both: an unknown CA failed, a wrong name failed with ALTNAME_INVALID. Never turn off rejectUnauthorized."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cover operations:</strong> <span style="color:#f0e2c8;">"Defaults are TLS 1.2 to 1.3. Certificates expire, so renewal is automated, and <code style="background:#332310;color:#ffca28;">setSecureContext()</code> swaps a renewed cert without a restart."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Give the production view:</strong> <span style="color:#f0e2c8;">"Usually TLS terminates at a load balancer for central cert management, re-encrypting inside if needed. Node terminates it itself for mutual TLS or when there is no proxy."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you serve several domains, each with its own certificate, from one Node process?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With SNI (Server Name Indication): the client sends the hostname it wants in its first handshake message, before any certificate is chosen. Node gives you <code style="background:#332310;color:#ffca28;">SNICallback(servername, cb)</code>, where you look up the right secure context, created with <code style="background:#332310;color:#ffca28;">tls.createSecureContext({ key, cert })</code>, and pass it to <code style="background:#332310;color:#ffca28;">cb</code>. You can also call <code style="background:#332310;color:#ffca28;">server.addContext(hostname, options)</code> for a fixed list.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your service calls an internal API that uses a company CA, and requests fail with UNABLE_TO_VERIFY_LEAF_SIGNATURE. What do you do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Trust that CA explicitly instead of disabling checks. Either pass <code style="background:#332310;color:#ffca28;">ca</code> on the request or agent, which is exactly what fixed line 2 of the test, or set <code style="background:#332310;color:#ffca28;">NODE_EXTRA_CA_CERTS=/path/company-ca.pem</code> so the whole process trusts it in addition to the bundled roots. Setting <code style="background:#332310;color:#ffca28;">rejectUnauthorized: false</code> would also make the error go away, along with all protection against impersonation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If TLS terminates at the load balancer, how does your Node app know the original request was HTTPS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The load balancer adds <code style="background:#332310;color:#ffca28;">X-Forwarded-Proto: https</code> and <code style="background:#332310;color:#ffca28;">X-Forwarded-For</code> with the client IP. The app must trust those headers only when they come from the proxy, for example with Express <code style="background:#332310;color:#ffca28;">trust proxy</code> set to the proxy address or hop count. Otherwise any client can send the header itself. This matters for secure cookies, redirects to HTTPS and rate limiting by IP.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does TLS slow down a Node server much?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The expensive part is the handshake, which uses public-key cryptography once per new connection; the encryption of the data afterwards is cheap on modern CPUs. So the big wins are reusing connections (keep-alive agents, HTTP/2) and TLS session resumption, so clients do not redo full handshakes. If handshake CPU becomes the bottleneck, terminating at a proxy moves that work off the Node process. This page did not benchmark it, so measure for your own traffic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is ALPN and why does it matter for HTTPS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Application-Layer Protocol Negotiation is a TLS extension where client and server agree which protocol runs inside the connection, such as <code style="background:#332310;color:#ffca28;">h2</code> or <code style="background:#332310;color:#ffca28;">http/1.1</code>, during the handshake. Browsers only use HTTP/2 when it is negotiated this way, which is why HTTP/2 in browsers effectively requires TLS. In Node it is the <code style="background:#332310;color:#ffca28;">ALPNProtocols</code> option, and <code style="background:#332310;color:#ffca28;">http2.createSecureServer({ allowHTTP1: true })</code> handles both.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **TLS** | Protocol that encrypts a connection and authenticates the server |
| **Certificate** | Signed statement binding a public key to hostnames (SAN) |
| **Private key** | Secret that proves the server owns its certificate |
| **CA / chain of trust** | Signers the client already trusts; certs must chain to one |
| **\`rejectUnauthorized\`** | Client check of chain and hostname; must stay \`true\` |
| **\`setSecureContext()\`** | Swap key/cert on a running server |
| **SNI** | Client sends the hostname so the server can pick a certificate |
| **ALPN** | Negotiates \`h2\` or \`http/1.1\` inside TLS |
| **mTLS** | The client also presents a certificate |
| **TLS termination** | Where the encrypted connection ends: proxy or Node |

---
**Conclusion:** Node supports HTTPS through the \`https\` module, which is the familiar \`http\` server running on a \`tls.Server\` backed by OpenSSL: give it a private key and a certificate and your handler code stays the same. The tests on this page showed the parts that actually protect users: the client rejected an unknown CA, rejected a valid certificate for the wrong hostname, negotiated TLS 1.3 by default, and could be held to a minimum version; a renewed certificate was swapped in with \`setSecureContext()\` without a restart; and mutual TLS refused a client with no certificate. In production, most public traffic terminates TLS at a load balancer for central certificate management, while Node terminates TLS itself for end-to-end encryption, service-to-service mTLS, or when no proxy exists. Whichever you choose, never switch off certificate verification to make an error go away.`,
    examples: [
      {
        label: "An HTTPS server and five client scenarios: trust, hostname, TLS versions",
        tech: "javascript",
        runnable: false,
        code: `const https = require("node:https");
const tls = require("node:tls");
const fs = require("node:fs");

console.log("defaults:", tls.DEFAULT_MIN_VERSION, "to", tls.DEFAULT_MAX_VERSION);

const handler = (req, res) => {
  const s = req.socket; // a tls.TLSSocket
  res.end(\`\${s.getProtocol()} \${s.getCipher().name}\`);
};
const server = https.createServer(
  { key: fs.readFileSync("server-key.pem"), cert: fs.readFileSync("server-cert.pem") },
  handler,
);
console.log("https.Server is a tls.Server:", server instanceof tls.Server);

const ca = fs.readFileSync("ca-cert.pem");
function get(label, port, opts) {
  return new Promise((resolve) => {
    https.get({ host: "localhost", port, path: "/", agent: false, ...opts }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => { console.log(\`\${label} -> OK   \${body}\`); resolve(); });
    }).on("error", (e) => { console.log(\`\${label} -> FAIL \${e.code}\`); resolve(); });
  });
}

server.listen(0, async () => {
  const port = server.address().port;
  await get("1. default trust store only   ", port, {});
  await get("2. ca: our private CA         ", port, { ca });
  await get("3. ca ok, servername mismatch ", port, { ca, servername: "example.com" });
  await get("4. ca ok, client max TLS 1.2  ", port, { ca, maxVersion: "TLSv1.2" });

  // A stricter server that only speaks TLS 1.3
  const strict = https.createServer(
    { key: fs.readFileSync("server-key.pem"), cert: fs.readFileSync("server-cert.pem"), minVersion: "TLSv1.3" },
    handler,
  );
  strict.on("tlsClientError", (e) => console.log("   strict server tlsClientError:", e.code));
  strict.listen(0, async () => {
    await get("5. TLS1.3-only server, client max 1.2", strict.address().port, { ca, maxVersion: "TLSv1.2" });
    strict.close();
    server.close();
  });
});`,
      },
      {
        label: "Rotating a renewed certificate without restarting: server.setSecureContext()",
        tech: "javascript",
        runnable: false,
        code: `const https = require("node:https");
const http = require("node:http");
const fs = require("node:fs");

const load = (k, c) => ({ key: fs.readFileSync(k), cert: fs.readFileSync(c) });
const server = https.createServer(load("server-key.pem", "server-cert.pem"), (req, res) => res.end("hi"));
const ca = fs.readFileSync("ca-cert.pem");

function peer(label) {
  return new Promise((resolve) => {
    https.get({ host: "localhost", port: server.address().port, ca, agent: false }, (res) => {
      const c = res.socket.getPeerCertificate();
      console.log(\`\${label}: serial=\${c.serialNumber.slice(-8)} valid_to=\${c.valid_to}\`);
      res.resume().on("end", resolve);
    });
  });
}

server.listen(0, async () => {
  await peer("before rotation");
  // Renewed cert on disk: swap it in WITHOUT restarting or dropping the listener
  server.setSecureContext(load("server2-key.pem", "server2-cert.pem"));
  await peer("after  rotation");

  // Plain HTTP spoken to the HTTPS port is not understood
  http.get({ host: "localhost", port: server.address().port }, () => {})
    .on("error", (e) => { console.log("plain http:// to the TLS port ->", e.code); server.close(); });
});`,
      },
      {
        label: "Mutual TLS: the server also verifies the client certificate",
        tech: "javascript",
        runnable: false,
        code: `const https = require("node:https");
const fs = require("node:fs");
const ca = fs.readFileSync("ca-cert.pem");

// Mutual TLS: the server also demands a certificate from the client
const server = https.createServer(
  {
    key: fs.readFileSync("server-key.pem"),
    cert: fs.readFileSync("server-cert.pem"),
    ca,                        // trust client certs signed by our CA
    requestCert: true,         // ask the client for a certificate
    rejectUnauthorized: true,  // and refuse the handshake without a valid one
  },
  (req, res) => res.end(\`hello \${req.socket.getPeerCertificate().subject.CN}\`),
);

function call(label, extra) {
  return new Promise((resolve) => {
    https.get({ host: "localhost", port: server.address().port, ca, agent: false, ...extra }, (res) => {
      let b = ""; res.on("data", (c) => (b += c)).on("end", () => { console.log(\`\${label} -> \${res.statusCode} \${b}\`); resolve(); });
    }).on("error", (e) => { console.log(\`\${label} -> FAIL \${e.code}\`); resolve(); });
  });
}

server.listen(0, async () => {
  await call("client with no certificate ", {});
  await call("client with a CA-signed cert", { key: fs.readFileSync("client-key.pem"), cert: fs.readFileSync("client-cert.pem") });
  server.close();
});`,
      },
    ],
  },

];

export default augments;
