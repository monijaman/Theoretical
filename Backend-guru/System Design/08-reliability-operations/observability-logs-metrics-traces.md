# Observability: Logs, Metrics & Traces
[← Back to index](../readme.md)

## What it is and why it's asked

Observability is the ability to answer questions about your system's internal state *that you didn't know you'd need to ask* — using only the external signals it emits. Monitoring answers questions you anticipated ("is CPU above 80%?"); observability answers the ones you didn't ("why did the 99th-percentile latency for this specific customer's checkout spike at 2:14 AM last Tuesday, and only for requests that touched the new pricing service?").

Interviewers ask about this because production systems fail in ways nobody predicted, and "we have logs" is not the same as "we can debug an incident in minutes." A candidate who names the three pillars, knows what each is *bad* at, and can explain how they connect (not just that they all exist) is showing real operational maturity rather than buzzword recall.

## The three pillars — and what each one is bad at

**Logs** — discrete, timestamped events, usually with a message and structured fields. Best for: "what exactly happened on this one request/error, in detail." Bad at: aggregate questions ("what's my p99 latency across 10,000 instances?") — you'd have to scan and compute across a firehose of text, which is exactly what metrics exist to avoid.

**Metrics** — numeric measurements aggregated over time (counters, gauges, histograms). Best for: trends, alerting thresholds, dashboards, cheap long-term storage (a counter is a few bytes regardless of how many events it represents). Bad at: telling you *why* — a metric says latency went up, not which specific request, user, or code path caused it.

