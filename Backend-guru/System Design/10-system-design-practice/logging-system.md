# Design a Centralized Logging System
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Collect logs from thousands of services/hosts and centralize them for search and analysis.
- Support structured (JSON) and unstructured (plain text) log lines.
- Full-text and field-based search over recent logs (last hours/days), with slower access to older archives.
- Alerting on log patterns (e.g., error-rate spikes) — often integrated with the metrics system.
- Retention tiering: hot (fast search) → warm → cold (cheap, slow, compliance-driven).

**Non-functional**
- Ingestion must never meaningfully slow down or crash the application producing the logs — logging is a side effect, not a critical path dependency.
- High ingestion throughput with graceful degradation (drop/sample) under overload rather than backpressure onto production services.
- Search latency: seconds for recent hot-tier queries; minutes acceptable for cold-tier/archive queries.
- Durability is "best effort" for logs (unlike a payment ledger) — losing a small percentage of debug logs during an outage is acceptable; losing audit/security logs is not, and those need a stronger guarantee.
- Cost-aware by design — log volume grows with fleet size and verbosity, and naive full-fidelity indexing of everything forever is prohibitively expensive.

**Assumptions**
- 10,000 hosts/containers, each emitting ~500 log lines/sec average (a mix of access logs, app logs, debug traces) → 5M log lines/sec fleet-wide.
- Average log line ~500 bytes (JSON with a handful of fields).
- Hot retention: 7 days fully indexed and searchable; warm: 30 days, reduced indexing; cold: 1+ year, archive-only (re-indexable on demand).

## 2. Capacity Estimation

**Ingestion throughput**
- 10,000 hosts × 500 lines/sec = **5,000,000 log lines/sec** fleet-wide average; assume incident-driven bursts (an outage causes error-log volume to spike 10-50x on affected services) → design ingestion for at least **20-50M lines/sec burst** without falling over, even if it means shedding load gracefully rather than processing all of it in real time.
- At 500 bytes/line, 5M lines/sec ≈ **2.5 GB/sec ≈ 216 TB/day** raw ingress fleet-wide — this single number is why sampling, filtering, and tiered retention are not optional nice-to-haves but core architecture.

**Storage — hot tier**
- 7 days hot retention × 216 TB/day ≈ **~1.5 PB** in the hot (fully indexed, fast-search) tier. Indexing overhead in a system like Elasticsearch typically adds 50-100% on top of raw data size for inverted indexes and metadata → budget **~2.5-3 PB** of hot-tier storage.
- This is the number that forces every real logging system to aggressively filter/sample before indexing — most raw bytes (verbose debug logs, repetitive access logs) are never queried and shouldn't be paying full indexing cost.

**Storage — warm/cold tiers**
- Warm (30 days, lightly indexed or indexed-on-demand): compress raw logs (gzip typically 8-10x for repetitive text logs) and store in cheaper storage with a reduced index (e.g., only indexed on a handful of high-value fields: timestamp, service, level, trace_id) — roughly 216 TB/day × 23 additional days / ~9x compression ≈ **~550 TB**.
- Cold (1+ year, archive, e.g. S3/Glacier): raw compressed logs with no live index at all, re-indexed into a temporary hot cluster on demand for rare deep investigations — 216 TB/day × 335 days / 9x compression ≈ **~8 PB/year**, at object-storage prices this is the only tier where "keep everything for compliance" is remotely affordable.

**Buffering/batching**
- Each host-local agent batches lines before shipping (e.g., flush every 1-5 seconds or every 1MB, whichever first) — at 500 lines/sec/host × 500 bytes ≈ 250 KB/sec/host, a 1-second batch is ~250KB, a reasonable single network write instead of 500 tiny individual writes/sec/host.

## 3. High-Level Architecture

