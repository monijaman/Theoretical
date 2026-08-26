# Load Balancing


> A **Load Balancer** distributes incoming requests across multiple servers so that no single server becomes overloaded.
>
> It improves:
>
> - Scalability
> - High Availability
> - Fault Tolerance
> - Performance
>
> Modern cloud applications almost always place a Load Balancer in front of multiple application servers.

---

# Why Do We Need Load Balancing?

Imagine your application runs on a single server.

```
          Users
             │
             ▼
        Web Server
```

Everything works...

Until thousands of users arrive at the same time.

The server becomes overloaded.

- CPU reaches 100%
- Memory fills up
- Requests become slow
- Users receive errors

Instead of making one server bigger, we can add more servers.

```
             Users
                │
                ▼
         Load Balancer
        /      |      \
       ▼       ▼       ▼
   Server1  Server2  Server3
```

The Load Balancer spreads traffic evenly across all servers.

---

# How Load Balancing Works

Every client request first reaches the Load Balancer.

```
Client
   │
   ▼
Load Balancer
   │
 ┌─┴───────────────┐
 ▼                 ▼
API 1          API 2
                   ▼
                API 3
```

The Load Balancer decides which backend server should handle the request.

If one server becomes unhealthy, requests are automatically sent to healthy servers.

---

# Benefits

✅ Better Performance

✅ High Availability

✅ Fault Tolerance

✅ Easy Horizontal Scaling

✅ Automatic Failover

---

# Layer 4 vs Layer 7 Load Balancing

Load Balancers operate at different layers of the OSI model.

```
                Load Balancer
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
    Layer 4                 Layer 7
   (Transport)            (Application)
```

---

# Layer 4 (L4) Load Balancer

Layer 4 works with:

- TCP
- UDP
- IP Address
- Port Numbers

It does **not** understand HTTP.

Example:

```
Client

↓

TCP Connection

↓

L4 Load Balancer

↓

Backend Server
```

The Load Balancer forwards packets without reading URLs or headers.

---

## Advantages

✅ Extremely fast

✅ Low latency

✅ Works with any TCP/UDP protocol

✅ Lower CPU usage

---

## Disadvantages

❌ Cannot inspect HTTP requests

❌ Cannot route by URL

❌ Cannot route using headers or cookies

---

## Examples

- AWS Network Load Balancer (NLB)
- Linux LVS
- HAProxy (TCP Mode)

---

# Layer 7 (L7) Load Balancer

Layer 7 understands HTTP.

It can inspect:

- URL Path
- Headers
- Cookies
- HTTP Method
- Host Name

Example:

```
GET /api/users
```

↓

```
API Server
```

```
GET /images/logo.png
```

↓

```
Image Server
```

---

## Diagram

```
Client
   │
   ▼
L7 Load Balancer
   │
 ┌─┴──────────────┐
 ▼                ▼
API          Static Files
```

The Load Balancer reads the request before forwarding it.

---

## Advantages

✅ Smart Routing

✅ TLS/SSL Termination

✅ Header-Based Routing

✅ Cookie-Based Routing

✅ Canary Deployments

✅ Blue-Green Deployments

---

## Disadvantages

❌ Higher CPU usage

❌ Slightly higher latency

---

## Examples

- AWS Application Load Balancer (ALB)
- Nginx
- Envoy
- HAProxy (HTTP Mode)
- Traefik

---

# L4 vs L7 Comparison

| Feature | Layer 4 | Layer 7 |
|----------|----------|----------|
| Understands HTTP | ❌ | ✅ |
| TCP/UDP Support | ✅ | Limited |
| URL Routing | ❌ | ✅ |
| Header Routing | ❌ | ✅ |
| Cookie Routing | ❌ | ✅ |
| Speed | Faster | Slightly Slower |
| Typical Use | Gaming, Databases | Web APIs, Websites |

---

# Load Balancing Algorithms

A Load Balancer needs a strategy to choose the next server.

---

# 1. Round Robin

Requests are distributed one after another.

```
Request 1 → Server A

Request 2 → Server B

Request 3 → Server C

Request 4 → Server A
```

Best for:

- Equal-sized servers
- Stateless applications

---

## Advantages

✅ Simple

✅ Fair distribution

---

## Disadvantages

❌ Ignores server load

---

# 2. Weighted Round Robin

Some servers receive more traffic.

```
Server A

Weight = 4

Server B

Weight = 2

Server C

Weight = 1
```

Server A receives more requests because it has more capacity.

---

# 3. Least Connections

The next request goes to the server with the fewest active connections.

```
Server A

90 Connections

Server B

18 Connections

Server C

44 Connections

↓

Next Request

↓

Server B
```

Useful when requests take different amounts of time.

---

# 4. Consistent Hashing

Instead of choosing randomly, requests are assigned using a hash.

Example:

```
User 101

↓

Server A
```

```
User 102

↓

Server C
```

The same user always reaches the same server.

---

## Common Uses

- Redis
- Memcached
- User Sessions
- Distributed Cache
- Database Sharding

---

## Advantages

✅ Cache locality

✅ Minimal data movement when servers are added or removed

---

## Disadvantages

❌ More complex

❌ Requires careful implementation

---

# 5. Random / Power of Two Choices

