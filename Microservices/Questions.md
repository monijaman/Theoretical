# Microservices Scenario-Based Interview Questions

Source (question topics): https://www.logicbrace.com/2026/09/microservices-scenario-based-interview.html

> Note: Answers below are written from scratch based on standard microservices practice — not copied from the source article.

---

## 1. How do you prevent cascading failures when Service B is slow?

- Add **timeouts** on every synchronous call (never wait forever).
- Wrap the call in a **circuit breaker** (e.g., resilience4j, Polly, Hystrix-style) — once failures/latency cross a threshold, trip the breaker and fail fast instead of piling up threads.
- Use **bulkheads** — isolate thread pools/connection pools per downstream dependency so a slow Service B can't exhaust resources needed to talk to Service C.
- Apply **backpressure** — reject/queue new requests once concurrency limits are hit.
- Provide a **fallback** (cached data, default response, degraded feature) instead of a hard failure where possible.

## 2. How do you handle downstream service unavailability?

- Retries with **exponential backoff + jitter**, capped attempts.
- **Circuit breaker** to stop hammering a dead service.
- **Fallback logic**: serve stale cache, default values, or a "feature temporarily unavailable" response.
- For non-critical calls, make them **asynchronous** (queue the work, process when the service recovers) instead of blocking the user request.
- Alert/monitor so on-call is notified rather than silently degrading forever.

## 3. How do you make operations idempotent for duplicate requests?

- Require the client to send an **idempotency key** (UUID) per logical operation.
- Server stores `(idempotency_key → result)` in a fast store (DB/Redis) with a TTL.
- On a duplicate request with the same key, return the **stored result** instead of re-executing the operation.
- For state changes, design operations to be naturally idempotent where possible (e.g., "set balance to X" vs "add X", `PUT` instead of incrementing counters).

## 4. How do you prevent duplicate payments when the response is lost?

- Same idempotency-key pattern as above, scoped specifically to the payment request.
- Client retries the **same request with the same idempotency key** on timeout — server recognizes it already processed that key and returns the original result without charging twice.
- Use a **unique constraint** in the DB on the idempotency key/transaction reference to guarantee at-most-once at the data layer, even under concurrent retries.
- Log/track payment state transitions (`initiated → processing → completed/failed`) so reconciliation jobs can catch anomalies.

## 5. How do you scale high-traffic services independently?

- Microservices already decouple deployment — give the hot service its **own deployment/scaling group** (e.g., separate Kubernetes Deployment + HPA) rather than sharing a pod/VM pool with cold services.
- Scale horizontally based on relevant metrics (CPU, request rate, queue depth) via **autoscaling**.
- Ensure the service is **stateless** (session/state externalized to Redis/DB) so any instance can serve any request.
- Put a **load balancer** in front and make sure downstream dependencies (DB, cache) can also handle the increased fan-out — scaling one tier can just move the bottleneck.

## 6. How do you handle a 30-second database outage?

- **Circuit breaker** on the DB client trips after repeated failures, so requests fail fast instead of queueing up and exhausting connections.
- Serve **read traffic from cache** if a recent value exists.
- **Queue writes** (or reject them with a clear retryable error) rather than losing them silently.
- Use **connection pool timeouts** so threads aren't stuck waiting on a dead DB.
- Once the DB recovers, the circuit breaker's half-open state lets traffic resume gradually instead of a thundering herd.

## 7. How do you investigate a Kafka consumer processing duplicate messages?

- Check **consumer offset commit strategy** — if offsets are committed *before* processing completes (or auto-commit is misconfigured), a crash/rebalance replays already-handled messages.
- Look for **rebalances** during processing (consumer group logs) caused by slow processing exceeding `max.poll.interval.ms`.
- Verify whether the consumer logic itself is **idempotent** — Kafka's at-least-once delivery guarantees means duplicates are expected; the consumer must dedupe (via message key + processed-ids table, or idempotent writes).
- Check for **multiple consumer instances** accidentally reading the same partition (misconfigured group IDs).

