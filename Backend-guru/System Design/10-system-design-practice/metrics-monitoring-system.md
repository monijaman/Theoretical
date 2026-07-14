# Design a Metrics & Monitoring System
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Collect numeric time-series metrics (counters, gauges, histograms) from a large fleet of services/hosts.
- Support flexible tagging/labels (e.g., `service=checkout, region=us-east, status_code=500`).
- Query/aggregate time series for dashboards (sum, rate, percentiles, group-by-label).
- Alert when a metric crosses a threshold or deviates anomalously from its baseline.
- Retain long-term history at reduced resolution for trend analysis (downsampling).

**Non-functional**
- Ingestion must scale to millions of data points/sec fleet-wide without becoming a fleet-wide dependency that itself causes outages.
- Query latency: dashboards need sub-second-to-a-few-seconds response for recent data; historical range queries can be slower.
- Metrics are inherently approximate/best-effort — losing a handful of data points during a collector restart is acceptable; the system optimizes for overall trend accuracy, not per-point durability.
- High cardinality (unique label combinations) must be bounded and controlled — this is the single biggest operational risk in any metrics system.
- Alerting must be reliable even when the metrics backend itself is degraded (alerting is often the most safety-critical part of the whole system).

**Assumptions**
- 20,000 hosts/containers, each exposing ~2,000 distinct time series (per-endpoint latency histograms, per-status-code counters, resource gauges), scraped every 15 seconds.
- Long-term retention: raw resolution for 15 days, downsampled rollups (5-min, 1-hour) retained for 13 months.

## 2. Capacity Estimation

**Ingestion rate**
- 20,000 hosts × 2,000 series × (1 scrape / 15 sec) ≈ 20,000 × 2,000 / 15 ≈ **~2,666,667 data points/sec** fleet-wide (~2.7M/sec).
- Each data point (timestamp + value + label set reference) compresses very well with time-series-specific encoding (delta-of-delta timestamps, XOR-based float compression — the classic Facebook Gorilla approach) to roughly 1-2 bytes/point after compression, versus ~16 bytes uncompressed → at 2 bytes/point average, 2.7M points/sec × 2 bytes ≈ **~5.3 MB/sec** compressed ingest, ~460 GB/day.

**Storage — raw + rollups**
- Raw (15-day retention): 460 GB/day × 15 ≈ **~6.9 TB**.
- 5-minute rollups (aggregated: count/sum/min/max/avg per 5-min bucket per series) reduce point count by ~20x versus 15-second raw → roughly 460GB/20 ≈ 23 GB/day equivalent, retained for 13 months ≈ **~840 GB**.
- 1-hour rollups reduce further by another 12x on top of the 5-min rollup → a few GB/day equivalent, retained for years at negligible cost.
- This tiered downsampling is what makes "13 months of history" affordable — keeping 13 months of *raw* 15-second data would be 460GB × 395 days ≈ **~182 TB**, over 25x more than the rollup approach for data nobody queries at 15-second granularity a year later anyway.

**Cardinality — the real sizing risk**
- "2,000 series per host" already assumes labels are reasonably bounded. If a careless service adds a high-cardinality label (e.g., `user_id` or `request_id` as a tag), the same metric name explodes from, say, 10 label combinations to millions — turning one metric into what's effectively millions of independent time series. At scale this is the dominant failure mode of metrics systems (see 6.2), far more so than raw data point volume.

**Query load**
- Assume 5,000 active dashboard panels + alert rules, each querying every 30-60 seconds → ~100-150 queries/sec sustained against the query layer, each potentially aggregating over thousands of underlying series — query-side fan-out and pre-aggregation matter as much as ingestion-side scaling.

## 3. High-Level Architecture

