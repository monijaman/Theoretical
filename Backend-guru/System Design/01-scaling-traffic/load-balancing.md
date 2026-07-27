# Load Balancing
[← Back to index](../readme.md)

## Quick summary

Think of load balancing as the traffic manager for your system. It decides which backend instance should receive each request so the system stays responsive, reliable, and balanced under load.

In plain English:

- If one server is overloaded, another should take some traffic.
- If one server fails, traffic should be redirected quickly.
- If the system is stateful, you need to think carefully about session affinity and shared state.

## Why it matters

The moment you have more than one instance of a service, something has to decide which instance handles which request. Get this wrong and you get hot instances that fall over while siblings sit idle, connection storms during deploys, or an outage the instant one box dies. Load balancing is the first piece of infrastructure that turns "a server" into "a service," and interviewers use it to check whether you understand the difference between routing packets and routing requests — i.e., L4 vs L7 — and whether you can reason about statefulness, health, and failure.

## At a glance

- Use L4 when you care mostly about raw performance and TCP/UDP traffic.
- Use L7 when you need smart routing based on HTTP paths, headers, or cookies.
- Prefer stateless backends and shared state for the cleanest long-term design.

## L4 vs L7

**Layer 4 (transport layer) load balancing** looks only at IP + TCP/UDP port. It doesn't parse HTTP, doesn't see headers, doesn't see paths. It forwards packets (or proxies connections) based on a 5-tuple hash (src IP, dst IP, src port, dst port, protocol). It's fast and cheap — often line-rate, sometimes done in kernel space or dedicated hardware — but it's blind to application semantics.

**Layer 7 (application layer) load balancing** terminates the connection, reads the HTTP request (method, path, headers, cookies, even body), and makes a routing decision based on that. This is what enables path-based routing (`/api/*` → service A, `/static/*` → service B), header-based routing, canary releases by cookie, and TLS termination.

```
Client                     L4 LB                        Backend
  |--- TCP SYN ------------->|                              |
  |                          |--- picks backend by 5-tuple  |
  |                          |--- forwards packets --------->|
  |<===================== packets flow through, LB doesn't ==|
                              read HTTP at all

Client                     L7 LB (proxy)                 Backend
  |--- TCP SYN + TLS ------->|  (LB terminates TLS)         |
  |--- GET /checkout ------->|                              |
  |                          |--- parses Host/path/headers  |
  |                          |--- opens its OWN connection ->|
  |                          |<---------------- response ----|
  |<--- response ------------|
```

- L4 examples: AWS Network Load Balancer (NLB), IPVS, raw HAProxy in TCP mode, Linux LVS.
- L7 examples: AWS Application Load Balancer (ALB), Nginx, Envoy, HAProxy in HTTP mode, Traefik.

L4 is preferred when you need extreme throughput/low latency (millions of packets/sec, gaming, financial feeds) or non-HTTP protocols. L7 is preferred whenever routing needs to be content-aware — which is most web/microservice traffic today. Many real deployments stack both: an NLB (L4) in front for TLS passthrough and DDoS absorption, with ALB/Envoy (L7) behind it for routing.

## Algorithms

| Algorithm | How it picks a backend | Good for | Weak spot |
|---|---|---|---|
| Round robin | Cycles through backend list in order | Uniform, stateless backends of equal capacity | Ignores current load; a slow request piles up connections |
| Weighted round robin | Round robin but backends get proportional share by weight | Mixed instance sizes (some 2x CPU) | Weights are static, don't adapt to real-time load |
| Least connections | Sends to backend with fewest active connections | Variable request duration (some requests slow) | Needs LB to track connection state; wrong for very short requests where round robin is fine |
| Weighted least connections | Least connections adjusted by capacity weight | Heterogeneous fleet with variable request time | More bookkeeping, same blind spots as weights |
| Consistent hashing | Hash(key) maps to a point on a ring; request goes to nearest backend clockwise | Cache-friendly routing, sticky sessions without a session store, sharding to stateful backends (e.g. Redis, Memcached clients) | Requires careful ring design (virtual nodes) to avoid hot spots when nodes join/leave |
| Random / power-of-two-choices | Pick 2 random backends, send to the less loaded | Very large fleets where full state tracking is expensive | Slightly less optimal than true least-connections, but scales better |
| IP hash | Hash(client IP) → backend | Simple session affinity | Breaks under NAT (many clients share one IP) or client IP changes (mobile networks) |

### Consistent hashing, concretely

Used heavily where you want the *same key* to keep landing on the *same backend* even as the fleet scales — think client-side sharding for Memcached, or an L7 proxy routing by user ID to warm a per-user cache.

```
Ring (0 .. 2^32-1), backends placed via hash(backend_id + vnode_i):

        B1(120)
           |
  B3(310)--+--B2(200)
           |
        B1(150)  <- vnode of B1 again

request key="user:42" -> hash = 180 -> walk clockwise -> lands on B2(200)
```

Virtual nodes (multiple points per physical backend) smooth out the distribution — without them, one backend can end up owning a disproportionate arc of the ring. Adding/removing a backend only remaps the keys in its immediate ring neighborhood, not the whole keyspace — this is the property that makes it so much better than `hash(key) % N` for dynamic fleets.

