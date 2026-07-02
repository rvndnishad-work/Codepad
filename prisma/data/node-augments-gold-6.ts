/**
 * Node Phase N3 — Batch 6 (Streams & buffers).
 * See node-augments-gold-1.ts for conventions.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are Node.js Streams and when would you use them?",
    answer: `**TL;DR.** **Streams** process data **chunk-by-chunk** instead of loading it all into memory. There are four types — **Readable**, **Writable**, **Duplex**, and **Transform** — all built on <code>EventEmitter</code>. Use them for large files, network I/O, and pipelines where buffering everything would be slow or blow up memory.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Data flows through a stream pipeline in chunks'>
  <rect class='d-box-accent' x='20' y='55' width='110' height='44' rx='8'/><text class='d-text' x='75' y='78' text-anchor='middle'>Readable</text><text class='d-sub' x='75' y='93' text-anchor='middle'>source</text>
  <path class='d-edge-accent' d='M132 77 H180' marker-end='url(#f1)'/>
  <rect class='d-box' x='182' y='55' width='110' height='44' rx='8'/><text class='d-text' x='237' y='78' text-anchor='middle'>Transform</text><text class='d-sub' x='237' y='93' text-anchor='middle'>gzip/parse</text>
  <path class='d-edge-accent' d='M294 77 H342' marker-end='url(#f1)'/>
  <rect class='d-box-accent' x='344' y='55' width='110' height='44' rx='8'/><text class='d-text' x='399' y='78' text-anchor='middle'>Writable</text><text class='d-sub' x='399' y='93' text-anchor='middle'>sink</text>
  <text class='d-sub' x='237' y='130' text-anchor='middle'>chunks flow left → right with backpressure</text>
  <defs><marker id='f1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** A **Readable** emits <code>'data'</code> chunks (a file, an HTTP request); a **Writable** consumes them (a file, an HTTP response); a **Duplex** is both (a TCP socket); a **Transform** is a Duplex that modifies chunks (gzip, encryption). You connect them with <code>.pipe()</code> or <code>pipeline()</code>, which also manages **backpressure** — pausing the source when the destination is slow. Because only a small window of data is in memory at once, streams handle gigabytes with constant memory.

### Stream types
| Type | Role | Example |
| --- | --- | --- |
| Readable | produces data | <code>fs.createReadStream</code> |
| Writable | consumes data | HTTP response |
| Duplex | both | TCP socket |
| Transform | maps chunks | <code>zlib.createGzip</code> |

> **Interview tip:** Lead with **constant memory over large data** and name the four types. Mention <code>pipeline()</code> for composing them with proper error handling and backpressure.`,
    examples: [
      {
        label: "Stream + transform a file to a response",
        tech: "javascript",
        runnable: false,
        code: `import { createReadStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';

await pipeline(
  createReadStream('big.log'),  // Readable
  createGzip(),                 // Transform
  res,                          // Writable (HTTP response)
);  // constant memory, backpressure handled, errors propagated`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are stream piping and the .pipe() method in Node.js?",
    answer: `**TL;DR.** <code>readable.pipe(writable)</code> connects a source stream to a destination, **forwarding chunks automatically** and applying **backpressure** (pausing the source when the destination's buffer fills). It replaces manual <code>'data'</code>/<code>'end'</code> wiring — but for production, prefer <code>pipeline()</code>, which also propagates errors and cleans up.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='pipe forwards chunks and applies backpressure'>
  <rect class='d-box-accent' x='30' y='50' width='120' height='44' rx='8'/><text class='d-text' x='90' y='77' text-anchor='middle'>readable</text>
  <path class='d-edge-accent' d='M152 72 H300' marker-end='url(#f2)'/>
  <text class='d-sub' x='226' y='62' text-anchor='middle'>.pipe()</text>
  <path class='d-edge-dashed' d='M300 86 H152' marker-end='url(#f2)'/>
  <text class='d-sub' x='226' y='108' text-anchor='middle'>backpressure pauses source</text>
  <rect class='d-box-accent' x='302' y='50' width='128' height='44' rx='8'/><text class='d-text' x='366' y='77' text-anchor='middle'>writable</text>
  <defs><marker id='f2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** <code>.pipe()</code> subscribes to the readable's <code>'data'</code>, writes each chunk to the writable, and watches the writable's return value: if <code>write()</code> returns <code>false</code> (buffer full), it **pauses** the readable until a <code>'drain'</code> event, then resumes — that's automatic backpressure. You can chain pipes (<code>a.pipe(b).pipe(c)</code>). The catch: <code>.pipe()</code> does **not** forward errors or destroy upstream streams on failure, which can leak file descriptors. <code>stream.pipeline()</code> fixes that, so use it in real code.

### pipe vs pipeline
| | <code>.pipe()</code> | <code>pipeline()</code> |
| --- | --- | --- |
| Backpressure | ✅ | ✅ |
| Error propagation | ❌ manual | ✅ automatic |
| Cleanup on error | ❌ | ✅ destroys all |
| Use in prod | ⚠️ | ✅ |

> **Interview tip:** Show you know <code>.pipe()</code>'s **error-handling gap** and that <code>pipeline()</code> (callback or <code>stream/promises</code>) is the production-safe choice.`,
    examples: [
      {
        label: "pipe vs the safer pipeline",
        tech: "javascript",
        runnable: false,
        code: `// Simple but leaks on error:
src.pipe(dest);

// Production: errors propagate, all streams destroyed on failure
import { pipeline } from 'node:stream/promises';
await pipeline(src, transform, dest);`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is backpressure in Node.js streams and how do you handle it?",
    answer: `**TL;DR.** **Backpressure** is the mechanism that prevents a **fast producer** from overwhelming a **slow consumer**. When <code>writable.write()</code> returns <code>false</code>, its internal buffer is full — you must **stop writing** until the <code>'drain'</code> event. <code>.pipe()</code> and <code>pipeline()</code> handle this automatically; manual writers must respect the return value.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Fast producer paused until slow consumer drains'>
  <rect class='d-box-accent' x='20' y='55' width='120' height='44' rx='8'/><text class='d-text' x='80' y='78' text-anchor='middle'>fast producer</text>
  <path class='d-edge-accent' d='M142 70 H230' marker-end='url(#f3)'/>
  <rect class='d-box-muted' x='232' y='45' width='90' height='66' rx='8'/><text class='d-sub' x='277' y='72' text-anchor='middle'>buffer</text><text class='d-sub' x='277' y='90' text-anchor='middle'>full!</text>
  <path class='d-edge' d='M324 78 H392' marker-end='url(#f3)'/>
  <rect class='d-box-accent' x='394' y='55' width='56' height='44' rx='8'/><text class='d-sub' x='422' y='80' text-anchor='middle'>slow</text>
  <path class='d-edge-dashed' d='M277 113 V135 H80 V101' marker-end='url(#f3)'/>
  <text class='d-sub' x='180' y='150' text-anchor='middle'>write()=false → pause until 'drain'</text>
  <defs><marker id='f3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Each writable has a <code>highWaterMark</code> (buffer threshold). <code>write()</code> returns <code>true</code> while there's room and <code>false</code> once the buffer exceeds it. Ignoring that return value keeps queuing data in memory — an **unbounded buffer** that eventually crashes the process. The correct pattern: on <code>false</code>, pause; resume on <code>'drain'</code>. With <code>pipe</code>/<code>pipeline</code> this is built in, which is the main reason to prefer them over hand-rolled loops. For async generators, <code>Readable.from</code> + <code>pipeline</code> respects backpressure too.

### Signals
| Signal | Meaning |
| --- | --- |
| <code>write()</code> → <code>true</code> | keep writing |
| <code>write()</code> → <code>false</code> | buffer full — stop |
| <code>'drain'</code> | safe to resume |
| <code>highWaterMark</code> | buffer size threshold |

> **Interview tip:** Define it as **flow control between producer and consumer**, and prove you'd honor <code>write()</code>'s return value / use <code>pipeline()</code> — ignoring backpressure is the classic memory-leak interview trap.`,
    examples: [
      {
        label: "Respecting write()'s return value",
        tech: "javascript",
        runnable: false,
        code: `function writeAll(writable, chunks, done) {
  let i = 0;
  (function next() {
    while (i < chunks.length) {
      const ok = writable.write(chunks[i++]);
      if (!ok) return writable.once('drain', next); // pause + resume
    }
    done();
  })();
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain how to read and write large files using streams in Node.js",
    answer: `**TL;DR.** For large files use <code>fs.createReadStream()</code> and <code>fs.createWriteStream()</code> instead of <code>readFile</code>/<code>writeFile</code>. They process the file in **small chunks** (default ~64KB) so memory stays **constant** regardless of file size. Connect them with <code>pipeline()</code>, which handles backpressure and errors.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Read stream pipes chunks through to a write stream'>
  <rect class='d-box-accent' x='20' y='50' width='120' height='46' rx='8'/><text class='d-text' x='80' y='71' text-anchor='middle'>createReadStream</text><text class='d-sub' x='80' y='88' text-anchor='middle'>64KB chunks</text>
  <path class='d-edge-accent' d='M142 73 H300' marker-end='url(#f4)'/>
  <text class='d-sub' x='221' y='64' text-anchor='middle'>pipeline()</text>
  <rect class='d-box-accent' x='302' y='50' width='130' height='46' rx='8'/><text class='d-text' x='367' y='71' text-anchor='middle'>createWriteStream</text><text class='d-sub' x='367' y='88' text-anchor='middle'>constant memory</text>
  <defs><marker id='f4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** <code>readFile</code> buffers the **entire** file into a single Buffer — fine for small config files, fatal for a 5GB file (out-of-memory, and there's a hard ~2GB Buffer limit anyway). A read stream emits manageable chunks; piping them to a write stream means only one chunk-sized window lives in RAM at a time, and backpressure keeps a slow disk from over-buffering. You can insert Transform streams (gzip, CSV parsing) in the middle. Use <code>stream/promises</code>' <code>pipeline</code> for clean async/await with error handling.

### readFile vs stream
| | <code>readFile</code> | <code>createReadStream</code> |
| --- | --- | --- |
| Memory | whole file | one chunk |
| Big files | ❌ OOM | ✅ constant |
| Start processing | after full read | on first chunk |
| Transform mid-way | ❌ | ✅ pipeline |

> **Interview tip:** Anchor on **constant memory + the ~2GB Buffer cap**: streaming is mandatory for large files. Mention you'd compose with <code>pipeline()</code> and Transform stages.`,
    examples: [
      {
        label: "Copy + compress a huge file",
        tech: "javascript",
        runnable: false,
        code: `import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';

await pipeline(
  createReadStream('huge.csv'),
  createGzip(),
  createWriteStream('huge.csv.gz'),
);  // works for any size — memory stays flat`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between readFile and createReadStream in Node.js?",
    answer: `**TL;DR.** <code>fs.readFile</code> reads the **whole file into memory** and gives you one Buffer/string when done — simple, but memory grows with file size. <code>fs.createReadStream</code> returns a **Readable stream** that emits the file in chunks, using constant memory and letting you start processing before the file is fully read.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='readFile buffers all, stream emits chunks'>
  <rect class='d-box-muted' x='20' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='120' y='54' text-anchor='middle'>readFile</text>
  <text class='d-sub' x='120' y='78' text-anchor='middle'>1 callback, whole file</text>
  <text class='d-sub' x='120' y='98' text-anchor='middle'>memory = file size</text>
  <text class='d-sub' x='120' y='118' text-anchor='middle'>simple, small files</text>
  <rect class='d-box-accent' x='240' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='340' y='54' text-anchor='middle'>createReadStream</text>
  <text class='d-sub' x='340' y='78' text-anchor='middle'>many 'data' chunks</text>
  <text class='d-sub' x='340' y='98' text-anchor='middle'>constant memory</text>
  <text class='d-sub' x='340' y='118' text-anchor='middle'>pipe / transform</text>
</svg>

**How it works.** <code>readFile</code> is convenient when you need the full contents at once and the file is small (config, a template). <code>createReadStream</code> shines for large files or when you want to **pipe** to another destination (HTTP response, gzip) — you can act on early chunks (e.g. parse headers) without waiting, and it applies backpressure. The same split exists for writing (<code>writeFile</code> vs <code>createWriteStream</code>). Rule: small/whole → <code>readFile</code>; large/pipeline/streaming → <code>createReadStream</code>.

### Choosing
| Need | Use |
| --- | --- |
| Small file, want it all | <code>readFile</code> |
| Large file | <code>createReadStream</code> |
| Pipe/transform/HTTP | <code>createReadStream</code> |
| Process while reading | <code>createReadStream</code> |

> **Interview tip:** One line: "<code>readFile</code> buffers everything; <code>createReadStream</code> streams chunks with constant memory." Tie the choice to **file size** and whether you'll **pipe**.`,
    examples: [
      {
        label: "Two reads, two trade-offs",
        tech: "javascript",
        runnable: false,
        code: `import { readFile, createReadStream } from 'node:fs';

// Whole file in memory — fine for a small config
const cfg = await import('node:fs/promises').then(f => f.readFile('config.json', 'utf8'));

// Stream a large file straight to the response — constant memory
app.get('/video', (req, res) => createReadStream('movie.mp4').pipe(res));`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you implement a custom Transform stream?",
    answer: `**TL;DR.** A **Transform** stream reads input, transforms each chunk, and writes output — it's a Duplex you customize by implementing <code>_transform(chunk, encoding, callback)</code> (push processed data) and optionally <code>_flush(callback)</code> (emit trailing output). Drop it into a <code>pipeline()</code> for streaming parsing, encryption, or line processing.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Transform receives a chunk, processes it, pushes output'>
  <rect class='d-box' x='20' y='52' width='100' height='44' rx='8'/><text class='d-sub' x='70' y='78' text-anchor='middle'>chunk in</text>
  <path class='d-edge-accent' d='M122 74 H170' marker-end='url(#f5)'/>
  <rect class='d-box-accent' x='172' y='45' width='130' height='58' rx='8'/><text class='d-text' x='237' y='68' text-anchor='middle'>_transform()</text><text class='d-sub' x='237' y='86' text-anchor='middle'>map / push</text>
  <path class='d-edge-accent' d='M304 74 H352' marker-end='url(#f5)'/>
  <rect class='d-box' x='354' y='52' width='100' height='44' rx='8'/><text class='d-sub' x='404' y='78' text-anchor='middle'>chunk out</text>
  <defs><marker id='f5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Extend <code>Transform</code> (or pass options to its constructor). In <code>_transform</code> you receive a chunk, do your work, call <code>this.push(result)</code> for any output, then call <code>callback()</code> (or <code>callback(err)</code>) to signal you're ready for the next chunk — this is what enforces **backpressure**. <code>_flush</code> runs once at the end to emit buffered remainder (e.g. the last partial line). Set <code>objectMode: true</code> to pass objects instead of Buffers. Because it's a stream, it composes in pipelines and stays memory-bounded.

### Transform hooks
| Hook | When | Purpose |
| --- | --- | --- |
| <code>_transform</code> | per chunk | process + <code>push</code> + <code>callback</code> |
| <code>_flush</code> | at end | emit trailing data |
| <code>objectMode</code> | option | pass objects not bytes |

> **Interview tip:** The detail that matters: call <code>callback()</code> after each chunk (that's backpressure), and use <code>_flush</code> for leftover state. Mention <code>objectMode</code> for object pipelines.`,
    examples: [
      {
        label: "Uppercase Transform",
        tech: "javascript",
        runnable: false,
        code: `import { Transform } from 'node:stream';

const upper = new Transform({
  transform(chunk, _enc, cb) {
    this.push(chunk.toString().toUpperCase()); // process + emit
    cb();                                       // ready for next (backpressure)
  },
});

process.stdin.pipe(upper).pipe(process.stdout);`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are the Web Streams API (ReadableStream/WritableStream) in Node.js and how do they differ from node:stream?",
    answer: `**TL;DR.** **Web Streams** (<code>ReadableStream</code>, <code>WritableStream</code>, <code>TransformStream</code>) are the **WHATWG standard** also used in browsers and by <code>fetch</code>. <code>node:stream</code> is Node's older, <code>EventEmitter</code>-based API. They interoperate via <code>Readable.fromWeb</code>/<code>toWeb</code>: Web Streams are **portable**, node:stream is more **mature** in the Node ecosystem.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Web Streams versus node:stream and their interop'>
  <rect class='d-box-accent' x='20' y='35' width='190' height='90' rx='10'/>
  <text class='d-text' x='115' y='58' text-anchor='middle'>Web Streams</text>
  <text class='d-sub' x='115' y='80' text-anchor='middle'>ReadableStream / Writable</text>
  <text class='d-sub' x='115' y='100' text-anchor='middle'>browser + fetch, portable</text>
  <rect class='d-box-muted' x='250' y='35' width='190' height='90' rx='10'/>
  <text class='d-text' x='345' y='58' text-anchor='middle'>node:stream</text>
  <text class='d-sub' x='345' y='80' text-anchor='middle'>EventEmitter-based</text>
  <text class='d-sub' x='345' y='100' text-anchor='middle'>mature, pipe/pipeline</text>
  <path class='d-edge-dashed' d='M210 140 H250' marker-end='url(#f6)'/>
  <text class='d-sub' x='230' y='152' text-anchor='middle'>fromWeb/toWeb</text>
  <defs><marker id='f6' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Web Streams use a different model — a Readable has a **reader** you <code>read()</code> from (returning <code>{ value, done }</code>), backpressure flows through a controller's <code>desiredSize</code>, and a <code>TransformStream</code> pairs a writable+readable side. They're async-iterable and identical across browser/Node/edge runtimes, which is why <code>fetch().body</code> is a Web <code>ReadableStream</code>. node:stream remains the richer choice for file/network plumbing with <code>pipeline()</code>. Convert between them with <code>stream.Readable.fromWeb()</code> / <code>.toWeb()</code> when you need both worlds.

### Two stream worlds
| | Web Streams | node:stream |
| --- | --- | --- |
| Standard | WHATWG (browser) | Node-specific |
| Used by | <code>fetch</code>, edge | fs, net, http |
| Model | reader/controller | EventEmitter |
| Interop | <code>toWeb</code>/<code>fromWeb</code> | ← → |

> **Interview tip:** The portability angle wins: Web Streams run the same in browser, Node, and edge runtimes (and back <code>fetch</code>), while node:stream is more mature for server plumbing — convert with <code>fromWeb</code>/<code>toWeb</code>.`,
    examples: [
      {
        label: "Consuming fetch's Web ReadableStream",
        tech: "javascript",
        runnable: false,
        code: `const res = await fetch('https://example.com/big');
// res.body is a Web ReadableStream — async-iterable:
for await (const chunk of res.body) {
  console.log('got', chunk.length, 'bytes');
}

// Bridge to node:stream if needed:
import { Readable } from 'node:stream';
const nodeStream = Readable.fromWeb(res.body);`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle streaming multipart file uploads (busboy/multer)?",
    answer: `**TL;DR.** Don't buffer uploads in memory — **stream** them. <code>busboy</code> (which <code>multer</code> wraps) parses the <code>multipart/form-data</code> request and emits **each file as a stream** you pipe straight to disk or object storage. This keeps memory flat for large files and lets you enforce size limits **mid-stream**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Multipart request parsed into file streams piped to storage'>
  <rect class='d-box-accent' x='20' y='52' width='130' height='46' rx='8'/><text class='d-text' x='85' y='73' text-anchor='middle'>multipart req</text><text class='d-sub' x='85' y='90' text-anchor='middle'>fields + files</text>
  <path class='d-edge-accent' d='M152 75 H210' marker-end='url(#f7)'/>
  <rect class='d-box' x='212' y='52' width='110' height='46' rx='8'/><text class='d-text' x='267' y='73' text-anchor='middle'>busboy</text><text class='d-sub' x='267' y='90' text-anchor='middle'>file stream</text>
  <path class='d-edge-accent' d='M324 75 H382' marker-end='url(#f7)'/>
  <rect class='d-box-muted' x='384' y='52' width='66' height='46' rx='8'/><text class='d-sub' x='417' y='79' text-anchor='middle'>S3 / disk</text>
  <defs><marker id='f7' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** A multipart body interleaves form fields and file parts. busboy parses the boundary-delimited stream and emits a <code>'file'</code> event per upload with a **Readable** for its bytes — you <code>pipeline()</code> it to a write stream or an S3 upload. Because you never hold the whole file, a 2GB upload uses kilobytes of RAM. You can abort early if a part exceeds a configured limit (defending against zip-bomb / disk-fill attacks). multer adds Express-friendly middleware and storage engines on top; for full control or non-Express servers, use busboy directly. Avoid storing to memory storage for big files.

### Upload best practices
| Concern | Approach |
| --- | --- |
| Memory | stream, never buffer whole file |
| Limits | <code>limits.fileSize</code>, abort mid-stream |
| Destination | disk or object storage (S3) |
| Validation | check mimetype + size before commit |

> **Interview tip:** The key insight: parse **multipart as a stream** and pipe each file to storage, enforcing **size limits mid-stream**. Buffering uploads in memory is the anti-pattern interviewers want you to avoid.`,
    examples: [
      {
        label: "Stream a file part to disk with busboy",
        tech: "javascript",
        runnable: false,
        code: `import Busboy from 'busboy';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

app.post('/upload', (req, res) => {
  const bb = Busboy({ headers: req.headers, limits: { fileSize: 50e6 } });
  bb.on('file', async (name, file, info) => {
    await pipeline(file, createWriteStream('/uploads/' + info.filename));
  });
  bb.on('close', () => res.json({ ok: true }));
  req.pipe(bb);
});`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Describe the `Buffer` class in Node.js and its use cases.",
    answer: `**TL;DR.** A <code>Buffer</code> is a fixed-length chunk of **raw binary data** outside V8's heap — Node's way to handle bytes (files, network packets, crypto) before strings existed for binary. It's a subclass of <code>Uint8Array</code>, so it works with typed-array APIs, and you decode/encode it with a specified character encoding.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='A buffer holds raw bytes that decode to text via an encoding'>
  <rect class='d-box-accent' x='20' y='50' width='200' height='50' rx='8'/>
  <text class='d-text' x='120' y='72' text-anchor='middle'>Buffer (raw bytes)</text>
  <text class='d-sub' x='120' y='90' text-anchor='middle'>48 65 6c 6c 6f</text>
  <path class='d-edge-accent' d='M222 75 H290' marker-end='url(#f8)'/>
  <text class='d-sub' x='256' y='66' text-anchor='middle'>toString('utf8')</text>
  <rect class='d-box' x='292' y='50' width='140' height='50' rx='8'/>
  <text class='d-text' x='362' y='80' text-anchor='middle'>"Hello"</text>
  <defs><marker id='f8' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Streams emit Buffers; you concatenate them (<code>Buffer.concat</code>) and decode with <code>buf.toString('utf8'|'base64'|'hex')</code>, or build one from data with <code>Buffer.from</code>. Allocate with <code>Buffer.alloc(n)</code> (zero-filled, safe) — **never** the deprecated <code>new Buffer(n)</code> or <code>allocUnsafe</code> without overwriting, which can leak old memory. Buffers are essential for binary protocols, image/file manipulation, hashing, and encoding conversions. Since they sit off-heap, very large buffers pressure system memory, not the V8 heap.

### Common operations
| Operation | API |
| --- | --- |
| Create from data | <code>Buffer.from(str, enc)</code> |
| Allocate zeroed | <code>Buffer.alloc(n)</code> |
| Join chunks | <code>Buffer.concat([...])</code> |
| Decode to text | <code>buf.toString(enc)</code> |

> **Interview tip:** Say it's a **Uint8Array of raw bytes off the V8 heap** for binary data, and flag the security note: use <code>Buffer.alloc</code>, avoid <code>allocUnsafe</code>/legacy <code>new Buffer</code> (uninitialized memory leak).`,
    examples: [
      {
        label: "Encode, decode, and concat",
        tech: "javascript",
        runnable: false,
        code: `const buf = Buffer.from('Hello', 'utf8');
console.log(buf);                 // <Buffer 48 65 6c 6c 6f>
console.log(buf.toString('hex')); // 48656c6c6f
console.log(buf.toString('base64'));

// Collect stream chunks then decode once:
const parts = [];
stream.on('data', (c) => parts.push(c));
stream.on('end', () => console.log(Buffer.concat(parts).toString('utf8')));`,
      },
    ],
  },
];

export default augments;