Choose two random servers.

Send the request to the less busy one.

```
Random

↓

Server A

Server C

↓

Choose Lower Load
```

Popular in large cloud systems because it provides good balancing with little overhead.

---

# Health Checks

A Load Balancer continuously checks whether backend servers are healthy.

```
Server

↓

Health Check

↓

Healthy?

↓

Yes → Receive Traffic

No → Remove
```

---

# Types of Health Checks

## Active Health Check

The Load Balancer periodically calls:

```
GET /health
```

If multiple checks fail, the server is removed from rotation.

---

## Passive Health Check

The Load Balancer monitors real traffic.

If a server returns many:

- HTTP 500
- Timeouts
- Connection failures

It is temporarily removed.

---

# Readiness vs Liveness

These two health checks serve different purposes.

### Liveness Check

```
Is the application running?
```

If not, restart it.

---

### Readiness Check

```
Can the application serve requests?
```

For example:

- Database connected
- Cache initialized
- Startup complete

Only **ready** servers should receive traffic.

---

# Sticky Sessions (Session Affinity)

Normally:

```
Request 1

↓

Server A
```

```
Request 2

↓

Server B
```

But if user sessions are stored in memory:

```
User Login

↓

Server A
```

The next request reaches:

```
Server B

↓

Session Missing
```

The user appears logged out.

---

## Sticky Session Solution

Always send the same user to the same server.

```
User A

↓

Server 2

↓

Every Request

↓

Server 2
```

---

## Better Solution

Instead of relying on Sticky Sessions, store session data in:

- Redis
- Database
- JWT Token

Now every server can process every request.

This creates a **stateless architecture**, which is easier to scale.

---

# Types of Load Balancers

## Hardware Load Balancer

Examples:

- F5 BIG-IP
- Citrix ADC

Advantages:

- Very high performance

Disadvantages:

- Expensive
- Difficult to scale

---

## Software Load Balancer

Examples:

- Nginx
- HAProxy
- Envoy
- Traefik

Advantages:

- Flexible
- Cost-effective
- Widely used

---

## Cloud Managed Load Balancer

Examples:

- AWS ALB
- AWS NLB
- Google Cloud Load Balancer
- Azure Application Gateway

Advantages:

- Fully managed
- Automatic scaling
- Multi-region support
- Built-in monitoring

---

# Real-World Architecture

```
             Internet
                  │
                  ▼
        Cloud Load Balancer
                  │
        ┌─────────┴─────────┐
        ▼         ▼         ▼
      API 1     API 2     API 3
                  │
                  ▼
             Redis / Database
```

This architecture provides:

- High Availability
- Horizontal Scaling
- Fault Tolerance

---

# Best Practices

✅ Keep application servers stateless

✅ Store sessions in Redis or use JWT

✅ Enable health checks

✅ Monitor server latency

✅ Use HTTPS/TLS

✅ Configure automatic failover

---

# Common Mistakes

❌ Using Sticky Sessions for everything

❌ No health checks

❌ One Load Balancer without redundancy

❌ Ignoring slow servers

❌ Using Round Robin for long-running requests

---

# Real-World Examples

### Netflix

Uses Envoy and cloud load balancing to route traffic across thousands of microservices.

---

### AWS

Provides:

- ALB (Layer 7)
- NLB (Layer 4)

---

### Kubernetes

Uses Services and Ingress Controllers (such as Nginx or Traefik) to distribute traffic across Pods.

---

# Interview Questions

## Why do we need a Load Balancer?

To distribute requests across multiple servers, improve performance, and provide high availability.

---

## What's the difference between Layer 4 and Layer 7?

| Layer 4 | Layer 7 |
|----------|----------|
| Uses TCP/UDP | Understands HTTP |
| Faster | Smarter |
| No URL routing | Supports URL, Header, Cookie routing |

---

## When should you use Consistent Hashing?

When requests should consistently reach the same backend, such as for caching, session affinity, or sharded databases.

---

## Why are Sticky Sessions discouraged?

Because they tightly couple users to individual servers, making scaling and deployments harder.

A stateless architecture with shared session storage is usually a better long-term solution.

---

## How does a Load Balancer know a server has failed?

By performing active health checks or observing failed requests through passive health checks.

---

## How do you avoid the Load Balancer becoming a single point of failure?

Deploy multiple Load Balancers behind a virtual IP, DNS, or use a managed cloud Load Balancer that provides built-in redundancy.

---

# Key Takeaways

- A Load Balancer distributes requests across multiple servers.
- Layer 4 works at the transport level and is optimized for speed.
- Layer 7 understands HTTP and enables intelligent routing.
- Health checks automatically remove unhealthy servers.
- Consistent Hashing is ideal for caches and stateful workloads.
- Stateless applications are easier to scale than applications relying on Sticky Sessions.
- Load Balancing is a core building block of modern distributed systems.

---

## Related topics

- [Reverse Proxy & API Gateway](reverse-proxy-api-gateway.md)
- [Horizontal vs Vertical Scaling](horizontal-vs-vertical-scaling.md)
- [Rate Limiting](rate-limiting.md)
- [High Availability](../08-reliability-operations/high-availability.md)
- [CDN Architecture](../04-caching/cdn-architecture.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
