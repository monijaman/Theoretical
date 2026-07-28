````md
# CDN Architecture
[← Back to index](../readme.md)

---

# What is a CDN?

A **Content Delivery Network (CDN)** is a globally distributed network of servers that stores cached copies of your content closer to users.

Instead of every request traveling to your origin server, users are served by the nearest CDN edge server whenever possible.

> **Interview takeaway:** A CDN isn't just an image cache—it's a globally distributed caching system that improves performance, scalability, availability, and security.

---

# Why It Matters

Without a CDN:

```text
User (Japan)

↓

Origin Server (US)

↓

200ms+ Network Latency

↓

Response
```

Every request must travel across continents.

---

With a CDN:

```text
User (Japan)

↓

Tokyo Edge Server

↓

Response

(Cache Hit)
```

The content is served much closer to the user.

Benefits include:

- Lower latency
- Faster page loads
- Reduced origin server load
- Better scalability
- Built-in DDoS protection
- Improved availability

---

# How a CDN Works

## Step 1 — User Requests Content

```text
Browser

↓

cdn.example.com/logo.png
```

---

## Step 2 — Request Goes to Nearest Edge Server

```text
User

↓

Nearest CDN Edge

(Point of Presence)
```

---

## Step 3 — Cache Lookup

```text
Edge Cache

│

├── Cache Hit

│      ↓

│   Return File

│

└── Cache Miss

       ↓

Origin Server

       ↓

Store in Cache

       ↓

Return File
```

Future requests are served directly from the edge cache.

---

# CDN Architecture Overview

```text
                Users Worldwide
        ┌────────┬────────┬────────┐
        │        │        │        │
        ▼        ▼        ▼        ▼
     Tokyo    London   Sydney   New York
      Edge      Edge     Edge      Edge
        │          │        │         │
        └──────────┴────────┴─────────┘
                     │
                     ▼
               Origin Server
```

Each edge server stores cached content for nearby users.

---

# Edge Points of Presence (PoPs)

A **Point of Presence (PoP)** is a CDN data center located close to users.

Examples include:

- Tokyo
- Singapore
- Frankfurt
- London
- New York
- São Paulo
- Sydney

Each PoP contains many caching servers.

---

## Why So Many PoPs?

Instead of:

```text
Every User

↓

Single Data Center
```

Users connect to nearby edge locations.

This significantly reduces network travel time.

---

# Anycast Routing

## Problem

How does a user automatically reach the nearest PoP?

---

## Solution

CDNs use **Anycast**.

Every edge server advertises the **same IP address**.

Example:

```text
104.16.x.x
```

Internet routers automatically send users to the closest location.

---

## Example

```text
Tokyo User

↓

Tokyo Edge

-------------------------

Berlin User

↓

Frankfurt Edge

-------------------------

Sydney User

↓

Sydney Edge
```

All users connect to the same IP address, but reach different physical servers.

---

## Advantages

- Automatic routing
- Low latency
- No client configuration
- Built-in DDoS load distribution

---

# DNS-Based Routing

Some CDNs use DNS instead.

```text
Browser

↓

DNS

↓

Nearest Edge IP
```

The DNS server decides which edge server to use based on geographic location.

---

## Difference

| Anycast | DNS Routing |
|----------|-------------|
| Routing handled by Internet (BGP) | Routing decided by DNS |
| Better DDoS protection | Easier to implement |
| More accurate path selection | Depends on DNS resolver location |

Modern CDNs primarily rely on Anycast.

---

# Cache-Control Headers

The origin server tells the CDN how long content can be cached.

These rules are communicated using HTTP headers.

---

## Example

```http
Cache-Control:
public,
max-age=60,
s-maxage=3600,
stale-while-revalidate=30,
stale-if-error=86400
```

---

# Common Cache-Control Directives

## max-age

```http
max-age=60
```

Browsers cache the response for **60 seconds**.

---

## s-maxage

```http
s-maxage=3600
```

Shared caches (CDNs) cache it for **1 hour**.

This overrides `max-age` for the CDN.

---

## stale-while-revalidate

Allows the CDN to serve slightly stale content while refreshing it in the background.

```text
Cache Expired

↓

Serve Old Copy

↓

Refresh From Origin

↓

Update Cache
```

Users experience almost no delay.

---

## stale-if-error

If the origin server fails,

the CDN continues serving the cached copy.

```text
Origin Down

↓

Serve Cached Copy

↓

Users See Data

Instead of

HTTP 500
```

This greatly improves availability.

---

## no-store / private

```http
Cache-Control: private
```

or

```http
Cache-Control: no-store
```

The CDN should never cache the response.

Used for:

- User profiles
- Banking
- Checkout pages
- Personalized dashboards

---

# Origin Shield

## Problem

Imagine every CDN edge misses the same file.

```text
Tokyo Edge

↓

Origin

London Edge

↓

Origin

Sydney Edge

↓

Origin

New York Edge

↓

Origin
```

Hundreds of edge servers simultaneously overload the origin.

---

## Solution

Origin Shield.

A regional cache sits between edge servers and the origin.

---

## Architecture

```text
               Origin Server
                     ▲
                     │
              Origin Shield
          ┌────────┼────────┐
          │        │        │
      Tokyo     London   Sydney
       Edge       Edge      Edge
          │        │        │
      Thousands of Users
```

Now:

- Only Origin Shield fetches from the origin.
- Every edge fetches from Origin Shield.

The origin receives far fewer requests.

---

## Benefits

- Prevents origin overload
- Reduces duplicate requests
- Improves cache hit ratio
- Lowers origin bandwidth costs

---

# Pull CDN