```
┌──────────┐   ┌──────────┐   ┌──────────┐
│  Host + Exporter│ │ Host + Exporter│ │ Host + Exporter│   (expose /metrics endpoint, or push via agent)
└──────┬─────┘   └──────┬─────┘   └──────┬─────┘
       │  pull (scrape) or push          │
       └───────────────┬──────────────────┘
                        ▼
              ┌───────────────────┐
              │  Scraper/Collector  │  (sharded by target set, service-discovery driven)
              │  Tier                │
              └─────────┬─────────┘
                         ▼
              ┌───────────────────┐
              │  Ingestion/Write    │  (validate, compress, cardinality-limit)
              │  Path                │
              └─────────┬─────────┘
                         ▼
              ┌───────────────────┐        ┌───────────────────┐
              │  Time-Series DB     │──────▶│  Downsampling Job   │──▶ Rollup storage (5-min, 1-hr)
              │  (raw, 15-day)      │        └───────────────────┘
              └─────────┬─────────┘
                         ▼
              ┌───────────────────┐      ┌────────────────────┐
              │  Query Engine        │◀────│  Dashboard (Grafana)│
              │  (PromQL-style)       │      └────────────────────┘
              └─────────┬─────────┘
                         ▼
              ┌───────────────────┐
              │  Alerting Engine      │──▶ Alertmanager → PagerDuty/Slack
              │  (rule eval + anomaly)│
              └───────────────────┘
```

**Walkthrough**
1. **Exposition**: each service exposes its current metric values on a `/metrics` endpoint (pull model) or pushes them to a local agent (push model) — see 6.1 for the trade-off.
2. **Collection**: a sharded scraper tier (service-discovery driven, so it automatically picks up new hosts/containers) pulls metrics on a fixed interval (15s) and forwards them to the ingestion path.
3. **Ingestion**: validates incoming series against cardinality limits (rejecting or dropping label combinations that exceed configured bounds), compresses, and writes into the time-series database's raw tier.
4. **Downsampling**: a background job continuously (or on a schedule) rolls up raw data into 5-minute and 1-hour aggregates, which are what long-range queries actually hit.
5. **Query**: dashboards and alert rules query through a query engine (PromQL-style expression language) that automatically routes to the appropriate resolution tier depending on the requested time range.
6. **Alerting**: the alerting engine continuously evaluates configured rules (and anomaly-detection models) against fresh data, firing to a notification routing layer independent of the dashboard query path, so dashboard slowness never delays a page.

## 4. API Design

```
GET /metrics                          // exposition format, scraped by the collector, not called by users
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{service="checkout-api",status="500",region="us-east"} 4821

POST /api/v1/query
Request: { "query": "rate(http_requests_total{service=\"checkout-api\",status=\"500\"}[5m])", "time": "2026-07-14T10:00:00Z" }
Response: 200
{ "result": [ { "labels": {"service":"checkout-api"}, "value": 12.4 } ] }

POST /api/v1/query_range
Request: { "query": "...", "start": "...", "end": "...", "step": "60s" }

POST /api/v1/alerts/rules
Request:
{
  "name": "checkout-5xx-spike",
  "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) > 50",
  "for": "2m",
  "severity": "page"
}
```

## 5. Data Model & Storage Choice

```
time_series identity = metric_name + sorted label set, e.g.:
  http_requests_total{service="checkout-api", status="500", region="us-east"}

samples (per series, append-only, compressed columnar chunks)
  timestamp, value

rollups (materialized, same label identity, coarser resolution)
  5min: timestamp_bucket, count, sum, min, max
  1hr:  timestamp_bucket, count, sum, min, max
```

