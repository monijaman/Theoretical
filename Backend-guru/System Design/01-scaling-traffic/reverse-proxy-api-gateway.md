# Reverse Proxy & API Gateway
[← Back to index](../readme.md)

## Why it matters

Every non-trivial system has *something* sitting between the internet and application code. Interviewers ask this to see whether you can draw a clean boundary between "infrastructure concerns that don't belong in application code" (TLS, routing, auth, rate limiting) and business logic — and whether you know that "reverse proxy" and "API gateway" are related but not synonymous. Conflating them in an interview is a minor tell that you've only worked with one of them.

## Reverse proxy vs API gateway — the actual difference

A **reverse proxy** sits in front of one or more backend servers and forwards client requests to them, hiding the backend topology from the client. Its core job: TLS termination, load balancing, basic routing, compression, caching static responses. Nginx and HAProxy in their classic configuration are reverse proxies. It generally doesn't know about your business domain — it moves bytes and headers.

An **API gateway** is a reverse proxy with opinions about APIs: it understands "an API call," applies per-route policies (auth, quotas, transformation), aggregates or fans out to multiple backend services, and often exposes a developer-facing surface (API keys, usage plans, versioning). It is the reverse proxy pattern specialized for API traffic in a microservices world.

```
                         ┌────────────────────────────┐
 Client ── HTTPS ──────► │        API Gateway          │
                         │  - TLS termination           │
                         │  - authN/authZ (JWT/OAuth)    │
                         │  - rate limiting per API key  │
                         │  - request/response transform │
                         │  - routing by path/version     │
                         └───────┬─────────┬────────────┘
                                 │         │
                      ┌──────────▼──┐   ┌──▼───────────┐
                      │ Orders svc  │   │  Users svc    │
                      │ (reverse    │   │  (reverse     │
                      │  proxy in   │   │   proxy in    │
                      │  front:     │   │   front too)  │
                      │  Nginx)     │   │               │
                      └─────────────┘   └───────────────┘
```

In practice the line blurs: Envoy and Nginx can be configured to do everything a "gateway" does; Kong is literally Nginx (via OpenResty) plus a plugin/policy layer that turns it into a gateway product. The distinction is more about *role in the architecture* and *feature set exposed to API consumers/developers* than a hard technical line.

| | Reverse proxy | API gateway |
|---|---|---|
| Primary concern | Traffic routing, TLS, LB | API lifecycle: auth, quotas, contracts |
| Domain awareness | Low (headers/paths) | Higher (per-route policy, per-tenant, versioning) |
| Typical placement | In front of any service, or between LB and app | Edge of the whole system, often the sole public entry point |
| Aggregation | Rare | Common (BFF-style fan-out/fan-in) |
| Examples | Nginx, HAProxy, Envoy (bare) | Kong, AWS API Gateway, Apigee, Envoy + control plane, Zuul |

## Core responsibilities

**TLS termination**: decrypt HTTPS at the edge so backend services can speak plain HTTP internally (or re-encrypt for a zero-trust mesh). Centralizes certificate management — one place to rotate certs instead of per-service.

**Routing**: path-based (`/v1/orders` → orders-service), host-based (`api.example.com` vs `admin.example.com`), header-based (canary via `x-canary: true`), or version-based (`/v2/...`).

**Authentication / authorization**: validate JWTs, check API keys, call an external auth service (OAuth2 introspection), enforce mTLS for service-to-service calls — all *before* the request reaches application code, so every backend doesn't reimplement auth.

**Rate limiting & quotas**: per API key, per client, per route — see [Rate Limiting](rate-limiting.md) for algorithms. A gateway is usually where this policy is centrally enforced rather than in each microservice.

**Request/response transformation**: strip internal headers before forwarding upstream, rewrite paths (`/external/v1/x` → `/internal/x`), aggregate responses from multiple services into one payload for a mobile client (classic Backend-for-Frontend), convert protocols (REST-in, gRPC-out).

**Observability**: centralized access logs, request IDs injected for [distributed tracing](../08-reliability-operations/distributed-tracing.md), consistent metrics (latency, error rate) across all services without every team wiring it up individually.

**Caching**: cache idempotent GET responses at the edge to reduce backend load (though a CDN is usually the better place for this — see [CDN Architecture](../04-caching/cdn-architecture.md)).

## Config example (Kong-style declarative)

```yaml
services:
  - name: orders-service
    url: http://orders.internal:8080
    routes:
      - name: orders-route
        paths: ["/api/v1/orders"]
    plugins:
      - name: jwt
      - name: rate-limiting
        config:
          minute: 100
          policy: redis
      - name: request-transformer
        config:
          add:
            headers: ["x-request-source:gateway"]
```

