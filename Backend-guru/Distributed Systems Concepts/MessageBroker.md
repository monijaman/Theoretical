# Kafka vs RabbitMQ: Choosing the Right Message Broker

## Communication Patterns at a Glance

Before comparing Kafka and RabbitMQ, it helps to understand the common ways that services communicate.

### Request–Response: Answer Now

A client sends a request and waits for a response. This is the usual model for APIs. It is simple and useful when the caller needs an immediate result, but the caller must wait for the service and is affected by its latency or downtime.

**Example:** A frontend requests a user's profile from an API.

### Message Queue: Process Later

A producer sends a task to a queue, and a worker processes it asynchronously. The producer can continue without waiting for the task to finish.

Queues are useful for background jobs, handling traffic bursts, and decoupling services.

**Example:** An API adds an email-sending task to a queue, and a worker sends the email later.

### Publish–Subscribe: Notify Many

A publisher sends an event to a topic. Multiple independent subscribers receive the event and respond in their own way.

**Example:** After an order is placed, separate services update inventory, send a confirmation email, and record analytics.

### Streaming: Process Continuously

Data flows continuously, and consumers process it as it arrives. Streaming platforms usually retain events, so consumers can pause, resume, or replay them later.

**Example:** Real-time fraud detection, monitoring, or clickstream analytics.

### Batch Processing: Process in Groups

Batch processing handles a bounded collection of data at scheduled intervals instead of processing each item immediately.

**Example:** Generating a daily sales report or reprocessing last year's data.

### What Is a Message Broker?

A **message broker is infrastructure that moves, stores, and delivers messages between producers and consumers**. It is not a communication pattern on its own.

Depending on its features, a broker can support message queues, publish–subscribe messaging, and sometimes event streaming.

Examples include RabbitMQ, Apache Kafka, Amazon SQS/SNS, and Google Pub/Sub. RabbitMQ is commonly used for task queues and routing messages, while Kafka is commonly used for durable event streams and replayable data pipelines.

### The Easy Version

➟ Request–response = answer now  
➟ Message queue = process later  
➟ Publish–subscribe = notify many  
➟ Streaming = process continuously  
➟ Batch processing = process in groups  
➟ Message broker = infrastructure that moves and manages messages

Real systems often combine these patterns. For example, an API may accept a request, put background work into a queue, publish an event when the work is complete, and later process the resulting data in a batch.

## Introduction

The first time I worked with queues was in 2019 as a Data Engineer for Terragon. I was managing a system where I got data through an endpoint, then pushed it to a queue for another service to consume and process, push to another queue, then the final service would consume and process.

I found this fascinating as I was mainly familiar with the regular request-response cycles we all learn when we begin to work with backends. Funny thing is I already used Celery for personal projects but I didn't understand it back then as "queues and workers". I just saw it as a "hack" to making requests "run faster".

You see, 6–7 years of building software in various industries and there are barely any systems I work on without having to use some kind of queue. From pgboss, Redis Bull, SQS and my favorite two: Kafka and RabbitMQ.

The data pipeline(s) I started this piece with was built with both, and I always wondered: what differentiated both of them? Why should I use Kafka over RabbitMQ and vice versa?

So I decided to do some learning, some research, some recollection and understanding of both systems — their intended purposes, pros and cons.

> One thing I've learnt about software engineering is you can achieve anything with anything if you hack it just enough to your taste. So you might have noticed people using Kafka for what RabbitMQ was built for and vice versa. For this article, we'll focus on intended purposes and distinct differences.

## Understanding Asynchronous Systems

As backend systems grow more complex, the need for asynchronous processing becomes essential. Users expect fast responses, but many operations take time — sending email, processing payments, generating reports. This is where queues come in.

RabbitMQ and Kafka are both heavily used to build these async systems, but engineers often struggle to decide which tool fits which problem.

The key to making this decision is understanding two distinct patterns:

1. **Background Workers**
2. **Event-Driven Processing**

### Background Workers

Background workers are the simpler of the two.

Here, you have a task that needs to be processed, but you don't want to handle it inside the request–response cycle because it would take too long. So instead, you push the task to a queue and let a separate service (a worker) process it asynchronously.

