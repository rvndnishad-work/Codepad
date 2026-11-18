---
slug: vector-search-exact-hnsw-ivf
title: "Vector Search for RAG: Exact, HNSW and IVF Measured on a Million Vectors"
excerpt: How vector indexes trade accuracy for speed, measured with Faiss on up to a million 384-dimension vectors. Covers recall@k, the efSearch and nprobe knobs, why recall drops as data grows, and why filtering can silently return 1 result out of 10.
tags: ["ai-engineering", "rag", "vector-search", "embeddings", "performance"]
cover: /blog-images/vector-search-exact-hnsw-ivf/cover.png
---

Every RAG system has the same step in the middle: turn the question into an embedding, then find the stored chunks whose embeddings are closest. With a few thousand chunks you can compare the question against every one of them. With a few million, that gets slow, so you add a **vector index**: HNSW, IVF, or whatever your database calls it.

Vector indexes are fast because they are **approximate**. They skip most of the data, and sometimes they skip the right answer. How often that happens depends on settings most people never touch, on how big your data is, and on whether you filter. None of it shows up as an error. Your RAG system just quietly gets worse answers.

This post measures that trade-off. All numbers come from [Faiss](https://github.com/facebookresearch/faiss) 1.16 (Meta's vector search library) on one CPU core, with up to a million 384-dimension vectors. The method section says exactly what the data is and what it is not.

## Exact search, and why it stops scaling

> **Short answer:** exact search compares the query with every stored vector. It is always correct, and its cost grows in a straight line with the number of vectors: 10 times the data, 10 times the time.

An **embedding** is a list of numbers (here 384 of them) that a model produces for a piece of text, arranged so that texts with similar meaning get similar lists. **Cosine similarity** measures how close two embeddings point: 1 means the same direction, 0 means unrelated. **Nearest neighbour search** means: given a query embedding, find the k stored embeddings with the highest similarity.

The simplest way is **exact search** (also called brute force or a flat index): score everything, sort, keep the top k. Here it is on six toy embeddings:

```javascript-run
// Six tiny "embeddings" (real ones have hundreds of dimensions).
const docs = {
  refunds:  [0.9, 0.1, 0.0],
  returns:  [0.8, 0.3, 0.1],
  shipping: [0.3, 0.9, 0.1],
  tracking: [0.2, 0.8, 0.4],
  login:    [0.0, 0.2, 0.9],
  password: [0.1, 0.1, 1.0],
};

const norm = (v) => Math.hypot(...v);
const cosine = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0) / (norm(a) * norm(b));

// Exact search: score every document, sort, take the top k.
function exactTopK(query, k) {
  return Object.entries(docs)
    .map(([id, v]) => ({ id, score: cosine(query, v) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, k);
}

// recall@k: what fraction of the true top k did the fast index return?
function recallAtK(approxIds, exactIds) {
  const truth = new Set(exactIds);
  return approxIds.filter((id) => truth.has(id)).length / exactIds.length;
}

const query = [0.7, 0.6, 0.1]; // "where is my refund package?"
const exact = exactTopK(query, 3);
for (const { id, score } of exact) console.log(id.padEnd(9), score.toFixed(3));

const exactIds = exact.map((r) => r.id);
const fromIndex = ["returns", "refunds", "tracking"]; // what an approximate index might return
console.log("recall@3 =", recallAtK(fromIndex, exactIds).toFixed(2));
```

Output:

```text
returns   0.940
shipping  0.859
refunds   0.822
recall@3 = 0.67
```

The same idea with Faiss's optimized exact index, on one CPU core:

| Stored vectors | Exact search, per query |
| :--- | ---: |
| 100,000 | 2.66 ms |
| 200,000 | 5.09 ms |
| 1,000,000 | 26.00 ms |

That is a straight line. At a million vectors, 26 ms per query on one core is fine for a demo, but it means about 38 queries per second per core, and it keeps growing with every document you add. Approximate indexes exist to break that line.

## recall@k: the number that tells you what the index costs you

> **Short answer:** recall@k is the share of the true top k neighbours that the approximate index returned. 0.95 means that, on average, half a result in every ten is not one of the real ten nearest.

The last two lines of the example above compute it. The index returned `returns`, `refunds` and `tracking`; the true top three were `returns`, `shipping` and `refunds`. Two out of three, so recall@3 is 0.67.

This is a different recall from the one in [measuring RAG retrieval](/blog/measuring-rag-retrieval-recall-mrr-ndcg). That post asks "did retrieval find the chunks a human marked as relevant?". This one asks "did the index find the same neighbours that exact search would have?". An index can only lose quality relative to exact search, never add it, so this recall is the ceiling the index puts on everything downstream.

To measure it on your own data: take a few hundred real queries, run exact search once to get the true neighbours, then run the index and compare. Every number below was measured that way, with 1,000 queries.

## HNSW: a graph you walk greedily

> **Short answer:** HNSW links every vector to a few of its neighbours, in layers, and answers a query by walking the graph towards it. `efSearch` sets how many candidates the walk keeps; raise it for recall, lower it for speed.

**HNSW** (Hierarchical Navigable Small World) comes from a [2016 paper by Malkov and Yashunin](https://arxiv.org/abs/1603.09320). It builds a graph where each vector is connected to about `M` similar vectors. The top layers hold only a few vectors with long links, for crossing the space quickly; the bottom layer holds every vector with short links, for the final close search.

![HNSW layers: the search enters at the sparse top layer, jumps towards the query using long links, then drops to denser layers and finishes with short links in the bottom layer that holds every vector](/blog-images/vector-search-exact-hnsw-ivf/hnsw.svg)

A search starts at the top, moves to whichever neighbour is closest to the query, drops a layer when it cannot get closer, and repeats. On the bottom layer it keeps a list of the best `efSearch` candidates seen so far and stops when no neighbour improves the list. A longer list explores more of the graph: better recall, more time.

Results on 200,000 vectors (`M=32`, `efConstruction=100`), one core:

| efSearch | recall@10 | ms per query | vs exact (5.09 ms) |
| ---: | ---: | ---: | ---: |
| 10 | 0.574 | 0.102 | 50x faster |
| 20 | 0.720 | 0.157 | 32x faster |
| 40 | 0.843 | 0.257 | 20x faster |
| 80 | 0.935 | 0.486 | 10x faster |
| 160 | 0.982 | 0.896 | 5.7x faster |
| 320 | 0.998 | 1.701 | 3.0x faster |

![Recall against query time for HNSW and IVF on 200,000 vectors: both curves rise steeply at first and then flatten, and HNSW reaches high recall at lower query time than IVF](/blog-images/vector-search-exact-hnsw-ivf/recall-curve.svg)

Two things stand out. First, the default matters. Faiss 1.16 defaults to `efSearch=16`, and [pgvector](https://github.com/pgvector/pgvector) uses "40 by default" for `hnsw.ef_search`. On this data, values from 10 to 40 lost between 16% and 43% of the true neighbours. Second, the last few points of recall are expensive: going from 0.935 to 0.998 cost 3.5 times the query time.

The graph also costs memory and build time. The HNSW index took 345 MiB against 293 MiB for the raw vectors (the links are extra), and building it took 27.6 seconds on four cores.

## IVF: cluster first, then search a few clusters

> **Short answer:** IVF splits the vectors into clusters with k-means, and at query time searches only the `nprobe` clusters closest to the query. More probes, more recall, more time.

**IVF** (inverted file index) is the other classic design; the [Faiss paper by Johnson, Douze and Jégou](https://arxiv.org/abs/1702.08734) describes it at billion scale. Building it has two steps: **training**, which runs k-means to find `nlist` cluster centres, and **adding**, which puts each vector in the list of its nearest centre. A query compares itself with the centres, then does exact search inside the `nprobe` closest lists.

![IVF: vectors grouped into cells around k-means centres; the query searches only the few cells whose centres are nearest, so a true neighbour just across a cell border can be missed](/blog-images/vector-search-exact-hnsw-ivf/ivf.svg)

The weakness is borders. A true neighbour that sits just across the edge of a cell is missed unless that cell is also probed.

Results on the same 200,000 vectors (`nlist=1024`), one core:

| nprobe | recall@10 | ms per query |
| ---: | ---: | ---: |
| 1 | 0.387 | 0.056 |
| 4 | 0.554 | 0.110 |
| 16 | 0.726 | 0.321 |
| 32 | 0.811 | 0.618 |
| 64 | 0.891 | 1.149 |
| 128 | 0.956 | 2.268 |

At the same query time, HNSW was ahead everywhere on this data. At about 0.9 ms, HNSW reached 0.982 recall where IVF reached about 0.85. IVF has other strengths: it built in 8.9 seconds against 27.6 for HNSW, used 296 MiB against 345 MiB, and it combines well with compression (product quantization) when vectors do not fit in memory. But with `nprobe=1`, which is the default in both Faiss and pgvector (`ivfflat.probes`, "1 by default"), it found under 40% of the true neighbours here.

## Recall drops as the data grows

> **Short answer:** the same `efSearch` gives lower recall on a bigger index. Settings tuned on a small dataset can quietly get worse in production.

I built HNSW indexes on 100,000 and 1,000,000 vectors from the same distribution and searched both with `efSearch=160`:

| Vectors | Exact, ms per query | HNSW, ms per query | HNSW recall@10 | HNSW build (4 cores) |
| ---: | ---: | ---: | ---: | ---: |
| 100,000 | 2.66 | 0.638 | 0.992 | 12 s |
| 1,000,000 | 26.00 | 1.144 | 0.948 | 203 s |

The good news: 10 times more data made exact search 10 times slower but HNSW less than twice as slow. At a million vectors, HNSW was 23 times faster than exact search.

The bad news: recall fell from 0.992 to 0.948 with the setting unchanged. If you tuned `efSearch` on a sample and then loaded the whole corpus, you lost recall without any warning. Re-measure recall whenever the index grows by a large factor.

## Filters can silently return almost nothing

> **Short answer:** if you take the index's top 10 and then filter by tenant or permission, most of the 10 are thrown away. Filter during the search, over-fetch, or use exact search on small partitions.

Real RAG queries usually have a filter: only this customer's documents, only documents this user may see, only this year. The tempting implementation is **post-filtering**: ask the index for the top 10, then drop rows that fail the filter.

I gave each of the 200,000 vectors one of 10 tenant ids at random, so each tenant owns about 10% of the data, and searched as tenant 3 with HNSW (`efSearch=160`). The true answer is the top 10 among tenant 3's 20,081 vectors, found with exact search.

| Method | Results returned (of 10) | recall@10 | ms per query |
| :--- | ---: | ---: | ---: |
| Post-filter: ask for 10, then filter | 1.1 | 0.106 | 0.967 |
| Over-fetch: ask for 100, filter, keep 10 | 8.8 | 0.851 | 0.976 |
| Over-fetch: ask for 200, filter, keep 10 | 10.0 | 0.921 | 1.048 |
| Filter during the search | 10.0 | 0.921 | 1.028 |

![Post-filtering: the index returns its ten nearest vectors from all tenants, about nine belong to other tenants and are removed, so the user gets one result instead of ten](/blog-images/vector-search-exact-hnsw-ivf/post-filter.svg)

Post-filtering returned 1.1 results on average when the user asked for 10. That is what 10% selectivity does: about 9 of the 10 nearest vectors belong to someone else. The RAG prompt then gets one chunk, and nothing logs an error.

**Filtering during the search** means the graph walk itself skips vectors that fail the filter. In Faiss that is an `IDSelector` passed in the search parameters:

```python
import faiss

sel = faiss.IDSelectorBatch(allowed_ids)  # ids this user may see
params = faiss.SearchParametersHNSW(sel=sel, efSearch=160)
distances, ids = index.search(query_vectors, 10, params=params)
```

If you use Postgres, pgvector's README warns about exactly this: "With approximate indexes, queries with filtering can return less results since filtering is applied *after* the index is scanned." Starting with pgvector 0.8.0, you can turn on iterative index scans (`SET hnsw.iterative_scan = relaxed_order;`, and the same for `ivfflat`), which keep scanning the index until enough rows pass the filter.

Then I made the filter stricter: 100 tenants, so each owns about 1%:

| Method (1% of data allowed) | Results returned (of 10) | recall@10 | ms per query |
| :--- | ---: | ---: | ---: |
| Post-filter, ask for 10 | 0.1 | 0.011 | 0.972 |
| Over-fetch, ask for 1,000 | 9.0 | 0.694 | 1.643 |
| Filter during the search | 10.0 | 0.698 | 0.985 |
| Exact search over that tenant only (2,087 vectors) | 10.0 | 1.000 | 0.059 |

With a very selective filter, even filtered HNSW found only 70% of the true neighbours, most likely because the graph walk has to step through many forbidden vectors to reach allowed ones. Meanwhile, exact search over just that tenant's 2,087 vectors was perfect and 17 times faster. For small partitions, the simplest answer wins: keep a separate index per tenant, or partition the table so the filter runs first and exact search does the rest.

## What the data is, and what it is not

> **Short answer:** synthetic clustered vectors, not real text embeddings. The trends are general; the exact recall numbers are not.

I could not download a real embedding dataset in this environment, so the vectors are synthetic: points drawn around 500 cluster centres in a 48-dimensional space, projected to 384 dimensions (the size of common small embedding models), with noise added, and normalized so inner product equals cosine similarity. Queries come from the same distribution but are not in the index.

How hard the data is changes the numbers a lot. With the clusters spread wider (the same code with one parameter changed), HNSW at `efSearch=40` dropped from 0.843 to 0.761 recall, and IVF at `nprobe=16` dropped from 0.726 to 0.456. Real embeddings may be easier or harder than either setting; public benchmarks such as [ann-benchmarks](https://ann-benchmarks.com/) compare these indexes on real datasets. That is the point: **the right setting depends on your data, so measure recall on your data.** These things held in every setting I tried:

- Exact search time grows in a straight line with data size; HNSW grows much more slowly.
- Recall rises steeply with `efSearch` or `nprobe` at first, then flattens, and the last few points cost the most time.
- The same settings give lower recall on a larger index.
- Post-filtering loses results in proportion to how selective the filter is.

All timings are single-threaded queries on one core of a cloud VM; your hardware will differ.

## Questions interviewers ask about vector search

**"Why not just use exact search?"**
You can, up to a point, and you should when the data is small: it is always correct. Its cost grows linearly. In this test, a million 384-dimension vectors took 26 ms per query per core, against about 1.1 ms for HNSW.

**"What do HNSW's parameters do?"**
`M` is how many links each vector gets (more links: better recall, more memory). `efConstruction` is how hard the build searches for good links (slower build, better graph). `efSearch` is the candidate list size at query time, the main speed-recall knob, and it can be changed per query without rebuilding.

**"HNSW or IVF?"**
HNSW usually gives better recall for the same query time and needs no training step, at the cost of more memory and slower builds. IVF builds faster and pairs with compression for data that does not fit in memory. On this data, HNSW was ahead at every query time.

**"How do you know your index is good enough?"**
Measure recall@k against exact search on a sample of real queries, then raise `efSearch` or `nprobe` until recall stops improving your RAG answers. Re-measure when the data grows.

**"How do you handle per-user permissions?"**
Never post-filter a small top k. Filter during the search if your engine supports it, over-fetch generously if it does not, and for small partitions use a separate index or exact search over the partition.

## Cheat sheet

| Situation | What happened here | What to do |
| :--- | :--- | :--- |
| Small corpus (tens of thousands) | Exact search: 0.55 ms at 20,000 vectors | Use exact search; no index needed |
| Large corpus | Exact grew to 26 ms at 1M; HNSW 1.1 ms | Use HNSW (or IVF if memory-bound) |
| HNSW at low `efSearch` | 0.574 recall at 10, 0.843 at 40 | Raise `efSearch` until recall flattens |
| IVF at `nprobe=1` | 0.387 recall | Probe more lists; 128 of 1024 reached 0.956 |
| Index grew 10x | Recall 0.992 fell to 0.948 at the same `efSearch` | Re-measure and re-tune after growth |
| Post-filter top 10 at 10% selectivity | 1.1 results returned | Filter during search or over-fetch |
| Filter matches 1% of data | Filtered HNSW: 0.698 recall | Exact search on the partition: 1.000 recall, 0.059 ms |

The pattern to remember: a vector index is a deliberate trade of accuracy for speed. Measure what it costs you with recall@k against exact search, on your own data, at your real size, with your real filters.
