/**
 * AI Engineering — Batch 4 (reliability practices + embeddings/RAG intro).
 * Same gold conventions as batch 1. Picked up by `npm run augment:ai`.
 */
import type { AiAugment } from "./ai-augments.types";

const augments: AiAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you reduce hallucinations in a production LLM application?",
    answer: `**TL;DR.** Layer defenses: **ground** answers in retrieved context, give the model an explicit **abstain** path, require **citations**, lower temperature for factual tasks, and **verify** high-stakes outputs downstream. Measure **faithfulness** in evals so regressions surface.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Anti-hallucination pipeline: retrieve, ground with abstain option, cite, verify'>
  <rect class='d-box' x='16' y='45' width='96' height='50' rx='9'/><text class='d-text' x='64' y='66' text-anchor='middle'>retrieve</text><text class='d-sub' x='64' y='83' text-anchor='middle'>evidence in</text>
  <line class='d-edge' x1='112' y1='70' x2='128' y2='70'/><polygon class='d-arrow' points='128,65 136,70 128,75'/>
  <rect class='d-box-accent' x='138' y='45' width='96' height='50' rx='9'/><text class='d-text' x='186' y='66' text-anchor='middle'>ground</text><text class='d-sub' x='186' y='83' text-anchor='middle'>answer or abstain</text>
  <line class='d-edge' x1='234' y1='70' x2='250' y2='70'/><polygon class='d-arrow' points='250,65 258,70 250,75'/>
  <rect class='d-box' x='260' y='45' width='84' height='50' rx='9'/><text class='d-text' x='302' y='66' text-anchor='middle'>cite</text><text class='d-sub' x='302' y='83' text-anchor='middle'>[doc-3]</text>
  <line class='d-edge' x1='344' y1='70' x2='360' y2='70'/><polygon class='d-arrow' points='360,65 368,70 360,75'/>
  <rect class='d-box-muted' x='370' y='45' width='74' height='50' rx='9'/><text class='d-text' x='407' y='66' text-anchor='middle'>verify</text><text class='d-sub' x='407' y='83' text-anchor='middle'>checks</text>
  <text class='d-sub' x='230' y='128' text-anchor='middle'>each layer catches what the previous one missed — no single fix suffices</text>
</svg>

**How it works.** In practice the layers are: **(1) Grounding** — retrieve authoritative context and instruct "answer only from the provided documents"; most enterprise hallucinations are really missing-context problems. **(2) Abstention** — explicitly permit "I could not find this"; without an out, the model fills gaps with plausible fiction. **(3) Citations** — require source ids per claim and programmatically reject answers whose citations do not resolve; this converts trust into a checkable property. **(4) Decoding** — temperature near 0 for factual endpoints. **(5) Verification** — schema checks, code execution for generated code, cross-referencing extracted numbers against the source, or a second-model faithfulness check on sampled traffic. **(6) Evals** — a faithfulness metric on your golden set, so a prompt or model change that raises hallucination rate fails CI instead of reaching users. Product framing helps too: show sources in the UI so users can verify cheaply.

### Layer map
| Layer | Catches |
| --- | --- |
| Retrieval + grounding | knowledge gaps |
| Abstain instruction | unanswerable queries |
| Citations + resolution check | unsupported claims |
| Downstream verification | high-stakes errors |
| Faithfulness evals | regressions over time |

> **Interview tip:** Structure the answer as **prevent (ground) → permit (abstain) → prove (cite) → police (verify) → protect (evals)**. Interviewers reward the systems view over any single trick.`,
    examples: [
      {
        label: "Citation check that rejects unsupported answers",
        tech: "ts",
        runnable: false,
        code: `const reply = await answerFromDocs(question, docs);   // prompt requires [doc-N] cites

const cited = [...reply.matchAll(/\\[doc-(\\d+)\\]/g)].map((m) => Number(m[1]));
const valid = cited.length > 0 && cited.every((id) => docs.some((d) => d.id === id));

if (!valid) {
  metrics.increment("answer.rejected.no_valid_citations");
  return { text: "I could not verify an answer from the available documents.",
           escalate: true };
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you version, test and safely roll out prompt changes?",
    answer: `**TL;DR.** Treat prompts as **code**: version them in git or a registry, review changes, gate merges on an **eval suite**, roll out via **canary**, keep instant rollback. Small wording edits can regress distant behaviours — never hot-edit production prompts.

<svg class='iq-diagram' viewBox='0 0 460 140' role='img' aria-label='Prompt change flows through eval gate and canary rollout to production with rollback path'>
  <rect class='d-box' x='16' y='45' width='90' height='50' rx='9'/><text class='d-text' x='61' y='66' text-anchor='middle'>edit v42</text><text class='d-sub' x='61' y='83' text-anchor='middle'>PR + review</text>
  <line class='d-edge' x1='106' y1='70' x2='122' y2='70'/><polygon class='d-arrow' points='122,65 130,70 122,75'/>
  <rect class='d-box-accent' x='132' y='45' width='100' height='50' rx='9'/><text class='d-text' x='182' y='66' text-anchor='middle'>eval gate</text><text class='d-sub' x='182' y='83' text-anchor='middle'>golden set score</text>
  <line class='d-edge' x1='232' y1='70' x2='248' y2='70'/><polygon class='d-arrow' points='248,65 256,70 248,75'/>
  <rect class='d-box' x='258' y='45' width='90' height='50' rx='9'/><text class='d-text' x='303' y='66' text-anchor='middle'>canary 5%</text><text class='d-sub' x='303' y='83' text-anchor='middle'>live metrics</text>
  <line class='d-edge' x1='348' y1='70' x2='364' y2='70'/><polygon class='d-arrow' points='364,65 372,70 364,75'/>
  <rect class='d-box-muted' x='374' y='45' width='70' height='50' rx='9'/><text class='d-text' x='409' y='66' text-anchor='middle'>100%</text><text class='d-sub' x='409' y='83' text-anchor='middle'>rollback ready</text>
  <path class='d-edge-dashed' d='M 409 95 L 409 120 L 61 120 L 61 95'/>
  <text class='d-sub' x='235' y='133' text-anchor='middle'>rollback = repoint to v41 (config change, not a deploy)</text>
</svg>

**How it works.** **Versioning:** prompts live in the repo (or a registry with ids like <code>support-triage@v42</code>), rendered from templates with typed variables; the exact version is logged on every request so any output is reproducible. **Testing:** the golden dataset runs on every change — code graders for hard constraints, LLM-judge for quality — and the PR shows the **score delta**, per-slice, against baseline; three cherry-picked examples in a playground do not count. **Rollout:** ship dark (shadow traffic comparison) or canary a small percentage, watch quality proxies (thumbs-down, retry rate, guardrail triggers) and cost/latency, then promote. **Rollback** must be a config repoint, not a code deploy. The cultural point matters most: prompts have **non-local effects** — a tweak to fix one complaint can break five other behaviours, which is exactly what eval gates exist to catch.

### Prompt-as-code checklist
| Practice | Anti-pattern it kills |
| --- | --- |
| Registry + version ids | "which prompt was live?" mysteries |
| Eval gate in CI | vibes-tested changes |
| Canary + proxy metrics | big-bang regressions |
| Version logged per request | unreproducible bug reports |

> **Interview tip:** The phrase **"no prompt change ships without an eval delta"** summarizes the whole discipline. Mention non-local effects — it is why prompt engineering needs regression tests at all.`,
    examples: [
      {
        label: "Eval-gated CI for a prompt PR",
        tech: "bash",
        runnable: false,
        code: `# .github/workflows/prompt-ci.yml (essence)
npm run eval -- --prompt support-triage@HEAD --dataset golden/triage.jsonl \\
  --baseline main --report eval-report.md

# fails the build if any tracked metric drops beyond threshold:
#   accuracy      0.91 -> 0.92   OK
#   faithfulness  0.97 -> 0.89   FAIL (-0.08 > 0.02 tolerance)`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are embeddings and what are they used for?",
    answer: `**TL;DR.** An embedding is a **dense vector** representing text (or images/code) such that **similar meaning → nearby points**. Similarity becomes geometry, powering **semantic search, RAG, dedup, clustering, classification and recommendations**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Semantically similar phrases cluster near each other in vector space while unrelated text sits far away'>
  <rect class='d-box-muted' x='150' y='16' width='294' height='120' rx='10'/>
  <text class='d-sub' x='297' y='34' text-anchor='middle'>vector space</text>
  <circle class='d-accent' cx='230' cy='70' r='5'/><text class='d-sub' x='230' y='56' text-anchor='middle'>reset my password</text>
  <circle class='d-accent' cx='262' cy='92' r='5'/><text class='d-sub' x='270' y='112' text-anchor='middle'>forgot login credentials</text>
  <circle class='d-arrow' cx='396' cy='58' r='5'/><text class='d-sub' x='396' y='44' text-anchor='middle'>pizza recipe</text>
  <line class='d-edge-accent' x1='230' y1='70' x2='262' y2='92'/>
  <rect class='d-box' x='16' y='52' width='96' height='40' rx='8'/><text class='d-text' x='64' y='69' text-anchor='middle'>text</text><text class='d-sub' x='64' y='84' text-anchor='middle'>embed( )</text>
  <line class='d-edge' x1='112' y1='72' x2='140' y2='72'/><polygon class='d-arrow' points='140,67 148,72 140,77'/>
</svg>

**How it works.** A dedicated **embedding model** (not the chat model) maps input to a fixed-length vector — hundreds to a few thousand dimensions — trained contrastively so paraphrases land close and unrelated text far apart. Closeness is measured with **cosine similarity**. Everything downstream is geometry: **semantic search** embeds the query and finds nearest document vectors; **RAG** uses that to select context; **dedup/clustering** group nearby vectors; **classification** can be a similarity vote against labeled examples; **recommendations** match user and item vectors. Operational facts interviewers probe: vectors from **different models are incompatible** (re-embed everything when you switch — version your index), embeddings are computed **once at index time** (cheap at query time), many models embed queries and documents with different task prefixes, and Matryoshka-style models let you truncate dimensions to trade recall for storage.

### Where embeddings show up
| Use case | Pattern |
| --- | --- |
| Semantic search / RAG | query vector vs chunk vectors |
| Deduplication | near-identical vectors merged |
| Clustering / topics | group nearby vectors |
| Few-shot routing | nearest labeled example wins |

> **Interview tip:** Lead with **"meaning becomes geometry"**, name cosine similarity, and drop one ops detail — model-version lock-in of an index — to show you have shipped this, not just read about it.`,
    examples: [
      {
        label: "Embed once, search by cosine",
        tech: "python",
        runnable: false,
        code: `import numpy as np

def cosine(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

doc_vecs = embed_model.embed([d.text for d in docs])      # index time, stored
q = embed_model.embed(["how do I reset my password"])[0]  # query time

ranked = sorted(zip(docs, doc_vecs), key=lambda p: -cosine(q, p[1]))
top3 = [d.title for d, _ in ranked[:3]]`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does similarity search work — cosine, dot product and Euclidean?",
    answer: `**TL;DR.** **Cosine** compares direction (angle), ignoring magnitude — the default for text embeddings. **Dot product** equals cosine on unit-normalized vectors; **Euclidean** measures straight-line distance. Exact search is O(n), so real systems use **ANN indexes** (HNSW, IVF) trading a little recall for huge speed.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Cosine measures the angle between vectors; ANN indexes avoid comparing the query against every vector'>
  <line class='d-edge' x1='40' y1='120' x2='40' y2='30'/><line class='d-edge' x1='40' y1='120' x2='180' y2='120'/>
  <line class='d-edge-accent' x1='40' y1='120' x2='150' y2='50'/><text class='d-sub' x='158' y='44'>doc A</text>
  <line class='d-edge-accent' x1='40' y1='120' x2='170' y2='75'/><text class='d-sub' x='178' y='72'>query</text>
  <line class='d-edge-dashed' x1='40' y1='120' x2='95' y2='112'/><text class='d-sub' x='115' y='116'>doc B</text>
  <path class='d-edge' d='M 75 96 A 30 30 0 0 1 82 101'/>
  <text class='d-sub' x='95' y='92'>θ small = similar</text>
  <rect class='d-box-muted' x='240' y='30' width='204' height='100' rx='10'/>
  <text class='d-text' x='342' y='54' text-anchor='middle'>ANN index (HNSW)</text>
  <text class='d-sub' x='342' y='76' text-anchor='middle'>navigable graph of vectors</text>
  <text class='d-sub' x='342' y='94' text-anchor='middle'>hops toward the neighborhood</text>
  <text class='d-sub' x='342' y='112' text-anchor='middle'>~logarithmic, ~95-99% recall</text>
</svg>

**How it works.** Text embedding models are typically trained for cosine, and most pipelines **normalize vectors to unit length**, making cosine and dot product identical (dot is then preferred — cheaper, no norm division) and Euclidean rank-equivalent. So the metric choice matters less than **matching the metric the model was trained for** and being consistent between indexing and querying. The scaling story: comparing a query against millions of vectors exactly is O(n·d); **HNSW** builds a multi-layer navigable small-world graph and greedily hops toward the query's neighborhood (great recall/latency, memory-hungry); **IVF** clusters vectors and probes only the nearest partitions; **product quantization** compresses vectors for memory-bound scale. All are approximate — measure **recall@k against exact search** on your data before trusting an index, and remember metadata filters interact with ANN (filtered-HNSW is its own engineering topic).

### Metric cheat sheet
| Metric | Measures | Use when |
| --- | --- | --- |
| Cosine | angle | text embeddings (default) |
| Dot product | angle x magnitude | normalized vectors (fastest) |
| Euclidean | distance | spatial/image features |

> **Interview tip:** Two senior signals: **"normalized cosine and dot product are the same thing"**, and naming HNSW as the reason vector search is sublinear — with the caveat that ANN recall should be validated, not assumed.`,
    examples: [
      {
        label: "pgvector: metric operators and an HNSW index",
        tech: "bash",
        runnable: false,
        code: `-- cosine distance operator: <=>   (dot: <#>, euclidean: <->)
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);

SELECT id, title, 1 - (embedding <=> $1) AS similarity
FROM chunks
WHERE tenant_id = $2            -- filter + ANN together
ORDER BY embedding <=> $1
LIMIT 10;`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is a vector database and when do you actually need one?",
    answer: `**TL;DR.** A vector DB stores embeddings with **ANN indexes plus filtering, CRUD and scaling**. But under ~100k vectors a flat search is fine, and **pgvector** keeps vectors next to your relational data. Reach for a dedicated engine at **millions of vectors, high QPS, or heavy filtered search**.

<svg class='iq-diagram' viewBox='0 0 460 140' role='img' aria-label='Storage ladder from in-memory arrays through pgvector to dedicated vector databases as scale grows'>
  <rect class='d-box' x='16' y='40' width='128' height='54' rx='10'/><text class='d-text' x='80' y='62' text-anchor='middle'>in-memory</text><text class='d-sub' x='80' y='80' text-anchor='middle'>&lt;100k vectors</text>
  <line class='d-edge' x1='144' y1='67' x2='166' y2='67'/><polygon class='d-arrow' points='166,62 174,67 166,72'/>
  <rect class='d-box-accent' x='176' y='40' width='128' height='54' rx='10'/><text class='d-text' x='240' y='62' text-anchor='middle'>pgvector / SQLite</text><text class='d-sub' x='240' y='80' text-anchor='middle'>up to low millions</text>
  <line class='d-edge' x1='304' y1='67' x2='326' y2='67'/><polygon class='d-arrow' points='326,62 334,67 326,72'/>
  <rect class='d-box-muted' x='336' y='40' width='108' height='54' rx='10'/><text class='d-text' x='390' y='62' text-anchor='middle'>dedicated DB</text><text class='d-sub' x='390' y='80' text-anchor='middle'>many M, high QPS</text>
  <text class='d-sub' x='230' y='122' text-anchor='middle'>start left; move right only when measurements force you</text>
</svg>

**How it works.** Dedicated engines (Pinecone, Qdrant, Weaviate, Milvus) offer tuned HNSW/IVF indexes, **metadata filtering fused with ANN**, hybrid (sparse+dense) search, replication and horizontal scale. The honest sizing conversation: at 50k×1536-dim vectors, exact NumPy search runs in milliseconds — a vector DB adds operational surface for nothing. **pgvector** is the pragmatic middle: vectors live beside the rows they describe, so tenant filters are SQL <code>WHERE</code> clauses, updates are transactional (no drift between your DB and a second store), and backups/migrations reuse existing muscle. Choose a dedicated engine when measurements demand it: tens of millions of vectors, strict latency at high QPS, heavy selective filtering at scale, or built-in hybrid retrieval. The most common architecture mistake is the reverse: adopting a second stateful system on day one and then debugging **sync drift** between Postgres and the vector store.

### Decision table
| Scale / need | Choice |
| --- | --- |
| Prototype, &lt;100k vectors | in-memory / flat file |
| Product with relational data | pgvector |
| 10M+ vectors, high QPS | dedicated engine |
| Consistency with source-of-truth rows | pgvector (transactional) |

> **Interview tip:** The mature answer is a ladder, not a brand: **"flat → pgvector → dedicated, promoted by measurement"** — and name sync drift as the hidden cost of a separate vector store.`,
    examples: [
      {
        label: "pgvector schema keeping vectors beside the data",
        tech: "bash",
        runnable: false,
        code: `CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  id         bigserial PRIMARY KEY,
  doc_id     bigint REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id  bigint NOT NULL,
  content    text NOT NULL,
  embedding  vector(1536) NOT NULL
);
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
-- one transaction updates document + chunks: no cross-store drift`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is RAG and why use it instead of fine-tuning for knowledge?",
    answer: `**TL;DR.** **Retrieval-Augmented Generation**: retrieve relevant documents for the query and put them in the prompt so the model answers **from evidence**. For knowledge it beats fine-tuning on every axis that matters: **instantly updateable, auditable via citations, per-tenant scopable, cheaper**. Fine-tune for behaviour, RAG for facts.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='RAG pipeline: query is embedded, nearest chunks retrieved from the index and passed with the question to the model'>
  <rect class='d-box' x='16' y='52' width='84' height='44' rx='9'/><text class='d-text' x='58' y='71' text-anchor='middle'>query</text><text class='d-sub' x='58' y='87' text-anchor='middle'>embed</text>
  <line class='d-edge' x1='100' y1='74' x2='120' y2='74'/><polygon class='d-arrow' points='120,69 128,74 120,79'/>
  <rect class='d-box' x='130' y='52' width='96' height='44' rx='9'/><text class='d-text' x='178' y='71' text-anchor='middle'>index</text><text class='d-sub' x='178' y='87' text-anchor='middle'>top-k chunks</text>
  <line class='d-edge' x1='226' y1='74' x2='246' y2='74'/><polygon class='d-arrow' points='246,69 254,74 246,79'/>
  <rect class='d-box-accent' x='256' y='52' width='96' height='44' rx='9'/><text class='d-text' x='304' y='71' text-anchor='middle'>LLM</text><text class='d-sub' x='304' y='87' text-anchor='middle'>context + question</text>
  <line class='d-edge' x1='352' y1='74' x2='372' y2='74'/><polygon class='d-arrow' points='372,69 380,74 372,79'/>
  <rect class='d-box-muted' x='382' y='52' width='62' height='44' rx='9'/><text class='d-text' x='413' y='71' text-anchor='middle'>answer</text><text class='d-sub' x='413' y='87' text-anchor='middle'>+ cites</text>
  <text class='d-sub' x='230' y='128' text-anchor='middle'>offline: docs → chunk → embed → index    |    online: the flow above</text>
</svg>

**How it works.** **Offline**, documents are chunked, embedded and indexed. **Online**, the query is embedded, top-k relevant chunks retrieved (often hybrid + reranked), assembled into the prompt with grounding instructions, and the model answers with citations. Why it wins for knowledge: **freshness** (reindex a doc and the next answer reflects it — no training run), **auditability** (citations make claims checkable), **access control** (retrieval filters enforce per-tenant/per-role visibility — impossible to enforce inside fine-tuned weights), **capacity** (corpus size is bounded by the index, not the context window), and **cost**. Fine-tuning stores knowledge diffusely and unreliably, cannot delete or scope it (think GDPR), and goes stale immediately. The standard architecture line: **RAG for knowledge, prompting/fine-tuning for form** — and know the limits too: RAG is only as good as retrieval, and questions requiring synthesis across many documents strain top-k retrieval.

### RAG vs fine-tuning for knowledge
| Axis | RAG | Fine-tuning |
| --- | --- | --- |
| Update speed | reindex, instant | retraining run |
| Auditability | citations | none |
| Per-tenant scoping | retrieval filters | impossible |
| Deletion (compliance) | remove from index | cannot unlearn |

> **Interview tip:** Nail the two-phase description (offline indexing, online retrieve-augment-generate), then the killer argument: **access control and deletion are structurally impossible in weights** — that alone decides most enterprise designs.`,
    examples: [
      {
        label: "Minimal RAG answer path",
        tech: "ts",
        runnable: false,
        code: `async function answer(question: string, tenantId: string) {
  const qVec = await embed(question);
  const chunks = await db.chunks.nearest(qVec, {
    where: { tenantId },            // access control lives HERE
    limit: 6,
  });
  const context = chunks.map((c, i) => "<doc id='" + i + "'>" + c.content + "</doc>").join("\\n");
  return complete({
    system: "Answer only from the docs. Cite [doc-N]. Say so if not found.",
    user: context + "\\n\\nQuestion: " + question,
  });
}`,
      },
    ],
  },
];

export default augments;