## Idea

Content is fetched only when requested.

---

## Flow

```text
User

↓

Edge Cache

↓

Cache Miss

↓

Origin

↓

Store in Cache

↓

Return Response
```

Future requests become cache hits.

---

## Advantages

- Easy to configure
- No manual uploads
- Only popular content is cached

---

## Disadvantages

The very first request always experiences a cache miss.

---

# Push CDN

## Idea

Upload content to the CDN before users request it.

---

## Flow

```text
Origin

↓

Upload

↓

CDN Storage

↓

Users
```

No cache miss occurs.

---

## Advantages

- Immediate availability
- No first-request delay
- Great for large media files

---

## Disadvantages

- Manual publishing required
- Uses storage even for rarely accessed files

---

## Pull vs Push

| Pull CDN | Push CDN |
|-----------|----------|
| Lazy loading | Preloaded content |
| Simple setup | Manual upload |
| First request misses | First request is fast |
| Best for websites | Best for videos and downloads |

---

# CDN Cache Invalidation

Eventually cached content becomes outdated.

The CDN must remove old copies.

This is called **cache invalidation** or **purging**.

---

## Purge Flow

```text
Origin Updated

↓

Purge API

↓

Every Edge Server

↓

Delete Cached Copy
```

---

## Purge Types

### Single URL

```text
/images/logo.png
```

Very fast.

---

### Cache Tags

Instead of individual URLs:

```text
Product-42
```

Every cached page containing Product 42 is removed.

Useful for:

- Product pages
- Categories
- Search results

---

### Wildcard Purge

```text
/images/*
```

Removes many cached files.

Much slower because it affects many edge servers.

---

# Why Purging Isn't Instant

A CDN may have hundreds of PoPs.

Each PoP must receive the purge request.

```text
Purge

↓

Tokyo

↓

London

↓

Sydney

↓

New York

↓

...

Hundreds More
```

Some locations receive it immediately.

Others may take a few seconds.

---

# Dynamic Content Acceleration

CDNs help even when content cannot be cached.

Examples:

- Logged-in dashboards
- Search
- APIs
- Personalized pages

---

Instead of:

```text
User

↓

Public Internet

↓

Origin
```

Traffic travels over the CDN's optimized private network.

```text
User

↓

Nearest Edge

↓

CDN Backbone

↓

Origin
```

Benefits include:

- Faster routing
- Persistent connections
- Fewer TLS handshakes
- Lower latency

Even uncached requests become faster.

---

# Layered Web Architecture

```text
User

↓

Browser Cache

↓

CDN Edge

↓

Origin Shield

↓

Load Balancer

↓

Application Servers

↓

Redis

↓

Database
```

Each layer reduces load on the next.

---

# CDN Features at a Glance

| Feature | Purpose |
|----------|---------|
| Edge Cache | Serve nearby users |
| Anycast | Route users to nearest PoP |
| Cache-Control | Define caching rules |
| Origin Shield | Protect origin from request spikes |
| Pull CDN | Cache on first request |
| Push CDN | Preload content |
| Purge | Remove outdated content |
| Dynamic Acceleration | Speed up uncached traffic |

---

# Common Interview Questions

## Why use a CDN?

To:

- Reduce latency
- Improve page load speed
- Lower origin traffic
- Increase availability
- Protect against DDoS attacks

---

## What is a Cache Hit?

The requested content already exists at the edge server.

The origin is not contacted.

---

## What is a Cache Miss?

The edge server doesn't have the content.

It fetches it from the origin, caches it, and serves the user.

---

## What is Anycast?

Multiple servers advertise the same IP address.

Internet routing automatically sends users to the closest server.

---

## Why is Origin Shield useful?

Without Origin Shield:

Every edge server independently requests missing content from the origin.

With Origin Shield:

Only the shield contacts the origin.

This dramatically reduces origin traffic.

---

## What is the difference between `max-age` and `s-maxage`?

- **max-age** controls browser caching.
- **s-maxage** controls shared caches such as CDNs.

This allows browsers and CDNs to use different cache lifetimes.

---

## What does `stale-while-revalidate` do?

The CDN immediately serves stale content while refreshing it in the background.

Users receive fast responses without waiting for the origin.

---

## When is `stale-if-error` useful?

If the origin server becomes unavailable, the CDN continues serving previously cached content.

Instead of showing an error page, users receive slightly older—but still usable—content.

---

## Is a CDN only useful for static files?

No.

Besides caching static assets, modern CDNs also accelerate dynamic requests using optimized private backbone networks, connection reuse, and edge termination of TLS, reducing latency even for uncached API responses.

---

# Key Takeaways

- A **CDN** is a globally distributed network of edge servers that caches content closer to users.
- **Edge PoPs** reduce latency by serving requests from nearby geographic locations.
- **Anycast routing** automatically directs users to the closest edge server while improving DDoS resilience.
- **Cache-Control headers** tell browsers and CDNs how long content should remain cached.
- **Origin Shield** prevents many edge servers from overwhelming the origin during cache misses.
- **Pull CDNs** lazily fetch content on demand, while **Push CDNs** preload content before it is requested.
- **Cache purging** removes outdated content from edge servers but takes time to propagate globally.
- Modern CDNs also accelerate **dynamic, uncached traffic**, making them valuable even beyond static content delivery.
````


## Related topics
- [Caching Strategies](caching-strategies.md)
- [Cache Invalidation](cache-invalidation.md)
- [Cache Eviction Policies](cache-eviction-policies.md)
- [Load Balancing](../01-scaling-traffic/load-balancing.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
- [API Gateway](../10-system-design-practice/api-gateway.md)