```
┌───────────┐  ┌───────────┐  ┌───────────┐
│  App Host 1 │  │  App Host 2 │  │  App Host N │
│ + Log Agent  │  │ + Log Agent  │  │ + Log Agent  │   (Fluentd/Filebeat/Vector — sidecar or DaemonSet)
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │  batched, compressed        │                │
       └───────────────┬───────────────┴────────────────┘
                        ▼
              ┌───────────────────┐
              │  Kafka (log buffer) │  (absorbs bursts, decouples producers from indexers)
              └─────────┬─────────┘
                         │
             ┌───────────┼────────────┐
             ▼            ▼            ▼
   ┌─────────────┐ ┌─────────────┐ ┌──────────────┐
   │ Sampling/     │ │  Indexer      │ │ Cold Archiver │
   │ Filtering Layer│ │ (parse/enrich │ │ (raw → S3,    │
   │ (drop noisy,  │ │  → Elasticsearch)│ │  compressed) │
   │  sample debug)│ └──────┬───────┘ └──────┬───────┘
   └─────────────┘         ▼                 ▼
                  ┌──────────────────┐ ┌──────────────────┐
                  │  Hot Index (ES)    │ │  Cold Storage (S3) │
                  │  7-day retention   │ │  1yr+ retention     │
                  └────────┬──────────┘ └──────────────────┘
                           ▼
                  ┌──────────────────┐
                  │  Query/Search UI   │  (Kibana-style, + alerting hooks)
                  └──────────────────┘
```

**Walkthrough**
1. **Collection**: a lightweight agent runs on every host (sidecar in a pod, or a DaemonSet in Kubernetes) tailing log files or receiving stdout/stderr, adding metadata (host, service, pod labels), and buffering locally.
2. **Shipping**: the agent batches and compresses lines, shipping them to Kafka — Kafka is the critical shock absorber: if the indexing tier is slow or down, logs queue in Kafka (bounded by retention) instead of blocking the agent or backpressuring into the application.
3. **Filtering/sampling**: before full indexing, a filtering layer drops known-noisy patterns and samples high-volume-low-value log levels (e.g., keep 100% of `ERROR`/`WARN`, sample 1% of `DEBUG`) — this is what keeps the hot-tier cost sane (see 6.3).
4. **Indexing**: surviving logs are parsed (structured JSON is easy; unstructured text gets pattern-extracted), enriched (geo-IP, service metadata), and written into the hot Elasticsearch-style index.
5. **Archival**: in parallel, *all* raw logs (pre-filtering) are durably archived to cheap object storage in their original/compressed form — this preserves everything for compliance/rare deep-dive investigations even though the hot index only has the filtered/sampled subset.
6. **Query**: engineers search the hot tier for real-time troubleshooting; queries against warm/cold tiers are slower and may require spinning up a temporary re-indexing job.

## 4. API Design

```
POST /internal/logs/ingest        // agent → ingestion pipeline (usually via Kafka, this is the HTTP fallback)
Request:
{
  "service": "checkout-api",
  "host": "ip-10-0-4-12",
  "level": "ERROR",
  "message": "payment gateway timeout after 5000ms",
  "trace_id": "tr_9f2a...",
  "timestamp": "2026-07-14T10:02:11.482Z",
  "fields": { "order_id": "ord_7B31", "latency_ms": 5023 }
}

GET /api/v1/search?q=level:ERROR AND service:checkout-api&from=2026-07-14T09:00:00Z&to=2026-07-14T10:00:00Z
Response: 200
{ "total": 4821, "hits": [ { "timestamp": "...", "message": "...", "fields": {...} } ] }

GET /api/v1/logs/trace/{trace_id}   // pull every log line across services for one request trace
Response: 200 { "trace_id": "tr_9f2a", "logs": [ ... ] }

POST /api/v1/alerts
Request: { "query": "level:ERROR AND service:checkout-api", "threshold": 100, "window_seconds": 60 }
```

## 5. Data Model & Storage Choice