## Health checks

A load balancer is only as good as its view of backend health.

- **Active health checks**: LB periodically hits `/healthz` (or opens a TCP connection) and removes a backend from rotation after N consecutive failures, re-adds after M consecutive successes. Nginx, HAProxy, ALB target groups, Envoy — all support this natively.
- **Passive health checks**: LB observes real traffic — if a backend starts returning 5xxs or timing out, it's ejected without a dedicated probe. Envoy's "outlier detection" is a canonical example.
- Distinguish **liveness** (is the process up?) from **readiness** (is it warmed up and able to serve, e.g. cache populated, DB pool established?). Kubernetes formalizes this split; an LB should route only on readiness, not liveness.

```nginx
upstream backend {
    least_conn;
    server 10.0.1.10:8080 weight=3 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:8080 weight=1;
    server 10.0.1.12:8080 backup;
}
```

## Sticky sessions

If a backend holds in-memory state for a session (shopping cart, WebSocket, in-memory auth cache), you either need the LB to keep routing the same client to the same backend ("sticky sessions" / session affinity), or you need to externalize the state (Redis-backed sessions, JWT) so any backend can serve any request.

- **Cookie-based affinity**: LB sets a cookie (e.g. `AWSALBAPP`) pinning the client to a backend. Survives client IP changes, breaks if the client doesn't send cookies back (some API clients).
- **IP-based affinity**: crude, breaks under NAT/CGNAT.
- The architecturally cleaner answer, and the one interviewers want to hear, is: **prefer stateless backends** and push session state to a shared store. Stickiness is a workaround, not a design goal — it reintroduces a single point of failure per session and complicates scaling/deploys (draining a "hot" instance loses affinity for everyone pinned to it).

## Hardware vs software vs managed

- **Hardware LBs** (F5 BIG-IP, Citrix ADC): dedicated appliances, very high throughput, expensive, mostly seen in large enterprises/legacy data centers.
- **Software LBs**: HAProxy (battle-tested, L4/L7, extremely tunable), Nginx (L7 reverse proxy that also load balances), Envoy (L4/L7, first-class observability, xDS dynamic config, the data plane of most modern service meshes like Istio).
- **Managed/cloud**: AWS ALB (L7, HTTP/gRPC-aware, integrates with target groups & auto scaling), AWS NLB (L4, static IP, ultra-low latency, TLS passthrough), Google Cloud Load Balancing, Azure Load Balancer / App Gateway.

The industry trend: fewer hand-rolled HAProxy boxes, more Envoy (often invisible to app teams, driving a service mesh sidecar) plus a cloud L4/L7 LB at the edge.

## Trade-offs summary

- L4: faster, protocol-agnostic, cannot do content routing or TLS termination cheaply.
- L7: flexible, enables canary/blue-green/path routing, but adds latency (parsing, possibly re-encrypting) and needs more CPU per connection.
- Consistent hashing: essential for cache affinity and stateful sharding; overkill for plain stateless web tiers where round robin/least-conn is simpler and easier to reason about.
- Sticky sessions: solve a real problem cheaply in the short term but usually indicate a design smell — the fix is usually to externalize state, not to lean harder on affinity.

## Common interview follow-ups

**Q: Your ALB shows even request distribution but one backend is still slow — why?**
Round-robin/least-connections balances at the LB layer, but requests can vary wildly in cost (a report-generation endpoint vs a health check). Even distribution of *count* doesn't mean even distribution of *work*. You'd want least-connections or latency-aware/adaptive load balancing (e.g. Envoy's weighted-least-request), plus per-endpoint capacity isolation.

**Q: How does a load balancer itself avoid being a single point of failure?**
Run at least two LB nodes behind a floating/virtual IP (keepalived + VRRP) or behind DNS with health-checked records, or use a managed LB service where the cloud provider guarantees the redundancy (ALB/NLB are already multi-AZ). At L4, anycast IP plus ECMP across multiple LB instances is the hyperscaler pattern.

**Q: When would you choose consistent hashing over least connections?**
When backend nodes hold state that benefits from affinity — a local LRU cache, in-memory session data, sharded connections to Memcached/Redis — so that repeat requests for the same key hit a warm node instead of the request being served "correctly" but slowly by a cold node.

**Q: What happens during a rolling deploy with sticky sessions enabled?**
Draining a pinned instance either kills in-flight sessions or forces the LB to keep routing to a "draining" instance until sessions naturally expire, which can stall deploys. This is a strong argument for stateless services with externalized session stores.

**Q: NLB vs ALB — when do you pick NLB?**
When you need extreme throughput/low latency, static IPs (for allowlisting), non-HTTP protocols (raw TCP/UDP, e.g. game servers, MQTT), or you need to preserve the client's source IP without proxy protocol.

## Related topics

- [Reverse Proxy & API Gateway](reverse-proxy-api-gateway.md)
- [Horizontal vs Vertical Scaling](horizontal-vs-vertical-scaling.md)
- [Rate Limiting](rate-limiting.md)
- [High Availability](../08-reliability-operations/high-availability.md)
- [CDN Architecture](../04-caching/cdn-architecture.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
