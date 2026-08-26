# Backpressure (Easy to Understand)

## What is Backpressure?

Backpressure is a way for a slow consumer to tell a fast producer:

> **"Slow down. I can't process data this quickly."**

It prevents the producer from sending more data than the consumer can handle.

---

## Why Do We Need It?

Imagine:

* Producer creates **10,000 messages/second**
* Consumer processes only **2,000 messages/second**

```
Producer (10k/s)
      │
      ▼
   Queue
      │
      ▼
Consumer (2k/s)
```

Every second, **8,000 extra messages** remain in the queue.

Eventually:

* Queue keeps growing
* Memory usage increases
* Garbage Collection (GC) becomes slower
* Application runs out of memory
* Process crashes

This is why backpressure is important.

---

## What Happens Without Backpressure?

```
Time 0 sec
Queue = 0

Time 10 sec
Queue = 80,000

Time 30 sec
Queue = 240,000

Time 60 sec
Out Of Memory (OOM)
Application crashes
```

Without backpressure:

* Memory keeps increasing
* Latency increases
* Eventually the application crashes

---

# How Backpressure Works

Instead of continuously pushing data,

the consumer says:

> "I am ready for only 20 more items."

The producer sends only those 20 items.

```
Consumer
Request(20)
     ▲
     │
Producer
```

After processing them:

```
Consumer
Request(20)
```

Again.

This keeps the system stable.

---

# Reactive Streams

Frameworks like:

* Project Reactor
* RxJava
* Akka Streams
* Java Flow API

use a method called

```
request(n)
```

Example:

```
Consumer

request(5)

↓

Producer

item1
item2
item3
item4
item5

↓

Consumer processes them

↓

request(5) again
```

The producer never sends more than requested.

---

# Bounded Queue

Instead of allowing the queue to grow forever,

set a maximum size.

Example:

```
Queue Size = 1000
```

If it becomes full:

* Reject new requests
* Slow down producers
* Drop low-priority data

This prevents memory crashes.

---

# Rejection Policies

When the queue is full, we must decide what to do.

### 1. Abort

Reject the request immediately.

```
Queue Full

↓

Return Error
```

Good for systems that should fail fast.

---

### 2. Caller Runs

Instead of creating another worker,

the caller performs the work.

Because the caller is busy,

it naturally slows down.

This automatically reduces traffic.

---

### 3. Drop Oldest / Drop Newest

Useful when only the latest data matters.

Example:

* Live stock prices
* Sensor data
* GPS locations

Older data can be discarded.

---

# TCP Backpressure

TCP already has built-in backpressure.

The receiver tells the sender:

> "I have room for only 500 more bytes."

If the receiver becomes slow:

```
Receive Window ↓
```

The sender automatically slows down.

No unlimited buffering occurs.

---

# Kafka Backpressure

Kafka works differently.

Producer writes messages into Kafka.

Consumers **pull** messages when ready.

```
Producer

↓

Kafka

↓

Consumer
```

A slow consumer simply reads more slowly.

The important metric is:

**Consumer Lag**

```
Latest Offset
      -
Consumed Offset
```

Large lag means the consumer cannot keep up.

Solutions:

* Add more consumers
* Add more partitions
* Speed up processing

---

# Backpressure vs Load Shedding

These are different ideas.

## Backpressure

Producer slows down.

```
Producer

↓

Less Traffic

↓

Consumer
```

Work is delayed, not lost.

---

## Load Shedding

The system immediately rejects requests.

```
Too Busy

↓

503 Error
```

Some work is intentionally dropped to protect the system.

---

# Real-Life Examples

### Example 1

A payment service sends messages faster than inventory service can process them.

Without backpressure:

* Queue grows
* Memory fills
* Inventory service crashes

With backpressure:

Payment service slows down.

---

### Example 2

Video streaming

If your internet becomes slow,

Netflix reduces video quality instead of downloading unlimited data.

This is another form of backpressure.

---

# Interview Answer (30 Seconds)

> Backpressure is a mechanism that prevents a fast producer from overwhelming a slow consumer. Instead of continuously sending data, the consumer signals how much data it can handle, allowing the producer to slow down. This prevents unbounded queues, high memory usage, and application crashes. Common implementations include Reactive Streams (`request(n)`), bounded queues with rejection policies, TCP flow control, and Kafka's pull-based consumer model.

---

# Common Interview Questions

### Why not use an unlimited queue?

Because it keeps growing until memory is exhausted, leading to high latency and eventually an OutOfMemory crash.

---

### What is Consumer Lag in Kafka?

Consumer Lag is the difference between the latest produced message and the latest consumed message. A growing lag indicates the consumer is processing messages more slowly than they are being produced.

---

### Difference between Backpressure and Rate Limiting?

| Backpressure                        | Rate Limiting                                     |
| ----------------------------------- | ------------------------------------------------- |
| Protects internal services          | Protects against external clients                 |
| Consumer asks producer to slow down | Server limits how many requests a client can make |
| Prevents overload inside the system | Prevents abuse or excessive traffic               |
