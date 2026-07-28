# Load Balancing

> ## TL;DR
>
> Load Balancing distributes incoming requests across multiple servers so that no single server becomes overloaded.
>
> **Goals**
>
> - Improve availability
> - Increase scalability
> - Prevent server overload
> - Handle failures automatically

---

# Why do we need Load Balancing?

Imagine your website has only one server.

```
          Users
             │
             ▼
        Web Server
```

Everything works...

Until:

- Traffic suddenly increases
- CPU reaches 100%
- Memory fills up
- Users start getting errors

Now imagine adding more servers.

```
          Users
             │
             ▼
      Load Balancer
       /    |     \
      ▼     ▼      ▼
  Server1 Server2 Server3
```

Now requests are shared among all servers.

Instead of one server doing all the work, every server handles part of the traffic.

---

# Benefits

✅ Better performance

✅ High availability

✅ Easy horizontal scaling

✅ Automatic failover

✅ Better resource utilization

---

# How Load Balancing Works

1. Client sends a request.
2. Request reaches the Load Balancer.
3. Load Balancer chooses the best server.
4. Server processes the request.
5. Response goes back to the client.

```
Client
   │
   ▼
Load Balancer
   │
   ├────────► Server A
   ├────────► Server B
   └────────► Server C
```

---

# Layer 4 vs Layer 7

## Layer 4 (Transport Layer)

Works using:

- IP Address
- TCP
- UDP
- Ports

It **does NOT understand HTTP**.

```
Client
   │ TCP
   ▼
L4 Load Balancer
   │
   ▼
Backend
```

### Advantages

- Extremely fast
- Very low latency
- Supports any TCP/UDP protocol

### Disadvantages

- Cannot route by URL
- Cannot inspect HTTP headers
- Cannot terminate TLS intelligently

---

## Layer 7 (Application Layer)

L7 understands HTTP.

It can inspect:

- URL
- Headers
- Cookies
- Host
- HTTP Method

Example:

```
/api/*       → API Service

/images/*    → Image Service

/admin/*     → Admin Service
```

```
Client
    │
    ▼
L7 Load Balancer
    │
 ┌──┴────────────┐
 ▼               ▼
API          Static Files
```

### Advantages

- Smart routing
- TLS termination
- Canary deployment
- Blue-Green deployment
- Authentication support

### Disadvantages

- More CPU usage
- Slightly slower than L4

---

# Load Balancing Algorithms

## Round Robin

Requests are distributed one after another.

```
1 → Server A

2 → Server B

3 → Server C

4 → Server A
```

Best for:

- Stateless applications
- Equal-size servers

---

## Weighted Round Robin

Some servers receive more traffic.

```
Server A (Weight 4)

Server B (Weight 2)

Server C (Weight 1)
```

Useful when servers have different hardware.

---

## Least Connections

The request goes to the server with the fewest active connections.

```
A : 90 users

B : 12 users

C : 35 users

Next request → B
```

Best when request duration varies.

---

## Consistent Hashing

Same user always goes to the same server.

```
User 101 → Server A

User 102 → Server C

User 101 → Server A
```

Useful for:

- Cache servers
- Session affinity
- Distributed databases

---

## Random / Power of Two Choices

Choose two random servers.

Send request to the less busy one.

Very popular in cloud-scale systems.

---

# Health Checks

A load balancer continuously checks whether servers are healthy.

Healthy:

```
✓ Accept traffic
```

Unhealthy:

```
✗ Remove from rotation
```

Once healthy again:

```
✓ Add back automatically
```

---

# Active vs Passive Health Checks

## Active

Load Balancer periodically calls

```
GET /health
```

If the server fails multiple times,

it is removed.

---

## Passive

The Load Balancer watches real user traffic.

Too many:

- 500 errors
- Timeouts

Server is automatically removed.

---

# Sticky Sessions

Sometimes user data is stored in server memory.

```
User A

↓

Server 2

↓

Every request

↓

Server 2
```

Advantages

- Simple
- No shared session storage

Problems

- Harder scaling
- Harder deployments
- Single-server dependency

Better approach:

Store sessions in Redis or use JWT.

---

# Hardware vs Software vs Cloud

## Hardware

Examples

- F5 BIG-IP
- Citrix ADC

Pros

- Very fast

Cons

- Expensive

---

## Software

Examples

- Nginx
- HAProxy
- Envoy

Most companies use these.

---

## Cloud Managed

Examples

AWS

- ALB
- NLB

Google Cloud Load Balancer

Azure Application Gateway

These automatically scale.

---

# Common Use Cases

- Web applications
- APIs
- Microservices
- Kubernetes
- CDN
- Game servers
- Video streaming

---

# Interview Questions

### Why use a Load Balancer?

To distribute traffic and improve availability.

---

### Difference between ALB and NLB?

| ALB | NLB |
|------|------|
| Layer 7 | Layer 4 |
| HTTP aware | TCP/UDP |
| Path routing | Faster |
| Cookies | Static IP |

---

### Why is sticky session discouraged?

Because it makes scaling and deployments more difficult.

Stateless services are preferred.

---

### When should you use Consistent Hashing?

When the same user or cache key should always go to the same server.

Examples:

- Redis
- Memcached
- Session routing

---

# Best Practices

✅ Keep services stateless

✅ Enable health checks

✅ Use autoscaling

✅ Monitor latency

✅ Use HTTPS

✅ Enable logging

---

# Common Mistakes

❌ Using sticky sessions everywhere

❌ No health checks

❌ One load balancer only

❌ Ignoring slow servers

❌ Using Round Robin for long-running requests

---

# Key Takeaways

- Load Balancers improve reliability and scalability.
- L4 is fast but protocol-aware only.
- L7 is smarter and ideal for web applications.
- Health checks keep bad servers out of rotation.
- Stateless services work best with load balancing.

---

 

## Related topics
- [Retry & Exponential Backoff](retry-exponential-backoff.md)
- [Backpressure](backpressure.md)
- [Reverse Proxy & API Gateway](reverse-proxy-api-gateway.md)
- [High Availability](../08-reliability-operations/high-availability.md)
- [Fault Tolerance](../08-reliability-operations/fault-tolerance.md)
