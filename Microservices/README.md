# Microservices: Scenario-Based Interview Answers

Practical, interview-ready answers to common microservices failure, scale, and design scenarios. The focus is on a clear reasoning process: **measure → isolate → mitigate → fix → verify**.

> Based on the question topics in [LogicBrace](https://www.logicbrace.com/2026/09/microservices-scenario-based-interview.html). These answers are original summaries; use them as talking points, not a script.

## A strong answer structure

For most production scenarios, explain your answer in this order:

1. Confirm the symptom with metrics, logs, and traces.
2. Limit the blast radius: timeout, rate-limit, bulkhead, or fail fast.
3. Identify the real bottleneck instead of tuning blindly.
4. Apply the smallest safe fix, then verify it under load.
5. Add alerts, tests, or automation to prevent recurrence.

---

## 1. Resilience and failure handling

### 1. Service B is slow. How do you prevent a cascade?

Set a timeout on every remote call, use a circuit breaker to fail fast when Service B is unhealthy, and isolate its thread/connection pool with a bulkhead. Apply backpressure when capacity is full and return a safe fallback—such as cached data or a degraded response—when the feature allows it.

### 2. A downstream service is unavailable. What do you do?

Retry only transient failures, with a small cap, exponential backoff, and jitter. Open a circuit breaker for sustained failures. For non-critical work, place a message on a queue; for critical work, return a clear retryable error or a safe fallback. Alert the owning team.

### 3. How do you make a request idempotent?

Require an idempotency key for each logical operation. Persist the key and its result, protected by a unique database constraint. A retry with the same key returns the original result instead of performing the operation again.

### 4. A payment times out after the provider may have charged the card. How do you avoid a duplicate?

Send the same idempotency key to both your service and the payment provider. Store payment state (`initiated`, `processing`, `completed`, `failed`) and return the stored outcome on retries. Reconcile uncertain payments asynchronously rather than charging again.

### 5. The database is down for 30 seconds. How should the service behave?

Use short connection-pool and query timeouts, then let the circuit breaker open. Serve cacheable reads from a recent cache; queue durable writes only if the business flow supports it, otherwise return a retryable failure. Recover gradually through the circuit breaker's half-open state.

### 6. When should you use retry vs. circuit breaker?

Use retries for short, likely-transient faults. Use a circuit breaker when failure is sustained, because more calls only add pressure to an unhealthy dependency. Combine them carefully: few retries with backoff and jitter, followed by fail-fast behavior.

### 7. How do you prevent retry storms?

Cap retries, add exponential backoff plus random jitter, and stop retries when the circuit is open. Rate-limit retry traffic or give it a retry budget so a dependency outage cannot multiply load across callers.

### 8. Redis is unavailable. How do you degrade safely?

Treat cache as best effort: use a short timeout and circuit breaker, then fall back to the source of truth when it is safe. Watch database load because a cache outage can create a cache-miss storm; use request coalescing, rate limits, and Redis HA where appropriate.

---

## 2. Messaging, consistency, and data

### 9. Kafka consumers process duplicate messages. How do you investigate?

Kafka is commonly at-least-once, so consumers must be idempotent. Check offset-commit timing, consumer-group rebalances, long processing that exceeds `max.poll.interval.ms`, and incorrect group IDs. Deduplicate with a processed-message record or idempotent database writes.

### 10. Consumer lag is increasing. What is your approach?

Compare producer rate with consumer throughput, then identify slow work such as database calls or external APIs. Scale consumers only up to the partition count, batch where safe, and tune Kafka settings after finding the bottleneck—not before.

### 11. How do you handle a poison message?

Retry a bounded number of times. Move messages that keep failing to a DLQ, alert on them, and provide a safe inspect/fix/replay workflow. This prevents one malformed message from blocking valid messages behind it.

### 12. How do you keep data consistent across services?

Avoid distributed ACID transactions across services in most cases. Use local transactions, publish domain events reliably, and design for eventual consistency. Make operations idempotent and use a Saga when one business flow spans multiple services.

### 13. How do you compensate a failed Saga?

Each successful action needs a semantic undo, such as `ReserveInventory` → `ReleaseInventory` or `ChargePayment` → `RefundPayment`. Persist saga progress, execute compensations in reverse order, and make those compensations idempotent and retryable.

### 14. How do you handle eventual consistency in the user experience?

Expose truthful states such as `pending`, `confirmed`, or `failed`; do not promise instant consistency where it does not exist. Build read models from events, tolerate duplicate/out-of-order events with versions, and run reconciliation jobs for rare drift.

### 15. How do you prevent stale cache after a write?

Use cache-aside with explicit invalidation or write-through, plus a TTL as a safety net. When multiple nodes cache the same data, publish an invalidation event. Do not cache rapidly changing data unless the business can tolerate staleness.

---

## 3. APIs, security, and observability

### 16. How do you avoid breaking API consumers?

Use contract-first APIs and consumer-driven contract tests. Prefer additive changes—new optional fields or endpoints—and keep old behavior during a migration period. Validate schemas in CI and monitor usage before retiring a version.

### 17. How do you version an API?

Version only breaking changes, using a URI, header, or media-type strategy. Support old and new versions in parallel, announce deprecation, measure remaining old-version traffic, then sunset it on a defined timeline.

### 18. How do you diagnose service discovery failures?

Check registration and health first, then DNS resolution, network policy/firewall rules, and the caller's discovery cache. Correlate registry or Kubernetes events with the deployment timeline.

### 19. How do you make an API gateway highly available?

Run multiple stateless gateway instances behind a load balancer, across availability zones when needed. Autoscale them, health-check them, externalize shared rate-limit/session state, and prepare regional failover for the availability target.

### 20. How do services authenticate and authorize requests?

Use OAuth2/OIDC with a central identity provider for user identity. Protect service-to-service traffic with mTLS, and enforce authorization using scopes, roles, or centrally managed policies. Give every workload the minimum permissions it needs.

### 21. How do you propagate JWTs safely?

Use the `Authorization` header over TLS—never query parameters or logs. Keep tokens short-lived, validate signature and expiry at each trust boundary, and avoid putting sensitive personal data in a JWT because its payload is readable.

### 22. How do you trace one request through many services?

Create and propagate W3C trace context (`traceparent`) from the gateway using OpenTelemetry. Each service records spans and includes trace/correlation IDs in structured logs. A trace then shows the path, failures, and latency per hop.

### 23. How do you correlate logs?

Put trace and correlation IDs in every structured log entry, including message metadata for asynchronous work. Ship logs centrally (for example, Loki, OpenSearch, or Splunk) and search by that ID alongside the distributed trace.

---

## 4. Kubernetes and deployments

### 24. It works locally but fails in Kubernetes. What do you check?

Compare configuration, secrets, image contents, resource limits, DNS names, and network policies. Check `kubectl describe pod`, current and previous logs, and events for errors such as `OOMKilled`, probe failures, image pull failures, or a mistaken `localhost` dependency.

### 25. Pods keep restarting. How do you investigate?

Start with the termination reason and `kubectl logs --previous`. Distinguish application crashes, OOM kills, failed liveness probes, and node eviction. Fix the cause; do not merely raise limits or relax probes without evidence.

### 26. A service receives no traffic. Where do you look?

Verify the Service selector matches Pod labels, the endpoints are populated, and Pods are Ready. Then inspect ingress/gateway routing, ports, network policies, load-balancer configuration, and DNS.

### 27. How do you deploy with zero downtime?

Use rolling deployment with readiness probes so new Pods receive traffic before old ones terminate. Handle `SIGTERM` gracefully, allow in-flight requests to finish, and make database migrations backward compatible. Use canaries or blue-green releases for high-risk changes.

### 28. How do you roll back a bad release?

Release gradually, watch error rate, latency, and business metrics, and automatically pause or roll back when thresholds breach. Keep immutable, known-good image versions and deployment metadata so rollback is quick and evidence-based.

### 29. How do you manage configuration at scale?

Externalize configuration, validate its schema, version it in Git, and apply it through a controlled delivery process such as GitOps. Roll it out gradually and keep a simple rollback path, just as you would for code.

### 30. How do you store secrets safely?

Use a secrets manager, inject secrets at runtime, restrict access with workload identity/IAM, encrypt at rest and in transit, rotate regularly, and audit access. Never put secrets in source control or container images.

---

## 5. Scale, performance, and architecture

### 31. How do you scale a hot service independently?

Make it stateless, give it its own deployment and autoscaling policy, and scale on the metric that represents its bottleneck—CPU, request rate, queue depth, or custom saturation. Confirm its database, cache, and downstream services can absorb the extra load.

### 32. Five dependent services make an API slow. What do you change?

Use tracing to locate the critical path first. Parallelize independent calls, cache stable data, move non-essential work to asynchronous processing, and use a gateway/BFF only when it reduces real client round trips. Do not optimize all five services blindly.

### 33. CPU suddenly spikes. How do you find the cause?

Compare the incident timeline with traffic, deployments, and configuration changes. Profile hot methods/threads, inspect GC and retry rates, and take thread dumps. Look for loops, expensive queries or regex, contention, retry storms, and unexpected traffic.

### 34. How do you investigate a memory leak?

Look for heap that continues rising after garbage collection. Compare heap dumps over time and inspect retained objects; common causes include unbounded caches, leaked streams/connections, listeners, and `ThreadLocal` misuse. Also check native/off-heap memory in containers.

### 35. How do you isolate noisy tenants?

Use per-tenant rate limits, quotas, and separate pools for threads, connections, and queues. For large tenants, consider dedicated shards or infrastructure. Track per-tenant metrics so isolation decisions are driven by evidence.

### 36. How do you rate-limit a high-traffic API?

Enforce limits at the gateway using token bucket or sliding window. Use a shared store for distributed limits, apply limits per user/API key, IP, and globally, and return `429 Too Many Requests` with `Retry-After`.

### 37. How do you design for millions of daily requests?

Use stateless, horizontally scalable services; CDN and cache hot reads; queues for asynchronous work; and a database plan involving indexes, replicas, partitioning, or sharding as justified. Load-test early and make metrics, traces, and alerts part of the design.

### 38. When should a monolith become microservices?

Split only when a specific bounded context needs independent scaling, deployment, reliability, or ownership. Avoid splitting by technical layer or fashion: distributed calls, data ownership, observability, and operations all add cost.

### 39. How do you migrate a monolith without downtime?

Use the Strangler Fig pattern: route one feature at a time from the monolith to a new service, guarded by feature flags. Migrate data carefully, keep changes compatible during coexistence, and decommission the old path only after the new path is proven in production.

### 40. Sketch an e-commerce microservices design.

Use separate bounded contexts for identity, catalog, inventory, cart, orders, payments, fulfillment, and notifications. Place an API gateway at the edge; let each service own its data; publish events through a broker; and coordinate checkout with a Saga:

`Reserve inventory → take payment → confirm order → start fulfillment`

On failure, compensate—for example, release inventory or refund payment. Protect calls with timeouts, circuit breakers, and bulkheads; add tracing, logs, metrics, CI/CD, and safe deployment strategies from the start.

---

## Quick pattern guide

| Situation | First pattern to reach for |
| --- | --- |
| Brief network failure | Retry with backoff + jitter |
| Sustained dependency failure | Timeout + circuit breaker |
| One dependency consumes all resources | Bulkhead + concurrency limit |
| Duplicate request or message | Idempotency key / deduplication |
| Multi-service business transaction | Saga + compensating actions |
| Asynchronous processing failure | DLQ + replay process |
| Unclear latency or error source | Metrics + logs + distributed traces |
| Risky release | Canary / blue-green + rollback |

## Interview reminder

Good answers name the trade-off. For example: retries improve resilience for short failures but can overload an already failing dependency; eventual consistency improves service autonomy but requires visible pending states and reconciliation. Explain the choice in terms of customer impact, failure mode, and measured evidence.
