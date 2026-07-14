# Design a Search Engine
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Accept a free-text query and return a ranked list of relevant web pages (title, snippet, URL).
- Continuously crawl the web to discover and refresh pages.
- Build and maintain a full-text index over crawled content.
- Support basic query operators (phrase search `"..."`, `site:`, `-exclude`), pagination, and autocomplete suggestions.
- Rank results by relevance and authority, not just keyword match.

**Non-functional**
- Query latency: p99 < 300ms end-to-end (users perceive anything slower as broken).
- Index freshness: popular/news pages re-crawled within minutes-hours; the long tail within days-weeks.
- Scale to tens of billions of documents and hundreds of thousands of queries/sec globally.
- High availability — search is the product; a down search page is catastrophic.
- Relevance quality matters more than raw recall — top 10 results must be good, not just "matching."

**Assumptions**
- 50 billion indexed documents, average page 20KB raw HTML / ~2KB extracted text.
- 100,000 search queries/sec globally at peak, average query touches ~3-5 terms.
- Crawl budget: recrawl the entire graph roughly every 30 days on average, with popular sites recrawled far more often.
- We are not building a general web crawler from scratch conceptually here — we focus on the serving-side architecture (index + ranking + query serving) plus enough of the crawl/index-build pipeline to reason about freshness and scale.

## 2. Capacity Estimation

**Traffic**
- 100,000 QPS average, assume 3x peak (breaking news events, regional daytime peaks) → ~300,000 QPS peak.
- Each query fans out to potentially hundreds of index shards (scatter-gather), so backend request volume is orders of magnitude higher than front-door QPS — this is the real scaling problem, not the public-facing QPS.

**Storage — inverted index**
- 50B documents × ~2KB extracted text ≈ 100 PB of raw text content (stored separately in a document/content store, e.g. object storage).
- Inverted index: assume average document contains ~300 unique indexable terms after stopword removal/stemming. Each posting (docID + term frequency + position list, compressed) averages ~6-8 bytes with delta encoding and compression (variable-byte or Roaring bitmaps).
- Total postings ≈ 50B docs × 300 terms ≈ 15 trillion postings × ~7 bytes ≈ **~105 TB** for the compressed inverted index alone (excluding replication).
- With 3x replication for availability and read fan-out capacity: **~315 TB** of index to serve.

**Crawl bandwidth**
- Recrawl 50B pages every 30 days → 50B / (30×86,400) ≈ ~19,300 pages/sec average fetch rate.
- At 20KB/page average → ~386 MB/s of inbound crawl bandwidth sustained, plus DNS/connection overhead — this is why crawling is horizontally distributed across thousands of crawler workers partitioned by domain (also required for politeness — see 6.1).

