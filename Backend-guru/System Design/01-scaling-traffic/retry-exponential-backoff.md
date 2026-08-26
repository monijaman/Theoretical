# Retry & Exponential Backoff

> **Retry** means trying a failed request again.
>
> **Exponential Backoff** waits a little longer before each retry.
>
> **Jitter** adds randomness to retry timing so thousands of clients don't retry at exactly the same moment.
>
> Together they make distributed systems much more reliable.

---

# Why Do We Need Retries?

Networks are not perfect.

Sometimes a request fails because:

- Temporary network issues
- Server overload
- Database restart
- Service deployment
- Timeout
- Brief hardware failure

Example:

```
Client

↓

Payment Service

❌ Timeout
```

Retrying a few moments later may succeed.

---

# The Problem with Immediate Retries

Imagine 1,000 clients call the same service.

Everything works until the service experiences a brief slowdown.

```
        1000 Clients
             │
             ▼
       Payment Service
             ❌
```

Every request times out.

Now every client retries **immediately**.

```
1000 Clients

↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓

Payment Service
```

Instead of recovering...

The service receives another massive traffic spike.

It becomes even slower.

Clients retry again.

Another traffic spike occurs.

This creates a **Retry Storm**.

---

# Retry Storm (Thundering Herd)

```
Time

0s

↓

Service becomes slow

↓

1000 requests fail

↓

1000 retries

↓

Service slows again

↓

1000 more retries

↓

Service never recovers
```

This is called the **Thundering Herd Problem**.

The retries themselves become the cause of the outage.

---

# Exponential Backoff

Instead of retrying immediately...

Wait longer after every failure.

Example:

```
Attempt 1

Wait 200 ms
```

↓

```
Attempt 2

Wait 400 ms
```

↓

```
Attempt 3

Wait 800 ms
```

↓

```
Attempt 4

Wait 1.6 seconds
```

↓

```
Attempt 5

Wait 3.2 seconds
```

Instead of hammering the server, clients gradually slow down.

---

# Backoff Formula

```
Delay = Base × 2^Attempt
```

Example:

Base delay:

```
100 ms
```

| Retry | Delay |
|--------|-------|
| 1 | 200 ms |
| 2 | 400 ms |
| 3 | 800 ms |
| 4 | 1.6 s |
| 5 | 3.2 s |
| 6 | 6.4 s |

Usually a maximum delay is applied.

Example:

```
Maximum = 20 seconds
```

The delay never grows beyond that.

---

# Why Exponential Backoff Helps

Without Backoff:

```
Retry

Retry

Retry

Retry

Retry
```

Constant pressure on the server.

With Backoff:

```
Retry

↓

Wait

↓

Retry

↓↓

Wait Longer

↓↓↓

Retry
```

The server gets time to recover.

---

# But Backoff Alone Isn't Enough

Imagine every client uses the same delay.

```
1000 Clients

↓

Wait 1.6 Seconds

↓

Retry Together
```

They still retry at the exact same moment.

The traffic spike simply happens later.

---

# Jitter

Jitter adds randomness to retry delays.

Instead of:

```
1.6 s

1.6 s

1.6 s

1.6 s
```

Clients wait:

```
0.9 s

1.4 s

1.8 s

1.1 s

0.6 s
```

Now retries are spread across time.

The server receives a smooth stream of requests instead of one huge spike.

---

# Types of Jitter

## No Jitter

```
Client A → 2 s

Client B → 2 s

Client C → 2 s
```

Everyone retries together.

---

## Equal Jitter

Clients always wait at least half of the calculated delay.

```
2 seconds

↓

1 second

+

Random 0–1 second
```

Better than no jitter.

---

## Full Jitter ⭐ Recommended

Choose a completely random delay.

```
Random

0–2 seconds
```

Example:

```
Client A

0.5 s

Client B

1.8 s

Client C

0.2 s
```

This produces the smoothest traffic.

AWS recommends **Full Jitter** for most systems.

---

# Idempotency

Retries are only safe if performing the same operation multiple times produces the same result.

Example:

```
GET /users
```

Safe to retry.

Running it multiple times does not change data.

---

## Dangerous Example

```
POST /payments
```

Suppose:

- Payment succeeds.
- Network times out.
- Client retries.

