# CDN Architecture
[← Back to index](../readme.md)

## What this is and why it's asked

A CDN (Content Delivery Network) is a globally distributed cache sitting between users and your origin server, terminating requests as close to the user as physically possible. Interviewers bring this up to check whether you think about latency as a *speed-of-light* problem (a round trip from Sydney to a us-east-1 origin is ~200ms of pure geography, no amount of server optimization fixes that) and whether you understand a CDN as a full caching *system* — with its own consistency model, invalidation cost, and failure-protection role for the origin — rather than just "a thing that caches images."

## Edge PoPs and anycast routing

A CDN operates hundreds to low-thousands of Points of Presence (PoPs) — small clusters of caching servers placed in ISP peering locations, IXPs, and metro data centers around the world (Cloudflare: 300+ cities; Akamai: deployed inside thousands of ISP networks directly; Fastly/CloudFront: fewer, larger PoPs at major internet exchanges).

Routing a user to the *nearest* PoP is typically done with **anycast**: the same IP address is announced via BGP from every PoP simultaneously, and normal internet routing (shortest AS-path / lowest BGP cost) naturally delivers each user's packets to whichever PoP is topologically closest, with no client-side logic or DNS trickery required.

```
User in Tokyo -----> BGP routes to nearest announcing PoP -----> Tokyo PoP
User in Berlin ----> BGP routes to nearest announcing PoP -----> Frankfurt PoP
                              (same anycast IP, e.g. 104.16.x.x)
```

Some CDNs (older Akamai deployments, some DNS-based setups) instead use **DNS-based routing**: the CDN's authoritative DNS server resolves a hostname to a different PoP IP depending on the resolver's geographic location. Anycast has largely become the default because it also gives free DDoS absorption — an attack's traffic is spread across every PoP announcing the IP instead of concentrating on one target — whereas DNS-based routing depends on the resolver's location being a good proxy for the client's, which breaks down with third-party DNS resolvers (e.g., 8.8.8.8) that aren't geographically close to the requester.

```
Request lifecycle:
  Client -> Anycast IP -> nearest PoP
              |
              |-- cache hit  -> PoP serves from edge cache, done (fast)
              |-- cache miss -> PoP fetches from origin (or origin shield, see below)
                                 PoP caches response, serves client
```

## Cache-Control headers: the actual contract

The CDN doesn't get to decide freshness on its own — the origin communicates caching rules via standard HTTP headers, and every CDN respects the same vocabulary (this is genuinely HTTP semantics, not a CDN-specific feature):

| Directive | Meaning |
|---|---|
| `max-age=N` | Fresh for N seconds from the client's (browser's) perspective. |
| `s-maxage=N` | Fresh for N seconds specifically for *shared* caches (CDN, reverse proxy) — overrides `max-age` for the CDN layer, letting you cache longer at the edge than in the browser. |
| `stale-while-revalidate=N` | Once stale, the CDN may serve the stale copy immediately while asynchronously re-fetching from origin in the background — the user gets a fast (if slightly old) response instead of waiting on a synchronous refetch. |
| `stale-if-error=N` | If the origin is down or erroring, serve the stale cached copy for up to N seconds instead of propagating the error — a resilience mechanism, not just a performance one. |
| `no-store` / `private` | Never cache at a shared layer (CDN) at all — used for personalized or sensitive responses. |

```
Cache-Control: public, max-age=60, s-maxage=3600, stale-while-revalidate=30, stale-if-error=86400
```

This example says: browsers should treat it fresh for 60s, but the CDN edge can hold it for an hour; once past freshness the CDN may serve the stale copy for another 30s while quietly refreshing; and if origin is fully down, keep serving this response for up to a day rather than erroring out. This single header line is doing the job that would otherwise require a hand-rolled invalidation service — it's the cheapest, most standard cache-invalidation mechanism there is, which is why `cache-invalidation.md`'s TTL discussion applies here almost unchanged, just at a different layer of the stack.

## Origin shield: protecting the origin from a thundering herd