```
log_document (hot index, Elasticsearch-style)
  timestamp, service, host, level, message (full-text indexed), trace_id (indexed),
  fields (JSON, selectively indexed — see 6.2 on cardinality control)

cold_archive (object storage)
  s3://logs-archive/{service}/{yyyy}/{mm}/{dd}/{hh}/{batch_id}.log.gz   -- raw, compressed, no live index
```

Log data is a natural fit for a document/search-oriented NoSQL store (Elasticsearch) rather than a relational database: the schema varies per service (arbitrary `fields`), the dominant access pattern is full-text + faceted search rather than joins, and write volume (millions of appends/sec) needs horizontal, shard-based scaling that relational engines don't offer at this throughput. See [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md). Kafka sits in front purely as a durable buffer, not a query surface — its append-only partitioned log (see [message-queues.md](../05-messaging-event-driven/message-queues.md) and [kafka-like-message-broker.md](kafka-like-message-broker.md)) is exactly what's needed to decouple bursty, uncontrollable producer rates from the indexer's steadier consumption rate.

## 6. Deep Dive

### 6.1 Log shipping agents: sidecar vs. DaemonSet, buffering strategy

Two deployment models for the collection agent: a **sidecar** (one agent per pod/container, tightly scoped, easy per-service configuration, but higher resource overhead at scale — N pods means N agent processes) versus a **DaemonSet** (one agent per node, tailing all containers' logs on that host — far fewer processes, shared resource footprint, but requires log-source multiplexing/routing logic in the agent to attribute lines to the right service). Most large fleets prefer the DaemonSet model (Fluentd/Filebeat/Vector) for the resource efficiency, accepting the added complexity of per-container log routing.

Buffering happens at multiple layers deliberately: the agent buffers in memory (and optionally to local disk, so a node reboot doesn't lose the buffer) before shipping, batching by size or time interval to avoid a network round-trip per log line. This local buffer is also the agent's shock absorber if Kafka itself is briefly unreachable — bounded, with an overflow policy (drop oldest, or drop new — usually drop new/incoming to protect against unbounded memory growth on the host) since, per the non-functional requirement, the logging pipeline must never let backpressure propagate into the application itself.

### 6.2 The high-cardinality field problem

Structured logging encourages attaching rich `fields` (order_id, user_id, request_id, arbitrary key-value pairs) to every line — but indexing every unique field value in a search engine like Elasticsearch creates a new term in the inverted index per unique value. A field like `order_id` or `trace_id` with millions of unique values explodes index size and, worse, can blow up cluster mapping (Elasticsearch's default dynamic mapping will happily create a new indexed field for every novel JSON key it sees, and a runaway high-cardinality or ever-changing schema can exhaust cluster field-count limits entirely — the infamous "mapping explosion"). Mitigations: an explicit, curated index mapping (don't rely on dynamic mapping in production) that marks high-cardinality identifier fields as `keyword`-not-analyzed-but-not-full-text (or excluded from the main searchable index and kept only in the raw archived copy, retrievable by exact match via a separate lightweight lookup rather than full-text search), and enforcing a schema/lint check in the logging client library so services can't accidentally introduce unbounded new field names.

### 6.3 Ingestion pipeline: sampling and load-shedding before indexing

Given the earlier math (~1.5-3 PB/week if every raw line were fully hot-indexed), the pipeline must decide, before indexing, what's worth the storage/query cost. Standard policy: index 100% of `ERROR`/`WARN`/`FATAL` levels (rare, high-value for incident response), sample `INFO`/`DEBUG` at a configurable rate (e.g., 1-10%) unless a specific trace is flagged for full capture (e.g., a customer support ticket references a `trace_id` — that trace's logs get retroactively pulled from the *raw archive*, not the sampled hot index, which is exactly why archiving 100% of raw logs separately from the filtered hot index matters — see 6.4). Under sudden burst conditions (an incident spiking error-log volume 50x), the pipeline additionally applies dynamic load-shedding: cap the ingestion rate per service and drop excess above the cap rather than let one noisy service's error storm degrade search performance or indexing lag for every other service sharing the cluster.

### 6.4 Retention tiers: hot/warm/cold

Hot tier (Elasticsearch, ~7 days, fully indexed, sub-second queries) is expensive per byte but necessary for real-time troubleshooting. Warm tier (30 days, indexed on a reduced set of fields, or indexed on a slower/cheaper class of nodes) trades query flexibility and speed for cost. Cold tier (S3/Glacier, 1+ year, no live index, raw compressed batches) is nearly free per byte but requires a re-indexing job (spin up a temporary Elasticsearch index from archived S3 batches for a specific time range/service) to query — acceptable because cold-tier access is rare, deliberate (compliance audit, post-incident deep forensics), and never latency-sensitive. The key architectural insight is that the raw archive is written *before* filtering (6.3), preserving full fidelity even though the hot index only ever sees the filtered/sampled subset — this decouples "what's cheap to keep forever" from "what's expensive to index for instant search."

## 7. Bottlenecks & Scaling

- **10x fleet size (100,000 hosts, 50M lines/sec)**: Kafka scales by adding partitions/brokers; the indexing tier becomes the constraint first — scale Elasticsearch by adding data nodes and increasing shard count, and push sampling rates down further for low-value log levels.
- **Index explosion from high-cardinality fields**: as covered in 6.2 — enforce mapping discipline and keyword-vs-text field types; without this, a single misbehaving service can degrade the shared cluster for everyone.
- **Hot-tier query load from broad, unbounded searches**: a query like "all ERROR logs across all services for 7 days" can be enormously expensive; enforce query-time guardrails (mandatory time range, mandatory service/index scoping) and result-size limits.
- **Burst absorption during incidents (the exact moment logs matter most)**: this is precisely when volume spikes hardest; Kafka's buffer plus dynamic load-shedding (6.3) are what keep the pipeline itself from becoming another outage during an already-bad incident.
- **Cross-region fleets**: ship logs to a regional Kafka/indexing cluster first, then replicate only aggregated/sampled summaries cross-region for a global view, rather than shipping every raw line across regions — see [multi-region architecture](../09-large-scale-data-systems/multi-region-architecture.md).

## 8. Trade-offs & Alternatives

- **Sampling debug/info logs vs. full fidelity**: sampling keeps hot-tier cost sane but means a specific rare debug line might not be in the searchable index when needed — mitigated by full raw archival (6.4) so nothing is truly lost, just not instantly searchable.
- **DaemonSet vs. sidecar agents**: DaemonSet is far more resource-efficient at scale but couples log routing logic to the agent and complicates strict per-tenant isolation (a noisy neighbor pod's agent load shares the node's agent process) — acceptable for most fleets, revisited for strict multi-tenant isolation needs.
- **Kafka as buffer vs. direct-to-indexer shipping**: adds an operational component and end-to-end latency (seconds) but is what makes the pipeline resilient to indexer slowdowns/outages without dropping logs or backpressuring producers — a durable buffer is worth the added hop.
- **Best-effort durability for most logs vs. guaranteed durability for audit/security logs**: treats the two classes differently — general app logs can tolerate rare loss under extreme load-shedding, but security/audit logs are routed through a separate, non-sampled, higher-durability path (sync-acknowledged writes) since regulatory/compliance requirements don't tolerate best-effort semantics there.

## Related topics
- [Message Queues](../05-messaging-event-driven/message-queues.md)
- [Search Architecture / Elasticsearch](../09-large-scale-data-systems/search-architecture-elasticsearch.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
- [Observability: Logs, Metrics & Traces](../08-reliability-operations/observability-logs-metrics-traces.md)
- [Distributed Tracing](../08-reliability-operations/distributed-tracing.md)
- [Object Storage Architecture](../09-large-scale-data-systems/object-storage-architecture.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