Without protection:

```
Customer Charged Twice
```

---

# Idempotency Key

Modern payment APIs solve this problem using an **Idempotency Key**.

```
POST /payments

Idempotency-Key:

123ABC456
```

Server stores the key.

If the same request arrives again:

```
Already Processed

↓

Return Previous Response
```

No duplicate payment occurs.

Stripe uses this approach.

---

# Retry Budget

Unlimited retries are dangerous.

Example:

```
1000 Requests

↓

500 Fail

↓

500 Retry

↓

250 Fail

↓

250 Retry

↓

...
```

Traffic continues increasing.

A Retry Budget limits how many retries are allowed.

Example:

```
Maximum Retry Traffic

10%
```

If retries exceed 10% of normal traffic:

```
Stop Retrying

Return Error
```

This protects downstream services.

---

# When Should You Retry?

✅ Timeouts

✅ Temporary network failures

✅ HTTP 500

✅ HTTP 502

✅ HTTP 503

✅ HTTP 504

✅ HTTP 429 (after waiting)

---

# When Should You NOT Retry?

❌ HTTP 400

Bad Request

---

❌ HTTP 401

Unauthorized

---

❌ HTTP 403

Forbidden

---

❌ HTTP 404

Resource Not Found

---

❌ Invalid Input

The request itself is wrong.

Retrying will produce the same failure.

---

❌ POST without Idempotency Key

Retrying may perform the action twice.

---

❌ Circuit Breaker Open

The service is already known to be unhealthy.

Do not keep retrying.

---

# Retry + Circuit Breaker

```
Client
   │
   ▼
Circuit Breaker
   │
   ▼
Retry Logic
   │
   ▼
Service
```

The Circuit Breaker decides whether requests should be attempted.

Retry Logic handles temporary failures.

These patterns complement each other.

---

# Retry + Rate Limiting

Suppose a server returns:

```
429

Too Many Requests
```

The response includes:

```
Retry-After

30 Seconds
```

Clients should wait for the specified time.

Ignoring the header only increases server load.

---

# Best Practices

✅ Retry only temporary failures

✅ Use Exponential Backoff

✅ Add Full Jitter

✅ Limit retry attempts

✅ Respect Retry-After

✅ Use Idempotency Keys for POST requests

✅ Combine with Circuit Breakers

---

# Common Mistakes

❌ Infinite retries

❌ Immediate retries

❌ No randomness

❌ Retrying HTTP 400 errors

❌ Retrying non-idempotent operations

❌ Ignoring Retry-After

---

# Real-World Examples

### AWS

Uses Exponential Backoff with Full Jitter.

---

### Stripe

Uses Idempotency Keys for payment retries.

---

### Google Cloud

Recommends exponential retry policies for transient failures.

---

### Kubernetes

Many controllers use exponential backoff when reconciling resources.

---

# Interview Questions

## Why not retry immediately?

Immediate retries can overload an already struggling service and create a Retry Storm.

---

## Why is Exponential Backoff better than a fixed delay?

It gradually reduces pressure on the server by increasing the wait time after each failure.

---

## Why is Jitter important?

Without Jitter, thousands of clients retry at the same time, causing another traffic spike.

---

## Which Jitter algorithm is recommended?

**Full Jitter**.

It distributes retries more evenly and reduces server load.

---

## Why are Idempotency Keys important?

They prevent duplicate operations, such as charging a customer twice when retrying a payment request.

---

## Should you retry HTTP 404?

No.

The resource doesn't exist, so retrying the same request won't help.

---

# Key Takeaways

- Retry handles temporary failures.
- Exponential Backoff increases the delay after each retry.
- Full Jitter spreads retries randomly to avoid synchronized traffic spikes.
- Only retry transient errors such as timeouts and 5xx responses.
- Use Idempotency Keys for write operations like payments.
- Combine retries with Circuit Breakers and Rate Limiting for resilient distributed systems.

---


## Related topics
- [Circuit Breaker Pattern](circuit-breaker-pattern.md)
- [Backpressure](backpressure.md)
- [Rate Limiting](rate-limiting.md)
- [Message Queues](../05-messaging-event-driven/message-queues.md)
- [Distributed Locks](../03-consistency-distributed/distributed-locks.md)