Without an extra layer, a popular object that's cold at every edge PoP simultaneously (e.g., right after a purge, or a brand-new file that suddenly goes viral) causes *every* PoP worldwide to independently miss and hit the origin at roughly the same time — the CDN itself becomes the thundering-herd problem it was supposed to prevent, just multiplied by however many PoPs exist.

**Origin shield** designates one mid-tier caching layer (often one PoP per region, or a single designated PoP) that sits between the edge PoPs and the true origin. Edge PoPs fetch misses from the shield, not directly from origin; the shield itself only fetches from origin once and serves every edge PoP's request for that object from its own cache.

```
                     Origin (1 server)
                          ^
                          | single fetch on miss
                    Origin Shield (1 PoP)
                     ^    ^    ^    ^
                     |    |    |    |     <- many edge PoPs' misses
                     |    |    |    |        collapse into ~1 origin fetch
   [Edge PoP Tokyo][Edge PoP SG][Edge PoP Sydney][Edge PoP Osaka]
        ^               ^              ^               ^
     thousands       thousands      thousands       thousands
      of users        of users       of users        of users
```

This is architecturally identical to the request-coalescing / single-flight pattern described in `cache-invalidation.md` for a stampede on a single cache node — origin shield is that same idea applied at the scale of an entire CDN fleet. CloudFront calls this "Origin Shield" explicitly as a configurable feature; Fastly and Cloudflare achieve the same effect via their internal tiered-caching topology (edge -> regional cache -> origin).

## Push vs pull CDNs

- **Pull (the default for almost everyone today)**: the CDN caches lazily — it only fetches an object from origin the first time some edge PoP gets a request for it (a miss), then serves subsequent requests from cache until TTL expiry. Zero upfront work for the origin owner; the trade-off is a guaranteed cold miss for the very first request to any PoP for any object.
- **Push**: the origin proactively uploads content to the CDN's storage ahead of time (common for large static media libraries, software distribution, or video-on-demand catalogs) — the CDN never needs to "miss" because the content was placed there deliberately, but this requires an explicit publish/sync step and doesn't self-manage cache eviction the same way (you're paying for storage of everything you pushed, not just what's actually hot).

Most modern web traffic uses pull CDNs because dynamic websites can't predict in advance what will be popular; push remains common for large media catalogs (video platforms pre-positioning new releases) where a predictable, large first-request cost is worse than pre-warming.

## Purge/invalidation latency trade-off

Purging a CDN-cached object means sending a request to evict it from every PoP that might be holding a copy — and this is fundamentally harder than invalidating a single Redis instance because there can be hundreds of independent caching nodes worldwide, some of which may be temporarily unreachable from the control plane.

```
Origin content changes
        |
        v
  Purge API call ("evict /images/logo.png")
        |
        +----> PoP 1 (ack in ms)
        +----> PoP 2 (ack in ms)
        +----> PoP N (ack... eventually, or times out and retries)
        |
   Purge "done" is only as strong as the slowest/least-reachable PoP's ack
```

- **Instant/targeted purge** (single URL or a small tag/surrogate-key group) is generally fast — Cloudflare and Fastly both advertise purges propagating in roughly 150ms best case, though real-world global propagation is usually low single-digit seconds.
- **Wildcard/mass purge** (an entire path prefix or the whole zone) is slower and often rate-limited by the CDN provider, precisely because it fans out to every PoP and can itself cause a thundering herd back at the origin as everything simultaneously goes cold (the exact stampede problem origin shield exists to prevent) — one more reason `stale-while-revalidate` is preferred over hard purges wherever staleness is tolerable: it avoids a synchronized global cache-empty event entirely.
- **Surrogate keys / cache tags** (Fastly's "surrogate keys", Cloudflare's "cache tags") let you purge by a logical tag (`product:42`) rather than by exact URL, so one write-side event can invalidate every cached representation of that resource (different query params, different device variants) without needing to enumerate every URL — this is the CDN-layer equivalent of the versioned-key pattern in `cache-invalidation.md`, except here it's an active fan-out purge instead of passive version aging.