## Nginx as a reverse proxy in front of a gateway (common layering)

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;

    ssl_certificate     /etc/ssl/api.crt;
    ssl_certificate_key /etc/ssl/api.key;

    location / {
        proxy_pass http://gateway_upstream;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Note the `X-Forwarded-*` headers — this is how the origin server learns the real client IP and protocol despite the proxy hop, and it matters for rate limiting by IP, logging, and redirect generation.

## Real systems

- **Nginx**: the default reverse proxy for a huge share of the internet; also does basic load balancing and can be extended (OpenResty/Lua) into gateway territory.
- **Envoy**: L4/L7 proxy built for dynamic service discovery (xDS API), rich observability, used as the sidecar data plane in service meshes (Istio, AWS App Mesh) and as a standalone edge/gateway (Envoy Gateway, Contour, Ambassador).
- **Kong**: Nginx/OpenResty core + plugin ecosystem (auth, rate limiting, transformation, logging) — purpose-built as an API gateway product, often the front door for microservices platforms.
- **AWS API Gateway**: fully managed, integrates directly with Lambda, tight IAM/Cognito auth integration, usage plans and API keys built in, but less flexible/more expensive at very high throughput than self-hosted Envoy/Kong.
- **Traefik**: reverse proxy with native dynamic service discovery for container platforms (Docker, Kubernetes) — config updates automatically as services register/deregister.
- **Zuul (Netflix)**: JVM-based gateway, historically paired with Hystrix/Eureka in the Netflix OSS stack; largely superseded by Envoy-based patterns industry-wide but still a good reference architecture to know.

## Trade-offs

- **Centralizing cross-cutting concerns at the gateway** removes duplication across services, but creates a shared dependency — a gateway bug or overload takes down everything behind it. Mitigate with redundancy and keeping gateway logic simple/stateless.
- **BFF/aggregation at the gateway** simplifies client code but couples the gateway to business semantics, making it harder to keep "pure infrastructure." Many teams push aggregation into a dedicated BFF service instead of the gateway itself.
- **Self-hosted (Envoy/Kong) vs managed (AWS API Gateway)**: self-hosted gives full control and can be cheaper at scale, but you own the operational burden (scaling it, patching, HA); managed is fast to adopt and ops-free but has vendor lock-in, cold-start/latency quirks (Lambda-backed), and cost that scales linearly with requests.
- **Gateway as single entry point** simplifies security posture (one place to enforce mTLS/WAF) but if it's also doing heavy per-request logic (auth token verification, schema validation) it can become the latency floor for every request in the system.

## Common interview follow-ups

**Q: Where would you put rate limiting — gateway or service?**
Coarse, per-client/per-API-key limits belong at the gateway so you reject abusive traffic before it costs you any backend compute. Fine-grained, business-specific limits (e.g., "3 password reset attempts per account per hour") often need service-level context and belong closer to the domain logic. Many systems do both.

**Q: How does the gateway avoid becoming a single point of failure?**
Run it stateless and horizontally scaled behind a load balancer, keep policy state (rate limit counters, auth tokens) in an external store like Redis rather than in-process, and deploy across multiple AZs/regions. See [High Availability](../08-reliability-operations/high-availability.md).

**Q: Gateway vs service mesh — aren't they solving the same problem?**
Overlapping but distinct: a gateway handles north-south traffic (external client → system), a service mesh (Envoy sidecars + control plane like Istio) handles east-west traffic (service-to-service inside the cluster) — mTLS, retries, circuit breaking between internal services. Many architectures use both: gateway at the edge, mesh internally.

**Q: How do you version an API without breaking existing clients?**
URL versioning (`/v1/`, `/v2/`) is simplest to route on at the gateway; header-based versioning (`Accept: application/vnd.api+json;version=2`) is cleaner semantically but harder to route/cache. The gateway is the natural place to run both versions side by side and eventually deprecate the old route.

**Q: What happens to observability/tracing across the gateway hop?**
The gateway must propagate (or originate) a trace/correlation ID (e.g., W3C traceparent header) so that downstream services' logs and spans can be stitched together — otherwise you lose the ability to follow one request across the whole call graph. See [Distributed Tracing](../08-reliability-operations/distributed-tracing.md).

## Related topics

- [Load Balancing](load-balancing.md)
- [Rate Limiting](rate-limiting.md)
- [Microservices Architecture](../07-architecture-patterns/microservices-architecture.md)
- [Distributed Tracing](../08-reliability-operations/distributed-tracing.md)
- [REST vs GraphQL vs gRPC](../06-communication-protocols/rest-vs-graphql-vs-grpc.md)
- [API Gateway (practice problem)](../10-system-design-practice/api-gateway.md)
