# Message Queues

A message queue lets one service send work to another service without waiting for it to finish.

```text
Producer → Queue → Consumer
```

- **Producer:** sends a message
- **Queue:** stores the message
- **Consumer:** receives and processes the message

Example: An order service puts a `send confirmation email` message in a queue. An email service processes it later.

---

## Visibility timeout

When a consumer receives a message, the queue temporarily hides it from other consumers.

```text
Consumer receives message
          │
          ▼
Message is hidden
     ┌────┴────┐
     ▼         ▼
 Success     Timeout
     │         │
  Delete     Show again
```

- If processing succeeds, the consumer confirms it and the message is deleted.
- If the consumer fails, the timeout ends and the message becomes available again.

Choose a timeout longer than the normal processing time:

- Too short → another consumer may process the same message.
- Too long → failed work takes longer to retry.

This is common in systems such as Amazon SQS.

---

## Retries

Temporary failures should usually be retried.

```text
Failure → Wait → Retry → Still failing → Dead-Letter Queue
```

Increase the delay after every failure. This is called **exponential backoff**.

```text
1 second → 2 seconds → 4 seconds → 8 seconds
```

This prevents consumers from repeatedly hitting a service that is already having problems. A small random delay, called **jitter**, also stops all consumers from retrying at the same time.

After the retry limit is reached, move the message to a **Dead-Letter Queue (DLQ)** for investigation.

---

## Kafka partitions

Kafka divides a topic into **partitions**. Partitions allow consumers to process messages in parallel.

```text
Partition 0 → Consumer A
Partition 1 → Consumer B
Partition 2 → Consumer C
```

Inside one consumer group, only one consumer can process a partition at a time.

For example, if a topic has 3 partitions:

- Up to 3 consumers can work in parallel.
- Any extra consumers stay idle.

Kafka keeps message order only inside the same partition. Use a key such as `user_id` or `account_id` when related messages must stay in order.

Simple rule:

- More partitions → more parallel processing
- Same partition key → related messages stay ordered

---

## Choosing a message broker

| Broker | Use it for |
|---|---|
| **RabbitMQ** | Background jobs and flexible message routing |
| **Amazon SQS** | Simple, managed queues on AWS |
| **Apache Kafka** | High-volume event streams and message replay |
| **Amazon SNS** | Sending one message to many subscribers |
| **Amazon EventBridge** | Routing events between AWS services and applications |
| **Apache Pulsar** | Large-scale streaming and multi-tenant systems |
| **Amazon Kinesis** | Managed, real-time data streams on AWS |

Quick guide:

- Choose **RabbitMQ or SQS** for background jobs.
- Choose **Kafka, Pulsar, or Kinesis** for event streaming.
- Choose **SNS or EventBridge** for sending events to multiple services.

## Related topics

- [Backpressure](../01-scaling-traffic/backpressure.md)
- [Event-Driven Architecture](event-driven-architecture.md)
- [Event Sourcing](event-sourcing.md)
- [Outbox Pattern](outbox-pattern.md)
- [Kafka-like Message Broker (practice)](../10-system-design-practice/kafka-like-message-broker.md)
- [Retry & Exponential Backoff](../01-scaling-traffic/retry-exponential-backoff.md)
- [Circuit Breaker Pattern](../01-scaling-traffic/circuit-breaker-pattern.md)
