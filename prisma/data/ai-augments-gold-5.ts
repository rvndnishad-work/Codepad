/**
 * AI Engineering — Batch 5 (RAG deep-dive: chunking, hybrid, reranking,
 * evaluation, debugging, multi-tenancy). Same gold conventions as batch 1.
 */
import type { AiAugment } from "./ai-augments.types";

const augments: AiAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What chunking strategies exist and how does chunk size affect RAG quality?",
    answer: `**TL;DR.** Chunking decides what your retriever can ever return. Options: **fixed token windows** (+overlap), **structure-aware splits** (headings, paragraphs, code blocks), and **parent-child** (embed small, return big). Small chunks match precisely but fragment meaning; large chunks keep context but dilute embeddings. Start ~**300-800 tokens, 10-20% overlap**, respect structure — then tune with retrieval evals.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Small chunks give precise matches but fragments; large chunks keep context but dilute; parent-child embeds small and returns the parent'>
  <rect class='d-box' x='16' y='30' width='130' height='92' rx='10'/><text class='d-text' x='81' y='52' text-anchor='middle'>small chunks</text>
  <rect class='d-box-muted' x='30' y='62' width='102' height='12' rx='4'/><rect class='d-box-muted' x='30' y='78' width='102' height='12' rx='4'/><rect class='d-box-muted' x='30' y='94' width='102' height='12' rx='4'/>
  <text class='d-sub' x='81' y='138' text-anchor='middle'>precise, fragmented</text>
  <rect class='d-box' x='166' y='30' width='130' height='92' rx='10'/><text class='d-text' x='231' y='52' text-anchor='middle'>large chunks</text>
  <rect class='d-box-muted' x='180' y='62' width='102' height='44' rx='4'/>
  <text class='d-sub' x='231' y='138' text-anchor='middle'>contextual, diluted</text>
  <rect class='d-box-accent' x='316' y='30' width='128' height='92' rx='10'/><text class='d-text' x='380' y='52' text-anchor='middle'>parent-child</text>
  <rect class='d-box-muted' x='330' y='62' width='100' height='44' rx='4'/>
  <rect class='d-box' x='338' y='70' width='36' height='12' rx='3'/>
  <text class='d-sub' x='380' y='120' text-anchor='middle'>match small</text>
  <text class='d-sub' x='380' y='138' text-anchor='middle'>return parent</text>
</svg>

**How it works.** The embedding of a chunk is an **average of its meanings**: pack three topics into one chunk and its vector sits between them, matching none well; split mid-sentence and the answer needle straddles a boundary no query can hit (overlap is the patch for that). **Structure-aware** splitting keeps semantic units intact — never split a code block, keep a table with its caption, split on headings first. **Parent-child** decouples the two jobs: embed precise child spans for matching, hand the model the parent section for context. Enrichment helps more than people expect: prepend the document title/section path to each chunk ("Refund policy &gt; EU customers: ..."), or contextual summaries, so chunks are interpretable standalone. Chunking is set at **index time** — changing it means re-embedding the corpus — so evaluate options early with recall@k on a labeled query set rather than re-chunking in production by vibe.

### Strategy guide
| Content | Strategy |
| --- | --- |
| Prose / docs | split by headings, then ~500 tokens + overlap |
| Code | split by function/class, never mid-block |
| FAQs / tickets | one Q&A per chunk |
| Long legal/manuals | parent-child |

> **Interview tip:** Explain **why** size matters (embedding dilution vs fragmentation), name parent-child as the have-both pattern, and mention title-path enrichment — it is the cheapest retrieval-quality win in practice.`,
    examples: [
      {
        label: "Structure-aware chunking with context header",
        tech: "python",
        runnable: false,
        code: `def chunk_doc(doc):
    for section in split_by_headings(doc.markdown):        # structure first
        path = " > ".join(section.heading_path)            # "Refunds > EU"
        for piece in window(section.text, tokens=500, overlap=60):
            yield {
                "text": path + ": " + piece,               # self-describing chunk
                "doc_id": doc.id,
                "parent": section.id,                      # return this at answer time
            }`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is hybrid search and why combine BM25 with vector search?",
    answer: `**TL;DR.** Run **BM25 keyword search** and **vector search** in parallel and fuse the rankings (usually **Reciprocal Rank Fusion**). Vectors understand paraphrase but miss exact identifiers; BM25 nails exact terms but not meaning. Fusion raises recall on both query types — the default for serious RAG.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Query fans out to BM25 and vector search whose ranked lists are fused with RRF'>
  <rect class='d-box' x='16' y='56' width='80' height='40' rx='9'/><text class='d-text' x='56' y='80' text-anchor='middle'>query</text>
  <line class='d-edge' x1='96' y1='66' x2='136' y2='44'/><polygon class='d-arrow' points='134,40 144,41 137,49'/>
  <line class='d-edge' x1='96' y1='86' x2='136' y2='108'/><polygon class='d-arrow' points='137,103 144,111 134,112'/>
  <rect class='d-box-muted' x='146' y='24' width='120' height='40' rx='9'/><text class='d-text' x='206' y='41' text-anchor='middle'>BM25</text><text class='d-sub' x='206' y='56' text-anchor='middle'>exact terms, ids</text>
  <rect class='d-box-muted' x='146' y='88' width='120' height='40' rx='9'/><text class='d-text' x='206' y='105' text-anchor='middle'>vector</text><text class='d-sub' x='206' y='120' text-anchor='middle'>paraphrase, intent</text>
  <line class='d-edge' x1='266' y1='44' x2='306' y2='66'/><line class='d-edge' x1='266' y1='108' x2='306' y2='86'/><polygon class='d-arrow' points='305,70 313,76 303,79'/>
  <rect class='d-box-accent' x='314' y='56' width='70' height='40' rx='9'/><text class='d-text' x='349' y='80' text-anchor='middle'>RRF</text>
  <line class='d-edge' x1='384' y1='76' x2='404' y2='76'/><polygon class='d-arrow' points='404,71 412,76 404,81'/>
  <rect class='d-box' x='414' y='56' width='30' height='40' rx='7'/><text class='d-sub' x='429' y='80' text-anchor='middle'>top k</text>
</svg>

**How it works.** The two retrievers have **complementary blind spots**. Ask "how do I fix error E4021 in the flux capacitor?" — the embedding of a rare error code carries little signal, and vector search happily returns generic troubleshooting text; BM25 matches <code>E4021</code> exactly. Ask "my payment keeps getting declined" — BM25 finds documents containing "declined", missing the page titled "card authorization failures"; vector search bridges the vocabulary gap. **RRF** fuses without score calibration: each document scores the sum of <code>1/(k + rank)</code> across lists (k≈60), so items ranked well by both float to the top and neither retriever's raw score scale matters. Most engines (OpenSearch, Qdrant, Weaviate, pgvector + tsvector) support the pattern natively. Production notes: hybrid is near-strictly-better than either alone on mixed traffic; follow it with a **reranker** for precision; and keep both indexes in one system when possible to avoid double ingestion pipelines.

### Complementary failures
| Query type | BM25 | Vector |
| --- | --- | --- |
| Error codes, SKUs, names | ✔ exact | ✘ weak signal |
| Paraphrased intent | ✘ vocabulary gap | ✔ semantic |
| Rare domain jargon | ✔ | depends on training |

> **Interview tip:** Give one concrete example per blind spot (error code vs paraphrase) and write the RRF formula — rank-based fusion needing **no score normalization** is exactly the detail that shows depth.`,
    examples: [
      {
        label: "Reciprocal Rank Fusion",
        tech: "ts",
        runnable: false,
        code: `function rrf(lists: string[][], k = 60): string[] {
  const score = new Map<string, number>();
  for (const list of lists)
    list.forEach((id, rank) =>
      score.set(id, (score.get(id) ?? 0) + 1 / (k + rank + 1)));
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

const fused = rrf([await bm25(q, 50), await vector(q, 50)]).slice(0, 20);`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is reranking and why add it after retrieval?",
    answer: `**TL;DR.** A **cross-encoder** reranker scores each (query, document) pair **jointly** — far more accurate than embedding comparison, far too slow for the whole corpus. So: fast retrieval pulls top-50/100 (**recall**), the reranker reorders and you keep 5-10 (**precision**). Usually the biggest retrieval upgrade per line of code.

<svg class='iq-diagram' viewBox='0 0 460 140' role='img' aria-label='Two-stage retrieval: cheap ANN recall over millions, then cross-encoder precision over dozens'>
  <rect class='d-box-muted' x='16' y='40' width='120' height='56' rx='10'/><text class='d-text' x='76' y='62' text-anchor='middle'>corpus</text><text class='d-sub' x='76' y='80' text-anchor='middle'>millions of chunks</text>
  <line class='d-edge' x1='136' y1='68' x2='168' y2='68'/><polygon class='d-arrow' points='168,63 176,68 168,73'/>
  <text class='d-sub' x='152' y='56' text-anchor='middle'>ANN</text>
  <rect class='d-box' x='178' y='40' width='104' height='56' rx='10'/><text class='d-text' x='230' y='62' text-anchor='middle'>top 100</text><text class='d-sub' x='230' y='80' text-anchor='middle'>recall stage</text>
  <line class='d-edge' x1='282' y1='68' x2='314' y2='68'/><polygon class='d-arrow' points='314,63 322,68 314,73'/>
  <text class='d-sub' x='298' y='56' text-anchor='middle'>rerank</text>
  <rect class='d-box-accent' x='324' y='40' width='120' height='56' rx='10'/><text class='d-text' x='384' y='62' text-anchor='middle'>top 5-10</text><text class='d-sub' x='384' y='80' text-anchor='middle'>precision stage</text>
  <text class='d-sub' x='230' y='124' text-anchor='middle'>bi-encoder: vectors meet only at comparison · cross-encoder: full attention over the pair</text>
</svg>

**How it works.** Embedding retrieval is a **bi-encoder**: query and document are embedded independently and meet only at a dot product — all nuance must survive compression into one fixed vector per side. A **cross-encoder** feeds query and document through the model **together**, letting attention connect "it" in the query to the entity in the document, catch negations, and weigh which part of a long chunk actually answers. That costs a full model forward pass per pair — fine for 100 candidates (tens of ms with hosted rerankers like Cohere/Voyage or open ones like bge-reranker), impossible for 10M. The two-stage design gets both properties. Practical notes: rerankers also produce **calibrated relevance scores**, so you can set a floor and send *nothing* when nothing is relevant (better than feeding the model junk); an LLM-as-reranker works too but costs more; and reranking softens chunking imperfections since it sees full text, not compressed vectors.

### Bi-encoder vs cross-encoder
| | Bi-encoder | Cross-encoder |
| --- | --- | --- |
| Scoring | dot product of two vectors | joint forward pass |
| Speed | millions/sec (precomputed) | ~100s/sec |
| Accuracy | good | best |
| Role | recall stage | precision stage |

> **Interview tip:** The architecture soundbite: **"bi-encoder for recall, cross-encoder for precision"**. Bonus point: use the reranker score threshold to detect "no relevant docs" and abstain instead of hallucinating.`,
    examples: [
      {
        label: "Two-stage retrieval with a score floor",
        tech: "ts",
        runnable: false,
        code: `const candidates = await hybridSearch(query, { limit: 80 });

const scored = await reranker.rank({
  query,
  documents: candidates.map((c) => c.text),
  topN: 8,
});

const kept = scored.filter((r) => r.relevance > 0.35);   // calibrated floor
if (kept.length === 0) return abstain();                 // no junk context
return kept.map((r) => candidates[r.index]);`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you evaluate a RAG pipeline end to end?",
    answer: `**TL;DR.** Evaluate the **two stages separately**. Retrieval: labeled (query → relevant chunk) pairs scored with **recall@k, precision@k, MRR/nDCG**. Generation: with retrieval held fixed, judge **faithfulness, relevance, completeness** (LLM judge validated against humans). End-to-end accuracy alone cannot tell a retrieval miss from a hallucinating generator.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='RAG evaluation split into a retrieval stage with ranking metrics and a generation stage with faithfulness metrics'>
  <rect class='d-box-muted' x='16' y='24' width='206' height='100' rx='10'/>
  <text class='d-text' x='119' y='48' text-anchor='middle'>stage 1: retrieval</text>
  <text class='d-sub' x='119' y='70' text-anchor='middle'>labels: query → gold chunks</text>
  <text class='d-sub' x='119' y='88' text-anchor='middle'>recall@k · precision@k</text>
  <text class='d-sub' x='119' y='106' text-anchor='middle'>MRR · nDCG</text>
  <rect class='d-box-accent' x='238' y='24' width='206' height='100' rx='10'/>
  <text class='d-text' x='341' y='48' text-anchor='middle'>stage 2: generation</text>
  <text class='d-sub' x='341' y='70' text-anchor='middle'>fixed context → answer</text>
  <text class='d-sub' x='341' y='88' text-anchor='middle'>faithfulness · relevance</text>
  <text class='d-sub' x='341' y='106' text-anchor='middle'>completeness · abstain-correctness</text>
  <text class='d-sub' x='230' y='142' text-anchor='middle'>separate scores localize failures; a single end-to-end number cannot</text>
</svg>

**How it works.** **Retrieval eval:** build ~100+ labeled queries (mine real traffic; have experts mark which chunks answer each). **Recall@k** — is a gold chunk in the top k you pass to the model? — is the metric that gates everything downstream: if recall@6 is 60%, no prompt magic saves you. MRR/nDCG add rank sensitivity. This eval is **cheap and deterministic** — run it on every chunking/embedding/reranker change. **Generation eval:** freeze retrieved context per case, then grade: **faithfulness** (every claim supported by the context — the anti-hallucination metric), **answer relevance** (addresses the question), **completeness** (uses what the context offers), plus **abstain-correctness** on deliberately-unanswerable queries (does it say "not found" rather than invent?). Use rubric-anchored LLM-judge, spot-validated against human labels. Frameworks (Ragas, TruLens) package these, but the labeled retrieval set is the part you cannot skip. Diagnosis matrix: low recall → fix chunking/hybrid/reranking; high recall + low faithfulness → fix prompt/model; both high but users unhappy → your labels do not represent real traffic.

### Metric map
| Stage | Metric | Catches |
| --- | --- | --- |
| Retrieval | recall@k | missing evidence |
| Retrieval | MRR/nDCG | poor ranking |
| Generation | faithfulness | hallucination |
| Generation | abstain-correctness | invented answers |

> **Interview tip:** Lead with **"separate the stages"** and name recall@k as the ceiling on system quality. The abstain-correctness slice (unanswerable queries in the golden set) is the detail most candidates miss.`,
    examples: [
      {
        label: "Retrieval eval: recall@k over a labeled set",
        tech: "python",
        runnable: false,
        code: `def recall_at_k(cases, retriever, k=6):
    hits = 0
    for case in cases:                       # {"query": ..., "gold_chunk_ids": [...]}
        got = {c.id for c in retriever(case["query"], k=k)}
        if got & set(case["gold_chunk_ids"]):
            hits += 1
    return hits / len(cases)

# run on every index/chunking/reranker change:
# recall@6  baseline 0.71 → candidate 0.83   <- ship
# recall@6  baseline 0.71 → candidate 0.64   <- do not ship, whatever the demo showed`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are common RAG failure modes and how do you debug them?",
    answer: `**TL;DR.** The big four: **answer never retrieved** (vocabulary mismatch, bad chunking, wrong k), **retrieved but ignored** (buried mid-context, conflicting chunks), **stale/duplicate index**, and **multi-hop questions** top-k cannot serve. Debug by **logging the retrieved set per query** and triaging: gold chunk absent → retrieval problem; present but unused → generation problem.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Triage tree: was the gold chunk retrieved; if no fix retrieval, if yes fix generation'>
  <rect class='d-box-accent' x='150' y='16' width='160' height='40' rx='9'/><text class='d-text' x='230' y='40' text-anchor='middle'>gold chunk in top-k?</text>
  <line class='d-edge' x1='190' y1='56' x2='120' y2='84'/><polygon class='d-arrow' points='122,80 114,88 118,77'/>
  <line class='d-edge' x1='270' y1='56' x2='340' y2='84'/><polygon class='d-arrow' points='336,77 346,88 338,80'/>
  <text class='d-sub' x='140' y='72'>no</text><text class='d-sub' x='312' y='72'>yes</text>
  <rect class='d-box-muted' x='20' y='88' width='200' height='48' rx='9'/>
  <text class='d-text' x='120' y='108' text-anchor='middle'>retrieval problem</text>
  <text class='d-sub' x='120' y='126' text-anchor='middle'>chunking · hybrid · rerank · k · stale index</text>
  <rect class='d-box-muted' x='240' y='88' width='200' height='48' rx='9'/>
  <text class='d-text' x='340' y='108' text-anchor='middle'>generation problem</text>
  <text class='d-sub' x='340' y='126' text-anchor='middle'>ordering · fewer chunks · grounding prompt</text>
</svg>

**How it works.** **Retrieval misses** come from vocabulary gaps (users say "money back", docs say "refund" — add hybrid search), fragmentation (the fact straddles a chunk boundary — fix chunking/overlap), embedding blind spots (rare codes — BM25 side), or the answer simply not being indexed (**check this first**; teams debug prompts for days when ingestion silently skipped a PDF). **Ignored context** shows up as high recall but wrong answers: the gold chunk sits mid-list among ten others (**lost in the middle** — rerank and send fewer, better-ordered chunks), or a stale duplicate contradicts it (dedup at index time; prefer recency in ranking). **Structural failures**: "compare X across all 50 policies" cannot be served by top-6 retrieval — needs query decomposition, aggregation pipelines, or corpus summaries. The debugging discipline: **log query, retrieved ids+scores, and answer for every request**; failures then become data — cluster them, label the gold chunks, extend the eval set, fix the dominant class first.

### Failure → fix
| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "Not found" but doc exists | vocabulary gap / not ingested | hybrid search; audit ingestion |
| Wrong answer, right doc retrieved | buried or conflicting context | rerank, top-3, dedup |
| Answers went stale | index not refreshed | incremental reindex + TTL |
| Multi-doc synthesis wrong | top-k structurally insufficient | decompose query / aggregate offline |

> **Interview tip:** Give the triage question — **"was the gold chunk retrieved?"** — as your first move. It splits the entire failure space in two and shows you debug systematically, not by prompt-tweaking in the dark.`,
    examples: [
      {
        label: "Per-request retrieval logging for triage",
        tech: "ts",
        runnable: false,
        code: `const chunks = await retrieve(query, { k: 8 });
const reply = await generate(query, chunks);

await log.rag({
  query,
  retrieved: chunks.map((c) => ({ id: c.id, score: c.score, doc: c.docId })),
  answer: reply.text,
  feedback: null,               // filled by thumbs up/down later
});
// weekly: cluster thumbs-down rows by "gold chunk retrieved?" → fix the bigger pile`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you scope retrieval with metadata filtering and multi-tenancy?",
    answer: `**TL;DR.** Store **tenant id, ACLs and attributes** beside each vector and apply them as **pre-filters inside the ANN query** — users can only retrieve chunks they are authorized to see. Access control lives in **retrieval**, never in the prompt ("do not reveal other tenants" is not a security boundary).

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Query with tenant filter passes through a filtered ANN index so only authorized chunks reach the model'>
  <rect class='d-box' x='16' y='50' width='110' height='50' rx='9'/><text class='d-text' x='71' y='70' text-anchor='middle'>query</text><text class='d-sub' x='71' y='88' text-anchor='middle'>tenant=42, role=hr</text>
  <line class='d-edge' x1='126' y1='75' x2='158' y2='75'/><polygon class='d-arrow' points='158,70 166,75 158,80'/>
  <rect class='d-box-accent' x='168' y='36' width='130' height='78' rx='10'/>
  <text class='d-text' x='233' y='60' text-anchor='middle'>filtered ANN</text>
  <text class='d-sub' x='233' y='80' text-anchor='middle'>WHERE tenant_id=42</text>
  <text class='d-sub' x='233' y='98' text-anchor='middle'>AND acl ⊇ role</text>
  <line class='d-edge' x1='298' y1='75' x2='330' y2='75'/><polygon class='d-arrow' points='330,70 338,75 330,80'/>
  <rect class='d-box-muted' x='340' y='50' width='104' height='50' rx='9'/><text class='d-text' x='392' y='70' text-anchor='middle'>authorized</text><text class='d-sub' x='392' y='88' text-anchor='middle'>chunks only → LLM</text>
  <text class='d-sub' x='230' y='138' text-anchor='middle'>the model can never leak what retrieval never returned</text>
</svg>

**How it works.** The invariant: **the model can only leak what enters its context**, so enforce authorization at the retrieval boundary — a <code>WHERE</code> clause in pgvector, a filter object in Pinecone/Qdrant — derived **server-side from the session**, never from model- or user-supplied values. **Pre-filtering** (constrain candidates during ANN traversal) beats post-filtering (retrieve then drop), which can return zero authorized results and silently starve the model of context. Beyond security, filters lift relevance: scope by doc type, product version, language or date so retrieval never crosses corpora. Engineering wrinkles: highly-selective filters degrade HNSW traversal (engines handle it differently — very small tenants may effectively brute-force, which is fine); for hard isolation guarantees consider **index-per-tenant** or partitioned collections, trading operational overhead for blast-radius containment; and keep ACL changes synced to the index (a revoked permission must revoke retrieval, not wait for a nightly rebuild).

### Isolation levels
| Level | Mechanism | When |
| --- | --- | --- |
| Row filter | tenant_id in ANN query | default, most SaaS |
| ACL arrays | role/group membership filter | doc-level permissions |
| Partition / namespace | per-tenant segment | noisy-neighbor + perf |
| Index per tenant | full physical isolation | regulated / enterprise tiers |

> **Interview tip:** Say the invariant out loud — **"authorization happens at retrieval; the prompt is not a security boundary"** — then earn the senior nod with pre- vs post-filtering and the selective-filter/HNSW interaction.`,
    examples: [
      {
        label: "Server-derived filters in the retrieval call",
        tech: "ts",
        runnable: false,
        code: `async function retrieveForUser(query: string, session: Session, k = 8) {
  const qVec = await embed(query);
  return vectors.search(qVec, {
    limit: k,
    filter: {
      tenant_id: session.tenantId,          // from the session, NEVER from input
      acl: { any_of: session.groups },
      status: "published",
    },
  });
}
// deleting a doc / revoking access must also remove or reflag its chunks`,
      },
    ],
  },
];

export default augments;