Time-series data is the canonical case for a **purpose-built time-series database** (Prometheus's own TSDB, InfluxDB, or a columnar store like a Cassandra/HBase-backed system at very large scale) rather than either a general relational database or a generic NoSQL document store — the access pattern (append-mostly writes ordered by time, range-scan reads by time window, and predictable per-series retention/rollup) is different enough from either that specialized encoding (delta-of-delta timestamps, XOR float compression, per-series chunking) buys an order of magnitude in storage and query efficiency that a general-purpose engine wouldn't. See [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md) for the general framework — this is a case where neither classic column fits perfectly and the right answer is a specialized store built for exactly this shape of data.

The **label set is effectively the primary key** for a series — this is why cardinality (the count of distinct label-set combinations) directly determines the number of independent series the storage engine must track, index, and chunk separately, and why it's the central scaling concern (6.2) rather than raw point count alone.

## 6. Deep Dive

### 6.1 Pull vs. push collection models

**Pull (Prometheus model)**: the monitoring system scrapes each target's `/metrics` endpoint on a schedule. This gives the collector natural control over load (it decides the scrape rate, can back off from a struggling target) and makes "is this target even reachable" itself a useful signal (a failed scrape is meaningful). It requires service discovery to know what to scrape, and doesn't naturally fit short-lived jobs that don't live long enough to be scraped (mitigated with a push-gateway intermediary for batch jobs).

**Push (StatsD/Datadog-agent model)**: each host/service actively sends metrics to a collector or local agent. This fits ephemeral/serverless workloads well (a Lambda invocation can push its one data point and exit before any scrape could happen) and doesn't require the monitoring system to discover targets. The trade-off is the monitoring system has less control over ingestion rate — a misbehaving service can push at an arbitrary, potentially overwhelming rate — and "silence" is ambiguous (did the service stop, or did it just have nothing to report?), unlike a pull failure which is unambiguous.

Most large-scale systems end up hybrid: pull for standard long-running services (better operational properties), push (via a gateway or local agent) for ephemeral/batch workloads and for edge cases the scrape model doesn't fit.

### 6.2 Cardinality explosion — the core operational risk

Every unique combination of metric name + label values is a distinct series the storage engine must track independently. A metric like `http_requests_total{service, status_code}` with 50 services × 10 status codes is a totally manageable 500 series. The same metric with an accidentally-added `user_id` or `request_id` label explodes to millions of series — each one requiring its own chunk, index entry, and memory footprint in the ingestion buffer — and can single-handedly exhaust a metrics backend's memory or query performance for every tenant sharing that backend, not just the offending service. This is structurally the same failure mode as the logging system's high-cardinality field problem (see [logging-system.md](logging-system.md) 6.2), but more severe in metrics systems because the entire storage/query engine is architected around the assumption that cardinality is bounded and human-scale.

Mitigations: enforce cardinality limits at ingestion (reject or drop new label combinations once a metric exceeds a configured series-count budget, alerting the owning team rather than silently degrading the whole cluster), lint/validate metric-emitting code in CI against known high-cardinality label names (`user_id`, `session_id`, `request_id`, raw IPs), and provide a separate, explicitly-provisioned high-cardinality path (often just routing that data to the logging or tracing system instead, which are built for high-cardinality identifiers) for genuine per-request-detail needs rather than trying to force it through the metrics system at all.

### 6.3 Downsampling and long-term rollups

Storing 15-second-resolution data for 13 months is both unaffordable (as computed in section 2) and pointless — nobody needs 15-second granularity to see a trend from 8 months ago. A background rollup job continuously aggregates raw data into coarser time buckets (5-minute, then 1-hour), storing `count/sum/min/max` (enough to reconstruct averages and are honest about the fact that individual spikes get smoothed out at coarse resolution — a genuine, accepted information loss). The query engine automatically selects which resolution tier to read from based on the requested time range and step size, so a dashboard panel showing "last year" transparently reads from hourly rollups while one showing "last 30 minutes" reads raw data — this tiering is invisible to the end user but is what keeps both storage cost and query latency for wide time ranges under control.

### 6.4 Alerting: threshold rules and anomaly detection

The simplest and most common alerting model is threshold-based: continuously evaluate an expression (e.g., `rate(errors[5m]) > 50`) and fire if it holds true for a sustained duration (the `for: 2m` clause prevents flapping on a single noisy sample). This is simple, explainable, and what most on-call teams actually want, because a human picked the threshold and understands exactly why it fired.

Anomaly detection (statistical baselining — comparing current values against a learned expected range based on historical seasonality, e.g., "this metric is usually X at this time of day/week") catches problems a fixed threshold would miss (a metric that's "normal" in absolute terms but wildly abnormal for a Tuesday morning) but is harder to explain to on-call engineers and prone to both false positives (unusual-but-benign traffic patterns) and false negatives (a slow, gradual regression that never looks anomalous relative to its own recent trend). In practice, threshold-based alerting handles the majority of paging needs, with anomaly detection layered on as a complementary signal for slower-burning issues, not a wholesale replacement.

Critically, the alerting engine must be resilient independent of the query/dashboard layer's health — if the metrics backend is itself degraded, alerting still needs to fire (often by running its own lightweight, redundant evaluation path or by monitoring the metrics pipeline's own health with a separate, simpler system — "who alerts on the alerting system" is a real operational question).

## 7. Bottlenecks & Scaling

- **10x ingestion volume (27M points/sec)**: shard the time-series database by metric name/label hash across multiple ingestion+storage nodes (similar sharding logic to [database-sharding](../02-data-storage/database-sharding.md)); scale the scraper tier horizontally, partitioning target sets across scraper shards.
- **Cardinality growth outpacing point-count growth**: as covered in 6.2 — this is often the actual 10x-scale killer, not raw throughput; hard per-team series budgets and CI-time linting are the durable fix, not more hardware.
- **Cross-cluster/global dashboards**: federate — aggregate rollups from each regional/cluster-local metrics backend into a smaller global tier rather than shipping every raw point cross-region; see [multi-region architecture](../09-large-scale-data-systems/multi-region-architecture.md).
- **Query fan-out on wide-label-set queries**: a query like `sum(rate(...)) by (service)` across thousands of series requires scanning and aggregating all of them; pre-aggregate common rollups (by service, by region) at write time (recording rules) so expensive aggregations are computed once, not on every dashboard refresh.
- **Alerting reliability during backend degradation**: run the alert-evaluation path on its own resource pool, separate from ad-hoc dashboard query load, so a flood of manual dashboard queries during an incident doesn't delay the alert evaluations that matter most at exactly that moment.

## 8. Trade-offs & Alternatives

- **Pull vs. push collection**: chose pull as the default (Prometheus-style) for its natural backpressure control and unambiguous failure signal, accepting a push-gateway workaround for ephemeral/batch jobs that don't fit the pull model well.
- **Best-effort delivery vs. guaranteed durability**: metrics deliberately favor availability and ingestion throughput over guaranteed per-point durability — losing a scrape here and there barely affects a rate/percentile calculation, and chasing stronger durability would cost far more than the value it adds. This is a deliberate, different choice than the payment system's ledger, which cannot make this trade.
- **Coarse rollups vs. keeping raw data forever**: rollups make long-term storage affordable but permanently lose the ability to see a specific 15-second spike from 10 months ago — accepted because that level of detail is essentially never needed for trend analysis, and anything requiring it should be caught by an alert or a trace at the time, not reconstructed from historical raw metrics.
- **Threshold alerting vs. anomaly detection as the primary mechanism**: kept thresholds as the default because they're explainable and directly actionable for on-call engineers, using anomaly detection as a supplementary signal rather than the primary alerting mechanism, trading some missed slow-burn regressions for far fewer confusing/unexplainable pages.

## Related topics
- [Observability: Logs, Metrics & Traces](../08-reliability-operations/observability-logs-metrics-traces.md)
- [Distributed Tracing](../08-reliability-operations/distributed-tracing.md)
- [Database Sharding](../02-data-storage/database-sharding.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
- [Real-Time System Design](../09-large-scale-data-systems/real-time-system-design.md)
