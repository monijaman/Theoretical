# Distributed Tracing
[← Back to index](../readme.md)

## What it is and why it's asked

Distributed tracing follows a single logical request as it hops across every service, queue, and datastore it touches, recording how long each hop took and how they nested. It exists because once a request crosses more than a couple of service boundaries, "which service is slow" stops being answerable from any single service's own logs or metrics — each service only sees its own slice, not the shape of the whole call.

Interviewers ask about this to see if you understand *why* microservices architectures need a fundamentally different debugging toolkit than a monolith did. In a monolith, a stack trace and a profiler get you most of the way. Across ten services, a single user-facing request might touch an API gateway, an auth service, three backend services, two caches, and a database — and the one that's slow is invisible unless every hop is instrumented to say "I am part of request X, I started at T, I took N ms, and I called these other things."

## The model: traces, spans, and context propagation

- **Trace** — the entire end-to-end journey of one logical request, identified by a single `trace_id` generated at the very first entry point (e.g., the API gateway or the client SDK).
- **Span** — one unit of work within that trace — typically one service handling one operation (an HTTP call, a DB query, a queue publish). Each span has its own `span_id`, a start time, a duration, and a `parent_span_id` pointing to whoever called it, which is what lets a tracing backend reconstruct the nesting.
- **Context propagation** — the mechanism that carries `trace_id` + current `span_id` across process boundaries, usually as HTTP headers (the W3C `traceparent` header is the current standard) or message-queue metadata, so the *next* service knows which trace it's part of and which span is its parent.

```text
Trace: 4bf92f3577b34da6a3ce929d0e0e4736
                                                     (waterfall view — width = duration)
API Gateway        [span: root, 420ms                                    ]
  Auth Service        [span: verify-token, 15ms]
  Order Service          [span: handle-order, 380ms                       ]
    Inventory Svc          [span: check-stock, 40ms]
    Payment Service           [span: charge-card, 310ms                      ]
      Payment Gateway (3rd party) [span: external-call, 295ms                    ]
    Notification Svc                                     [span: send-email, 20ms]
```