**Traces** — the path of a single request as it flows through multiple services, broken into timed spans. Best for: pinpointing *where* in a multi-hop call chain the latency or error actually originated. Bad at: aggregate system health (you wouldn't build your primary alerting off individual traces) and bad at capturing state that isn't part of the request path (background job health, queue depth).

```
Metrics:  "p99 latency for checkout jumped from 200ms to 4s at 14:03"   ← WHAT and WHEN
Traces:   "...because the inventory-service span took 3.8s of that 4s"  ← WHERE
Logs:     "...because inventory-service logged 'DB connection pool
           exhausted, waited 3.7s for a connection' at 14:03:12"        ← WHY, in detail
```

None of the three is sufficient alone; the value is in the combination, and specifically in being able to jump from one to another without re-deriving context — covered below.

## Structured logging: JSON logs and correlation IDs

Unstructured logs (`"User 4821 checkout failed"`) are only greppable by luck of phrasing. Structured logs emit a consistent, machine-parseable shape — almost always JSON in production systems — so every field is queryable:

```json
{
  "timestamp": "2026-07-14T14:03:12.442Z",
  "level": "error",
  "service": "inventory-service",
  "message": "DB connection pool exhausted",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "user_id": "4821",
  "order_id": "ord_9f2a1",
  "pool_wait_ms": 3700
}
```

The field that makes this connect to the rest of observability is the **correlation ID** (typically the `trace_id`): every log line emitted while handling a given request carries the same ID, so a query like `trace_id:4bf92f3577b34da6a3ce929d0e0e4736` in your log aggregator (Elasticsearch/ELK, Splunk, Datadog Logs) instantly pulls every log line from every service that touched that one request — no manual timestamp-correlation guesswork across services with clocks that are never perfectly in sync.

Without correlation IDs, debugging a distributed request means grepping multiple services' logs by approximate timestamp and hoping nothing else was happening at the same moment — this is the single most common observability gap in systems that "have logging" but still take hours to debug an incident.

## Metrics: types, and the RED/USE methods

Three fundamental metric types (the model Prometheus uses, and the de facto industry vocabulary):

- **Counter** — monotonically increasing value (total requests served, total errors). Only useful as a rate (`requests_total` per second), never read as a raw cumulative number.
- **Gauge** — a value that goes up or down (current memory usage, queue depth, active connections).
- **Histogram** (or summary) — distribution of observed values bucketed for percentile calculation (request latency buckets: <10ms, <50ms, <100ms, <500ms, <1s...). This is how you get p50/p95/p99 without storing every individual value forever.

Two standard frameworks for deciding *which* metrics matter, so you don't drown in vanity metrics:

**RED method** (for request-driven services): **R**ate (requests/sec), **E**rrors (error rate), **D**uration (latency distribution). If you can only instrument three things per service, these are the three — they answer "is this service serving traffic correctly and fast enough" directly.

**USE method** (for resources — CPU, memory, disk, network, connection pools): **U**tilization (percent busy), **S**aturation (how much work is queued waiting), **E**rrors (resource-level errors, e.g. dropped packets). RED tells you the service is unhealthy; USE tells you *which resource* is the bottleneck causing it.

```
RED (checkout-service):            USE (checkout-service's DB connection pool):
  rate:     1,200 req/s              utilization: 95% of pool in use
  errors:   0.3%                     saturation:  40 requests queued waiting for a connection
  duration: p99 = 220ms              errors:      12 connection timeouts/min

  → RED says checkout is slow-ish but not failing
  → USE points at the DB pool as the likely saturation point causing it
```

## The cardinality explosion problem

Metrics systems (Prometheus, Datadog, CloudWatch) store each unique combination of metric name + label values as a separate time series. This is cheap when labels are low-cardinality (`method=GET|POST`, `status=200|404|500`, `region=us-east-1|eu-west-1` — tens to hundreds of combinations). It becomes catastrophically expensive when a label carries high-cardinality data:

```
http_requests_total{method="GET", status="200", user_id="4821823"}   ← BAD
http_requests_total{method="GET", status="200", request_id="a1b2c3"} ← WORSE

If you have 10M distinct users, that single metric name now has up to
10M time series instead of ~20 — storage and query cost explode,
and most monitoring backends will simply reject or silently drop it.
```

The fix: never put unbounded-cardinality fields (user ID, request ID, raw email, full URL with query string) into a *metric label* — those belong in logs and trace attributes instead, which are built to handle high-cardinality, per-event data. Metrics should stay low-cardinality and aggregate; that division of labor is itself a key reason all three pillars exist rather than one "do everything" system.

## How the three pillars connect

The practical payoff of investing in all three is the ability to pivot between them during an incident without re-deriving context:

```
1. Alert fires from a METRIC:  p99 latency on checkout-service > 2s (RED method)
2. You pull up a TRACE for a slow request in that window:
     checkout-service (50ms) → inventory-service (3.8s) → payment-service (60ms)
     ...inventory-service's span is almost the entire duration
3. You jump from that span's trace_id straight into LOGS filtered by that trace_id:
     "DB connection pool exhausted, waited 3.7s for a connection"
4. Root cause found in under 5 minutes: connection pool sized too small
   for a traffic spike, not a code bug.
```

This is why modern tooling is built to link them by ID rather than as three unrelated products: OpenTelemetry can auto-inject `trace_id`/`span_id` into your structured log output, Grafana can jump from a Prometheus panel straight into Loki logs or Tempo/Jaeger traces for the same time window and service, and Datadog's unified service tagging does the equivalent across its APM, logs, and metrics products.

## The common stack

- **Metrics**: Prometheus (pull-based scraping, PromQL) + Grafana (dashboards/alerting) is the de facto open-source standard; CloudWatch, Datadog, and New Relic are the common managed equivalents.
- **Logs**: the ELK/Elastic stack (Elasticsearch + Logstash/Fluentd/Fluent Bit + Kibana), or Grafana Loki (indexes only labels, not full text, for cheaper storage) — see `../10-system-design-practice/logging-system.md` for how a log pipeline is actually built end to end.
- **Traces**: Jaeger and Zipkin (open-source), AWS X-Ray (managed), all increasingly fed via the OpenTelemetry SDK/Collector rather than a vendor-specific SDK — see `distributed-tracing.md` for the full model.
- **All-in-one commercial platforms**: Datadog and New Relic bundle all three pillars with cross-linking built in, trading cost for integration convenience over assembling the open-source stack yourself.

## Trade-offs summary

| Pillar | Storage cost | Best for | Cardinality tolerance |
|---|---|---|---|
| Logs | High (full text/structured events) | Detailed per-request debugging | High (fine to have unique IDs per line) |
| Metrics | Low (aggregated numbers) | Trends, alerting, dashboards | Low (must stay bounded) |
| Traces | Medium-high (per-request spans) | Cross-service latency/error localization | High, but usually sampled to control volume |

## Common interview follow-ups

**Q: If you could only add one pillar to a system that has none, which would you pick?**
Structured logs with correlation IDs — they're the cheapest to retrofit (no new infrastructure, just a logging library change), immediately debuggable by hand, and lay the groundwork (the correlation ID) that traces and log-based metrics will both build on later. Metrics/dashboards are usually added next because alerting is what actually gets you paged before a customer complains.

**Q: How do you keep metrics cardinality under control in practice?**
Enforce it at instrumentation time with a label allowlist/lint rule (many Prometheus setups reject unknown high-cardinality labels), push anything per-user or per-request into logs/traces instead, and monitor your metrics backend's own "series count" or "active time series" metric so a cardinality leak (e.g., someone adds a `url` label with query params) is caught before it takes down the monitoring system itself.

**Q: What's the difference between a metric-based alert and a log-based alert?**
Metric-based alerts are cheap, fast to evaluate, and good for "rate/threshold crossed" conditions (error rate > 1%); log-based alerts (e.g., alerting on a specific error message pattern) are more expensive to run continuously but catch conditions that don't fit a clean numeric threshold, like a specific new exception type appearing at all. Most production setups lean heavily on metrics for paging and use log search for investigation, not primary alerting.

**Q: Why not just log everything and derive metrics from logs instead of maintaining a separate metrics system?**
You can (this is what Loki/CloudWatch Logs Insights-style "log-based metrics" do), but computing a percentile or rate from raw log volume at query time is far more expensive than reading a pre-aggregated histogram, and it doesn't scale to high-traffic services without a real-time streaming aggregation layer in front — at that point you've just rebuilt a metrics system on top of your log pipeline.

**Q: How does sampling interact with these three pillars?**
Metrics are effectively never sampled (they're pre-aggregated, so every event already contributes cheaply); logs are sometimes sampled at very high volume (e.g., only log 1% of successful 200 responses, but 100% of errors); traces are the pillar sampling matters most for, since a full trace per request at high QPS is expensive to store — see `distributed-tracing.md` for head-based vs tail-based sampling.

**Q: A service "looks healthy" on dashboards but users are complaining. What's missing?**
Likely a gap between synthetic/aggregate metrics and real user experience — p99 latency averaged across all requests can look fine while a specific segment (one region, one customer tier, one code path) is badly broken and gets diluted into the aggregate. This is the case for real user monitoring (RUM) and slicing metrics by dimension, plus confirms why traces (which show individual request paths) catch what aggregate dashboards hide.

## Related topics
- [Distributed Tracing](distributed-tracing.md)
- [High Availability](high-availability.md)
- [Fault Tolerance](fault-tolerance.md)
- [Logging System](../10-system-design-practice/logging-system.md)
- [Metrics & Monitoring System](../10-system-design-practice/metrics-monitoring-system.md)
- [Circuit Breaker Pattern](../01-scaling-traffic/circuit-breaker-pattern.md)