**Sharding the index**
- 315 TB across shards of ~50-100 GB each (fits comfortably in a shard node's RAM/SSD for fast lookup) → **~3,000-6,000 shards**, distributed across a much smaller number of physical machines (each machine hosts multiple shards).
- A single query must in the worst case touch every shard (a term can appear in documents on any shard if we shard by document), so shard count directly drives per-query fan-out cost — a key latency lever (see 6.4).

## 3. High-Level Architecture

```
┌───────────┐        ┌──────────────┐       ┌────────────────┐
│  Crawlers  │──────▶│  URL Frontier │──────▶│  Content Store  │ (raw HTML, object storage)
│ (distributed)│      │ (priority queue)│     └────────┬────────┘
└───────────┘        └──────────────┘                 │
                                                 ┌───────▼────────┐
                                                 │  Parser/Extractor│ (strip HTML, extract text, links)
                                                 └───────┬────────┘
                                              ┌───────────┴───────────┐
                                              ▼                       ▼
                                      ┌───────────────┐      ┌────────────────┐
                                      │ Link Graph Store│     │ Indexer Pipeline │
                                      │ (for PageRank)  │     │ (build postings) │
                                      └───────┬─────────┘     └────────┬─────────┘
                                              ▼                        ▼
                                     ┌─────────────────┐      ┌──────────────────┐
                                     │ PageRank Batch Job│    │  Sharded Inverted  │
                                     │  (offline, Spark)  │──▶│  Index (query-time)│
                                     └─────────────────┘      └─────────┬──────────┘
                                                                        │
        ┌───────────┐      ┌───────────────┐      ┌─────────────────▼──────────┐
        │  Clients   │────▶│ Query Frontend │────▶│  Scatter across Index Shards │
        └───────────┘      │ (parse/cache)  │      │  (parallel term lookups)     │
                            └───────────────┘      └─────────────┬─────────────────┘
                                                                  ▼
                                                        ┌───────────────────┐
                                                        │ Ranking/Aggregator │ (merge, score, top-K)
                                                        └───────────────────┘
```

**Walkthrough**
1. **Crawl**: distributed crawlers pull URLs from a priority-ordered frontier (weighted by page importance/staleness), fetch pages respecting `robots.txt` and per-domain rate limits, and store raw content.
2. **Extract & build graph**: a parser strips boilerplate, extracts clean text and outbound links; links feed an offline link-graph store used to compute PageRank in batch.
3. **Index**: an indexing pipeline tokenizes, stems, removes stopwords, and emits `(term → docID, positions, frequency)` postings, merging them into the sharded inverted index (append new segments, periodically merge/compact — same pattern as an LSM tree).
4. **Query**: the query frontend parses the query, checks a result cache, and — on a miss — fans out to the relevant index shards in parallel, each returning its local top-K candidate matches with partial relevance scores.
5. **Rank & merge**: the aggregator merges shard results, applies the full ranking function (BM25 relevance × PageRank authority × freshness × personalization signals), and returns the final top-10-20 to the client, all within the latency budget.

## 4. API Design

```
GET /search?q=distributed+systems+book&page=1&num=10
Response: 200
{
  "query": "distributed systems book",
  "total_estimated_results": 48200000,
  "page": 1,
  "results": [
    {
      "url": "https://example.com/dist-sys-book",
      "title": "Designing Data-Intensive Applications",
      "snippet": "...the definitive guide to building reliable, scalable, and maintainable distributed systems...",
      "rank_score": 0.912
    }
  ],
  "took_ms": 118
}

GET /autocomplete?q=distrib
Response: 200
{
  "suggestions": ["distributed systems", "distributed transactions", "distributed cache"]
}

POST /internal/index/refresh   // internal — indexing pipeline notifies of new segment availability
{
  "shard_id": 2417,
  "segment_id": "seg-20260714-0093"
}
```

## 5. Data Model & Storage Choice

```
documents (content store)
  doc_id        BIGINT PK
  url           TEXT, unique indexed
  title         TEXT
  content       TEXT (compressed blob, or pointer to object storage)
  crawled_at    TIMESTAMP
  pagerank      FLOAT
  last_modified TIMESTAMP

inverted_index (per shard, custom on-disk structure — not a general-purpose DB)
  term  →  postings_list [ (doc_id, term_freq, [positions]), ... ]  (sorted by doc_id, delta+varint encoded)

link_graph (offline store for PageRank)
  from_doc_id, to_doc_id
```

The inverted index itself is a purpose-built data structure (sorted postings lists with skip lists for fast intersection), not something a general-purpose SQL or KV store does well — this is why production systems either build custom index engines (Google's original design) or lean on Lucene-based engines (Elasticsearch/Solr) that already implement this. See [search-architecture-elasticsearch.md](../09-large-scale-data-systems/search-architecture-elasticsearch.md) for how Lucene/Elasticsearch structure segments, postings, and merges in practice.

Document metadata (URL, crawl timestamps, PageRank score) is a much better fit for a wide-column/NoSQL store (Bigtable-style) — extremely high write volume from continuous crawling, simple key lookups by `doc_id` or `url`, no need for joins. See [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md): this is a textbook case for NoSQL's horizontal write scalability over relational features nobody needs here.

## 6. Deep Dive

### 6.1 Crawling: frontier, politeness, and dedup

A **URL frontier** is a priority queue partitioned by domain: each domain gets its own sub-queue so crawlers can enforce per-domain rate limits (politeness — don't hammer one server) while still parallelizing across domains massively. Priority within a domain favors pages with high estimated PageRank or high change frequency (news homepages recrawled hourly; static reference pages recrawled monthly).

Duplicate/near-duplicate detection matters enormously at web scale — mirrors, syndicated content, and URL parameter variations of the same page waste crawl budget and pollute the index. Use content hashing (simhash/minhash) to detect near-duplicates cheaply before committing crawl budget to fully processing a page.

### 6.2 Inverted index construction and sharding strategy

Two sharding strategies, each with different query-time trade-offs:
- **Document-partitioned (each shard holds a subset of documents, full index for those docs)**: a query must fan out to *every* shard (any shard might contain matching docs), but each shard does independent, parallel work and merging is a simple top-K union. This is what most production search engines use — fan-out cost is fixed and parallelism is high.
- **Term-partitioned (each shard owns a subset of the vocabulary)**: a query only touches the shards owning its query terms (less fan-out for rare-term queries), but a single popular term creates a hot shard, and multi-term queries need cross-shard intersection which is harder to parallelize.

Given uniform load distribution matters more than per-query fan-out minimization at this scale, document-partitioning (as covered in [search-architecture-elasticsearch.md](../09-large-scale-data-systems/search-architecture-elasticsearch.md)) is the standard choice. New content is indexed into small, immutable segments that get periodically merged — structurally identical to LSM-tree compaction (see [database-partitioning](../02-data-storage/database-partitioning.md) for the general partitioning trade-offs this mirrors).

### 6.3 Ranking: PageRank + relevance scoring

Two independent signals combine into a final score:
- **Relevance (query-dependent)**: BM25 (an improved TF-IDF) scores how well a document's text matches the query terms — rewarding term frequency in the doc while penalizing overly common terms across the corpus, with saturation so stuffing a term doesn't help indefinitely.
- **Authority (query-independent)**: PageRank models the web as a graph and computes, via iterative power-method computation over the link matrix (offline, batch, recomputed periodically — not real-time), the probability a "random surfer" following links lands on a given page. Pages linked-to by many other high-PageRank pages score higher, independent of what the current query even is.

Production ranking blends dozens of signals (freshness, click-through rate from query logs, mobile-friendliness, personalization, spam/quality classifiers) via a learned ranking model (learning-to-rank), but BM25 × PageRank is the conceptual core every senior candidate should be able to explain and justify.

### 6.4 Query serving latency budget

A 300ms p99 budget roughly decomposes as: ~20ms query parsing/normalization, ~150ms scatter-gather to index shards (the dominant cost — bounded by the *slowest* shard, so tail latency here matters more than average), ~50ms merge + full ranking pass on the merged candidate set, ~30ms snippet generation, remainder for network/serialization. The scatter-gather step is why **tail latency management** (hedged requests to a second replica if the primary shard hasn't responded within some threshold, timeouts that return partial results rather than blocking) is essential — waiting for all 3,000+ shards to respond synchronously with no mitigation means the slowest one dictates your entire p99.

## 7. Bottlenecks & Scaling

- **Index size growth (10x documents)**: shard count grows proportionally; the real constraint becomes per-query fan-out cost (touching 30,000+ shards). Mitigate with a routing tier that prunes obviously-irrelevant shards (e.g., language/region-partitioned indexes so an English query never touches non-English shards) and more aggressive result caching for head queries.
- **Hot/trending queries (viral news event)**: cache full result pages for the top N queries (power-law distribution means a small head of queries drives a large fraction of traffic) with short TTLs to balance freshness against cache hit rate.
- **Crawl freshness vs. cost**: recrawling everything hourly is infeasible at 50B pages; solve with adaptive recrawl scheduling driven by observed change frequency per page/domain rather than a fixed interval.
- **PageRank recomputation cost**: full recomputation over a 50B-node graph is a heavy batch job; in practice, incremental/approximate updates (only recomputing regions of the graph affected by newly discovered links) keep it tractable between full recomputations.
- **Index write amplification**: continuous small segment writes plus periodic merges can starve query-serving I/O if not isolated; separate indexing and serving resource pools, and use tiered merge policies to control merge frequency/size.

## 8. Trade-offs & Alternatives

- **Document-partitioned vs. term-partitioned index**: chose document-partitioning for uniform load and simpler operations, giving up potential per-query efficiency gains for rare terms that term-partitioning could offer.
- **Freshness vs. crawl cost**: adaptive recrawl scheduling trades perfect real-time freshness (impossible at this scale) for a good-enough approximation weighted toward pages that actually change.
- **Precision vs. recall**: aggressive stopword removal/stemming and dedup improve index efficiency and precision but can occasionally drop a legitimately relevant rare-term match — an acceptable trade at web scale where the corpus is large enough that recall is rarely the bottleneck.
- **Batch PageRank vs. real-time authority signals**: computing PageRank offline in batch (rather than trying to update it live per crawl event) trades a few hours/days of staleness in the authority signal for enormously simpler, more efficient computation — acceptable since link-graph authority changes slowly compared to content freshness needs.

## Related topics
- [Search Architecture / Elasticsearch](../09-large-scale-data-systems/search-architecture-elasticsearch.md)
- [Database Partitioning](../02-data-storage/database-partitioning.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Caching Strategies](../04-caching/caching-strategies.md)
- [Database Sharding](../02-data-storage/database-sharding.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
- [Real-Time System Design](../09-large-scale-data-systems/real-time-system-design.md)