Typical examples include:

- Sending emails
- Processing payments
- Generating PDFs
- Calling third-party APIs

In this setup:

- One task is meant to be handled by one worker
- Once the task is completed, it's done
- The task itself is not something you care about long-term

### Event-Driven Processing

Event-driven processing is different in both scale and intent.

While background workers can be event-driven in a loose sense, event-driven architectures usually involve multiple independent processes reacting to the same event.

For example, when a user completes a payment, you may want to trigger several actions:

- **Service A** — Send a confirmation email
- **Service B** — Update the payment service
- **Service C** — Update the order service
- **Service D** — Select a driver for delivery
- **Service E** — Notify the vendor of a successful order
- **Service F** — Run analytics later in the night
- …and possibly more in the future

At this point, it's no longer about completing a single task. It's about broadcasting the fact that something happened and allowing multiple services to react to it in their own way.

An important detail here is timing. Even though the system is event-driven, not all consumers process the event immediately. Some services react in real time, while others (like analytics or reporting) may process the same event hours or days later.

> This distinction is critical: event-driven does not always mean real-time.

### Why This Distinction Matters

Background workers focus on getting work done. Event-driven systems focus on reacting to events.

Now that we've clarified the difference between background workers and event-driven processing, this is where Kafka and RabbitMQ come into the picture.

## Kafka and RabbitMQ

In simple terms, **RabbitMQ is built for background processing**, while **Kafka is built for event-driven systems** — and there are clear architectural reasons for this.

**RabbitMQ** is designed to deliver a task to a consumer, ensure it gets processed, and then remove it from the queue. A message is sent to a queue, consumed by a worker, acknowledged, and deleted. RabbitMQ also provides built-in mechanisms for retries, dead-letter queues, and fair dispatch, ensuring that a single job is handled by only one consumer at a time.

**Kafka**, on the other hand, is built as a distributed log. When an event is written to Kafka, it stays there for a configured retention period (days, weeks, or even indefinitely). Consumers don't consume and delete messages — instead they read from the log at their own pace. Multiple consumers can read the same event, and a consumer can even go back and re-read events from hours or days ago.

This difference in data retention is fundamental. Kafka retains events, allowing consumers to read, pause, resume, or replay them as needed. RabbitMQ does not retain messages once they are acknowledged — once a job is processed, it is removed from the queue.

Because of this, Kafka supports offset-based consumption, where consumers control where they start reading from. RabbitMQ does not expose offsets; messages are delivered as they arrive and are either acknowledged or requeued on failure.

Understanding these differences makes it clear why RabbitMQ fits background workers, while Kafka fits event-driven architectures.

## The Key Technical Differences

Let me break down the technical differences that matter most when making a choice between these tools.

| | RabbitMQ | Kafka |
|---|---|---|
| **Message retention** | Deleted once acknowledged | Kept in a log for a configured retention period |
| **Mental model** | Items on a todo list | Entries in a journal |
| **Replay capability** | Not possible — message is gone once processed | Consumers can rewind and reprocess past events |
| **Consumer model** | Push — broker pushes messages, balances load across consumers | Pull — consumers ask for messages at their own pace |
| **Best fit** | Fire-and-forget background jobs | Multiple independent consumers reacting to the same event |

### Message Retention

RabbitMQ treats messages like items on a todo list. Once a worker picks up a task, processes it, and acknowledges it, the message is deleted. This makes perfect sense for background jobs — why keep a record of every email you've sent or every PDF you've generated?

Kafka treats messages like entries in a journal. Every event is written to a log and kept for a configured period. This means Service F (analytics) can process the payment event at midnight, even though it happened at 2 PM. The event is still there, waiting to be read.

### Replay Capability

This is where Kafka shines. Let's say you deployed a bug in your analytics service that miscalculated revenue for the past week. With Kafka, you can fix the bug, rewind your consumer to last Monday, and reprocess all those payment events. With RabbitMQ, those messages are gone — you'd need to reconstruct the data from your database (if you even stored it).

### Consumer Model

