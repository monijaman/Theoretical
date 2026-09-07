# Distributed Systems Concepts

Understand what changes when an operation depends on several machines. Use the examples to reason about delays, duplicates, conflicting updates, and partial failures.

## Start Here

**Before you begin:** HTTP APIs, database transactions, and basic message queues.

Read the explanation before each code example, then follow the data through the normal path and one failure case. The snippets teach individual concepts; application helpers, package setup, credentials, and deployment configuration are not all included.

## Contents

- [Quick Start: Real-World Analogies](#quick-start-real-world-analogies)
- [Core Concepts Deep Dive](#core-concepts-deep-dive)
- [Real-World Failure Scenarios & Solutions](#real-world-failure-scenarios--solutions)
- [Interview Questions & Answers](#interview-questions--answers)
- [Study Materials](#study-materials)
- [Practice Check](#practice-check)

## Key Terms

| Term | Meaning |
| --- | --- |
| Partition | a network failure that prevents some nodes from communicating. |
| Consistency model | rules for which writes a read may observe. |
| Quorum | the number of participants required for a decision or operation. |
| Backpressure | slowing incoming work when a downstream component cannot keep up. |


## Quick Start: Real-World Analogies

Understand distributed systems concepts with these foundational analogies:

- **CAP Theorem:** Like a post office serving two cities. When a bridge washes out (network partition), the post office must choose: deliver mail fast using old information (Available, inconsistent) OR wait and verify all data (Consistent, slower). Can't have both during failure. (You can't have Consistency + Availability + Partition tolerance simultaneously)

- **Eventual Consistency:** Like rumors spreading through a town. Everyone eventually hears the news, but not at the exact same time. By next morning, everyone knows the same thing (consistent). During spreading phase, some people have old information. (Data sync happens slowly, temporary inconsistency is acceptable)

- **Consensus (Raft):** Like a jury deciding a verdict. Must agree through voting rounds. If one juror disconnects, remaining 11 can decide (fault-tolerant). If everyone can't agree, they wait and revote. (Distributed agreement with fault tolerance)

- **Idempotency:** Like a “set the light to on” command. Repeating it leaves the light on; a toggle command would behave differently. Safe to retry without side effects. (Repeat operations always produce same result)

- **Backpressure:** Like a water hose. If output is blocked, water backs up. If you keep pressing the trigger, it explodes. Smart systems close the input valve when output backs up. (Prevent overwhelming downstream systems)

- **Circuit Breaker:** Like an electrical breaker. When current surges (service down), breaker trips and stops flow. Prevents cascade failure. After cooling down, tries again. (Fail fast when service is down, auto-recover when healthy)

---

## Core Concepts Deep Dive

A remote operation can succeed even when its caller sees a timeout. Keep that uncertainty in mind as you study consistency, retries, and coordination.

### 1. **CAP Theorem** - The fundamental impossibility

**What it means:** During a network partition, a distributed read/write system cannot guarantee both linearizable consistency and availability for every request. See the [Gilbert–Lynch CAP paper](https://www.cs.princeton.edu/courses/archive/spr22/cos418/papers/cap.pdf).

| Term | Meaning in this discussion |
| --- | --- |
| Consistency | Operations behave as if acting on one copy, respecting the order of completed operations. |
| Availability | Every request to a non-failing node eventually completes. |
| Partition | Some nodes cannot exchange messages because of a network failure. |

Imagine two regions that cannot communicate. A write completes in one region, then a read arrives in the other. That read cannot both guarantee the latest value and always complete without communicating with the first region.

| Choice during the partition | What users may experience |
| --- | --- |
| Preserve consistency | Some operations wait or fail when the required coordination is unavailable. |
| Preserve availability | Operations continue, but replicas may disagree and need reconciliation. |

Describe the behavior of a particular operation and configuration. A database brand, SQL support, or a single datacenter does not by itself determine the answer; partitions can also happen within one datacenter.

### 2. **Consistency Models** - Degrees of "sameness"

**What it is:** How soon you're guaranteed to see the latest data after a write.

#### **Strong Consistency (Linearizability)**

```text
User writes: "balance = $1000"
     ↓
Everyone reading gets $1000 immediately
No reading old value ($900)

Cost: Slower (must coordinate with all nodes)
Example: PostgreSQL ACID transactions, etcd

Code example:
db.beginTransaction()
db.write('balance', 1000)  // All readers see 1000
db.commit()

next_read = db.read('balance')  // Guaranteed: 1000
```

#### **Eventual Consistency**

```text
User writes: "balance = $1000"
     ↓
Some readers see new value ($1000)
Some readers see old value ($900) for a few seconds
     ↓
If updates stop and replication progresses, replicas eventually converge; no fixed time is implied.

Cost: Faster (no coordination needed)
Example: DynamoDB, Cassandra, Redis

Code example - with versioning:
db.write('balance', 1000, version=5)
time.sleep(0.1)  // Small delay
next_read = db.read('balance')  // Might be 900 or 1000

// Handle both cases:
if last_read_version < 5:
  refresh_data()
```

#### **Causal Consistency**

```text
Alice: "Let's meet at 5pm" → Message sent
Bob: "Can't, meeting at 5pm" → Message sent (caused by Alice's message)

Guarantee: Bob's message never arrives before Alice's
(Respects causality)

Example: Comments on social media
User1: Posts photo
User2: Sees photo, comments "nice!"
Guarantee: We never see User2's comment without photo

Code example:
publish('photo', {id: 1, user: 'alice'}, version=10)
publish('comment', {id: 11, replyTo: 1}, version=11)

Readers ALWAYS see photo (v10) before comment (v11)
(Causal consistency enforced by version numbers)
```

#### **Weak Consistency**

```text
User writes: "color = blue"
     ↓
Other users might see old value for HOURS
No guarantees when they'll see new value

Example: DNS (changes take hours to propagate)

Code example:
db.write_eventually('setting', 'blue')
// Might see old value for undefined time

time.sleep(3600)  // Wait 1 hour
setting = db.read('setting')  // Now probably 'blue'
```

**When to use each:**

| Model | Latency | Consistency Window | Use Case |
|-------|---------|-------------------|----------|
| Strong | Slow (10-100ms) | Immediate | Banking, inventory |
| Eventual | Fast (1-2ms) | Seconds | Social media, caches |
| Causal | Medium (5-20ms) | Depends on causality chain | Comments, threads |
| Weak | Very Fast (<1ms) | Hours | DNS, CDN |

### 3. **Idempotency & Deduplication** - Make retries safe

Deduplication detects an operation seen before. Idempotency preserves the intended result when it runs again. A check followed by a separate write can race with another worker; atomic state changes or operation-level guarantees are needed.

**What it is:** Operation can be executed multiple times with same result.

**Real-world problem:**

```text
User clicks "Transfer $100" → Request sent to bank
     ↓
Network timeout (user doesn't know if succeeded)
     ↓
User tries again (nervous) → Second request sent

Bank without idempotency:
├─ First request: $100 transferred (success)
├─ Second request: $100 transferred AGAIN (total: $200!)
└─ User sees double charge

Bank with idempotency:
├─ First request: $100 transferred, store idempotency_key=abc123
├─ Second request (same key): Return cached result ($100 transferred once)
└─ Total transferred: $100 (correct!)
```

**Implementing idempotency:**

```typescript
// Idempotency key: UUID + operation
// Same key = same result (even if called 100x)

// ❌ WITHOUT idempotency
app.post('/transfer', async (req, res) => {
  const { from, to, amount } = req.body;

  // Problem: No protection against duplicates
  const transfer = await db.transfer(from, to, amount);
  res.json(transfer);
});

// User retry → Double charge!

// ✅ WITH idempotency
app.post('/transfer', async (req, res) => {
  const { from, to, amount, idempotencyKey } = req.body;

  // Check if we already processed this idempotency key
  const cached = await db.getIdempotencyRecord(idempotencyKey);
  if (cached) {
    return res.json(cached.result);  // Return cached result
  }

  // Process transfer
  const transfer = await db.transfer(from, to, amount);

  // Cache the result with idempotency key
  await db.saveIdempotencyRecord(idempotencyKey, {
    status: 'success',
    result: transfer,
    timestamp: Date.now()
  });

  res.json(transfer);
});

// User retry with same idempotencyKey → Returns cached result instantly!
```

**Idempotency in message queues:**

```typescript
// Message: "Process order #123"
// Consumer 1 receives, processes, crashes before ACK
// Consumer 2 receives same message

// ❌ Without idempotency:
consume('order.created', async (message) => {
  const order = message.body;

  // Process without checking if already done
  await processPayment(order);  // Charges twice if reprocessed!
  await sendEmail(order);

  acknowledge(message);  // If crash before this = message reprocessed
});

// ✅ With idempotency:
consume('order.created', async (message) => {
  const order = message.body;
  const uniqueKey = `order_${order.id}_${message.id}`;

  // Check if already processed
  const existingExecution = await db.getProcessing(uniqueKey);
  if (existingExecution) {
    acknowledge(message);
    return;
  }

  // Mark as processing
  await db.startProcessing(uniqueKey);

  try {
    await processPayment(order);
    await sendEmail(order);

    // Mark as completed
    await db.finishProcessing(uniqueKey);
    acknowledge(message);

  } catch (error) {
    // Don't acknowledge = message reprocessed
    // But idempotency check prevents duplicate charge
    throw error;
  }
});

// Reprocessing is now safe - idempotency check prevents duplicates
```

### 4. **Circuit Breaker Pattern** - Fail gracefully

A circuit breaker stops repeated calls after enough failures, then allows a limited recovery attempt. It reduces pressure on a dependency; it does not repair that dependency.

**What it is:** When a service is down, stop sending requests. Prevents cascading failures.

**Without circuit breaker:**

```text
User Service calls Payment Service (down)
  ├─ Request times out (30 seconds)
  ├─ Retries 3 times (90 seconds total)
  ├─ All User threads blocked waiting
  ├─ User Service becomes unresponsive (stalled)
  ├─ All users hit same issue
  └─ Website appears down (even though root cause is Payment Service)

Result: 1 service down = entire system appears down (cascade failure)
```

**With circuit breaker:**

```text
Payment Service down (detected after 2 failures)
     ↓
Circuit breaker trips (OPEN state)
     ↓
User Service immediately returns error (no 30s timeout)
     ↓
User goes to checkout page, shows "Try again later"
     ↓
Website feels responsive (even though Payment down)
     ↓
After 30s retry window, Payment Service recovers
     ↓
Circuit breaker enters HALF-OPEN (test with 1 request)
     ↓
Request succeeds
     ↓
Circuit CLOSES (back to normal)

Result: Isolated failure, graceful degradation
```

**Implementation:**

```typescript
// Circuit Breaker States
class CircuitBreaker {
  state = 'CLOSED';  // Normal
  failureCount = 0;
  successCount = 0;
  failureThreshold = 5;  // Trips after 5 failures
  successThreshold = 2;  // Needs 2 successes in HALF-OPEN
  timeout = 30000;      // Retry after 30s
  lastFailureTime = null;

  async call(asyncFunction) {
    // OPEN state: Reject immediately
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';  // Try again
      } else {
        throw new Error('Circuit breaker OPEN');
      }
    }

    try {
      const result = await asyncFunction();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';  // Back to normal
      }
    }
  }

  onFailure() {
    this.lastFailureTime = Date.now();
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';  // Trip the breaker
    }
  }
}

// Usage:
const paymentBreaker = new CircuitBreaker();

app.post('/checkout', async (req, res) => {
  try {
    const result = await paymentBreaker.call(async () => {
      return await paymentService.charge(req.body);
    });
    res.json(result);
  } catch (error) {
    res.status(503).json({ error: 'Payment service unavailable, try again later' });
  }
});
```

### 5. **Backpressure & Flow Control** - Prevent overload

A queue absorbs short bursts but does not create processing capacity. When input stays above output, choose whether to slow producers, reject work, or increase capacity.

**What it is:** When a system can't keep up, slow the input instead of queuing infinitely.

**Problem without backpressure:**

```text
Producer: Generating 10K events/sec
Consumer: Processing 1K events/sec

After 1 minute: 540K queued events
After 10 minutes: 5.4M queued events
After 1 hour: 32.4M queued events
     ↓
Memory explodes → System crashes

Producer keeps sending (crashes too)
```

**With backpressure:**

```text
Consumer to Producer: "I can only handle 1K/sec"
     ↓
Producer slows to 1K/sec (or waits if buffer full)
     ↓
Queue stays small (<10K)
     ↓
System stable
```

**Implementation with queues:**

```typescript
// ❌ WITHOUT backpressure
consumer.subscribe('events', async (event) => {
  // No response signal = producer keeps sending
  // Queue grows infinitely
  await processEvent(event);  // Maybe takes 100ms
});

// Producer has no idea consumer is slow
producer.publish('events', hugeDataset);  // All published at once

// ❌ Without backpressure: Memory exhausted


// ✅ WITH backpressure
const maxQueueSize = 1000;

consumer.subscribe('events', async (event) => {
  await processEvent(event);

  // Send signal: "Ready for next" (backpressure signal)
  if (consumedCount % 100 === 0) {
    producer.sendReadySignal();
  }
});

// Producer respects backpressure
for (const event of hugeDataset) {
  if (!producer.canSend()) {
    // Consumer says "not ready", wait
    await producer.wait();
  }
  producer.publish('events', event);
}

// Result: Queue stays manageable, processing smooth
```

**Backpressure in Node.js streams:**

```typescript
// Streams already implement backpressure
readStream
  .pipe(transformStream)  // Auto-scales
  .pipe(writeStream);     // writeStream tells transformStream to slow down

// Behind scenes:
// - writeStream buffer fills
// - writeStream says "I'm full, stop sending"
// - transformStream pauses reading
// - readStream pauses
// - Memory stays constant

// Without streams (manual handling):
readStream.on('data', (chunk) => {
  if (!writeStream.write(chunk)) {
    // writeStream is full, pause reading
    readStream.pause();
  }
});

writeStream.on('drain', () => {
  // writeStream drained, resume
  readStream.resume();
});
```

### 6. **Consensus Algorithms: Raft** - Distributed agreement

Consensus lets participating nodes agree on a sequence of decisions under the algorithm’s failure assumptions. Follow leader election and replication separately; losing a majority can prevent progress.

**What it is:** Multiple servers agree on state changes, even if some fail.

**Real-world use:**

```text
3-node Raft cluster: Server A, B, C
Goal: All agree on "balance = $100"

Without consensus:
├─ Server A thinks $100
├─ Server B thinks $50 (missed update)
├─ Server C thinks $75 (different update)
└─ Inconsistency! (disaster)

With Raft consensus:
├─ Leader (Server A) proposes: "balance = $100"
├─ Followers (B, C) vote and replicate
├─ Majority agrees (2 out of 3)
├─ Committed after the required majority replication; lagging followers can catch up
└─ Even if one server dies, consensus holds
```

**Raft process:**

```text
Election Phase:
- Servers periodically heartbeat
- If leader dies (no heartbeat):
  - Servers start election
  - Vote for candidates
  - Candidate with majority votes becomes leader

Log Replication:
- New log entries go to leader first
- Leader sends to followers
- Followers acknowledge
- When majority acknowledges, entry is committed
- Committed entries can't be lost

Fault Tolerance:
- 3-node cluster: Can tolerate 1 failure
- 5-node cluster: Can tolerate 2 failures
- 2N+1 cluster: Can tolerate N failures
```

**Raft vs Paxos:**

| Aspect | Raft | Paxos |
|--------|------|-------|
| Complexity | Simple (easier to code) | Complex (hard to understand) |
| Latency | 1-2 round trips | 2-3 round trips |
| Liveness | Requires leader | Works without leader |
| Number of nodes | Odd (3+ typical) | Any number |
| Study focus | Leader election and replicated log | Agreement through proposals and quorums |

---

## Real-World Failure Scenarios & Solutions

### Scenario 1: Network Partition Between Datacenters

```text
Datacenters: US-East, US-West
Network connection breaks for 10 minutes

System: Distributed payment system (CAP: Chose CP)
├─ US-East: Blocks writes (can't guarantee consistency)
├─ US-West: Blocks writes
├─ Users get "Service unavailable" errors
├─ After 10 minutes: Network recovers
├─ System heals automatically

Trade-off: 10 minutes downtime vs permanent data corruption
Choose the behavior according to the operation’s correctness requirements.
```

### Scenario 2: Database Replication Lag

```text
Master (US-East): Processes write (balance = $1000)
     ↓ (network lag, 5 second delay)
Replica (US-West): Still has old data (balance = $900)

User checks balance from US-West: Sees $900 (incorrect)
     ↓ (5 seconds later)
Balance updates to $1000

Solution:
1. Route freshness-sensitive reads to the authoritative primary; a fixed delay does not prove replica freshness.
2. Accept temporary inconsistency (eventual consistency app)
3. Use read-after-write consistency (cloud databases offer this)

Code:
if freshness_required:
  db.read_from_master(query)  // Slow but consistent
else:
  db.read_from_replica(query)  // Fast but possibly stale
```

### Scenario 3: Self-Healing After Cascade Failure

```text
Original Problem:
- Service A timeout → Service B waits
- Service B timeout → Service C waits
- All services appear down

Solution with circuit breakers + backpressure:

Time 0-5s: Service A down
├─ Circuit breaker trips
├─ Service B immediately fails requests
├─ Services don't cascade
├─ System feels responsive (not overloaded)

Time 5-10s: Service A recovers
├─ Circuit breaker enters HALF_OPEN
├─ Test request succeeds
├─ Circuit breaker closes
├─ System heals automatically

Result: Self-healing, no manual intervention needed
```

---

## Interview Questions & Answers

### Q: "Explain the CAP theorem and give a real example"

Example answer:

```text
CAP theorem: During a partition, linearizable consistency and availability
for every request cannot both be guaranteed:
- Consistency: All nodes have same data
- Availability: System responds to requests
- Partition: System works if network splits

Real example - Facebook Like Button:
- Consistency: All users see same like count
- Availability: Button works even if network partition
- Partition: Data centers at +US and Europe might disconnect

Facebook chose AP (Availability + Partition):
- During partition: Both regions accept likes independently
- Risk: Like count might temporarily diverge (user sees 100, another sees 95)
- Recovery: Systems sync after partition heals

Alternative - Banking:
- Banks chose CP (Consistency + Partition)
- During partition: Block withdrawals until partition heals
- Reason: Can't risk double-spending (consistency critical)

Trade-off: Hours of downtime vs small inconsistency
Different systems have different priorities
```

### Q: "How do you prevent duplicate message processing in a queue?"

Example answer outline:

```text
Use idempotency keys: UUID + operation pair
Store which operations already completed
On retry: Skip if already completed

Code:
1. Receive message with ID
2. Check: "Is this operation already done?"
3. If yes: Return cached result
4. If no: Process and cache result
5. Send ACK

Result: Multiple deliveries = same outcome (safe)
```

### Q: "Design a highly available payment system for 100K transactions/min"

Example answer:

```text
1. Architecture:
   - Payment Service (processes charges)
   - Ledger Service (append-only transaction log)
   - Settlement Service (reconciles with bank)

2. Reliability:
   - Idempotency keys (no double charges)
   - Circuit breakers (bank down ≠ entire system down)
   - Consensus for critical writes (Raft for ledger)
   - Event sourcing (immutable audit trail)

3. Consistency:
   - Ledger: Strong consistency (ACID)
   - Balances: Eventual consistency (OK for displays)

4. Scale:
   - Database sharding by transaction ID
   - Caching for balance checks
   - Event stream for reconciliation
```

---

## Study Materials

### Must-read:

- **Designing Data-Intensive Applications** (Kleppmann)
  - Chapter 5: Replication (consistency models)
  - Chapter 8: Trouble with Distributed Systems
  - Chapter 9: Consistency & Consensus

### Key concepts to practice:

- [ ] Trace a leader election and log replication example; explain what happens without a majority.
- [ ] Design idempotency for payment system
- [ ] Build circuit breaker + backpressure integration
- [ ] Analyze trade-offs for 3 real systems

---

Practice explaining what a client can observe when only part of a system fails.
## Practice Check

Walk through a payment request when the network fails, the caller retries, and a replica is behind. Explain one trade-off and one failure mode before moving on.

[Back to contents](#contents) · [Backend learning guide](../readme.md)