## 8. How do you address increased consumer lag?

- Check if **consumers are slow** (processing time per message increased) vs. **producers sending more** (traffic spike).
- Scale out consumers — add instances up to the **partition count** (lag won't improve past that without repartitioning).
- Profile the consumer for slow downstream calls (DB writes, external APIs) — often the bottleneck isn't Kafka itself.
- Batch processing or async I/O within the consumer to increase throughput per instance.
- As a stop-gap, increase `max.poll.records`/tune fetch settings, but the real fix is usually scaling or speeding up processing.

## 9. How do you handle poison messages in a message queue?

- Set a **max retry count** per message; after exceeding it, move the message to a **Dead Letter Queue (DLQ)** instead of retrying forever.
- Alert when messages land in the DLQ so someone investigates root cause (bad schema, unhandled edge case).
- Make sure one poison message doesn't **block the whole partition/queue** for other valid messages — DLQ pattern solves this since the consumer can skip past it.
- Provide tooling to inspect, fix, and **replay** DLQ messages once the bug is fixed.

## 10. How do you reduce latency across five dependent services?

- **Parallelize** independent calls instead of calling them sequentially (fan-out/fan-in).
- Introduce **caching** at each layer for frequently requested, slow-changing data.
- Consider an **API Gateway/BFF** that aggregates calls server-side instead of the client making 5 round trips.
- Identify the **critical path** — only truly required calls should block the response; make optional ones async.
- Use **async messaging** for calls that don't need to complete before responding to the user.
- Profile with distributed tracing to find which of the 5 services is actually the bottleneck rather than optimizing blindly.

## 11. How do you maintain consistency across multiple services?

- Avoid distributed ACID transactions (2PC) across services — they don't scale and create tight coupling.
- Use the **Saga pattern**: a sequence of local transactions per service, each publishing an event that triggers the next step.
- Design for **eventual consistency** and communicate that clearly to the business/UX (e.g., "order placed" now, "payment confirmed" moments later).
- Use **idempotent operations** and **compensating actions** so partial failures can be corrected rather than requiring perfect atomicity.

## 12. How do you perform compensation in a failed Saga transaction?

- Each step in the Saga defines a **compensating transaction** that semantically undoes it (e.g., `ReserveInventory` ↔ `ReleaseInventory`, `ChargeCard` ↔ `RefundCard`).
- On failure at step N, the orchestrator (or choreography via events) triggers compensations for steps `N-1 → 1` **in reverse order**.
- Compensations must themselves be **idempotent and retryable**, since they can also fail.
- Persist saga state (which steps completed) so a crashed orchestrator can resume/compensate correctly after restart.

## 13. How do you manage eventual consistency between services?

- Make it explicit in the **domain/UX**: show "pending" states rather than pretending everything is instantly consistent.
- Use **event-driven updates** (publish domain events on state change; interested services subscribe and update their own read models).
- Apply patterns like **CQRS** to separate write models (source of truth) from read models (eventually-consistent projections).
- Handle **out-of-order or duplicate events** with versioning/timestamps and idempotent handlers.
- Provide reconciliation jobs to catch and fix drift between services over time.

## 14. How do you prevent failures from breaking API changes?

- Follow **contract-first** development and run **consumer-driven contract tests** (e.g., Pact) in CI to catch breaking changes before deploy.
- Treat API changes as **additive only** by default (new optional fields, new endpoints) — never remove/rename fields consumers rely on without a migration path.
- Use **schema validation** (OpenAPI/JSON Schema, protobuf) to catch incompatible changes automatically.
- Deploy with **backward compatibility** for at least one release cycle so old and new consumers can coexist.

## 15. How do you implement backward-compatible API versioning?

- Version the API explicitly (URI: `/v1/…`, header, or media type) so breaking changes go into a new version while old consumers keep working.
- For non-breaking changes, avoid a new version — just add optional fields.
- **Deprecate gradually**: announce, support both versions in parallel, monitor usage of the old version, then sunset once traffic drops to zero.
- Internally, adapter/translation layers can let the service support multiple versions without duplicating all business logic.

## 16. How do you troubleshoot service discovery failures?

- Check whether the service is **registered** in the registry (Eureka/Consul/Kubernetes DNS) and passing **health checks** — an unhealthy instance gets deregistered.
- Verify **network connectivity** (DNS resolution, security groups/NetworkPolicies) between caller and callee.
- Check for **stale cache** on the client side (client-side load balancers like Ribbon cache the registry — a recently deployed/removed instance might not be reflected yet).
- Look at registry/service mesh logs for registration/deregistration events around the time of the failure.

## 17. How do you design an API Gateway without a single point of failure?

- Run **multiple gateway instances** behind a load balancer (never a single node).
- Deploy across **multiple availability zones/regions**.
- Make the gateway **stateless** so any instance can handle any request; externalize rate-limit counters/session data to Redis.
- Add **health checks + auto-scaling** so unhealthy instances are replaced automatically.
- Have a **fallback path** (e.g., DNS failover to a secondary gateway cluster) for full-region outages.

## 18. How do you implement cross-service authentication/authorization?

- Use a central **Identity Provider (IdP)** issuing **OAuth2/OIDC tokens (JWTs)**.
- The API Gateway (or a sidecar in a service mesh) validates the token **once at the edge**; internal services trust the validated identity propagated via headers, or re-validate the JWT signature locally (no shared session store needed).
- Use **mTLS** between services (often via a service mesh like Istio/Linkerd) so services also authenticate *each other*, not just the end user.
- Authorization: embed **roles/scopes/claims** in the token, or centralize policy decisions (e.g., OPA — Open Policy Agent) so each service enforces consistent rules.

## 19. How do you propagate JWT information securely?

- Pass the JWT (or a re-signed internal token) in the `Authorization` header on every downstream call — never in query strings/logs.
- Keep tokens **short-lived** with refresh tokens handled at the edge, so a leaked internal token has limited blast radius.
- Validate signature and expiry **at each hop** that needs to trust it (or rely on mTLS + a trusted gateway boundary if internal network is fully trusted).
- Avoid stuffing excessive PII into the JWT payload (it's base64, not encrypted) — keep only what's needed (user id, roles, scopes); fetch sensitive details from a service if needed.
- Use **HTTPS/TLS everywhere**, including service-to-service traffic.

## 20. How do you trace requests through multiple services?

- Implement **distributed tracing** (OpenTelemetry) — generate a **trace ID** at the entry point (gateway) and propagate it (plus span IDs) via headers (`traceparent`) through every downstream call.
- Each service creates a **span** for its work and reports to a tracing backend (Jaeger, Zipkin, Tempo).
- Combine with **correlation IDs** in logs so logs and traces can be cross-referenced.
- Visualize the full request path, latency per hop, and errors in a single trace view to pinpoint bottlenecks/failures.

## 21. How do you correlate logs across microservices?

- Generate a **correlation/trace ID** at the entry point and pass it through all service calls (HTTP headers, message metadata for async flows).
- Every service includes that ID in **structured logs** (JSON logging).
- Ship logs to a **centralized log aggregator** (ELK/Opensearch, Loki, Splunk) where you can filter/search by correlation ID across all services in one place.
- Pair with distributed tracing (span IDs) for a full picture of timing + logs together.

## 22. How do you investigate a sudden CPU consumption spike?

- Check **recent deployments/config changes** first — most spikes correlate with a release.
- Use profiling tools (e.g., `async-profiler`, Java Flight Recorder, `pprof` for Go, `py-spy` for Python) to capture a CPU profile and see which method/thread is hot.
- Check for **infinite loops, retry storms, inefficient regex, GC thrashing**, or a sudden traffic surge (bots, retries from a failing downstream).
- Compare with dashboards (request rate, error rate) to see if it's load-driven or code-driven.
- Check thread dumps for excessive thread count/contention (lock contention can also burn CPU).

## 23. How do you investigate a potential memory leak?

- Monitor **heap usage over time** — a leak shows a steady upward trend that doesn't drop after GC, unlike normal sawtooth patterns.
- Take **heap dumps** at intervals and diff them (e.g., Eclipse MAT for Java) to see which objects are accumulating.
- Check for common culprits: unbounded caches/collections, listeners/callbacks never unregistered, connection/stream leaks (not closed), ThreadLocal misuse.
- Correlate leak growth rate with traffic to estimate time-to-OOM and prioritize urgency.
- In containerized environments, also check if the leak is actually **off-heap/native memory** (e.g., unclosed native resources) since heap-only tools won't catch that.

## 24. How do you troubleshoot local-to-Kubernetes deployment issues ("works locally, fails in K8s")?

- Check **environment/config differences** — env vars, secrets, config maps that exist locally (`.env`) but aren't set in the cluster.
- Check **resource limits** — the container might be OOMKilled or CPU-throttled in K8s due to limits not present locally.
- Verify **networking**: service DNS names, network policies blocking traffic, or the app hardcoding `localhost` instead of the K8s service name.
- Check **image build issues**: local dev might use hot-reload/dev dependencies not baked into the production image.
- Use `kubectl describe pod` and `kubectl logs` (including `--previous` for crashed containers) to see actual failure reasons (ImagePullBackOff, CrashLoopBackOff, readiness probe failures).

## 25. How do you address Kubernetes pod restarts?

- Run `kubectl describe pod <name>` to see the **restart reason** (OOMKilled, liveness probe failure, crash exit code).
- If **OOMKilled**: increase memory limits or fix a memory leak/inefficient usage.
- If **liveness probe failing**: check if the probe timeout/threshold is too aggressive for the app's actual startup/response time, or if the app is genuinely unhealthy (deadlocked, DB connection exhausted).
- Check `kubectl logs --previous` for the crashed container's last output/stack trace.
- Look at events (`kubectl get events`) for node-level issues (eviction due to node pressure).

## 26. How do you handle a service not receiving traffic?

- Check **Service/Endpoint objects** (`kubectl get endpoints`) — if empty, the Service's label selector doesn't match any pod labels.
- Verify the pod is **Ready** (passing readiness probes) — not-ready pods are excluded from the Service's endpoints.
- Check **Ingress/Gateway routing rules** for typos in host/path matching.
- Confirm **NetworkPolicies** aren't blocking traffic to the pod.
- Check the load balancer/DNS is actually pointing at the right Service.

## 27. How do you perform zero-downtime deployments?

- Use **rolling updates** (Kubernetes default) — bring up new pods and only terminate old ones once new ones pass readiness checks.
- Configure proper **readiness probes** so traffic isn't routed to a pod before it's actually ready.
- Handle **graceful shutdown**: catch SIGTERM, stop accepting new requests, finish in-flight requests, then exit (with `terminationGracePeriodSeconds` tuned accordingly).
- For riskier changes, use **blue-green** or **canary deployments** to shift traffic gradually and validate before full rollout.
- Ensure **database migrations are backward-compatible** with both old and new app versions running simultaneously during the rollout window.

## 28. How do you identify and roll back a problematic version?

- Use **canary deployments** or gradual rollout so a bad version only affects a small % of traffic before full exposure.
- Monitor **key metrics** (error rate, latency, business KPIs) immediately after deploy, with automated alerts/rollback triggers if thresholds are breached.
- Keep deployments **versioned and reversible** (e.g., `kubectl rollout undo`, or redeploy the previous known-good image tag) so rollback is a fast, single command.
- Tag deploys with clear version metadata so you can quickly correlate "when did errors start" with "what changed."

## 29. How do you manage configuration changes at scale?

- Externalize config (ConfigMaps, a config server like Spring Cloud Config, or a feature-flag service) instead of baking it into images — enables changes **without rebuilding/redeploying**.
- Version-control configuration and apply it via **GitOps** (e.g., ArgoCD) for auditability and easy rollback.
- Roll out config changes **gradually** (per environment, per % of instances) rather than globally all at once, same discipline as code deploys.
- Validate config schema before applying to catch typos/invalid values early.

## 30. How do you manage secrets securely?

- Never store secrets in code/config files in git. Use a dedicated **secrets manager** (HashiCorp Vault, AWS Secrets Manager, Kubernetes Secrets backed by encryption at rest).
- Inject secrets at **runtime** (env vars or mounted volumes from the secrets manager) rather than baking into images.
- Apply **least-privilege access** — services only get the secrets they actually need, via IAM roles/service accounts.
- **Rotate secrets** regularly and support rotation without downtime (dual-secret validity window during rotation).
- Audit/log secret access for security review.

## 31. How do you handle Redis unavailability gracefully?

- Wrap Redis calls with a **circuit breaker** and short timeout so a down Redis doesn't cascade into blocking the whole request path.
- Treat cache as **best-effort**: on Redis failure, **fall back to the source of truth** (database) rather than failing the request outright — degrade gracefully (slower, but working).
- Use **Redis Sentinel/Cluster** for HA so a single node failure doesn't take down the cache entirely.
- Monitor cache hit rate/availability so a fallback-to-DB surge (which can overload the DB) is caught and mitigated (e.g., request coalescing) before it causes a secondary outage.

## 32. How do you solve cache staleness after database updates?

- Use a **cache invalidation/update strategy** on writes: write-through (update cache and DB together) or cache-aside with **explicit invalidation** (delete the cache key on update, let the next read repopulate it).
- Set a reasonable **TTL** as a safety net even if invalidation is missed.
- For multi-instance caches, **publish an invalidation event** (e.g., via Redis pub/sub or a message bus) so all nodes/services drop the stale key, not just the one that made the write.
- For rapidly changing data, consider **short TTLs** or skip caching entirely rather than fighting staleness.

## 33. When do you use Retry vs. Circuit Breaker patterns?

- **Retry**: for **transient, short-lived** failures (network blip, brief timeout) where retrying immediately/soon is likely to succeed. Always pair with **exponential backoff + jitter** and a max attempt cap.
- **Circuit Breaker**: for **sustained failures** — when a dependency is down/degraded for longer, retrying just adds load and delays failure detection. The breaker trips to fail fast and gives the dependency room to recover.
- In practice, use **both together**: retry a couple of times for blips, and let the circuit breaker take over to stop retries once failures persist, avoiding a retry storm.

## 34. How do you prevent retry storms during outages?

- Use **exponential backoff with jitter** so retries from many clients don't synchronize into waves.
- Cap the **maximum number of retries** and combine with a **circuit breaker** so clients stop retrying once the breaker is open.
- Apply **rate limiting** on retries at the client or gateway level.
- Consider a **token/budget-based retry policy** (e.g., only allow retries if X% of the recent request budget hasn't been used on retries already) to cap the amplification effect on the downstream service.

## 35. How do you isolate workloads in a multi-tenant system?

- **Bulkhead pattern**: separate resource pools (threads, connections, queues) per tenant or tenant tier so one noisy tenant can't starve others.
- **Rate limit per tenant** (not just globally) to cap any single tenant's impact.
- For larger tenants, consider **dedicated infrastructure** (separate namespace/cluster/DB shard) vs. shared infra for smaller tenants.
- Use **quotas** on resource usage (storage, requests/sec, concurrent jobs) enforced at the API layer.
- Monitor **per-tenant metrics** so a problematic tenant is identified quickly.

## 36. How do you design rate limiting for a high-traffic service?

- Choose an algorithm: **token bucket** (allows bursts, smooths average rate) or **sliding window** (more precise, slightly more overhead) — fixed window is simplest but allows edge-of-window bursts.
- Enforce limits at the **API Gateway** so rejected requests never reach backend services.
- Use a **centralized store (Redis)** for rate-limit counters so limits are consistent across multiple gateway instances.
- Apply limits at multiple granularities: per-user/API-key, per-IP, and global, to protect against different abuse patterns.
- Return standard `429 Too Many Requests` with a `Retry-After` header so clients can back off correctly.

## 37. How do you design a system for millions of daily requests?

- **Horizontal scalability** everywhere: stateless services behind load balancers, autoscaling based on load.
- **Caching** at multiple layers (CDN for static/semi-static content, Redis for hot data) to reduce load on origin services/DB.
- **Async processing** (message queues) for anything that doesn't need a synchronous response, smoothing spikes.
- **Database scaling**: read replicas, sharding/partitioning for write-heavy workloads, appropriate indexing.
- **Observability** (metrics, tracing, alerting) to catch bottlenecks before they become outages.
- **Load testing** proactively to know actual capacity limits ahead of real traffic surges.

## 38. How do you determine when to split a monolith?

- Split when a **specific pain point** justifies it: independent scaling needs (one module is far hotter than others), independent deploy cadence (teams blocked on each other's release cycles), or a clear **bounded context** with low coupling to the rest.
- Avoid splitting prematurely "because microservices are best practice" — the operational complexity (network calls, distributed data, observability) is real cost.
- Good candidates: modules with **clear domain boundaries**, different scaling/reliability requirements, or ones owned by a **separate team** who wants deployment autonomy.
- Rule of thumb: split along **business capability boundaries** (Domain-Driven Design's bounded contexts), not arbitrary technical layers.

## 39. How do you migrate a monolith without service interruption?

- Use the **Strangler Fig pattern**: put a routing layer (gateway/proxy) in front of the monolith, and incrementally redirect specific routes/features to new microservices while the monolith still handles the rest.
- Migrate **one bounded context at a time**, keeping the monolith and new service **in sync** during transition (e.g., dual writes, or the monolith calling the new service internally at first).
- Keep the **data migration** careful: often start with the new service reading from the same DB (shared temporarily) before fully owning its own data store, to avoid a risky big-bang cutover.
- Extensive **testing and feature flags** to toggle between old/new implementation per route, enabling instant rollback if issues appear.
- Decommission monolith pieces only after the new service has proven stable in production.

## 40. How would you design a complete e-commerce microservices architecture?

**Core services** (bounded by business capability):
- **User/Auth Service** — accounts, authentication (OAuth2/OIDC), profile.
- **Product Catalog Service** — product data, search (often backed by Elasticsearch).
- **Inventory Service** — stock levels, reservations.
- **Cart Service** — shopping cart state (often Redis-backed for speed).
- **Order Service** — order creation/lifecycle, orchestrates the checkout Saga.
- **Payment Service** — integrates with payment gateways, handles idempotent charge/refund.
- **Shipping/Fulfillment Service** — shipment tracking, carrier integration.
- **Notification Service** — email/SMS/push, consumes events asynchronously.
- **Review/Rating Service** — product reviews.

**Cross-cutting infrastructure:**
- **API Gateway** at the edge for routing, auth validation, rate limiting.
- **Service mesh** (optional, at scale) for mTLS, retries, observability between services.
- **Message broker** (Kafka/RabbitMQ) for async events: `OrderPlaced`, `PaymentCompleted`, `InventoryReserved`, etc.
- **Saga orchestration** for checkout flow: reserve inventory → charge payment → confirm order → trigger shipment, with compensations (release inventory, refund) on failure at any step.
- Each service owns its **own database** (polyglot persistence as needed — e.g., Elasticsearch for catalog search, relational DB for orders/payments, Redis for cart/session).
- **Distributed tracing + centralized logging + metrics dashboards** for observability across the whole flow.
- **CDN + caching** for product catalog/browsing (read-heavy, tolerant of slight staleness).
- **Circuit breakers + bulkheads** on every service-to-service call, especially around Payment and Inventory since those sit on the critical checkout path.
- **CI/CD with canary/blue-green deploys** per service, since independent deployability is the whole point of the architecture.