Kafka uses a **pull model**. Consumers ask for messages when they're ready to process them. This gives consumers control over their throughput and allows them to pause and resume at will.

RabbitMQ uses a **push model**. The broker pushes messages to consumers as they arrive. RabbitMQ handles the distribution and tries to balance load across consumers. This works great for worker pools where you want fair distribution of tasks.

## When to Choose RabbitMQ

RabbitMQ excels when you're building traditional background worker systems. Here's when it's the right choice:

- **You need a task processed once and you're done.** Sending welcome emails, processing uploaded images, calling a payment API — these are fire-and-forget operations. Once they're done, you don't need the message anymore.
- **Operational simplicity matters.** RabbitMQ is conceptually simpler to set up and manage. You create queues, producers send messages, consumers process them. The learning curve is gentler, and the operational overhead is lower.
- **You want built-in worker patterns.** RabbitMQ has excellent built-in support for work queues, retries, dead-letter queues, and priority queues. These patterns are baked into the system and work out of the box.
- **Your throughput requirements are moderate.** If you're processing thousands of tasks per second (not millions), RabbitMQ will handle it comfortably without the operational complexity of Kafka.

## When to Choose Kafka

Kafka is the right choice when you're building event-driven systems with specific requirements:

- **Multiple services need to react to the same event.** That payment event mentioned earlier? Six different services care about it, and they all need to process it independently. Kafka makes this trivial — each service has its own consumer group and reads the same event at its own pace.
- **You need replay capability.** Whether it's for recovering from bugs, reprocessing data with new logic, or feeding historical data to a new service, Kafka's retention makes this possible. This is huge when you're building data pipelines or analytics systems.
- **You're building a data pipeline.** If events flowing through your system represent state changes that multiple downstream systems need to know about, Kafka is purpose-built for this. You can have real-time consumers and batch consumers reading the same stream.
- **Scale is a concern.** Kafka is built to handle millions of messages per second across distributed clusters. If you're dealing with high-volume event streams (clickstream data, IoT sensors, real-time analytics), Kafka's architecture handles this better.

At Terragon, we used Kafka for our core data pipeline. Data would come in from various sources, get written to Kafka topics, and then multiple services would consume it — some for real-time processing, some for drawing insights. The ability to have these different consumers reading at different speeds from the same data stream was exactly what we needed.

## Common Mistakes I've Seen

- **Using Kafka for simple job queues.** I've seen teams spin up Kafka clusters just to send emails or process simple background tasks. The operational overhead of running Kafka (ZooKeeper, brokers, managing partitions, consumer groups) is significant. For simple worker queues, this is overkill — use RabbitMQ or even Redis with Bull.
- **Using RabbitMQ when you need historical data.** A team once tried to build an analytics pipeline with RabbitMQ. They quickly realized that if any consumer went down, they'd lose data. They ended up having to persist everything to a database just to have a backup — essentially building their own poor version of Kafka's log.
- **Not considering operational complexity.** Kafka is powerful but complex. You need to understand partitions, consumer groups, rebalancing, and offset management. If your team is small or lacks experience with distributed systems, the operational burden might outweigh the benefits. Sometimes the "worse" tool that your team can actually manage is the better choice.
- **Forgetting about the edge cases.** What happens when a consumer is down for two hours? With RabbitMQ, messages queue up in memory (which can cause problems). With Kafka, they're sitting in the log waiting to be read. Neither is inherently better — it depends on your use case.

## Conclusion

RabbitMQ and Kafka are both message systems, but they're built for fundamentally different purposes. RabbitMQ is a message broker designed for getting tasks done. Kafka is an event streaming platform designed for broadcasting events and building data pipelines.

The distinction between background workers and event-driven processing is the key to choosing between them:

- If tasks need to be processed once and you're done — **RabbitMQ** is likely the simpler, better choice.
- If multiple services need to react to events, or you need to replay historical data — **Kafka** is the right tool.

You can achieve anything with anything — Kafka has been used for simple job queues and RabbitMQ stretched to handle event-driven systems. But some tools make certain problems easier than others. Understanding the intended purpose of each tool, and matching that to your actual problem, will save you from a lot of unnecessary complexity.