Given that purge is never instantaneous everywhere, the practical rule of thumb is: **the shorter your acceptable staleness window, the shorter your TTL should be — don't rely on purge as your primary invalidation mechanism**, use it as an emergency/occasional tool (e.g., "we shipped a bad image, get rid of it now") layered on top of sane TTLs, not as the routine way content gets updated.

## Dynamic content acceleration (briefly)

CDNs aren't limited to caching static assets (images, JS bundles, video segments). Even fully personalized, uncacheable API responses benefit from **dynamic site acceleration**: the CDN's edge network is still the fastest available path back to origin because CDN PoPs interconnect over private, well-provisioned backbone links (rather than the public, congested transit paths a direct client-to-origin request would traverse), and TCP/TLS connections can be terminated at the edge (closest to the user) while a persistent, already-warm connection from edge-to-origin carries the request the rest of the way — avoiding a fresh TLS handshake's round trips for every request. CloudFront's "dynamic content" mode and Cloudflare's "Argo Smart Routing" are both selling exactly this: latency reduction on traffic that's explicitly `no-store` and can never be cached at all.

## Trade-offs summary

| Aspect | Pull CDN | Push CDN |
|---|---|---|
| Origin effort | None (lazy fetch on miss) | Must proactively publish content |
| First-request latency | Guaranteed miss on cold objects | No miss if pre-published |
| Best for | Dynamic, unpredictable web traffic | Large predictable media catalogs |
| Anycast routing | Free DDoS absorption, no DNS geo-logic needed | Same |
| DNS-based routing | Simpler to reason about per-region, but resolver location can mislead | Same |
| Purge scope: single URL/tag | Fast (seconds) | Fast (seconds) |
| Purge scope: wildcard/whole zone | Slow, rate-limited, risks origin thundering herd | Same |

## Common interview follow-ups

**Q: Why is anycast preferred over DNS-based geo-routing for most CDNs today?**
DNS-based routing infers the client's location from the DNS resolver's location, which breaks when clients use a third-party resolver (like 8.8.8.8) that isn't near them; anycast routes on the actual network path via BGP, which reflects real topology, and as a side effect spreads DDoS traffic across every PoP announcing the address instead of concentrating it on one.

**Q: What's the difference between `max-age` and `s-maxage`, and why would you ever want them different?**
`max-age` governs private/browser caching, `s-maxage` governs shared caches like the CDN; setting `s-maxage` much higher than `max-age` lets you cache aggressively at the edge (cheap, controllable) while still letting the browser revalidate more often — useful when you trust your purge mechanism to fix the edge quickly but want browsers, which you can't purge at all, to check in sooner.

**Q: Why does origin shield matter even though every edge PoP already caches independently?**
Without a shield, N globally distributed PoPs each independently missing on the same newly-cold object all hit origin at once, effectively multiplying a single-server stampede by the PoP count; shield collapses that into (worst case) one fetch per shield node, which is the request-coalescing pattern applied at CDN scale.

**Q: How would you invalidate a CDN cache for a resource that has many URL variants (query params, device type)?**
Use surrogate keys/cache tags to associate every variant's cached response with a logical tag at cache-write time, then purge by tag on the write-side event — this avoids needing to enumerate every generated URL and mirrors versioned cache keys used at the application-cache layer.

**Q: When would a `stale-if-error` header actually save you in production?**
When the origin has an outage or a transient 5xx spike — instead of the CDN faithfully propagating the error to every user, it keeps serving the last known-good cached response for the configured window, turning a full outage into "users see slightly old data," which is almost always the better failure mode for read-heavy content.

**Q: Is a CDN only useful for static assets?**
No — beyond static caching, CDNs act as a globally distributed reverse-proxy/accelerator even for fully dynamic, uncacheable traffic, because their edge-to-origin backbone links and edge-terminated TLS handshakes are faster than a client going directly to origin over the public internet, which is what "dynamic site acceleration" products are selling.

## Related topics
- [Caching Strategies](caching-strategies.md)
- [Cache Invalidation](cache-invalidation.md)
- [Cache Eviction Policies](cache-eviction-policies.md)
- [Load Balancing](../01-scaling-traffic/load-balancing.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
- [API Gateway](../10-system-design-practice/api-gateway.md)