Each arrow-in/arrow-out across a service boundary is a **context propagation** event: the caller injects `traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01` into the outgoing request headers; the callee extracts it, creates its own child span with a new `span_id` but the same `trace_id`, and continues the chain. Miss this at any hop (a service that doesn't forward the header) and the trace silently breaks into two disconnected traces — one of the most common real-world tracing bugs.

## Why one flame graph beats ten sets of logs

Without tracing, diagnosing "checkout is slow" means: pull up logs from the API gateway, guess the approximate timestamp, pull up logs from order-service, guess again for payment-service, and manually reconstruct a timeline that may be wrong because clocks across services are never perfectly synchronized. With tracing, the same investigation is one query (`trace_id:...`) that returns an already-assembled waterfall/flame graph showing exactly which span consumed the time — in the diagram above, `charge-card`'s 310ms is almost entirely `external-call`'s 295ms, immediately pointing at the third-party payment gateway rather than at your own code.

This is the core value proposition: tracing turns "which of my 10 services is slow" from a multi-hour cross-team log-grepping exercise into a single lookup.

## Sampling: head-based vs tail-based

Recording a full trace for every single request is expensive at scale (storage and network overhead for the trace data itself), so almost all production tracing systems sample — but *how* they sample determines whether you actually catch the requests you most need to see.

**Head-based sampling** — the decision to record (or drop) a trace is made at the very start, before anything is known about how the request will turn out (e.g., "sample 1% of all requests, randomly, at the entry point"). Cheap and simple — every downstream service just respects the sampling decision already embedded in the propagated context. The problem: a random 1% sample overwhelmingly captures normal, fast, successful requests, because that's what most traffic is — the rare slow or failed request you actually care about has only a 1% chance of being kept.

**Tail-based sampling** — the decision is deferred until the *entire* trace is complete, so it can consider the full picture (did any span error? was total latency above a threshold?) before deciding to keep or discard it. This reliably catches the rare slow/failed requests that head-based sampling mostly misses, at the cost of needing to buffer every span of every trace somewhere (usually at a collector layer) until the trace finishes, which is more memory- and infrastructure-intensive.

```text
Head-based (decide at t=0, before outcome known):
  1,000 requests → sample 1% → 10 traces kept
  Of those 10: ~9 are fast/normal, ~0-1 might happen to be the slow one
  → the incident-causing request is very likely NOT in your sample

Tail-based (decide at t=end, after outcome known):
  1,000 requests → buffer all → apply rule "keep if error OR p99+ latency"
  → the 3 requests that errored and the 5 that were unusually slow are ALL kept
  → the incident-causing request is reliably captured
```

A common real-world compromise: sample close to 100% of *interesting* requests (errors, high latency, requests from a specific canary cohort) via tail-based rules, while keeping a small random head-based sample of "boring" successful requests for baseline/volume visibility — rather than treating it as an all-or-nothing choice.

## OpenTelemetry: the vendor-neutral standard

**OpenTelemetry (OTel)** — a CNCF project formed by merging OpenTracing and OpenCensus — is now the de facto standard for instrumenting traces (and increasingly metrics and logs too, unifying with the observability pillars described in `observability-logs-metrics-traces.md`). Its value is decoupling *instrumentation* from *backend*:

```text
Your service code
      │  (OpenTelemetry SDK: auto-instrumentation + manual spans)
      ▼
OpenTelemetry Collector
      │  (receives, batches, samples, processes)
      ▼
   ┌──────────┬──────────┬──────────┐
   ▼          ▼          ▼          ▼
 Jaeger     Zipkin     AWS X-Ray   Datadog / vendor of choice
```

Because the SDK emits data in the OTel wire format regardless of backend, switching from self-hosted Jaeger to a commercial APM vendor (or vice versa) is a Collector-config change, not a rewrite of instrumentation scattered across every service. Most modern frameworks and cloud SDKs (Express, Spring, Django, gRPC, AWS SDKs) ship OTel auto-instrumentation that generates spans for inbound/outbound calls with no manual code — you typically only add manual spans for business-logic-level detail you specifically want visible (e.g., "time spent inside the pricing calculation," not just "time spent in the HTTP handler").

## Backends: Jaeger, Zipkin, X-Ray

- **Jaeger** — open-source, originated at Uber, now a CNCF graduated project; commonly paired with OTel Collector and stores spans in Elasticsearch/Cassandra, with its own UI for trace search and flame-graph visualization.
- **Zipkin** — the older open-source tracing system (originated at Twitter), similar model to Jaeger, still widely deployed, especially in Java/Spring shops (Spring Cloud Sleuth integrates natively).
- **AWS X-Ray** — managed equivalent for AWS-native workloads, integrates directly with Lambda, API Gateway, and ECS with minimal setup, trading portability for convenience within the AWS ecosystem.

All three consume standard trace formats (increasingly OTel-native), so the meaningful choice is usually "self-hosted and portable" (Jaeger/Zipkin) vs. "managed and ecosystem-integrated" (X-Ray, or a commercial APM like Datadog).

## Reading a flame graph

A flame graph (or waterfall view) lays spans out with time on the horizontal axis and call depth on the vertical axis — a child span is drawn nested under and within the horizontal bounds of its parent's duration. What to look for:

- **A span whose bar is nearly as wide as its parent's** — that child dominates the parent's total time (the `charge-card`/`external-call` example above); optimize there, not in the parent.
- **Gaps between spans** — time not accounted for by any child span is time spent in the parent's own code (serialization, business logic) rather than waiting on a downstream call — a different kind of bottleneck (CPU-bound, not I/O-bound).
- **Wide sibling spans that could be parallel but are drawn sequentially** — a common finding is two independent downstream calls (e.g., fetching user profile and fetching inventory) that don't depend on each other but were coded to run one after another; the trace makes this visible in a way logs never would, and it's a common "we found dependency X unnecessarily gates on Y" fix.

## Trade-offs summary

| Aspect | Head-based sampling | Tail-based sampling |
|---|---|---|
| Sampling decision made | At trace start | After trace completes |
| Catches rare slow/error traces reliably | No (proportional to sample rate only) | Yes (can target errors/latency explicitly) |
| Infrastructure cost | Low (no buffering needed) | Higher (must buffer full traces before deciding) |
| Simplicity | Simple, decision propagates once | Needs a collector layer buffering all spans |

| Backend | Hosting model | Best fit |
|---|---|---|
| Jaeger | Self-hosted, CNCF | Portable, Kubernetes-native stacks |
| Zipkin | Self-hosted | Legacy/Java-Spring-heavy stacks |
| AWS X-Ray | Managed | AWS-native serverless/ECS workloads |

## Common interview follow-ups

**Q: What breaks if one service in the chain doesn't propagate the trace context?**
The trace splits into two disconnected traces at that point — everything downstream of the non-propagating service still gets its own valid trace/span IDs, but they're no longer linked to the parent, so the flame graph shows a gap and you lose the ability to see that segment as part of the original request. This is the most common real-world tracing failure and usually comes from a hand-rolled HTTP client or a queue consumer that wasn't auto-instrumented.

**Q: How does tracing handle asynchronous, queue-based workflows rather than direct RPC calls?**
The context (trace_id + parent span_id) is propagated as message metadata/headers when publishing, and the consumer extracts it when processing the message to create a child span — the trace still connects producer to consumer even though there's a queue and a time gap in between, though the "duration" of that span may span from publish to eventual processing rather than a tight request/response window.

**Q: Why not just log the trace_id everywhere and skip a dedicated tracing backend?**
You could reconstruct a trace manually by grepping logs for a trace_id across services, but you'd lose automatic timing/duration capture, parent-child span relationships, and the flame-graph visualization — you'd essentially be rebuilding a worse version of what Jaeger/X-Ray already do. In practice, trace_id in logs and a dedicated tracing backend are complementary (the log gives detail, the trace gives structure), not a substitute for each other, as covered in `observability-logs-metrics-traces.md`.

**Q: What's the performance overhead of instrumenting every request with tracing?**
Modest per-span overhead (microseconds to create/export a span), but it adds up at very high QPS, which is exactly why sampling exists — running 100% head-based tracing on a service doing 100K req/s can meaningfully affect both application latency and collector/storage cost, whereas 1-10% sampling (or tail-based sampling with a smart collector) keeps overhead low while still catching what matters.

**Q: How do you debug a performance regression that only reproduces intermittently?**
Tail-based sampling with a rule like "keep any trace with p99+ latency" is designed exactly for this — a random head-based sample would need to get lucky to capture an intermittent slow request, while a tail-based rule guarantees it's kept once the collector observes the total duration exceeded the threshold, regardless of how rare it is.

**Q: How would you correlate a trace with the metrics dashboard that first alerted you to a problem?**
Both should share dimensions (service name, endpoint, time window) so you can jump from "p99 latency alert on order-service at 14:03" to "show me traces for order-service between 14:00-14:05 with duration > 2s" — this is the exploration pattern most APM tools (Grafana Tempo + Prometheus, Datadog APM + Metrics) are explicitly built to support with one click rather than manual cross-referencing.

## Related topics
- [Observability: Logs, Metrics & Traces](observability-logs-metrics-traces.md)
- [High Availability](high-availability.md)
- [Circuit Breaker Pattern](../01-scaling-traffic/circuit-breaker-pattern.md)
- [Metrics & Monitoring System](../10-system-design-practice/metrics-monitoring-system.md)
- [Logging System](../10-system-design-practice/logging-system.md)
