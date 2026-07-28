````markdown
# Horizontal vs Vertical Scaling

> Scaling means increasing your application's capacity to handle more users or more traffic.
>
> There are two main approaches:
>
> - **Vertical Scaling (Scale Up)** → Make one server more powerful.
> - **Horizontal Scaling (Scale Out)** → Add more servers.
>
> Modern cloud applications generally prefer **Horizontal Scaling** because it offers better scalability, high availability, and fault tolerance.

---

# Why Do We Need Scaling?

Imagine your application is running on a single server.

```
          Users
             │
             ▼
        Web Server
```

Everything works...

Until traffic suddenly increases.

The server becomes overloaded:

- CPU reaches 100%
- Memory runs out
- Requests become slow
- Users receive errors

To solve this problem, we need to **scale**.

---

# Two Types of Scaling

```
                 Scaling
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
 Vertical Scaling      Horizontal Scaling
 (Scale Up)             (Scale Out)
```

---

# Vertical Scaling (Scale Up)

Vertical scaling means upgrading a single server with better hardware.

For example:

```
Before

4 CPU
16 GB RAM

↓

After

32 CPU
128 GB RAM
```

Your application still runs on **one machine**.

Only the machine becomes more powerful.

---

## Diagram

```
          Users
             │
             ▼
      Bigger Server

   32 CPU
   128 GB RAM
```

---

## Advantages

✅ Easy to implement

✅ No application changes

✅ No load balancer required

✅ Works well for legacy applications

---

## Disadvantages

❌ Very expensive

❌ Hardware has limits

❌ Single point of failure

❌ Usually requires downtime during upgrades

---

# Horizontal Scaling (Scale Out)

Instead of buying a larger server, you add more servers.

```
           Users
              │
              ▼
        Load Balancer
       /      |      \
      ▼       ▼       ▼
   Server1 Server2 Server3
```

Traffic is distributed across multiple servers.

---

## Advantages

✅ Better scalability

✅ High availability

✅ Fault tolerance

✅ Easy auto scaling

✅ Lower cost at large scale

---

## Disadvantages

❌ More complex architecture

❌ Requires a load balancer

❌ Distributed systems are harder to manage

❌ Data consistency becomes more challenging

---

# Vertical vs Horizontal

| Feature | Vertical Scaling | Horizontal Scaling |
|----------|------------------|--------------------|
| Add More | CPU / RAM | Servers |
| Downtime | Usually Yes | Usually No |
| Cost | Expensive | More economical at scale |
| Fault Tolerance | Poor | Excellent |
| Maximum Capacity | Limited | Nearly Unlimited |
| Complexity | Simple | More Complex |

---

# Why Stateless Applications Matter

Horizontal scaling only works well when **any server can handle any request**.

Imagine three servers.

```
        Load Balancer
        /     |     \
       ▼      ▼      ▼
      A       B      C
```

If a user logs in on Server A...

...their next request might go to Server C.

If session data exists only on Server A:

```
Server A

Session = Logged In
```

Server C has no idea who the user is.

The user suddenly appears logged out.

---

## Better Approach

Store session data outside the application.

Examples:

- Redis
- Database
- JWT Authentication

Now every server can process every request.

```
        Load Balancer
        /     |     \
       ▼      ▼      ▼
      A       B      C
        \      |     /
          Redis / DB
```

This is called a **stateless architecture**.

---

# Cost Comparison

Vertical scaling becomes increasingly expensive.

```
Capacity

|

|                 Vertical
|                /
|               /
|              /
|             /
|------------/----------------

|

|---------------------------- Horizontal
```

Why?

Large enterprise servers cost significantly more than several smaller servers with similar combined capacity.

---

# Scaling Limits

## Vertical Scaling

Eventually you reach the largest machine available.

Example:

```
Cloud Provider

Largest VM

↓

Cannot Upgrade Further
```

At this point, scaling stops.

---

## Horizontal Scaling

You simply keep adding servers.

```
10 Servers

↓

20 Servers

↓

50 Servers

↓

100 Servers
```

The practical limit is your application's architecture, not the hardware.

---

# When Should You Use Vertical Scaling?

Choose Vertical Scaling when:

- You're building an MVP.
- Traffic is low.
- You need a quick solution.
- Your application isn't designed for distributed systems.
- The workload is difficult to parallelize.

Example:

A small company running a single PostgreSQL server.

---

# When Should You Use Horizontal Scaling?

Choose Horizontal Scaling when:

- Millions of users are expected.
- High availability is required.
- Auto scaling is important.
- Downtime is unacceptable.
- You're building cloud-native applications.

Examples:

- Netflix
- Amazon
- Facebook
- Google

---

# Real-World Architecture

Most production systems use **both** approaches.

```
               Internet
                    │
                    ▼
            Load Balancer
         /       |       \
        ▼        ▼        ▼
      API      API      API
         \       |       /
          ───────────────
               Database
```

Typically:

- Web servers scale **horizontally**.
- Databases often scale **vertically** first.
- Later, databases may use **read replicas** or **sharding** for further growth.

---

# Common Examples

## Vertical Scaling

- Upgrade PostgreSQL from 4 CPU to 32 CPU.
- Increase RAM from 16 GB to 128 GB.

---

## Horizontal Scaling

- Add five more API servers.
- Increase Kubernetes replicas.
- Add more application instances behind a load balancer.

---

# Best Practices

✅ Design stateless applications

✅ Store sessions in Redis or use JWT

✅ Keep uploaded files in object storage

✅ Use load balancers

✅ Enable auto scaling

✅ Monitor CPU, memory, and response time

---

# Common Mistakes

❌ Keeping session data in server memory

❌ Storing uploaded files on local disk

❌ Assuming bigger servers solve every problem

❌ Ignoring database bottlenecks

❌ Scaling before measuring performance

---

# Interview Questions

## Which scaling approach is easier?

Vertical Scaling.

Simply upgrade the server.

---

## Which scaling approach is more future-proof?

Horizontal Scaling.

It supports much larger growth and higher availability.

---

## Why is horizontal scaling harder?

Because applications must be stateless and data often needs to be shared across multiple servers.

---

## Why do cloud providers recommend horizontal scaling?

Because it supports:

- High Availability
- Fault Tolerance
- Auto Scaling
- Elastic Infrastructure

---

## Can databases scale horizontally?

Yes.

Common techniques include:

- Read Replicas
- Database Sharding
- Distributed Databases (Cassandra, DynamoDB, CockroachDB)

---

# Key Takeaways

- **Vertical Scaling** = Make one server bigger.
- **Horizontal Scaling** = Add more servers.
- Vertical scaling is simple but has physical limits.
- Horizontal scaling is more complex but offers better scalability and reliability.
- Modern cloud applications are designed to scale horizontally using stateless services and load balancers.

---
 

## Related topics

- [Load Balancing](load-balancing.md)
- [Database Replication](../02-data-storage/database-replication.md)
- [Database Sharding](../02-data-storage/database-sharding.md)
- [High Availability](../08-reliability-operations/high-availability.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
