# Rate Limiting

> ## TL;DR
>
> **Rate Limiting** controls how many requests a client can make within a specific time period.
>
> It protects your application from:
>
> - Abuse
> - DDoS attacks
> - API overuse
> - Resource exhaustion
>
> Instead of allowing unlimited requests, the system slows down or rejects excessive traffic.

---

# Why Do We Need Rate Limiting?

Imagine your API receives requests from thousands of users.

Normally:

```
Users
   │
   ▼
API Server
```

Everything works fine.

Now imagine one client sends **10,000 requests per second**.

```
Client

↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓

API
```

Without Rate Limiting:

- CPU reaches 100%
- Database becomes overloaded
- Other users experience slow responses
- The service may crash

---

# How Rate Limiting Solves This

The API allows only a fixed number of requests.

Example:

```
100 Requests / Minute
```

If the client exceeds the limit:

```
Request

↓

429 Too Many Requests
```

The server rejects additional requests until the limit resets.

---

# Common Use Cases

- Public APIs
- Login endpoints
- Password reset
- OTP requests
- Payment APIs
- Search endpoints
- AI APIs (OpenAI, Anthropic)
- Email sending

---

# Rate Limiting vs Quota

These are often confused.

| Rate Limiting | Quota |
|--------------|--------|
| Controls request speed | Controls total usage |
| Requests per second/minute | Requests per day/month |
| Protects servers | Enforces subscription plans |
| Resets quickly | Resets after billing period |

Example:

```
100 Requests / Minute
```

Rate Limit

```
100,000 Requests / Month
```

Quota

A user can stay within their monthly quota but still exceed the per-minute rate limit.

---

# Where Is Rate Limiting Applied?

```
          Client
             │
             ▼
      API Gateway
             │
             ▼
       Rate Limiter
             │
      Allowed?
      /        \
    Yes         No
     │           │
     ▼           ▼
 API Server    429 Error
```

Most production systems apply rate limiting at the **API Gateway** or **Load Balancer**.

---

# Rate Limiting Algorithms

There are several algorithms.

Each has different advantages.

---

# 1. Token Bucket ⭐ (Most Popular)

Imagine a bucket filled with tokens.

```
Bucket

[●●●●●●●●●●]
```

Each request consumes one token.

```
Request

↓

Consume Token
```

If the bucket is empty:

```
Request

↓

Rejected
```

Tokens are automatically refilled over time.

Example:

```
Capacity = 10

Refill = 5 Tokens / Second
```

At time zero:

```
[●●●●●●●●●●]
```

Ten requests are allowed immediately.

After one second:

```
[●●●●●]
```

Five new requests are allowed.

---

## Advantages

✅ Allows short bursts

✅ Very efficient

✅ Industry standard

Examples:

- AWS API Gateway
- Stripe
- Google Cloud APIs

---

## Disadvantages

- Requires tracking token count
- Slightly more complex than a simple counter

---

# 2. Leaky Bucket

Imagine a bucket with a small hole.

Water enters quickly.

Water leaves slowly.

```
Incoming

||||||||||

↓

Bucket

↓

One Drop at a Time
```

Traffic becomes smooth.

Unlike Token Bucket:

Large bursts are **not** allowed.

---

## Advantages

- Smooth traffic
- Predictable request rate

---

## Disadvantages

- Bursts are delayed
- Requests may wait in a queue

---

# 3. Fixed Window Counter

Example:

```
100 Requests

Per Minute
```

Minute starts:

```
10:00
```

Counter resets at:

```
10:01
```

Simple implementation:

```
User A

Counter = 52
```

When it reaches:

```
100
```

Further requests are rejected.

---

## Problem

Suppose a user sends:

```
100 Requests

10:00:59
```

Then immediately sends:

```
100 Requests

10:01:00
```

The user has sent:

```
200 Requests

Within One Second
```

Even though both windows were technically valid.

This is called the **Fixed Window Boundary Problem**.

---

# 4. Sliding Window

Instead of fixed windows, the server always looks at the **last 60 seconds**.

```
Current Time

↓

Previous 60 Seconds
```

This removes the boundary problem.

It produces much smoother rate limiting.

---

## Advantages

✅ More accurate

✅ Fairer

---

## Disadvantages

- Slightly more memory
- More calculations

