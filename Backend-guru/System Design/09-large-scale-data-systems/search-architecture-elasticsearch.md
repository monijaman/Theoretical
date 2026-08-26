# Search Architecture / Elasticsearch
[← Back to index](../readme.md)

## Why this matters in an interview

Full-text search ("search for products/messages/documents matching these words, ranked by relevance") cannot be solved efficiently with `LIKE '%term%'` on a relational table — that's a full table scan with no way to rank results. Interviewers bring this up to see if you know *why* a dedicated search engine exists: the inverted index data structure that makes term lookup O(1)-ish instead of O(n), how relevance ranking actually works instead of being a black box, and — the part candidates most often miss — that a search index is a **derived, denormalized copy** of your primary data, which means it's async and eventually consistent by construction, not an oversight.

## The inverted index — the core idea

A forward index maps `document → words it contains` (useless for search: you'd still scan every document). An **inverted index** flips it: `word → list of documents (and positions) containing it`. This is the single data structure that makes search engines fast.

```text
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

A query for `"quick fox"` becomes: fetch the postings list for `"quick"` (`[doc1, doc3]`) and `"fox"` (`[doc1, doc2]`), intersect/union them, and score the matches. No document is ever scanned in full at query time — you only ever touch the postings lists for the query's terms. Elasticsearch (and Solr) builds this on top of **Apache Lucene**, which stores postings lists, term dictionaries, and doc-value columns (for sorting/aggregations) as immutable per-segment files.

### Tokenization and analyzers

Before terms go into the index, they pass through an **analyzer**: a pipeline of a character filter → tokenizer → token filters.

```text
"The Quick-Brown FOXES!"
      │ char filter (strip HTML, normalize)
      ▼
"The Quick-Brown FOXES!"
      │ tokenizer (split on whitespace/punctuation)
      ▼
["The", "Quick", "Brown", "FOXES"]
      │ token filters (lowercase, stemming, stopword removal)
      ▼
["quick", "brown", "fox"]
```

`"the"` is dropped as a stopword, and `"FOXES"` is stemmed to `"fox"`.

The same analyzer runs on the query string at search time, so `"The quick foxes"` and `"Quick Fox"` both normalize to overlapping terms and match. This is why analyzer choice (language-specific stemmers, synonym filters, n-gram tokenizers for partial/fuzzy match) is a first-class design decision, not a detail — get it wrong and either nothing matches or everything does.

## Relevance scoring: TF-IDF → BM25

Matching is necessary but not sufficient — you need to *rank* matches by relevance.

### TF-IDF

- **TF (Term Frequency)** — how often the query term appears in this document.
- **IDF (Inverse Document Frequency)** — how rare the term is across the entire corpus.

```
score(term, doc) = TF(term, doc) × IDF(term)
```

Rare words contribute much more than common words.

### BM25 (Elasticsearch default)

BM25 improves TF-IDF by fixing two practical issues:

1. **TF saturation** — repeating a word 100 times should not make a document 20× better than one containing it naturally.
2. **Document length normalization** — longer documents naturally contain more words, so they shouldn't automatically rank higher.

```
BM25(D,Q) =
Σ IDF(qi) ×
  [ f(qi,D) × (k1+1) ]
  --------------------
  [ f(qi,D) + k1 × (1-b+b×|D|/avgdl) ]
```

You do **not** need to derive this formula in interviews.

Instead explain:

> TF-IDF rewards frequent and rare terms. BM25 is a production refinement that limits repeated-word spam and normalizes document length. Elasticsearch uses BM25 by default.

## Sharding and replicas

An Elasticsearch **index** consists of multiple **primary shards**, each of which is an independent Lucene index.

```text
Index "products"

            Node A              Node B              Node C
        ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
        │ P0   R2       │    │ P1   R0       │    │ P2   R1       │
        │ P3   R4       │    │ P4   R3       │    │              │
        └──────────────┘    └──────────────┘    └──────────────┘
```

- Primary shards scale storage and indexing.
- Replica shards improve availability.
- Replicas also serve search traffic.

A search request is **scatter-gather**:

1. Coordinator receives the query.
2. Sends it to one copy of every shard.
3. Each shard returns its local Top-K.
4. Coordinator merges and reranks into one global Top-K.

Too many shards increase fan-out overhead, so over-sharding hurts latency.

## Near-real-time search

Elasticsearch is **near real time**, not immediately searchable.

```text
Index request
      │
      ▼
In-memory buffer + translog
      │
      │ refresh (default every 1 second)
      ▼
New immutable Lucene segment
      │
      ▼
Searchable
      │
      ▼
Background segment merge
```

Important distinction:

- Durable immediately (stored in translog).
- Searchable after refresh.

Forcing `refresh=true` on every write creates many tiny segments, increasing merge work and reducing indexing throughput.

This is why Elasticsearch should not be treated as the system of record.

## Keeping Elasticsearch synchronized

The search index is a derived copy of your primary database.

```text
          Application
                │
                ▼
          Primary Database
                │
        Change Data Capture
                │
                ▼
             Kafka Topic
                │
                ▼
         Indexing Consumer
                │
                ▼
          Elasticsearch
```

### Option 1 — Dual write

Application writes to:

- Primary database
- Elasticsearch

Simple, but not atomic.

If one succeeds and the other fails, they diverge.

### Option 2 — CDC (recommended)

Database changes are streamed using:

- Debezium
- MySQL binlog
- Postgres WAL
- DynamoDB Streams

These changes flow through Kafka into Elasticsearch.

Advantages:

- Replayable
- Decoupled
- Retries
- Bulk indexing
- Primary write path stays fast

Trade-off:

Search is eventually consistent.

A newly created or deleted item may take a second or two to appear correctly.

## Trade-offs summary

| | Choice A | Choice B |
|---|---|---|
| Consistency | Strong DB read | Near-real-time search index |
| Synchronization | Dual write | CDC pipeline |
| Refresh interval | Lower (fresher) | Higher (better throughput) |
| Shards | More parallelism | Less query fan-out |
| Ranking | TF-IDF | BM25 (default) |

## Common interview follow-ups

### Q: Why not use `LIKE '%term%'` in Postgres?

Because a leading wildcard prevents B-tree indexes from helping, forcing a table scan.

It also provides:

- no relevance ranking
- no stemming
- no typo tolerance
- no synonyms

Postgres Full Text Search (`tsvector` + GIN) works for moderate workloads, but Elasticsearch provides distributed search, BM25, replicas, analyzers, and large-scale clustering.

---

### Q: How are updates handled if Lucene segments are immutable?

Documents are never modified in place.

Instead:

1. Old document is marked deleted.
2. New version is written into a new segment.
3. Background merge eventually removes deleted copies.

Frequent updates therefore create write amplification.

---

### Q: What happens if the CDC pipeline falls behind?

Kafka retains every change.

The consumer simply resumes from its committed offset.

The consequence is increased search staleness, not lost data.

Production systems monitor consumer lag and alert if it grows too large.

---

### Q: How do you reindex without downtime?

1. Create a new index with the new mapping/analyzer.
2. Reindex all documents.
3. Keep both indices synchronized during migration.
4. Atomically switch an alias.

Clients always query the alias, so the cutover is invisible.

---

### Q: How do you scale Elasticsearch?

Write throughput:

- Increase primary shards.

Read throughput:

- Increase replicas.

These are independent tuning knobs.

---

### Q: Why is BM25 better for product search?

Plain TF-IDF rewards repeated keywords.

A spammy description repeating "wireless headphones" dozens of times could dominate rankings.

BM25:

- limits repeated-term benefit
- normalizes document length

which produces much better product rankings in real-world catalogs.

## Related topics
- [Data Lake vs Data Warehouse](data-lake-vs-data-warehouse.md) — search indexes are another example of a derived, denormalized copy of primary data
- [Database Sharding](../02-data-storage/database-sharding.md) — the same fixed-shard-count-at-creation trade-off shows up in Elasticsearch's primary shards
- [Database Replication](../02-data-storage/database-replication.md) — replica shards follow the same sync/async replication trade-offs as database replicas
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md) — the model that explains why ES search results lag the primary DB
- [Message Queues](../05-messaging-event-driven/message-queues.md) — Kafka as the durable transport layer for CDC-based indexing pipelines
