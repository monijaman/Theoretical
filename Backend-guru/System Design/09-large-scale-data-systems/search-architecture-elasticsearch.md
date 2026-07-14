# Search Architecture / Elasticsearch
[← Back to index](../readme.md)

## Why this matters in an interview

Full-text search ("search for products/messages/documents matching these words, ranked by relevance") cannot be solved efficiently with `LIKE '%term%'` on a relational table — that's a full table scan with no way to rank results. Interviewers bring this up to see if you know *why* a dedicated search engine exists: the inverted index data structure that makes term lookup O(1)-ish instead of O(n), how relevance ranking actually works instead of being a black box, and — the part candidates most often miss — that a search index is a **derived, denormalized copy** of your primary data, which means it's async and eventually consistent by construction, not an oversight.

## The inverted index — the core idea

A forward index maps `document → words it contains` (useless for search: you'd still scan every document). An **inverted index** flips it: `word → list of documents (and positions) containing it`. This is the single data structure that makes search engines fast.

```
Documents:
  doc1: "the quick brown fox"
  doc2: "the lazy fox sleeps"
  doc3: "quick brown dogs run"

Inverted index (postings lists):
  "quick"  → [doc1, doc3]
  "brown"  → [doc1, doc3]
  "fox"    → [doc1, doc2]
  "lazy"   → [doc2]
  "sleeps" → [doc2]
  "dogs"   → [doc3]
  "run"    → [doc3]
```

A query for "quick fox" becomes: fetch the postings list for "quick" ([doc1, doc3]) and "fox" ([doc1, doc2]), intersect/union them, and score the matches. No document is ever scanned in full at query time — you only ever touch the postings lists for the query's terms. Elasticsearch (and Solr) builds this on top of **Apache Lucene**, which stores postings lists, term dictionaries, and doc-value columns (for sorting/aggregations) as immutable per-segment files.

### Tokenization and analyzers

Before terms go into the index, they pass through an **analyzer**: a pipeline of a character filter → tokenizer → token filters.

```
"The Quick-Brown FOXES!" 
      │ char filter (strip HTML, normalize)
      ▼
"The Quick-Brown FOXES!"
      │ tokenizer (split on whitespace/punctuation)
      ▼
["The", "Quick", "Brown", "FOXES"]
      │ token filters (lowercase, stemming, stopword removal)
      ▼
["quick", "brown", "fox"]          ← "the" dropped (stopword), "FOXES" stemmed to "fox"
```

The same analyzer runs on the query string at search time, so "The quick foxes" and "Quick Fox" both normalize to overlapping terms and match. This is why analyzer choice (language-specific stemmers, synonym filters, n-gram tokenizers for partial/fuzzy match) is a first-class design decision, not a detail — get it wrong and either nothing matches or everything does.

## Relevance scoring: TF-IDF → BM25

Matching is necessary but not sufficient — you need to *rank* matches by relevance. The classic approach is **TF-IDF**:

- **TF (term frequency)** — how often the query term appears in this document. More occurrences → more relevant, but with diminishing returns.
- **IDF (inverse document frequency)** — how rare the term is across the whole corpus. "the" appears everywhere (low IDF, low signal); "elasticsearch" appears rarely (high IDF, high signal when it matches).

`score(term, doc) = TF(term, doc) × IDF(term)`

Elasticsearch's default scoring algorithm is **BM25** (Best Match 25), a refinement of TF-IDF that fixes two practical problems:

1. **TF saturation** — raw TF-IDF lets a document that repeats a word 100 times dominate a document that uses it 5 times naturally; BM25 applies a saturation curve so additional occurrences matter less and less.
2. **Document length normalization** — a long document naturally contains more term occurrences by chance; BM25 normalizes against the average document length in the index so short and long documents are compared fairly.

```
BM25(D, Q) = Σ IDF(qi) × [ f(qi,D) × (k1+1) ] / [ f(qi,D) + k1 × (1 - b + b × |D|/avgdl) ]

  f(qi,D)  = term frequency of query term qi in document D
  |D|      = length of document D
  avgdl    = average document length in the index
  k1, b    = tunable constants (saturation, length-norm strength)
```

You don't need to derive this in an interview — you need to say: *TF-IDF rewards term frequency and rarity; BM25 is the production-grade version that caps the benefit of repetition and adjusts for document length, and it's Elasticsearch's default similarity module.*

## Sharding and replicas in Elasticsearch

An Elasticsearch **index** is split into **shards** (each shard is a full, independent Lucene index) so a single index can scale past what one node's disk/CPU can hold, and so queries can be parallelized across nodes.

```
Index "products" (5 primary shards, 1 replica each)

  Node A          Node B          Node C
 ┌────────┐      ┌────────┐      ┌────────┐
 │ P0  R2 │      │ P1  R0 │      │ P2  R1 │
 │ P3  R4 │      │ P4  R3 │      │        │
 └────────┘      └────────┘      └────────┘

  P = primary shard, R = replica shard
  A query fans out to one copy (primary or replica) of every shard,
  merges partial results, and re-ranks the merged top-N.
```

- **Primary shards** are fixed at index creation time (resharding means reindexing — this is the same "can't easily change shard count later" pain as database sharding).
- **Replica shards** are copies of primaries for both read scaling (queries can be served by replicas) and failover (a replica is promoted if its primary's node dies).
- A search request is scatter-gather: the coordinating node sends the query to one shard copy per shard, each returns its local top-K, and the coordinator merges and re-sorts the global top-K. This is why an ES cluster with many shards has a real per-query fan-out cost — over-sharding a small index hurts latency rather than helping it.

## Near-real-time search: the refresh interval

Elasticsearch is **near-real-time (NRT)**, not instantly consistent, and this is a deliberate design trade-off, not a bug:

```
Write path:
  index request → written to in-memory buffer + translog (durability)
                          │
                    every refresh_interval (default 1s)
                          ▼
              buffer flushed to a new Lucene segment
              (segment becomes searchable)
                          │
                  periodically: segments merged
                  (background merge policy)
```

- A write is **durable** immediately (fsynced to the translog, survives a crash) but not **searchable** immediately — it only becomes visible after the next refresh (default every 1 second).
- Forcing `refresh=true` on every write (or lowering the interval) makes data visible faster but creates far more small Lucene segments, which increases merge overhead and hurts throughput — the classic write-throughput vs read-freshness trade-off.
- This is why "I just wrote it and searched immediately and it's not there" is expected behavior, not a bug, and why ES is unsuitable as a system of record — it's a read-optimized derived index over some other durable primary store.

## Keeping Elasticsearch in sync with a primary database

Since ES is a derived index, not the source of truth, every real deployment has to answer: how does data get from the primary DB (Postgres/MySQL/DynamoDB) into ES, and what happens when they briefly disagree?

```
                    ┌────────────┐
   writes  ───────▶ │ Primary DB │
                    └─────┬──────┘
                          │ CDC (Debezium / DynamoDB Streams / binlog tail)
                          ▼
                 ┌──────────────────┐
                 │  Kafka topic      │  (durable, ordered change log)
                 └─────────┬─────────┘
                          ▼
                 ┌──────────────────┐
                 │ Indexer consumer  │──▶ Elasticsearch bulk API
                 └──────────────────┘
```

Two common patterns, both async:

1. **Dual write** — the application writes to the DB and to ES in the same request path. Simple, but not atomic: if the ES write fails after the DB write succeeds (or vice versa), the two diverge with no automatic reconciliation.
2. **CDC (Change Data Capture)** — a tool like Debezium tails the DB's write-ahead log/binlog and publishes changes to Kafka; a consumer indexes them into ES. This decouples the primary write path from indexing latency/failures and gives replayability (reindex from the log), at the cost of a lag window (typically sub-second to a few seconds) during which ES is stale relative to the DB.

This lag is why search results can briefly show deleted items or miss brand-new ones, and why systems requiring strong consistency for a specific field (e.g., "is this item still in stock") read that field from the primary DB even when the item itself was found via search.

## Trade-offs summary

| | Choice A | Choice B |
|---|---|---|
| Consistency model | Strongly consistent primary DB read | Near-real-time search index (seconds of lag) |
| Sync mechanism | Dual write (simple, can silently diverge) | CDC pipeline (decoupled, replayable, adds infra) |
| Refresh interval | Low (fresh results, more segment merge overhead) | High (less overhead, staler results) |
| Shard count | More shards (better write/query parallelism) | Fewer shards (less per-query fan-out, less overhead per index) |
| Scoring | TF-IDF (simpler, biased by raw frequency/length) | BM25 (saturates TF, length-normalized — ES default) |

## Common interview follow-ups

**Q: Why can't you just run `LIKE '%term%'` in Postgres instead of standing up Elasticsearch?**
`LIKE '%term%'` can't use a standard B-tree index (the leading wildcard prevents prefix matching) so it forces a sequential scan over every row, and it has no concept of relevance ranking, stemming, or fuzzy matching — it's a substring test, not a search algorithm. Postgres has `tsvector`/GIN indexes that build a basic inverted index for smaller-scale needs, but Elasticsearch adds distributed sharding, replicas, and mature relevance tuning (BM25, synonyms, boosting) on top.

**Q: How would you handle a document update, given segments are immutable?**
Lucene segments are write-once; an "update" in Elasticsearch is actually a delete-marker on the old document version plus an insert of a new document into a new segment — the old copy is purged later during segment merges. This is why frequent updates to the same document create write amplification and why ES is better suited to append-heavy or infrequently-updated data than a high-churn OLTP-style workload.

**Q: What happens if the CDC pipeline falls behind or the indexer crashes?**
Kafka retains the change log so the indexer resumes from its last committed offset with no data loss, just a larger lag window; the failure mode is staleness, not incorrectness. Health checks typically monitor consumer lag (offset delta) and alert if it exceeds a threshold, since unbounded lag means search results drift far from the primary DB.

**Q: How do you reindex a live index without downtime, e.g., to change an analyzer?**
Create a new index with the new mapping/analyzer, reindex all documents into it (ES's `_reindex` API or replaying the CDC log from the beginning), then atomically flip a read/write **alias** from the old index to the new one — clients query the alias name, not the physical index, so the cutover is invisible to them.

**Q: How do you scale Elasticsearch for both heavy writes and heavy reads?**
Increase primary shard count (spread indexing load, chosen at index-creation time since it can't change later without reindexing) for write scaling, and increase replica count for read scaling since replicas serve queries independently — they're separate knobs, and over-provisioning either without need adds coordination overhead and per-query fan-out cost.

**Q: Why is BM25 better than plain TF-IDF for a product catalog?**
Plain TF-IDF would let a spammy product description repeating a keyword rank artificially high; BM25's saturation function caps the marginal benefit of repeated terms, and its length normalization stops long descriptions from winning purely by having more words, both of which map directly onto real catalog-ranking abuse cases.

## Related topics
- [Data Lake vs Data Warehouse](data-lake-vs-data-warehouse.md) — search indexes are another example of a derived, denormalized copy of primary data
- [Database Sharding](../02-data-storage/database-sharding.md) — the same fixed-shard-count-at-creation trade-off shows up in Elasticsearch's primary shards
- [Database Replication](../02-data-storage/database-replication.md) — replica shards follow the same sync/async replication trade-offs as database replicas
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md) — the model that explains why ES search results lag the primary DB
- [Message Queues](../05-messaging-event-driven/message-queues.md) — Kafka as the durable transport layer for CDC-based indexing pipelines
