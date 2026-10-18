/**
 * SYSTEM DESIGN ULTRA — batch 16: Storage systems. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `How does S3 multipart upload make 5TB uploads resumable and fast?`,
    difficulty: "medium",
    seoDescription: `How S3 multipart upload works: CreateMultipartUpload, parallel UploadPart, ListParts to resume, Complete, part limits, ETags, checksums and cleanup.`,
    description: `**Question presented to candidate:**
"A customer needs to push a 5 TB video archive into S3 over a link that drops every few hours. A single PUT will not work. Explain how multipart upload works, why it makes the upload both resumable and fast, and what limits and costs you have to plan around."

**What a strong answer should cover:**
- The protocol: **CreateMultipartUpload** returns an **upload ID**, **UploadPart** sends numbered parts independently (each returns an ETag), **CompleteMultipartUpload** stitches the listed parts into one object atomically, **AbortMultipartUpload** discards them
- The limits and the arithmetic: parts of 5 MiB to 5 GiB (last part may be smaller), at most 10,000 parts, so a 5 TiB object needs parts of at least about 525 MiB; single PUT is capped at 5 GB; the maximum object size was raised from 5 TB to 50 TB in December 2025
- Why it is **resumable**: each acknowledged part is durable on the server, so after a crash the client calls **ListParts** (or keeps its own record) and re-sends only the missing parts; retrying a part number simply overwrites it
- Why it is **fast**: one TCP stream is limited by latency and window size, so many parts in parallel fill the network; the run shows 29.1 hours on one stream versus 1.2 hours with 24 parallel parts
- Integrity: per-part ETags (MD5 for unencrypted parts) checked at Complete, the multipart ETag is not the MD5 of the whole object, and additional checksums (CRC64NVME by default, SHA-256 composite) for end-to-end verification
- Cost hygiene: incomplete uploads keep their parts billed until aborted, so add a lifecycle rule with **AbortIncompleteMultipartUpload**

**Code / implementation expected:** Optional — the protocol and the arithmetic matter most; the example simulates S3, crashes mid-upload and resumes with ListParts.`,
    answer: `**Target Audience:** Developers preparing for system design interviews, and anyone who has watched a large upload fail at 97%. No prior S3 knowledge needed.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). S3 limits and dates are from AWS documentation and announcements, cited inline.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All behaviour shown comes from running the example against a simulated S3; the **Verified** section quotes the full output. Where something is an AWS product fact, the source is named.

## 1. Why This Even Matters — A Story First

Imagine moving house with one enormous truck that has to make the whole trip in one go. If it breaks down an hour before arriving, everything goes back to the old house and you start again. Now imagine packing the same things into 10,000 numbered boxes and sending them with many small vans at once. A van that breaks down costs you one box, not the whole move; ten vans on the road at the same time finish sooner than one; and at the new house someone unpacks the boxes in number order, so the result is the same as if the giant truck had arrived.

S3 multipart upload is the box approach. A 5 TB file is cut into numbered parts, the parts travel independently (and in parallel), and S3 only assembles the final object when you say "I am done, here is the list of boxes".

📌 **Interview term: multipart upload** — an S3 API that uploads one object as a set of independently uploaded, numbered parts, then combines them into a single object in one final request. It exists for large objects, unreliable networks and parallel throughput.

## 2. Why One Big PUT Fails

A plain \`PutObject\` is one HTTP request with the whole body. Three things go wrong at large sizes:

| Problem | What happens with one PUT |
| :--- | :--- |
| Size limit | AWS documents a 5 GB maximum for a single PUT; anything bigger must use multipart |
| Failure cost | A dropped connection after 4.9 TB throws away all 4.9 TB; the request is all-or-nothing |
| Speed | One TCP connection is limited by round-trip time and window size; a single stream rarely fills a fast link |

Multipart fixes all three with the same idea: make the unit of transfer, retry and parallelism a **part**, not the whole object.

## 3. The Protocol in Four Calls

<svg class="iq-diagram" width="100%" viewBox="0 0 720 360" role="img" aria-label="Sequence of a multipart upload: client calls CreateMultipartUpload and gets an upload ID, then sends UploadPart requests for parts 1 to N in parallel, each returning an ETag, then calls CompleteMultipartUpload with the list of part numbers and ETags and S3 returns the final object">
  <defs>
    <marker id="sd16q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="20" width="160" height="50" rx="10"/>
  <text class="d-text" x="120" y="50" text-anchor="middle">client</text>
  <rect class="d-box-accent" x="520" y="20" width="160" height="50" rx="10"/>
  <text class="d-text" x="600" y="50" text-anchor="middle">S3</text>
  <rect class="d-box-muted" x="116" y="70" width="8" height="270"/>
  <rect class="d-box-muted" x="596" y="70" width="8" height="270"/>
  <path class="d-edge" d="M 124 105 L 590 105" marker-end="url(#sd16q1-arrow)"/>
  <text class="d-sub" x="360" y="95" text-anchor="middle">1. CreateMultipartUpload</text>
  <path class="d-edge" d="M 596 140 L 130 140" marker-end="url(#sd16q1-arrow)"/>
  <text class="d-sub" x="360" y="130" text-anchor="middle">upload ID</text>
  <path class="d-edge-accent" d="M 124 185 L 590 185" marker-end="url(#sd16q1-arrow)"/>
  <path class="d-edge-accent" d="M 124 205 L 590 205" marker-end="url(#sd16q1-arrow)"/>
  <path class="d-edge-accent" d="M 124 225 L 590 225" marker-end="url(#sd16q1-arrow)"/>
  <text class="d-sub" x="360" y="172" text-anchor="middle">2. UploadPart 1..N in parallel, each returns an ETag</text>
  <path class="d-edge" d="M 124 280 L 590 280" marker-end="url(#sd16q1-arrow)"/>
  <text class="d-sub" x="360" y="270" text-anchor="middle">3. CompleteMultipartUpload with part numbers and ETags</text>
  <path class="d-edge" d="M 596 320 L 130 320" marker-end="url(#sd16q1-arrow)"/>
  <text class="d-sub" x="360" y="310" text-anchor="middle">one object, multipart ETag</text>
</svg>

The parts in step 2 are independent requests, so they can run at the same time, in any order, and be retried one by one; nothing is visible as an object until step 3.

1. **\`CreateMultipartUpload\`** — "I am about to upload \`videos/raw.mov\` in parts." S3 returns an **upload ID** that names this upload session.
2. **\`UploadPart\`** (part number 1 to 10,000, plus the upload ID) — sends one part's bytes. S3 stores the part durably and returns its **ETag**.
3. **\`CompleteMultipartUpload\`** — sends the ordered list of \`(part number, ETag)\`. S3 checks each one and assembles the object. Until this call succeeds, readers see nothing (or the previous version of the key).
4. **\`AbortMultipartUpload\`** — gives up and deletes the stored parts.

Plus one helper that makes resume possible: **\`ListParts\`** returns the parts S3 already holds for an upload ID (up to 1,000 per page, per the AWS limits page).

📌 **Interview term: upload ID** — the identifier S3 returns from \`CreateMultipartUpload\`; every later part, list, complete or abort call carries it. Losing it does not lose the parts — \`ListMultipartUploads\` lists in-progress uploads for a bucket.

📌 **Interview term: atomic completion** — the object appears all at once when \`CompleteMultipartUpload\` succeeds; there is never a half-written object visible to readers. Since December 2020, S3 reads after a successful write are strongly consistent (AWS "What's New", Dec 2020), so a GET right after Complete sees the new object.

## 4. The Limits, and the Arithmetic They Force

From the AWS "Amazon S3 multipart upload limits" page:

| Limit | Value |
| :--- | :--- |
| Part numbers | 1 to 10,000 |
| Part size | 5 MiB to 5 GiB; the last part has no minimum |
| Parts returned per ListParts page | 1,000 |
| Maximum object size | 48.8 TiB (10,000 x 5 GiB) on the limits page |

About the "5 TB" in the question: 5 TB was the S3 object size limit for years. On December 2, 2025 AWS announced that the maximum object size rose to **50 TB** in all Regions except AWS GovCloud (US) (AWS "What's New": "Amazon S3 increases the maximum object size to 50 TB"). The part limits did not change, which is why the ceiling equals 10,000 parts of 5 GiB.

Because parts are capped at 10,000, the **part size is not a free choice for big objects**. The planner in the example picks the smallest whole-MiB part that fits in 10,000 parts:

~~~js
function plan(size) {
  let part = Math.max(5 * MiB, Math.ceil(size / 10000 / MiB) * MiB);
  return { part, parts: Math.ceil(size / part) };
}
~~~

~~~text
== 1. Part size planner (max 10,000 parts, min part 5 MiB) ==
100 MiB   -> part    5 MiB,    20 parts
5 GiB     -> part    5 MiB,  1024 parts
5 TiB     -> part  525 MiB,  9987 parts
48.8 TiB  -> part 5120 MiB, 10000 parts
~~~

A 5 TiB object needs parts of at least **525 MiB** (9,987 parts). A tool that blindly uses 8 MiB parts would hit the 10,000-part limit at about 78 GiB and fail late in the upload — choose the part size from the file size before you start.

📌 **Interview term: part size planning** — choosing a part size so that \`ceil(size / part) <= 10,000\` and \`5 MiB <= part <= 5 GiB\`. Smaller parts mean cheaper retries and finer resume; larger parts mean fewer requests.

## 5. Why It Is Fast: Parallel Parts

One TCP stream's throughput is roughly window size divided by round-trip time, so a single long-distance stream often moves tens of MiB/s even on a 10 Gbit link. Parts are independent, so you open many streams. The example assumes **50 MiB/s per stream** and a **1,200 MiB/s** network ceiling (assumptions, not measurements):

~~~text
== 2. Time to upload 5 TiB ==
 1 parallel parts ->   50 MiB/s, 29.1 h
 8 parallel parts ->  400 MiB/s, 3.6 h
24 parallel parts -> 1200 MiB/s, 1.2 h
64 parallel parts -> 1200 MiB/s, 1.2 h
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="One stream carries the whole file at 50 MiB per second; with parallel parts, many streams each carry one part and together fill the 1200 MiB per second link">
  <defs>
    <marker id="sd16q1-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="150" height="56" rx="10"/>
  <text class="d-text" x="105" y="55" text-anchor="middle">one PUT</text>
  <text class="d-sub" x="105" y="75" text-anchor="middle">1 stream</text>
  <path class="d-edge" d="M 180 58 L 534 58" marker-end="url(#sd16q1-arrow2)"/>
  <text class="d-sub" x="357" y="45" text-anchor="middle">50 MiB/s, 29.1 h</text>
  <rect class="d-box" x="540" y="30" width="150" height="56" rx="10"/>
  <text class="d-text" x="615" y="63" text-anchor="middle">S3</text>
  <rect class="d-box-accent" x="30" y="150" width="150" height="80" rx="10"/>
  <text class="d-text" x="105" y="185" text-anchor="middle">multipart</text>
  <text class="d-sub" x="105" y="207" text-anchor="middle">24 parts at once</text>
  <path class="d-edge-accent" d="M 180 165 L 534 165" marker-end="url(#sd16q1-arrow2)"/>
  <path class="d-edge-accent" d="M 180 190 L 534 190" marker-end="url(#sd16q1-arrow2)"/>
  <path class="d-edge-accent" d="M 180 215 L 534 215" marker-end="url(#sd16q1-arrow2)"/>
  <text class="d-sub" x="357" y="145" text-anchor="middle">1200 MiB/s total, 1.2 h</text>
  <rect class="d-box" x="540" y="150" width="150" height="80" rx="10"/>
  <text class="d-text" x="615" y="195" text-anchor="middle">S3</text>
</svg>

Going from 1 stream to 24 cut the 5 TiB upload from **29.1 hours to 1.2 hours**; going to 64 streams changed nothing because the network ceiling was already reached. The right concurrency is "enough to saturate the link", not "as many as possible" — beyond that you only add memory (each in-flight part is buffered) and retry noise.

📌 **Interview term: parallel part upload** — sending several \`UploadPart\` requests concurrently, each on its own connection, so total throughput is the sum of the streams up to the bottleneck (NIC, disk, or a bandwidth cap). The same trick works for downloads with HTTP **byte-range GETs**.

## 6. Why It Is Resumable: Parts Are Durable

Once S3 answers \`200\` to an \`UploadPart\`, that part is stored. The client only has to remember the upload ID (and the file); everything else can be re-discovered:

~~~text
== 3. Upload, crash, resume ==
create -> upl-1, 7 parts of 8000 bytes (last 2000)
part 3: connection reset, will retry later
client crashed after sending 40000 bytes
resume: ListParts -> [1, 2, 4, 5]
resume uploaded 18000 bytes (3 parts), not 50000
complete with a wrong ETag for part 4 -> InvalidPart 4
~~~

In the run, part 3 failed with a connection reset and the "laptop" stopped after part 5. The resumed client asked **ListParts**, got \`[1, 2, 4, 5]\`, and uploaded only parts 3, 6 and 7: **18,000 of 50,000 bytes**. With 525 MiB parts on a 5 TiB file, a drop costs at most one part per in-flight stream, not the whole transfer.

Two properties make retries safe:
- **Retrying a part number overwrites it.** Uploading part 2 again replaces the stored part 2; there is no duplicate. That makes \`UploadPart\` effectively [idempotent](/interview-question/what-is-idempotency-and-why-does-it-matter) per part number.
- **Complete is checked.** \`CompleteMultipartUpload\` names the ETag for each part; a mismatch fails with \`InvalidPart\` (the run sent a wrong ETag for part 4 and got exactly that), so you can never assemble a stale or wrong part by accident.

📌 **Interview term: ListParts** — the API that returns which parts (number, size, ETag) S3 already holds for an upload ID; the resume step. Many clients also keep a local checkpoint file so they do not need the list call.

## 7. Integrity: ETags and Checksums

Every stored part gets an **ETag**. For unencrypted parts it is the MD5 of the part. The final object's ETag is **not** the MD5 of the whole file; it is (as Cloudflare R2 documents for its S3-compatible API and as observed on S3) the MD5 of the concatenated binary part MD5s, followed by \`-\` and the part count. AWS does not document this formula as a contract, and it differs for SSE-KMS and SSE-C objects, so treat it as an implementation detail:

~~~text
complete -> 50000 bytes, ETag 799f06f34a8e99be6c5cf75976f2900b-7
MD5 of whole object  b18582eb0c177ecf8f6e3ab0878966ab (not the ETag)
~~~

So do not verify a multipart object by comparing its ETag to \`md5sum\` of the file. Use S3's **additional checksums** instead. Per the AWS "Checking object integrity" guide: when you upload without a checksum, S3 now attaches a full-object **CRC64NVME** checksum by default; CRC-based algorithms (CRC-32, CRC-32C, CRC64NVME) support a **full-object** checksum even for multipart uploads because CRCs can be combined; SHA-1 and SHA-256 support only a **composite** checksum (a checksum of the part checksums, with a \`-N\` suffix). How a browser computes and sends those per part is the subject of the sibling page on [resumable browser uploads with presigned multipart and checksums](/interview-question/resumable-browser-uploads-to-s3-presigned-multipart-with-checksums).

📌 **Interview term: multipart ETag** — the ETag of an object assembled from parts, shaped like \`799f06f34a8e99be6c5cf75976f2900b-7\`; the suffix is the number of parts. It identifies the content, but it is not a hash of the whole file.

## 8. Costs and Cleanup

Uploaded parts are stored, and billed, from the moment they arrive until you complete or abort the upload. A client that crashes and never comes back leaves invisible parts that do not show in a normal object listing. The standard fix is a bucket lifecycle rule:

~~~json
{
  "Rules": [{
    "ID": "abort-stale-multipart",
    "Status": "Enabled",
    "Filter": {},
    "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
  }]
}
~~~

Per the S3 lifecycle API documentation, this aborts uploads not completed within the given number of days and deletes their parts. Pick the number of days longer than your slowest legitimate upload, or the rule kills a slow but healthy transfer.

📌 **Interview term: AbortIncompleteMultipartUpload** — the lifecycle action that cleans up abandoned multipart uploads after N days so their parts stop costing money.

## 9. Verified: Running the Code

The example **"Multipart upload on a simulated S3: part sizing for 5 TiB, parallel speed, crash and resume with ListParts, multipart ETag"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== 1. Part size planner (max 10,000 parts, min part 5 MiB) ==
100 MiB   -> part    5 MiB,    20 parts
5 GiB     -> part    5 MiB,  1024 parts
5 TiB     -> part  525 MiB,  9987 parts
48.8 TiB  -> part 5120 MiB, 10000 parts
== 2. Time to upload 5 TiB ==
 1 parallel parts ->   50 MiB/s, 29.1 h
 8 parallel parts ->  400 MiB/s, 3.6 h
24 parallel parts -> 1200 MiB/s, 1.2 h
64 parallel parts -> 1200 MiB/s, 1.2 h
== 3. Upload, crash, resume ==
create -> upl-1, 7 parts of 8000 bytes (last 2000)
part 3: connection reset, will retry later
client crashed after sending 40000 bytes
resume: ListParts -> [1, 2, 4, 5]
resume uploaded 18000 bytes (3 parts), not 50000
complete with a wrong ETag for part 4 -> InvalidPart 4
complete -> 50000 bytes, ETag 799f06f34a8e99be6c5cf75976f2900b-7
MD5 of whole object  b18582eb0c177ecf8f6e3ab0878966ab (not the ETag)
stored object matches source: true
~~~

What the simulation stands for and what it leaves out: \`FakeS3\` is an in-process map from upload ID to parts, standing for S3's multipart state; part sizes are scaled down (8,000 bytes stands for 8 MiB) and the minimum part size is not enforced; the speed table is arithmetic from the stated per-stream and link assumptions, not a benchmark; there is no network, authentication, encryption or real parallelism.

## Edge Cases Worth Knowing

- **Part numbers need not be contiguous** for a plain multipart upload, but the Complete list must be in ascending order; when you use additional per-part checksums, AWS requires part numbers to be consecutive and start at 1.
- **Overwriting the key during an upload**: the upload creates a new object version only at Complete; with versioning off, the last completed write wins.
- **Changing the source file mid-upload** produces a valid object made of parts from two versions of the file; record the file size and modification time (or part checksums) with your checkpoint and restart if they change.
- **Very small files**: multipart costs at least three requests; for small objects one PUT is simpler and cheaper.
- **Copying big objects**: \`UploadPartCopy\` builds parts from byte ranges of an existing object server-side, which is how large S3-to-S3 copies avoid downloading the data.

## Common Pitfalls

- **Fixed small part size for every file** — 8 MiB parts break at about 78 GiB because of the 10,000-part limit; size parts from the file size (525 MiB minimum for 5 TiB).
- **No lifecycle rule** — crashed uploads leave billed, invisible parts forever.
- **Comparing the multipart ETag to an MD5 of the file** — they differ by design (\`799f...-7\` vs \`b185...\` in the run); use additional checksums.
- **Unbounded concurrency** — past the link ceiling (24 streams in the run) more parallel parts add memory and throttling, not speed.
- **Losing the upload ID** — then you cannot resume or abort cleanly; persist it with the checkpoint, and use \`ListMultipartUploads\` to find orphans.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Protocol:</strong> <span style="color:#f0e2c8;">Multipart is four calls: <strong style="color:#ffca28;">CreateMultipartUpload</strong> returns an upload ID, <strong style="color:#ffca28;">UploadPart</strong> sends numbered parts that each return an ETag, <strong style="color:#ffca28;">CompleteMultipartUpload</strong> assembles the listed parts atomically, and <strong style="color:#ffca28;">Abort</strong> discards them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Limits:</strong> <span style="color:#f0e2c8;">Parts are 5 MiB to 5 GiB with at most 10,000 of them, so for 5 TiB I pick parts of at least 525 MiB. Single PUT stops at 5 GB, and since December 2025 objects can be up to 50 TB.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Fast:</strong> <span style="color:#f0e2c8;">One TCP stream is bounded by window over round-trip time, so I upload parts in parallel until the link is full: in my model 29.1 hours on one stream versus 1.2 hours with 24 parts in flight.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Resumable:</strong> <span style="color:#f0e2c8;">An acknowledged part is durable. After a crash I call <strong style="color:#ffca28;">ListParts</strong> with the saved upload ID and send only what is missing; re-sending a part number just overwrites it, and Complete checks every ETag.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Hygiene:</strong> <span style="color:#f0e2c8;">The final ETag is not the file MD5, so I verify with additional checksums (CRC64NVME full-object or SHA-256 composite), and a lifecycle rule with <strong style="color:#ffca28;">AbortIncompleteMultipartUpload</strong> cleans up abandoned uploads that are still billed.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just make the part size 5 GiB for everything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then a dropped connection retries up to 5 GiB, each in-flight part needs that much buffer, and you get little parallelism for medium files. Use the smallest part size that fits the 10,000-part limit, with a floor (for example 16-64 MiB) to keep request counts reasonable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to readers while the upload is in progress?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing changes for them: the key keeps its old content (or does not exist) until Complete succeeds, then the new object appears at once, and S3 reads after that write are strongly consistent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you resume if the process that started the upload is gone?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Persist the upload ID, key, file size, part size and modification time in a checkpoint. A new process lists parts for that upload ID, checks the file has not changed, uploads the missing part numbers and completes. Without a checkpoint, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListMultipartUploads</code> on the bucket finds it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is UploadPart idempotent?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Per part number, yes in effect: uploading the same part number again replaces the stored part, and Complete uses whichever ETag you list. So retries are safe as long as you record the ETag of the attempt that succeeded.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you download a 5 TB object fast?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The mirror image: issue byte-range GETs for slices in parallel and write them at their offsets, retrying failed ranges only.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Multipart upload | Upload one object as numbered parts, then combine them in one request |
| Upload ID | The session identifier returned by CreateMultipartUpload |
| Atomic completion | The object appears all at once when Complete succeeds |
| Part size planning | Choosing a part size that keeps the count at or under 10,000 |
| Parallel part upload | Sending several parts at once to fill the network |
| ListParts | Lists parts already stored for an upload; used to resume |
| Multipart ETag | Hash-of-part-hashes plus \`-N\`; not the MD5 of the file |
| AbortIncompleteMultipartUpload | Lifecycle action that deletes abandoned uploads after N days |

**Conclusion:** Multipart upload turns one fragile, single-stream, all-or-nothing request into many small, independent, retryable ones: create an upload ID, send numbered parts in parallel, and complete with the list of part ETags to get one atomic object. The run made each property concrete: 5 TiB needs parts of at least 525 MiB because of the 10,000-part limit, parallel parts cut a modelled 29.1-hour upload to 1.2 hours, a crash cost only the 18,000 missing bytes thanks to ListParts, and a wrong ETag at Complete was rejected. Add checksums for real integrity and a lifecycle rule for abandoned uploads, and remember that since December 2025 the "5 TB" in the question is 50 TB.`,
    examples: [
      {
        label: `Multipart upload on a simulated S3: part sizing for 5 TiB, parallel speed, crash and resume with ListParts, multipart ETag`,
        variants: [
          { tech: "node", code: `// Multipart upload on a simulated S3: part sizing, parallel speed, resume after a crash, ETag.
const crypto = require("crypto");
const MiB = 1024 * 1024, GiB = 1024 * MiB, TiB = 1024 * GiB;
const md5 = (b) => crypto.createHash("md5").update(b).digest();

// 1. Part sizing: at most 10,000 parts, each 5 MiB..5 GiB (the last may be smaller).
function plan(size) {
  let part = Math.max(5 * MiB, Math.ceil(size / 10000 / MiB) * MiB);
  return { part, parts: Math.ceil(size / part) };
}
console.log("== 1. Part size planner (max 10,000 parts, min part 5 MiB) ==");
for (const [name, size] of [["100 MiB", 100 * MiB], ["5 GiB", 5 * GiB], ["5 TiB", 5 * TiB], ["48.8 TiB", 10000 * 5 * GiB]]) {
  const p = plan(size);
  console.log(\`\${name.padEnd(9)} -> part \${String(p.part / MiB).padStart(4)} MiB, \${String(p.parts).padStart(5)} parts\`);
}

// 2. Speed: one TCP stream is capped (assume 50 MiB/s); parallel parts add up to the NIC (assume 1,200 MiB/s).
console.log("== 2. Time to upload 5 TiB ==");
for (const conns of [1, 8, 24, 64]) {
  const rate = Math.min(conns * 50, 1200);
  const hours = (5 * TiB / MiB) / rate / 3600;
  console.log(\`\${String(conns).padStart(2)} parallel parts -> \${String(rate).padStart(4)} MiB/s, \${hours.toFixed(1)} h\`);
}

// 3. A fake S3 that keeps parts per uploadId until Complete or Abort.
class FakeS3 {
  constructor() { this.uploads = new Map(); this.objects = new Map(); this.next = 1; }
  create(key) { const id = "upl-" + this.next++; this.uploads.set(id, { key, parts: new Map() }); return id; }
  uploadPart(id, n, body) { const e = md5(body).toString("hex"); this.uploads.get(id).parts.set(n, { body, etag: e }); return e; }
  listParts(id) { return [...this.uploads.get(id).parts.entries()].sort((a, b) => a[0] - b[0]).map(([n, p]) => ({ n, etag: p.etag })); }
  complete(id, list) {
    const u = this.uploads.get(id);
    for (const { n, etag } of list) {
      const p = u.parts.get(n);
      if (!p || p.etag !== etag) return { error: \`InvalidPart \${n}\` };
    }
    const body = Buffer.concat(list.map(({ n }) => u.parts.get(n).body));
    const etag = md5(Buffer.concat(list.map(({ etag }) => Buffer.from(etag, "hex")))).toString("hex") + "-" + list.length;
    this.objects.set(u.key, { body, etag });
    this.uploads.delete(id);
    return { etag, bytes: body.length };
  }
}

// Deterministic 50,000-byte object; part size scaled down to 8,000 bytes (stands for 8 MiB).
const data = Buffer.alloc(50000);
for (let i = 0; i < data.length; i++) data[i] = (i * 31 + (i >> 7)) & 255;
const PART = 8000, N = Math.ceil(data.length / PART);
const partBody = (n) => data.subarray((n - 1) * PART, Math.min(n * PART, data.length));

const s3 = new FakeS3();
console.log("== 3. Upload, crash, resume ==");
const id = s3.create("videos/raw.mov");
console.log(\`create -> \${id}, \${N} parts of \${PART} bytes (last \${data.length - (N - 1) * PART})\`);
const flaky = new Set([3]);                   // part 3 fails once with a connection reset
let sent = 0;
for (let n = 1; n <= 5; n++) {                // the laptop sleeps after part 5
  sent += partBody(n).length;
  if (flaky.delete(n)) { console.log(\`part \${n}: connection reset, will retry later\`); continue; }
  s3.uploadPart(id, n, partBody(n));
}
console.log(\`client crashed after sending \${sent} bytes\`);
const have = s3.listParts(id);
console.log(\`resume: ListParts -> [\${have.map((p) => p.n).join(", ")}]\`);
const haveSet = new Set(have.map((p) => p.n));
let resent = 0;
for (let n = 1; n <= N; n++) if (!haveSet.has(n)) { s3.uploadPart(id, n, partBody(n)); resent += partBody(n).length; }
console.log(\`resume uploaded \${resent} bytes (\${N - haveSet.size} parts), not \${data.length}\`);
s3.uploadPart(id, 2, partBody(2));            // retrying a part number just overwrites it
const list = s3.listParts(id);
const bad = list.map((p) => (p.n === 4 ? { n: 4, etag: "0".repeat(32) } : p));
console.log("complete with a wrong ETag for part 4 ->", s3.complete(id, bad).error);
const done = s3.complete(id, list);
console.log(\`complete -> \${done.bytes} bytes, ETag \${done.etag}\`);
console.log(\`MD5 of whole object  \${md5(data).toString("hex")} (not the ETag)\`);
console.log(\`stored object matches source: \${s3.objects.get("videos/raw.mov").body.equals(data)}\`);` },
          { tech: "python", code: `# Multipart upload on a simulated S3: part sizing, parallel speed, resume after a crash, ETag.
import hashlib
import math

MiB = 1024 * 1024
GiB = 1024 * MiB
TiB = 1024 * GiB


def md5(b):
    return hashlib.md5(b).digest()


# 1. Part sizing: at most 10,000 parts, each 5 MiB..5 GiB (the last may be smaller).
def plan(size):
    part = max(5 * MiB, math.ceil(size / 10000 / MiB) * MiB)
    return part, -(-size // part)


print("== 1. Part size planner (max 10,000 parts, min part 5 MiB) ==")
for name, size in [("100 MiB", 100 * MiB), ("5 GiB", 5 * GiB), ("5 TiB", 5 * TiB), ("48.8 TiB", 10000 * 5 * GiB)]:
    part, parts = plan(size)
    print(f"{name:<9} -> part {part // MiB:>4} MiB, {parts:>5} parts")

# 2. Speed: one TCP stream is capped (assume 50 MiB/s); parallel parts add up to the NIC (assume 1,200 MiB/s).
print("== 2. Time to upload 5 TiB ==")
for conns in [1, 8, 24, 64]:
    rate = min(conns * 50, 1200)
    hours = (5 * TiB / MiB) / rate / 3600
    print(f"{conns:>2} parallel parts -> {rate:>4} MiB/s, {hours:.1f} h")


# 3. A fake S3 that keeps parts per uploadId until Complete or Abort.
class FakeS3:
    def __init__(self):
        self.uploads, self.objects, self.next = {}, {}, 1

    def create(self, key):
        uid = f"upl-{self.next}"
        self.next += 1
        self.uploads[uid] = {"key": key, "parts": {}}
        return uid

    def upload_part(self, uid, n, body):
        e = md5(body).hex()
        self.uploads[uid]["parts"][n] = {"body": body, "etag": e}
        return e

    def list_parts(self, uid):
        return [{"n": n, "etag": p["etag"]} for n, p in sorted(self.uploads[uid]["parts"].items())]

    def complete(self, uid, lst):
        u = self.uploads[uid]
        for item in lst:
            p = u["parts"].get(item["n"])
            if p is None or p["etag"] != item["etag"]:
                return {"error": f"InvalidPart {item['n']}"}
        body = b"".join(u["parts"][item["n"]]["body"] for item in lst)
        etag = md5(b"".join(bytes.fromhex(item["etag"]) for item in lst)).hex() + "-" + str(len(lst))
        self.objects[u["key"]] = {"body": body, "etag": etag}
        del self.uploads[uid]
        return {"etag": etag, "bytes": len(body)}


# Deterministic 50,000-byte object; part size scaled down to 8,000 bytes (stands for 8 MiB).
data = bytes(((i * 31 + (i >> 7)) & 255) for i in range(50000))
PART = 8000
N = -(-len(data) // PART)


def part_body(n):
    return data[(n - 1) * PART:min(n * PART, len(data))]


s3 = FakeS3()
print("== 3. Upload, crash, resume ==")
uid = s3.create("videos/raw.mov")
print(f"create -> {uid}, {N} parts of {PART} bytes (last {len(data) - (N - 1) * PART})")
flaky = {3}  # part 3 fails once with a connection reset
sent = 0
for n in range(1, 6):  # the laptop sleeps after part 5
    sent += len(part_body(n))
    if n in flaky:
        flaky.discard(n)
        print(f"part {n}: connection reset, will retry later")
        continue
    s3.upload_part(uid, n, part_body(n))
print(f"client crashed after sending {sent} bytes")
have = s3.list_parts(uid)
print(f"resume: ListParts -> [{', '.join(str(p['n']) for p in have)}]")
have_set = {p["n"] for p in have}
resent = 0
for n in range(1, N + 1):
    if n not in have_set:
        s3.upload_part(uid, n, part_body(n))
        resent += len(part_body(n))
print(f"resume uploaded {resent} bytes ({N - len(have_set)} parts), not {len(data)}")
s3.upload_part(uid, 2, part_body(2))  # retrying a part number just overwrites it
lst = s3.list_parts(uid)
bad = [{"n": 4, "etag": "0" * 32} if p["n"] == 4 else p for p in lst]
print("complete with a wrong ETag for part 4 ->", s3.complete(uid, bad)["error"])
done = s3.complete(uid, lst)
print(f"complete -> {done['bytes']} bytes, ETag {done['etag']}")
print(f"MD5 of whole object  {md5(data).hex()} (not the ETag)")
print(f"stored object matches source: {str(s3.objects['videos/raw.mov']['body'] == data).lower()}")` },
        ],
      },
    ],
  },
  {
    title: `Resumable browser uploads to S3 — presigned multipart with checksums?`,
    difficulty: "medium",
    seoDescription: `Resumable browser uploads to S3: the backend presigns each part, the browser hashes and PUTs parts, resumes after reload and verifies checksums.`,
    description: `**Question presented to candidate:**
"Users upload files of up to 50 GB from the browser. We do not want the bytes to pass through our API servers, uploads must survive a flaky connection or a page reload, and we need proof that what landed in S3 is exactly what the user picked. Walk me through the flow between browser, backend and S3."

**What a strong answer should cover:**
- Direct-to-S3: the backend keeps the AWS credentials, starts the multipart upload, and hands the browser **presigned URLs** per part; the bytes go browser to S3, the backend only handles small JSON calls
- Per-part integrity: the browser computes each part's **SHA-256** (or CRC) and sends it as the checksum header that S3 verifies (a corrupted part fails with \`BadDigest\`); the composite checksum at Complete gives end-to-end proof
- Resume: persist \`uploadId\` and file identity (name, size, last-modified) in \`localStorage\` or the backend; after a reload, the backend calls **ListParts**, the browser re-hashes its slices to confirm it is the same file, and uploads only the missing parts
- Presigned URL scope and expiry: short TTL (minutes), one URL per part number, re-issue on expiry; SigV4 presigned URLs last at most 7 days and die with the signing credentials
- Browser specifics: **CORS** must allow \`PUT\` and **expose the \`ETag\` header**, or the browser cannot read part ETags; parallelism limits and memory (slice the \`File\`, do not load it)
- Server-side bookkeeping: authorisation before presigning, an uploads table, Complete called by the backend, and a lifecycle rule that aborts abandoned uploads

**Clarifying questions expected:**
- Maximum file size and typical network (mobile, office)?
- Must resume work across devices or only after a reload on the same browser?
- What happens after upload: virus scan, transcoding, making it visible to other users?

**Code / implementation expected:** Optional — the endpoint contract and the browser loop; the example simulates presigning, checksum checks and resume.`,
    answer: `**Target Audience:** Developers preparing for system design or full-stack interviews who know roughly what S3 is. The multipart mechanics themselves are covered on the [S3 multipart upload page](/interview-question/how-does-s3-multipart-upload-make-5tb-uploads-resumable-and-fast); this page is about doing it safely from a browser.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). S3 behaviour and limits are from AWS documentation, cited inline.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All behaviour shown comes from running the example, which simulates S3 and the signing step in one process; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A museum accepts donated paintings. It would be silly for every painting to be carried through the director's office first; instead the director writes a signed delivery slip — "one crate, bay 3, before 5 pm" — and the courier drives straight to the loading dock. The dock checks the slip, checks the crate's seal number against the one written on the slip, and signs for it. If the courier's van breaks down after crate 3 of 7, the museum's register shows which crates arrived, and tomorrow's courier brings only the rest.

That is the browser-upload design: the backend (director) signs narrow permission slips, the browser (courier) delivers parts straight to S3 (the dock), S3 checks each part's seal (checksum), and the register (ListParts) makes resume possible.

📌 **Interview term: presigned URL** — a URL that carries a signature made with the backend's credentials, granting one specific request (method, bucket, key, query parameters such as \`uploadId\` and \`partNumber\`) until an expiry time. Anyone holding it can make exactly that request without having AWS credentials.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Maximum file size? | Sets the part size (10,000 parts maximum) and whether multipart is needed at all |
| Same-browser resume or cross-device? | \`localStorage\` is enough for a reload; cross-device needs the upload state on the backend |
| Who may upload what, and where? | The backend must authorise before it signs, and choose the key itself |
| What proof of integrity is required? | Per-part checksums vs a full-file hash for audit or later dedup |
| What happens after upload? | Scanning, processing and "publish" steps hang off the Complete call or an S3 event |
| Mobile or desktop networks? | Smaller parts and lower concurrency on mobile |

## 3. The Flow

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Browser asks backend to start an upload; backend calls CreateMultipartUpload on S3 and returns presigned part URLs; browser PUTs each part directly to S3 with its checksum; browser tells backend it is done; backend calls CompleteMultipartUpload">
  <defs>
    <marker id="sd16q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="120" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="150" text-anchor="middle">browser</text>
  <text class="d-sub" x="95" y="172" text-anchor="middle">hashes parts</text>
  <rect class="d-box-accent" x="300" y="20" width="170" height="70" rx="10"/>
  <text class="d-text" x="385" y="50" text-anchor="middle">backend</text>
  <text class="d-sub" x="385" y="72" text-anchor="middle">auth, sign, record</text>
  <rect class="d-box" x="590" y="120" width="150" height="70" rx="10"/>
  <text class="d-text" x="665" y="160" text-anchor="middle">S3</text>
  <rect class="d-box-muted" x="300" y="240" width="170" height="60" rx="10"/>
  <text class="d-text" x="385" y="276" text-anchor="middle">uploads table</text>
  <path class="d-edge" d="M 120 120 L 296 70" marker-end="url(#sd16q2-arrow)"/>
  <text class="d-sub" x="150" y="80" text-anchor="middle">1. start, part URLs</text>
  <path class="d-edge" d="M 470 70 L 640 118" marker-end="url(#sd16q2-arrow)"/>
  <text class="d-sub" x="620" y="80" text-anchor="middle">2. create, list, complete</text>
  <path class="d-edge-accent" d="M 170 155 L 584 155" marker-end="url(#sd16q2-arrow)"/>
  <text class="d-sub" x="377" y="145" text-anchor="middle">3. PUT part with checksum</text>
  <path class="d-edge-dashed" d="M 385 90 L 385 234" marker-end="url(#sd16q2-arrow)"/>
</svg>

The only heavy arrow is browser to S3; the backend sees small JSON calls and keeps its own record of each upload.

The endpoints the backend exposes (the shape is a design choice, not an AWS API):

~~~http
POST /uploads                      { "name": "raw.mov", "size": 53687091200, "lastModified": 1760000000 }
  -> { "uploadId": "upl-7f3a", "key": "u/42/9c1e/raw.mov", "partSize": 16777216, "parts": 3200 }

POST /uploads/upl-7f3a/part-urls   { "parts": [ { "n": 1, "sha256": "kjdwO0vH...SI=" }, ... ] }
  -> { "urls": { "1": "https://bucket.s3...&partNumber=1&uploadId=upl-7f3a&X-Amz-Expires=900&X-Amz-Signature=..." } }

GET  /uploads/upl-7f3a             -> { "parts": [ { "n": 1, "size": 16777216, "sha256": "..." }, ... ] }   (ListParts)
POST /uploads/upl-7f3a/complete    -> { "key": "...", "checksum": "Bx9cUISt...BfU=-4" }
~~~

The browser loop, in outline: slice the \`File\` with \`file.slice(start, end)\` (no full read into memory), hash each slice with \`crypto.subtle.digest("SHA-256", ...)\`, request URLs in batches, \`PUT\` a few parts in parallel, store each returned ETag, and on completion tell the backend.

## 4. Why Each Safety Check Exists

The example runs the backend, the browser and a fake S3 part endpoint in one process. The fake signer is an HMAC over method, upload ID, part number, checksum and expiry — it stands for SigV4, not a reimplementation of it.

**Per-part checksum.** The browser computes the part's SHA-256 before uploading and sends it as the checksum header; S3 recomputes it on arrival.

~~~text
== 1. Browser hashes each part, backend presigns (TTL 900 s) ==
part 1 sha256 kjdwO0vHHZFYVdy7RK2RutJX9ZNLFScPQ3sFJEFYkSI=
part 1 -> 200 ETag a437f7b5
== 2. A byte flipped in transit ==
part 2 corrupted -> 400 BadDigest
part 2 retried   -> 200 ETag e543dbaa
~~~

📌 **Interview term: part checksum (\`x-amz-checksum-sha256\`)** — a base64 digest of the part sent with \`UploadPart\`; S3 rejects the part if the bytes do not match, so corruption between the browser's memory and S3's disk is caught per part, and the retry costs one part. Per the AWS integrity guide, S3 supports CRC-32, CRC-32C, CRC64NVME, SHA-1 and SHA-256.

**Narrow, signed URLs.** A URL for part 3 cannot upload part 4, and if the checksum is part of what was signed, it cannot upload different bytes either:

~~~text
== 3. Misusing a URL ==
part 3 URL sent as part 4 -> 403 SignatureDoesNotMatch
part 3 URL, other checksum -> 403 SignatureDoesNotMatch
part 3 -> 200 ETag 2d808754
~~~

Whether the checksum header ends up inside the signature depends on how you presign — in the AWS SDKs you set the checksum on the \`UploadPart\` command before presigning and then check that the generated URL lists the checksum among its signed parameters or headers. If it is not signed, S3 still verifies the bytes against whatever checksum the browser sends; signing it additionally stops a holder of the URL from sending different content.

📌 **Interview term: least-privilege presigning** — sign one method, one key, one upload ID and one part number, for minutes; never sign a generic "PUT anything into this bucket" URL, and choose the object key on the server.

## 5. Resume After a Reload

On reload the page has lost its in-memory state but kept \`{ uploadId, name, size, lastModified }\` in \`localStorage\`. The user re-selects the file (a plain file input cannot reopen a file by path after a reload), and the page asks the backend which parts exist:

~~~text
== 4. Tab reloads at t=1000; uploadId was saved in localStorage ==
backend ListParts -> 1:10000 2:10000 3:10000
re-picked same file matches stored parts: true
re-picked edited file matches stored parts: false
old part 4 URL -> 403 AccessDenied (Request has expired)
fresh part 4 URL -> 200 ETag 2430f7f6
~~~

Three things happened:
- **ListParts** returned parts 1-3 with their stored checksums.
- The browser **re-hashed its slices** and compared them with the stored checksums. The same file matched; a different file with the same name did not (\`false\`), so the page must start a fresh upload instead of stitching two files together. Name and size alone would not have caught that.
- The **old URL for part 4 had expired** (issued at t=0 with a 900-second TTL, used at t=1,000), so the browser asked for a fresh one.

Presigned URL lifetime has hard limits in S3: a SigV4 presigned URL can be valid for at most **7 days** (604,800 seconds), the console caps it at 12 hours, and a URL signed with temporary credentials (an IAM role on Lambda, ECS or EC2) stops working when those credentials expire, whatever expiry you asked for (AWS "Download and upload objects with presigned URLs"). For browsers, issue short-lived URLs in small batches and refresh them as you go.

📌 **Interview term: upload session state** — the record that makes resume possible: upload ID, object key, part size, file identity (size, last-modified, and ideally part checksums), owner and status. Keep it on the backend if resume must work from another device.

## 6. Completing and Proving Integrity

The backend calls \`CompleteMultipartUpload\` with the part numbers, ETags and checksums. With SHA-256 S3 builds a **composite checksum**: the SHA-256 of the concatenated binary part digests, followed by \`-\` and the number of parts. The browser can compute the same value from its own part hashes and compare:

~~~text
== 5. Complete: composite checksum = sha256(part digests) + -N ==
server  Bx9cUIStJ9pjemYUiDknb3GnP/h0/TMxlM6gqKi5BfU=-4
browser Bx9cUIStJ9pjemYUiDknb3GnP/h0/TMxlM6gqKi5BfU=-4
whole-file sha256 /j2qC1576gcOru1ei9AQUq3qzOzklBexyv3KXsY0V5Q= (a different value)
integrity verified end to end: true
~~~

Matching values mean every byte S3 assembled is a byte the browser hashed. Note the composite value is not the SHA-256 of the whole file. If you need a full-file hash that S3 can verify for a multipart upload, use a CRC algorithm: per the AWS integrity guide, CRC-32, CRC-32C and CRC64NVME support **full-object** checksums for multipart uploads because CRCs can be combined, while SHA-1 and SHA-256 support only composite checksums. With additional checksums, AWS also requires part numbers to be consecutive starting at 1.

📌 **Interview term: composite checksum** — a "checksum of checksums" over the parts, with a \`-N\` suffix; it depends on the part size, so two uploads of the same file with different part sizes have different composite values.

📌 **Interview term: full-object checksum** — a checksum of the entire object's bytes, comparable with a hash computed locally on the whole file; for multipart uploads only the CRC family supports it.

## 7. The Browser-Specific Traps

**CORS and the ETag header.** The browser's \`fetch\` can only read response headers that the server exposes. Without \`ETag\` in the bucket CORS rule's \`ExposeHeaders\`, every part upload succeeds but the code sees no ETag and cannot complete (reported, for example, as \`ETagMissing\` in SDK errors on S3-compatible stores):

~~~json
[{
  "AllowedOrigins": ["https://app.example.com"],
  "AllowedMethods": ["PUT"],
  "AllowedHeaders": ["content-type", "x-amz-checksum-sha256"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3000
}]
~~~

**Memory and concurrency.** Use \`File.slice\` so only in-flight parts sit in memory; 4-6 parallel parts is a reasonable browser default (browsers also limit concurrent connections per host). On mobile, smaller parts make each retry cheaper.

**Abandoned uploads.** Users close tabs and never return. Their parts are billed until the upload is aborted, so add the lifecycle rule \`AbortIncompleteMultipartUpload\` (the run shows a 7-day rule aborting an 8-day-old upload and keeping a 2-day-old one) and mark the row in your uploads table as expired:

~~~text
== 6. Lifecycle rule: abort incomplete uploads after 7 days ==
upl-91c2: 8 days old, 30000 bytes -> aborted, parts deleted
upl-a004: 2 days old, 10000 bytes -> kept
~~~

**After the upload.** Do not trust the client's "done": the backend calls Complete itself, then publishes the file only after post-processing (malware scan, content-type sniffing). An S3 event on object creation is a good trigger for that pipeline.

## 8. Verified: Running the Code

The example **"Presigned part URLs with per-part SHA-256: corrupted part, misused URL, tab reload resume, expired URL, composite checksum, lifecycle abort"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== 1. Browser hashes each part, backend presigns (TTL 900 s) ==
part 1 sha256 kjdwO0vHHZFYVdy7RK2RutJX9ZNLFScPQ3sFJEFYkSI=
part 1 -> 200 ETag a437f7b5
== 2. A byte flipped in transit ==
part 2 corrupted -> 400 BadDigest
part 2 retried   -> 200 ETag e543dbaa
== 3. Misusing a URL ==
part 3 URL sent as part 4 -> 403 SignatureDoesNotMatch
part 3 URL, other checksum -> 403 SignatureDoesNotMatch
part 3 -> 200 ETag 2d808754
== 4. Tab reloads at t=1000; uploadId was saved in localStorage ==
backend ListParts -> 1:10000 2:10000 3:10000
re-picked same file matches stored parts: true
re-picked edited file matches stored parts: false
old part 4 URL -> 403 AccessDenied (Request has expired)
fresh part 4 URL -> 200 ETag 2430f7f6
== 5. Complete: composite checksum = sha256(part digests) + -N ==
server  Bx9cUIStJ9pjemYUiDknb3GnP/h0/TMxlM6gqKi5BfU=-4
browser Bx9cUIStJ9pjemYUiDknb3GnP/h0/TMxlM6gqKi5BfU=-4
whole-file sha256 /j2qC1576gcOru1ei9AQUq3qzOzklBexyv3KXsY0V5Q= (a different value)
integrity verified end to end: true
== 6. Lifecycle rule: abort incomplete uploads after 7 days ==
upl-91c2: 8 days old, 30000 bytes -> aborted, parts deleted
upl-a004: 2 days old, 10000 bytes -> kept
~~~

What the simulation stands for and what it leaves out: \`presign\` is an HMAC-SHA256 over the fields that matter (it stands for SigV4 query-string signing, which also signs the host, path, date and region); \`putPart\` stands for S3's \`UploadPart\` checks; the ETag is shortened to 8 hex digits for readability; time is a fake clock; files are 40,000 bytes with 10,000-byte parts standing for MiB-sized parts. There is no CORS, network, browser or real S3.

## Edge Cases Worth Knowing

- **Clock skew**: SigV4 URLs embed a signing time; a client clock far off does not matter because the backend signs, but a backend clock far off produces URLs that are already expired or not yet valid.
- **Duplicate tabs**: two tabs resuming the same upload can race on part numbers; it is safe (same bytes, same checksum, last write wins) but wasteful — use a lock in \`localStorage\` or the backend.
- **Content-Type**: it is set at \`CreateMultipartUpload\`, not per part; decide it on the server.
- **Encryption with KMS**: part ETags are no longer MD5s; rely on checksums, not ETags, for integrity.
- **Hashing cost**: SHA-256 of a 50 GB file in the browser takes noticeable time; hash each slice just before uploading it rather than the whole file up front, and consider CRC32C for speed.

## Common Pitfalls

- **Proxying the bytes through the API** — doubles bandwidth cost and ties up servers; presign and go direct.
- **Missing \`ExposeHeaders: ETag\`** — parts upload, Complete is impossible.
- **Resuming on file name and size alone** — the run shows a different file with the same name; compare part checksums before resuming.
- **Long-lived, broad presigned URLs** — sign one part number for minutes, and remember URLs signed by role credentials die early.
- **Comparing a composite checksum to a whole-file SHA-256** — they differ by design; use a CRC full-object checksum if you need that comparison.
- **No lifecycle rule** — abandoned uploads are billed forever.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Shape:</strong> <span style="color:#f0e2c8;">Bytes go <strong style="color:#ffca28;">browser to S3 directly</strong>. The backend authorises the user, picks the key, calls CreateMultipartUpload and records the upload; the browser gets <strong style="color:#ffca28;">presigned URLs</strong> for individual part numbers, a few minutes each.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Integrity:</strong> <span style="color:#f0e2c8;">The browser slices the file, computes each part's <strong style="color:#ffca28;">SHA-256</strong>, and sends it as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x-amz-checksum-sha256</code>; S3 rejects a corrupted part with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BadDigest</code>, so only that part is retried. At Complete, the <strong style="color:#ffca28;">composite checksum</strong> must equal the one the browser computes from its own part hashes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Resume:</strong> <span style="color:#f0e2c8;">I store the upload ID and file identity in localStorage, or on the backend for cross-device. After a reload, the backend calls <strong style="color:#ffca28;">ListParts</strong>; the browser re-hashes those slices to prove it is the same file, then uploads only the missing parts with fresh URLs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Browser details:</strong> <span style="color:#f0e2c8;">CORS must allow PUT and <strong style="color:#ffca28;">expose ETag</strong>. I slice the File instead of reading it, run 4-6 parts in parallel, and refresh URLs in batches because they expire.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Lifecycle:</strong> <span style="color:#f0e2c8;">The backend, not the client, calls Complete and then triggers scanning and publishing. An <strong style="color:#ffca28;">AbortIncompleteMultipartUpload</strong> rule cleans up abandoned uploads, and presigned URLs never outlive 7 days or the signing role session.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not have the browser call CreateMultipartUpload and CompleteMultipartUpload directly too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That would need credentials that allow those calls on a key the client chooses. Keeping create and complete on the backend means the server picks the key, enforces size and type limits, records ownership, and controls when a file becomes visible.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prevent a user from uploading 1 TB when they said 10 MB?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The backend computes the part count from the declared size and only signs that many part numbers; it can also check the parts listed at Complete against the declared size and abort if they disagree.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why SHA-256 rather than relying on TLS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TLS protects the bytes on the wire, not a bug in the client slicing code, a buggy proxy that terminates TLS, or a mismatch between the file the user picked and what was sent. A checksum computed from the source bytes and checked by S3 covers the whole path.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The user switches from laptop to phone mid-upload. Can it resume?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if the upload state lives on the backend and the phone has the same file. The phone would hash its copy, compare with the stored part checksums, and continue; in practice most products restart on a different device.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make the URLs safer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Short expiry, one part number per URL, the checksum signed into the request, URLs issued only to the owner of the upload, and signing with credentials scoped to the uploads prefix.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Presigned URL | A URL carrying a signature that allows one specific request until it expires |
| Part checksum | Digest sent with a part; S3 rejects the part if the bytes do not match |
| Least-privilege presigning | One method, key, upload ID and part number per URL, for minutes |
| Upload session state | Upload ID, key, part size, file identity, owner, status |
| Composite checksum | Checksum of the part checksums, with a \`-N\` suffix |
| Full-object checksum | Checksum over all object bytes; CRC family only for multipart |

**Conclusion:** A good browser upload keeps the backend in charge and the bytes out of it: the server authorises, chooses the key, starts the multipart upload and signs narrow, short-lived URLs per part; the browser slices the file, hashes each part, uploads parts in parallel and stores the ETags (which CORS must expose). The run showed why each check exists: a flipped byte failed with BadDigest, a part-3 URL could not upload part 4, a reload resumed from ListParts only after the browser proved it still had the same file, an expired URL was replaced, and the composite checksum matched end to end. Add a lifecycle rule for abandoned uploads and let the backend decide when a file is published.`,
    examples: [
      {
        label: `Presigned part URLs with per-part SHA-256: corrupted part, misused URL, tab reload resume, expired URL, composite checksum, lifecycle abort`,
        variants: [
          { tech: "node", code: `// Browser -> S3 multipart with presigned part URLs and per-part SHA-256, simulated in one process.
const crypto = require("crypto");
const sha = (b) => crypto.createHash("sha256").update(b).digest();
const b64 = (b) => b.toString("base64");
const SECRET = "backend-signing-key";          // stands for the AWS credentials only the backend holds
let now = 0;                                     // fake clock, seconds

// Backend: signs (uploadId, partNumber, checksum, expiry). Stands for SigV4 query-string signing.
function presign(uploadId, part, checksum, ttl) {
  const exp = now + ttl;
  const msg = \`PUT\\n\${uploadId}\\n\${part}\\n\${checksum}\\n\${exp}\`;
  return { uploadId, part, checksum, exp, sig: crypto.createHmac("sha256", SECRET).update(msg).digest("hex") };
}

// Fake S3 part endpoint: checks signature, expiry, then that the body matches the checksum header.
const parts = new Map();                          // uploadId -> Map(part -> {checksum, size})
function putPart(url, sentPart, header, body) {
  const msg = \`PUT\\n\${url.uploadId}\\n\${sentPart}\\n\${header}\\n\${url.exp}\`;
  const sig = crypto.createHmac("sha256", SECRET).update(msg).digest("hex");
  if (sig !== url.sig) return "403 SignatureDoesNotMatch";
  if (now > url.exp) return "403 AccessDenied (Request has expired)";
  if (b64(sha(body)) !== header) return "400 BadDigest";
  if (!parts.has(url.uploadId)) parts.set(url.uploadId, new Map());
  parts.get(url.uploadId).set(sentPart, { checksum: header, size: body.length });
  return "200 ETag " + crypto.createHash("md5").update(body).digest("hex").slice(0, 8);
}

// The "file" the user picked: 40,000 bytes split into 10,000-byte parts (stand for 10 MiB parts).
const file = Buffer.alloc(40000);
for (let i = 0; i < file.length; i++) file[i] = (i * 7 + (i >> 9)) & 255;
const PART = 10000;
const slice = (f, n) => f.subarray((n - 1) * PART, n * PART);
const sums = [1, 2, 3, 4].map((n) => b64(sha(slice(file, n))));

console.log("== 1. Browser hashes each part, backend presigns (TTL 900 s) ==");
const uploadId = "upl-7f3a";
const urls = {};
for (let n = 1; n <= 4; n++) { urls[n] = presign(uploadId, n, sums[n - 1], 900); }
console.log(\`part 1 sha256 \${sums[0]}\`);
console.log(\`part 1 -> \${putPart(urls[1], 1, sums[0], slice(file, 1))}\`);

console.log("== 2. A byte flipped in transit ==");
const corrupt = Buffer.from(slice(file, 2)); corrupt[1234] ^= 1;
console.log(\`part 2 corrupted -> \${putPart(urls[2], 2, sums[1], corrupt)}\`);
console.log(\`part 2 retried   -> \${putPart(urls[2], 2, sums[1], slice(file, 2))}\`);

console.log("== 3. Misusing a URL ==");
console.log(\`part 3 URL sent as part 4 -> \${putPart(urls[3], 4, sums[3], slice(file, 4))}\`);
console.log(\`part 3 URL, other checksum -> \${putPart(urls[3], 3, sums[3], slice(file, 4))}\`);
console.log(\`part 3 -> \${putPart(urls[3], 3, sums[2], slice(file, 3))}\`);

console.log("== 4. Tab reloads at t=1000; uploadId was saved in localStorage ==");
now = 1000;
const listed = [...parts.get(uploadId).entries()].sort((a, b) => a[0] - b[0]);
console.log(\`backend ListParts -> \${listed.map(([n, p]) => \`\${n}:\${p.size}\`).join(" ")}\`);
const other = Buffer.from(file); other[5] ^= 255;  // the user re-picked a different file with the same name
const matches = (f) => listed.every(([n, p]) => b64(sha(slice(f, n))) === p.checksum);
console.log(\`re-picked same file matches stored parts: \${matches(file)}\`);
console.log(\`re-picked edited file matches stored parts: \${matches(other)}\`);
console.log(\`old part 4 URL -> \${putPart(urls[4], 4, sums[3], slice(file, 4))}\`);
urls[4] = presign(uploadId, 4, sums[3], 900);
console.log(\`fresh part 4 URL -> \${putPart(urls[4], 4, sums[3], slice(file, 4))}\`);

console.log("== 5. Complete: composite checksum = sha256(part digests) + -N ==");
const got = [...parts.get(uploadId).entries()].sort((a, b) => a[0] - b[0]);
const composite = (list) => b64(sha(Buffer.concat(list.map((c) => Buffer.from(c, "base64"))))) + "-" + list.length;
const server = composite(got.map(([, p]) => p.checksum));
const browser = composite(sums);
console.log(\`server  \${server}\`);
console.log(\`browser \${browser}\`);
console.log(\`whole-file sha256 \${b64(sha(file))} (a different value)\`);
console.log(\`integrity verified end to end: \${server === browser}\`);

console.log("== 6. Lifecycle rule: abort incomplete uploads after 7 days ==");
const pending = [{ id: "upl-7f3a", started: 0, done: true }, { id: "upl-91c2", started: 0, done: false, bytes: 30000 }, { id: "upl-a004", started: 6 * 86400, done: false, bytes: 10000 }];
now = 8 * 86400;
for (const u of pending.filter((u) => !u.done)) {
  const age = (now - u.started) / 86400;
  console.log(\`\${u.id}: \${age} days old, \${u.bytes} bytes -> \${age >= 7 ? "aborted, parts deleted" : "kept"}\`);
}` },
          { tech: "python", code: `# Browser -> S3 multipart with presigned part URLs and per-part SHA-256, simulated in one process.
import base64
import hashlib
import hmac

SECRET = b"backend-signing-key"  # stands for the AWS credentials only the backend holds
now = 0  # fake clock, seconds


def sha(b):
    return hashlib.sha256(b).digest()


def b64(b):
    return base64.b64encode(b).decode()


def sign(msg):
    return hmac.new(SECRET, msg.encode(), hashlib.sha256).hexdigest()


# Backend: signs (uploadId, partNumber, checksum, expiry). Stands for SigV4 query-string signing.
def presign(upload_id, part, checksum, ttl):
    exp = now + ttl
    return {"uploadId": upload_id, "part": part, "checksum": checksum, "exp": exp,
            "sig": sign(f"PUT\\n{upload_id}\\n{part}\\n{checksum}\\n{exp}")}


# Fake S3 part endpoint: checks signature, expiry, then that the body matches the checksum header.
parts = {}  # uploadId -> {part: {checksum, size}}


def put_part(url, sent_part, header, body):
    if sign(f"PUT\\n{url['uploadId']}\\n{sent_part}\\n{header}\\n{url['exp']}") != url["sig"]:
        return "403 SignatureDoesNotMatch"
    if now > url["exp"]:
        return "403 AccessDenied (Request has expired)"
    if b64(sha(body)) != header:
        return "400 BadDigest"
    parts.setdefault(url["uploadId"], {})[sent_part] = {"checksum": header, "size": len(body)}
    return "200 ETag " + hashlib.md5(body).hexdigest()[:8]


# The "file" the user picked: 40,000 bytes split into 10,000-byte parts (stand for 10 MiB parts).
file = bytes(((i * 7 + (i >> 9)) & 255) for i in range(40000))
PART = 10000


def slice_(f, n):
    return f[(n - 1) * PART:n * PART]


sums = [b64(sha(slice_(file, n))) for n in [1, 2, 3, 4]]

print("== 1. Browser hashes each part, backend presigns (TTL 900 s) ==")
upload_id = "upl-7f3a"
urls = {n: presign(upload_id, n, sums[n - 1], 900) for n in range(1, 5)}
print(f"part 1 sha256 {sums[0]}")
print(f"part 1 -> {put_part(urls[1], 1, sums[0], slice_(file, 1))}")

print("== 2. A byte flipped in transit ==")
corrupt = bytearray(slice_(file, 2))
corrupt[1234] ^= 1
print(f"part 2 corrupted -> {put_part(urls[2], 2, sums[1], bytes(corrupt))}")
print(f"part 2 retried   -> {put_part(urls[2], 2, sums[1], slice_(file, 2))}")

print("== 3. Misusing a URL ==")
print(f"part 3 URL sent as part 4 -> {put_part(urls[3], 4, sums[3], slice_(file, 4))}")
print(f"part 3 URL, other checksum -> {put_part(urls[3], 3, sums[3], slice_(file, 4))}")
print(f"part 3 -> {put_part(urls[3], 3, sums[2], slice_(file, 3))}")

print("== 4. Tab reloads at t=1000; uploadId was saved in localStorage ==")
now = 1000
listed = sorted(parts[upload_id].items())
print("backend ListParts -> " + " ".join(f"{n}:{p['size']}" for n, p in listed))
other = bytearray(file)
other[5] ^= 255  # the user re-picked a different file with the same name
other = bytes(other)


def matches(f):
    return all(b64(sha(slice_(f, n))) == p["checksum"] for n, p in listed)


print(f"re-picked same file matches stored parts: {str(matches(file)).lower()}")
print(f"re-picked edited file matches stored parts: {str(matches(other)).lower()}")
print(f"old part 4 URL -> {put_part(urls[4], 4, sums[3], slice_(file, 4))}")
urls[4] = presign(upload_id, 4, sums[3], 900)
print(f"fresh part 4 URL -> {put_part(urls[4], 4, sums[3], slice_(file, 4))}")

print("== 5. Complete: composite checksum = sha256(part digests) + -N ==")
got = sorted(parts[upload_id].items())


def composite(lst):
    return b64(sha(b"".join(base64.b64decode(c) for c in lst))) + "-" + str(len(lst))


server = composite([p["checksum"] for _, p in got])
browser = composite(sums)
print(f"server  {server}")
print(f"browser {browser}")
print(f"whole-file sha256 {b64(sha(file))} (a different value)")
print(f"integrity verified end to end: {str(server == browser).lower()}")

print("== 6. Lifecycle rule: abort incomplete uploads after 7 days ==")
pending = [{"id": "upl-7f3a", "started": 0, "done": True},
           {"id": "upl-91c2", "started": 0, "done": False, "bytes": 30000},
           {"id": "upl-a004", "started": 6 * 86400, "done": False, "bytes": 10000}]
now = 8 * 86400
for u in [u for u in pending if not u["done"]]:
    age = (now - u["started"]) // 86400
    print(f"{u['id']}: {age} days old, {u['bytes']} bytes -> {'aborted, parts deleted' if age >= 7 else 'kept'}")` },
        ],
      },
    ],
  },
  {
    title: `How would you design S3-like object storage?`,
    difficulty: "hard",
    seoDescription: `Design S3-like object storage: API, metadata vs data planes, erasure coding math, AZ placement, strong consistency, listing, repair and what breaks at 10x.`,
    description: `**Question presented to candidate:**
"Design an object storage service like Amazon S3. Customers create buckets and PUT, GET, LIST and DELETE objects from a few bytes to many terabytes. It has to be extremely durable, survive losing a whole data centre, and scale to hundreds of petabytes. Walk me through the API, how metadata and data are stored, how you keep data safe, and what breaks first as it grows."

**What a strong answer should cover:**
- Split into a **metadata plane** (bucket and key to object record: size, checksum, version, shard locations) and a **data plane** (storage nodes holding immutable chunks or shards), with stateless front ends in between
- Durability with **erasure coding** instead of plain replication: RS(6,3) stores 150% of the data and survives 3 lost shards, versus 300% for 3 copies; repair reads k shards, so repair traffic is the cost
- **Placement** across failure domains: shards spread so that losing one availability zone loses at most m shards (RS(6,3) as 3/3/3 survives; RS(10,4) over 3 zones does not)
- The write path and **consistency**: write and acknowledge shards first, then commit the metadata record as the single commit point; that gives strong read-after-write and atomic overwrites, plus conditional writes
- Metadata at scale: range-partitioned by bucket and key so **LIST** by prefix is a range scan, split hot partitions, versioning and delete markers, garbage collection of unreferenced data
- Capacity numbers: objects, bytes, disks, metadata size, throughput, and what breaks first at 10x (metadata hot spots, repair bandwidth, small-object overhead)

**Clarifying questions expected:**
- Object size distribution, request rates, and read/write ratio?
- Durability and availability targets, and must it survive a full AZ or region loss?
- Which features are in scope: versioning, listing, multipart, lifecycle, storage classes?

**Code / implementation expected:** Optional — architecture and numbers come first; the example implements Reed-Solomon over a small prime field to show encode, loss and rebuild, and computes the overhead and loss odds.`,
    answer: `**Target Audience:** Developers preparing for system design interviews. You know what a database, a disk and a load balancer are; no storage-systems background needed.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output). AWS facts are cited inline; the design is a generic object store, not a description of S3 internals, which AWS has published only in part.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Capacity numbers are worked from stated assumptions. All coding behaviour comes from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A city archive stores millions of documents. Each document gets a card in the catalogue — title, shelf, box — and the documents themselves sit in a huge warehouse. Visitors ask the catalogue first, then fetch from the warehouse. The archive cannot lose a single page, so instead of photocopying every document three times (expensive), it uses a clever trick: it cuts each document into 6 strips and adds 3 "puzzle strips" computed from them, so that any 6 of the 9 strips rebuild the whole document. The 9 strips go to three different buildings. One building burns down — no document is lost.

Object storage is that archive. The catalogue is the **metadata plane**, the warehouse is the **data plane**, and the puzzle strips are **erasure coding**.

📌 **Interview term: object storage** — a store of immutable blobs ("objects") addressed by bucket and key, accessed over HTTP with whole-object PUT, GET (optionally by byte range), LIST and DELETE. There are no in-place edits or file-system directories; a "folder" is just a key prefix.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Object size distribution (median, p99)? | Small objects stress metadata and per-object overhead; huge ones need multipart and streaming |
| Requests per second, read/write ratio? | Sizes front ends and metadata partitions |
| Durability and availability targets? | Picks the coding scheme and the number of failure domains |
| Survive a whole AZ? A whole region? | AZ: spread shards over 3 zones; region: asynchronous cross-region replication |
| Consistency needed for overwrite and LIST? | Decides whether metadata needs a strongly consistent store |
| Features: versioning, lifecycle, storage classes? | Each adds metadata state and background jobs |

## 3. Requirements

**Functional**
- Buckets: create, delete, per-bucket settings (versioning, lifecycle, access policy).
- Objects: \`PUT\`, \`GET\` (with \`Range\`), \`HEAD\`, \`DELETE\`, \`LIST\` by prefix with pagination, multipart upload for large objects (see [how S3 multipart upload works](/interview-question/how-does-s3-multipart-upload-make-5tb-uploads-resumable-and-fast)).
- Optional: versioning, conditional writes, presigned URLs, lifecycle rules.

**Non-functional**
- Durability: design for "eleven nines" per object per year, the figure AWS states for S3 (99.999999999%).
- Survive the loss of one availability zone with no data loss and continued reads.
- Strong read-after-write consistency for PUT, overwrite, DELETE and LIST, which S3 has offered since December 2020 (AWS "What's New", Dec 2020).
- Scale horizontally to hundreds of petabytes and tens of thousands of requests per second; cost per GB close to the raw disk cost.

## 4. Capacity Estimate

Assumptions (illustrative; state them out loud):

| Input | Value |
| :--- | :--- |
| Objects stored | 100 billion |
| Average object size | 1 MB |
| PUTs | 20,000/s average, 3x at peak |
| GETs | 100,000/s average, 3x at peak |
| Metadata per object | about 500 bytes (key, size, checksum, version, shard locations) |
| Disk | 20 TB, filled to 70% |
| Coding | RS(6,3), 1.5x raw storage |

Arithmetic:
- Logical data: 100 billion x 1 MB = **100 PB**. Raw with RS(6,3): **150 PB** (3x replication would need 300 PB).
- Disks: 150 PB / (20 TB x 0.7) = **10,714 disks**, about **298 servers** at 36 disks each, spread over 3 AZs.
- Ingest: 20,000 x 1 MB = **20 GB/s** average, **60 GB/s** at peak; with coding overhead the storage nodes write **90 GB/s** at peak. Egress at peak: **300 GB/s**.
- New data per day: 20,000 x 86,400 x 1 MB = **1.73 PB/day**.
- Metadata: 100 billion x 500 bytes = **50 TB**, 150 TB with 3 replicas; at about 100 GB per partition that is **500 partitions**. Metadata operations at peak: 60,000 writes/s and 300,000 reads/s.

The method is in [back-of-the-envelope capacity estimation](/interview-question/how-do-you-approach-back-of-the-envelope-capacity-estimation). The headline: data is a disk-count problem; metadata is a distributed-database problem.

## 5. API

~~~http
PUT    /{bucket}/{key}                      body = bytes, x-amz-checksum-crc64nvme, If-None-Match: *
GET    /{bucket}/{key}                      Range: bytes=0-1048575
HEAD   /{bucket}/{key}
DELETE /{bucket}/{key}
GET    /{bucket}?list-type=2&prefix=logs/2026/&continuation-token=...
POST   /{bucket}/{key}?uploads              start a multipart upload
~~~

Conditional writes are part of a modern object API: S3 added \`If-None-Match\` on PUT ("create only if absent", August 2024) and \`If-Match\` with an ETag (compare-and-swap, November 2024), per AWS "What's New" posts. They let clients build locks and safe read-modify-write on top of the store.

## 6. Data Model

Metadata, one row per object version, partitioned by \`(bucket, key)\` **range** so that a prefix listing is one ordered scan:

~~~sql
CREATE TABLE object_version (
  bucket       TEXT     NOT NULL,
  object_key   TEXT     NOT NULL,
  version_id   TEXT     NOT NULL,     -- time-ordered, newest first
  is_latest    BOOLEAN  NOT NULL,
  is_delete_marker BOOLEAN NOT NULL DEFAULT false,
  size_bytes   BIGINT   NOT NULL,
  etag         TEXT     NOT NULL,
  checksum     TEXT,
  placement    JSONB    NOT NULL,     -- [{chunk_id, scheme: "RS(6,3)", shards: [{node, disk, az}, ...]}]
  created_at   TIMESTAMP NOT NULL,
  PRIMARY KEY (bucket, object_key, version_id)
);
~~~

Data: storage nodes hold **chunks** (say up to 64 MB of an object, or many small objects packed together), each chunk erasure-coded into 9 **shards** stored on 9 different disks. A shard is immutable once written; deletes and overwrites only change metadata, and a background collector reclaims shards no metadata row points to.

## 7. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Clients reach stateless front ends behind a load balancer; front ends call a metadata service that is a range partitioned replicated store, a placement service that picks disks, and storage nodes spread over three availability zones">
  <defs>
    <marker id="sd16q3-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="130" width="110" height="60" rx="10"/>
  <text class="d-text" x="75" y="165" text-anchor="middle">clients</text>
  <rect class="d-box" x="180" y="120" width="160" height="80" rx="10"/>
  <text class="d-text" x="260" y="150" text-anchor="middle">front ends</text>
  <text class="d-sub" x="260" y="172" text-anchor="middle">auth, encode, stream</text>
  <rect class="d-box-accent" x="420" y="20" width="200" height="70" rx="10"/>
  <text class="d-text" x="520" y="50" text-anchor="middle">metadata service</text>
  <text class="d-sub" x="520" y="72" text-anchor="middle">range partitions, replicated</text>
  <rect class="d-box" x="420" y="130" width="200" height="60" rx="10"/>
  <text class="d-text" x="520" y="165" text-anchor="middle">placement service</text>
  <rect class="d-box" x="420" y="240" width="90" height="60" rx="10"/>
  <text class="d-text" x="465" y="275" text-anchor="middle">AZ 1</text>
  <rect class="d-box" x="530" y="240" width="90" height="60" rx="10"/>
  <text class="d-text" x="575" y="275" text-anchor="middle">AZ 2</text>
  <rect class="d-box" x="640" y="240" width="90" height="60" rx="10"/>
  <text class="d-text" x="685" y="275" text-anchor="middle">AZ 3</text>
  <path class="d-edge" d="M 130 160 L 174 160" marker-end="url(#sd16q3-arrow)"/>
  <path class="d-edge-accent" d="M 340 140 L 414 70" marker-end="url(#sd16q3-arrow)"/>
  <path class="d-edge" d="M 340 160 L 414 160" marker-end="url(#sd16q3-arrow)"/>
  <path class="d-edge" d="M 340 185 L 414 262" marker-end="url(#sd16q3-arrow)"/>
</svg>

Front ends are stateless and do the heavy lifting of streaming, checksumming and encoding; the metadata service is the only strongly consistent component; storage nodes in three zones hold the shards.

- **Front ends**: authenticate (signature check), apply bucket policy, stream the body, compute checksums, erasure-code chunks and fan out shard writes. Stateless, scaled behind a [load balancer](/interview-question/what-is-a-load-balancer-and-what-strategies-does-it-use).
- **Placement service**: knows every disk's zone, rack, free space and health; picks 9 disks for each chunk respecting failure domains. Off the read path.
- **Storage nodes**: a local key-value store from shard ID to bytes plus a checksum; they scrub (re-read and verify) data in the background. AWS has described its own storage-node store, ShardStore, in a SOSP 2021 paper.
- **Metadata service**: a replicated, range-partitioned store (Raft or Paxos groups per partition, see [leader election](/interview-question/what-is-leader-election-in-distributed-systems)) holding the object rows; this is where consistency comes from.

## 8. Deep Dive 1: Durability with Erasure Coding

Copying each object three times is simple, but it triples the bill. **Erasure coding** stores \`k\` data shards plus \`m\` parity shards computed from them, such that **any k of the k+m shards rebuild the data**. The example implements a systematic Reed-Solomon code with k=6 and m=3 over the prime field GF(257) — real systems use GF(2^8) so every symbol is a byte, but the algebra is the same: the data are points of a polynomial, and parity shards are more points of that polynomial.

~~~js
// shard i holds the polynomial value at x = i; any 6 points determine the degree-5 polynomial
for (let i = 0; i < N; i++) shards[i].push(i < K ? ys[i] : interp(xs, ys, i + 1));
~~~

~~~text
== 1. RS(6,3): 37 bytes -> 9 shards of 7 symbols ==
shard 1 data   [111, 32, 115, 32, 32, 98, 104]
shard 2 data   [98, 115, 32, 98, 115, 121, 0]
shard 3 data   [106, 116, 107, 121, 97, 32, 0]
shard 4 data   [101, 111, 101, 116, 102, 109, 0]
shard 5 data   [99, 114, 101, 101, 101, 97, 0]
shard 6 data   [116, 101, 112, 115, 32, 116, 0]
shard 7 parity [118, 34, 163, 236, 177, 27, 153]
shard 8 parity [228, 142, 156, 85, 254, 83, 147]
shard 9 parity [162, 174, 229, 129, 51, 38, 129]
lose [2,5,8]: rebuilt from [1,3,4,6,7,9] -> "object stores keep bytes safe by math"
lose [1,2,3]: rebuilt from [4,5,6,7,8,9] -> "object stores keep bytes safe by math"
lose [1,4,7,9]: cannot rebuild: 5 shards left, need 6
~~~

Losing shards 2, 5 and 8 (or all three of 1, 2, 3) still rebuilt the exact text; losing four did not. Now the trade-off, assuming each shard is independently lost before repair finishes with probability 0.001 (an assumption to make the comparison concrete, not a real failure rate):

~~~text
== 2. Overhead and loss probability (p = 0.001 per shard per repair window) ==
3x replication stores 300% of the data, survives 2 lost, P(loss) 1.00e-9, repair cost 1x
RS(4,2)        stores 150% of the data, survives 2 lost, P(loss) 2.00e-8, repair cost 4x
RS(6,3)        stores 150% of the data, survives 3 lost, P(loss) 1.25e-10, repair cost 6x
RS(10,4)       stores 140% of the data, survives 4 lost, P(loss) 1.99e-12, repair cost 10x
~~~

| Scheme | Raw storage | Tolerates | P(loss) in the run | Repair reads |
| :--- | :--- | :--- | :--- | :--- |
| 3x replication | 300% | 2 lost | 1.00e-9 | 1 shard |
| RS(4,2) | 150% | 2 lost | 2.00e-8 | 4 shards |
| RS(6,3) | 150% | 3 lost | 1.25e-10 | 6 shards |
| RS(10,4) | 140% | 4 lost | 1.99e-12 | 10 shards |

What the numbers say:
- **RS(6,3) beats 3x replication on both cost and safety**: half the raw storage (150% vs 300%) and about 8x lower loss probability (1.25e-10 vs 1.00e-9) under this model.
- **Tolerance is not everything**: RS(4,2) tolerates as many losses as 3x replication but is 20x more likely to lose data (2.00e-8), because it has more shards that can fail.
- **The price is repair traffic**: rebuilding one lost shard reads k shards. A failed 20 TB disk under RS(6,3) means about 120 TB of reads across the cluster, versus 20 TB with replication. Repair bandwidth, not capacity, is what you budget for, and faster repair shrinks the window in which a second and third failure can stack up.

📌 **Interview term: erasure coding (Reed-Solomon, RS(k,m))** — encode k data shards into k+m shards so that any k rebuild the data; storage overhead (k+m)/k, tolerates m losses, repair reads k shards.

📌 **Interview term: durability vs availability** — durability is "the bytes are not lost"; availability is "I can read them right now". A zone outage can make data temporarily unavailable without reducing durability.

Hot, small or very recently written data is often kept as replicas first and erasure-coded later (Dropbox describes doing exactly that in its "Inside the Magic Pocket" engineering post), because replicas are cheaper to write and read.

## 9. Deep Dive 2: Placement Across Failure Domains

Shards must land on different disks, different servers, different racks — and across zones in a way that survives a zone loss. The example spreads each scheme round-robin over 3 AZs:

~~~text
== 3. Placement over 3 AZs, lose one whole AZ ==
3x replication AZs hold 1/1/1 -> lose 1, still readable
RS(4,2)        AZs hold 2/2/2 -> lose 2, still readable
RS(6,3)        AZs hold 3/3/3 -> lose 3, still readable
RS(10,4)       AZs hold 5/5/4 -> lose 5, DATA UNAVAILABLE
~~~

RS(6,3) as 3/3/3 survives a zone loss exactly at its limit. **RS(10,4) does not**: 14 shards over 3 zones put 5 in one zone, and 5 > 4. Wider codes are cheaper (140%) but need more zones, or a two-level scheme (a local code within the zone plus cross-zone parity), to survive a zone failure. The placement service enforces "at most m shards per zone, at most one per server" for every chunk.

📌 **Interview term: failure domain** — a set of components that can fail together (disk, server, rack, power feed, zone). Placement spreads each chunk so no single domain holds more than the code can lose.

## 10. Deep Dive 3: The Write Path and Consistency

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="PUT path: front end streams and encodes the chunk, writes 9 shards to storage nodes and waits for acknowledgements, then commits the metadata row, then returns 200 to the client">
  <defs>
    <marker id="sd16q3-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="90" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="120" text-anchor="middle">1. receive</text>
  <text class="d-sub" x="95" y="142" text-anchor="middle">checksum, encode</text>
  <rect class="d-box" x="220" y="90" width="150" height="70" rx="10"/>
  <text class="d-text" x="295" y="120" text-anchor="middle">2. write shards</text>
  <text class="d-sub" x="295" y="142" text-anchor="middle">9 nodes, 3 AZs</text>
  <rect class="d-box-accent" x="420" y="90" width="150" height="70" rx="10"/>
  <text class="d-text" x="495" y="120" text-anchor="middle">3. commit row</text>
  <text class="d-sub" x="495" y="142" text-anchor="middle">metadata</text>
  <rect class="d-box-muted" x="620" y="90" width="120" height="70" rx="10"/>
  <text class="d-text" x="680" y="130" text-anchor="middle">4. 200 OK</text>
  <path class="d-edge" d="M 170 125 L 214 125" marker-end="url(#sd16q3-arrow2)"/>
  <path class="d-edge" d="M 370 125 L 414 125" marker-end="url(#sd16q3-arrow2)"/>
  <path class="d-edge" d="M 570 125 L 614 125" marker-end="url(#sd16q3-arrow2)"/>
</svg>

The metadata commit in step 3 is the single moment the object becomes visible; everything before it is invisible and safe to retry or garbage-collect.

1. The front end streams the body, verifies the client checksum, and encodes each chunk.
2. It writes the shards to the 9 placed disks and waits for enough acknowledgements to meet the durability goal (all 9, or at least k plus a margin, with the rest repaired asynchronously).
3. It commits the metadata row in one strongly consistent write: new version, \`is_latest\`, placement. **This is the commit point.**
4. Only then does it return \`200\`.

Consequences:
- **Read-after-write is strong** because every GET reads the latest committed metadata row before reading shards.
- **Overwrites are atomic**: a reader sees the old placement or the new one, never a mix.
- **Crashes leave orphans, not corruption**: shards written before a crash at step 3 have no metadata row; the collector removes them.
- **Conditional writes** are a compare-and-set on the metadata row (\`If-None-Match: *\` means "commit only if no latest version exists").

This is the same idea as committing a [write-ahead log](/interview-question/what-is-a-write-ahead-log-wal) record last: data first, then a small atomic pointer flip.

📌 **Interview term: commit point** — the one atomic step after which a write is visible and durable; here, the metadata row write. Designing the write path is mostly choosing it and making everything before it idempotent.

## 11. Deep Dive 4: Metadata, LIST and Hot Prefixes

- **Range partitioning by \`(bucket, key)\`**: LIST with a prefix is a range scan returning keys in lexicographic order, with a continuation token holding the last key. Hash partitioning would scatter a prefix over every partition (see [sharding](/interview-question/what-is-database-sharding) for the trade-off).
- **Split hot partitions**: a bucket where everyone writes \`logs/2026-10-17/...\` concentrates writes in one key range; the metadata service splits partitions by load, not only by size. Clients help by spreading keys across prefixes.
- **Versioning**: an overwrite adds a version row; a DELETE in a versioned bucket adds a **delete marker** row; lifecycle rules expire old versions later.
- **Garbage collection**: a background job compares placement references with shards on disk and reclaims shards nothing points to, after a grace period to avoid racing in-flight writes.

## 12. Small Objects

At 1 KB per object, 500 bytes of metadata is a 50% overhead and a 9-shard write per object is absurd. Pack small objects into larger chunks (append them to an open "volume" that is sealed and erasure-coded when full), store \`(chunk, offset, length)\` in the placement, and accept that deleting a small object leaves a hole reclaimed later by **compaction**.

## 13. What Breaks First at 10x

At 1 trillion objects, 1 EB logical, 200,000 PUT/s:
- **Metadata**: 500 TB of rows and 600,000 writes/s at peak; partitions must split automatically and hot prefixes need load-based splitting before anything else.
- **Repair bandwidth**: about 107,000 disks means several disk failures every day; each costs 6x its contents in reads under RS(6,3), so repair needs reserved network capacity and prioritisation (objects that lost the most shards first).
- **Small-object overhead**: packing and compaction become a major background workload.
- **Cross-zone traffic**: every write sends two thirds of its shards to other zones; at 900 GB/s of shard writes that is the biggest network bill.

## 14. Verified: Running the Code

The example **"Reed-Solomon RS(6,3) erasure coding: encode, lose shards, rebuild, then overhead, loss odds and AZ placement per scheme"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and Java 21. All four print exactly this:

~~~text
== 1. RS(6,3): 37 bytes -> 9 shards of 7 symbols ==
shard 1 data   [111, 32, 115, 32, 32, 98, 104]
shard 2 data   [98, 115, 32, 98, 115, 121, 0]
shard 3 data   [106, 116, 107, 121, 97, 32, 0]
shard 4 data   [101, 111, 101, 116, 102, 109, 0]
shard 5 data   [99, 114, 101, 101, 101, 97, 0]
shard 6 data   [116, 101, 112, 115, 32, 116, 0]
shard 7 parity [118, 34, 163, 236, 177, 27, 153]
shard 8 parity [228, 142, 156, 85, 254, 83, 147]
shard 9 parity [162, 174, 229, 129, 51, 38, 129]
lose [2,5,8]: rebuilt from [1,3,4,6,7,9] -> "object stores keep bytes safe by math"
lose [1,2,3]: rebuilt from [4,5,6,7,8,9] -> "object stores keep bytes safe by math"
lose [1,4,7,9]: cannot rebuild: 5 shards left, need 6
== 2. Overhead and loss probability (p = 0.001 per shard per repair window) ==
3x replication stores 300% of the data, survives 2 lost, P(loss) 1.00e-9, repair cost 1x
RS(4,2)        stores 150% of the data, survives 2 lost, P(loss) 2.00e-8, repair cost 4x
RS(6,3)        stores 150% of the data, survives 3 lost, P(loss) 1.25e-10, repair cost 6x
RS(10,4)       stores 140% of the data, survives 4 lost, P(loss) 1.99e-12, repair cost 10x
== 3. Placement over 3 AZs, lose one whole AZ ==
3x replication AZs hold 1/1/1 -> lose 1, still readable
RS(4,2)        AZs hold 2/2/2 -> lose 2, still readable
RS(6,3)        AZs hold 3/3/3 -> lose 3, still readable
RS(10,4)       AZs hold 5/5/4 -> lose 5, DATA UNAVAILABLE
~~~

What the simulation stands for and what it leaves out: the code works over GF(257), so a parity symbol can be 256 and does not fit a byte (real coders use GF(2^8) tables); the "object" is 37 bytes striped across shards; loss probabilities use an independent per-shard failure probability of 0.001 and ignore correlated failures, which dominate in practice; placement is round-robin over 3 zones without racks or servers. There is no network, disk or metadata service.

## Edge Cases Worth Knowing

- **Degraded reads**: if a data shard is unavailable, the GET reads parity and decodes on the fly; latency rises, so storage nodes report slow disks and front ends hedge reads.
- **Bit rot**: background scrubbing re-reads shards and compares checksums; a bad shard is rebuilt like a lost one.
- **Range GETs on erasure-coded data**: map the byte range to the chunk and the data shards that hold it; with a systematic code no decode is needed when all data shards are healthy.
- **Bucket deletion with billions of objects**: an asynchronous job, not a request.
- **Clock and version ordering**: version IDs come from the metadata partition leader, not from front-end clocks.

## Common Pitfalls

- **Replication only** — 300% raw storage for worse durability than RS(6,3) under the same failure model (1.00e-9 vs 1.25e-10 in the run).
- **Ignoring repair traffic** — erasure coding moves cost from disks to network; a 20 TB disk rebuild reads about 120 TB under RS(6,3).
- **Placement that ignores zones** — RS(10,4) over 3 zones put 5 shards in one zone and lost availability with that zone.
- **Committing metadata before the data is durable** — readers find rows pointing at missing shards; data first, metadata row last.
- **Hash-partitioned metadata** — prefix LIST becomes a scatter-gather over every partition.
- **One shard write per tiny object** — pack small objects into chunks.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Shape:</strong> <span style="color:#f0e2c8;">I split it into <strong style="color:#ffca28;">stateless front ends</strong>, a strongly consistent, range-partitioned <strong style="color:#ffca28;">metadata service</strong> mapping bucket and key to versions and shard locations, and <strong style="color:#ffca28;">storage nodes</strong> in three AZs holding immutable shards, plus a placement service and background repair and GC.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Numbers:</strong> <span style="color:#f0e2c8;">100 billion objects at 1 MB is 100 PB; with RS(6,3) that is 150 PB raw, about 10,700 disks of 20 TB at 70% full. Metadata is about 50 TB, roughly 500 partitions, with 60,000 writes/s at peak.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Durability:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Erasure coding</strong> RS(6,3): any 6 of 9 shards rebuild the chunk, so 150% storage tolerates 3 losses, and in my model it is about 8x less likely to lose data than 3 copies at half the cost. The price is repair: one lost shard reads 6.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Placement and writes:</strong> <span style="color:#f0e2c8;">3 shards per AZ, so a zone loss is survivable (a 14-wide RS(10,4) over 3 zones is not). PUT writes and acknowledges the shards first, then commits the <strong style="color:#ffca28;">metadata row as the commit point</strong>, which gives strong read-after-write, atomic overwrites and conditional writes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scale:</strong> <span style="color:#f0e2c8;">LIST is a range scan, so hot prefixes need load-based partition splits; small objects get packed into chunks; at 10x the first problems are metadata hot spots and repair bandwidth.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not store metadata on the storage nodes next to the data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Listing and consistency need an ordered, transactional index over all keys of a bucket; storage nodes are optimised for big immutable blobs. Keeping them separate lets each scale on its own axis.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a GET while a shard is missing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Read any k healthy shards, including parity, and decode on the fly (a degraded read), while flagging the chunk for repair. The client sees higher latency, not an error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add cross-region replication?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Asynchronously: after the commit, a replication log ships new versions to another region, which writes them through its own front ends. It protects against a region loss with a lag (RPO of seconds to minutes), not synchronously on every PUT.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you garbage-collect safely?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Shards are immutable and referenced only from metadata. A collector marks shards with no reference and deletes them after a grace period longer than any in-flight write, so a write that crashed before its commit is cleaned up but a slow one is not.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does eleven nines actually mean?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a design target for annual object durability, about losing one object in 10 million every 10,000 years on average; you reach it with erasure coding, fast repair, scrubbing and independent failure domains, and you validate it with a failure model, not a test.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Object storage | Immutable blobs by bucket and key, over HTTP |
| Erasure coding RS(k,m) | k data plus m parity shards; any k rebuild the data |
| Durability vs availability | Not losing bytes vs being able to read them now |
| Failure domain | Components that fail together: disk, server, rack, zone |
| Commit point | The atomic metadata write that makes an object visible |

**Conclusion:** An S3-like store is two systems glued at one point: a strongly consistent, range-partitioned metadata service that knows every object version and where its shards live, and a fleet of storage nodes holding immutable erasure-coded shards spread across zones. The run showed why erasure coding wins: RS(6,3) rebuilt the data after losing any 3 of 9 shards, stored 150% instead of 300%, and had lower loss odds than 3 copies, while a wide RS(10,4) laid over only 3 zones could not survive a zone loss. Write the shards first and commit the metadata row last to get strong consistency, and budget for what breaks first at scale: metadata hot spots and repair bandwidth.`,
    examples: [
      {
        label: `Reed-Solomon RS(6,3) erasure coding: encode, lose shards, rebuild, then overhead, loss odds and AZ placement per scheme`,
        variants: [
          { tech: "node", code: `// Erasure coding for an object store: systematic Reed-Solomon (k=6, m=3) over the prime field GF(257),
// then overhead, loss probability and AZ placement for several schemes.
const P = 257;
const mod = (a) => ((a % P) + P) % P;
function inv(a) { let r = 1, b = mod(a), e = P - 2; while (e > 0) { if (e & 1) r = (r * b) % P; b = (b * b) % P; e >>= 1; } return r; }
// Evaluate at x the polynomial through points (xs[i], ys[i]) (Lagrange interpolation).
function interp(xs, ys, x) {
  let s = 0;
  for (let j = 0; j < xs.length; j++) {
    let num = 1, den = 1;
    for (let i = 0; i < xs.length; i++) if (i !== j) { num = mod(num * (x - xs[i])); den = mod(den * (xs[j] - xs[i])); }
    s = mod(s + ys[j] * num % P * inv(den));
  }
  return s;
}
const K = 6, M = 3, N = K + M;
// Shard i (1..9) holds the value at x=i for every stripe; shards 1..6 are the data itself.
function encode(bytes) {
  const L = Math.ceil(bytes.length / K), shards = [];
  for (let i = 0; i < N; i++) shards.push([]);
  for (let s = 0; s < L; s++) {
    const xs = [], ys = [];
    for (let i = 0; i < K; i++) { xs.push(i + 1); ys.push(s * K + i < bytes.length ? bytes[s * K + i] : 0); }
    for (let i = 0; i < N; i++) shards[i].push(i < K ? ys[i] : interp(xs, ys, i + 1));
  }
  return shards;
}
function decode(shards, alive, len) {
  if (alive.length < K) return null;
  const use = alive.slice(0, K), out = [];
  for (let s = 0; s < shards[use[0] - 1].length; s++) {
    const ys = use.map((x) => shards[x - 1][s]);
    for (let i = 0; i < K; i++) out.push(interp(use, ys, i + 1));
  }
  return out.slice(0, len);
}
const text = "object stores keep bytes safe by math";
const bytes = [...text].map((c) => c.charCodeAt(0));
const shards = encode(bytes);
console.log(\`== 1. RS(6,3): \${bytes.length} bytes -> 9 shards of \${shards[0].length} symbols ==\`);
for (let i = 0; i < N; i++) console.log(\`shard \${i + 1} \${i < K ? "data  " : "parity"} [\${shards[i].join(", ")}]\`);
for (const lost of [[2, 5, 8], [1, 2, 3], [1, 4, 7, 9]]) {
  const alive = [];
  for (let i = 1; i <= N; i++) if (!lost.includes(i)) alive.push(i);
  const got = decode(shards, alive, bytes.length);
  const msg = got ? \`rebuilt from [\${alive.slice(0, K).join(",")}] -> "\${String.fromCharCode(...got)}"\` : \`cannot rebuild: \${alive.length} shards left, need \${K}\`;
  console.log(\`lose [\${lost.join(",")}]: \${msg}\`);
}

// 2. Compare schemes. Assumption: each shard is lost before repair finishes with probability p = 0.001, independently.
function sci(x) {
  let e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
  if (Number(m.toFixed(2)) >= 10) { m /= 10; e += 1; }
  return \`\${m.toFixed(2)}e\${e}\`;
}
function choose(n, r) { let c = 1; for (let i = 1; i <= r; i++) c = (c * (n - r + i)) / i; return c; }
function lossProb(n, k, p) { let s = 0; for (let i = n - k + 1; i <= n; i++) s += choose(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i); return s; }
console.log("== 2. Overhead and loss probability (p = 0.001 per shard per repair window) ==");
const schemes = [["3x replication", 3, 1], ["RS(4,2)", 6, 4], ["RS(6,3)", 9, 6], ["RS(10,4)", 14, 10]];
for (const [name, n, k] of schemes) {
  const raw = (100 * n / k).toFixed(0);
  console.log(\`\${name.padEnd(14)} stores \${String(raw).padStart(3)}% of the data, survives \${n - k} lost, P(loss) \${sci(lossProb(n, k, 0.001))}, repair cost \${k}x\`);
}

// 3. Spread n shards round-robin over 3 availability zones: does the object survive losing the fullest AZ?
console.log("== 3. Placement over 3 AZs, lose one whole AZ ==");
for (const [name, n, k] of schemes) {
  const per = [0, 0, 0];
  for (let i = 0; i < n; i++) per[i % 3]++;
  const worst = Math.max(...per);
  console.log(\`\${name.padEnd(14)} AZs hold \${per.join("/")} -> lose \${worst}, \${worst <= n - k ? "still readable" : "DATA UNAVAILABLE"}\`);
}` },
          { tech: "python", code: `# Erasure coding for an object store: systematic Reed-Solomon (k=6, m=3) over the prime field GF(257),
# then overhead, loss probability and AZ placement for several schemes.
import math

P = 257


def inv(a):
    return pow(a % P, P - 2, P)


def interp(xs, ys, x):
    """Evaluate at x the polynomial through points (xs[i], ys[i]) (Lagrange interpolation)."""
    s = 0
    for j in range(len(xs)):
        num, den = 1, 1
        for i in range(len(xs)):
            if i != j:
                num = num * (x - xs[i]) % P
                den = den * (xs[j] - xs[i]) % P
        s = (s + ys[j] * num % P * inv(den)) % P
    return s


K, M = 6, 3
N = K + M


# Shard i (1..9) holds the value at x=i for every stripe; shards 1..6 are the data itself.
def encode(data):
    length = -(-len(data) // K)
    shards = [[] for _ in range(N)]
    for s in range(length):
        xs = [i + 1 for i in range(K)]
        ys = [data[s * K + i] if s * K + i < len(data) else 0 for i in range(K)]
        for i in range(N):
            shards[i].append(ys[i] if i < K else interp(xs, ys, i + 1))
    return shards


def decode(shards, alive, length):
    if len(alive) < K:
        return None
    use, out = alive[:K], []
    for s in range(len(shards[use[0] - 1])):
        ys = [shards[x - 1][s] for x in use]
        for i in range(K):
            out.append(interp(use, ys, i + 1))
    return out[:length]


text = "object stores keep bytes safe by math"
data = [ord(c) for c in text]
shards = encode(data)
print(f"== 1. RS(6,3): {len(data)} bytes -> 9 shards of {len(shards[0])} symbols ==")
for i in range(N):
    print(f"shard {i + 1} {'data  ' if i < K else 'parity'} [{', '.join(map(str, shards[i]))}]")
for lost in [[2, 5, 8], [1, 2, 3], [1, 4, 7, 9]]:
    alive = [i for i in range(1, N + 1) if i not in lost]
    got = decode(shards, alive, len(data))
    if got:
        msg = f"rebuilt from [{','.join(map(str, alive[:K]))}] -> \\"{''.join(map(chr, got))}\\""
    else:
        msg = f"cannot rebuild: {len(alive)} shards left, need {K}"
    print(f"lose [{','.join(map(str, lost))}]: {msg}")


# 2. Compare schemes. Assumption: each shard is lost before repair finishes with probability p = 0.001, independently.
def sci(x):
    e = math.floor(math.log10(x))
    m = x / math.pow(10, e)
    if float(f"{m:.2f}") >= 10:
        m /= 10
        e += 1
    return f"{m:.2f}e{e}"


def choose(n, r):
    c = 1
    for i in range(1, r + 1):
        c = (c * (n - r + i)) / i
    return c


def loss_prob(n, k, p):
    s = 0.0
    for i in range(n - k + 1, n + 1):
        s += choose(n, i) * math.pow(p, i) * math.pow(1 - p, n - i)
    return s


print("== 2. Overhead and loss probability (p = 0.001 per shard per repair window) ==")
schemes = [("3x replication", 3, 1), ("RS(4,2)", 6, 4), ("RS(6,3)", 9, 6), ("RS(10,4)", 14, 10)]
for name, n, k in schemes:
    raw = 100 * n // k
    print(f"{name:<14} stores {raw:>3}% of the data, survives {n - k} lost, P(loss) {sci(loss_prob(n, k, 0.001))}, repair cost {k}x")

# 3. Spread n shards round-robin over 3 availability zones: does the object survive losing the fullest AZ?
print("== 3. Placement over 3 AZs, lose one whole AZ ==")
for name, n, k in schemes:
    per = [0, 0, 0]
    for i in range(n):
        per[i % 3] += 1
    worst = max(per)
    print(f"{name:<14} AZs hold {'/'.join(map(str, per))} -> lose {worst}, {'still readable' if worst <= n - k else 'DATA UNAVAILABLE'}")` },
          { tech: "go", code: `// Erasure coding for an object store: systematic Reed-Solomon (k=6, m=3) over the prime field GF(257),
// then overhead, loss probability and AZ placement for several schemes.
package main

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

const P = 257
const K, M = 6, 3
const N = K + M

func mod(a int) int { return ((a % P) + P) % P }

func inv(a int) int {
	r, b, e := 1, mod(a), P-2
	for e > 0 {
		if e&1 == 1 {
			r = r * b % P
		}
		b = b * b % P
		e >>= 1
	}
	return r
}

// Evaluate at x the polynomial through points (xs[i], ys[i]) (Lagrange interpolation).
func interp(xs, ys []int, x int) int {
	s := 0
	for j := range xs {
		num, den := 1, 1
		for i := range xs {
			if i != j {
				num = mod(num * (x - xs[i]))
				den = mod(den * (xs[j] - xs[i]))
			}
		}
		s = mod(s + ys[j]*num%P*inv(den))
	}
	return s
}

// Shard i (1..9) holds the value at x=i for every stripe; shards 1..6 are the data itself.
func encode(data []int) [][]int {
	length := (len(data) + K - 1) / K
	shards := make([][]int, N)
	for s := 0; s < length; s++ {
		xs, ys := []int{}, []int{}
		for i := 0; i < K; i++ {
			xs = append(xs, i+1)
			if s*K+i < len(data) {
				ys = append(ys, data[s*K+i])
			} else {
				ys = append(ys, 0)
			}
		}
		for i := 0; i < N; i++ {
			if i < K {
				shards[i] = append(shards[i], ys[i])
			} else {
				shards[i] = append(shards[i], interp(xs, ys, i+1))
			}
		}
	}
	return shards
}

func decode(shards [][]int, alive []int, length int) []int {
	if len(alive) < K {
		return nil
	}
	use, out := alive[:K], []int{}
	for s := range shards[use[0]-1] {
		ys := []int{}
		for _, x := range use {
			ys = append(ys, shards[x-1][s])
		}
		for i := 0; i < K; i++ {
			out = append(out, interp(use, ys, i+1))
		}
	}
	return out[:length]
}

func join(a []int, sep string) string {
	p := make([]string, len(a))
	for i, v := range a {
		p[i] = strconv.Itoa(v)
	}
	return strings.Join(p, sep)
}

func sci(x float64) string {
	e := math.Floor(math.Log10(x))
	m := x / math.Pow(10, e)
	if v, _ := strconv.ParseFloat(fmt.Sprintf("%.2f", m), 64); v >= 10 {
		m /= 10
		e += 1
	}
	return fmt.Sprintf("%.2fe%d", m, int(e))
}

func choose(n, r int) float64 {
	c := 1.0
	for i := 1; i <= r; i++ {
		c = (c * float64(n-r+i)) / float64(i)
	}
	return c
}

func lossProb(n, k int, p float64) float64 {
	s := 0.0
	for i := n - k + 1; i <= n; i++ {
		s += choose(n, i) * math.Pow(p, float64(i)) * math.Pow(1-p, float64(n-i))
	}
	return s
}

type scheme struct {
	name string
	n, k int
}

func main() {
	text := "object stores keep bytes safe by math"
	data := []int{}
	for _, c := range text {
		data = append(data, int(c))
	}
	shards := encode(data)
	fmt.Printf("== 1. RS(6,3): %d bytes -> 9 shards of %d symbols ==\\n", len(data), len(shards[0]))
	for i := 0; i < N; i++ {
		kind := "parity"
		if i < K {
			kind = "data  "
		}
		fmt.Printf("shard %d %s [%s]\\n", i+1, kind, join(shards[i], ", "))
	}
	for _, lost := range [][]int{{2, 5, 8}, {1, 2, 3}, {1, 4, 7, 9}} {
		alive := []int{}
		for i := 1; i <= N; i++ {
			isLost := false
			for _, l := range lost {
				if l == i {
					isLost = true
				}
			}
			if !isLost {
				alive = append(alive, i)
			}
		}
		got := decode(shards, alive, len(data))
		var msg string
		if got != nil {
			b := make([]byte, len(got))
			for i, v := range got {
				b[i] = byte(v)
			}
			msg = fmt.Sprintf("rebuilt from [%s] -> \\"%s\\"", join(alive[:K], ","), string(b))
		} else {
			msg = fmt.Sprintf("cannot rebuild: %d shards left, need %d", len(alive), K)
		}
		fmt.Printf("lose [%s]: %s\\n", join(lost, ","), msg)
	}

	fmt.Println("== 2. Overhead and loss probability (p = 0.001 per shard per repair window) ==")
	schemes := []scheme{{"3x replication", 3, 1}, {"RS(4,2)", 6, 4}, {"RS(6,3)", 9, 6}, {"RS(10,4)", 14, 10}}
	for _, s := range schemes {
		fmt.Printf("%-14s stores %3d%% of the data, survives %d lost, P(loss) %s, repair cost %dx\\n", s.name, 100*s.n/s.k, s.n-s.k, sci(lossProb(s.n, s.k, 0.001)), s.k)
	}

	fmt.Println("== 3. Placement over 3 AZs, lose one whole AZ ==")
	for _, s := range schemes {
		per := []int{0, 0, 0}
		for i := 0; i < s.n; i++ {
			per[i%3]++
		}
		worst := 0
		for _, v := range per {
			if v > worst {
				worst = v
			}
		}
		verdict := "DATA UNAVAILABLE"
		if worst <= s.n-s.k {
			verdict = "still readable"
		}
		fmt.Printf("%-14s AZs hold %s -> lose %d, %s\\n", s.name, join(per, "/"), worst, verdict)
	}
}` },
          { tech: "java", code: `// Erasure coding for an object store: systematic Reed-Solomon (k=6, m=3) over the prime field GF(257),
// then overhead, loss probability and AZ placement for several schemes.
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

public class Main {
    static final int P = 257, K = 6, M = 3, N = K + M;

    static int mod(int a) { return ((a % P) + P) % P; }

    static int inv(int a) {
        int r = 1, b = mod(a), e = P - 2;
        while (e > 0) { if ((e & 1) == 1) r = r * b % P; b = b * b % P; e >>= 1; }
        return r;
    }

    // Evaluate at x the polynomial through points (xs[i], ys[i]) (Lagrange interpolation).
    static int interp(int[] xs, int[] ys, int x) {
        int s = 0;
        for (int j = 0; j < xs.length; j++) {
            int num = 1, den = 1;
            for (int i = 0; i < xs.length; i++) if (i != j) { num = mod(num * (x - xs[i])); den = mod(den * (xs[j] - xs[i])); }
            s = mod(s + ys[j] * num % P * inv(den));
        }
        return s;
    }

    // Shard i (1..9) holds the value at x=i for every stripe; shards 1..6 are the data itself.
    static int[][] encode(int[] data) {
        int len = (data.length + K - 1) / K;
        int[][] shards = new int[N][len];
        for (int s = 0; s < len; s++) {
            int[] xs = new int[K], ys = new int[K];
            for (int i = 0; i < K; i++) { xs[i] = i + 1; ys[i] = s * K + i < data.length ? data[s * K + i] : 0; }
            for (int i = 0; i < N; i++) shards[i][s] = i < K ? ys[i] : interp(xs, ys, i + 1);
        }
        return shards;
    }

    static int[] decode(int[][] shards, int[] alive, int length) {
        if (alive.length < K) return null;
        int[] use = Arrays.copyOf(alive, K);
        int len = shards[use[0] - 1].length;
        int[] out = new int[len * K];
        for (int s = 0; s < len; s++) {
            int[] ys = new int[K];
            for (int i = 0; i < K; i++) ys[i] = shards[use[i] - 1][s];
            for (int i = 0; i < K; i++) out[s * K + i] = interp(use, ys, i + 1);
        }
        return Arrays.copyOf(out, length);
    }

    static String join(int[] a, String sep) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < a.length; i++) { if (i > 0) b.append(sep); b.append(a[i]); }
        return b.toString();
    }

    static String fix2(double v) { return new BigDecimal(v).setScale(2, RoundingMode.HALF_EVEN).toPlainString(); }

    static String sci(double x) {
        double e = Math.floor(Math.log10(x));
        double m = x / Math.pow(10, e);
        if (Double.parseDouble(fix2(m)) >= 10) { m /= 10; e += 1; }
        return fix2(m) + "e" + (int) e;
    }

    static double choose(int n, int r) {
        double c = 1;
        for (int i = 1; i <= r; i++) c = (c * (n - r + i)) / i;
        return c;
    }

    static double lossProb(int n, int k, double p) {
        double s = 0;
        for (int i = n - k + 1; i <= n; i++) s += choose(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i);
        return s;
    }

    public static void main(String[] args) {
        String text = "object stores keep bytes safe by math";
        int[] data = new int[text.length()];
        for (int i = 0; i < data.length; i++) data[i] = text.charAt(i);
        int[][] shards = encode(data);
        System.out.printf("== 1. RS(6,3): %d bytes -> 9 shards of %d symbols ==%n", data.length, shards[0].length);
        for (int i = 0; i < N; i++) System.out.printf("shard %d %s [%s]%n", i + 1, i < K ? "data  " : "parity", join(shards[i], ", "));
        int[][] losses = {{2, 5, 8}, {1, 2, 3}, {1, 4, 7, 9}};
        for (int[] lost : losses) {
            List<Integer> al = new ArrayList<>();
            for (int i = 1; i <= N; i++) { final int x = i; if (Arrays.stream(lost).noneMatch(l -> l == x)) al.add(i); }
            int[] alive = al.stream().mapToInt(Integer::intValue).toArray();
            int[] got = decode(shards, alive, data.length);
            String msg;
            if (got != null) {
                StringBuilder b = new StringBuilder();
                for (int v : got) b.append((char) v);
                msg = "rebuilt from [" + join(Arrays.copyOf(alive, K), ",") + "] -> \\"" + b + "\\"";
            } else msg = "cannot rebuild: " + alive.length + " shards left, need " + K;
            System.out.println("lose [" + join(lost, ",") + "]: " + msg);
        }

        System.out.println("== 2. Overhead and loss probability (p = 0.001 per shard per repair window) ==");
        String[] names = {"3x replication", "RS(4,2)", "RS(6,3)", "RS(10,4)"};
        int[][] nk = {{3, 1}, {6, 4}, {9, 6}, {14, 10}};
        for (int s = 0; s < names.length; s++) {
            int n = nk[s][0], k = nk[s][1];
            System.out.printf("%-14s stores %3d%% of the data, survives %d lost, P(loss) %s, repair cost %dx%n", names[s], 100 * n / k, n - k, sci(lossProb(n, k, 0.001)), k);
        }

        System.out.println("== 3. Placement over 3 AZs, lose one whole AZ ==");
        for (int s = 0; s < names.length; s++) {
            int n = nk[s][0], k = nk[s][1];
            int[] per = new int[3];
            for (int i = 0; i < n; i++) per[i % 3]++;
            int worst = Math.max(per[0], Math.max(per[1], per[2]));
            System.out.printf("%-14s AZs hold %s -> lose %d, %s%n", names[s], join(per, "/"), worst, worst <= n - k ? "still readable" : "DATA UNAVAILABLE");
        }
    }
}` },
        ],
      },
    ],
  },
  {
    title: `How would you design a file storage service like Dropbox?`,
    difficulty: "hard",
    seoDescription: `Design Dropbox: block-level sync with SHA-256 chunks, dedup and delta upload, a metadata journal with cursors, notifications, conflicts and capacity math.`,
    description: `**Question presented to candidate:**
"Design a file sync service like Dropbox. A user installs a client on a laptop and a phone; any file they put in the synced folder should appear on every other device within seconds, edits should upload quickly even for big files, and nothing should be lost if two devices edit the same file while offline. How would you build the client, the servers and the storage?"

**What a strong answer should cover:**
- **Block-level sync**: split files into blocks (Dropbox uses blocks of up to 4 MB identified by SHA-256), upload only blocks the server lacks; this gives **delta sync** and **deduplication**, and a file becomes an ordered list of block hashes
- Separate the **block store** (content-addressed, immutable, object storage) from the **metadata service** (namespaces, paths, revisions, block lists) and a **notification service** that tells idle clients to fetch changes
- A per-namespace **journal** with monotonically increasing sequence numbers; each client keeps a **cursor** and pulls everything after it, which makes sync resumable and ordered
- Commit protocol: the client commits "path now has these blocks, based on revision X"; the server answers with missing blocks or a **conflict** when the base revision is stale, and the client then saves a **conflicted copy**
- Chunking trade-off: fixed-size blocks re-upload everything after an insert near the start; **content-defined chunking** keeps boundaries stable
- Numbers: users, storage, commits per second, long-poll connections, block index size, and what breaks at 10x

**Clarifying questions expected:**
- How many users and devices, average storage per user, typical file sizes?
- Is real-time collaboration on the same document in scope, or only file sync?
- Do we need sharing, version history, and LAN sync?

**Code / implementation expected:** Optional — the design and the sync protocol come first; the examples compare chunking strategies and simulate the journal, cursors and a conflict.`,
    answer: `**Target Audience:** Developers preparing for system design interviews. You know what a hash, a database and object storage are; nothing about sync engines is assumed.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 for the chunking example; Node 22.22 and Python 3.12 for the journal example (identical output in every language). Dropbox facts are from Dropbox engineering posts, cited inline.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Capacity numbers are worked from stated assumptions. All sync behaviour comes from running the examples; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

Two friends keep identical photo albums in different cities. Every time one adds or changes a photo, they post a note to the other: "page 12 now has the beach photo; page 30 is gone". Sending the whole album each time would be silly. They do not even need to post a photo the other already has — "the beach photo from last summer" is enough. And when both rearrange page 12 on the same day without talking, neither version is thrown away: one goes in as "page 12 (Anna's version)".

A sync service is that system at scale: describe files as lists of pieces, send only the pieces the other side lacks, keep a numbered list of changes so every device can catch up from where it left off, and never silently discard a concurrent edit.

📌 **Interview term: file sync service** — a system that keeps a folder identical across a user's devices (and shared users) by uploading local changes and applying remote ones, with the server as the source of truth.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Users, devices per user, storage per user? | Sizes the block store, metadata and the number of open connections |
| File size distribution? | Block size choice; small-file overhead dominates metadata |
| Is live co-editing in scope? | That is a different system ([collaborative editor](/interview-question/how-would-you-design-a-collaborative-editor-like-google-docs)); file sync handles whole-file conflicts |
| Sharing, version history, deleted-file recovery? | Adds namespaces, retention and tombstones |
| How fast must a change appear elsewhere? | Seconds means push notifications, not polling |
| Mobile clients on metered networks? | Upload throttling, sync on Wi-Fi only, thumbnails instead of full files |

## 3. Requirements

**Functional**
- Add, edit, rename, move and delete files and folders on any device; changes appear on all devices.
- Large files sync incrementally; unchanged data is never re-uploaded.
- Offline edits sync later; concurrent edits never lose data.
- Version history and restore of deleted files for a retention period; shared folders.

**Non-functional**
- Durability: no lost user data (the block store is an [S3-like object store](/interview-question/how-would-you-design-s3-like-object-storage-572x)).
- Change propagation within a few seconds for online devices.
- Efficient on bandwidth and battery: send the minimum, avoid constant polling.

## 4. Capacity Estimate

| Input | Value (assumption) |
| :--- | :--- |
| Registered users | 500 million |
| Daily active users | 100 million |
| Stored per user | 5 GB on average |
| File changes committed per DAU per day | 10 |
| New bytes uploaded per change (after block dedup) | 1 MB |
| Online devices per DAU holding a notification connection | 1.5 |
| Files per user | 2,000; metadata row about 300 bytes |
| Block size | 4 MB |

Arithmetic:
- Logical storage: 500 M x 5 GB = **2.5 EB**. If dedup saves 25% (an assumption), **1.875 EB** of unique blocks; at a 1.5x erasure-coding overhead, about **2.8 EB raw**.
- Commits: 100 M x 10 = **1 billion per day**, **11,574/s** average, about **34,700/s** at a 3x peak.
- Upload bandwidth: 1 billion x 1 MB = **1 PB/day**, **11.6 GB/s** average.
- Notification connections: 100 M x 1.5 = **150 million** concurrent long-polls; at 100,000 per server, **1,500 servers**.
- Metadata: 500 M x 2,000 = **1 trillion file rows**, about **0.3 PB** at 300 bytes each.
- Block index: 1.875 EB / 4 MB = **469 billion blocks**; at 100 bytes per index entry, **47 TB**.

The metadata and the block index, not the bytes, are the hard database problems.

## 5. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 760 340" role="img" aria-label="Desktop and mobile clients with a local sync engine talk to three services: a block service in front of object storage, a metadata service with the journal in a sharded database, and a notification service holding long poll connections">
  <defs>
    <marker id="sd16q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="120" width="170" height="90" rx="10"/>
  <text class="d-text" x="105" y="150" text-anchor="middle">client</text>
  <text class="d-sub" x="105" y="172" text-anchor="middle">watcher, chunker</text>
  <text class="d-sub" x="105" y="192" text-anchor="middle">local DB, cursor</text>
  <rect class="d-box" x="300" y="20" width="180" height="60" rx="10"/>
  <text class="d-text" x="390" y="55" text-anchor="middle">block service</text>
  <rect class="d-box" x="300" y="135" width="180" height="60" rx="10"/>
  <text class="d-text" x="390" y="170" text-anchor="middle">metadata service</text>
  <rect class="d-box" x="300" y="250" width="180" height="60" rx="10"/>
  <text class="d-text" x="390" y="285" text-anchor="middle">notification service</text>
  <rect class="d-box-muted" x="570" y="20" width="170" height="60" rx="10"/>
  <text class="d-text" x="655" y="48" text-anchor="middle">object store</text>
  <text class="d-sub" x="655" y="68" text-anchor="middle">blocks by hash</text>
  <rect class="d-box-muted" x="570" y="135" width="170" height="60" rx="10"/>
  <text class="d-text" x="655" y="163" text-anchor="middle">sharded DB</text>
  <text class="d-sub" x="655" y="183" text-anchor="middle">files, journal</text>
  <path class="d-edge-accent" d="M 190 140 L 294 60" marker-end="url(#sd16q4-arrow)"/>
  <path class="d-edge" d="M 190 165 L 294 165" marker-end="url(#sd16q4-arrow)"/>
  <path class="d-edge-dashed" d="M 294 280 L 190 195" marker-end="url(#sd16q4-arrow)"/>
  <path class="d-edge" d="M 480 50 L 564 50" marker-end="url(#sd16q4-arrow)"/>
  <path class="d-edge" d="M 480 165 L 564 165" marker-end="url(#sd16q4-arrow)"/>
  <path class="d-edge-dashed" d="M 390 195 L 390 244" marker-end="url(#sd16q4-arrow)"/>
</svg>

Bytes flow only through the block service; the metadata service owns the truth about which file has which blocks; the notification service only says "something changed, come and look".

- **Client sync engine**: watches the folder, chunks and hashes changed files, keeps a local database of what it believes the server has (path, revision, block list) and its **cursor**.
- **Block service**: \`PUT /block/{sha256}\` and \`GET /block/{sha256}\`; checks that the content matches the hash, stores blocks in object storage. Dropbox's own block store, Magic Pocket, stores blocks of up to 4 MB keyed by their SHA-256 and indexes them in a sharded MySQL "Block Index" (Dropbox "Inside the Magic Pocket" and a 2024 SNIA talk on scaling it).
- **Metadata service**: namespaces (a user's root or a shared folder), file entries, revisions, the journal; sharded by namespace ID.
- **Notification service**: holds long-poll (or WebSocket) connections; when a namespace's journal grows, it wakes the clients subscribed to it. See [WebSockets vs polling vs SSE](/interview-question/when-would-you-use-websockets-vs-polling-vs-sse).

📌 **Interview term: content-addressed storage** — blocks are stored and fetched by the hash of their content, so identical content has one key; this makes dedup automatic and blocks immutable.

## 6. Deep Dive 1: Blocks, Dedup and Delta Sync

A file is an ordered list of block hashes. Uploading means: chunk, hash, ask the server which hashes it lacks, upload only those. The first example syncs a 200,000-byte file (16 KB blocks stand for 4 MB blocks), the same file again, a version with 100 bytes overwritten in the middle, and a version with 10 bytes inserted near the start:

~~~text
== fixed 16 KB ==
v1 upload:        13 blocks, 13 new, 200000 bytes sent (block sizes 3392..16384)
same file again:  13 blocks,  0 new,      0 bytes sent (dedup)
overwrite 100 B:  13 blocks,  1 new,  16384 bytes sent
insert 10 B:      13 blocks, 13 new, 200010 bytes sent
block store after 3 versions: 27 blocks, 416394 bytes (3 full copies would be 600010)
~~~

- **Dedup**: uploading the same content again sent **0 bytes**; another user uploading the same file would also send nothing.
- **Delta sync for overwrites**: changing 100 bytes re-sent one 16,384-byte block, not 200,000 bytes.
- **The insert problem**: inserting 10 bytes near the start shifted every later block boundary, so **all 13 blocks changed** and 200,010 bytes went up again.

📌 **Interview term: delta sync** — uploading only the blocks of a file that changed since the version the server has, found by comparing block hashes.

📌 **Interview term: deduplication** — storing identical blocks once, across versions, files and (optionally) users. Cross-user dedup has a privacy cost: a client that sends zero bytes learns the server already had that content, which reveals whether someone else stored it; many services restrict dedup to one user or encrypt per user.

## 7. Deep Dive 2: Fixed vs Content-Defined Chunking

**Content-defined chunking (CDC)** cuts a block where a rolling hash of the last bytes hits a pattern (here: the low 14 bits are zero), with a minimum and maximum block size. Boundaries then depend on the content around them, not on byte offsets, so an insert only disturbs the block it lands in:

~~~js
h = ((h << 1) + GEAR[b[i]]) >>> 0;              // gear rolling hash
if ((len >= MIN && (h & MASK) === 0) || len >= MAX) cut();
~~~

~~~text
== content-defined ==
v1 upload:        13 blocks, 13 new, 200000 bytes sent (block sizes 4675..32768)
same file again:  13 blocks,  0 new,      0 bytes sent (dedup)
overwrite 100 B:  13 blocks,  1 new,  24061 bytes sent
insert 10 B:      13 blocks,  1 new,  12571 bytes sent
block store after 3 versions: 15 blocks, 236632 bytes (3 full copies would be 600010)
~~~

| Change | Fixed 16 KB blocks | Content-defined blocks |
| :--- | :--- | :--- |
| Same file again | 0 bytes | 0 bytes |
| Overwrite 100 bytes mid-file | 16,384 bytes (1 block) | 24,061 bytes (1 block) |
| Insert 10 bytes near start | 200,010 bytes (13 blocks) | 12,571 bytes (1 block) |
| Store after 3 versions | 27 blocks, 416,394 bytes | 15 blocks, 236,632 bytes |

CDC wins massively on inserts and costs slightly more on in-place overwrites (its blocks vary in size, up to 32 KB here). Fixed blocks are simpler and line up with how many applications rewrite files. Dropbox's published block store uses fixed blocks of up to 4 MB; CDC is the standard technique in deduplicating backup systems. Either way, rewriting a file in place without changing its length (databases, VM images) works well with fixed blocks, while editing text or archives near the start favours CDC.

📌 **Interview term: content-defined chunking** — choosing block boundaries from a rolling hash of the data so that inserts and deletes only change nearby blocks; needs min and max block sizes to avoid tiny or huge blocks.

## 8. Deep Dive 3: The Journal, Cursors and Conflicts

Metadata changes go into a per-namespace **journal**: an append-only list with sequence numbers. A client keeps a **cursor** (the last sequence it applied) and asks "give me everything after N". The notification service only says "namespace changed"; the client then pulls. A commit names the **base revision** it was edited from; the server rejects a commit whose base is no longer current.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Journal of numbered entries 1 to 6; the laptop cursor and the phone cursor point at different positions; each device pulls the entries after its cursor">
  <defs>
    <marker id="sd16q4-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="100" height="56" rx="8"/>
  <text class="d-text" x="90" y="63" text-anchor="middle">1 notes</text>
  <rect class="d-box" x="155" y="30" width="100" height="56" rx="8"/>
  <text class="d-text" x="205" y="63" text-anchor="middle">2 old</text>
  <rect class="d-box" x="270" y="30" width="100" height="56" rx="8"/>
  <text class="d-text" x="320" y="63" text-anchor="middle">3 copy</text>
  <rect class="d-box-accent" x="385" y="30" width="100" height="56" rx="8"/>
  <text class="d-text" x="435" y="63" text-anchor="middle">4 notes</text>
  <rect class="d-box-accent" x="500" y="30" width="100" height="56" rx="8"/>
  <text class="d-text" x="550" y="63" text-anchor="middle">5 conflict</text>
  <rect class="d-box-accent" x="615" y="30" width="100" height="56" rx="8"/>
  <text class="d-text" x="665" y="63" text-anchor="middle">6 delete</text>
  <rect class="d-box-muted" x="270" y="150" width="140" height="50" rx="8"/>
  <text class="d-text" x="340" y="180" text-anchor="middle">phone cursor 3</text>
  <path class="d-edge-dashed" d="M 340 150 L 340 92" marker-end="url(#sd16q4-arrow2)"/>
  <path class="d-edge-accent" d="M 410 175 L 660 175 L 660 92" marker-end="url(#sd16q4-arrow2)"/>
  <text class="d-sub" x="535" y="165" text-anchor="middle">pull 4, 5, 6</text>
</svg>

The phone has applied entries up to 3, so its next pull returns exactly 4, 5 and 6, in order, however long it was offline.

The second example runs that protocol with a laptop and a phone:

~~~text
== 1. Laptop adds three files; the server asks only for blocks it lacks ==
  Laptop: server needs [h1,h2], uploading
  Laptop: /notes.txt -> r1 at seq 1
  Laptop: server needs [h3], uploading
  Laptop: /old.txt -> r2 at seq 2
  Laptop: /copy.txt -> r3 at seq 3
Phone pulls from cursor 0: 1:/notes.txt, 2:/old.txt, 3:/copy.txt -> cursor 3
== 2. Both edit /notes.txt offline from r1 ==
  Laptop: server needs [h4], uploading
  Laptop: /notes.txt -> r4 at seq 4
  Phone: server needs [h5], uploading
  Phone: /notes.txt conflict (based on r1, server has r4) -> saved as /notes (Phone conflicted copy).txt
  Phone: /notes (Phone conflicted copy).txt -> r5 at seq 5
== 3. Laptop deletes /old.txt ==
  Laptop: delete /old.txt -> tombstone at seq 6
== 4. Everyone catches up ==
Laptop pulls from cursor 0: 1:/notes.txt, 2:/old.txt, 3:/copy.txt, 4:/notes.txt, 5:/notes (Phone conflicted copy).txt, 6:/old.txt (deleted)
Phone pulls from cursor 3: 4:/notes.txt, 5:/notes (Phone conflicted copy).txt, 6:/old.txt (deleted)
Laptop: /copy.txt@r3[h1,h2]  /notes (Phone conflicted copy).txt@r5[h5,h2]  /notes.txt@r4[h1,h4]
Phone:  /copy.txt@r3[h1,h2]  /notes (Phone conflicted copy).txt@r5[h5,h2]  /notes.txt@r4[h1,h4]
converged: true, journal length 6, blocks stored 5
~~~

What happened:
- The server asked for **only the blocks it lacked** (\`h1,h2\`, then \`h3\`); \`/copy.txt\` reused existing blocks and uploaded nothing.
- Both devices edited \`/notes.txt\` from revision \`r1\` while offline. The laptop committed first (\`r4\`). The phone's commit said "based on r1" while the server had \`r4\`, so the server returned a **conflict**; the phone saved its version as **\`/notes (Phone conflicted copy).txt\`**. Nothing was lost, and a human decides how to merge.
- The delete became a **tombstone** journal entry (seq 6), so devices that were offline also delete the file instead of re-uploading it.
- After pulling from their cursors, both devices hold identical state (\`converged: true\`).

📌 **Interview term: journal and cursor** — the journal is an append-only, sequence-numbered log of metadata changes per namespace; a cursor is a client's position in it. Pulling "everything after my cursor" makes sync incremental, ordered and resumable after any outage.

📌 **Interview term: conflicted copy** — the resolution for concurrent edits to a whole file: keep the first commit, save the other as a separate, clearly named file. It is an [optimistic concurrency](/interview-question/what-is-the-difference-between-optimistic-and-pessimistic-locking) check on the base revision.

📌 **Interview term: tombstone** — a record that something was deleted, kept so that delayed or offline replicas learn about the delete instead of resurrecting the item.

## 9. Upload Flow End to End

1. Watcher sees \`/video.mov\` changed; the client chunks it and hashes every block.
2. \`commit(path, block_hashes, base_rev)\` to the metadata service.
3. Response \`need_blocks: [...]\` — the client uploads exactly those to the block service (in parallel, resumable per block).
4. Retry the commit; the metadata service verifies all blocks exist, appends the journal entry, and bumps the namespace sequence.
5. The notification service wakes the user's other devices; they pull from their cursors, see the new block list, and download only blocks they do not have locally.

Committing after the blocks exist means a file entry never points at missing data; blocks uploaded for a commit that never happens are garbage-collected later.

## 10. What Breaks First at 10x

At 10x (25 EB of logical data and about 347,000 commits/s at peak):
- **Metadata hot namespaces**: a huge shared team folder concentrates journal appends on one shard; split large namespaces or batch commits.
- **Block index**: 4.7 trillion blocks and about 470 TB of index; lookups for "which of these hashes do you have" need batching and a Bloom filter in front ([what a Bloom filter is](/interview-question/what-is-a-bloom-filter-and-when-is-it-useful)).
- **Notification fan-out**: 1.5 billion connections; push only "namespace changed" and let clients pull, coalescing bursts.
- **Small files**: millions of tiny files per user make per-file metadata, not bytes, the cost; pack small files' blocks and batch commits.

## 11. Verified: Running the Code

The example **"Fixed vs content-defined chunking: SHA-256 blocks, dedup, delta upload after an overwrite and an insert"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and Java 21. All four print exactly this:

~~~text
== fixed 16 KB ==
v1 upload:        13 blocks, 13 new, 200000 bytes sent (block sizes 3392..16384)
same file again:  13 blocks,  0 new,      0 bytes sent (dedup)
overwrite 100 B:  13 blocks,  1 new,  16384 bytes sent
insert 10 B:      13 blocks, 13 new, 200010 bytes sent
block store after 3 versions: 27 blocks, 416394 bytes (3 full copies would be 600010)
== content-defined ==
v1 upload:        13 blocks, 13 new, 200000 bytes sent (block sizes 4675..32768)
same file again:  13 blocks,  0 new,      0 bytes sent (dedup)
overwrite 100 B:  13 blocks,  1 new,  24061 bytes sent
insert 10 B:      13 blocks,  1 new,  12571 bytes sent
block store after 3 versions: 15 blocks, 236632 bytes (3 full copies would be 600010)
~~~

The example **"Sync journal with cursors: missing-block handshake, offline edit conflict, conflicted copy, tombstone, convergence"** was run with Node 22.22 and Python 3.12; its full output is quoted in section 8.

What the simulations stand for and what they leave out: the "server" is an in-process map from block hash to size (the block store) and an array (the journal); the file is 200,000 pseudo-random bytes from a fixed-seed xorshift generator, with 16 KB blocks standing for 4 MB; block hashes are SHA-256 shortened to 12 hex digits for printing; the journal example uses symbolic block names (\`h1\`...) and has no network, authentication, sharing or long-poll timing.

## Edge Cases Worth Knowing

- **Renames and moves** are metadata-only: the block list does not change, so nothing is uploaded.
- **Case-insensitive file systems**: \`Notes.txt\` and \`notes.txt\` are one file on macOS and Windows, two on Linux; the server must detect the collision.
- **Partially written files**: wait until the file stops changing (or the app closes it) before chunking, or you sync half-written data.
- **Huge folders on first sync**: page through the journal and download in priority order (recent and small files first).
- **Selective sync and mobile**: devices may keep only metadata and fetch blocks on open.

## Common Pitfalls

- **Uploading whole files on every change** — the run sent 16,384 bytes for a 100-byte edit with blocks, 200,000 without.
- **Fixed blocks without thinking about inserts** — one 10-byte insert re-sent all 13 blocks; consider content-defined chunking for such workloads.
- **Polling the metadata service** — 150 million devices polling every few seconds is a self-inflicted DDoS; long-poll for "changed" and pull by cursor.
- **Last-writer-wins on concurrent edits** — silently loses the phone's edit; check the base revision and create a conflicted copy.
- **Deleting by absence** — an offline device that missed a delete re-uploads the file; record tombstones in the journal.
- **Committing metadata before blocks exist** — other devices then try to download blocks that are not there.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Shape:</strong> <span style="color:#f0e2c8;">A client sync engine plus three services: a <strong style="color:#ffca28;">block service</strong> over object storage holding content-addressed blocks, a <strong style="color:#ffca28;">metadata service</strong> with files, revisions and a per-namespace <strong style="color:#ffca28;">journal</strong>, and a <strong style="color:#ffca28;">notification service</strong> that wakes devices to pull.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Blocks:</strong> <span style="color:#f0e2c8;">Files are split into blocks (Dropbox uses up to 4 MB, keyed by SHA-256), so a file is a list of hashes. The server only asks for blocks it lacks: in my run a 100-byte edit re-sent one 16 KB block and a re-upload sent zero bytes. For insert-heavy files, <strong style="color:#ffca28;">content-defined chunking</strong> turned a full re-upload into one block.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Sync protocol:</strong> <span style="color:#f0e2c8;">Commit says "this path now has these blocks, based on revision X". The server answers need-blocks, ok with a journal sequence number, or <strong style="color:#ffca28;">conflict</strong>. Devices keep a <strong style="color:#ffca28;">cursor</strong> and pull everything after it, which is ordered and resumable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Conflicts and deletes:</strong> <span style="color:#f0e2c8;">A stale base revision means a concurrent edit, so the second device saves a <strong style="color:#ffca28;">conflicted copy</strong> instead of overwriting; deletes are <strong style="color:#ffca28;">tombstones</strong> in the journal so offline devices do not resurrect files.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Numbers:</strong> <span style="color:#f0e2c8;">500 million users at 5 GB is 2.5 EB logical; 1 billion commits a day is about 11,600 per second; 150 million long-poll connections need about 1,500 servers. At 10x, hot shared namespaces, the block index and notification fan-out break first.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use rsync-style rolling diffs against the previous version instead of blocks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rolling diffs need both versions at one end and per-file computation on the server; content-addressed blocks are immutable, cacheable, dedupe across files and users, and the server only has to answer "do you have this hash". Content-defined chunking gets most of the insert-tolerance of rolling diffs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make sure a device never sees a file whose blocks are missing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The metadata commit is only accepted after the server confirms every block exists, so a journal entry always points at stored blocks; uploaded blocks without a commit are garbage-collected after a grace period.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do shared folders work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A shared folder is its own namespace with its own journal; each member mounts it at some path in their tree, and their clients keep a cursor per namespace. Permissions are checked when committing to or reading from that namespace.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you support version history?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep old journal entries and their block lists for the retention period; restoring is a new commit pointing at the old block list. Blocks are reference-counted (or mark-and-sweep collected) so they live as long as any version needs them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make LAN sync work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Devices on the same network announce which block hashes they have; a device needing a block asks a peer first and falls back to the block service. Hash addressing makes the peer data verifiable.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| File sync service | Keeps a folder identical across devices through the server |
| Content-addressed storage | Blocks stored and fetched by the hash of their content |
| Delta sync | Upload only the blocks that changed |
| Deduplication | Store identical blocks once |
| Content-defined chunking | Block boundaries chosen by a rolling hash of the content |
| Journal and cursor | Append-only change log per namespace, and a device position in it |
| Conflicted copy | The losing concurrent edit saved as a separate file |
| Tombstone | A record of a delete so replicas apply it |

**Conclusion:** Dropbox-style sync is three ideas working together: files as lists of content-addressed blocks (so only missing blocks travel and identical blocks are stored once), a per-namespace journal with client cursors (so every device catches up in order from wherever it stopped), and commits that name their base revision (so concurrent edits become conflicted copies instead of silent losses). The runs made it concrete: a 100-byte edit cost one block, a re-upload cost nothing, content-defined chunking turned a 200,010-byte re-upload after a small insert into 12,571 bytes, and two devices with an offline conflict and a delete converged to identical state. Size the metadata and block index carefully — at 500 million users they, not the bytes, are what breaks first.`,
    examples: [
      {
        label: `Fixed vs content-defined chunking: SHA-256 blocks, dedup, delta upload after an overwrite and an insert`,
        variants: [
          { tech: "node", code: `// Block-level sync: fixed-size vs content-defined chunking, SHA-256 block hashes, dedup and delta upload.
const crypto = require("crypto");
let seed = 2463534242;
function rnd() { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed; }
const GEAR = []; for (let i = 0; i < 256; i++) GEAR.push(rnd());
const file = Buffer.alloc(200000); for (let i = 0; i < file.length; i++) file[i] = rnd() & 255;

const FIXED = 16384, MIN = 4096, MAX = 32768, MASK = 0x3fff;   // 16 KB blocks stand for 4 MB blocks
function fixedChunks(b) { const out = []; for (let i = 0; i < b.length; i += FIXED) out.push([i, Math.min(i + FIXED, b.length)]); return out; }
// Gear rolling hash: cut where the low 14 bits of the hash are zero, so boundaries depend on content, not offset.
function cdcChunks(b) {
  const out = []; let start = 0, h = 0;
  for (let i = 0; i < b.length; i++) {
    h = ((h << 1) + GEAR[b[i]]) >>> 0;
    const len = i - start + 1;
    if ((len >= MIN && (h & MASK) === 0) || len >= MAX) { out.push([start, i + 1]); start = i + 1; h = 0; }
  }
  if (start < b.length) out.push([start, b.length]);
  return out;
}
const hash = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 12);

// Server side: block store keyed by hash (dedup), and a file = ordered list of block hashes.
function makeServer() { return { blocks: new Map() }; }
function sync(server, b, chunker) {
  const list = chunker(b).map(([s, e]) => [hash(b.subarray(s, e)), e - s]);
  let newBlocks = 0, bytes = 0;
  for (const [h, len] of list) if (!server.blocks.has(h)) { server.blocks.set(h, len); newBlocks++; bytes += len; }
  return { list, newBlocks, bytes };
}

const edit = Buffer.from(file); for (let i = 0; i < 100; i++) edit[100000 + i] = 0x41;   // overwrite 100 bytes in the middle
const insert = Buffer.concat([file.subarray(0, 1000), Buffer.from("INSERTED!!"), file.subarray(1000)]);   // insert 10 bytes near the start

for (const [name, chunker] of [["fixed 16 KB", fixedChunks], ["content-defined", cdcChunks]]) {
  const server = makeServer();
  console.log(\`== \${name} ==\`);
  const v1 = sync(server, file, chunker);
  const sizes = v1.list.map(([, l]) => l);
  console.log(\`v1 upload:        \${String(v1.list.length).padStart(2)} blocks, \${String(v1.newBlocks).padStart(2)} new, \${String(v1.bytes).padStart(6)} bytes sent (block sizes \${Math.min(...sizes)}..\${Math.max(...sizes)})\`);
  const v1b = sync(server, file, chunker);
  console.log(\`same file again:  \${String(v1b.list.length).padStart(2)} blocks, \${String(v1b.newBlocks).padStart(2)} new, \${String(v1b.bytes).padStart(6)} bytes sent (dedup)\`);
  const v2 = sync(server, edit, chunker);
  console.log(\`overwrite 100 B:  \${String(v2.list.length).padStart(2)} blocks, \${String(v2.newBlocks).padStart(2)} new, \${String(v2.bytes).padStart(6)} bytes sent\`);
  const v3 = sync(server, insert, chunker);
  console.log(\`insert 10 B:      \${String(v3.list.length).padStart(2)} blocks, \${String(v3.newBlocks).padStart(2)} new, \${String(v3.bytes).padStart(6)} bytes sent\`);
  let stored = 0; for (const l of server.blocks.values()) stored += l;
  console.log(\`block store after 3 versions: \${server.blocks.size} blocks, \${stored} bytes (3 full copies would be \${file.length + edit.length + insert.length})\`);
}` },
          { tech: "python", code: `# Block-level sync: fixed-size vs content-defined chunking, SHA-256 block hashes, dedup and delta upload.
import hashlib

seed = 2463534242


def rnd():
    global seed
    seed ^= (seed << 13) & 0xFFFFFFFF
    seed ^= seed >> 17
    seed ^= (seed << 5) & 0xFFFFFFFF
    return seed


GEAR = [rnd() for _ in range(256)]
file = bytes(rnd() & 255 for _ in range(200000))

FIXED, MIN, MAX, MASK = 16384, 4096, 32768, 0x3FFF  # 16 KB blocks stand for 4 MB blocks


def fixed_chunks(b):
    return [(i, min(i + FIXED, len(b))) for i in range(0, len(b), FIXED)]


# Gear rolling hash: cut where the low 14 bits of the hash are zero, so boundaries depend on content, not offset.
def cdc_chunks(b):
    out, start, h = [], 0, 0
    for i in range(len(b)):
        h = ((h << 1) + GEAR[b[i]]) & 0xFFFFFFFF
        length = i - start + 1
        if (length >= MIN and (h & MASK) == 0) or length >= MAX:
            out.append((start, i + 1))
            start, h = i + 1, 0
    if start < len(b):
        out.append((start, len(b)))
    return out


def hsh(b):
    return hashlib.sha256(b).hexdigest()[:12]


# Server side: block store keyed by hash (dedup), and a file = ordered list of block hashes.
def sync(server, b, chunker):
    lst = [(hsh(b[s:e]), e - s) for s, e in chunker(b)]
    new_blocks = sent = 0
    for h, ln in lst:
        if h not in server:
            server[h] = ln
            new_blocks += 1
            sent += ln
    return lst, new_blocks, sent


edit = bytearray(file)
for i in range(100):
    edit[100000 + i] = 0x41  # overwrite 100 bytes in the middle
edit = bytes(edit)
insert = file[:1000] + b"INSERTED!!" + file[1000:]  # insert 10 bytes near the start

for name, chunker in [("fixed 16 KB", fixed_chunks), ("content-defined", cdc_chunks)]:
    server = {}
    print(f"== {name} ==")
    lst, nb, sent = sync(server, file, chunker)
    sizes = [ln for _, ln in lst]
    print(f"v1 upload:        {len(lst):>2} blocks, {nb:>2} new, {sent:>6} bytes sent (block sizes {min(sizes)}..{max(sizes)})")
    lst, nb, sent = sync(server, file, chunker)
    print(f"same file again:  {len(lst):>2} blocks, {nb:>2} new, {sent:>6} bytes sent (dedup)")
    lst, nb, sent = sync(server, edit, chunker)
    print(f"overwrite 100 B:  {len(lst):>2} blocks, {nb:>2} new, {sent:>6} bytes sent")
    lst, nb, sent = sync(server, insert, chunker)
    print(f"insert 10 B:      {len(lst):>2} blocks, {nb:>2} new, {sent:>6} bytes sent")
    stored = sum(server.values())
    print(f"block store after 3 versions: {len(server)} blocks, {stored} bytes (3 full copies would be {len(file) + len(edit) + len(insert)})")` },
          { tech: "go", code: `// Block-level sync: fixed-size vs content-defined chunking, SHA-256 block hashes, dedup and delta upload.
package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

var seed uint32 = 2463534242

func rnd() uint32 {
	seed ^= seed << 13
	seed ^= seed >> 17
	seed ^= seed << 5
	return seed
}

const FIXED, MIN, MAX, MASK = 16384, 4096, 32768, 0x3fff // 16 KB blocks stand for 4 MB blocks

var GEAR [256]uint32

type span struct{ s, e int }

func fixedChunks(b []byte) []span {
	out := []span{}
	for i := 0; i < len(b); i += FIXED {
		out = append(out, span{i, min(i+FIXED, len(b))})
	}
	return out
}

// Gear rolling hash: cut where the low 14 bits of the hash are zero, so boundaries depend on content, not offset.
func cdcChunks(b []byte) []span {
	out := []span{}
	start := 0
	var h uint32
	for i := 0; i < len(b); i++ {
		h = (h << 1) + GEAR[b[i]]
		ln := i - start + 1
		if (ln >= MIN && h&MASK == 0) || ln >= MAX {
			out = append(out, span{start, i + 1})
			start, h = i+1, 0
		}
	}
	if start < len(b) {
		out = append(out, span{start, len(b)})
	}
	return out
}

func hash(b []byte) string {
	s := sha256.Sum256(b)
	return hex.EncodeToString(s[:])[:12]
}

type block struct {
	h  string
	ln int
}

// Server side: block store keyed by hash (dedup), and a file = ordered list of block hashes.
func syncFile(server map[string]int, b []byte, chunker func([]byte) []span) ([]block, int, int) {
	lst := []block{}
	for _, sp := range chunker(b) {
		lst = append(lst, block{hash(b[sp.s:sp.e]), sp.e - sp.s})
	}
	nb, sent := 0, 0
	for _, bl := range lst {
		if _, ok := server[bl.h]; !ok {
			server[bl.h] = bl.ln
			nb++
			sent += bl.ln
		}
	}
	return lst, nb, sent
}

func main() {
	for i := range GEAR {
		GEAR[i] = rnd()
	}
	file := make([]byte, 200000)
	for i := range file {
		file[i] = byte(rnd() & 255)
	}
	edit := append([]byte{}, file...)
	for i := 0; i < 100; i++ {
		edit[100000+i] = 0x41 // overwrite 100 bytes in the middle
	}
	insert := append(append(append([]byte{}, file[:1000]...), []byte("INSERTED!!")...), file[1000:]...) // insert 10 bytes near the start

	names := []string{"fixed 16 KB", "content-defined"}
	chunkers := []func([]byte) []span{fixedChunks, cdcChunks}
	for c := range names {
		server := map[string]int{}
		chunker := chunkers[c]
		fmt.Printf("== %s ==\\n", names[c])
		lst, nb, sent := syncFile(server, file, chunker)
		lo, hi := lst[0].ln, lst[0].ln
		for _, bl := range lst {
			lo, hi = min(lo, bl.ln), max(hi, bl.ln)
		}
		fmt.Printf("v1 upload:        %2d blocks, %2d new, %6d bytes sent (block sizes %d..%d)\\n", len(lst), nb, sent, lo, hi)
		lst, nb, sent = syncFile(server, file, chunker)
		fmt.Printf("same file again:  %2d blocks, %2d new, %6d bytes sent (dedup)\\n", len(lst), nb, sent)
		lst, nb, sent = syncFile(server, edit, chunker)
		fmt.Printf("overwrite 100 B:  %2d blocks, %2d new, %6d bytes sent\\n", len(lst), nb, sent)
		lst, nb, sent = syncFile(server, insert, chunker)
		fmt.Printf("insert 10 B:      %2d blocks, %2d new, %6d bytes sent\\n", len(lst), nb, sent)
		stored := 0
		for _, v := range server {
			stored += v
		}
		fmt.Printf("block store after 3 versions: %d blocks, %d bytes (3 full copies would be %d)\\n", len(server), stored, len(file)+len(edit)+len(insert))
	}
}` },
          { tech: "java", code: `// Block-level sync: fixed-size vs content-defined chunking, SHA-256 block hashes, dedup and delta upload.
import java.security.MessageDigest;
import java.util.*;
import java.util.function.Function;

public class Main {
    static int seed = (int) 2463534242L;

    static int rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed; }

    static final int FIXED = 16384, MIN = 4096, MAX = 32768, MASK = 0x3fff; // 16 KB blocks stand for 4 MB blocks
    static int[] GEAR = new int[256];

    static List<int[]> fixedChunks(byte[] b) {
        List<int[]> out = new ArrayList<>();
        for (int i = 0; i < b.length; i += FIXED) out.add(new int[]{i, Math.min(i + FIXED, b.length)});
        return out;
    }

    // Gear rolling hash: cut where the low 14 bits of the hash are zero, so boundaries depend on content, not offset.
    static List<int[]> cdcChunks(byte[] b) {
        List<int[]> out = new ArrayList<>();
        int start = 0, h = 0;
        for (int i = 0; i < b.length; i++) {
            h = (h << 1) + GEAR[b[i] & 255];
            int len = i - start + 1;
            if ((len >= MIN && (h & MASK) == 0) || len >= MAX) { out.add(new int[]{start, i + 1}); start = i + 1; h = 0; }
        }
        if (start < b.length) out.add(new int[]{start, b.length});
        return out;
    }

    static String hash(byte[] b, int s, int e) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        md.update(b, s, e - s);
        return HexFormat.of().formatHex(md.digest()).substring(0, 12);
    }

    // Server side: block store keyed by hash (dedup), and a file = ordered list of block hashes.
    static int[] sync(Map<String, Integer> server, byte[] b, Function<byte[], List<int[]>> chunker) throws Exception {
        int blocks = 0, nb = 0, sent = 0, lo = Integer.MAX_VALUE, hi = 0;
        for (int[] sp : chunker.apply(b)) {
            String h = hash(b, sp[0], sp[1]);
            int len = sp[1] - sp[0];
            blocks++; lo = Math.min(lo, len); hi = Math.max(hi, len);
            if (!server.containsKey(h)) { server.put(h, len); nb++; sent += len; }
        }
        return new int[]{blocks, nb, sent, lo, hi};
    }

    public static void main(String[] args) throws Exception {
        for (int i = 0; i < 256; i++) GEAR[i] = rnd();
        byte[] file = new byte[200000];
        for (int i = 0; i < file.length; i++) file[i] = (byte) (rnd() & 255);
        byte[] edit = file.clone();
        for (int i = 0; i < 100; i++) edit[100000 + i] = 0x41; // overwrite 100 bytes in the middle
        byte[] ins = "INSERTED!!".getBytes();
        byte[] insert = new byte[file.length + ins.length]; // insert 10 bytes near the start
        System.arraycopy(file, 0, insert, 0, 1000);
        System.arraycopy(ins, 0, insert, 1000, ins.length);
        System.arraycopy(file, 1000, insert, 1000 + ins.length, file.length - 1000);

        String[] names = {"fixed 16 KB", "content-defined"};
        List<Function<byte[], List<int[]>>> chunkers = List.of(Main::fixedChunks, Main::cdcChunks);
        for (int c = 0; c < 2; c++) {
            Map<String, Integer> server = new HashMap<>();
            Function<byte[], List<int[]>> ch = chunkers.get(c);
            System.out.printf("== %s ==%n", names[c]);
            int[] r = sync(server, file, ch);
            System.out.printf("v1 upload:        %2d blocks, %2d new, %6d bytes sent (block sizes %d..%d)%n", r[0], r[1], r[2], r[3], r[4]);
            r = sync(server, file, ch);
            System.out.printf("same file again:  %2d blocks, %2d new, %6d bytes sent (dedup)%n", r[0], r[1], r[2]);
            r = sync(server, edit, ch);
            System.out.printf("overwrite 100 B:  %2d blocks, %2d new, %6d bytes sent%n", r[0], r[1], r[2]);
            r = sync(server, insert, ch);
            System.out.printf("insert 10 B:      %2d blocks, %2d new, %6d bytes sent%n", r[0], r[1], r[2]);
            int stored = 0;
            for (int v : server.values()) stored += v;
            System.out.printf("block store after 3 versions: %d blocks, %d bytes (3 full copies would be %d)%n", server.size(), stored, file.length + edit.length + insert.length);
        }
    }
}` },
        ],
      },
      {
        label: `Sync journal with cursors: missing-block handshake, offline edit conflict, conflicted copy, tombstone, convergence`,
        variants: [
          { tech: "node", code: `// Sync metadata: a per-namespace journal, device cursors, missing-block handshake, conflicts, tombstones.
const server = { journal: [], files: new Map(), blocks: new Set() };   // files: path -> {rev, blocks}
let revCounter = 0;

// Commit = "path now points at this block list, and I based it on rev X". Server checks both.
function commit(device, path, blocks, baseRev) {
  const missing = (blocks || []).filter((b) => !server.blocks.has(b));
  if (missing.length) return { status: "need_blocks", missing };
  const cur = server.files.get(path);
  const curRev = cur ? cur.rev : null;
  if (curRev !== baseRev) return { status: "conflict", current: curRev };
  const rev = "r" + ++revCounter;
  if (blocks === null) server.files.delete(path); else server.files.set(path, { rev, blocks });
  server.journal.push({ seq: server.journal.length + 1, path, rev, blocks, by: device });
  return { status: "ok", rev, seq: server.journal.length };
}
function upload(blocks) { blocks.forEach((b) => server.blocks.add(b)); }

class Device {
  constructor(name) { this.name = name; this.cursor = 0; this.files = new Map(); }
  // Long-poll returns as soon as the journal moves past my cursor; then I list the new entries.
  pull() {
    const entries = server.journal.slice(this.cursor);
    for (const e of entries) { if (e.blocks === null) this.files.delete(e.path); else this.files.set(e.path, { rev: e.rev, blocks: e.blocks }); }
    this.cursor = server.journal.length;
    return entries.map((e) => \`\${e.seq}:\${e.path}\${e.blocks === null ? " (deleted)" : ""}\`);
  }
  save(path, blocks) {
    const base = this.files.has(path) ? this.files.get(path).rev : null;
    let r = commit(this.name, path, blocks, base);
    if (r.status === "need_blocks") { console.log(\`  \${this.name}: server needs [\${r.missing.join(",")}], uploading\`); upload(r.missing); r = commit(this.name, path, blocks, base); }
    if (r.status === "conflict") {
      const copy = path.replace(".txt", \` (\${this.name} conflicted copy).txt\`);
      console.log(\`  \${this.name}: \${path} conflict (based on \${base}, server has \${r.current}) -> saved as \${copy}\`);
      return this.save(copy, blocks);
    }
    this.files.set(path, { rev: r.rev, blocks });
    console.log(\`  \${this.name}: \${path} -> \${r.rev} at seq \${r.seq}\`);
  }
  remove(path) { const r = commit(this.name, path, null, this.files.get(path).rev); this.files.delete(path); console.log(\`  \${this.name}: delete \${path} -> tombstone at seq \${r.seq}\`); }
  show() { return [...this.files.entries()].sort().map(([p, f]) => \`\${p}@\${f.rev}[\${f.blocks.join(",")}]\`).join("  "); }
}

const laptop = new Device("Laptop"), phone = new Device("Phone");
console.log("== 1. Laptop adds three files; the server asks only for blocks it lacks ==");
laptop.save("/notes.txt", ["h1", "h2"]);
laptop.save("/old.txt", ["h3"]);
laptop.save("/copy.txt", ["h1", "h2"]);
console.log(\`Phone pulls from cursor \${phone.cursor}: \${phone.pull().join(", ")} -> cursor \${phone.cursor}\`);

console.log("== 2. Both edit /notes.txt offline from r1 ==");
laptop.save("/notes.txt", ["h1", "h4"]);
phone.save("/notes.txt", ["h5", "h2"]);
console.log("== 3. Laptop deletes /old.txt ==");
laptop.remove("/old.txt");
console.log("== 4. Everyone catches up ==");
console.log(\`Laptop pulls from cursor \${laptop.cursor}: \${laptop.pull().join(", ")}\`);
console.log(\`Phone pulls from cursor \${phone.cursor}: \${phone.pull().join(", ")}\`);
console.log(\`Laptop: \${laptop.show()}\`);
console.log(\`Phone:  \${phone.show()}\`);
console.log(\`converged: \${laptop.show() === phone.show()}, journal length \${server.journal.length}, blocks stored \${server.blocks.size}\`);` },
          { tech: "python", code: `# Sync metadata: a per-namespace journal, device cursors, missing-block handshake, conflicts, tombstones.
server = {"journal": [], "files": {}, "blocks": set()}  # files: path -> {rev, blocks}
rev_counter = 0


# Commit = "path now points at this block list, and I based it on rev X". Server checks both.
def commit(device, path, blocks, base_rev):
    global rev_counter
    missing = [b for b in (blocks or []) if b not in server["blocks"]]
    if missing:
        return {"status": "need_blocks", "missing": missing}
    cur = server["files"].get(path)
    cur_rev = cur["rev"] if cur else None
    if cur_rev != base_rev:
        return {"status": "conflict", "current": cur_rev}
    rev_counter += 1
    rev = f"r{rev_counter}"
    if blocks is None:
        server["files"].pop(path, None)
    else:
        server["files"][path] = {"rev": rev, "blocks": blocks}
    server["journal"].append({"seq": len(server["journal"]) + 1, "path": path, "rev": rev, "blocks": blocks, "by": device})
    return {"status": "ok", "rev": rev, "seq": len(server["journal"])}


def upload(blocks):
    server["blocks"].update(blocks)


class Device:
    def __init__(self, name):
        self.name, self.cursor, self.files = name, 0, {}

    # Long-poll returns as soon as the journal moves past my cursor; then I list the new entries.
    def pull(self):
        entries = server["journal"][self.cursor:]
        for e in entries:
            if e["blocks"] is None:
                self.files.pop(e["path"], None)
            else:
                self.files[e["path"]] = {"rev": e["rev"], "blocks": e["blocks"]}
        self.cursor = len(server["journal"])
        return [f"{e['seq']}:{e['path']}{' (deleted)' if e['blocks'] is None else ''}" for e in entries]

    def save(self, path, blocks):
        base = self.files[path]["rev"] if path in self.files else None
        r = commit(self.name, path, blocks, base)
        if r["status"] == "need_blocks":
            print(f"  {self.name}: server needs [{','.join(r['missing'])}], uploading")
            upload(r["missing"])
            r = commit(self.name, path, blocks, base)
        if r["status"] == "conflict":
            copy = path.replace(".txt", f" ({self.name} conflicted copy).txt")
            print(f"  {self.name}: {path} conflict (based on {base}, server has {r['current']}) -> saved as {copy}")
            return self.save(copy, blocks)
        self.files[path] = {"rev": r["rev"], "blocks": blocks}
        print(f"  {self.name}: {path} -> {r['rev']} at seq {r['seq']}")

    def remove(self, path):
        r = commit(self.name, path, None, self.files[path]["rev"])
        del self.files[path]
        print(f"  {self.name}: delete {path} -> tombstone at seq {r['seq']}")

    def show(self):
        return "  ".join(f"{p}@{f['rev']}[{','.join(f['blocks'])}]" for p, f in sorted(self.files.items()))


laptop, phone = Device("Laptop"), Device("Phone")
print("== 1. Laptop adds three files; the server asks only for blocks it lacks ==")
laptop.save("/notes.txt", ["h1", "h2"])
laptop.save("/old.txt", ["h3"])
laptop.save("/copy.txt", ["h1", "h2"])
c = phone.cursor
print(f"Phone pulls from cursor {c}: {', '.join(phone.pull())} -> cursor {phone.cursor}")

print("== 2. Both edit /notes.txt offline from r1 ==")
laptop.save("/notes.txt", ["h1", "h4"])
phone.save("/notes.txt", ["h5", "h2"])
print("== 3. Laptop deletes /old.txt ==")
laptop.remove("/old.txt")
print("== 4. Everyone catches up ==")
c = laptop.cursor
print(f"Laptop pulls from cursor {c}: {', '.join(laptop.pull())}")
c = phone.cursor
print(f"Phone pulls from cursor {c}: {', '.join(phone.pull())}")
print(f"Laptop: {laptop.show()}")
print(f"Phone:  {phone.show()}")
print(f"converged: {str(laptop.show() == phone.show()).lower()}, journal length {len(server['journal'])}, blocks stored {len(server['blocks'])}")` },
        ],
      },
    ],
  },
  {
    title: `How would you design Google Drive?`,
    difficulty: "hard",
    seoDescription: `Design Google Drive: ID-based file tree, inherited sharing and permission checks, per-user change feed, resumable uploads, search, quotas and scale math.`,
    description: `**Question presented to candidate:**
"Design Google Drive. Users upload files of any size from web, desktop and mobile, organise them in folders, share files and folders with people and groups at different permission levels, see changes from other people quickly, and search across everything they can access. Focus on the metadata, sharing and sync parts; assume a blob store exists."

**What a strong answer should cover:**
- Metadata as a graph of **items with stable IDs** and a parent pointer (Drive moved to one parent per item in 2020, with shortcuts for extra locations), separate from the **blob store** holding file content
- **Sharing**: permissions granted on a file or folder and **inherited** by everything below; effective access = strongest grant on the item or any ancestor; a folder move changes access for a whole subtree with one parent-pointer write
- A dedicated **authorization service** (Google's Zanzibar paper describes relation tuples such as "doc#viewer@user" in the system Google built for authorization across many of its products), with caching and consistency tokens so a revoke is not ignored
- A per-user **change feed** with page tokens (Drive's API exposes \`changes.getStartPageToken\` and \`changes.list\`), including "removed" entries when access is lost, plus push notifications
- **Resumable uploads** with a session URI and byte offsets (the server reports what it has with \`308\` and a \`Range\` header; chunks in multiples of 256 KiB per Google's upload docs), and quotas such as 5 TB per file and 750 GB per user per day
- Search over names, content and permissions; native Docs editing as a separate collaborative system; capacity math and what breaks at 10x

**Clarifying questions expected:**
- Which clients, and is offline desktop sync in scope or only web and mobile?
- Sharing model: users, groups, domains, link sharing?
- Scale: users, items per user, read/write ratio for metadata?

**Code / implementation expected:** Optional — the data model and the permission and change-feed logic matter most; the example simulates inherited sharing, a revoking move, a change feed and a resumable upload.`,
    answer: `**Target Audience:** Developers preparing for system design interviews. This page builds on the [Dropbox design](/interview-question/how-would-you-design-a-file-storage-service-like-dropbox) (block sync) and the [S3-like object storage design](/interview-question/how-would-you-design-s3-like-object-storage-572x) (blob storage) and focuses on what is different: an ID-based shared tree, permissions, the change feed and uploads.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Google product facts are from Google documentation, announcements and the Zanzibar paper, cited inline.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Capacity numbers are worked from stated assumptions. All permission and feed behaviour comes from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A company keeps its documents in a big filing room. Instead of handing out keys to every single folder, the office manager gives Bob a key to the "Team" cabinet: everything inside it, including folders added later, is open to him. One day someone moves the "Q3" folder from the Team cabinet into the locked "Private" cabinet. Nobody changed Bob's key, yet Bob can no longer open Q3 — and his desk copy of the Q3 index should vanish too, or he will keep seeing file names he is no longer allowed to see.

That is Google Drive's hard part. Storing bytes is a solved problem; the interesting design is the shared tree of items, permissions that flow down it, and a change feed that tells each user exactly what changed in their view of the world, including what disappeared.

📌 **Interview term: cloud-first file storage** — the server's metadata is the source of truth and clients (web, mobile, desktop) are views of it; unlike a pure sync folder, most users never hold a full local copy.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Desktop sync, or web and mobile first? | Full local sync needs the block-sync machinery from the Dropbox design |
| Who can things be shared with: users, groups, domains, anyone with the link? | Groups and nesting make permission checks a graph problem |
| Are native documents (Docs, Sheets) in scope? | Real-time co-editing is a separate system |
| Users and items per user? | Sizes metadata and the permission store |
| How fast must a share or revoke take effect? | Drives caching and consistency of permission checks |
| Search: names only, or file content too? | Content indexing is a large pipeline of its own |

## 3. Requirements

**Functional**
- Upload, download, preview; folders; move, rename, trash and restore; version history.
- Share files and folders with roles (reader, commenter, writer, owner) to users, groups or links; access inherited down folders.
- "Shared with me", "Recent" and a change feed so clients update quickly.
- Search across all accessible items.

**Non-functional**
- Permission checks must be correct (no access after revoke) and fast (single-digit milliseconds), because every list, open and search result is filtered by them.
- Metadata strongly consistent per item; feed delivery within seconds.
- Product limits we adopt from Drive: Google's Workspace admin documentation lists up to **5 TB per file** for non-native files and an upload limit of **750 GB per user per day**.

## 4. Capacity Estimate

| Input | Value (assumption) |
| :--- | :--- |
| Users | 1 billion; 200 million daily active |
| Items per user | 3,000 (files and folders); about 1 KB of metadata each including permissions |
| Stored per user | 5 GB on average |
| Metadata changes per DAU per day | 20 |
| Permission checks per DAU per day | 200 (lists, opens, search results, previews) |
| Upload per DAU per day | 50 MB |

Arithmetic:
- Items: 1 billion x 3,000 = **3 trillion items**, **3 PB** of metadata.
- Content: 1 billion x 5 GB = **5 EB** logical in the blob store.
- Metadata changes: 200 M x 20 = **4 billion/day**, **46,296/s** average, about **139,000/s** at a 3x peak.
- Permission checks: 200 M x 200 = **40 billion/day**, **462,963/s** average, about **1.39 million/s** at peak. This is the hottest path in the system.
- Uploads: 200 M x 50 MB = **10 PB/day**, about **116 GB/s** average.

Permission checks outnumber metadata writes by 10x; design the authorization path first.

## 5. Data Model

~~~sql
CREATE TABLE item (
  item_id      TEXT PRIMARY KEY,          -- opaque, stable ID; never a path
  parent_id    TEXT,                      -- one parent; null for a root
  owner_id     TEXT NOT NULL,
  name         TEXT NOT NULL,
  kind         TEXT NOT NULL,             -- folder | blob | native_doc | shortcut
  blob_ref     TEXT,                      -- pointer into the blob store (content hash or object key)
  size_bytes   BIGINT,
  head_rev     BIGINT NOT NULL,
  trashed      BOOLEAN NOT NULL DEFAULT false,
  modified_at  TIMESTAMP NOT NULL
);

CREATE TABLE permission (                 -- direct grants only; inheritance is computed
  item_id      TEXT NOT NULL,
  grantee      TEXT NOT NULL,             -- user:bob, group:eng, domain:example.com, anyone_with_link
  role         TEXT NOT NULL,             -- reader | commenter | writer | owner
  PRIMARY KEY (item_id, grantee)
);
~~~

Why IDs and one parent: paths change on every rename or move, IDs do not, so links, shares and the change feed refer to IDs. Google moved Drive to a **single-parent** model starting September 30, 2020; items that lived in several folders kept one parent and got **shortcuts** elsewhere, and the API stopped allowing a second parent (Google Workspace blog "Simplifying Google Drive folder structure and sharing models"). One parent makes "who inherits access" a simple walk to the root.

📌 **Interview term: item ID** — a stable, opaque identifier for a file or folder, independent of its name and location; the unit that sharing, links and the change feed refer to.

## 6. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 760 340" role="img" aria-label="Web, mobile and desktop clients call an API layer; the API calls a metadata service, an authorization service, an upload service writing to the blob store, a change feed service and a search index">
  <defs>
    <marker id="sd16q5-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="140" width="130" height="60" rx="10"/>
  <text class="d-text" x="85" y="175" text-anchor="middle">clients</text>
  <rect class="d-box" x="200" y="140" width="130" height="60" rx="10"/>
  <text class="d-text" x="265" y="175" text-anchor="middle">API layer</text>
  <rect class="d-box-accent" x="420" y="20" width="160" height="56" rx="10"/>
  <text class="d-text" x="500" y="53" text-anchor="middle">authorization</text>
  <rect class="d-box" x="420" y="100" width="160" height="56" rx="10"/>
  <text class="d-text" x="500" y="133" text-anchor="middle">metadata</text>
  <rect class="d-box" x="420" y="180" width="160" height="56" rx="10"/>
  <text class="d-text" x="500" y="213" text-anchor="middle">change feed</text>
  <rect class="d-box" x="420" y="260" width="160" height="56" rx="10"/>
  <text class="d-text" x="500" y="293" text-anchor="middle">upload sessions</text>
  <rect class="d-box-muted" x="630" y="260" width="110" height="56" rx="10"/>
  <text class="d-text" x="685" y="293" text-anchor="middle">blob store</text>
  <rect class="d-box-muted" x="630" y="100" width="110" height="56" rx="10"/>
  <text class="d-text" x="685" y="133" text-anchor="middle">search</text>
  <path class="d-edge" d="M 150 170 L 194 170" marker-end="url(#sd16q5-arrow)"/>
  <path class="d-edge-accent" d="M 330 150 L 414 50" marker-end="url(#sd16q5-arrow)"/>
  <path class="d-edge" d="M 330 165 L 414 130" marker-end="url(#sd16q5-arrow)"/>
  <path class="d-edge" d="M 330 180 L 414 206" marker-end="url(#sd16q5-arrow)"/>
  <path class="d-edge" d="M 330 195 L 414 285" marker-end="url(#sd16q5-arrow)"/>
  <path class="d-edge" d="M 580 288 L 624 288" marker-end="url(#sd16q5-arrow)"/>
  <path class="d-edge-dashed" d="M 580 128 L 624 128" marker-end="url(#sd16q5-arrow)"/>
</svg>

Every request passes the authorization service; the metadata service owns the tree; the change feed and the search index are derived views fed from metadata changes.

- **Metadata service**: items and direct permissions, sharded by item ID (or by owner with a global ID index); strongly consistent per item. Emits a change event for every mutation (an [outbox](/interview-question/outbox-pattern-vs-polling-for-cdc-how-do-you-avoid-dual-write-failure) keeps events and writes in step).
- **Authorization service**: answers "can user U do action A on item I" using direct grants, ancestors and group membership; heavily cached.
- **Change feed service**: per-user ordered change lists with page tokens.
- **Upload service**: resumable upload sessions, writing content to the blob store and finalising a metadata revision.
- **Search**: an index of names, metadata and extracted text, filtered by permissions at query time.
- **Native documents** (Docs, Sheets) are served by a separate real-time editing system; see [designing a collaborative editor](/interview-question/how-would-you-design-a-collaborative-editor-like-google-docs).

## 7. Deep Dive 1: Inherited Sharing

Bob was granted \`writer\` on the Team folder; Carol \`reader\` on one file. Effective access is the strongest grant found walking from the item up to the root:

~~~js
for (let cur = id; cur; cur = items.get(cur).parent) {
  const r = items.get(cur).acl[user];
  if (r && ROLES.indexOf(r) > ROLES.indexOf(best)) { best = r; from = items.get(cur).name; }
}
~~~

~~~text
== 1. Inherited permissions ==
bob on plan.doc: writer (via Team)
carol on budget.xlsx: reader (via budget.xlsx)
carol on plan.doc: none
alice on budget.xlsx: owner (via My Drive)
~~~

Now move the Q3 folder from Team into Private:

~~~text
== 2. Move Q3 from Team to Private (one parent pointer changes) ==
metadata rows written: 1, items whose access was recomputed: 3, change-feed rows: 7
bob on plan.doc: none
carol on budget.xlsx: reader (via budget.xlsx)
~~~

One parent pointer changed, and Bob lost access to everything under Q3, while Carol's direct grant on \`budget.xlsx\` kept working. That is the power of computing inheritance at check time: a move or a share on a folder is **one write** no matter how big the folder is. The alternative, copying the folder's grants down to every descendant, makes checks a single lookup but turns every share, unshare or move into a write per descendant:

~~~text
== 4. Same move on a big folder: inherited vs copied-down ACLs ==
    10 files: inherited ACL writes 1 row; ACLs copied to every item write 11; feed rows for 2 affected users 22
  5000 files: inherited ACL writes 1 row; ACLs copied to every item write 5001; feed rows for 2 affected users 10002
200000 files: inherited ACL writes 1 row; ACLs copied to every item write 200001; feed rows for 2 affected users 400002
~~~

A move of a 200,000-file folder is 1 row with inherited permissions and 200,001 rows with copied-down ones. Real systems sit in between: compute inheritance, and cache or index the results.

📌 **Interview term: permission inheritance** — access granted on a folder applies to everything below it, computed by walking ancestors (or by an index built from them), so the tree structure itself is part of the access-control data.

📌 **Interview term: effective permission** — the role a user actually has on an item: the strongest of their direct grants, grants via groups, and grants on ancestors.

## 8. Deep Dive 2: An Authorization Service

At about 1.4 million checks per second at peak, permission logic deserves its own service. Google's Zanzibar paper (USENIX ATC 2019) describes the authorization system Google built for many of its products, with documents and folders as its running example: permissions are stored as **relation tuples** of the form \`object#relation@user\` (for example \`doc:plan#viewer@user:bob\`, or \`doc:plan#parent@folder:q3\`), with per-namespace rules such as "editors are also viewers" and "viewers of the parent folder are viewers of the child". Checks evaluate those rules over the tuple graph.

Two lessons from it worth naming in an interview:
- **Groups and nesting make it a graph problem**: "Bob is in eng, eng is in all-staff, all-staff can read the folder" needs a graph walk; Zanzibar uses an index (called Leopard in the paper) for deeply nested groups.
- **Consistency of revokes**: a cache that keeps saying "yes" after a revoke is a security bug. Zanzibar addresses this (the paper calls it the "new enemy" problem) with consistency tokens called zookies, so a check can be evaluated at a snapshot at least as new as the content it protects. A simpler design: version the ACL per item and include the version in the cache key.

📌 **Interview term: relation tuple / ReBAC** — storing permissions as relations between objects and subjects (relationship-based access control) and deriving access by rules over the graph, instead of a flat ACL per object.

## 9. Deep Dive 3: The Per-User Change Feed

Clients do not re-list the whole Drive; they keep a **page token** and ask for changes since it. In Drive's API this is \`changes.getStartPageToken\` followed by \`changes.list(pageToken)\` and, for push, \`changes.watch\` (Drive API v3 reference). The subtle part is that a user's feed must include **changes to their view**, not only to items they still see. After the Q3 move:

~~~text
== 3. Bob syncs with his page token ==
seq 2: Q3 removed
seq 4: plan.doc removed
seq 6: budget.xlsx removed
bob next page token: 7; alice sees 3 changes
~~~

Bob's client receives "removed" for Q3 and both files, so it deletes them from its local cache and UI; Alice (still owner) receives "changed". The move produced 7 feed rows across three users (shown in section 7's output), and for a 200,000-file folder with 2 affected users it would be 400,002 — so feed fan-out for moves and shares is computed asynchronously, in batches, by a worker reading the metadata change events. While that worker catches up, the authorization check (not the feed) is what keeps access correct.

📌 **Interview term: change feed with page tokens** — an ordered list of changes per user; the client stores the token returned with each page and resumes from it, so sync is incremental and survives disconnects. "Removed" entries cover both deletes and loss of access.

## 10. Deep Dive 4: Resumable Uploads

Drive clients upload through a **resumable upload session**: the client starts a session and gets a session URI, then sends the bytes in chunks with \`Content-Range\`. The server answers each partial chunk with **\`308\`** and a **\`Range\`** header stating how many bytes it has persisted; after a dropped connection the client asks for the status with an empty \`PUT\` (\`Content-Range: bytes */TOTAL\`) and resumes from the reported offset. Google's Cloud Storage resumable-upload guide documents this protocol and says chunks other than the last must be multiples of **256 KiB** (it recommends at least 8 MiB); the Drive API's upload guide follows the same session-URI pattern, though I could not re-check the Drive page itself for this write-up.

~~~text
== 5. Resumable upload: 1,000,000 bytes in 262,144-byte chunks ==
PUT bytes 0-262143/1000000 -> 308 Range: bytes=0-262143
PUT bytes 262144-524287/1000000 -> 308 Range: bytes=0-524287
PUT bytes 524288-786431/1000000 (dropped after 100000) -> 308 Range: bytes=0-524287
status query PUT bytes */1000000 -> 308 Range: bytes=0-524287
PUT bytes 524288-786431/1000000 -> 308 Range: bytes=0-786431
PUT bytes 786432-999999/1000000 -> 200 OK file created
bytes sent 1100000, wasted 100000
~~~

The third request was cut off after 100,000 bytes; the status query showed the server still had only 524,288 bytes (in the simulation the server persists whole 256 KiB units), so the client re-sent that chunk and finished. Cost of the failure: **100,000 wasted bytes**, not the whole file. Compare with S3's approach of independent numbered parts on the [multipart page](/interview-question/how-does-s3-multipart-upload-make-5tb-uploads-resumable-and-fast): an offset-based session is simpler for one sequential stream; numbered parts allow parallel upload.

When the session finishes, the upload service writes the blob, then commits a new revision on the item (blob first, metadata last — the same commit-point rule as in object storage) and emits a change event.

📌 **Interview term: resumable upload session** — a server-side upload identified by a session URI that records how many bytes it has; the client resumes from the server-reported offset rather than from what it believes it sent.

## 11. Search

- Index names, owners, MIME types, modification time and extracted text (text from PDFs, OCR of images) in an inverted index, updated asynchronously from metadata change events.
- **Filter by permission**: either store the principals allowed to see each document in the index (fast, but must be updated when shares change — the same fan-out problem as the feed) or post-filter candidate results with the authorization service (always correct, slower for broad queries). Many systems do both: index-level filtering for recall, an authorization re-check on the top results before display.

## 12. What Breaks First at 10x

At 2 billion daily users or 10x activity:
- **Authorization QPS**: about 14 million checks/s at peak; caching by \`(user, item, acl_version)\` and batching checks for list pages become mandatory.
- **Fan-out of shares and moves**: re-sharing a folder with a large group touches feeds and search entries for every member and every descendant; do it asynchronously and rate-limit giant operations.
- **Hot items**: a file shared with a whole company and opened by everyone at 9 am; replicate its metadata and permission data in caches near readers.
- **Metadata size**: 30 trillion items; shard by item ID with a secondary index by parent for listing folder children.

## 13. Verified: Running the Code

The example **"Drive metadata: inherited sharing, a folder move that revokes access, per-user change feed, resumable upload session"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== 1. Inherited permissions ==
bob on plan.doc: writer (via Team)
carol on budget.xlsx: reader (via budget.xlsx)
carol on plan.doc: none
alice on budget.xlsx: owner (via My Drive)
== 2. Move Q3 from Team to Private (one parent pointer changes) ==
metadata rows written: 1, items whose access was recomputed: 3, change-feed rows: 7
bob on plan.doc: none
carol on budget.xlsx: reader (via budget.xlsx)
== 3. Bob syncs with his page token ==
seq 2: Q3 removed
seq 4: plan.doc removed
seq 6: budget.xlsx removed
bob next page token: 7; alice sees 3 changes
== 4. Same move on a big folder: inherited vs copied-down ACLs ==
    10 files: inherited ACL writes 1 row; ACLs copied to every item write 11; feed rows for 2 affected users 22
  5000 files: inherited ACL writes 1 row; ACLs copied to every item write 5001; feed rows for 2 affected users 10002
200000 files: inherited ACL writes 1 row; ACLs copied to every item write 200001; feed rows for 2 affected users 400002
== 5. Resumable upload: 1,000,000 bytes in 262,144-byte chunks ==
PUT bytes 0-262143/1000000 -> 308 Range: bytes=0-262143
PUT bytes 262144-524287/1000000 -> 308 Range: bytes=0-524287
PUT bytes 524288-786431/1000000 (dropped after 100000) -> 308 Range: bytes=0-524287
status query PUT bytes */1000000 -> 308 Range: bytes=0-524287
PUT bytes 524288-786431/1000000 -> 308 Range: bytes=0-786431
PUT bytes 786432-999999/1000000 -> 200 OK file created
bytes sent 1100000, wasted 100000
~~~

What the simulation stands for and what it leaves out: \`items\` is an in-process map standing for the metadata store, and \`access()\` walks parents the way a real check would but without groups, domains, link sharing or caching; the change feed is one array filtered per user; the "big folder" lines are arithmetic, not a simulation; the upload server is a counter that persists whole 262,144-byte units, which is an assumption made for the demonstration (a real server may persist any amount and reports it in \`Range\`). There is no network, storage or authentication.

## Edge Cases Worth Knowing

- **Moving an item out of a shared folder you do not own**: it can strip other people's access; Drive-like products warn and may restrict who can move items out of shared spaces.
- **Shortcuts**: a shortcut grants nothing; opening it requires access to the target (as Google notes for Drive shortcuts).
- **Trash vs delete**: trash is a flag (restorable, still counted in quota); permanent delete is asynchronous blob garbage collection.
- **Ownership transfer** when an account is deleted: items must move to a new owner or be deleted; shared files otherwise vanish for collaborators.
- **Link sharing**: "anyone with the link" is a grantee like any other, but links leak; support expiry and domain restrictions.

## Common Pitfalls

- **Paths as identifiers** — every rename or move breaks links, shares and sync; use stable item IDs.
- **Copying ACLs down to every descendant** — a 200,000-file folder move becomes 200,001 writes; compute inheritance and cache it.
- **Change feeds that only report visible items** — Bob would keep seeing Q3 forever; emit "removed" when access is lost.
- **Caches that ignore revokes** — key cached checks by ACL version or use consistency tokens.
- **Resuming uploads from the client offset** — the run shows the server had fewer bytes than the client sent; always ask the server.
- **Mixing native-doc editing into the file metadata path** — real-time collaboration is its own system.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Shape:</strong> <span style="color:#f0e2c8;">Metadata is a tree of <strong style="color:#ffca28;">items with stable IDs</strong> and one parent each, separate from a blob store for content. Around it: an <strong style="color:#ffca28;">authorization service</strong>, a per-user <strong style="color:#ffca28;">change feed</strong>, resumable <strong style="color:#ffca28;">upload sessions</strong> and a search index fed from metadata change events.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Numbers:</strong> <span style="color:#f0e2c8;">1 billion users with 3,000 items each is 3 trillion items and about 3 PB of metadata; 200 million DAU make about 46,000 metadata changes/s but about 460,000 permission checks/s on average, 1.4 million at peak, so authorization is the hot path.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Sharing:</strong> <span style="color:#f0e2c8;">Grants live on files or folders and are <strong style="color:#ffca28;">inherited</strong>; effective access is the strongest grant on the item or any ancestor, plus groups. In my run, moving Q3 into a private folder was one parent-pointer write and removed Bob's access to everything inside, where copied-down ACLs would cost a write per descendant.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Authorization and feed:</strong> <span style="color:#f0e2c8;">Like Google's Zanzibar, I store <strong style="color:#ffca28;">relation tuples</strong>, cache checks keyed by ACL version so revokes take effect, and give each user a <strong style="color:#ffca28;">page-token change feed</strong> that includes <strong style="color:#ffca28;">removed</strong> entries when access disappears.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Uploads:</strong> <span style="color:#f0e2c8;">Uploads use <strong style="color:#ffca28;">resumable sessions</strong>: chunks of 256 KiB multiples, the server answers 308 with the Range it holds, and after a drop the client asks the server and resumes from there; then blob first, metadata revision last. At 10x, permission QPS and share fan-out break first.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not compute access once and store it on every item?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reads get faster but every share, unshare and move must rewrite every descendant, and a crash mid-way leaves a half-updated tree. Computing from ancestors keeps writes O(1); a cache or an index of ancestor permissions brings reads back to near O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make a revoke take effect immediately?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The metadata write that removes the grant bumps the item ACL version; permission caches are keyed by that version (or use a consistency token as in Zanzibar), so the next check misses the cache and re-evaluates. Feeds and search catch up asynchronously but are filtered by the check.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does "Shared with me" work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep an index from grantee to items granted directly to them (or their groups), updated on each share; the view lists those items after a permission check. It does not list every descendant, only the shared roots.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from Dropbox?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Dropbox is sync-first: every device keeps a full copy, so block-level delta sync and per-namespace journals dominate. Drive is cloud-first with deep sharing, so the item graph, inherited permissions and per-user feeds dominate; the desktop client can still reuse block sync.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a folder shared with 100,000 people?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The grant is one tuple on the folder for a group, not 100,000 rows. Checks resolve group membership through the authorization service; feed and search fan-out for that share run as batched background jobs.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Cloud-first file storage | Server metadata is the truth; clients are views |
| Item ID | Stable identifier for a file or folder, independent of its path |
| Permission inheritance | Folder grants apply to everything below |
| Effective permission | The strongest role from direct, group and ancestor grants |
| Relation tuple / ReBAC | Permissions as relations; access derived by rules over the graph |
| Change feed with page tokens | Ordered per-user changes resumed from a token |
| Resumable upload session | Server-tracked upload resumed from the offset the server reports |

**Conclusion:** Google Drive's design centre is not the bytes but the shared tree: items with stable IDs and one parent, permissions granted on folders and inherited by everything below, a dedicated authorization service that answers about a million checks per second and respects revokes, and a per-user change feed that also reports what a user can no longer see. The run made each piece concrete: Bob had writer access through the Team folder, one parent-pointer write moved Q3 and revoked it, his feed delivered three "removed" entries, and a dropped upload chunk cost 100,000 bytes because the client resumed from the offset the server reported. Content storage, block sync and real-time editing are covered by their own designs; here the hard parts are permissions and fan-out.`,
    examples: [
      {
        label: `Drive metadata: inherited sharing, a folder move that revokes access, per-user change feed, resumable upload session`,
        variants: [
          { tech: "node", code: `// Drive-style metadata: a folder tree of IDs, inherited sharing, a move that changes access, a change feed,
// and a resumable upload session.
const ROLES = ["none", "reader", "commenter", "writer", "owner"];
const items = new Map();                       // id -> {name, parent, acl: {user: role}}
const changes = [];                            // {seq, id, user, kind}
const add = (id, name, parent, acl = {}) => items.set(id, { name, parent, acl });

add("root", "My Drive", null, { alice: "owner" });
add("team", "Team", "root", { bob: "writer" });
add("q3", "Q3", "team");
add("plan", "plan.doc", "q3");
add("budget", "budget.xlsx", "q3", { carol: "reader" });
add("priv", "Private", "root");

// Effective role = the strongest grant on the item or any ancestor. Returns [role, where it came from].
function access(user, id) {
  let best = "none", from = "-";
  for (let cur = id; cur; cur = items.get(cur).parent) {
    const r = items.get(cur).acl[user];
    if (r && ROLES.indexOf(r) > ROLES.indexOf(best)) { best = r; from = items.get(cur).name; }
  }
  return [best, from];
}
const show = (user, id) => { const [r, f] = access(user, id); return \`\${user} on \${items.get(id).name}: \${r}\${r === "none" ? "" : " (via " + f + ")"}\`; };
const subtree = (id) => [id, ...[...items.keys()].filter((k) => items.get(k).parent === id).flatMap(subtree)];

console.log("== 1. Inherited permissions ==");
for (const [u, id] of [["bob", "plan"], ["carol", "budget"], ["carol", "plan"], ["alice", "budget"]]) console.log(show(u, id));

console.log("== 2. Move Q3 from Team to Private (one parent pointer changes) ==");
const users = ["alice", "bob", "carol"];
const before = new Map(subtree("q3").map((id) => [id, users.map((u) => access(u, id)[0])]));
items.get("q3").parent = "priv";
let feedRows = 0;
for (const id of subtree("q3")) users.forEach((u, i) => {
  const was = before.get(id)[i], now = access(u, id)[0];
  if (was !== "none" || now !== "none") { changes.push({ seq: changes.length + 1, id, user: u, kind: now === "none" ? "removed" : "changed" }); feedRows++; }
});
console.log(\`metadata rows written: 1, items whose access was recomputed: \${subtree("q3").length}, change-feed rows: \${feedRows}\`);
for (const [u, id] of [["bob", "plan"], ["carol", "budget"]]) console.log(show(u, id));

console.log("== 3. Bob syncs with his page token ==");
const feed = (user, token) => { const rows = changes.filter((c) => c.seq > token && c.user === user); return { rows, next: changes.length }; };
const f = feed("bob", 0);
for (const c of f.rows) console.log(\`seq \${c.seq}: \${items.get(c.id).name} \${c.kind}\`);
console.log(\`bob next page token: \${f.next}; alice sees \${feed("alice", 0).rows.length} changes\`);

console.log("== 4. Same move on a big folder: inherited vs copied-down ACLs ==");
for (const n of [10, 5000, 200000]) console.log(\`\${String(n).padStart(6)} files: inherited ACL writes 1 row; ACLs copied to every item write \${n + 1}; feed rows for 2 affected users \${2 * (n + 1)}\`);

console.log("== 5. Resumable upload: 1,000,000 bytes in 262,144-byte chunks ==");
const TOTAL = 1000000, CHUNK = 262144;
let persisted = 0;                             // server-side offset for this session URI
function putChunk(start, bytesArrived, finalChunk) {
  if (start !== persisted) return \`409 expected offset \${persisted}\`;
  const keep = finalChunk && bytesArrived === TOTAL - start ? bytesArrived : Math.floor(bytesArrived / CHUNK) * CHUNK;
  persisted += keep;
  return persisted === TOTAL ? "200 OK file created" : \`308 Range: bytes=0-\${persisted - 1}\`;
}
let off = 0, sent = 0, attempt = 0;
while (off < TOTAL) {
  const len = Math.min(CHUNK, TOTAL - off);
  const arrived = attempt === 2 ? 100000 : len;   // the third request is cut off after 100,000 bytes
  attempt++;
  sent += arrived;
  const res = putChunk(off, arrived, off + len === TOTAL);
  console.log(\`PUT bytes \${off}-\${off + len - 1}/\${TOTAL}\${arrived < len ? \` (dropped after \${arrived})\` : ""} -> \${res}\`);
  if (arrived < len) console.log(\`status query PUT bytes */\${TOTAL} -> 308 Range: bytes=0-\${persisted - 1}\`);
  off = persisted;
}
console.log(\`bytes sent \${sent}, wasted \${sent - TOTAL}\`);` },
          { tech: "python", code: `# Drive-style metadata: a folder tree of IDs, inherited sharing, a move that changes access, a change feed,
# and a resumable upload session.
ROLES = ["none", "reader", "commenter", "writer", "owner"]
items = {}  # id -> {name, parent, acl: {user: role}}
changes = []  # {seq, id, user, kind}


def add(id_, name, parent, acl=None):
    items[id_] = {"name": name, "parent": parent, "acl": acl or {}}


add("root", "My Drive", None, {"alice": "owner"})
add("team", "Team", "root", {"bob": "writer"})
add("q3", "Q3", "team")
add("plan", "plan.doc", "q3")
add("budget", "budget.xlsx", "q3", {"carol": "reader"})
add("priv", "Private", "root")


# Effective role = the strongest grant on the item or any ancestor. Returns (role, where it came from).
def access(user, id_):
    best, frm = "none", "-"
    cur = id_
    while cur:
        r = items[cur]["acl"].get(user)
        if r and ROLES.index(r) > ROLES.index(best):
            best, frm = r, items[cur]["name"]
        cur = items[cur]["parent"]
    return best, frm


def show(user, id_):
    r, f = access(user, id_)
    return f"{user} on {items[id_]['name']}: {r}{'' if r == 'none' else ' (via ' + f + ')'}"


def subtree(id_):
    out = [id_]
    for k in items:
        if items[k]["parent"] == id_:
            out += subtree(k)
    return out


print("== 1. Inherited permissions ==")
for u, i in [("bob", "plan"), ("carol", "budget"), ("carol", "plan"), ("alice", "budget")]:
    print(show(u, i))

print("== 2. Move Q3 from Team to Private (one parent pointer changes) ==")
users = ["alice", "bob", "carol"]
before = {i: [access(u, i)[0] for u in users] for i in subtree("q3")}
items["q3"]["parent"] = "priv"
feed_rows = 0
for i in subtree("q3"):
    for n, u in enumerate(users):
        was, now = before[i][n], access(u, i)[0]
        if was != "none" or now != "none":
            changes.append({"seq": len(changes) + 1, "id": i, "user": u, "kind": "removed" if now == "none" else "changed"})
            feed_rows += 1
print(f"metadata rows written: 1, items whose access was recomputed: {len(subtree('q3'))}, change-feed rows: {feed_rows}")
for u, i in [("bob", "plan"), ("carol", "budget")]:
    print(show(u, i))

print("== 3. Bob syncs with his page token ==")


def feed(user, token):
    return [c for c in changes if c["seq"] > token and c["user"] == user], len(changes)


rows, nxt = feed("bob", 0)
for c in rows:
    print(f"seq {c['seq']}: {items[c['id']]['name']} {c['kind']}")
print(f"bob next page token: {nxt}; alice sees {len(feed('alice', 0)[0])} changes")

print("== 4. Same move on a big folder: inherited vs copied-down ACLs ==")
for n in [10, 5000, 200000]:
    print(f"{n:>6} files: inherited ACL writes 1 row; ACLs copied to every item write {n + 1}; feed rows for 2 affected users {2 * (n + 1)}")

print("== 5. Resumable upload: 1,000,000 bytes in 262,144-byte chunks ==")
TOTAL, CHUNK = 1000000, 262144
persisted = 0  # server-side offset for this session URI


def put_chunk(start, arrived, final_chunk):
    global persisted
    if start != persisted:
        return f"409 expected offset {persisted}"
    keep = arrived if final_chunk and arrived == TOTAL - start else (arrived // CHUNK) * CHUNK
    persisted += keep
    return "200 OK file created" if persisted == TOTAL else f"308 Range: bytes=0-{persisted - 1}"


off = sent = attempt = 0
while off < TOTAL:
    ln = min(CHUNK, TOTAL - off)
    arrived = 100000 if attempt == 2 else ln  # the third request is cut off after 100,000 bytes
    attempt += 1
    sent += arrived
    res = put_chunk(off, arrived, off + ln == TOTAL)
    drop = f" (dropped after {arrived})" if arrived < ln else ""
    print(f"PUT bytes {off}-{off + ln - 1}/{TOTAL}{drop} -> {res}")
    if arrived < ln:
        print(f"status query PUT bytes */{TOTAL} -> 308 Range: bytes=0-{persisted - 1}")
    off = persisted
print(f"bytes sent {sent}, wasted {sent - TOTAL}")` },
        ],
      },
    ],
  },
];

export default augments;