---

# Comparison

| Algorithm | Bursts | Accuracy | Complexity |
|-----------|---------|-----------|------------|
| Token Bucket | Excellent | High | Medium |
| Leaky Bucket | No | High | Medium |
| Fixed Window | Poor | Medium | Easy |
| Sliding Window | Good | Very High | Higher |

---

# Distributed Rate Limiting

One API server is easy.

Multiple servers are harder.

```
        Load Balancer
       /      |      \
      ▼       ▼       ▼
   API1    API2    API3
```

If every server keeps its own counter:

```
Limit = 100

API1 = 100

API2 = 100

API3 = 100
```

The client could make:

```
300 Requests
```

Instead of:

```
100
```

---

## Solution

Store counters in Redis.

```
        API Servers
          │
          ▼
        Redis
```

All servers share the same counter.

This keeps limits consistent across the cluster.

---

# Redis + Lua Script

Production systems usually use Redis with Lua scripts.

Why?

Without Lua:

```
Read Counter

↓

Increase Counter

↓

Save Counter
```

Two servers might update the counter at the same time.

This creates race conditions.

Lua executes everything atomically.

```
Read

↓

Check

↓

Update

↓

Done
```

No other request can interrupt the process.

---

# HTTP Response

When a limit is exceeded, the server should return:

```
HTTP 429

Too Many Requests
```

Useful response headers include:

```
Retry-After

X-RateLimit-Limit

X-RateLimit-Remaining

X-RateLimit-Reset
```

These help clients know when they can safely retry.

---

# Per-IP vs Per-User vs Per-API Key

## Per IP

```
192.168.1.10

↓

100 Requests
```

Simple.

Problem:

Many users behind the same NAT share one IP.

---

## Per User

```
User ID

↓

100 Requests
```

More accurate.

Requires authentication.

---

## Per API Key

Common for public APIs.

```
API Key

↓

1000 Requests
```

Useful for:

- Paid plans
- Free tiers
- Enterprise customers

---

# Best Practices

✅ Use Token Bucket for most APIs

✅ Return HTTP 429

✅ Include Retry-After header

✅ Store counters in Redis

✅ Apply limits at the API Gateway

✅ Monitor rejected requests

---

# Common Mistakes

❌ Using only in-memory counters

❌ Returning HTTP 500 instead of 429

❌ Ignoring Retry-After

❌ Applying the same limits to every endpoint

❌ No rate limiting on login or OTP APIs

---

# Real-World Examples

### GitHub

- Rate limits API requests
- Returns remaining request count in headers

### Stripe

- Uses Token Bucket
- Protects payment APIs

### Cloudflare

- Uses distributed rate limiting
- Protects against DDoS attacks

### AWS API Gateway

- Supports Token Bucket
- Configurable burst capacity

---

# Interview Questions

## Why is Token Bucket more popular than Fixed Window?

Because it allows short bursts while maintaining a consistent average request rate.

---

## Why use Redis?

To share request counters across multiple API servers.

---

## Why use Lua Scripts?

To update Redis counters atomically and prevent race conditions.

---

## What HTTP status code should be returned?

```
429 Too Many Requests
```

---

## Should Rate Limiting happen before authentication?

Usually both.

- Before authentication → Protect against floods.
- After authentication → Apply user-specific limits.

---

## Can WebSockets be rate limited?

Yes.

Instead of limiting HTTP requests, limit:

- Messages per second
- Events per minute
- Connection attempts

---

# Key Takeaways

- Rate Limiting protects your system from abuse and overload.
- Token Bucket is the most widely used algorithm.
- Sliding Window offers better accuracy than Fixed Window.
- Redis enables distributed rate limiting across multiple servers.
- Return **HTTP 429** with a **Retry-After** header when clients exceed the limit.
- Rate limiting controls request **speed**, while quotas control overall **usage**.

---


## Related topics
- [Load Balancing](load-balancing.md)
- [Reverse Proxy & API Gateway](reverse-proxy-api-gateway.md)
- [Backpressure](backpressure.md)
- [Retry & Exponential Backoff](retry-exponential-backoff.md)
- [Rate Limiter (design practice)](../10-system-design-practice/rate-limiter.md)
- [API Gateway (design practice)](../10-system-design-practice/api-gateway.md)
