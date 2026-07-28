# Observability: Logs, Metrics & Traces

[← Back to index](../readme.md)

## What it is and why it's asked

Observability is the ability to answer questions about your system's internal state *that you didn't know you'd need to ask* — using only the external signals it emits. Monitoring answers questions you anticipated ("is CPU above 80%?"); observability answers the ones you didn't ("why did the 99th-percentile latency for this specific customer's checkout spike at 2:14 AM last Tuesday, and only for requests that touched the new pricing service?").

Interviewers ask about this because production systems fail in ways nobody predicted, and "we have logs" is not the same as "we can debug an incident in minutes." A candidate who names the three pillars, knows what each is *bad* at, and can explain how they connect (not just that they all exist) is showing real operational maturity rather than buzzword recall.

## The three pillars — and what each one is bad at

**Logs** — discrete, timestamped events, usually with a message and structured fields. Best for: "what exactly happened on this one request/error, in detail." Bad at: aggregate questions ("what's my p99 latency across 10,000 instances?") — you'd have to scan and compute across a firehose of text, which is exactly what metrics exist to avoid.

**Metrics** — numeric measurements aggregated over time (counters, gauges, histograms). Best for: trends, alerting thresholds, dashboards, cheap long-term storage (a counter is a few bytes regardless of how many events it represents). Bad at: telling you *why* — a metric says latency went up, not which specific request, user, or code path caused it.

**Traces** — the path of a single request as it flows through multiple services, broken into timed spans. Best for: pinpointing *where* in a multi-hop call chain the latency or error actually originated. Bad at: aggregate system health (you wouldn't build your primary alerting off individual traces) and bad at capturing state that isn't part of the request path (background job health, queue depth).

```text
Metrics:  "p99 latency for checkout jumped from 200ms to 4s at 14:03"   ← WHAT and WHEN

Traces:   "...because the inventory-service span took 3.8s of that 4s"  ← WHERE

Logs:     "...because inventory-service logged
           'DB connection pool exhausted'
           at 14:03:12"                                                  ← WHY
```

None of the three is sufficient alone; the value comes from using them together and being able to pivot between them during an investigation.

## Structured logging: JSON logs and correlation IDs

Unstructured logs like:

```text
User 4821 checkout failed
```

are only searchable by text.

Structured logs emit consistent JSON:

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

The most important field is the **correlation ID** (typically the `trace_id`).

Every service handling the same request logs the same `trace_id`, allowing one query to retrieve every related log entry across your distributed system.

Without correlation IDs, engineers end up manually correlating timestamps across multiple services—a slow and error-prone process.

## Metrics: types, and the RED/USE methods

Three core metric types:

### Counter

Monotonically increasing values.

Examples:

- Total requests
- Total errors
- Total logins

Useful when viewed as a rate.

```text
http_requests_total
```

### Gauge

Values that increase and decrease.

Examples:

- CPU usage
- Memory usage
- Queue depth
- Active database connections

### Histogram

Stores distributions rather than single values.

Examples:

- Request latency
- Response size
- Query execution time

Histograms enable percentiles such as:

- p50
- p95
- p99

### RED Method

For request-driven services:

- **Rate**
- **Errors**
- **Duration**

If you only expose three metrics for a service, these should usually be them.

### USE Method

For infrastructure resources:

- **Utilization**
- **Saturation**
- **Errors**

Example:

```text
RED

Requests/sec : 1200
Error Rate   : 0.3%
p99 Latency  : 220ms

USE (DB Pool)

Utilization : 95%
Saturation  : 40 requests waiting
Errors      : 12 connection timeouts/min
```

RED tells you the service is unhealthy.

USE tells you which resource is causing it.

## The cardinality explosion problem

Every unique metric label combination creates a new time series.

Good:

```text
http_requests_total{
  method="GET",
  status="200"
}
```

Bad:

```text
http_requests_total{
  user_id="4821823"
}
```

Even worse:

```text
http_requests_total{
  request_id="a1b2c3"
}
```

Millions of users or request IDs create millions of time series, overwhelming monitoring systems.

**Rule of thumb:**

Use low-cardinality labels for metrics.

Use high-cardinality values (user IDs, request IDs, emails, trace IDs) in logs and traces instead.

## How the three pillars connect

A typical production investigation looks like this:

```text
1. Metric Alert

Checkout p99 latency > 2s

        │
        ▼

2. Trace

checkout-service
    │
    ▼
inventory-service (3.8s)
    │
    ▼
payment-service (60ms)

        │
        ▼

3. Logs

trace_id = 4bf92f3577b34da6...

"DB connection pool exhausted"

        │
        ▼

Root cause:
Database connection pool saturation
```

Metrics tell you **something is wrong**.

Traces tell you **where**.

Logs tell you **why**.

## Common observability stack

### Metrics

- Prometheus
- Grafana
- CloudWatch
- Datadog
- New Relic

### Logs

- ELK Stack (Elasticsearch + Logstash + Kibana)
- Fluent Bit / Fluentd
- Grafana Loki

### Traces

- Jaeger
- Zipkin
- AWS X-Ray
- OpenTelemetry Collector

### Commercial platforms

- Datadog
- New Relic

These combine metrics, logs, traces, dashboards, alerting, and APM into a unified experience.

## Trade-offs summary

| Pillar | Storage Cost | Best For | Cardinality Tolerance |
|---|---|---|---|
| Logs | High | Detailed debugging | High |
| Metrics | Low | Dashboards, trends, alerts | Low |
| Traces | Medium-High | Request flow and latency analysis | High (usually sampled) |

## Common interview follow-ups

### Q: If you could only implement one pillar first?

Structured logging with correlation IDs.

It's inexpensive, immediately useful, and forms the foundation for traces and cross-service debugging.

---

### Q: How do you prevent metric cardinality explosions?

- Restrict metric labels.
- Never use user IDs or request IDs as labels.
- Push high-cardinality information into logs or traces.
- Monitor the number of active time series.

---

### Q: What's the difference between metric-based and log-based alerts?

**Metric alerts**

- Fast
- Cheap
- Good for thresholds
- Example: error rate > 1%

**Log alerts**

- More expensive
- Better for detecting specific exception patterns or messages
- Usually used for investigation rather than primary paging

---

### Q: Why not derive metrics from logs?

It's possible, but expensive.

Computing latency percentiles or request rates from raw logs requires scanning huge volumes of data, while metrics are already aggregated and optimized for this purpose.

---

### Q: How does sampling affect observability?

- Metrics are generally **not sampled**.
- Logs may sample routine successful requests while keeping all errors.
- Traces are commonly sampled because storing every request is expensive.

---

### Q: Dashboards look healthy, but users complain. What could be happening?

Aggregate metrics can hide localized problems.

Examples:

- One region is failing.
- One customer tier is affected.
- One endpoint is slow.
- One dependency is timing out.

Use dimensions, traces, and Real User Monitoring (RUM) to investigate these cases instead of relying solely on aggregate dashboards.

## Related topics

- [Database Sharding](../02-data-storage/database-sharding.md)
- [Database Partitioning](../02-data-storage/database-partitioning.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Object Storage Architecture](./object-storage-architecture.md)
- [Distributed File Systems](./distributed-file-systems.md)
- [Event Sourcing](../05-messaging-event-driven/event-sourcing.md)
- [CQRS Pattern](../05-messaging-event-driven/cqrs-pattern.md)
